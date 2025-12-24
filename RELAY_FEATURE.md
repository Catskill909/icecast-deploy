# Relay & Fallback Feature - Handoff Document

**Date:** December 24, 2024  
**Status:** ✅ FULLY WORKING (pending test of latest fix)

---

## Quick Reference

| Setting | Value |
|---------|-------|
| Icecast Port | **8100** (NOT 8000!) |
| Relay Protocol | `icecast://` |
| Codec | `-c:a libmp3lame -b:a 128k` |
| Loglevel | `info` |

---

## How Fallback Mode Works

```
┌─────────────────────────────────────────────────────────┐
│ ENCODER (Mixxx) → /new          (main mount)           │
│ FALLBACK (FFmpeg) → /new-fallback  (hidden mount)      │
│                                                         │
│ Icecast config:                                         │
│   fallback-mount=/new-fallback                          │
│   fallback-override=1  ← encoder takes priority!        │
└─────────────────────────────────────────────────────────┘
```

**Flow:**
1. Fallback relay streams to `/new-fallback`
2. Listeners on `/new` hear fallback when encoder is off
3. When encoder connects to `/new`, it takes over automatically
4. When encoder disconnects, fallback resumes

---

## Key Files & Critical Lines

### server/relayManager.js
- **Line 16:** `ICECAST_INTERNAL_PORT = 8100` ← MUST be 8100
- **Line 50:** `targetMount = fallback ? mount-fallback : mount` ← Critical!
- **Line 60:** `icecast://` protocol

### server/icecastConfig.js  
- **Line 38:** `<fallback-mount>${mount}-fallback</fallback-mount>`
- **Line 39:** `<fallback-override>1</fallback-override>`

### server/index.js
- **Lines 1032-1035:** Fallback trigger when encoder drops

### src/pages/Stations.jsx
- **Lines 132-143:** FALLBACK badge colors (currently uses relayStatus check)

---

## Badge Color Logic

Current code checks `station.relayStatus === 'active'`:
- **GREEN** = fallback is actively streaming
- **ORANGE** = fallback on standby

⚠️ Note: Badge color changes have caused issues in the past. Test carefully.

---

## FFmpeg Command (Working)

```bash
ffmpeg -hide_banner -loglevel info \
  -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5 \
  -i [RELAY_URL] \
  -c:a libmp3lame -b:a 128k \
  -f mp3 -content_type audio/mpeg \
  icecast://source:[PASSWORD]@127.0.0.1:8100/[MOUNT]-fallback
```

---

## Bugs Fixed Today (Dec 24)

| Bug | Fix | Commit |
|-----|-----|--------|
| Port 8000 | → 8100 | 230f1e4 |
| Loglevel warning | → info | 230f1e4 |
| HTTP PUT failed | → icecast:// | a4c3aaf |
| Codec copy failed | → libmp3lame | 230f1e4 |
| Relay blocked encoder | → stream to -fallback mount | 38d81eb |

---

## Test Checklist

- [ ] Enable fallback on station
- [ ] Turn off encoder → fallback should activate
- [ ] Stream plays audio
- [ ] Connect encoder (Mixxx) → should take over
- [ ] Disconnect encoder → fallback resumes
- [ ] Badge shows correct color
