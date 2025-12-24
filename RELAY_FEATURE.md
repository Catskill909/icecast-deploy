# Relay & Fallback Feature Tracker

## Current Status: ✅ Icecast Native Fallback Implemented

---

## How It Works Now

```
Encoder → streams to /new
Relay   → streams to /new-fallback (hidden mount)
Icecast → auto-switches listeners between them
```

**When encoder drops:** Listeners auto-switch to fallback mount
**When encoder reconnects:** Listeners auto-switch back (fallback-override=1)

---

## ✅ Completed

### Core Implementation
- [x] Database fields for relay config
- [x] Edit Station modal relay settings
- [x] `relayManager.js` - ffmpeg streaming to `/{mount}-fallback`
- [x] `icecastConfig.js` - dynamic config generation
- [x] Auto-regenerate icecast.xml on station create/update/delete
- [x] Station card FALLBACK badge

### Fallback Flow
- [x] Encoder drops → fallback auto-starts
- [x] Encoder reconnects → Icecast auto-switches back

---

## 🔜 Next: Test & Verify

1. Deploy update
2. Configure station with fallback relay
3. Connect encoder → stream live
4. Disconnect encoder → should stay live via fallback
5. Reconnect encoder → should switch back seamlessly
