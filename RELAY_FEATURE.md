# Relay & Fallback Feature

## ✅ Current Working Configuration (December 25, 2024)

### Encoder Settings (Mixxx, BUTT, OBS, etc.)

| Setting | Value |
|---------|-------|
| **Host** | `icecast.supersoul.top` |
| **Port** | `8001` |
| **Mount** | `/live` |
| **Password** | `streamdock_source` |
| **Protocol** | Icecast2 |

### Listener URL
```
stream.supersoul.top/stream
```

### Architecture
```
Encoder → Liquidsoap (:8001) → Icecast (:8100) → Listeners
                ↑
          HTTP Fallback (Phase 3)
```

---

## How It Works

**The Problem We Solved:**
- Icecast only allows ONE source per mount point
- When fallback relay was active, encoder couldn't connect
- Both were fighting for the same mount

**The Solution (Liquidsoap):**
- Encoder connects to Liquidsoap on port 8001
- Fallback feeds into Liquidsoap
- Liquidsoap picks the winner and sends ONE stream to Icecast
- No more mount conflicts!

**Automatic Priority:**
1. 🎙️ Live encoder (if connected)
2. 📡 Fallback relay (if live drops)
3. 🔇 Silence (if nothing else)

---

## Phase Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Liquidsoap in Docker, all 3 services running |
| Phase 2 | ✅ Complete | Encoder connection tested and working |
| Phase 3 | ✅ Complete | Liquidsoap Dynamic Config & Fallback Logic |
| Phase 4 | ✅ Complete | UI Integration, Status Fixes, & Cleanup |

---

## Deploy History

| Commit | Result | Description |
|--------|--------|-------------|
| `f5f7469` | ✅ WORKING | Phase 2 - static /stream mount |
| `25c2acd` | ⚠️ Partial | Phase 3 - mksafe bug (all stations LIVE) |
| `c9a1d55` | ❌ Failed | Tried fallible=true incorrectly |
| `2df6272` | ⚠️ Reverted | Code reverted to Phase 2 |
| `77b5c83` | ⚠️ Build fix | Fixed Alpine → Debian builder |
| `0f1b710` | ⚠️ Partial | Restored dynamic config, missing fallible=true |
| `1d1781b` | ⚠️ Partial | Fixed port 8100 → 8001 in API |
| `c57e8f2` | 🔄 TESTING | Added fallible=true to output.icecast |

---

## Phase 3 Fix (December 25, 2024 ~11:33 PM)

### The Problem
Phase 3 (25c2acd) used `mksafe()` on the live input, which caused:
- Silence output when no encoder connected
- ALL stations appeared LIVE even without encoder

### The Fix
Restore dynamic config from Phase 3 but WITHOUT `mksafe()` on the live input.
Instead, add `fallible=true` to `output.icecast` to allow fallible sources.
- Station shows LIVE only when encoder connected
- Station shows OFFLINE when encoder disconnected

### Mixxx Settings After Fix
| Setting | Value |
|---------|-------|
| Host | `icecast.supersoul.top` |
| Port | `8001` |
| Mount | **Your station's mount** (e.g., `/new`) |
| Password | `streamdock_source` |

---

## Phase 3 Attempt & Failure (December 25, 2024 ~10:55 PM)

### What We Tried
1. Created `server/liquidsoopConfig.js` - generate radio.liq from database
2. Rewrote `server/relayManager.js` - use Liquidsoap instead of FFmpeg
3. Integrated with `server/index.js` - regenerate config on station changes

### What Happened
**Commit 25c2acd:** First attempt deployed.
- All stations showed LIVE even with nothing connected
- Reason: `mksafe()` wrapper caused continuous output to all mounts

**Commit c9a1d55:** Tried to fix with `fallible=true`.
- Removed `mksafe()`, added `fallible=true` to output
- **RESULT:** Broke Liquidsoap completely
- 404 errors on all streams
- Mixxx couldn't connect: "Can't connect to streaming server"

### Revert
**Commit 2df6272:** Reverted both commits.
- Restored working Phase 2 state
- Manual radio.liq with single /live mount
- FFmpeg-based relay manager

### Lessons Learned
1. `fallible=true` on output.icecast may crash Liquidsoap 2.2.5
2. Dynamic per-station config generation needs different approach
3. Test on staging first, not production

### Next Approach for Phase 3
- Research Liquidsoap 2.2.5 proper fallible output handling
- Consider using `output.dummy` for testing
- Maybe keep simple single-station config, enhance relay logic instead

---

## Build Failure: Alpine Package Corruption (December 25, 2024 ~11:08 PM)

**Error:**
```
ERROR: gcc-15.2.0-r2: failed to extract usr/bin/cpp: I/O error
ERROR: gcc-15.2.0-r2: v2 package integrity error
```

**Cause:** Alpine Linux package mirror corruption (infrastructure issue, not code)

