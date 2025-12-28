/**
 * Playlist Generator
 * 
 * Generates M3U playlist files from database playlists for Liquidsoap consumption.
 * M3U files are stored in /app/data/playlists/ (production) or ./server/playlists/ (local dev)
 */

import fs from 'fs/promises';
import path from 'path';
import * as db from './db.js';

// Playlist storage directory
const PLAYLISTS_PATH = process.env.PLAYLISTS_PATH || path.join(process.cwd(), 'server', 'playlists');

/**
 * Ensure playlists directory exists
 */
async function ensurePlaylistsDirectory() {
    try {
        await fs.mkdir(PLAYLISTS_PATH, { recursive: true });
        console.log(`[PLAYLIST] Playlists directory ready: ${PLAYLISTS_PATH}`);
    } catch (error) {
        console.error('[PLAYLIST] Failed to create playlists directory:', error.message);
        throw error;
    }
}

/**
 * Generate M3U playlist file from database playlist
 * 
 * @param {number} playlistId - Database ID of the playlist
 * @returns {Promise<string>} - Absolute path to generated M3U file
 * @throws {Error} - If playlist not found or empty
 */
export async function generateM3UPlaylist(playlistId) {
    // Fetch playlist from database
    const playlist = db.getPlaylistById(playlistId);
    if (!playlist) {
        throw new Error(`Playlist ID ${playlistId} not found in database`);
    }

    // Fetch tracks
    const tracks = db.getPlaylistTracks(playlistId);
    if (tracks.length === 0) {
        throw new Error(`Playlist "${playlist.name}" (ID ${playlistId}) is empty - cannot generate M3U`);
    }

    console.log(`[PLAYLIST] Generating M3U for "${playlist.name}" (${tracks.length} tracks)`);

    // Build Extended M3U content
    let m3uContent = '#EXTM3U\n';
    m3uContent += `# Playlist: ${playlist.name}\n`;
    m3uContent += `# Generated: ${new Date().toISOString()}\n`;
    m3uContent += `# Tracks: ${tracks.length}\n\n`;

    for (const track of tracks) {
        // EXTINF format: #EXTINF:duration,artist - title
        const duration = track.duration || -1;
        const artist = track.artist || 'Unknown Artist';
        const title = track.title || track.filename;

        m3uContent += `#EXTINF:${duration},${artist} - ${title}\n`;
        m3uContent += `${track.filepath}\n`;
    }

    // Ensure directory exists
    await ensurePlaylistsDirectory();

    // Write M3U file
    const m3uFilename = `playlist-${playlistId}.m3u`;
    const m3uPath = path.join(PLAYLISTS_PATH, m3uFilename);

    await fs.writeFile(m3uPath, m3uContent, 'utf8');

    console.log(`[PLAYLIST] ✓ Generated ${m3uFilename} at ${m3uPath}`);
    return m3uPath;
}

/**
 * Delete M3U file for a specific playlist
 * 
 * @param {number} playlistId - Database ID of the playlist
 */
export async function deleteM3UPlaylist(playlistId) {
    const m3uFilename = `playlist-${playlistId}.m3u`;
    const m3uPath = path.join(PLAYLISTS_PATH, m3uFilename);

    try {
        await fs.unlink(m3uPath);
        console.log(`[PLAYLIST] Deleted M3U file: ${m3uFilename}`);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.warn(`[PLAYLIST] Failed to delete ${m3uFilename}:`, error.message);
        }
    }
}

/**
 * Clean up orphaned M3U files
 * Removes M3U files for playlists that no longer exist in database
 */
export async function cleanupOrphanedPlaylists() {
    try {
        await ensurePlaylistsDirectory();
        const files = await fs.readdir(PLAYLISTS_PATH);

        // Get all valid playlist IDs from database
        const playlists = db.getAllPlaylists();
        const validIds = new Set(playlists.map(p => p.id));

        let cleaned = 0;

        for (const file of files) {
            // Only process M3U files matching our naming pattern
            if (!file.endsWith('.m3u')) continue;

            const match = file.match(/^playlist-(\d+)\.m3u$/);
            if (match) {
                const playlistId = parseInt(match[1]);

                if (!validIds.has(playlistId)) {
                    await fs.unlink(path.join(PLAYLISTS_PATH, file));
                    console.log(`[PLAYLIST] Cleaned up orphaned ${file}`);
                    cleaned++;
                }
            }
        }

        if (cleaned > 0) {
            console.log(`[PLAYLIST] Cleanup complete: ${cleaned} orphaned file(s) removed`);
        }
    } catch (error) {
        console.warn('[PLAYLIST] Cleanup failed:', error.message);
    }
}

/**
 * Regenerate all M3U files for active playlists
 * Useful after database restore or migration
 */
export async function regenerateAllPlaylists() {
    const playlists = db.getAllPlaylists();
    const results = {
        success: 0,
        failed: 0,
        errors: []
    };

    console.log(`[PLAYLIST] Regenerating M3U files for ${playlists.length} playlist(s)`);

    for (const playlist of playlists) {
        try {
            await generateM3UPlaylist(playlist.id);
            results.success++;
        } catch (error) {
            console.error(`[PLAYLIST] Failed to regenerate playlist ${playlist.id}:`, error.message);
            results.failed++;
            results.errors.push({ playlistId: playlist.id, error: error.message });
        }
    }

    console.log(`[PLAYLIST] Regeneration complete: ${results.success} success, ${results.failed} failed`);
    return results;
}

/**
 * Get the path to an M3U file for a playlist
 * Does not check if file exists - use generateM3UPlaylist() to ensure it exists
 * 
 * @param {number} playlistId - Database ID of the playlist
 * @returns {string} - Absolute path to M3U file
 */
export function getM3UPath(playlistId) {
    const m3uFilename = `playlist-${playlistId}.m3u`;
    return path.join(PLAYLISTS_PATH, m3uFilename);
}

export default {
    generateM3UPlaylist,
    deleteM3UPlaylist,
    cleanupOrphanedPlaylists,
    regenerateAllPlaylists,
    getM3UPath
};
