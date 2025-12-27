import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';
import httpProxy from 'http-proxy';
import nodemailer from 'nodemailer';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import * as musicMetadata from 'music-metadata';
import fs from 'fs/promises';
import * as db from './db.js';
import { encrypt, decrypt, isEncrypted } from './crypto.js';
import * as icecastConfig from './icecastConfig.js';
import * as liquidsoopConfig from './liquidsoopConfig.js';

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
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
// Stream subdomain for HTTPS streaming (bypasses Traefik timeout)
const STREAM_HOST = process.env.STREAM_HOST || 'stream.supersoul.top';
// Liquidsoap port for encoder connections (encoders connect here, not to Icecast)
const LIQUIDSOAP_PORT = process.env.LIQUIDSOAP_PORT || 8001;

// AutoDJ Audio Files Path
// Production (Coolify): /app/data/audiofiles (persistent volume)
// Local development: ./server/audiofiles (relative to project)
const AUDIO_FILES_PATH = process.env.AUDIO_FILES_PATH || path.join(__dirname, 'audiofiles');

// Ensure audio files directory exists
(async () => {
    try {
        await fs.mkdir(AUDIO_FILES_PATH, { recursive: true });
        console.log(`[AUTODJ] Audio files directory: ${AUDIO_FILES_PATH}`);
    } catch (e) {
        console.error('[AUTODJ] Failed to create audio directory:', e.message);
    }
})();

// Multer storage configuration for audio uploads
const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, AUDIO_FILES_PATH);
    },
    filename: (req, file, cb) => {
        // Preserve original filename but make it unique
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext);
        cb(null, `${base}-${uniqueSuffix}${ext}`);
    }
});

