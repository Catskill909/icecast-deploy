# Relay & Fallback Feature - Status

**Date:** December 24, 2024  
**Current Commit:** Restored from 58958aa  

---

## Current State

**relayManager.js** restored from commit 58958aa - the WORKING version where fallback activated correctly.

Key setting: Relay streams to MAIN mount (not -fallback mount)

---

## Known Issue

When fallback is streaming, Mixxx cannot connect because relay occupies the mount.

**This is accepted for now.** User must disable fallback before reconnecting Mixxx.

---

## Working Settings

| Setting | Value |
|---------|-------|
| Port | 8100 |
| Protocol | icecast:// |
| Codec | libmp3lame -b:a 128k |
| Target | Main mount (e.g., /new) |

---

## Test Checklist

- [ ] Mixxx connects
- [ ] Enable fallback, save
- [ ] Disconnect Mixxx → fallback activates
- [ ] Stream plays audio
