# Relay & Fallback Feature Tracker

## Current Status: � FIX APPLIED - Ready for Testing

---

## THE ISSUE

**When encoder disconnects, fallback relay starts but station does NOT show as LIVE.**

Relay status stays at "starting" (never becomes "running").

---

## ROOT CAUSE FOUND ✅

### The Problem: `-re` Flag With Network Streams

The FFmpeg command was using `-re` (read at native frame rate) which is **WRONG for live network streams**.

From FFmpeg documentation research:
> "The `-re` flag is generally not recommended and often unnecessary or counterproductive for actual live network input streams"
> "When `-re` is applied to a live network stream, FFmpeg might introduce unnecessary buffering... or stall, waiting for data"

**This explains why:**
- FFmpeg spawns ✅
- But never outputs "Opening" or "Stream #" to stderr
- Status stays at "starting" forever
- No errors because ffmpeg is just stalling/waiting

### Additional Issue: `-c:a copy` with Mixed Codecs

Using `-c:a copy` (passthrough) can fail if input codec doesn't match expected output. Changed to explicit MP3 encoding for reliability.

---

## FIX APPLIED

**File:** `server/relayManager.js`

**Before (BROKEN):**
```javascript
const ffmpegArgs = [
    '-hide_banner',
    '-loglevel', 'warning',
    '-re',                    // ❌ WRONG for network streams!
    '-reconnect', '1',
    '-i', relayUrl,
    '-c:a', 'copy',           // ❌ Can fail with codec mismatch
    '-f', 'mp3',
    ...
];
```

**After (FIXED):**
```javascript
const ffmpegArgs = [
    '-hide_banner',
    '-loglevel', 'info',      // Better debug output
    // NOTE: Do NOT use -re with network streams - it causes stalling!
    '-reconnect', '1',
    '-i', relayUrl,
    '-c:a', 'libmp3lame',     // ✅ Explicit MP3 encoding
    '-b:a', '128k',           // ✅ Set bitrate
    '-f', 'mp3',
    ...
];
```

---

## Changes Made

| Change | Reason |
|--------|--------|
| Removed `-re` flag | Causes stalling with live network input |
| Changed `-c:a copy` to `-c:a libmp3lame` | Ensures proper codec conversion |
| Added `-b:a 128k` | Sets consistent output bitrate |
| Changed loglevel to `info` | Better visibility of connection status |

---

## Test Steps

1. Deploy the update
2. Configure station with fallback relay
3. Connect Mixxx encoder → verify station shows LIVE
4. Disconnect Mixxx → watch diagnostics page
5. Expected: Relay status should change from "starting" to "running"
6. Expected: Station should show LIVE (via fallback)
7. Reconnect Mixxx → should switch back seamlessly

---

## Files Modified

- `server/relayManager.js` - Fixed ffmpeg args

---

## Previous Fixes (Already Applied)

- Port default from 8000 to 8100
- Config path to `/etc/icecast.xml` in production
- Dockerfile chmod for config file
- Startup config regeneration
