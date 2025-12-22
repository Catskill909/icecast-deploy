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
    created_at TEXT NOT NULL
  )
`);

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

const updateListeners = (mountPoint, listeners) => {
    return db.prepare('UPDATE stations SET listeners = ? WHERE mount_point = ?').run(listeners, mountPoint);
};

export {
    createStation,
    getAllStations,
    getStationById,
    getStationByMount,
    deleteStation,
    updateListeners
};
