/**
 * Icecast XML Configuration Generator
 * Generates icecast.xml from database config values
 */

import fs from 'fs';
import path from 'path';

/**
 * Convert log level string to Icecast numeric value
 */
function logLevelToNumber(level) {
  const map = {
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4
  };
  return map[level] || 3; // Default to INFO
}

/**
 * Generate icecast.xml file from config
 * @param {Object} config - Configuration object from database
 * @returns {string} Generated XML content
 */
export function generateIcecastXML(config) {
  // Build CORS headers if any origins are configured
  const corsHeaders = config.corsOrigins && config.corsOrigins.length > 0
    ? config.corsOrigins.map(origin =>
      `    <header name="Access-Control-Allow-Origin" value="${origin}" />`
    ).join('\n')
    : '';

  const xml = `<?xml version="1.0"?>
<icecast>
  <limits>
    <clients>${config.maxClients}</clients>
    <sources>${config.maxSources}</sources>
    <queue-size>${config.queueSize}</queue-size>
    <burst-size>${config.burstSize}</burst-size>
  </limits>

  <authentication>
    <source-password>streamdock_source</source-password>
    <relay-password>streamdock_relay</relay-password>
    <admin-user>admin</admin-user>
    <admin-password>streamdock_admin</admin-password>
  </authentication>

  <hostname>${config.hostname || 'localhost'}</hostname>
  
  <listen-socket>
    <port>8100</port>
  </listen-socket>

${corsHeaders ? `  <http-headers>\n${corsHeaders}\n  </http-headers>\n` : ''}
  <paths>
    <basedir>/usr/share/icecast2</basedir>
    <logdir>/var/log/icecast2</logdir>
  </paths>

  <logging>
    <accesslog>access.log</accesslog>
    <errorlog>error.log</errorlog>
    <loglevel>${logLevelToNumber(config.logLevel)}</loglevel>
    <logsize>10000</logsize>
  </logging>

  <security>
    <chroot>0</chroot>
  </security>
</icecast>
`;

  return xml;
}

/**
 * Write Icecast XML to file
 * @param {Object} config - Configuration object from database
 */
export function writeIcecastXML(config) {
  const xml = generateIcecastXML(config);

  // Use Docker/Coolify path in production, local path in development
  const xmlPath = process.env.ICECAST_XML_PATH ||
    (process.env.NODE_ENV === 'production'
      ? '/etc/icecast2/icecast.xml'  // Docker/Coolify
      : path.join(process.cwd(), 'icecast.xml'));  // Local dev


  try {
    fs.writeFileSync(xmlPath, xml, 'utf8');
    console.log(`[Icecast Config] XML written to ${xmlPath}`);
    return { success: true, path: xmlPath };
  } catch (error) {
    console.error('[Icecast Config] Failed to write XML:', error);
    return { success: false, error: error.message };
  }
}
