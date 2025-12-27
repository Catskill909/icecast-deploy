# Relay & Fallback Feature

> **Last Updated:** December 26, 2024 @ 7:07 PM EST

---
## ⚠️⚠️⚠️ THE ONLY REMAINING ISSUE ⚠️⚠️⚠️

**EVERYTHING ELSE WORKS. ONE BUG LEFT: `on_connect` webhook not reaching API.**

### Badge Color Rules
- 🟢 **GREEN** = Fallback is THE ACTIVE source (streaming audio right now)
- 🟠 **ORANGE** = Fallback is on STANDBY (encoder is the main source)

---

## 🧪 LATEST TEST (December 26, 2024 @ 7:00 PM)

| Step | Action | Expected | Actual | Status |
|------|--------|----------|--------|--------|
| 1 | Station off | - | - | ✅ |
| 2 | Enable fallback, save | GREEN | GREEN | ✅ **FIXED** |
| 3 | Refresh page | GREEN | GREEN | ✅ **FIXED** |
| 4 | Connect Mixxx | ORANGE | GREEN | ❌ **ONLY BUG LEFT** |
| 5 | Disconnect Mixxx | GREEN | GREEN | ✅ |

---

## 🔍 COMPLETE AUDIT: ENCODER CONNECT FLOW (December 26, 2024 @ 7:07 PM)

### All 8 Files That Touch This Flow

| File | Role | Issue? |
|------|------|--------|
| `radio.liq` | Static template (no webhooks) | ⚠️ Used if config not generated |
| `Dockerfile` | Sets PORT=3000, copies template | ✅ |
| `start-liquidsoap.sh` | Waits 15s for config, fallback to template | ✅ |
| `supervisord.conf` | Sets PORT="3000" | ✅ |
| `server/index.js` | Fallback port 3001, webhook API, 5s startup delay | ⚠️ |
| `server/liquidsoopConfig.js` | Generates config with webhooks | **❌ HARDCODED PORT 3001** |
| `server/db.js` | updateRelayStatus() | ✅ |
| `src/pages/Stations.jsx` | Badge display logic | ✅ |

### ✅ ROOT CAUSE FIXED: Port Mismatch (Commit `19e24fb`)

**File:** `server/liquidsoopConfig.js` lines 69-70

**Was:**
```javascript
on_connect=fun(_) -> ignore(process.run("curl -s -X POST http://127.0.0.1:3001/..."))
```

**Now:**
```javascript
on_connect=fun(_) -> ignore(process.run("curl -s -X POST http://127.0.0.1:3000/..."))
```

**Problem was:** 
- curl was hitting port **3001** but Node.js runs on **3000**
- curl failed silently → API never received request → badge never updated

### The Complete Flow (After Fix)

```
1. Mixxx connects to Liquidsoap port 8001     ✅
2. Liquidsoap detects connection              ✅
3. on_connect callback fires                  ✅
4. curl tries http://127.0.0.1:3001/...       ❌ WRONG PORT!
5. curl fails (connection refused)            ❌
6. Node.js never receives request             ❌
7. Badge stays GREEN                          ❌
```

### Evidence
Liquidsoap log shows switch happened:
```
2025/12/26 23:59:41 [switch:3] Switch to input.harbor.3 with transition.
```

Node.js logs show NO `[ENCODER] Connected` message. The webhook never arrived.

---

## ✅ THE FIX

**Change port in `server/liquidsoopConfig.js` lines 69-70:**

```diff
- http://127.0.0.1:3001/api/encoder/${station.id}/connected
+ http://127.0.0.1:3000/api/encoder/${station.id}/connected
```

---

## 🔍 PREVIOUS AUDIT: Polling Overrides (Fixed)

### All places that set button color:
|------|---------|------|----------|
| 545 | `PUT /api/stations/:id` - Edit station | GREEN when enabled | ✅ |
| 757 | `POST /api/relay/start` - Start endpoint | ORANGE | n/a (not used by UI) |
| 773 | `POST /api/relay/stop` - Stop endpoint | idle | ✅ |
| 813 | Webhook: encoder connects | ORANGE | ✅ |
| 838 | Webhook: encoder disconnects | GREEN | ✅ |
| 1074 | First poll, station LIVE | GREEN | ⚠️ may override |
| **1103** | **Poll: stream LIVE + status='active'** | **ORANGE** | **❌ THE BUG** |
| 1115 | Poll: stream LIVE + status≠'active' | GREEN | ✅ |
| 1181 | Poll: stream OFFLINE | GREEN | ✅ (legacy, rarely runs) |

