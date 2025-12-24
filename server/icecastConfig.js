/**
 * Icecast Configuration Generator
 * 
 * Generates icecast.xml dynamically based on stations in database.
 * Includes fallback mount configuration for stations with relay enabled.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icecast config from environment
const ICECAST_PORT = process.env.ICECAST_PORT || 8100;
const ICECAST_SOURCE_PASSWORD = process.env.ICECAST_SOURCE_PASSWORD || 'streamdock_source';
const ICECAST_ADMIN_PASSWORD = process.env.ICECAST_ADMIN_PASSWORD || 'streamdock_admin';

/**
 * Generate mount XML for a station
 */
function generateMountXml(station) {
    const mount = station.mount_point;
    const hasRelay = station.relay_enabled && station.relay_url;

    let xml = '';

    // Main mount (encoder streams here)
    xml += `    <mount>
        <mount-name>${mount}</mount-name>`;

    if (hasRelay) {
        // Add fallback configuration
        xml += `
        <fallback-mount>${mount}-fallback</fallback-mount>
        <fallback-override>1</fallback-override>`;
    }

    xml += `
    </mount>\n`;

    // Fallback mount (relay streams here) - only if relay configured
    if (hasRelay) {
        xml += `    <mount>
        <mount-name>${mount}-fallback</mount-name>
        <hidden>1</hidden>
    </mount>\n`;
    }

    return xml;
}

/**
 * Generate complete icecast.xml content
 */
function generateIcecastConfig() {
    const stations = db.getAllStations();

    // Generate mount blocks for all stations
    const mountsXml = stations.map(s => generateMountXml(s)).join('\n');

    const config = `<icecast>
    <location>StreamDock</location>
    <admin>admin@localhost</admin>

    <limits>
        <clients>100</clients>
        <sources>20</sources>
        <queue-size>524288</queue-size>
        <client-timeout>30</client-timeout>
        <header-timeout>15</header-timeout>
        <source-timeout>10</source-timeout>
        <burst-on-connect>1</burst-on-connect>
        <burst-size>65535</burst-size>
    </limits>

    <authentication>
        <source-password>${ICECAST_SOURCE_PASSWORD}</source-password>
        <relay-password>streamdock_relay</relay-password>
        <admin-user>admin</admin-user>
        <admin-password>${ICECAST_ADMIN_PASSWORD}</admin-password>
    </authentication>

    <hostname>0.0.0.0</hostname>

    <listen-socket>
        <port>${ICECAST_PORT}</port>
        <bind-address>0.0.0.0</bind-address>
    </listen-socket>

    <http-headers>
        <header name="Access-Control-Allow-Origin" value="*" />
    </http-headers>

    <fileserve>1</fileserve>

    <paths>
        <basedir>/usr/share/icecast</basedir>
        <logdir>/var/log/icecast</logdir>
        <webroot>/usr/share/icecast/web</webroot>
        <adminroot>/usr/share/icecast/admin</adminroot>
    </paths>

    <logging>
        <accesslog>-</accesslog>
        <errorlog>-</errorlog>
        <loglevel>3</loglevel>
    </logging>

    <security>
        <chroot>0</chroot>
        <changeowner>
            <user>node</user>
            <group>node</group>
        </changeowner>
    </security>

    <!-- Station Mounts (Auto-Generated) -->
${mountsXml}
</icecast>
`;

    return config;
}

/**
 * Write icecast.xml to disk and trigger reload
 * Writes to /etc/icecast.xml which is where Icecast reads from in Docker
 */
export async function regenerateIcecastConfig() {
    try {
        const config = generateIcecastConfig();

        // In Docker, Icecast reads from /etc/icecast.xml
        // In dev, use project root
        const configPath = process.env.NODE_ENV === 'production'
            ? '/etc/icecast.xml'
            : path.join(__dirname, '../icecast.xml');

        fs.writeFileSync(configPath, config, 'utf8');
        console.log(`[ICECAST] Configuration written to ${configPath}`);

        // Trigger Icecast reload
        await reloadIcecast();

        return { success: true };
    } catch (error) {
        console.error('[ICECAST] Failed to regenerate config:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Signal Icecast to reload configuration via admin API
 */
export async function reloadIcecast() {
    const ICECAST_HOST = process.env.ICECAST_HOST || 'localhost';
    const adminUrl = `http://${ICECAST_HOST}:${ICECAST_PORT}/admin/reloadconfig`;

    try {
        const auth = Buffer.from(`admin:${ICECAST_ADMIN_PASSWORD}`).toString('base64');

        const response = await fetch(adminUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        if (response.ok) {
            console.log('[ICECAST] Configuration reloaded successfully');
            return { success: true };
        } else {
            console.warn(`[ICECAST] Reload returned status ${response.status} - may need container restart`);
            return { success: false, status: response.status };
        }
    } catch (error) {
        // Icecast might not be running yet during startup
        console.warn('[ICECAST] Could not contact Icecast for reload:', error.message);
        return { success: false, error: error.message };
    }
}

export default {
    regenerateIcecastConfig,
    reloadIcecast
};