const audioUpload = multer({
    storage: audioStorage,
    limits: { fileSize: 400 * 1024 * 1024 }, // 400MB
    fileFilter: (req, file, cb) => {
        // Accept audio files only
        const allowedMimes = ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/flac', 'audio/aac', 'audio/mp4', 'audio/x-m4a'];
        const allowedExts = ['.mp3', '.ogg', '.flac', '.aac', '.m4a'];
        const ext = path.extname(file.originalname).toLowerCase();

        if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type: ${file.mimetype}. Only MP3, OGG, FLAC, AAC allowed.`));
        }
    }
});

// Track previous mount status for alert generation
let previousMountStatus = {}; // { "/mount": { live: true, listeners: 0 } }
let lastAlertTime = {}; // Prevent alert spam

// Debug log buffer for diagnostics page
const DEBUG_LOG_BUFFER = [];
const MAX_LOG_ENTRIES = 100;

function debugLog(message) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${message}`;
    DEBUG_LOG_BUFFER.unshift(entry); // Add to front
    if (DEBUG_LOG_BUFFER.length > MAX_LOG_ENTRIES) {
        DEBUG_LOG_BUFFER.pop(); // Remove oldest
    }
    console.log(message); // Also log to console
}
let lastEmailTime = {}; // Prevent email spam (separate from in-app alerts)

// ==========================================
// EMAIL ALERT UTILITY
// ==========================================

/**
 * Send alert email to all configured recipients
 * @param {string} type - 'stream_down' | 'stream_up' | 'milestone'
 * @param {string} title - Email subject line
 * @param {string} message - Email body content
 * @param {Object} station - Optional station object with name, mount, streamUrl
 */
/**
 * Send alert email to configured recipients (Global + Station specific)
 * @param {string} type - 'stream_down' | 'stream_up' | 'milestone'
 * @param {string} title - Email subject line
 * @param {string} message - Email body content
 * @param {Object} station - Optional station object with name, mount, streamUrl, alert_emails
 */
async function sendAlertEmail(type, title, message, station = null) {
    try {
        const settings = db.getSettings();

        // Check if email alerts are configured
        if (!settings?.smtp_host || !settings?.smtp_user || !settings?.smtp_password) {
            console.log('[EMAIL] SMTP not configured, skipping email alert');
            return;
        }

        // 1. Get Global Recipients
        const globalEmails = settings.alert_emails ? JSON.parse(settings.alert_emails) : [];
        console.log(`[EMAIL] Global recipients: ${globalEmails.length}`);

        // 2. Get Station-Specific Recipients
        let stationEmails = [];
        if (station && station.alert_emails) {
            try {
                stationEmails = JSON.parse(station.alert_emails);
                // Ensure array
                if (!Array.isArray(stationEmails)) stationEmails = [];
            } catch (e) {
                console.warn('[EMAIL] Failed to parse station alert emails:', e.message);
            }
        }
        console.log(`[EMAIL] Station recipients: ${stationEmails.length}`);

        // 3. Determine Final Recipient List
        // Rule: 
        // - If Station Emails exist: Send to them.
        // - IF "Monitor All Streams" is ON (alert_all_streams): ALSO send to Global Emails.
        // - IF No Station Emails exist: Send to Global Emails (if "Monitor All Streams" is ON ?? No, usually default is strict).
        // Let's stick to the user's "Override" concept or simple addition.
        // Revised Rule based on typical "Monitor ALL":
        // - Station Emails: ALWAYS receive alerts for their station.
        // - Global Emails: Receive alerts IF "alert_all_streams" is TRUE.

        let recipients = new Set(stationEmails);

        if (settings.alert_all_streams) {
            globalEmails.forEach(email => recipients.add(email));
        } else if (stationEmails.length === 0) {
            // Fallback: If no station specific emails, maybe we should use global?
            // But if "Monitor All" is OFF, global shouldn't get "noisy" alerts.
            // BUT, if the user hasn't set up station alerts yet, they probably expect global to work like before.
            // Let's say: If NO station alerts configured, default to global.
            // If station alerts configured, only add global if "Monitor All" is ON.
            globalEmails.forEach(email => recipients.add(email));
        }

        const finalRecipients = Array.from(recipients);

        if (finalRecipients.length === 0) {
            console.log('[EMAIL] No recipients for this alert, skipping');
            return;
        }

        // Check if this type of alert should be sent
        // For recovery (stream_up), check alertOnRecovery setting (Global setting applies to everyone for consistency)
        if (type === 'stream_up' && !settings.alert_on_recovery) {
            console.log('[EMAIL] Recovery notifications disabled globally, skipping');
            return;
        }

        // Check cooldown
        const cooldownMs = (settings.alert_cooldown_mins || 5) * 60 * 1000;
        const emailKey = `${type}_${station?.mount || 'global'}`;
        if (lastEmailTime[emailKey] && (Date.now() - lastEmailTime[emailKey]) < cooldownMs) {
            console.log(`[EMAIL] Cooldown active for ${emailKey}, skipping`);
            return;
        }

        // Decrypt password
        let decryptedPassword;
        try {
            decryptedPassword = isEncrypted(settings.smtp_password)
                ? decrypt(settings.smtp_password)
                : settings.smtp_password;
        } catch (err) {
            console.error('[EMAIL] Failed to decrypt SMTP password:', err);
            return;
        }

        if (!decryptedPassword) {
            console.error('[EMAIL] SMTP password is empty after decryption');
            return;
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            host: settings.smtp_host,
            port: settings.smtp_port,
            secure: settings.smtp_port === 465,
            auth: {
                user: settings.smtp_user,
                pass: decryptedPassword
            },
            tls: settings.smtp_use_tls ? { rejectUnauthorized: false } : undefined
        });

        // Determine email styling based on type
        const typeStyles = {
            stream_down: { emoji: '🔴', color: '#f87171', label: 'STREAM DOWN' },
            stream_up: { emoji: '🟢', color: '#4ade80', label: 'STREAM RECOVERED' },
            milestone: { emoji: '🎉', color: '#4b7baf', label: 'MILESTONE' },
            fallback_activated: { emoji: '⚠️', color: '#f59e0b', label: 'FALLBACK ACTIVE' }
        };
        const style = typeStyles[type] || typeStyles.milestone;

        // Build email HTML
        const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: ${style.color}; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">${style.emoji} ${style.label}</h1>
                </div>
                <div style="background: #f8fafc; padding: 30px;">
                    <h2 style="margin: 0 0 15px 0; color: #1e293b;">${title}</h2>
                    <p style="color: #64748b; font-size: 16px; line-height: 1.5;">${message}</p>
                    ${station ? `
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-top: 20px;">
                            <p style="margin: 0 0 5px 0;"><strong>Station:</strong> ${station.name || 'Unknown'}</p>
                            <p style="margin: 0 0 5px 0;"><strong>Mount:</strong> ${station.mount || 'N/A'}</p>
                            ${station.streamUrl ? `<p style="margin: 0;"><strong>Stream URL:</strong> <a href="${station.streamUrl}">${station.streamUrl}</a></p>` : ''}
                        </div>
                    ` : ''}
                </div>
                <div style="background: #1e293b; color: #94a3b8; padding: 15px; text-align: center; font-size: 12px;">
                    Sent by StreamDock &bull; ${new Date().toLocaleString()}
                </div>
            </div>
        `;

        // Send to all recipients
        await transporter.sendMail({
            from: `"${settings.smtp_from_name || 'StreamDock Alerts'}" <${settings.smtp_user}>`,
            to: finalRecipients.join(', '),
            subject: `${style.emoji} ${title}`,
            html
        });

        // Update cooldown tracker
        lastEmailTime[emailKey] = Date.now();
        console.log(`[EMAIL] Alert sent to ${finalRecipients.length} recipient(s): ${title}`);

    } catch (error) {
        console.error('[EMAIL] Failed to send alert email:', error.message);
    }
}

app.use(cors({
    origin: true, // Reflect request origin to allow localhost:5173
    credentials: true // Allow cookies
}));
app.use(express.json());
app.use(cookieParser());

// ==========================================
// PUBLIC ROUTES (No Auth Required)
// ==========================================

// Auth Routes
app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.cookie('auth_session', 'true', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('auth_session');
    res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
    res.json({ authenticated: req.cookies.auth_session === 'true' });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', icecast: { host: ICECAST_HOST, port: ICECAST_INTERNAL_PORT } });
});

// Diagnostics endpoint (for debugging)
app.get('/api/diagnostics', async (req, res) => {
    try {
        // Get all stations with their relay config
        const stations = db.getAllStations();

        // Try to get Icecast status
        let icecastStatus = { connected: false, activeMounts: 0, totalListeners: 0 };
        try {
            const icecastRes = await fetch(`http://${ICECAST_HOST}:${ICECAST_INTERNAL_PORT}/status-json.xsl`);
            if (icecastRes.ok) {
                const data = await icecastRes.json();
                const sources = data.icestats?.source || [];
                const sourceArray = Array.isArray(sources) ? sources : [sources];
                icecastStatus = {
                    connected: true,
                    activeMounts: sourceArray.length,
                    totalListeners: sourceArray.reduce((sum, s) => sum + (s.listeners || 0), 0),
                    mounts: sourceArray.map(s => ({
                        mount: s.listenurl?.replace(/.*:\d+/, '') || s.server_name,
                        listeners: s.listeners
                    }))
                };
            }
        } catch (e) {
            icecastStatus.error = e.message;
        }

        // Get active relays
        const activeRelays = []; // Phase 4: Managed by Liquidsoap

        // Mark which stations are live based on Icecast status
        const stationsWithStatus = stations.map(s => ({
            ...s,
            isLive: icecastStatus.mounts?.some(m => m.mount === s.mount_point) || false
        }));

        // Generate icecast config preview (mount sections only)
        let icecastConfig = '';
        try {
            const fs = await import('fs');
            // In production (Debian), config is at /etc/icecast2/icecast.xml
            const configPath = process.env.NODE_ENV === 'production'
                ? '/etc/icecast2/icecast.xml'
                : path.join(__dirname, '../icecast.xml');
            const fullConfig = fs.readFileSync(configPath, 'utf8');
            // Extract mount sections
            const mountMatches = fullConfig.match(/<mount>[\s\S]*?<\/mount>/g);
            icecastConfig = mountMatches ? mountMatches.join('\n\n') : 'No mount sections found';
        } catch (e) {
            icecastConfig = `Error reading config: ${e.message}`;
        }

        res.json({
            server: {
                uptime: process.uptime() ? `${Math.floor(process.uptime() / 60)} minutes` : 'N/A',
                nodeVersion: process.version
            },
            icecast: icecastStatus,
            stations: stationsWithStatus,
            activeRelays,
            recentLogs: DEBUG_LOG_BUFFER.slice(0, 50),
            icecastConfig
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// PROTECTED ROUTES (Auth Required)
// ==========================================

// Auth Middleware (Strict)
const requireAuth = (req, res, next) => {
    if (req.cookies.auth_session === 'true') {
        return next();
    }
    // Check if it's a debug connection (allow)
    if (req.path.startsWith('/debug-connection')) return next();

    // Allow encoder webhook endpoints - called by Liquidsoap, not browser
    // Note: req.path is relative to mount point, so it's /encoder/ not /api/encoder/
    if (req.path.startsWith('/encoder/')) return next();

    res.status(401).json({ error: 'Unauthorized' });
};

// Apply auth middleware to all remaining API routes
app.use('/api', requireAuth);

// Serve static React build in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist')));
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
        // Stream URL uses dedicated subdomain for HTTPS streaming
        const streamUrl = `https://${STREAM_HOST}${mountPoint}`;

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

        // Regenerate Icecast config with new mount
        icecastConfig.regenerateIcecastConfig();

        // Regenerate Liquidsoap config for new station
        liquidsoopConfig.regenerateLiquidsoapConfig();

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
                port: LIQUIDSOAP_PORT,
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
            genre: s.genre,
            mountPoint: s.mount_point,
            streamUrl: s.stream_url,
            format: s.format,
            bitrate: s.bitrate,
            status: s.status,
            listeners: s.listeners,
            logoUrl: s.logo_url,
            websiteUrl: s.website_url,
            createdAt: s.created_at,
            alertEmails: s.alert_emails ? JSON.parse(s.alert_emails) : [],
            relayUrl: s.relay_url || '',
            relayEnabled: s.relay_enabled === 1,
            relayMode: s.relay_mode || 'fallback',
            relayStatus: s.relay_status || 'idle'
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
            logoUrl: station.logo_url,
            websiteUrl: station.website_url,
            createdAt: station.created_at,
            alertEmails: station.alert_emails ? JSON.parse(station.alert_emails) : [],
            relayUrl: station.relay_url || '',
            relayEnabled: station.relay_enabled === 1,
            relayMode: station.relay_mode || 'fallback',
            relayStatus: station.relay_status || 'idle',
            connectionInfo: {
                server: ICECAST_PUBLIC_HOST,
                port: LIQUIDSOAP_PORT,
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

// Update a station
app.put('/api/stations/:id', async (req, res) => {
    try {
        const station = db.getStationById(req.params.id);
        if (!station) {
            return res.status(404).json({ error: 'Station not found' });
        }

        const { name, description, genre, logoUrl, websiteUrl, alertEmails, relayUrl, relayEnabled, relayMode } = req.body;

        // Validate required fields
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Station name is required' });
        }

        // Check if relay setting changed
        const wasRelayEnabled = station.relay_enabled === 1;
        const isNowRelayEnabled = relayEnabled === true;
        const relaySettingsChanged = wasRelayEnabled !== isNowRelayEnabled ||
            station.relay_url !== relayUrl ||
            station.relay_mode !== relayMode;

        db.updateStation(req.params.id, {
            name: name.trim(),
            description: description || '',
            genre: genre || 'Various',
            logoUrl: logoUrl || null,
            websiteUrl: websiteUrl || null,
            alertEmails: Array.isArray(alertEmails) ? alertEmails : null,
            relayUrl: relayUrl || null,
            relayEnabled: relayEnabled || false,
            relayMode: relayMode || 'fallback'
        });

        // Handle relay start/stop based on settings change
        // Handle relay settings change - Liquidsoap handles logic via config regeneration
        if (relaySettingsChanged) {
            console.log(`[Relay] Station ${req.params.id}: Relay settings changed, regenerating config...`);

            // Fix: Explicitly update relayStatus based on enabled state
            // If enabled -> 'active' (GREEN) because fallback IS now streaming
            // If disabled -> 'idle'
            const newStatus = isNowRelayEnabled ? 'active' : 'idle';

            db.updateRelayStatus(req.params.id, newStatus);
        }

        // Regenerate configs if relay settings changed
        if (relaySettingsChanged) {
            icecastConfig.regenerateIcecastConfig();
            await liquidsoopConfig.regenerateLiquidsoapConfig();
        }

        res.json({ success: true, message: 'Station updated' });
    } catch (error) {
        console.error('Error updating station:', error);
        res.status(500).json({ error: 'Failed to update station' });
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

        // Regenerate configs without deleted station
        icecastConfig.regenerateIcecastConfig();
        liquidsoopConfig.regenerateLiquidsoapConfig();

        res.json({ success: true, message: 'Station deleted' });
    } catch (error) {
        console.error('Error deleting station:', error);
        res.status(500).json({ error: 'Failed to delete station' });
    }
});

// ==========================================
// RELAY URL VALIDATION
// ==========================================

/**
 * Test a relay URL to verify it's a valid audio stream
 * Checks: URL reachability, content type, audio format, bitrate
 */
app.post('/api/relay/test-url', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ valid: false, error: 'URL is required' });
    }

    // Basic URL validation
    let parsedUrl;
    try {
        parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return res.status(400).json({ valid: false, error: 'URL must use HTTP or HTTPS' });
        }
    } catch (e) {
        return res.status(400).json({ valid: false, error: 'Invalid URL format' });
    }

    console.log(`[RELAY TEST] Testing URL: ${url}`);

    try {
        // Use AbortController for timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        // Fetch with ICY metadata header (Shoutcast compatibility)
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Icy-MetaData': '1',
                'User-Agent': 'StreamDock/1.0 (Relay Tester)'
            },
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            return res.json({
                valid: false,
                error: `Server returned ${response.status}: ${response.statusText}`
            });
        }

        // Get headers for analysis
        const contentType = response.headers.get('content-type') || '';
        const icyName = response.headers.get('icy-name') || '';
        const icyGenre = response.headers.get('icy-genre') || '';
        const icyBr = response.headers.get('icy-br') || '';
        const icyDescription = response.headers.get('icy-description') || '';

        // Determine audio format from content-type
        let format = 'Unknown';
        let formatDetails = '';

        if (contentType.includes('audio/mpeg') || contentType.includes('audio/mp3')) {
            format = 'MP3';
        } else if (contentType.includes('audio/aac') || contentType.includes('audio/aacp')) {
            format = 'AAC';
        } else if (contentType.includes('audio/ogg')) {
            format = 'Ogg Vorbis';
        } else if (contentType.includes('audio/opus')) {
            format = 'Opus';
        } else if (contentType.includes('audio/flac')) {
            format = 'FLAC';
        } else if (contentType.includes('audio/')) {
            format = contentType.replace('audio/', '').toUpperCase();
        } else if (contentType.includes('application/ogg')) {
            format = 'Ogg';
        }

        // Build format details string
        if (icyBr) {
            formatDetails = `${format} ${icyBr}kbps`;
        } else {
            formatDetails = format;
        }

        // Read a small chunk to verify it's actually audio data
        const reader = response.body?.getReader();
        let isAudioData = false;

        if (reader) {
            try {
                const { value } = await reader.read();
                if (value && value.length > 0) {
                    isAudioData = true;
                    // Check for common audio signatures
                    // MP3: starts with 0xFF 0xFB or ID3 tag
                    // AAC: starts with 0xFF 0xF1 or 0xFF 0xF9
                    // Ogg: starts with "OggS"
                    const firstBytes = Array.from(value.slice(0, 4));
                    if (firstBytes[0] === 0xFF && (firstBytes[1] === 0xFB || firstBytes[1] === 0xFA)) {
                        format = 'MP3';
                    } else if (firstBytes[0] === 0xFF && (firstBytes[1] === 0xF1 || firstBytes[1] === 0xF9)) {
                        format = 'AAC';
                    } else if (String.fromCharCode(...firstBytes) === 'OggS') {
                        format = 'Ogg';
                    } else if (String.fromCharCode(...firstBytes.slice(0, 3)) === 'ID3') {
                        format = 'MP3'; // MP3 with ID3 tag
                    }
                }
                reader.cancel(); // Stop reading more data
            } catch (readError) {
                console.log('[RELAY TEST] Could not read stream sample:', readError.message);
            }
        }

        // Check if we got valid audio
        const isValidAudio = format !== 'Unknown' || contentType.includes('audio') || isAudioData;

        if (!isValidAudio) {
            return res.json({
                valid: false,
                error: 'URL does not appear to be an audio stream',
                contentType
            });
        }

        // Success!
        console.log(`[RELAY TEST] Valid stream: ${formatDetails} - ${icyName || url}`);

        res.json({
            valid: true,
            format,
            formatDetails: icyBr ? `${format} ${icyBr}kbps` : format,
            bitrate: icyBr ? parseInt(icyBr) : null,
            metadata: {
                name: icyName || null,
                genre: icyGenre || null,
                description: icyDescription || null
            },
            contentType
        });

    } catch (error) {
        console.error('[RELAY TEST] Error testing URL:', error.message);

        let errorMessage = 'Could not connect to stream';
        if (error.name === 'AbortError') {
            errorMessage = 'Connection timed out (10s)';
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = 'Host not found';
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Connection refused';
        } else if (error.message) {
            errorMessage = error.message;
        }

        res.json({
            valid: false,
            error: errorMessage
        });
    }
});

