# Relay & Fallback Feature - Status Report

**Date:** December 24, 2024  
**Current Commit:** 58958aa

---

## Current State

| Feature | Status |
|---------|--------|
| Mixxx connects | ✅ WORKS |
| Fallback activates when Mixxx off | ✅ WORKS |
| Stream plays audio | ✅ WORKS |
| Mixxx reconnects when fallback running | ❌ BROKEN |
| Badge colors | ⚠️ Reversed (cosmetic) |

---

## THE CRITICAL BUG

**When fallback relay is streaming, Mixxx cannot connect.**

Error: "Can't connect to streaming server"

**Why:** FFmpeg relay occupies the mount point `/new`. Icecast only allows ONE source per mount. Mixxx cannot connect because FFmpeg already has the connection.

---

## Possible Solutions (TO BE DISCUSSED)

### Option 1: Relay streams to fallback mount
- Relay → `/new-fallback`, Mixxx → `/new`
- Icecast `fallback-override=1` lets encoder take priority
- **Tried this (commit 38d81eb) - BROKE fallback entirely**
- Reason: Icecast config wasn't reloading properly

### Option 2: App kills relay when it detects encoder connection
- Monitor Icecast for new source on mount
- When detected, kill FFmpeg relay
- **Untested**

### Option 3: User manually stops relay before connecting Mixxx
- Workaround, not ideal
- User would need to turn off fallback in UI first

---

## Key Settings (Working)

| Setting | Value |
|---------|-------|
| Icecast Port | 8100 |
| Protocol | icecast:// |
| Codec | libmp3lame -b:a 128k |
| Loglevel | info |
| Mount target | Main mount (not -fallback) |

---

## What We Need To Decide

Before making ANY code change, we need to pick a solution for the encoder override issue.

Which option do you want to try?
