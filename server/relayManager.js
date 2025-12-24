/**
 * Relay Manager - Manages audio stream relays
 * 
 * Handles pulling audio from external URLs and pushing to Icecast mounts.
 * Uses ffmpeg for stream processing and format conversion.
 */

import { spawn } from 'child_process';
import * as db from './db.js';

// Active relay processes: { stationId: { process, status, startTime, url } }
const activeRelays = new Map();

// Icecast config from environment
const ICECAST_HOST = process.env.ICECAST_HOST || 'localhost';
const ICECAST_INTERNAL_PORT = process.env.ICECAST_PORT || 8100; // Must match Icecast!
const ICECAST_SOURCE_PASSWORD = process.env.ICECAST_SOURCE_PASSWORD || 'streamdock_source';

/**
 * Start a relay for a station
 * @param {string} stationId - The station ID
 * @returns {Object} - { success: boolean, error?: string }
 */
export function startRelay(stationId) {
    // Check if already running
    if (activeRelays.has(stationId)) {
        const existing = activeRelays.get(stationId);
        if (existing.status === 'running') {
            return { success: false, error: 'Relay already running' };
        }
    }

    // Get station from database
    const station = db.getStationById(stationId);
    if (!station) {
        return { success: false, error: 'Station not found' };
    }

    if (!station.relay_url) {
        return { success: false, error: 'No relay URL configured' };
    }

    if (!station.relay_enabled) {
        return { success: false, error: 'Relay not enabled for this station' };
    }

    const relayUrl = station.relay_url;
    const mountPoint = station.mount_point;

    // STANDARD ICECAST FALLBACK:
    // - Fallback mode: stream to -fallback mount so encoder can take priority on main mount
    // - Primary mode: stream directly to main mount (always-on relay)
    // - The -fallback mounts are pre-created at container startup by startup.sh
    const targetMount = station.relay_mode === 'fallback' ? `${mountPoint}-fallback` : mountPoint;

    console.log(`[RELAY] Starting relay for station ${station.name} (${stationId})`);
    console.log(`[RELAY] Mode: ${station.relay_mode}`);
    console.log(`[RELAY] Source: ${relayUrl}`);
    console.log(`[RELAY] Target: icecast://${ICECAST_HOST}:${ICECAST_INTERNAL_PORT}${targetMount}`);

    try {
        // Build ffmpeg command
        // Using icecast:// protocol for source streaming
        const icecastUrl = `icecast://source:${ICECAST_SOURCE_PASSWORD}@${ICECAST_HOST}:${ICECAST_INTERNAL_PORT}${targetMount}`;

        const ffmpegArgs = [
            '-hide_banner',
            '-loglevel', 'info',         // Need info level to see connection messages
            '-reconnect', '1',           // Auto-reconnect if source disconnects
            '-reconnect_streamed', '1',
            '-reconnect_delay_max', '5', // Max 5 seconds between reconnect attempts
            '-i', relayUrl,              // Input URL
            '-c:a', 'libmp3lame',        // Encode to MP3 (avoids codec issues)
            '-b:a', '128k',              // 128kbps bitrate
            '-f', 'mp3',                 // Output format
            '-content_type', 'audio/mpeg',
            icecastUrl                   // Output to Icecast
        ];

        console.log(`[RELAY] Command: ffmpeg ${ffmpegArgs.join(' ')}`);

        const process = spawn('ffmpeg', ffmpegArgs, {
            stdio: ['ignore', 'pipe', 'pipe']
        });

        // Track the relay
        const relayInfo = {
            process,
            status: 'starting',
            startTime: Date.now(),
            url: relayUrl,
            stationId,
            mountPoint
        };
        activeRelays.set(stationId, relayInfo);

        // Update DB status
        updateRelayStatusInDb(stationId, 'starting');

        // Handle stdout (usually empty for ffmpeg streaming)
        process.stdout.on('data', (data) => {
            console.log(`[RELAY ${stationId}] stdout: ${data.toString().trim()}`);
        });

        // Handle stderr (ffmpeg outputs progress here)
        process.stderr.on('data', (data) => {
            const output = data.toString().trim();
            // Only log non-progress lines (progress is noisy)
            if (!output.includes('size=') && !output.includes('time=')) {
                console.log(`[RELAY ${stationId}] ${output}`);
            }
            // When we see "Opening..." it means connection is being attempted
            if (output.includes('Opening') || output.includes('Stream #')) {
                relayInfo.status = 'running';
                updateRelayStatusInDb(stationId, 'active');
            }
        });

        // Handle close
        process.on('close', (code) => {
            console.log(`[RELAY ${stationId}] Process exited with code ${code}`);
            relayInfo.status = 'stopped';
            relayInfo.exitCode = code;
            activeRelays.delete(stationId);
            updateRelayStatusInDb(stationId, 'idle');
        });

        // Handle error
        process.on('error', (err) => {
            console.error(`[RELAY ${stationId}] Process error:`, err.message);
            relayInfo.status = 'error';
            relayInfo.error = err.message;
            activeRelays.delete(stationId);
            updateRelayStatusInDb(stationId, 'error');
        });

        return { success: true, message: 'Relay starting' };

    } catch (error) {
        console.error(`[RELAY ${stationId}] Failed to start:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Stop a relay for a station
 * @param {string} stationId - The station ID
 * @returns {Object} - { success: boolean, error?: string }
 */
export function stopRelay(stationId) {
    const relay = activeRelays.get(stationId);
    if (!relay) {
        return { success: false, error: 'No active relay for this station' };
    }

    console.log(`[RELAY] Stopping relay for station ${stationId}`);

    try {
        // Kill the ffmpeg process gracefully (SIGTERM)
        relay.process.kill('SIGTERM');

        // Give it a moment, then force kill if needed
        setTimeout(() => {
            if (relay.process && !relay.process.killed) {
                console.log(`[RELAY ${stationId}] Force killing process`);
                relay.process.kill('SIGKILL');
            }
        }, 3000);

        return { success: true, message: 'Relay stopping' };

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
    const relay = activeRelays.get(stationId);
    if (!relay) {
        return {
            active: false,
            status: 'idle',
            stationId
        };
    }

    return {
        active: relay.status === 'running',
        status: relay.status,
        stationId,
        url: relay.url,
        mountPoint: relay.mountPoint,
        startTime: relay.startTime,
        uptime: Date.now() - relay.startTime
    };
}

/**
 * Check if a relay is currently active (running)
 * @param {string} stationId - The station ID
 * @returns {boolean} - True if relay is running
 */
export function isActive(stationId) {
    const relay = activeRelays.get(stationId);
    return relay && relay.status === 'running';
}

/**
 * Get all active relays
 * @returns {Array} - Array of relay status objects
 */
export function getAllActiveRelays() {
    const relays = [];
    for (const [stationId, relay] of activeRelays) {
        relays.push({
            stationId,
            status: relay.status,
            url: relay.url,
            mountPoint: relay.mountPoint,
            uptime: Date.now() - relay.startTime
        });
    }
    return relays;
}

/**
 * Start all relays that are configured as "primary" mode
 * Called on server startup
 */
export function startPrimaryRelays() {
    console.log('[RELAY] Checking for primary-mode relays to auto-start...');

    try {
        const stations = db.getAllStations();
        let started = 0;

        for (const station of stations) {
            if (station.relay_enabled && station.relay_mode === 'primary' && station.relay_url) {
                console.log(`[RELAY] Auto-starting primary relay for: ${station.name}`);
                const result = startRelay(station.id);
                if (result.success) {
                    started++;
                } else {
                    console.error(`[RELAY] Failed to auto-start: ${result.error}`);
                }
            }
        }

        console.log(`[RELAY] Auto-started ${started} primary relay(s)`);
    } catch (error) {
        console.error('[RELAY] Error during primary relay startup:', error.message);
    }
}

/**
 * Stop all active relays
 * Called on server shutdown
 */
export function stopAllRelays() {
    console.log('[RELAY] Stopping all active relays...');

    for (const [stationId] of activeRelays) {
        stopRelay(stationId);
    }
}

/**
 * Update relay status in database
 */
function updateRelayStatusInDb(stationId, status) {
    try {
        db.updateRelayStatusInDb(stationId, status);
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
