import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';
import httpProxy from 'http-proxy';
import * as db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Icecast server config
// ICECAST_HOST is for internal API calls (localhost when in same container)
// ICECAST_PUBLIC_HOST is what users see for connection info
const ICECAST_HOST = process.env.ICECAST_HOST || 'localhost';
const ICECAST_INTERNAL_PORT = process.env.ICECAST_PORT || 8000;
const ICECAST_PUBLIC_PORT = process.env.ICECAST_PUBLIC_PORT || process.env.ICECAST_PORT || 8000;
const ICECAST_PUBLIC_HOST = process.env.ICECAST_PUBLIC_HOST || process.env.ICECAST_HOST || 'localhost';
const ICECAST_SOURCE_PASSWORD = process.env.ICECAST_SOURCE_PASSWORD || 'streamdock_source';

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
        // All stations use the same Icecast source password from config
        const sourcePassword = ICECAST_SOURCE_PASSWORD;
        // Stream URL goes through /stream/ proxy (same port as web UI)
        const streamUrl = `https://${ICECAST_PUBLIC_HOST}/stream${mountPoint}`;

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
                server: ICECAST_PUBLIC_HOST,
                port: ICECAST_PUBLIC_PORT,
                mountPoint: station.mountPoint,
                sourcePassword: station.sourcePassword,
                protocol: 'http',
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
                server: ICECAST_PUBLIC_HOST,
                port: ICECAST_PUBLIC_PORT,
                mountPoint: station.mount_point,
                sourcePassword: station.source_password,
                protocol: 'http',
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
    res.json({ status: 'ok', icecast: { host: ICECAST_HOST, port: ICECAST_INTERNAL_PORT } });
});