### Frontend Logic (CORRECT ✅)
**File:** `src/pages/Stations.jsx` line 136
```jsx
station.relayStatus === 'active' ? GREEN : ORANGE
```

### API Response (CORRECT ✅)
**File:** `server/index.js` lines 452, 485
```javascript
relayStatus: s.relay_status || 'idle'
```

### Database (CORRECT ✅)
**File:** `server/db.js` line 250
```javascript
updateRelayStatus(id, status)
```

---

## ❌ ROOT CAUSE: Line 1091-1103

**File:** `server/index.js`

```javascript
// CHECK: Stream went LIVE (Recovery)
if (isActive && !prev.live) {
    if (station?.relay_enabled && station?.relay_mode === 'fallback') {
        if (station?.relay_status === 'active') {  // ← Line 1091
            // Encoder reconnected after being down
            db.updateRelayStatus(station.id, 'ready');  // ← Line 1103 - FORCES ORANGE!
        }
    }
}
```

### Why This Is Wrong:

1. User enables fallback → API sets `relay_status = 'active'` (GREEN) ✅
2. Liquidsoap starts → Stream goes LIVE
3. User refreshes page → Polling runs
4. Polling sees: `isActive=true`, `!prev.live=true` (stream just went LIVE)
5. Polling checks: `relay_status === 'active'` → TRUE
6. Polling WRONGLY assumes: "Encoder must have reconnected!"
7. Polling sets: `relay_status = 'ready'` (ORANGE) ❌

**The polling cannot distinguish between:**
- Fallback just started streaming (should stay GREEN)
- Encoder reconnected (should turn ORANGE)

---

## ✅ THE FIX

**Remove line 1103** (the `db.updateRelayStatus(station.id, 'ready')` call).

Let ONLY the webhooks control button color:
- Webhook `on_connect` → ORANGE (encoder is live)
- Webhook `on_disconnect` → GREEN (fallback is active)

---

## 🚨 CURRENT STATUS

### What's Working ✅
| Feature | Status |
|---------|--------|
| Streaming | ✅ Working |
| Mixxx encoder connects | ✅ Working |
| Audio switches (live → fallback → live) | ✅ Working |
| Fallback auto-activates when encoder drops | ✅ Working |
| "Fallback Active" email | ✅ Working |
| "Stream Recovered" email | ✅ Working |
| Badge turns GREEN on enable | ✅ Working |

### What's NOT Working ❌
| Issue | Status |
|-------|--------|
| Badge stays GREEN after refresh | ❌ Polling overrides to ORANGE |
| Badge updates when encoder connects | ❌ Needs webhook + no polling override |

### ❌ CRITICAL ISSUES (For Next Session)
| Issue | Symptom | Root Cause | Status |
|-------|---------|------------|--------|
| **Badge Color (Encoder)** | Badge stays GREEN when Encoder is live (should be ORANGE) | **Dockerfile was overwriting generated config.** `COPY radio.liq` copied old static file (no webhooks) over the dynamically generated one. | 🔧 FIX DEPLOYED - Needs testing |
| **Badge Refresh** | Need to refresh page to see Green button after enabling fallback | Race condition: Page reloads before Server updates DB status. | ❌ Still needs fix |

### Fix Applied (December 26, 2024 @ 5:00 PM)
**Webhook Config Override Fix:**
- `Dockerfile` - Changed `COPY radio.liq /app/radio.liq` → `COPY radio.liq /app/radio.liq.template`
- `start-liquidsoap.sh` (NEW) - Waits for Node.js to generate real config, falls back to template
- `supervisord.conf` - Uses startup script instead of direct Liquidsoap call

**Why this fixes it:** Node.js generates `radio.liq` WITH webhooks → Liquidsoap reads that file → `on_connect`/`on_disconnect` callbacks fire

### Test Results (User Verified)
1. **Enable Fallback:** Station goes LIVE. Email sent correctly. Badge turns GREEN (after refresh). ✅
2. **Connect Mixxx:** Audio switches to Mixxx. **Badge STAYS GREEN** (Fail). ❌ ← Fix deployed, needs retest
3. **Disconnect Mixxx:** Audio switches to Fallback. Badge stays GREEN. ✅

