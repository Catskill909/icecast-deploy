/**
 * Liquidsoap Configuration Generator
 * 
 * Generates radio.liq dynamically based on stations in database.
 * Supports up to 100+ stations with individual fallback URLs.
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
 */
function generateStationConfig(station) {
    const id = station.id.replace(/-/g, '_'); // Liquidsoap variable names can't have dashes
    const mount = station.mount_point.replace('/', ''); // Remove leading slash
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
        config += `# Primary mode: relay only (no live input)
source_${id} = input.http("${relayUrl}")
source_${id} = mksafe(source_${id})

`;
    }
    // For FALLBACK mode: live input with optional HTTP fallback
    else {
        // Live input (harbor)
        config += `# Live input from encoder
live_${id} = input.harbor(
    "${mount}",
    port=8001,
    password="${ICECAST_SOURCE_PASSWORD}"
)
live_${id} = mksafe(live_${id})

`;

        // Add HTTP fallback if configured
        if (relayEnabled && relayUrl) {
            config += `# HTTP fallback source
http_${id} = input.http("${relayUrl}")
http_${id} = mksafe(http_${id})

# Priority: live first, then HTTP fallback, then silence
source_${id} = fallback(
    track_sensitive=false,
    [live_${id}, http_${id}]
)

`;
        } else {
            // No fallback configured - just use live input
            config += `# No fallback configured - live only
source_${id} = live_${id}

`;
        }
    }

    // Output to Icecast
    config += `# Output to Icecast
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

`;

    // Generate config for each station
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

        // Reload Liquidsoap
        await reloadLiquidsoap();

        return { success: true, stationCount: stations.length };
    } catch (error) {
        console.error('[LIQUIDSOAP] Failed to regenerate config:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Reload Liquidsoap by sending SIGHUP or restarting via supervisord
 * For Phase 3: Use restart (simplest, brief gap)
 * For Phase 4: Could use telnet interface for seamless reload
 */
async function reloadLiquidsoap() {
    return new Promise((resolve) => {
        // Use supervisorctl to restart liquidsoap
        exec('supervisorctl restart liquidsoap', (error, stdout, stderr) => {
            if (error) {
                console.warn('[LIQUIDSOAP] Reload via supervisorctl failed:', error.message);
                console.warn('[LIQUIDSOAP] This is expected during initial startup');
                resolve({ success: false, error: error.message });
            } else {
                console.log('[LIQUIDSOAP] Restarted successfully');
                resolve({ success: true });
            }
        });
    });
}

/**
 * Check if Liquidsoap is running
 */
export function isLiquidsoapRunning() {
    return new Promise((resolve) => {
        exec('supervisorctl status liquidsoap', (error, stdout) => {
            if (error) {
                resolve(false);
            } else {
                resolve(stdout.includes('RUNNING'));
            }
        });
    });
}

export default {
    regenerateLiquidsoapConfig,
    isLiquidsoapRunning
};
