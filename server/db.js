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
    updated_at TEXT
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
    db.exec(`ALTER TABLE stations ADD COLUMN updated_at TEXT`);
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
    const { name, description, genre, logoUrl, websiteUrl } = updates;
    return db.prepare(`
        UPDATE stations 
        SET name = ?, description = ?, genre = ?, logo_url = ?, website_url = ?, updated_at = ?
        WHERE id = ?
    `).run(name, description, genre, logoUrl || null, websiteUrl || null, new Date().toISOString(), id);
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

export {
    createStation,
    getAllStations,
    getStationById,
    getStationByMount,
    deleteStation,
    updateStation,
    updateListeners,
    createAlert,
    getAllAlerts,
    getUnreadAlertCount,
    markAlertRead,
    markAllAlertsRead
};
