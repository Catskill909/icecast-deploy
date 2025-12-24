# Relay & Fallback Feature - Handoff Document

**Date:** December 24, 2024  
**Status:** 🔧 FIXES APPLIED - NEEDS TESTING

---

## ⚠️ CRITICAL: Port 8100 ⚠️

**ICECAST RUNS ON PORT 8100. NOT 8000.**

Files that MUST have 8100:
- `server/relayManager.js` line 16
- `server/icecastConfig.js` line 17

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Container                         │
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │   Icecast    │◄───────►│   Node.js    │                  │
│  │   :8100      │         │   :3000      │                  │
│  └──────────────┘         └──────────────┘                  │
│         ▲                        │                          │
│         │                        │ API/Status               │
│         │                        ▼                          │
│    ┌────┴────┐              ┌─────────────┐                 │
│    │ FFmpeg  │              │ Web UI      │                 │
│    │ (relay) │              │             │                 │
│    └─────────┘              └─────────────┘                 │
└─────────────────────────────────────────────────────────────┘
        ▲                             ▲
        │                             │
   External                      Listeners
   Stream URL                    (HTTPS)
```

---

## Relay Modes

### PRIMARY Mode
- Relay starts on server boot
- FFmpeg streams from external URL to Icecast mount
- No encoder needed

### FALLBACK Mode
- Encoder (Mixxx) is primary source
- When encoder drops, relay auto-starts
- Keeps station LIVE during outage

---

## Key Files

| File | Purpose |
|------|---------|
| `server/relayManager.js` | Spawns FFmpeg, manages relay processes |
| `server/icecastConfig.js` | Generates icecast.xml dynamically |
| `server/index.js` | Fallback trigger (lines 1032-1035), startup (lines 1445-1451) |
| `src/pages/Diagnostics.jsx` | Debug UI at /diagnostics |

---

## Current FFmpeg Command

```bash
ffmpeg -hide_banner -loglevel info \
  -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5 \
  -i [EXTERNAL_URL] \
  -c:a libmp3lame -b:a 128k \
  -f mp3 -content_type audio/mpeg \
  -method PUT \
  http://source:[PASSWORD]@127.0.0.1:8100/[MOUNT]
```

---

## Fixes Applied (Dec 24)

| Issue | Fix |
|-------|-----|
| Port default 8000 | Changed to 8100 |
| Loglevel 'warning' hid connection messages | Changed to 'info' |
| `icecast://` protocol not in Alpine FFmpeg | Changed to HTTP PUT |
| `-c:a copy` codec mismatch | Changed to `-c:a libmp3lame` |

---

## Test Steps

1. Deploy update
2. **PRIMARY test:** Enable relay + Primary mode, save. Station should show LIVE.
3. **FALLBACK test:** Enable relay + Fallback mode. Connect Mixxx. Disconnect Mixxx. Station should stay LIVE.

---

## Environment Variables

| Variable | Value | Set In |
|----------|-------|--------|
| ICECAST_PORT | 8100 | Dockerfile, supervisord.conf |
| ICECAST_HOST | 127.0.0.1 | supervisord.conf |
| ICECAST_SOURCE_PASSWORD | streamdock_source | supervisord.conf |

---

## What Works ✅

- Mixxx direct streaming to Icecast
- Station status detection
- Diagnostics page
- Icecast admin panel
- All UI features

## What Needs Testing 🔧

- Primary relay mode
- Fallback relay mode
