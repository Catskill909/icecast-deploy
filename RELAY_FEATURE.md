# Relay & Fallback Feature

## ✅ WORKING (December 26, 2024 - Commit `c57e8f2`)

### Encoder Settings (Mixxx, BUTT, OBS, etc.)

| Setting | Value |
|---------|-------|
| **Host** | `icecast.supersoul.top` |
| **Port** | `8001` |
| **Mount** | **Your station's mount** (e.g., `/kpft`, `/new`) |
| **Password** | `streamdock_source` |
| **Protocol** | Icecast2 |

> **Note:** Each station gets its own mount in Liquidsoap. Use the mount shown in your station card.

### Listener URL
```
stream.supersoul.top/{mount}
```

---

## Architecture

```
Encoder → Liquidsoap (:8001) → Icecast (:8100) → Listeners
              ↑
        HTTP Fallback
```

**How it works:**
- Encoder connects to **Liquidsoap** (port 8001), NOT Icecast directly
- Liquidsoap handles source priority (live > fallback > silence)
- Liquidsoap outputs ONE stream to Icecast
- **No mount conflicts** - encoder can connect even when fallback is active

---

## Key Files

| File | Purpose |
|------|---------|
| `server/liquidsoopConfig.js` | Generates `radio.liq` from database |
| `radio.liq` | Liquidsoap config (auto-generated, don't edit) |
| `Dockerfile` | Uses `savonet/liquidsoap:v2.2.5` as base |
| `supervisord.conf` | Runs Icecast + Liquidsoap + Node.js |

---

## Deploy History

| Commit | Result | Description |
|--------|--------|-------------|
| `f5f7469` | ✅ | Phase 2 - static /stream mount |
| `25c2acd` | ⚠️ | Phase 3 - mksafe bug (all stations LIVE) |
| `c9a1d55` | ❌ | Tried fallible=true incorrectly |
| `2df6272` | ⚠️ | Code reverted to Phase 2 |
| `77b5c83` | ⚠️ | Fixed Alpine → Debian builder |
| `0f1b710` | ⚠️ | Restored dynamic config, missing fallible=true |
| `1d1781b` | ⚠️ | Fixed port 8100 → 8001 in API |
| `c57e8f2` | ✅ | **WORKING** - Added fallible=true |

---

## Lessons Learned (Bad Paths to Avoid)

### ❌ DON'T use `mksafe()` on `input.harbor`
**Why:** Causes continuous output even without encoder. All stations appear LIVE.

### ❌ DON'T output fallible source without `fallible=true`
**Why:** Liquidsoap crashes with "Error 7: That source is fallible".

### ❌ DON'T return Icecast port (8100) for encoder settings
**Why:** Encoders must connect to Liquidsoap port 8001, not Icecast.

### ✅ DO use `fallible=true` on `output.icecast`
**Why:** Allows fallible sources like `input.harbor`. Station only shows LIVE when encoder connected.

---

## The Fix (Final Working Solution)

```liquidsoap
# NO mksafe on live input
live = input.harbor("mount", port=8001, password="...")

# Use fallible=true on output
output.icecast(
    %mp3(bitrate=128),
    host="127.0.0.1",
    port=8100,
    password="...",
    mount="/mount",
    fallible=true,  # <-- THIS IS KEY
    live
)
```

---

## Historical Archive

> See git history for December 24-25, 2024 attempts.
> The pre-Liquidsoap FFmpeg approach is deprecated and should not be used.