### Next Steps (Code Required)
1. ~~**Fix Liquidsoap Webhooks:**~~ ✅ FIXED - Deploy and test
2. **Fix UI Refresh:** Add a delay before `window.location.reload()` in `EditStationModal.jsx`, or implement polling.

### Key Files
| File | Purpose |
|------|---------|
| `server/index.js` | API endpoints, `checkAndGenerateAlerts()`, webhook handlers |
| `server/liquidsoopConfig.js` | Generates `radio.liq` with `on_connect`/`on_disconnect` callbacks |
| `server/db.js` | `updateRelayStatus()` function |
| `src/pages/Stations.jsx` | Frontend badge color logic (line 136) |
| `Dockerfile` | Build config - now uses template for radio.liq |
| `start-liquidsoap.sh` | NEW - Startup script to wait for generated config |

---

## Current Working Configuration (December 25, 2024)

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
    - Changed badge from "FALLBACK" to "AUTO FALLBACK".
    - This sets the expectation that Orange means "Protection Active" rather than "Waiting to Switch".

3.  **Dynamic Badge Color (Phase 5.1) - LIMITATION DISCOVERED:**
    - **Intent:** Badge should turn Green when fallback is playing, Orange when standby.
    - **Implementation:** Added `db.updateRelayStatus('active')` when encoder drops, `db.updateRelayStatus('ready')` when encoder reconnects.
    - **PROBLEM:** The detection logic relies on Icecast "OFFLINE → LIVE" transitions.
    - **When fallback is enabled on an offline station:**
        1. Station is OFFLINE
        2. User enables fallback → Liquidsoap starts → Icecast shows LIVE
        3. System detects OFFLINE → LIVE = "Stream Recovered" (not "Fallback Activated")
        4. Status is set to 'ready' (Orange), not 'active' (Green)
    - **ROOT CAUSE:** Icecast cannot distinguish between:
        - LIVE because encoder is connected
        - LIVE because fallback is connected
    - **RESULT:** Badge remains Orange regardless of source.
    - **FUTURE FIX REQUIRED:** Query Liquidsoap via telnet to ask which source is active (new feature scope).

---

## Known Limitation: Badge Color Cannot Detect Active Source

| What We Wanted | What We Got | Why |
|----------------|-------------|-----|
| 🟢 Green = Fallback playing | 🟠 Always Orange | Icecast only sees "audio exists", not "which source" |
| 🟠 Orange = Fallback standby | 🟠 Always Orange | Same as above |

**The only way to fix this** is to:
1. Connect to Liquidsoap via telnet (port 1234)
2. Query `source.is_ready("live_input")` or similar
3. Update badge color based on Liquidsoap's response

This is a **new feature** requiring significant development, not a bug fix.

---

## Phase 6: Liquidsoap Telnet Integration (FAILED - REVERTED)

**Goal:** Query Liquidsoap directly to determine active source (encoder vs fallback).

**What Was Tried:**
1. `server/liquidsoopConfig.js` - Added telnet server (port 1234) and `server.register()` commands
2. `server/liquidsoapClient.js` - NEW: Node.js telnet client to query source status
3. `server/index.js` - Added `updateSourceStatuses()` function called during polling

**Why It Failed:**
1. Telnet queries returned `'unknown'` frequently
2. Timing issues during Liquidsoap restarts caused unreliable responses
3. Integration into `checkAndGenerateAlerts()` broke email alerts entirely
4. Badge never turned green because status was always skipped on 'unknown'

**Status:** ❌ REVERTED - Code removed from `checkAndGenerateAlerts()`. Telnet approach abandoned.

---

## Deep Audit: Root Cause Analysis (December 26, 2024)

### The Fundamental Problem

When fallback relay is enabled, Liquidsoap's `fallback()` function switches sources **internally**. From Icecast's perspective, the stream NEVER goes offline - it just switches audio sources seamlessly.

```
┌─────────────────────────────────────────────────────────────┐
│                     LIQUIDSOAP                               │
│                                                              │
│  Encoder ────► input.harbor() ─┐                             │
│                                ├─► fallback() ───► Icecast   │
│  Fallback ───► input.http()  ──┘                             │
│                                                              │
│  (Source switching happens HERE - invisible to Icecast)     │
└──────────────────────────────────────────────────────────────┘
```

