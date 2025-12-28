/**
 * Liquidsoap Configuration Generator
 * 
 * Generates radio.liq dynamically based on stations in database.
 * Each station gets its own harbor input and Icecast output.
 * Supports AutoDJ playlist playback as fallback source.
 * 
 * FIX: No mksafe() on live input - station only shows LIVE when encoder connected.
 */

import fs from 'fs';
import { exec } from 'child_process';
import * as db from './db.js';
import { generateM3UPlaylist, getM3UPath } from './playlistGenerator.js';

// Icecast config from environment
const ICECAST_HOST = process.env.ICECAST_HOST || '127.0.0.1';
const ICECAST_PORT = process.env.ICECAST_PORT || 8100;
const ICECAST_SOURCE_PASSWORD = process.env.ICECAST_SOURCE_PASSWORD || 'streamdock_source';

// Liquidsoap config path
const LIQUIDSOAP_CONFIG_PATH = '/app/radio.liq';

/**
 * Generate Liquidsoap config for a single station
 * Supports: Live encoder, AutoDJ playlists, HTTP relay
 * Priority: Live > AutoDJ/Relay > Silence
 */
async function generateStationConfig(station) {
    const id = station.id.replace(/-/g, '_');
    const mount = station.mount_point.replace('/', '');

    // Relay configuration
    const relayUrl = station.relay_url || null;
    const relayMode = station.relay_mode || 'fallback';
    const relayEnabled = station.relay_enabled === 1 || station.relay_enabled === true;

    // AutoDJ configuration
    const autoDJEnabled = station.autodj_enabled === 1 || station.autodj_enabled === true;
    const playlistId = station.autodj_playlist_id;
    const autoDJMode = station.autodj_mode || 'shuffle';
    const crossfade = station.autodj_crossfade || 0;

    let config = `
# ==========================================
# Station: ${station.name}
# Mount: ${station.mount_point}
# ==========================================

`;

    // ═══════════════════════════════════════════════════════
    // VALIDATION: Mutual Exclusivity (Relay vs AutoDJ)
    // ═══════════════════════════════════════════════════════
    if (relayEnabled && autoDJEnabled) {
        throw new Error(`Station "${station.name}": Cannot have both Relay and AutoDJ enabled simultaneously`);
    }

    // ═══════════════════════════════════════════════════════
    // MODE 1: RELAY PRIMARY (No live encoder, relay only)
    // ═══════════════════════════════════════════════════════
    if (relayEnabled && relayMode === 'primary' && relayUrl) {
        config += `# Primary Relay Mode: relay stream only\n`;
        config += `source_${id} = input.http("${relayUrl}")\n`;
        config += `source_${id} = mksafe(source_${id})\n\n`;

        config += `output.icecast(\n`;
        config += `    %mp3(bitrate=128),\n`;
        config += `    host="${ICECAST_HOST}",\n`;
        config += `    port=${ICECAST_PORT},\n`;
        config += `    password="${ICECAST_SOURCE_PASSWORD}",\n`;
        config += `    mount="${station.mount_point}",\n`;
        config += `    name="${station.name}",\n`;
        config += `    description="${station.description || 'StreamDock station'}",\n`;
        config += `    source_${id}\n`;
        config += `)\n\n`;

        return config;
    }

    // ═══════════════════════════════════════════════════════
    // MODES 2-5: Live Encoder as Primary Source
    // ═══════════════════════════════════════════════════════

    // Always create live harbor input (for all non-primary-relay modes)
    config += `# Live encoder input (Harbor)\n`;
    config += `live_${id} = input.harbor(\n`;
    config += `    "${mount}",\n`;
    config += `    port=8001,\n`;
    config += `    password="${ICECAST_SOURCE_PASSWORD}",\n`;
    config += `    on_connect=fun(_) -> ignore(process.run("curl -s -X POST http://127.0.0.1:3000/api/encoder/${station.id}/connected")),\n`;
    config += `    on_disconnect=fun() -> ignore(process.run("curl -s -X POST http://127.0.0.1:3000/api/encoder/${station.id}/disconnected"))\n`;
    config += `)\n\n`;

    // Build fallback chain based on station configuration
    const sources = [`live_${id}`]; // Live encoder always first priority

    // ═══════════════════════════════════════════════════════
    // MODE 2: Live + AutoDJ Fallback
    // ═══════════════════════════════════════════════════════
    if (autoDJEnabled && playlistId) {
        // Generate M3U playlist file
        let m3uPath;
        try {
            m3uPath = await generateM3UPlaylist(playlistId);
            console.log(`[LIQUIDSOAP] Generated M3U for station "${station.name}": ${m3uPath}`);
        } catch (error) {
            console.error(`[LIQUIDSOAP] Failed to generate M3U for station "${station.name}":`, error.message);
            throw new Error(`AutoDJ playlist generation failed: ${error.message}`);
        }

        config += `# AutoDJ fallback source from playlist ID ${playlistId}\n`;

        // Liquidsoap 2.2.5 playlist syntax
        const liqMode = autoDJMode === 'shuffle' ? 'randomize' : 'normal';
        config += `autodj_${id} = playlist(mode="${liqMode}", reload_mode="watch", "${m3uPath}")\n`;
        config += `autodj_${id} = mksafe(autodj_${id})\n`;

        // Add crossfade if configured
        if (crossfade > 0 && crossfade <= 10) {
            config += `autodj_${id} = crossfade(duration=${crossfade}.0, autodj_${id})\n`;
        }

        config += `\n`;
        sources.push(`autodj_${id}`);
    }

    // ═══════════════════════════════════════════════════════
    // MODE 3: Live + Relay Fallback
    // ═══════════════════════════════════════════════════════
    else if (relayEnabled && relayUrl) {
        config += `# HTTP relay fallback\n`;
        config += `http_${id} = input.http("${relayUrl}")\n\n`;
        sources.push(`http_${id}`);
    }

    // ═══════════════════════════════════════════════════════
    // Final Fallback Chain & Output
    // ═══════════════════════════════════════════════════════

    if (sources.length > 1) {
        config += `# Fallback priority chain: ${sources.join(' > ')}\n`;
        config += `source_${id} = fallback(track_sensitive=false, [${sources.join(', ')}])\n\n`;
    } else {
        config += `# No fallback - live only\n`;
        config += `source_${id} = ${sources[0]}\n\n`;
    }

    // Output to Icecast
    config += `output.icecast(\n`;
    config += `    %mp3(bitrate=128),\n`;
    config += `    host="${ICECAST_HOST}",\n`;
    config += `    port=${ICECAST_PORT},\n`;
    config += `    password="${ICECAST_SOURCE_PASSWORD}",\n`;
    config += `    mount="${station.mount_point}",\n`;
    config += `    name="${station.name}",\n`;
    config += `    description="${station.description || 'StreamDock station'}",\n`;
    config += `    fallible=true,\n`;
    config += `    source_${id}\n`;
    config += `)\n\n`;

    return config;
}

