import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'stations.db');
const db = new Database(dbPath);

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS stations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    genre TEXT DEFAULT 'Various',
    mount_point TEXT UNIQUE NOT NULL,
    format TEXT DEFAULT 'MP3',
    bitrate INTEGER DEFAULT 128,
    source_password TEXT NOT NULL,
    stream_url TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    listeners INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    logo_url TEXT,
    website_url TEXT,
    alert_emails TEXT,
    updated_at TEXT,
    relay_url TEXT,
    relay_enabled INTEGER DEFAULT 0,
    relay_mode TEXT DEFAULT 'fallback',
    relay_status TEXT DEFAULT 'idle'
  )
`);

// Migration: Add new columns if they don't exist (for existing databases)
try {
    db.exec(`ALTER TABLE stations ADD COLUMN logo_url TEXT`);
} catch (e) { /* Column already exists */ }
try {
    db.exec(`ALTER TABLE stations ADD COLUMN website_url TEXT`);
} catch (e) { /* Column already exists */ }
try {
    db.exec(`ALTER TABLE stations ADD COLUMN alert_emails TEXT`);
} catch (e) { /* Column already exists */ }
try {
    db.exec(`ALTER TABLE stations ADD COLUMN updated_at TEXT`);
} catch (e) { /* Column already exists */ }

// Migration: Relay columns for external stream support
try {
    db.exec(`ALTER TABLE stations ADD COLUMN relay_url TEXT`);
} catch (e) { /* Column already exists */ }
try {
    db.exec(`ALTER TABLE stations ADD COLUMN relay_enabled INTEGER DEFAULT 0`);
} catch (e) { /* Column already exists */ }
try {
    db.exec(`ALTER TABLE stations ADD COLUMN relay_mode TEXT DEFAULT 'fallback'`);
} catch (e) { /* Column already exists */ }
try {
    db.exec(`ALTER TABLE stations ADD COLUMN relay_status TEXT DEFAULT 'idle'`);
} catch (e) { /* Column already exists */ }

// Migration: AutoDJ columns for playlist-based automation
try {
    db.exec(`ALTER TABLE stations ADD COLUMN autodj_enabled INTEGER DEFAULT 0`);
} catch (e) { /* Column already exists */ }
try {
    db.exec(`ALTER TABLE stations ADD COLUMN autodj_playlist_id INTEGER DEFAULT NULL`);
} catch (e) { /* Column already exists */ }
try {
    db.exec(`ALTER TABLE stations ADD COLUMN autodj_mode TEXT DEFAULT 'shuffle'`);
} catch (e) { /* Column already exists */ }
try {
    db.exec(`ALTER TABLE stations ADD COLUMN autodj_crossfade INTEGER DEFAULT 0`);
} catch (e) { /* Column already exists */ }

// Migration: Update old stream URLs to new subdomain format
// Old format: https://icecast.supersoul.top/stream/mount
// New format: https://stream.supersoul.top/mount
const STREAM_HOST = process.env.STREAM_HOST || 'stream.supersoul.top';
try {
    const updateResult = db.prepare(`
        UPDATE stations 
        SET stream_url = 'https://' || ? || mount_point
        WHERE stream_url LIKE '%/stream/%'
    `).run(STREAM_HOST);
    if (updateResult.changes > 0) {
        console.log(`[DB MIGRATION] Updated ${updateResult.changes} station(s) to new stream URL format`);
    }
} catch (e) {
    console.error('[DB MIGRATION] Error updating stream URLs:', e.message);
}

const createStation = (station) => {
    const stmt = db.prepare(`
    INSERT INTO stations (id, name, description, genre, mount_point, format, bitrate, source_password, stream_url, status, listeners, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    return stmt.run(
        station.id,
        station.name,
        station.description,
        station.genre,
        station.mountPoint,
        station.format,
        station.bitrate,
        station.sourcePassword,
        station.streamUrl,
        station.status,
        station.listeners,
        station.createdAt
    );
};

const getAllStations = () => {
    return db.prepare('SELECT * FROM stations ORDER BY created_at DESC').all();
};

const getStationById = (id) => {
    return db.prepare('SELECT * FROM stations WHERE id = ?').get(id);
};

const getStationByMount = (mountPoint) => {
    return db.prepare('SELECT * FROM stations WHERE mount_point = ?').get(mountPoint);
};

const deleteStation = (id) => {
    return db.prepare('DELETE FROM stations WHERE id = ?').run(id);
};

const updateStation = (id, updates) => {
    const { name, description, genre, logoUrl, websiteUrl, alertEmails, relayUrl, relayEnabled, relayMode } = updates;
    return db.prepare(`
        UPDATE stations 
        SET name = ?, description = ?, genre = ?, logo_url = ?, website_url = ?, alert_emails = ?, 
            relay_url = ?, relay_enabled = ?, relay_mode = ?, updated_at = ?
        WHERE id = ?
    `).run(
        name,
        description,
        genre,
        logoUrl || null,
        websiteUrl || null,
        alertEmails ? JSON.stringify(alertEmails) : null,
        relayUrl || null,
        relayEnabled ? 1 : 0,
        relayMode || 'fallback',
        new Date().toISOString(),
        id
    );
};

