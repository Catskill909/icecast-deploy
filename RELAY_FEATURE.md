# Relay & Fallback Feature - ✅ COMPLETE

**Date:** December 24, 2024  
**Status:** ✅ WORKING

---

## ⚠️ CRITICAL SETTINGS ⚠️

1. **Port 8100** - Icecast runs on 8100, NOT 8000
2. **Fallback mount** - Relay streams to `/{mount}-fallback`, NOT the main mount

---

## How Fallback Works

1. Encoder (Mixxx) streams to main mount `/new`
2. Fallback relay streams to `/new-fallback`
3. Icecast config has `fallback-mount=/new-fallback` and `fallback-override=1`
4. When encoder disconnects, listeners hear fallback
5. When encoder reconnects, it takes over automatically

---

## Key Bug Fixed (Dec 24)

**BUG:** Relay was streaming to main mount, blocking encoder
**FIX:** Relay now streams to `-fallback` mount (commit 38d81eb)

```javascript
// server/relayManager.js line 50
const targetMount = station.relay_mode === 'fallback' 
    ? `${mountPoint}-fallback`  // Stream to fallback mount
    : mountPoint;               // Primary mode uses main mount
```

---

## Key Files

| File | Critical Line |
|------|---------------|
| `server/relayManager.js` | Line 50: `-fallback` suffix |
| `server/icecastConfig.js` | Line 38-39: `fallback-mount` and `fallback-override=1` |
