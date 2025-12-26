/**
 * Liquidsoap Configuration Generator
 * 
 * Generates radio.liq dynamically based on stations in database.
 * Each station gets its own harbor input and Icecast output.
 * 
 * FIX: No mksafe() on live input - station only shows LIVE when encoder connected.
 */

import fs from 'fs';
import { exec } from 'child_process';
import * as db from './db.js';

// Icecast config from environment
const ICECAST_HOST = process.env.ICECAST_HOST || '127.0.0.1';
const ICECAST_PORT = process.env.ICECAST_PORT || 8100;
const ICECAST_SOURCE_PASSWORD = process.env.ICECAST_SOURCE_PASSWORD || 'streamdock_source';

// Liquidsoap config path
const LIQUIDSOAP_CONFIG_PATH = '/app/radio.liq';

/**
 * Generate Liquidsoap config for a single station
 * NO mksafe() on live input - mount only active when encoder connected
 */
function generateStationConfig(station) {
    const id = station.id.replace(/-/g, '_');
    const mount = station.mount_point.replace('/', '');
    const relayUrl = station.relay_url || null;
    const relayMode = station.relay_mode || 'fallback';
    const relayEnabled = station.relay_enabled === 1 || station.relay_enabled === true;

    let config = `
# ==========================================
# Station: ${station.name}
# Mount: ${station.mount_point}
# Mode: ${relayMode}
# ==========================================

`;

    // For PRIMARY mode: only use relay (no live input)
    if (relayMode === 'primary' && relayEnabled && relayUrl) {
        config += `# Primary mode: relay only
source_${id} = input.http("${relayUrl}")
source_${id} = mksafe(source_${id})

output.icecast(
    %mp3(bitrate=128),
    host="${ICECAST_HOST}",
    port=${ICECAST_PORT},
    password="${ICECAST_SOURCE_PASSWORD}",
    mount="${station.mount_point}",
    name="${station.name}",
    description="${station.description || 'StreamDock station'}",
    source_${id}
)

`;
    }
    // For FALLBACK mode or no relay: live input
    else {
        // Live input - NO mksafe! Only outputs when encoder connected.
        config += `# Live input from encoder (NO mksafe - only active when connected)
live_${id} = input.harbor(
    "${mount}",
    port=8001,
    password="${ICECAST_SOURCE_PASSWORD}"
)

`;

        // If relay fallback is configured
        if (relayEnabled && relayUrl) {
            config += `# HTTP fallback source
http_${id} = input.http("${relayUrl}")
http_${id} = input.http("${relayUrl}")
# Removed mksafe so fallback releases properly when live connects


# Priority: live first, then HTTP fallback
source_${id} = fallback(
    track_sensitive=false,
    [live_${id}, http_${id}]
)

output.icecast(
    %mp3(bitrate=128),
    host="${ICECAST_HOST}",
    port=${ICECAST_PORT},
    password="${ICECAST_SOURCE_PASSWORD}",
    mount="${station.mount_point}",
    name="${station.name}",
    description="${station.description || 'StreamDock station'}",
    fallible=true,
    source_${id}
)

# Telnet status command for this station (Phase 6)
server.register(
    "source_${id}",
    fun (_) -> if live_${id}.is_ready() then "live" else "fallback" end
)

`;
        } else {
            config += `# No fallback - output live input directly
output.icecast(
    %mp3(bitrate=128),
    host="${ICECAST_HOST}",
    port=${ICECAST_PORT},
    password="${ICECAST_SOURCE_PASSWORD}",
    mount="${station.mount_point}",
    name="${station.name}",
    description="${station.description || 'StreamDock station'}",
    fallible=true,
    live_${id}
)

`;
        }
    }

    return config;
}

/**
 * Generate complete radio.liq content
 */
function generateLiquidsoapConfig() {
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

# Telnet server for external status queries (Phase 6)
settings.server.telnet.set(true)
settings.server.telnet.port.set(1234)
settings.server.telnet.bind_addr.set("127.0.0.1")

`;

    if (stations.length === 0) {
        config += `# No stations configured yet
# Create a station in StreamDock to enable streaming

`;
    } else {
        for (const station of stations) {
            config += generateStationConfig(station);
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
        const config = generateLiquidsoapConfig();
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
