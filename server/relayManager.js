/**
 * Relay Manager - Manages audio stream relays via Liquidsoap
 * 
 * Phase 3: Uses Liquidsoap's input.http for relay instead of FFmpeg.
 * Liquidsoap handles source switching automatically - no mount conflicts!
 * 
 * This file maintains API compatibility with existing code while
 * delegating actual relay logic to Liquidsoap.
 */

import * as db from './db.js';
import * as liquidsoopConfig from './liquidsoopConfig.js';

// Track relay state for status reporting
// Note: Actual relay is handled by Liquidsoap, this is just for status tracking
const relayStates = new Map();

/**
 * Start a relay for a station
 * In Phase 3, this triggers Liquidsoap config regeneration.
 * Liquidsoap's input.http will pull from the relay URL.
 * 
 * @param {string} stationId - The station ID
 * @returns {Object} - { success: boolean, error?: string }
 */
export async function startRelay(stationId) {
    const station = db.getStationById(stationId);
    if (!station) {
        return { success: false, error: 'Station not found' };
    }

    if (!station.relay_url) {
        return { success: false, error: 'No relay URL configured' };
    }

    console.log(`[RELAY] Enabling relay for station ${station.name} (${stationId})`);
    console.log(`[RELAY] Source: ${station.relay_url}`);
    console.log(`[RELAY] Mode: ${station.relay_mode || 'fallback'}`);

    try {
        // Update relay status in database
        updateRelayStatusInDb(stationId, 'active');

        // Track state locally
        relayStates.set(stationId, {
            status: 'running',
            startTime: Date.now(),
            url: station.relay_url,
            mountPoint: station.mount_point
        });

        // Regenerate Liquidsoap config and restart
        // Liquidsoap will now include this station's HTTP fallback
        await liquidsoopConfig.regenerateLiquidsoapConfig();

        console.log(`[RELAY] Relay enabled for ${station.name} - Liquidsoap handling stream`);
        return { success: true, message: 'Relay enabled via Liquidsoap' };

    } catch (error) {
        console.error(`[RELAY ${stationId}] Failed to start:`, error.message);
        updateRelayStatusInDb(stationId, 'error');
        return { success: false, error: error.message };
    }
}

/**
 * Stop a relay for a station
 * Sets relay_enabled to false and regenerates Liquidsoap config.
 * 
 * @param {string} stationId - The station ID
 * @returns {Object} - { success: boolean, error?: string }
 */
export async function stopRelay(stationId) {
    const station = db.getStationById(stationId);
    if (!station) {
        return { success: false, error: 'Station not found' };
    }

    console.log(`[RELAY] Stopping relay for station ${station.name} (${stationId})`);

    try {
        // Update status in database
        updateRelayStatusInDb(stationId, 'idle');

        // Remove from local state
        relayStates.delete(stationId);

        // Regenerate Liquidsoap config without this relay
        // (Station's relay_enabled should be set to false by caller)
        await liquidsoopConfig.regenerateLiquidsoapConfig();

        console.log(`[RELAY] Relay stopped for ${station.name}`);
        return { success: true, message: 'Relay stopped' };

    } catch (error) {
        console.error(`[RELAY ${stationId}] Failed to stop:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get status of a relay
 * @param {string} stationId - The station ID
 * @returns {Object} - Relay status info
 */
export function getRelayStatus(stationId) {
    const station = db.getStationById(stationId);
    const state = relayStates.get(stationId);

    if (!state || !station?.relay_enabled) {
        return {
            active: false,
            status: 'idle',
            stationId
        };
    }

    return {
        active: state.status === 'running',
        status: state.status,
        stationId,
        url: state.url,
        mountPoint: state.mountPoint,
        startTime: state.startTime,
        uptime: Date.now() - state.startTime
    };
}

/**
 * Check if a relay is currently active (running)
 * @param {string} stationId - The station ID
 * @returns {boolean} - True if relay is running
 */
export function isActive(stationId) {
    const station = db.getStationById(stationId);
    // With Liquidsoap, relay is "active" if enabled and has a URL
    return station?.relay_enabled && station?.relay_url;
}

/**
 * Get all active relays
 * @returns {Array} - Array of relay status objects
 */
export function getAllActiveRelays() {
    const relays = [];
    for (const [stationId, state] of relayStates) {
        relays.push({
            stationId,
            status: state.status,
            url: state.url,
            mountPoint: state.mountPoint,
            uptime: Date.now() - state.startTime
        });
    }
    return relays;
}

/**
 * Start all relays that are configured as "primary" mode
 * Called on server startup
 */
export async function startPrimaryRelays() {
    console.log('[RELAY] Initializing primary-mode relays...');

    try {
        const stations = db.getAllStations();
        let count = 0;

        for (const station of stations) {
            if (station.relay_enabled && station.relay_mode === 'primary' && station.relay_url) {
                console.log(`[RELAY] Primary relay configured: ${station.name}`);
                relayStates.set(station.id, {
                    status: 'running',
                    startTime: Date.now(),
                    url: station.relay_url,
                    mountPoint: station.mount_point
                });
                count++;
            }
        }

        // Regenerate Liquidsoap config with all stations
        // (This happens in index.js startup anyway, but log the count)
        console.log(`[RELAY] ${count} primary relay(s) will be started by Liquidsoap`);

    } catch (error) {
        console.error('[RELAY] Error during primary relay startup:', error.message);
    }
}

/**
 * Stop all active relays
 * Called on server shutdown
 */
export function stopAllRelays() {
    console.log('[RELAY] Clearing relay states...');
    relayStates.clear();
}

/**
 * Update relay status in database
 */
function updateRelayStatusInDb(stationId, status) {
    try {
        db.updateRelayStatus(stationId, status);
    } catch (error) {
        console.error(`[RELAY] Failed to update status in DB:`, error.message);
    }
}

export default {
    startRelay,
    stopRelay,
    getRelayStatus,
    isActive,
    getAllActiveRelays,
    startPrimaryRelays,
    stopAllRelays
};