**Fix:** Changed Dockerfile builder stage from `node:20-alpine` to `node:20-slim` (Debian-based)

---

### Fix for "Fallback Override" Issue (Phase 4.1)
**Problem:** When fallback was enabled, it played over the live stream and wouldn't let go.
**Cause:** `mksafe()` wrapper on the fallback input made it "always available", confusing Liquidsoap's priority logic.
**Fix:** Removed `mksafe()` from the fallback HTTP input. Now `fallback()` correctly prefers the live source when available.

### Fix for "Mountpoint in use" / Zombie Process (Phase 4.3)
**Problem:** "Connection failed: 403, Mountpoint in use" logs when toggling relay.
**Cause:** Liquidsoap restart via `supervisorctl` sometimes left the old process running ("Zombie"), holding port 8100.
**Fix:** Updated `regenerateLiquidsoapConfig` to use an aggressive kill command:
`supervisorctl stop liquidsoap && pkill -9 liquidsoap || true && supervisorctl start liquidsoap`

### Fix for Persistent "Green Badge" (Phase 4.4)
**Problem:** The "FALLBACK" badge remained Green (Active) even when disabling/enabling via the Edit Modal.
**Cause:** 
1. The `updateStation` database function ignored the `relayStatus` field.
2. The Edit Modal uses `PUT` (unlike the main toggle buttons which use `POST`), and the `PUT` handler was not updating the status.
**Fix:** 
1. Updated `PUT /api/stations/:id` to explicitly calculate and set `relayStatus` ('ready', 'active', or 'idle').
2. Updated `POST` endpoints to force-update status using `db.updateRelayStatus`.

---

### Deep Audit & Final Cleanup (Phase 4.5)
**Problem:** A "Deep Audit" of the codebase revealed latent references to the deleted `relayManager`.
- **Specific Find:** The `/api/diagnostics` endpoint contained a call to `relayManager.getAllActiveRelays()`.
- **Risk:** Accessing the analytics/diagnostics page would have caused a server crash.
**Fix:** 
1. Deleted the crash-inducing line in `server/index.js`.
2. Removed all commented-out legacy code and unused imports throughout the server.
3. Verified 0 occurrences of `relayManager` or `ffmpeg` in the active codebase.

---
### UX & Behavior Notes (Phase 4.4)
User testing revealed confusion about stream interruptions and badge colors. The following behaviors are confirmed by design:

1.  **Editing Restarts Stream:**
    - **Behavior:** Clicking "Save" in the Edit Station Modal *always* triggers a full server process restart (Supervisor -> Liquidsoap).
    - **Result:** If live, the stream *will* drop for 2-5 seconds.
    - **UX Decision:** We must warn the user before they save. (See Future Work).

2.  **Badge Color Logic:**
    - **Orange (Ready):** The "FALLBACK" badge is Orange. This is correct. It means "Auto-Switching Enabled (Standby)".
    - **Green (Active)?** The current system *cannot* detect when Fallback is actively playing vs just standby.
    - **Result:** The badge will remain Orange even if the fallback stream is audible.
    - **UX Decision:** Users should interpret Orange as "Protected" rather than "Waiting".

### UI Improvements Implemented (Phase 5)
Based on user testing, the following UI changes were made:

1.  **Stream Restart Warning:**
    - Added an orange warning box in the Edit Station Modal (External Source section).
    - Text: "Interruption Warning: Saving changes to relay settings will restart the stream engine. If currently live, expect a 2-5 second audio drop."

2.  **Badge Text Clarification:**
    - Changed badge from "FALLBACK" to "FALLBACK READY".
    - This sets the expectation that Orange means "Protection Active" rather than "Waiting to Switch".


## Current State (Post-Audit)

**Working:**
- **Encoders:** Connect to Port 8001.
- **Relay Logic:** Liquidsoap manages primary + fallback inputs automatically.
- **UI Status:** Badges reflect correct state (Green=Streaming, Orange=Ready/Fallback, Grey=Offline).
- **Updates:** Toggling relay in Dashboard OR Edit Modal correctly updates DB and server config.
- **Safety:** "Zombie" processes are killed on restart; legacy FFmpeg code removed.

---

## Phase 4: UI Integration & Cleanup (Next Steps)

### Goal
Make the UI control Liquidsoap directly and remove the legacy FFmpeg code.

### 1. Refactor API Endpoints (`server/index.js`)
Currently, these endpoints call `relayManager` (FFmpeg). We will change them to:
- **`POST /api/relay/:id/start`**:
    - Update DB: `relay_enabled = 1`
    - Regenerate Liquidsoap Config
- **`POST /api/relay/:id/stop`**:
    - Update DB: `relay_enabled = 0`
    - Regenerate Liquidsoap Config