### The Code That Never Triggers

In `server/index.js`, the alert logic checks:
```javascript
if (!isActive && prev.live) {  // ← NEVER TRUE WHEN FALLBACK IS ON
    sendAlertEmail('fallback_activated', ...);
}
```

When fallback is enabled:
1. Encoder disconnects from Liquidsoap
2. Liquidsoap's `fallback()` instantly switches to HTTP source
3. Icecast never stops receiving audio
4. `isActive` remains `true`
5. Email is never sent, badge never turns green

### What Works vs What's Broken

| Feature | Status | Why |
|---------|--------|-----|
| Streaming | ✅ | Direct path works |
| Fallback auto-switch | ✅ | Liquidsoap handles internally |
| Encoder override | ✅ | Liquidsoap priority works |
| Email (relay OFF) | ✅ | Icecast sees OFFLINE |
| Email (relay ON) | ❌ | Icecast never sees OFFLINE |
| Badge color | ❌ | Same reason |

---

## Phase 7: Webhook Callbacks (IN PROGRESS - December 26, 2024)

### Industry-Standard Solution

Research into how professional radio stations handle this revealed the correct approach: **Liquidsoap's built-in `on_connect` and `on_disconnect` callbacks**.

These callbacks fire **directly** when an encoder connects or disconnects - no polling, no delays, no Icecast dependency.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                     LIQUIDSOAP                               │
│                                                              │
│  input.harbor(                                               │
│    on_connect    → curl POST /api/encoder/:id/connected      │
│    on_disconnect → curl POST /api/encoder/:id/disconnected   │
│  )                                                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
                              ↓
                     Node.js receives webhook
                              ↓
              - Updates badge (ORANGE when encoder connected)
              - Updates badge (GREEN when fallback active)
              - Sends "Fallback Activated" email
```

### Files Modified

| File | Change |
|------|--------|
| `server/liquidsoopConfig.js` | Add `on_connect`/`on_disconnect` callbacks to `input.harbor` |
| `server/index.js` | Add `/api/encoder/:id/connected` and `/api/encoder/:id/disconnected` endpoints |
| `server/liquidsoapClient.js` | **DELETED** (telnet approach abandoned) |

### Implementation Attempts (December 26, 2024)

#### Attempt 1: Full function syntax with `end`
```liquidsoap
on_connect=fun(~headers, ~uri, ~protocol, _) -> 
    log("Encoder connected")
    ignore(process.run("curl ..."))
