# Relay & Fallback Feature - Complete System Audit

**Date:** December 24, 2024  
**Status:** 🔧 MULTIPLE FIXES APPLIED - Ready for Testing

---

## The Problem

**WHAT SHOULD HAPPEN:**
- Primary mode: Relay starts on server boot, station shows LIVE
- Fallback mode: When encoder drops, relay auto-starts

**WHAT ACTUALLY HAPPENED:**
- Station shows OFFLINE regardless of relay configuration

---

## Fixes Applied

| Fix | File | Line | Issue |
|-----|------|------|-------|
| 1 | relayManager.js | 16 | Port default was 8000, changed to 8100 |
| 2 | relayManager.js | 62 | Loglevel was 'warning', changed to 'info' |
| 3 | relayManager.js | 58 | Protocol was `icecast://`, changed to `http://` with PUT |
| 4 | relayManager.js | 67-68 | Codec was `-c:a copy`, changed to `-c:a libmp3lame -b:a 128k` |

---

## Current FFmpeg Command

```bash
ffmpeg -hide_banner -loglevel info \
  -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5 \
  -i https://supersoul.site:8000/OSS-320 \
  -c:a libmp3lame -b:a 128k \
  -f mp3 -content_type audio/mpeg \
  -method PUT \
  http://source:streamdock_source@127.0.0.1:8100/new
```

---

## Why These Fixes

### Fix 1: Port 8100
- Icecast runs on 8100 inside Docker
- Default was 8000 = FFmpeg couldn't connect

### Fix 2: Loglevel 'info'
- Status detection looks for "Opening" and "Stream #"
- These are INFO level messages
- With 'warning' level, they were hidden = status never changed

### Fix 3: HTTP PUT instead of icecast://
- Alpine FFmpeg may not have icecast protocol compiled
- HTTP PUT is standard for Icecast 2.4+
- More widely supported

### Fix 4: libmp3lame instead of copy
- Input stream codec might vary
- Copy can fail if codec doesn't match
- Explicit encoding is more reliable

---

## Test Steps

1. **Deploy this update**
2. **Test PRIMARY mode:**
   - Edit station → External Source → Enable → Primary → Save
   - Station should show LIVE (no Mixxx needed)
3. **Test FALLBACK mode:**
   - Set back to Fallback mode
   - Connect Mixxx → Station shows LIVE
   - Disconnect Mixxx → Station should STAY LIVE via fallback

---

## Files Changed

| File | Change |
|------|--------|
| `server/relayManager.js` | Port, loglevel, HTTP PUT, libmp3lame |
| `RELAY_FEATURE.md` | This audit document |
