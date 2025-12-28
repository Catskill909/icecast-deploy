# Audit: Live Stream Overtake for AutoDJ

## Objective
Verify the capability for a live stream (e.g., from Mixxx, BUTT, or other encoders) to strictly "overtake" or interrupt the AutoDJ stream when connected, and automatically return to AutoDJ when the live stream ends.

## Current Code Analysis (`server/liquidsoopConfig.js`)

The audit of the current Liquidsoap configuration generation logic reveals that **this feature is already fully implemented**.

### Logic Flow:
1.  **Harbor Input Created**: For every station (except Relay-Primary mode), a `input.harbor` source is created.
    ```liquidsoap
    live_${id} = input.harbor("${mount}", port=8001, ...)
    ```
    *   This "Harbor" is a listener within Liquidsoap waiting for incoming connections.

2.  **AutoDJ Input Created**: If enabled, a playlist source is created.
    ```liquidsoap
    autodj_${id} = playlist(...)
    ```

3.  **Fallback Priority**: A fallback source is defined with the live input as the **first priority**.
    ```liquidsoap
    source_${id} = fallback(track_sensitive=false, [live_${id}, autodj_${id}])
    ```

### How it Works:
*   **Priority 1**: `live_${id}` (The incoming stream from your encoder).
*   **Priority 2**: `autodj_${id}` (The playlist).
*   **Behavior**: When `live_${id}` becomes available (i.e., you connect your encoder), Liquidsoap immediately switches to it because it is higher priority. The `track_sensitive=false` flag ensures the switch happens instantly, interrupting the current song.

## Critical Requirement: Port 8001 vs 8000

**The confusion likely stems from WHICH port the live encoder connects to.**

*   **Port 8000 (Icecast)**: The *Output* port. Liquidsoap connects here to broadcast. If AutoDJ is running, Liquidsoap is *already* connected to this mount. If you try to connect Mixxx to Port 8000, you will get **"Error: Mountpoint in use"**. You cannot "overtake" by connecting to the output.

*   **Port 8001 (Liquidsoap Harbor)**: The *Input* port. This is where Liquidsoap listens for "overtake" streams.
    *   **Action**: You must configure Mixxx to connect to **Port 8001**.
    *   **Result**: Liquidsoap accepts the connection, sees it as a high-priority source, and switches the output (on Port 8000) to pass through your live audio.


## Critical Infrastructure Audit (WHY IT CURRENTLY FAILS)

**The feature does not work because Port 8001 is blocked.**

My audit of `docker-compose.yml` found this:
```yaml
ports:
    - "3000:3000"
    - "8100:8100"
    # MISSING: "8001:8001"
```

Because `8001` is not in the `ports` list, Docker is blocking all external connections to the Harbor.
*   The code inside the container works.
*   The networking outside the container prevents it from ever receiving the signal.

### Required Server Fix
You (or the deployment script) must update `docker-compose.yml` to expose the harbor port:
```yaml
ports:
  - "3000:3000"
  - "8100:8100"
  - "8001:8001"  <-- MUST BE ADDED
```

## Verification Steps (User Action Required)

Once `docker-compose.yml` is updated and `docker-compose up -d` is run:

1.  **Configure Mixxx (or any encoder)**:
    *   **Server**: Your StreamDock IP/URL
    *   **Port**: **8001** (NOT 8000)
    *   **Mount**: The same mount point (e.g., `/live`)
    *   **Password**: The source password configured for the station.

2.  **Test**:
    *   Ensure AutoDJ is playing.
    *   Connect Mixxx (Port 8001).
    *   **Expected Result**: AutoDJ fades out/cuts, and Mixxx audio is heard on the stream.
    *   Disconnect Mixxx.
    *   **Expected Result**: AutoDJ resumes.

## Conclusion
The code changes required are **Zero**. The system is already architected for this.
The solution is **user education and documentation** regarding the use of the **Harbor Port (8001)** for live injection.

## Next Steps
1.  Update `Help.jsx` "Connecting your Encoder" section to explicitly mention:
    *   "If AutoDJ is ENABLED, you must connect to Port 8001 to overtake the stream."
    *   "If connecting to Port 8000 fails with 'Mountpoint in use', try Port 8001."
2.  Update `EditStationModal` to show the "Encoder Port" as 8001 dynamically if AutoDJ is enabled? (Optional UI enhancement).
