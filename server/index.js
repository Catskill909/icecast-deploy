import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import * as db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Icecast server config - this app embeds Icecast
const ICECAST_HOST = process.env.ICECAST_HOST || 'icecast.supersoul.top';
const ICECAST_PORT = process.env.ICECAST_PORT || 8000;

app.use(cors());
app.use(express.json());

// Serve static React build in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist')));
}

// Generate a random password for source connections
function generatePassword(length = 12) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Create a new station (mount point)
app.post('/api/stations', (req, res) => {
    try {
        const { name, description, genre, format = 'MP3', bitrate = 128 } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Station name is required' });
        }

        // Generate mount point from name (e.g., "My Radio" -> "/my-radio")
        const mountPoint = '/' + name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        // Check if mount point already exists
        const existing = db.getStationByMount(mountPoint);
        if (existing) {
            return res.status(400).json({ error: 'A station with this name already exists' });
        }

        const id = uuidv4();
        const sourcePassword = generatePassword();
        const streamUrl = `https://${ICECAST_HOST}:${ICECAST_PORT}${mountPoint}`;

        const station = {
            id,
            name,
            description: description || '',
            genre: genre || 'Various',
            format,
            bitrate: parseInt(bitrate),
            mountPoint,
            sourcePassword,
            streamUrl,
            status: 'active',
            listeners: 0,
            createdAt: new Date().toISOString()
        };

        db.createStation(station);

        // Return connection info
        res.status(201).json({
            success: true,
            station: {
                id: station.id,
                name: station.name,
                mountPoint: station.mountPoint,
                streamUrl: station.streamUrl,
                status: station.status
            },
            connectionInfo: {
                server: ICECAST_HOST,
                port: ICECAST_PORT,
                mountPoint: station.mountPoint,
                sourcePassword: station.sourcePassword,
                protocol: 'https',
                streamUrl: station.streamUrl,
                format: station.format,
                bitrate: station.bitrate
            }
        });
    } catch (error) {
        console.error('Error creating station:', error);
        res.status(500).json({ error: 'Failed to create station' });
    }
});

// Get all stations
app.get('/api/stations', (req, res) => {
    try {
        const stations = db.getAllStations();
        res.json(stations.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            mountPoint: s.mount_point,
            streamUrl: s.stream_url,
            format: s.format,
            bitrate: s.bitrate,
            status: s.status,
            listeners: s.listeners,
            createdAt: s.created_at
        })));
    } catch (error) {
        console.error('Error fetching stations:', error);
        res.status(500).json({ error: 'Failed to fetch stations' });
    }
});

// Get single station with connection info
app.get('/api/stations/:id', (req, res) => {
    try {
        const station = db.getStationById(req.params.id);
        if (!station) {
            return res.status(404).json({ error: 'Station not found' });
        }

        res.json({
            id: station.id,
            name: station.name,
            description: station.description,
            genre: station.genre,
            mountPoint: station.mount_point,
            format: station.format,
            bitrate: station.bitrate,
            status: station.status,
            listeners: station.listeners,
            createdAt: station.created_at,
            connectionInfo: {
                server: ICECAST_HOST,
                port: ICECAST_PORT,
                mountPoint: station.mount_point,
                sourcePassword: station.source_password,
                protocol: 'https',
                streamUrl: station.stream_url
            }
        });
    } catch (error) {
        console.error('Error fetching station:', error);
        res.status(500).json({ error: 'Failed to fetch station' });
    }
});

// Delete a station
app.delete('/api/stations/:id', (req, res) => {
    try {
        const station = db.getStationById(req.params.id);
        if (!station) {
            return res.status(404).json({ error: 'Station not found' });
        }

        db.deleteStation(req.params.id);
        res.json({ success: true, message: 'Station deleted' });
    } catch (error) {
        console.error('Error deleting station:', error);
        res.status(500).json({ error: 'Failed to delete station' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', icecast: { host: ICECAST_HOST, port: ICECAST_PORT } });
});

// Catch-all for React app in production (serves index.html for client-side routing)
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        // Skip API routes
        if (req.path.startsWith('/api')) {
            return next();
        }
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`IceCast Pro API running on port ${PORT}`);
    console.log(`Icecast server: ${ICECAST_HOST}:${ICECAST_PORT}`);
});
