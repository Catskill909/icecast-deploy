# Relay & Fallback Feature - Complete Documentation

**Date:** December 24, 2024  
**Status:** 🔧 FIX DEPLOYED - Testing Required

---

## Root Cause & Fix

**Problem:** Icecast started before Node.js generated config → fallback mounts didn't exist.

**Fix:** New `startup.sh` script that:
1. Generates Icecast config (creates all -fallback mounts)
2. Then starts Icecast and Node.js

---

## How Standard Icecast Fallback Works

```
Container Starts:
  startup.sh → generates /etc/icecast.xml with ALL mounts
  └── /new (main mount with fallback-override=1)
  └── /new-fallback (hidden, for relay)

Fallback Mode:
  FFmpeg → /new-fallback
  Listeners on /new hear fallback via fallback-mount setting

Encoder Connects:
  Mixxx → /new
  fallback-override=1 → encoder takes priority
  Listeners now hear Mixxx

Encoder Disconnects:
  Mount /new empty → falls back to /new-fallback
  Listeners hear fallback again
```

---

## Files Changed

| File | Change |
|------|--------|
| `startup.sh` | NEW - generates config before starting services |
| `Dockerfile` | Uses startup.sh instead of direct supervisord |
| `relayManager.js` | Streams to -fallback mount for fallback mode |
| `icecastConfig.js` | Pre-creates -fallback mounts for ALL stations |

---

## Key Code

### relayManager.js line 53
```javascript
const targetMount = station.relay_mode === 'fallback' 
    ? `${mountPoint}-fallback` 
    : mountPoint;
```

### icecastConfig.js lines 34-44
Creates BOTH mounts for every station:
- Main mount with `fallback-mount` and `fallback-override=1`
- Hidden `-fallback` mount

---

## Test Checklist

After deploy:
- [ ] Mixxx connects to /new
- [ ] Enable fallback, disconnect Mixxx → fallback activates
- [ ] Stream plays audio
- [ ] Reconnect Mixxx → should take over (THIS IS THE FIX)
- [ ] Disconnect Mixxx → fallback resumes
