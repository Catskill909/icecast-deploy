/**
 * Liquidsoap Telnet Client
 * 
 * Queries Liquidsoap via telnet to determine which source is active.
 * Phase 6: Enables accurate badge color (Green when fallback plays, Orange when standby).
 */

import net from 'net';

const TELNET_HOST = '127.0.0.1';
const TELNET_PORT = 1234;
const TIMEOUT_MS = 2000;

/**
 * Query Liquidsoap for the active source of a station
 * @param {string} stationId - Station ID (will be sanitized for Liquidsoap)
 * @returns {Promise<'live'|'fallback'|'unknown'>}
 */
export async function getActiveSource(stationId) {
    // Sanitize station ID to match Liquidsoap variable naming
    const sanitizedId = stationId.replace(/-/g, '_');

    return new Promise((resolve) => {
        const client = new net.Socket();
        let response = '';

        client.setTimeout(TIMEOUT_MS);

        client.connect(TELNET_PORT, TELNET_HOST, () => {
            // Send the command and a newline
            client.write(`source_${sanitizedId}\n`);
        });

        client.on('data', (data) => {
            response += data.toString();
            // Liquidsoap telnet sends "END" after response
            if (response.includes('END') || response.includes('\n')) {
                client.end();
            }
        });

        client.on('close', () => {
            // Parse response - look for "live" or "fallback"
            const trimmed = response.trim().toLowerCase();
            if (trimmed.includes('live')) {
                resolve('live');
            } else if (trimmed.includes('fallback')) {
                resolve('fallback');
            } else {
                resolve('unknown');
            }
        });

        client.on('error', (err) => {
            console.warn(`[LIQUIDSOAP CLIENT] Telnet error for ${stationId}: ${err.message}`);
            resolve('unknown');
        });

        client.on('timeout', () => {
            console.warn(`[LIQUIDSOAP CLIENT] Telnet timeout for ${stationId}`);
            client.destroy();
            resolve('unknown');
        });
    });
}

/**
 * Query all stations with fallback enabled
 * @param {Array} stations - Array of station objects
 * @returns {Promise<Object>} Map of stationId -> 'live'|'fallback'|'unknown'
 */
export async function getAllSourceStatuses(stations) {
    const results = {};

    // Only query stations that have fallback enabled
    const fallbackStations = stations.filter(
        s => s.relay_enabled && s.relay_mode === 'fallback' && s.relay_url
    );

    // Query each station (could be parallelized, but keeping simple for reliability)
    for (const station of fallbackStations) {
        results[station.id] = await getActiveSource(station.id);
    }

    return results;
}

export default {
    getActiveSource,
    getAllSourceStatuses
};