end
```
**Result:** ❌ Parse error - `end` syntax incorrect

#### Attempt 2: Thread wrapper with `end`
```liquidsoap
on_connect=fun(_) -> thread.run(fun() -> ignore(process.run("curl ..."))) end
```
**Result:** ❌ Parse error at `end` - single expressions don't use `end`

#### Attempt 3: Simplified single expression (CURRENT)
```liquidsoap
on_connect=fun(_) -> ignore(process.run("curl ...")),
on_disconnect=fun() -> ignore(process.run("curl ..."))
```
**Result:** 🔄 TESTING - Pushed commit `6351ebb`

### Liquidsoap 2.2.5 Callback Syntax Notes

From official docs (reference.html):
- `on_connect` type: `([string * string]) -> unit` - receives list of headers
- `on_disconnect` type: `() -> unit` - receives nothing
- Default `on_connect`: `fun (_) -> ()`
- Default `on_disconnect`: `{()}`

**Key Learning:** In Liquidsoap 2.x:
- Single expression: `fun(x) -> expr` (NO `end`)
- Multiple expressions: `fun(x) -> expr1; expr2 end` (WITH `end`)

### Commit History

| Commit | Description | Result |
|--------|-------------|--------|
| `92dd215` | First webhook implementation with broken syntax | ❌ Parse error |
| `ede0d8f` | Reverted to working config | ✅ Streaming restored |
| `97d1aa7` | Added `thread.run` wrapper with `end` | ❌ Parse error |
| `0ba3c9e` | Emergency revert | ✅ Streaming restored |
| `6351ebb` | Simplified syntax without `end` | 🔄 Testing |
| `5984c63` | Fixed email logic (see below) | ✅ Working |
| `f3777af` | Fixed badge GREEN on server restart | 🔄 Testing |

### Email Logic Fix (Commit `5984c63`)

**Problem:** When enabling fallback on an OFFLINE station, system sent "Stream Recovered" instead of "Fallback Active".

**Root Cause:** `checkAndGenerateAlerts()` detected `isActive && !prev.live` (stream went online) but didn't distinguish between:
- Encoder reconnecting (should send "Encoder Reconnected")
- Fallback starting up (should send "Fallback Active")

**Fix:** Added logic to check `relay_status` before deciding which email to send:
```javascript
if (isActive && !prev.live) {
    if (station?.relay_enabled && station?.relay_mode === 'fallback') {
        if (station?.relay_status === 'active') {
            // Encoder reconnected (fallback was playing) → badge ORANGE
            sendAlertEmail('stream_up', 'Encoder Reconnected: ...');
        } else {
            // Fallback just started → badge GREEN
            sendAlertEmail('fallback_activated', 'Fallback Active: ...');
        }
    } else {
        // Normal station → "Stream Recovered"
    }
}
```

### Expected Behavior After Fix

| Action | Badge | Email |
|--------|-------|-------|
| Enable fallback on OFFLINE station | GREEN | "Fallback Active" |
| Connect encoder (Mixxx) | ORANGE | (none) |
| Disconnect encoder | GREEN | "Fallback Active" |
| Reconnect encoder | ORANGE | "Encoder Reconnected" |

### Badge Color Bug Fix (Commit `f3777af`)

**Problem:** Badge stayed ORANGE even after enabling fallback (tested 2+ days).

**Root Cause:** When Liquidsoap restarts (from enabling fallback), `checkAndGenerateAlerts()` runs its first poll:
```javascript
if (!previousMountStatus[mount]) {
    previousMountStatus[mount] = { live: isActive, listeners: 0 };
    return;  // ← EARLY RETURN - BADGE UPDATE CODE NEVER REACHED!
}
```

The badge update logic was placed AFTER this early return, so it never executed on server restart.

**Fix:** Added badge update BEFORE the early return:
```javascript
if (!previousMountStatus[mount]) {
    previousMountStatus[mount] = { live: isActive, listeners: 0 };

    // NEW: Set badge GREEN if fallback station is already LIVE
    if (isActive && station?.relay_enabled && station?.relay_mode === 'fallback') {
        db.updateRelayStatus(station.id, 'active');  // GREEN badge
    }

    return;
}
```

**Status:** 🔄 TESTING - Deployed commit `f3777af`

---

## Local Testing (Before Deploy)

### Why Test Locally?
Each production deploy costs 2-5 minutes and risks breaking live streaming. Test locally first!

### Option 1: Run Docker Locally
```bash
cd /Users/paulhenshaw/Desktop/icecast-deploy

# Build the image
docker build -t streamdock-test .

# Run with required env vars
docker run -it --rm \
  -p 3001:3001 \
  -p 8001:8001 \
  -p 8100:8100 \
  -e PORT=3001 \
  -e ICECAST_HOST=127.0.0.1 \
  -e ICECAST_PORT=8100 \
  -e ICECAST_SOURCE_PASSWORD=streamdock_source \
  -e ADMIN_PASSWORD=admin123 \
  streamdock-test

# Access at http://localhost:3001
```

### Option 2: Test Liquidsoap Syntax Only
Create a test script and validate before committing:
```bash
# Create minimal test file
cat > /tmp/test.liq << 'EOF'
live = input.harbor(
    "/test",
    port=8001,
    password="test",
    on_connect=fun(_) -> ignore(process.run("echo connected")),
    on_disconnect=fun() -> ignore(process.run("echo disconnected"))
)
output.dummy(live)
EOF

# Test syntax with Docker
docker run --rm -v /tmp/test.liq:/test.liq savonet/liquidsoap:v2.2.5 liquidsoap --check /test.liq
```

If `--check` passes with no errors, the syntax is valid.

### Option 3: Check Logs After Deploy
```bash
# SSH to Coolify server
ssh root@<your-server>

# View Liquidsoap logs in container
docker logs <container-id> 2>&1 | grep -i "error\|parse\|connect"
```


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