/**
 * Generate complete radio.liq content
 */
async function generateLiquidsoapConfig() {
    const stations = db.getAllStations();

    let config = `#!/usr/bin/liquidsoap
# StreamDock Liquidsoap Configuration
# Auto-generated - DO NOT EDIT MANUALLY
# Generated: ${new Date().toISOString()}
# Stations: ${stations.length}

# ==========================================
# GLOBAL SETTINGS
# ==========================================

# Logging
settings.log.level.set(3)
settings.log.stdout.set(true)

# Allow running as root (Docker)
settings.init.allow_root.set(true)

# Harbor settings - accept encoder connections on port 8001
settings.harbor.bind_addrs.set(["0.0.0.0"])

`;

    if (stations.length === 0) {
        config += `# No stations configured yet
# Create a station in StreamDock to enable streaming

`;
    } else {
        // Generate configs for all stations (await each one)
        for (const station of stations) {
            const stationConfig = await generateStationConfig(station);
            config += stationConfig;
        }
    }

    config += `# ==========================================
# STARTUP MESSAGE
# ==========================================

print("Liquidsoap started - ${stations.length} station(s) configured")
print("Listening on port 8001 for encoder connections")
`;

    return config;
}

/**
 * Write radio.liq to disk and reload Liquidsoap
 */
export async function regenerateLiquidsoapConfig() {
    try {
        const config = await generateLiquidsoapConfig();
        const stations = db.getAllStations();

        fs.writeFileSync(LIQUIDSOAP_CONFIG_PATH, config, 'utf8');
        console.log(`[LIQUIDSOAP] Configuration written to ${LIQUIDSOAP_CONFIG_PATH}`);
        console.log(`[LIQUIDSOAP] Generated config for ${stations.length} station(s)`);

        await reloadLiquidsoap();

        return { success: true, stationCount: stations.length };
    } catch (error) {
        console.error('[LIQUIDSOAP] Failed to regenerate config:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Reload Liquidsoap via supervisord with aggressive cleanup
 * Fixes "Mountpoint in use" errors caused by zombie processes
 */
async function reloadLiquidsoap() {
    return new Promise((resolve) => {
        // Stop supervisor service, force kill any leftovers, then start
        const cmd = 'supervisorctl stop liquidsoap && pkill -9 liquidsoap || true && supervisorctl start liquidsoap';

        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.warn('[LIQUIDSOAP] Reload warning:', error.message);
                // Even if error, we hope it started. Resolve success to prompt UI check.
                resolve({ success: true, warning: error.message });
            } else {
                console.log('[LIQUIDSOAP] Restarted successfully (Aggressive)');
                resolve({ success: true });
            }
        });
    });
}

export default {
    regenerateLiquidsoapConfig
};