// ==========================================
// RELAY CONTROL API
// ==========================================

// Start relay for a station (Enable + Update Config)
app.post('/api/relay/:stationId/start', async (req, res) => {
    const { stationId } = req.params;
    console.log(`[API] Enabling relay for station: ${stationId}`);
    try {
        // Set status to 'ready' (Orange badge) to indicate fallback protection is active
        db.updateStation(stationId, { relayEnabled: true });
        db.updateRelayStatus(stationId, 'ready');
        await liquidsoopConfig.regenerateLiquidsoapConfig();
        res.json({ success: true, message: 'Relay enabled and config regenerated' });
    } catch (error) {
        console.error('Error starting relay:', error);
        res.status(500).json({ success: false, error: 'Failed to start relay' });
    }
});

// Stop relay for a station (Disable + Update Config)
app.post('/api/relay/:stationId/stop', async (req, res) => {
    const { stationId } = req.params;
    console.log(`[API] Disabling relay for station: ${stationId}`);
    try {
        // Set status to 'idle' (Removes badge or shows disabled state)
        db.updateStation(stationId, { relayEnabled: false });
        db.updateRelayStatus(stationId, 'idle');
        await liquidsoopConfig.regenerateLiquidsoapConfig();
        res.json({ success: true, message: 'Relay disabled and config regenerated' });
    } catch (error) {
        console.error('Error stopping relay:', error);
        res.status(500).json({ success: false, error: 'Failed to stop relay' });
    }
});

