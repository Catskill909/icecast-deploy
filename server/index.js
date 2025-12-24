import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';
import httpProxy from 'http-proxy';
import nodemailer from 'nodemailer';
import cookieParser from 'cookie-parser';
import * as db from './db.js';
import { encrypt, decrypt, isEncrypted } from './crypto.js';

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

// Track previous mount status for alert generation
let previousMountStatus = {}; // { "/mount": { live: true, listeners: 0 } }
let lastAlertTime = {}; // Prevent alert spam
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
            milestone: { emoji: '🎉', color: '#4b7baf', label: 'MILESTONE' }
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

// ==========================================
// PROTECTED ROUTES (Auth Required)
// ==========================================

// Auth Middleware (Strict)
const requireAuth = (req, res, next) => {
    if (req.cookies.auth_session === 'true') {
        return next();
    }
    // Check if it's a debug connection (allow)
    if (req.path.startsWith('/api/debug-connection')) return next();

    res.status(401).json({ error: 'Unauthorized' });
};

// Apply auth middleware to all remaining API routes
app.use('/api', requireAuth);

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
            alertEmails: s.alert_emails ? JSON.parse(s.alert_emails) : []
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

// Update a station
app.put('/api/stations/:id', (req, res) => {
    try {
        const station = db.getStationById(req.params.id);
        if (!station) {
            return res.status(404).json({ error: 'Station not found' });
        }

        const { name, description, genre, logoUrl, websiteUrl, alertEmails } = req.body;

        // Validate required fields
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Station name is required' });
        }

        db.updateStation(req.params.id, {
            name: name.trim(),
            description: description || '',
            genre: genre || 'Various',
            logoUrl: logoUrl || null,
            websiteUrl: websiteUrl || null,
            alertEmails: Array.isArray(alertEmails) ? alertEmails : null
        });

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
        res.json({ success: true, message: 'Station deleted' });
    } catch (error) {
        console.error('Error deleting station:', error);
        res.status(500).json({ error: 'Failed to delete station' });
    }
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

            // If it is live on first run (server restart), don't trigger "Recovered" immediately 
            // unless we want to... skipping to avoid spam on restart.
            return;
        }

        const prev = previousMountStatus[mount];

        // CHECK: Stream went LIVE (Recovery)
        if (isActive && !prev.live) {
            const alertKey = `live_${mount}`;
            if (!lastAlertTime[alertKey] || (now - lastAlertTime[alertKey]) > ALERT_COOLDOWN) {
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

        // CHECK: Stream went OFFLINE
        if (!isActive && prev.live) {
            const alertKey = `offline_${mount}`;
            if (!lastAlertTime[alertKey] || (now - lastAlertTime[alertKey]) > ALERT_COOLDOWN) {
                db.createAlert(
                    'error',
                    'Broadcast Ended',
                    `${stationInfo.name} has gone offline`,
                    stationInfo.id
                );
                lastAlertTime[alertKey] = now;
                console.log(`[ALERT] Station ${mount} went OFFLINE`);

                sendAlertEmail(
                    'stream_down',
                    `Stream Down: ${stationInfo.name}`,
                    `The stream "${stationInfo.name}" has gone offline and is no longer broadcasting. Please check the source encoder.`,
                    stationInfo
                );
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