// Secure Icecast status page proxy
// Access status via https://icecast.supersoul.top/icecast-status
app.get('/icecast-status', async (req, res) => {
    try {
        const response = await fetch(`http://${ICECAST_HOST}:${ICECAST_INTERNAL_PORT}/status.xsl`);
        const html = await response.text();
        res.set('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error('Error fetching Icecast status:', error);
        res.status(502).send('Unable to fetch Icecast status');
    }
});

// Secure Icecast JSON status proxy
// Access JSON via https://icecast.supersoul.top/icecast-status.json
app.get('/icecast-status.json', async (req, res) => {
    try {
        const response = await fetch(`http://${ICECAST_HOST}:${ICECAST_INTERNAL_PORT}/status-json.xsl`);
        const json = await response.json();
        res.json(json);
    } catch (error) {
        console.error('Error fetching Icecast JSON status:', error);
        res.status(502).json({ error: 'Unable to fetch Icecast status' });
    }
});


app.get('/api/debug-connection', async (req, res) => {
    const streamMount = req.query.mount || '/new';
    const targetUrl = `http://${ICECAST_HOST}:${ICECAST_INTERNAL_PORT}/status.xsl`;
    const targetStreamUrl = `http://${ICECAST_HOST}:${ICECAST_INTERNAL_PORT}${streamMount}`;

    // Config info
    const results = {
        config: { ICECAST_HOST, ICECAST_INTERNAL_PORT, streamMount },
        tests: []
    };

    // Helper function for testing
    const testUrl = async (url, label) => {
        try {
            const start = Date.now();
            const response = await fetch(url);
            results.tests.push({
                label,
                url,
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                latency: Date.now() - start,
                success: response.ok
            });
        } catch (e) {
            results.tests.push({
                label,
                url,
                error: e.message,
                code: e.code,
                success: false
            });
        }
    };

    await testUrl(targetUrl, "Icecast Status Page");
    await testUrl(targetStreamUrl, "Icecast Stream Mount");

    res.json(results);
});

// Get live status from Icecast server
app.get('/api/icecast-status', async (req, res) => {
    try {
        // Icecast status endpoint (JSON format)
        const statusUrl = `http://${ICECAST_HOST}:${ICECAST_INTERNAL_PORT}/status-json.xsl`;
        console.log('Fetching Icecast status from:', statusUrl);

        const response = await fetch(statusUrl);

        if (!response.ok) {
            console.log('Icecast status response not ok:', response.status);
            return res.json({ live: false, mounts: [], error: 'Could not reach Icecast server' });
        }

        const data = await response.json();
        const icestats = data.icestats || {};

        console.log('Icecast stats received:', JSON.stringify(icestats, null, 2));

        // Get active sources/mounts
        let sources = icestats.source || [];
        if (!Array.isArray(sources)) {
            sources = sources ? [sources] : [];
        }

        console.log('Sources found:', sources.length);

        const liveMounts = sources.map(s => {
            // Try different ways to get the mount point
            let mount = '';

            // Option 1: Get from listenurl (e.g., "http://icecast.supersoul.top:8000/stationdock-test")
            if (s.listenurl) {
                const urlParts = s.listenurl.split('/');
                mount = '/' + urlParts[urlParts.length - 1];
            }
            // Option 2: server_name might be the mount
            else if (s.server_name && s.server_name.startsWith('/')) {
                mount = s.server_name;
            }
            // Option 3: Just use server_name as-is
            else if (s.server_name) {
                mount = '/' + s.server_name;
            }

            console.log('Parsed mount:', mount, 'from source:', s.listenurl || s.server_name);

            return {
                mount,
                listeners: s.listeners || 0,
                title: s.title || s.server_name || 'Unknown',
                bitrate: s.bitrate || 128,
                genre: s.genre || ''
            };
        });

        console.log('Live mounts:', liveMounts);

        res.json({
            live: liveMounts.length > 0,
            mounts: liveMounts,
            serverInfo: {
                admin: icestats.admin,
                host: icestats.host,
                location: icestats.location
            },
            debug: { sourceCount: sources.length }
        });
    } catch (error) {
        console.error('Error fetching Icecast status:', error);
        res.json({ live: false, mounts: [], error: error.message });
    }
});

// Proxy Icecast streams through the same port
// This allows everything to run on port 3000

// Create Proxy Server with standard robust handling
const proxy = httpProxy.createProxyServer({
    ignorePath: false,  // CRITICAL: Must be false to forward /new, /live etc. to Icecast
    changeOrigin: true
});

proxy.on('proxyRes', (proxyRes, req, res) => {
    // MIMIC ICECAST EXACTLY:
    // 1. Force 'Server' header to look like Icecast
    proxyRes.headers['server'] = 'Icecast 2.4.4';

    // 2. DISABLE CHUNKED ENCODING (Detailed fix)
    delete proxyRes.headers['transfer-encoding'];
    // Force Node.js to NOT add chunked encoding automatically
    if (res.chunkedEncoding) {
        res.chunkedEncoding = false;
        res.useChunkedEncodingByDefault = false;
    }

    // 3. Ensure Connection Close (for strict compatibility)
    proxyRes.headers['connection'] = 'close';
});

proxy.on('error', (err, req, res) => {
    console.error(`[PROXY ERROR] Target: ${req.url} | Error: ${err.message}`);
    if (!res.headersSent) {
        res.status(502).end();
    }
});

// Proxy Icecast streams through the same port
// This allows everything to run on port 3000

// HEAD handler for ingestion software compatibility
// Icecast returns 400 on HEAD, but ingestion software expects 200
// Return static 200 OK with standard Icecast headers (no proxy needed)
app.head('/stream/:mount', (req, res) => {
    console.log(`[HEAD] /stream/${req.params.mount} - returning static 200 OK`);
    res.status(200);
    res.set('Server', 'Icecast 2.4.4');
    res.set('Content-Type', 'audio/mpeg');
    res.set('Connection', 'Close');
    res.set('Cache-Control', 'no-cache, no-store');
    res.set('Pragma', 'no-cache');
    res.set('icy-name', 'StreamDock');
    res.set('icy-pub', '0');
    res.end();
});


app.use('/stream', (req, res) => {
    // FIX: Do NOT append path to target. http-proxy automatically appends req.url (which is /mount).
    // Previous bug: target ending in /mount + req.url /mount = /mount/mount -> 404
    const target = `http://${ICECAST_HOST}:${ICECAST_INTERNAL_PORT}`;

    console.log(`[PROXY START] Forwarding ${req.originalUrl} to: ${target}${req.url}`);

    // Use http-proxy to stream data robustly
    proxy.web(req, res, {
        target: target,
        headers: {
            'Icy-MetaData': '1',
            'User-Agent': 'StreamDock-Proxy/1.0',
            'Connection': 'close'
        }
    });
});

// Proxy Icecast status page
app.use('/status', async (req, res) => {
    const icecastUrl = `http://${ICECAST_HOST}:${ICECAST_INTERNAL_PORT}/status${req.path}`;
    try {
        const response = await fetch(icecastUrl);
        const data = await response.text();
        res.set('Content-Type', response.headers.get('content-type') || 'text/html');
        res.send(data);
    } catch (error) {
        res.status(502).send('Icecast status unavailable');
    }
});

// Catch-all for React app in production (serves index.html for client-side routing)
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        // Skip API routes and streams
        if (req.path.startsWith('/api') || req.path.startsWith('/stream') || req.path.startsWith('/status')) {
            return next();
        }
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
}

app.listen(PORT, () => {
    console.log(`StreamDock API running on port ${PORT}`);
    console.log(`Icecast server: ${ICECAST_HOST}:${ICECAST_INTERNAL_PORT} (Public: ${ICECAST_PUBLIC_PORT})`);
});
