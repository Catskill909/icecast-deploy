# Relay & Fallback Feature - Status Report

**Date:** December 24, 2024  
**Status:** 🔧 FIX DEPLOYED - Testing Required

---

## The Fix (Standard Icecast Fallback)

**Problem:** Icecast only creates new mounts on startup, not on `reloadconfig`.

**Solution implemented:**
1. `icecastConfig.js` now pre-creates `-fallback` mount for EVERY station at startup
2. `relayManager.js` streams to `-fallback` mount for fallback mode
3. Main mount has `fallback-override=1` so encoder takes priority

---

## How It Works

```
On Container Startup:
  └── Icecast gets config with ALL mounts:
        /new              (main, with fallback-override=1)
        /new-fallback     (hidden, for relay)

When Fallback Enabled:
  └── FFmpeg → /new-fallback (mount already exists!)

When Mixxx Connects:
  └── Mixxx → /new
  └── fallback-override=1 gives encoder priority
  └── Listeners hear Mixxx, not fallback
```

---

## Files Changed

### server/icecastConfig.js
- `generateMountXml()` now ALWAYS creates `-fallback` mount
- No conditional on `hasRelay` anymore

### server/relayManager.js  
- Line ~51: `targetMount = fallback ? mount-fallback : mount`
- Fallback mode streams to `-fallback` mount

---

## Test Checklist

After deploy (container restart):

- [ ] Mixxx connects to station
- [ ] Enable fallback, save
- [ ] Disconnect Mixxx → fallback should activate
- [ ] Stream plays audio (from fallback)
- [ ] Reconnect Mixxx → should take over (CRITICAL TEST)
- [ ] Disconnect Mixxx again → fallback resumes