// Get relay status for a station (Stubbed - Phase 4)
app.get('/api/relay/:stationId/status', (req, res) => {
    // Phase 4: Status is now fully managed by DB and Liquidsoap detection.
    // We return a default 'ready' or fetching from DB would be better, but for now safe stub.
    res.json({ status: 'ready', active: false });
});

// Get all active relays (Stubbed - Phase 4)
app.get('/api/relays/active', (req, res) => {
    res.json([]);
});

// ==========================================
// AUTODJ - AUDIO LIBRARY API (Phase 1)
// ==========================================

// Get all audio files
app.get('/api/library', (req, res) => {
    try {
        const files = db.getAllAudioFiles();
        res.json(files);
    } catch (error) {
        console.error('Error fetching audio library:', error);
        res.status(500).json({ error: 'Failed to fetch audio library' });
    }
});

// Upload audio files
app.post('/api/library/upload', audioUpload.array('files', 50), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const results = [];

        for (const file of req.files) {
            try {
                // Parse audio metadata (ID3 tags)
                let metadata = {
                    title: path.basename(file.originalname, path.extname(file.originalname)),
                    artist: 'Unknown Artist',
                    album: 'Unknown Album',
                    genre: '',
                    year: null,
                    trackNumber: null,
                    duration: 0,
                    bitrate: 0,
                    sampleRate: 0,
                    channels: 0,
                    hasArtwork: false
                };

                try {
                    const parsed = await musicMetadata.parseFile(file.path);

                    metadata.title = parsed.common.title || metadata.title;
                    metadata.artist = parsed.common.artist || metadata.artist;
                    metadata.album = parsed.common.album || metadata.album;
                    metadata.genre = parsed.common.genre?.[0] || '';
                    metadata.year = parsed.common.year || null;
                    metadata.trackNumber = parsed.common.track?.no || null;
                    metadata.duration = Math.floor(parsed.format.duration || 0);
                    metadata.bitrate = parsed.format.bitrate ? Math.floor(parsed.format.bitrate / 1000) : 0;
                    metadata.sampleRate = parsed.format.sampleRate || 0;
                    metadata.channels = parsed.format.numberOfChannels || 0;

                    // Extract album artwork if present
                    if (parsed.common.picture && parsed.common.picture.length > 0) {
                        const picture = parsed.common.picture[0];
                        const ext = picture.format.includes('png') ? 'png' : 'jpg';
                        const artworkFilename = `${path.basename(file.filename, path.extname(file.filename))}.${ext}`;
                        const artworkPath = path.join(AUDIO_FILES_PATH, 'artwork', artworkFilename);

                        // Ensure artwork directory exists
                        await fs.mkdir(path.join(AUDIO_FILES_PATH, 'artwork'), { recursive: true });
                        await fs.writeFile(artworkPath, picture.data);

                        metadata.hasArtwork = true;
                        console.log(`[AUTODJ] Extracted artwork for: ${file.originalname}`);
                    }
                } catch (parseError) {
                    console.warn(`[AUTODJ] Could not parse metadata for ${file.originalname}:`, parseError.message);
                }

                // Get format from extension
                const ext = path.extname(file.originalname).toLowerCase();
                const formatMap = { '.mp3': 'MP3', '.ogg': 'OGG', '.flac': 'FLAC', '.aac': 'AAC', '.m4a': 'AAC' };
                const format = formatMap[ext] || 'MP3';

                // Save to database
                const dbResult = db.createAudioFile({
                    filename: file.originalname,
                    filepath: file.path,
                    title: metadata.title,
                    artist: metadata.artist,
                    album: metadata.album,
                    duration: metadata.duration,
                    bitrate: metadata.bitrate,
                    format: format,
                    filesize: file.size
                });

                results.push({
                    id: dbResult.lastInsertRowid,
                    filename: file.originalname,
                    title: metadata.title,
                    artist: metadata.artist,
                    duration: metadata.duration,
                    success: true
                });

                console.log(`[AUTODJ] Uploaded: ${file.originalname} → ${metadata.title} by ${metadata.artist}`);

            } catch (fileError) {
                console.error(`[AUTODJ] Error processing ${file.originalname}:`, fileError);
                results.push({
                    filename: file.originalname,
                    success: false,
                    error: fileError.message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        res.json({
            success: true,
            message: `Uploaded ${successCount} of ${req.files.length} files`,
            files: results
        });

    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({ error: error.message || 'Failed to upload files' });
    }
});

// Stream audio file
app.get('/api/library/:id/stream', async (req, res) => {
    try {
        const file = db.getAudioFileById(parseInt(req.params.id));
        if (!file) {
            return res.status(404).json({ error: 'Audio file not found' });
        }

        // Check if file exists
        try {
            await fs.access(file.filepath);
        } catch {
            return res.status(404).json({ error: 'Audio file missing from disk' });
        }

        const stat = await fs.stat(file.filepath);
        const range = req.headers.range;

        // Determine content type
        const ext = path.extname(file.filepath).toLowerCase();
        const mimeTypes = { '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.flac': 'audio/flac', '.aac': 'audio/aac', '.m4a': 'audio/mp4' };
        const contentType = mimeTypes[ext] || 'audio/mpeg';

        if (range) {
            // Partial content (seeking support)
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
            const chunkSize = end - start + 1;

            const { createReadStream } = await import('fs');
            const stream = createReadStream(file.filepath, { start, end });

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': contentType
            });
            stream.pipe(res);
        } else {
            // Full file
            const { createReadStream } = await import('fs');
            res.writeHead(200, {
                'Content-Length': stat.size,
                'Content-Type': contentType,
                'Accept-Ranges': 'bytes'
            });
            createReadStream(file.filepath).pipe(res);
        }
    } catch (error) {
        console.error('Error streaming audio:', error);
        res.status(500).json({ error: 'Failed to stream audio' });
    }
});

