# Relay & Fallback Feature - Handoff Document

**Date:** December 24, 2024  
**Status:** 🔧 TESTING IN PROGRESS

---

## ⚠️ CRITICAL: Port 8100 ⚠️

**ICECAST RUNS ON PORT 8100. NOT 8000.**

---

## What is FFmpeg?

FFmpeg is a separate tool from Icecast:
- **Icecast** = Server that receives streams and serves to listeners
- **FFmpeg** = Tool that pulls audio from external URLs and pushes to Icecast

```
External URL → FFmpeg → Icecast → Listeners
```

We installed FFmpeg in the Docker container (`apk add ffmpeg`).

---

## Current Status

| Test | Result |
|------|--------|
| Mixxx direct streaming | ✅ WORKS |
| Relay shows "running" | ✅ WORKS |
| Station shows LIVE on fallback | ✅ WORKS |
| Stream URL plays audio | ⏳ TESTING (icecast:// protocol just deployed) |

---

## Latest Changes (Dec 24)

1. Port default: 8000 → **8100** ✅
2. Loglevel: 'warning' → **'info'** ✅
3. Protocol: HTTP PUT → **icecast://** (just changed)
4. Codec: `-c:a copy` → **`-c:a libmp3lame -b:a 128k`** ✅

---

## Current FFmpeg Command

```bash
ffmpeg -hide_banner -loglevel info \
  -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5 \
  -i [EXTERNAL_URL] \
  -c:a libmp3lame -b:a 128k \
  -f mp3 -content_type audio/mpeg \
  icecast://source:[PASSWORD]@127.0.0.1:8100/[MOUNT]
```

---

## Key Files

| File | Purpose |
|------|---------|
| `server/relayManager.js` | FFmpeg spawn and management |
| `server/icecastConfig.js` | Dynamic Icecast config |
| `server/index.js` | Fallback trigger, startup |
| `src/pages/Diagnostics.jsx` | Debug UI |

---

## Test Steps

1. Deploy latest commit
2. Connect Mixxx → Station should show LIVE
3. Configure fallback relay URL
4. Disconnect Mixxx → Station should STAY LIVE
5. **Click Listen button → Should play audio** ⬅️ TESTING NOW