const updateListeners = (mountPoint, listeners) => {
    return db.prepare('UPDATE stations SET listeners = ? WHERE mount_point = ?').run(listeners, mountPoint);
};

// ==========================================
// ALERTS TABLE
// ==========================================
db.exec(`
  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    station_id TEXT,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

const createAlert = (type, title, message, stationId = null) => {
    const stmt = db.prepare(`
        INSERT INTO alerts (type, title, message, station_id, created_at)
        VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(type, title, message, stationId, new Date().toISOString());
};

const getAllAlerts = (limit = 50) => {
    return db.prepare('SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?').all(limit);
};

const getUnreadAlertCount = () => {
    const result = db.prepare('SELECT COUNT(*) as count FROM alerts WHERE read = 0').get();
    return result.count;
};

const markAlertRead = (id) => {
    return db.prepare('UPDATE alerts SET read = 1 WHERE id = ?').run(id);
};

const markAllAlertsRead = () => {
    return db.prepare('UPDATE alerts SET read = 1 WHERE read = 0').run();
};

// ==========================================
// SETTINGS TABLE (SMTP & Alert Configuration)
// ==========================================
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'singleton',
    smtp_host TEXT,
    smtp_port INTEGER DEFAULT 587,
    smtp_user TEXT,
    smtp_password TEXT,
    smtp_from_name TEXT DEFAULT 'StreamDock Alerts',
    smtp_use_tls INTEGER DEFAULT 1,
    alert_emails TEXT,
    alert_all_streams INTEGER DEFAULT 0,
    alert_cooldown_mins INTEGER DEFAULT 5,
    alert_on_recovery INTEGER DEFAULT 1,
    updated_at TEXT
  )
`);

// Ensure singleton settings row exists
const ensureSettings = db.prepare(`
    INSERT OR IGNORE INTO settings (id) VALUES ('singleton')
`);
ensureSettings.run();

// ==========================================
// AUDIO LIBRARY TABLE (AutoDJ - Phase 1)
// ==========================================
db.exec(`
  CREATE TABLE IF NOT EXISTS audio_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL UNIQUE,
    title TEXT,
    artist TEXT,
    album TEXT,
    duration INTEGER,
    bitrate INTEGER,
    format TEXT,
    filesize INTEGER,
    uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_played TEXT
  )
`);

// ==========================================
// PLAYLISTS TABLE (AutoDJ - Phase 1)
// ==========================================
db.exec(`
  CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 0
  )
`);

// ==========================================
// PLAYLIST TRACKS TABLE (AutoDJ - Phase 1)
// ==========================================
db.exec(`
  CREATE TABLE IF NOT EXISTS playlist_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    audio_file_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    added_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (audio_file_id) REFERENCES audio_files(id) ON DELETE CASCADE
  )
`);

// ==========================================
// AUDIO LIBRARY FUNCTIONS
// ==========================================
const createAudioFile = (file) => {
    const stmt = db.prepare(`
        INSERT INTO audio_files (filename, filepath, title, artist, album, duration, bitrate, format, filesize, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
        file.filename,
        file.filepath,
        file.title || file.filename,
        file.artist || 'Unknown Artist',
        file.album || 'Unknown Album',
        file.duration || 0,
        file.bitrate || 0,
        file.format || 'mp3',
        file.filesize || 0,
        new Date().toISOString()
    );
};

const getAllAudioFiles = () => {
    return db.prepare('SELECT * FROM audio_files ORDER BY uploaded_at DESC').all();
};

const getAudioFileById = (id) => {
    return db.prepare('SELECT * FROM audio_files WHERE id = ?').get(id);
};

const deleteAudioFile = (id) => {
    return db.prepare('DELETE FROM audio_files WHERE id = ?').run(id);
};

const updateAudioFile = (id, updates) => {
    const { title, artist, album } = updates;
    return db.prepare(`
        UPDATE audio_files SET title = ?, artist = ?, album = ? WHERE id = ?
    `).run(title, artist, album, id);
};

const updateAudioFileLastPlayed = (id) => {
    return db.prepare('UPDATE audio_files SET last_played = ? WHERE id = ?').run(new Date().toISOString(), id);
};