// Get album artwork for a file
app.get('/api/library/:id/artwork', async (req, res) => {
    try {
        const file = db.getAudioFileById(parseInt(req.params.id));
        if (!file) {
            return res.status(404).json({ error: 'Audio file not found' });
        }

        // Try to find artwork file
        const baseFilename = path.basename(file.filepath, path.extname(file.filepath));
        const artworkDir = path.join(AUDIO_FILES_PATH, 'artwork');

        for (const ext of ['jpg', 'png']) {
            const artworkPath = path.join(artworkDir, `${baseFilename}.${ext}`);
            try {
                await fs.access(artworkPath);
                return res.sendFile(artworkPath);
            } catch {
                // Continue to next extension
            }
        }

        // No artwork found - return 204 No Content (suppresses console errors)
        res.status(204).end();
    } catch (error) {
        console.error('Error fetching artwork:', error);
        res.status(500).json({ error: 'Failed to fetch artwork' });
    }
});

// Get full metadata for a file (re-parse from file for complete data)
app.get('/api/library/:id/metadata', async (req, res) => {
    try {
        const file = db.getAudioFileById(parseInt(req.params.id));
        if (!file) {
            return res.status(404).json({ error: 'Audio file not found' });
        }

        // Parse fresh metadata from file
        let fullMetadata = {
            // From database
            id: file.id,
            filename: file.filename,
            filepath: file.filepath,
            filesize: file.filesize,
            uploadedAt: file.uploaded_at,
            // Will be filled from parsing
            title: file.title,
            artist: file.artist,
            album: file.album,
            duration: file.duration,
            bitrate: file.bitrate,
            format: file.format
        };

        try {
            const parsed = await musicMetadata.parseFile(file.filepath);
            fullMetadata = {
                ...fullMetadata,
                // Common tags
                title: parsed.common.title || file.title,
                artist: parsed.common.artist || file.artist,
                album: parsed.common.album || file.album,
                albumArtist: parsed.common.albumartist || null,
                genre: parsed.common.genre || [],
                year: parsed.common.year || null,
                trackNumber: parsed.common.track?.no || null,
                trackTotal: parsed.common.track?.of || null,
                discNumber: parsed.common.disk?.no || null,
                discTotal: parsed.common.disk?.of || null,
                composer: parsed.common.composer || [],
                comment: parsed.common.comment || [],
                lyrics: parsed.common.lyrics || [],
                bpm: parsed.common.bpm || null,
                // Format info
                duration: parsed.format.duration || file.duration,
                bitrate: parsed.format.bitrate ? Math.floor(parsed.format.bitrate / 1000) : file.bitrate,
                sampleRate: parsed.format.sampleRate || null,
                channels: parsed.format.numberOfChannels || null,
                codec: parsed.format.codec || null,
                lossless: parsed.format.lossless || false,
                container: parsed.format.container || null,
                // Artwork
                hasArtwork: parsed.common.picture && parsed.common.picture.length > 0
            };
        } catch (parseError) {
            console.warn(`[AUTODJ] Could not re-parse metadata for ${file.filename}:`, parseError.message);
        }

        res.json(fullMetadata);
    } catch (error) {
        console.error('Error fetching metadata:', error);
        res.status(500).json({ error: 'Failed to fetch metadata' });
    }
});

// Get single audio file
app.get('/api/library/:id', (req, res) => {
    try {
        const file = db.getAudioFileById(parseInt(req.params.id));
        if (!file) {
            return res.status(404).json({ error: 'Audio file not found' });
        }
        res.json(file);
    } catch (error) {
        console.error('Error fetching audio file:', error);
        res.status(500).json({ error: 'Failed to fetch audio file' });
    }
});

// Delete audio file
app.delete('/api/library/:id', async (req, res) => {
    try {
        const file = db.getAudioFileById(parseInt(req.params.id));
        if (!file) {
            return res.status(404).json({ error: 'Audio file not found' });
        }

        // Delete from filesystem
        const fs = await import('fs/promises');
        try {
            await fs.unlink(file.filepath);
        } catch (e) {
            console.warn('Could not delete file from disk:', e.message);
        }

        // Delete from database
        db.deleteAudioFile(parseInt(req.params.id));
        res.json({ success: true, message: 'Audio file deleted' });
    } catch (error) {
        console.error('Error deleting audio file:', error);
        res.status(500).json({ error: 'Failed to delete audio file' });
    }
});

// Update audio file metadata
app.patch('/api/library/:id', (req, res) => {
    try {
        const file = db.getAudioFileById(parseInt(req.params.id));
        if (!file) {
            return res.status(404).json({ error: 'Audio file not found' });
        }

        const { title, artist, album } = req.body;
        db.updateAudioFile(parseInt(req.params.id), {
            title: title || file.title,
            artist: artist || file.artist,
            album: album || file.album
        });

        res.json({ success: true, message: 'Audio file updated' });
    } catch (error) {
        console.error('Error updating audio file:', error);
        res.status(500).json({ error: 'Failed to update audio file' });
    }
});

// ==========================================
// AUTODJ - PLAYLIST API (Phase 1)
// ==========================================

// Get all playlists
app.get('/api/playlists', (req, res) => {
    try {
        const playlists = db.getAllPlaylists();
        // Add track count for each playlist
        const playlistsWithCount = playlists.map(p => ({
            ...p,
            trackCount: db.getPlaylistTracks(p.id).length
        }));
        res.json(playlistsWithCount);
    } catch (error) {
        console.error('Error fetching playlists:', error);
        res.status(500).json({ error: 'Failed to fetch playlists' });
    }
});

// Create playlist
app.post('/api/playlists', (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Playlist name is required' });
        }

        const result = db.createPlaylist(name.trim(), description || '');
        res.status(201).json({
            success: true,
            id: result.lastInsertRowid,
            message: 'Playlist created'
        });
    } catch (error) {
        console.error('Error creating playlist:', error);
        res.status(500).json({ error: 'Failed to create playlist' });
    }
});

// Get single playlist with tracks
app.get('/api/playlists/:id', (req, res) => {
    try {
        const playlist = db.getPlaylistById(parseInt(req.params.id));
        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        const tracks = db.getPlaylistTracks(parseInt(req.params.id));
        res.json({ ...playlist, tracks });
    } catch (error) {
        console.error('Error fetching playlist:', error);
        res.status(500).json({ error: 'Failed to fetch playlist' });
    }
});

// Update playlist
app.put('/api/playlists/:id', (req, res) => {
    try {
        const playlist = db.getPlaylistById(parseInt(req.params.id));
        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        const { name, description } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Playlist name is required' });
        }

        db.updatePlaylist(parseInt(req.params.id), name.trim(), description || '');
        res.json({ success: true, message: 'Playlist updated' });
    } catch (error) {
        console.error('Error updating playlist:', error);
        res.status(500).json({ error: 'Failed to update playlist' });
    }
});

// Delete playlist
app.delete('/api/playlists/:id', (req, res) => {
    try {
        const playlist = db.getPlaylistById(parseInt(req.params.id));
        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        db.deletePlaylist(parseInt(req.params.id));
        res.json({ success: true, message: 'Playlist deleted' });
    } catch (error) {
        console.error('Error deleting playlist:', error);
        res.status(500).json({ error: 'Failed to delete playlist' });
    }
});

