# Deep Audit Report: Live Overtake & Architecture

**Date:** December 28, 2025
**Objective:** Resolve discrepancy between documented architecture (Port 8001), user experience ("it works"), and code behavior ("overtake fails").

## 1. Architecture Audit (README & Docs)
I have audited `README.md` and confirmed the following:
*   **Port 8001 IS the Standard**: Lines 213-226 explicitly instruct users to connect encoders to `icecast.supersoul.top` on **Port 8001**, identifying this as the Liquidsoap Harbor port.
*   **User Validity**: Your configuration (connecting to 8001) is 100% consistent with the documentation. My previous claim that the port was "blocked" was based on a `docker-compose.yml` file that appears to be out-of-sync with your actual production environment (where 8001 is clearly working).

## 2. Code Logic Audit (`liquidsoopConfig.js`)
The code implements "Live Overtake" using standard Liquidsoap `fallback` logic:
```javascript
// Priority 1: Live Input (Harbor on 8001)
live_${id} = input.harbor("${mount}", port=8001, ...)

// Priority 2: AutoDJ (Playlist)
autodj_${id} = playlist(...)

// Switch Logic
source_${id} = fallback(track_sensitive=false, [live_${id}, autodj_${id}])
```
*   **Logic**: This explicitly tells Liquidsoap to switch to `live` *immediately* (`track_sensitive=false`) whenever `live` becomes available.
*   **Priorities**: Verified `live` is first in the list.

## 3. The "Why It Fails" Investigation
Since (A) Connectivity works (you can stream to 8001) and (B) Logic exists, the failure must be in the **Switching Mechanism**.

### Potential Causes

#### A. The "Slash" Mismatch (Mount Point)
*   **Code**: `input.harbor` strips the leading slash from the mount point (e.g., `/live` -> `live`).
*   **Encoder**: Encoders typically send the slash (e.g., `/live`).
*   **Impact**: When AutoDJ is **OFF**, Liquidsoap might be lenient or the fallback isn't involved, so it passes through. When AutoDJ is **ON**, the `fallback` operator must determine strictly if `live` is "available". If there is a slight mismatch in how the mount is claimed, `live` might not register as "ready" to the fallback operator, causing it to stick to AutoDJ.

#### B. Crossfade buffer lock
*   **Code**: `autodj` is wrapped in `crossfade()`. `live` is not.
*   **Impact**: Sometimes, complex transitions (like crossfade) attached to a source can make the fallback wait for a "break" that never comes, even with `track_sensitive=false`.

#### C. `input.harbor` validation hook (curl)
*   **Code**: `on_connect` runs a `curl` command to `127.0.0.1:3000`.
*   **Issue**: In production Docker, the internal app port is `3000`. The curl should work. **HOWEVER**, if this command hangs or fails for any reason (e.g. auth), it might prevent the source from becoming "available" in the eyes of the fallback operator.

## 4. Immediate Recommendations

1.  **Trust Port 8001**: Keep using it. It is correct.
2.  **Verify Password**: Ensure Mixxx uses the **global** `streamdock_source` password (as seen in config) and NOT the station-specific password, if they differ. A password mismatch hidden by the UI could cause this.
3.  **Logs Required**: The only way to prove WHY Liquidsoap rejects the switch is to view the runtime logs when you connect Mixxx. Be on the lookout for:
    *   `[harbor:4] Invalid password for mount /...`
    *   `[live_...:3] Source failed to become available`

## 5. Conclusion
The "Overtake" feature is fully coded and the architecture is correct. The failure is a subtle runtime behavior in Liquidsoap, likely related to mount-point matching stringency or the `on_connect` hook.