### 2. Dashboard Status badges
- **Current:** "FALLBACK ACTIVE" relies on FFmpeg process status.
- **New:**
    - "Relay Enabled": Check `relay_enabled` DB flag.
    - "On Air": Check Icecast stats (is the mount active?).
    - *Future:* Query Liquidsoap via Telnet/Socket for granular source status.

### 3. Delete Legacy Code
- Remove `server/relayManager.js`
- Remove FFmpeg dependency calls in `index.js` startup

---

## Key Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Uses `savonet/liquidsoap:v2.2.5` base image |
| `radio.liq` | Liquidsoap config - harbor input, Icecast output |
| `supervisord.conf` | Runs Icecast + Node.js + Liquidsoap |
| `icecast.xml` | Icecast config - uses `icecast2` user |

---

## Summary: Before vs After

| Before | After |
|--------|-------|
| Mixxx → Icecast :8100 | Mixxx → Liquidsoap :8001 → Icecast :8100 |
| FFmpeg → Icecast (mount conflict) | HTTP fallback → Liquidsoap (no conflict) |
| Manual reconnection when fallback active | Automatic - Liquidsoap handles priority |

---
---

# Historical Archive

> **Note:** The content below is historical context from December 24-25, 2024. 
> It documents the journey from failed approaches to the successful Liquidsoap integration.

---

## December 24, 2024: Pre-Liquidsoap Attempts

**Time Spent:** ~10 hours  
**Final Result:** Fallback worked, but encoder couldn't reconnect when fallback was active.

### The Original Problem

| Feature | Status |
|---------|--------|
| Fallback activates when encoder drops | ✅ WORKS |
| Stream plays audio | ✅ WORKS |
| Mixxx can reconnect when fallback active | ❌ NOT WORKING |

**Root Cause:** Both encoder and fallback tried to use the same Icecast mount point.

### Phase 0: Docker Disk Space Crisis
- Coolify server at 99% disk usage
- Ran `docker system prune -a -f` to clean up
- Reduced to 75% - deployments working again

### Phase 1: Initial Relay Debugging (~2 hours)

**Bugs Found & Fixed:**

| Bug | Fix |
|-----|-----|
| Port mismatch (8000 vs 8100) | Changed to 8100 |
| FFmpeg logging hidden | Changed to 'info' level |
| HTTP PUT failed | Use icecast:// protocol |
| Codec copy failed | Use libmp3lame |

### Phase 2: Badge Color Chase (~2 hours)
Multiple attempts to fix FALLBACK badge colors - cosmetic issue.

### Phase 3: Encoder Can't Reconnect (~3 hours)
- Tried streaming to `-fallback` mount
- Broke fallback completely
- Icecast `reloadconfig` doesn't add new mounts
- **Reverted**

### Phase 4: The Real Fix (~2 hours)
- Tried `startup.sh` to generate config before Icecast starts
- Also broke the server
- **Reverted**

**Final Status Dec 24:** Fallback works, but it's an architectural limitation.

---

## December 25, 2024: Liquidsoap Integration

**Decision:** Adopt Liquidsoap as the industry-standard solution.

### Advantages of Liquidsoap
- Industry standard for multi-source streaming
- Handles source priority/switching
- Future features: AutoDJ, scheduling, transitions
- Clean separation of concerns

### Docker Build Attempts (7 total)

| Attempt | Issue | Fix |
|---------|-------|-----|
| #1 | `liquidsoap` package not in Alpine | Switch to Debian |
| #2 | `apt.liquidsoap.info` DNS unresolvable | Use official Docker image |
| #3 | `/usr/lib/liquidsoap` not found | Use image as BASE |
| #4 | Permission denied on apt-get | Add `USER root` |
| #5 | Liquidsoap got wrong args from CMD | Add `ENTRYPOINT []` |
| #6 | Icecast: user 'node' not found | Use `icecast2` user |
| #7 | ✅ SUCCESS | All 3 services running |

### What Changed in Docker Setup

| File | Change |
|------|--------|
| `Dockerfile` | Base: `savonet/liquidsoap:v2.2.5`, add Node.js + Icecast |
| `supervisord.conf` | 3 programs: icecast, nodejs, liquidsoap |
| `icecast.xml` | User: `icecast2`, paths: `/etc/icecast2/` |
| `radio.liq` | NEW: harbor input on 8001, output to Icecast |

### Coolify Configuration

| Setting | Value |
|---------|-------|
| Ports Mappings | `8100:8100,8001:8001` |
| Traefik (stream subdomain) | → port 8100 (unchanged) |

---

## Lessons Learned

1. **Always check port numbers** - 8000 vs 8100 cost hours
2. **Startup order matters** - Config must exist before Icecast starts
3. **Icecast reloadconfig is limited** - Doesn't add new mounts
4. **Standard patterns exist** - Should have researched Liquidsoap sooner
5. **Document as you go** - Not at the end
6. **Docker base images have quirks** - ENTRYPOINTs, users, paths vary