// ==========================================
// PLAYLIST FUNCTIONS
// ==========================================
const createPlaylist = (name, description = '') => {
    const stmt = db.prepare(`
        INSERT INTO playlists (name, description, created_at, updated_at)
        VALUES (?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    return stmt.run(name, description, now, now);
};

const getAllPlaylists = () => {
    return db.prepare('SELECT * FROM playlists ORDER BY updated_at DESC').all();
};

const getPlaylistById = (id) => {
    return db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
};

const updatePlaylist = (id, name, description) => {
    return db.prepare(`
        UPDATE playlists SET name = ?, description = ?, updated_at = ? WHERE id = ?
    `).run(name, description, new Date().toISOString(), id);
};

const deletePlaylist = (id) => {
    return db.prepare('DELETE FROM playlists WHERE id = ?').run(id);
};

const setActivePlaylist = (id) => {
    // Deactivate all playlists first
    db.prepare('UPDATE playlists SET is_active = 0').run();
    // Activate the selected one
    return db.prepare('UPDATE playlists SET is_active = 1 WHERE id = ?').run(id);
};

// ==========================================
// PLAYLIST TRACKS FUNCTIONS
// ==========================================
const getPlaylistTracks = (playlistId) => {
    return db.prepare(`
        SELECT pt.*, af.filename, af.filepath, af.title, af.artist, af.album, af.duration, af.format
        FROM playlist_tracks pt
        JOIN audio_files af ON pt.audio_file_id = af.id
        WHERE pt.playlist_id = ?
        ORDER BY pt.position ASC
    `).all(playlistId);
};

const addTrackToPlaylist = (playlistId, audioFileId) => {
    // Get the next position
    const result = db.prepare('SELECT MAX(position) as maxPos FROM playlist_tracks WHERE playlist_id = ?').get(playlistId);
    const nextPos = (result.maxPos || 0) + 1;

    const stmt = db.prepare(`
        INSERT INTO playlist_tracks (playlist_id, audio_file_id, position, added_at)
        VALUES (?, ?, ?, ?)
    `);
    return stmt.run(playlistId, audioFileId, nextPos, new Date().toISOString());
};

const removeTrackFromPlaylist = (playlistId, trackId) => {
    return db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND id = ?').run(playlistId, trackId);
};

const reorderPlaylistTracks = (playlistId, trackIds) => {
    // trackIds is an array of track IDs in the new order
    const stmt = db.prepare('UPDATE playlist_tracks SET position = ? WHERE id = ? AND playlist_id = ?');
    trackIds.forEach((trackId, index) => {
        stmt.run(index + 1, trackId, playlistId);
    });
    return { success: true };
};

const getSettings = () => {
    return db.prepare('SELECT * FROM settings WHERE id = ?').get('singleton');
};

const updateSmtpSettings = (host, port, user, password, fromName, useTls) => {
    // Build dynamic update - only update password if provided
    if (password !== null) {
        return db.prepare(`
            UPDATE settings 
            SET smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_password = ?, 
                smtp_from_name = ?, smtp_use_tls = ?, updated_at = ?
            WHERE id = 'singleton'
        `).run(host, port, user, password, fromName, useTls ? 1 : 0, new Date().toISOString());
    } else {
        // Keep existing password
        return db.prepare(`
            UPDATE settings 
            SET smtp_host = ?, smtp_port = ?, smtp_user = ?, 
                smtp_from_name = ?, smtp_use_tls = ?, updated_at = ?
            WHERE id = 'singleton'
        `).run(host, port, user, fromName, useTls ? 1 : 0, new Date().toISOString());
    }
};

const updateAlertSettings = (emails, allStreams, cooldownMins, onRecovery) => {
    return db.prepare(`
        UPDATE settings 
        SET alert_emails = ?, alert_all_streams = ?, alert_cooldown_mins = ?, 
            alert_on_recovery = ?, updated_at = ?
        WHERE id = 'singleton'
    `).run(
        JSON.stringify(emails),
        allStreams ? 1 : 0,
        cooldownMins,
        onRecovery ? 1 : 0,
        new Date().toISOString()
    );
};

const updateRelayStatus = (id, status) => {
    return db.prepare('UPDATE stations SET relay_status = ?, updated_at = ? WHERE id = ?').run(
        status,
        new Date().toISOString(),
        id
    );
};

export {
    db,
    createStation,
    getAllStations,
    getStationById,
    getStationByMount,
    deleteStation,
    updateStation,
    updateListeners,
    updateRelayStatus,
    createAlert,
    getAllAlerts,
    getUnreadAlertCount,
    markAlertRead,
    markAllAlertsRead,
    getSettings,
    updateSmtpSettings,
    updateAlertSettings,
    // AutoDJ - Audio Library
    createAudioFile,
    getAllAudioFiles,
    getAudioFileById,
    deleteAudioFile,
    updateAudioFile,
    updateAudioFileLastPlayed,
    // AutoDJ - Playlists
    createPlaylist,
    getAllPlaylists,
    getPlaylistById,
    updatePlaylist,
    deletePlaylist,
    setActivePlaylist,
    // AutoDJ - Playlist Tracks
    getPlaylistTracks,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    reorderPlaylistTracks
};