// Add track to playlist
app.post('/api/playlists/:id/tracks', (req, res) => {
    try {
        const playlistId = parseInt(req.params.id);
        const { audioFileId } = req.body;

        if (!audioFileId) {
            return res.status(400).json({ error: 'Audio file ID is required' });
        }

        const playlist = db.getPlaylistById(playlistId);
        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        const audioFile = db.getAudioFileById(parseInt(audioFileId));
        if (!audioFile) {
            return res.status(404).json({ error: 'Audio file not found' });
        }

        db.addTrackToPlaylist(playlistId, parseInt(audioFileId));
        res.json({ success: true, message: 'Track added to playlist' });
    } catch (error) {
        console.error('Error adding track to playlist:', error);
        res.status(500).json({ error: 'Failed to add track' });
    }
});

// Remove track from playlist
app.delete('/api/playlists/:id/tracks/:trackId', (req, res) => {
    try {
        const playlistId = parseInt(req.params.id);
        const trackId = parseInt(req.params.trackId);

        db.removeTrackFromPlaylist(playlistId, trackId);
        res.json({ success: true, message: 'Track removed from playlist' });
    } catch (error) {
        console.error('Error removing track from playlist:', error);
        res.status(500).json({ error: 'Failed to remove track' });
    }
});

// Reorder tracks in playlist
app.put('/api/playlists/:id/tracks/reorder', (req, res) => {
    try {
        const playlistId = parseInt(req.params.id);
        const { trackIds } = req.body;

        if (!Array.isArray(trackIds)) {
            return res.status(400).json({ error: 'trackIds must be an array' });
        }

        db.reorderPlaylistTracks(playlistId, trackIds);
        res.json({ success: true, message: 'Tracks reordered' });
    } catch (error) {
        console.error('Error reordering tracks:', error);
        res.status(500).json({ error: 'Failed to reorder tracks' });
    }
});

// ==========================================
// ENCODER WEBHOOK ENDPOINTS (Phase 7)
// Called by Liquidsoap on_connect/on_disconnect callbacks
// ==========================================

// Encoder connected - set badge to ORANGE (fallback on standby)
app.post('/api/encoder/:stationId/connected', (req, res) => {
    const { stationId } = req.params;
    const station = db.getStationById(stationId);

    if (!station) {
        console.warn(`[ENCODER WEBHOOK] Station not found: ${stationId}`);
        return res.status(404).json({ error: 'Station not found' });
    }

    debugLog(`[ENCODER] Connected: ${station.name}`);

    // If fallback was active, update badge to ORANGE (standby)
    if (station.relay_enabled && station.relay_mode === 'fallback') {
        db.updateRelayStatus(station.id, 'ready');
        debugLog(`[ENCODER] ${station.name} badge set to ORANGE (fallback on standby)`);

        // Create in-app alert
        db.createAlert('success', 'Encoder Connected',
            `${station.name} encoder is now live`, station.id);
    }

    res.json({ ok: true, status: 'connected' });
});

// Encoder disconnected - set badge to GREEN and send email (fallback is active)
app.post('/api/encoder/:stationId/disconnected', (req, res) => {
    const { stationId } = req.params;
    const station = db.getStationById(stationId);

    if (!station) {
        console.warn(`[ENCODER WEBHOOK] Station not found: ${stationId}`);
        return res.status(404).json({ error: 'Station not found' });
    }

    debugLog(`[ENCODER] Disconnected: ${station.name}`);

    if (station.relay_enabled && station.relay_mode === 'fallback' && station.relay_url) {
        // Update badge to GREEN (fallback is now active)
        db.updateRelayStatus(station.id, 'active');
        debugLog(`[ENCODER] ${station.name} badge set to GREEN (fallback ACTIVE)`);

        // Create in-app alert
        db.createAlert('warning', 'Fallback Activated',
            `${station.name} encoder dropped, fallback stream started`, station.id);

        // Send email alert
        const stationInfo = {
            id: station.id,
            name: station.name,
            mount: station.mount_point,
            streamUrl: station.stream_url,
            alert_emails: station.alert_emails
        };

        sendAlertEmail(
            'fallback_activated',
            `Fallback Active: ${station.name}`,
            `The encoder for "${station.name}" disconnected. Fallback stream has been automatically activated.`,
            stationInfo
        );
    }

    res.json({ ok: true, status: 'disconnected' });
});

// Health check (Moved up to public routes)

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

// Proxy Icecast static files (CSS, images) for proper status page styling
app.get('/style.css', async (req, res) => {
    try {
        const response = await fetch(`http://${ICECAST_HOST}:${ICECAST_INTERNAL_PORT}/style.css`);
        const css = await response.text();
        res.set('Content-Type', 'text/css');
        res.send(css);
    } catch (error) {
        res.status(404).send('');
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
                listeners: s.listeners || 0,  // s.listeners = current, s.listener_peak = peak
                listenerPeak: s.listener_peak || 0,
                title: s.title || s.server_name || 'Unknown',
                bitrate: s.bitrate || 128,
                genre: s.genre || ''
            };
        });

        // Generate alerts based on status changes
        checkAndGenerateAlerts(liveMounts);

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

