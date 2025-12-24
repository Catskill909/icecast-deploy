# Relay & Fallback Feature - ✅ COMPLETE

**Date:** December 24, 2024  
**Status:** ✅ FULLY WORKING

---

## ⚠️ CRITICAL: Port 8100 ⚠️

**ICECAST RUNS ON PORT 8100. NOT 8000.**

If you ever see `8000` in the codebase, it's WRONG:
- `server/relayManager.js` line 16: MUST be 8100
- `server/icecastConfig.js` line 17: MUST be 8100

---

## All Bugs Encountered & Fixed

| Bug | Root Cause | Fix | Date |
|-----|-----------|-----|------|
| Relay not connecting | Port default was 8000 | Changed to 8100 | Dec 24 |
| Status never "running" | Loglevel 'warning' hid messages | Changed to 'info' | Dec 24 |
| HTTP PUT didn't stream | Icecast rejected PUT method | Use `icecast://` protocol | Dec 24 |
| Codec mismatch errors | `-c:a copy` failed on some streams | Use `-c:a libmp3lame` | Dec 24 |
| FALLBACK badge color | Tried to change logic, broke feature | Keep both conditions | Dec 24 |

---

## ⚠️ DO NOT CHANGE: FALLBACK Badge Logic

The current condition works and should NOT be changed:

```javascript
station.relayStatus === 'active' || (isLive && station.relayMode === 'fallback')
```

**Attempted fix that BROKE it:**
```javascript
station.relayStatus === 'active'  // ❌ This broke fallback!
```

**Why:** The `relayStatus` from the API may not update fast enough. The combined condition ensures the badge shows green in both cases.

---

## Working FFmpeg Command

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
| `src/pages/Stations.jsx` | Station cards with FALLBACK badge |
| `src/pages/Diagnostics.jsx` | Debug page |

---

## What Works ✅

- [x] Primary relay mode
- [x] Fallback activation on encoder drop
- [x] Stream URL plays audio
- [x] Email alerts for fallback activation
- [x] Diagnostics page
- [x] Sidebar menu with Diagnostics
- [x] FALLBACK badge turns green when live

---

## Known Limitations

- FALLBACK badge is green when station is live (even via encoder)
- Would need backend to track source type to show orange when encoder is live
