#!/bin/sh
# Startup script for StreamDock
# Ensures Icecast config is generated before Icecast starts

echo "[STARTUP] Generating Icecast configuration..."

# Generate config using Node.js
cd /app
node -e "
import('./server/icecastConfig.js').then(async (module) => {
    const result = await module.regenerateIcecastConfig();
    if (result.success) {
        console.log('[STARTUP] Icecast config generated successfully');
    } else {
        console.log('[STARTUP] Warning: Config generation failed, using default');
    }
    process.exit(0);
}).catch(err => {
    console.error('[STARTUP] Error generating config:', err.message);
    process.exit(0);
});
"

echo "[STARTUP] Starting supervisor (Icecast + Node.js)..."
exec supervisord -c /etc/supervisord.conf