// Check for status changes and generate alerts
// Check for status changes and generate alerts
function checkAndGenerateAlerts(activeMounts) {
    const now = Date.now();
    const ALERT_COOLDOWN = 60000; // 1 minute between same alerts

    // 1. Get ALL stations from DB to ensure we track everything
    const allStations = db.getAllStations();

    // 2. Build map of current active mounts
    const activeMountMap = {};
    activeMounts.forEach(m => {
        activeMountMap[m.mount] = m;
    });

    // 3. Update status for ALL stations (and unknown mounts)
    // We combine DB stations + any stray active mounts not in DB
    const allMountsToCheck = new Set([...allStations.map(s => s.mount_point), ...Object.keys(activeMountMap)]);

    const currentStatus = {};

    allMountsToCheck.forEach(mount => {
        const isActive = !!activeMountMap[mount];
        const station = allStations.find(s => s.mount_point === mount);

        // Station details for alerts
        const stationInfo = {
            id: station?.id || null,
            name: station?.name || mount,
            mount: mount,
            streamUrl: station?.stream_url || null,
            alert_emails: station?.alert_emails || null
        };

        currentStatus[mount] = {
            live: isActive,
            listeners: isActive ? activeMountMap[mount].listeners : 0,
            stationInfo
        };

        // Initialize previous status if missing (assume offline if unknown)
        if (!previousMountStatus[mount]) {
            // Check if it's actually live right now on first run
            previousMountStatus[mount] = { live: isActive, listeners: 0 };

            // For fallback-enabled stations that are LIVE on first poll (server just restarted),
            // set badge to GREEN since fallback is actively playing
            if (isActive && station?.relay_enabled && station?.relay_mode === 'fallback' && station?.relay_url) {
                db.updateRelayStatus(station.id, 'active');
                debugLog(`[FALLBACK] Station ${mount} is live on startup with fallback enabled, setting status to active (GREEN).`);
            }

            return;
        }

        const prev = previousMountStatus[mount];

        // CHECK: Stream went LIVE (Recovery)
        if (isActive && !prev.live) {
            const alertKey = `live_${mount}`;
            if (!lastAlertTime[alertKey] || (now - lastAlertTime[alertKey]) > ALERT_COOLDOWN) {

                // Check if this is a fallback-enabled station
                if (station?.relay_enabled && station?.relay_mode === 'fallback') {
                    // Check if fallback was previously active (encoder is NOW reconnecting)
                    if (station?.relay_status === 'active') {
                        // Encoder reconnected after being down - THIS is "Stream Recovered"
                        db.createAlert(
                            'success',
                            'Encoder Reconnected',
                            `${stationInfo.name} encoder is back online`,
                            stationInfo.id
                        );
                        lastAlertTime[alertKey] = now;
                        console.log(`[ALERT] Station ${mount} encoder RECONNECTED`);

                        // Badge color controlled by webhooks, not polling
                        debugLog(`[FALLBACK] Encoder reconnected for ${stationInfo.name}`);

                        sendAlertEmail(
                            'stream_up',
                            `Encoder Reconnected: ${stationInfo.name}`,
                            `The encoder for "${stationInfo.name}" has reconnected and is now live. Fallback is on standby.`,
                            stationInfo
                        );
                    } else {
                        // Fallback just started (not encoder reconnecting)
                        // Badge color controlled by webhooks, not polling
                        debugLog(`[FALLBACK] Fallback started for ${stationInfo.name} (no encoder was connected)`);

                        db.createAlert(
                            'info',
                            'Fallback Started',
                            `${stationInfo.name} fallback stream is now playing`,
                            stationInfo.id
                        );
                        lastAlertTime[alertKey] = now;
                        console.log(`[ALERT] Station ${mount} fallback STARTED`);

                        // Send "Fallback Active" email (not "Stream Recovered")
                        sendAlertEmail(
                            'fallback_activated',
                            `Fallback Active: ${stationInfo.name}`,
                            `The fallback stream for "${stationInfo.name}" has been activated.`,
                            stationInfo
                        );
                    }
                } else {
                    // Normal station (no fallback) - standard "Stream Recovered" behavior
                    db.createAlert(
                        'success',
                        'Station Now Broadcasting!',
                        `${stationInfo.name} is now live`,
                        stationInfo.id
                    );
                    lastAlertTime[alertKey] = now;
                    console.log(`[ALERT] Station ${mount} went LIVE`);

                    sendAlertEmail(
                        'stream_up',
                        `Stream Recovered: ${stationInfo.name}`,
                        `The stream "${stationInfo.name}" is now back online and broadcasting.`,
                        stationInfo
                    );
                }
            }
        }

        // CHECK: Stream went OFFLINE
        if (!isActive && prev.live) {
            const alertKey = `offline_${mount}`;
            if (!lastAlertTime[alertKey] || (now - lastAlertTime[alertKey]) > ALERT_COOLDOWN) {
                lastAlertTime[alertKey] = now;

                // DEBUG: Log station relay config (visible in /diagnostics)
                debugLog(`[DEBUG] Station ${mount} went offline. relay_enabled=${station?.relay_enabled}, relay_mode=${station?.relay_mode}, relay_url=${station?.relay_url ? 'SET' : 'EMPTY'}`);

                // Check if station has fallback relay configured
                if (station?.relay_enabled && station?.relay_mode === 'fallback' && station?.relay_url) {
                    // START FALLBACK RELAY
                    // START FALLBACK RELAY
                    // Phase 4: relayManager removed. Liquidsoap handles this automatically.
                    debugLog(`[FALLBACK] Encoder dropped for ${stationInfo.name}, Liquidsoap should activate fallback.`);
                    // relayManager.startRelay(station.id); // REMOVED

                    db.createAlert(
                        'warning',
                        'Fallback Activated',
                        `${stationInfo.name} encoder dropped, fallback stream started`,
                        stationInfo.id
                    );

                    // Badge color controlled by webhooks, not polling
                    debugLog(`[FALLBACK] Encoder dropped for ${stationInfo.name}.`);

                    sendAlertEmail(
                        'fallback_activated',
                        `Fallback Active: ${stationInfo.name}`,
                        `The encoder for "${stationInfo.name}" disconnected. Fallback stream has been automatically activated.`,
                        stationInfo
                    );
                } else {
                    // Normal stream down (no fallback configured)
                    console.log(`[ALERT] Station ${mount} went OFFLINE`);

                    db.createAlert(
                        'error',
                        'Broadcast Ended',
                        `${stationInfo.name} has gone offline`,
                        stationInfo.id
                    );

                    sendAlertEmail(
                        'stream_down',
                        `Stream Down: ${stationInfo.name}`,
                        `The stream "${stationInfo.name}" has gone offline and is no longer broadcasting. Please check the source encoder.`,
                        stationInfo
                    );
                }
            }
        }

        // CHECK: Listener Milestones
        if (isActive) {
            const milestones = [50, 100, 250, 500, 1000];
            const currentListeners = currentStatus[mount].listeners;
            const prevListeners = prev.listeners;

            for (const milestone of milestones) {
                if (currentListeners >= milestone && prevListeners < milestone) {
                    const alertKey = `milestone_${mount}_${milestone}`;
                    // Longer cooldown for milestones
                    if (!lastAlertTime[alertKey] || (now - lastAlertTime[alertKey]) > ALERT_COOLDOWN * 10) {
                        db.createAlert(
                            'info',
                            'Listener Milestone!',
                            `${stationInfo.name} reached ${milestone} listeners!`,
                            stationInfo.id
                        );
                        lastAlertTime[alertKey] = now;
                        console.log(`[ALERT] Station ${mount} reached ${milestone} listeners!`);

                        sendAlertEmail(
                            'milestone',
                            `Milestone Reached: ${stationInfo.name}`,
                            `Congratulations! "${stationInfo.name}" has reached ${milestone} concurrent listeners!`,
                            stationInfo
                        );
                    }
                }
            }
        }
    });

    // Update global previous status
    previousMountStatus = currentStatus;
}

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

// ==========================================
// ALERTS API
// ==========================================

// Get all alerts
app.get('/api/alerts', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const alerts = db.getAllAlerts(limit);
        res.json(alerts.map(a => ({
            id: a.id,
            type: a.type,
            title: a.title,
            message: a.message,
            stationId: a.station_id,
            read: a.read === 1,
            createdAt: a.created_at
        })));
    } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

// Get unread count (for header badge)
app.get('/api/alerts/unread-count', (req, res) => {
    try {
        const count = db.getUnreadAlertCount();
        res.json({ count });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Failed to fetch count' });
    }
});

