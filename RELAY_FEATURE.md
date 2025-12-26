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
| Phase 3 | 🔜 Next | HTTP fallback input |

---

## Next: Phase 3 - HTTP Fallback

1. Add HTTP input source to `radio.liq` for fallback relay
2. Configure fallback priority (live > relay > silence)  
3. Update Node.js relay logic (simpler - just turn HTTP source on/off)
4. Test automatic switching when encoder disconnects

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
