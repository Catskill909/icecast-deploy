# Relay & Fallback Feature - ✅ COMPLETE

**Date:** December 24, 2024  
**Status:** ✅ WORKING - Reverted to f910955

---

## ⚠️ CRITICAL: Port 8100 ⚠️

**ICECAST RUNS ON PORT 8100. NOT 8000.**

---

## ⚠️ DO NOT TOUCH: Stations.jsx Badge Colors

**DO NOT MODIFY THE FALLBACK BADGE COLOR LOGIC.**

The working version has FALLBACK as orange always. Attempts to make it green broke fallback functionality entirely.

```
Commit f910955 = WORKING
Commits after = BROKEN badge logic that killed fallback
```

If you need conditional color, the backend must track source type first.

---

## All Bugs Encountered & Fixed

| Bug | Root Cause | Fix | Commit |
|-----|-----------|-----|--------|
| Relay not connecting | Port default was 8000 | Changed to 8100 | 230f1e4 |
| Status never "running" | Loglevel 'warning' hid messages | Changed to 'info' | 230f1e4 |
| HTTP PUT didn't stream | Icecast rejected PUT method | Use `icecast://` | a4c3aaf |
| Codec mismatch errors | `-c:a copy` failed on some streams | Use `-c:a libmp3lame` | 230f1e4 |
| Badge color broke fallback | Conditional color logic | REVERTED to f910955 | 5331fee |

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
| `server/relayManager.js` | FFmpeg spawn - PORT MUST BE 8100 |
| `server/icecastConfig.js` | Dynamic Icecast config |
| `server/index.js` | Fallback trigger logic |
| `src/pages/Stations.jsx` | **DO NOT CHANGE BADGE LOGIC** |
| `src/pages/Diagnostics.jsx` | Debug page |

---

## What Works ✅

- [x] Primary relay mode
- [x] Fallback activation on encoder drop
- [x] Stream URL plays audio
- [x] Email alerts for fallback activation
- [x] Diagnostics page in sidebar

---

## Known Limitations

- FALLBACK badge is always orange (by design - to preserve stability)
- Changing badge color broke core fallback functionality