// Mark single alert as read
app.post('/api/alerts/:id/read', (req, res) => {
    try {
        db.markAlertRead(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking alert read:', error);
        res.status(500).json({ error: 'Failed to mark read' });
    }
});

// Mark all alerts as read
app.post('/api/alerts/mark-all-read', (req, res) => {
    try {
        db.markAllAlertsRead();
        res.json({ success: true });
    } catch (error) {
        console.error('Error marking all read:', error);
        res.status(500).json({ error: 'Failed to mark all read' });
    }
});

// ==========================================
// SETTINGS API (SMTP & Alerts)
// ==========================================

// Get SMTP settings (password masked)
app.get('/api/settings/smtp', (req, res) => {
    try {
        const settings = db.getSettings();
        res.json({
            smtpHost: settings?.smtp_host || '',
            smtpPort: settings?.smtp_port || 587,
            smtpUser: settings?.smtp_user || '',
            hasPassword: !!settings?.smtp_password,
            smtpFromName: settings?.smtp_from_name || 'StreamDock Alerts',
            smtpUseTls: settings?.smtp_use_tls === 1
        });
    } catch (error) {
        console.error('Error fetching SMTP settings:', error);
        res.status(500).json({ error: 'Failed to fetch SMTP settings' });
    }
});

// Save SMTP settings
app.post('/api/settings/smtp', (req, res) => {
    try {
        const { smtpHost, smtpPort, smtpUser, smtpPassword, smtpFromName, smtpUseTls } = req.body;

        // Handle password: null = keep existing, '' = clear, string = encrypt & save
        let passwordToStore = null;  // Default: keep existing
        if (smtpPassword === '') {
            passwordToStore = null;  // Clear password
        } else if (smtpPassword) {
            passwordToStore = encrypt(smtpPassword);  // Encrypt new password
        }

        db.updateSmtpSettings(
            smtpHost?.trim() || null,
            parseInt(smtpPort) || 587,
            smtpUser?.trim() || null,
            passwordToStore,
            smtpFromName?.trim() || 'StreamDock Alerts',
            smtpUseTls !== false
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving SMTP settings:', error);
        res.status(500).json({ error: 'Failed to save SMTP settings' });
    }
});

// Test SMTP connection by sending a test email
app.post('/api/settings/smtp/test', async (req, res) => {
    try {
        const { testEmail } = req.body;

        if (!testEmail || !testEmail.includes('@')) {
            return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
        }

        const settings = db.getSettings();

        if (!settings?.smtp_host || !settings?.smtp_user || !settings?.smtp_password) {
            return res.json({
                success: false,
                error: 'SMTP settings are incomplete. Please configure host, username, and password first.'
            });
        }

        // Decrypt password
        let decryptedPassword;
        try {
            decryptedPassword = isEncrypted(settings.smtp_password)
                ? decrypt(settings.smtp_password)
                : settings.smtp_password;
        } catch {
            return res.json({ success: false, error: 'Failed to decrypt SMTP password. Please re-enter your password.' });
        }

        if (!decryptedPassword) {
            return res.json({ success: false, error: 'SMTP password is empty or could not be decrypted.' });
        }

        // Create nodemailer transport
        const transporter = nodemailer.createTransport({
            host: settings.smtp_host,
            port: settings.smtp_port,
            secure: settings.smtp_port === 465,
            auth: {
                user: settings.smtp_user,
                pass: decryptedPassword
            },
            tls: settings.smtp_use_tls ? {
                rejectUnauthorized: false
            } : undefined
        });

        // Send test email
        await transporter.sendMail({
            from: `"${settings.smtp_from_name}" <${settings.smtp_user}>`,
            to: testEmail,
            subject: '✅ Test Email from StreamDock',
            html: `
                <h2>Email Configuration Test</h2>
                <p>Congratulations! Your SMTP settings are working correctly.</p>
                <p><strong>SMTP Server:</strong> ${settings.smtp_host}:${settings.smtp_port}</p>
                <p><strong>From:</strong> ${settings.smtp_from_name} &lt;${settings.smtp_user}&gt;</p>
                <hr>
                <p>This email was sent as a test from StreamDock's settings page.</p>
            `
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error sending test email:', error);
        res.json({ success: false, error: `Failed to send email: ${error.message}` });
    }
});

// Get alert settings
app.get('/api/settings/alerts', (req, res) => {
    try {
        const settings = db.getSettings();
        res.json({
            alertEmails: settings?.alert_emails ? JSON.parse(settings.alert_emails) : [],
            alertAllStreams: settings?.alert_all_streams === 1,
            alertCooldownMins: settings?.alert_cooldown_mins || 5,
            alertOnRecovery: settings?.alert_on_recovery === 1,
            hasSmtpConfigured: !!settings?.smtp_host
        });
    } catch (error) {
        console.error('Error fetching alert settings:', error);
        res.status(500).json({ error: 'Failed to fetch alert settings' });
    }
});

// Save alert settings
app.post('/api/settings/alerts', (req, res) => {
    try {
        const { alertEmails, alertAllStreams, alertCooldownMins, alertOnRecovery } = req.body;

        db.updateAlertSettings(
            alertEmails || [],
            alertAllStreams === true,
            parseInt(alertCooldownMins) || 5,
            alertOnRecovery !== false
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving alert settings:', error);
        res.status(500).json({ error: 'Failed to save alert settings' });
    }
});

// ==========================================
// STREAM PROXY
// ==========================================

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
    const streamUrl = `http://${ICECAST_HOST}:${ICECAST_INTERNAL_PORT}${req.url}`;

    console.log(`[STREAM] Proxying ${req.originalUrl} -> ${streamUrl}`);

    // Prevent Coolify/nginx from buffering the stream
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Cache-Control', 'no-cache, no-store');

    // Use native http.get + pipe (same pattern as working /icecast-status route)
    const proxyReq = http.get(streamUrl, {
        headers: {
            'Icy-MetaData': '1',
            'User-Agent': 'StreamDock-Proxy/1.0'
        }
    }, (proxyRes) => {
        console.log(`[STREAM] Connected to Icecast, status: ${proxyRes.statusCode}`);

        // Forward Icecast headers
        res.writeHead(proxyRes.statusCode, {
            'Content-Type': proxyRes.headers['content-type'] || 'audio/mpeg',
            'icy-name': proxyRes.headers['icy-name'] || '',
            'icy-genre': proxyRes.headers['icy-genre'] || '',
            'icy-br': proxyRes.headers['icy-br'] || '',
            'Connection': 'close'
        });

        // Pipe the audio stream directly to the response
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error(`[STREAM ERROR] ${err.message}`);
        if (!res.headersSent) {
            res.status(502).send('Stream unavailable');
        }
    });

    // Clean up when client disconnects
    req.on('close', () => {
        proxyReq.destroy();
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

// Global Error Handler for API
app.use((err, req, res, next) => {
    // If it's an API request or an explicit JSON request, return JSON
    if (req.path.startsWith('/api') || req.headers.accept?.includes('json')) {
        console.error('[API ERROR]', err);

        // Multer errors
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        }

        return res.status(err.status || 500).json({
            error: err.message || 'Internal Server Error'
        });
    }
    // Otherwise fallback to default (HTML)
    next(err);
});

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

    // Regenerate configs on startup
    setTimeout(async () => {
        console.log('[STARTUP] Regenerating Icecast config...');
        await icecastConfig.regenerateIcecastConfig();

        console.log('[STARTUP] Regenerating Liquidsoap config...');
        await liquidsoopConfig.regenerateLiquidsoapConfig();

        // Then start any primary mode relays
    }, 5000); // Wait 5 seconds for Icecast to be ready
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[SHUTDOWN] Received SIGTERM, stopping relays...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('[SHUTDOWN] Received SIGINT, stopping relays...');
    process.exit(0);
});
