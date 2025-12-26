#!/usr/bin/liquidsoap
# StreamDock Liquidsoap Configuration
# Manages live encoder input with HTTP fallback

# Logging
set("log.level", 3)
set("log.stdout", true)

# Allow running as root (required in Docker when using savonet base image)
set("init.allow_root", true)

# Harbor settings - accept encoder connections
set("harbor.bind_addrs", ["0.0.0.0"])

# ==========================================
# INPUT SOURCES
# ==========================================

# Live input from encoder (Mixxx, BUTT, OBS, etc.)
# Connects on port 8001 with mount /live
live = input.harbor(
    "live",
    port=8001,
    password="streamdock_source"
)

# Mark live source as available even when not connected
live = mksafe(live)

# Fallback - silence when nothing else is available
# In Phase 3, we'll add HTTP input for external stream fallback
silence = blank()

# ==========================================
# SOURCE PRIORITY (FALLBACK CHAIN)
# ==========================================

# Priority: live encoder first, then silence
# track_sensitive=false means switch immediately when live appears
radio = fallback(
    track_sensitive=false,
    [live, silence]
)

# ==========================================
# OUTPUT TO ICECAST
# ==========================================

# Stream to local Icecast on port 8100
output.icecast(
    %mp3(bitrate=128),
    host="127.0.0.1",
    port=8100,
    password="streamdock_source",
    mount="/stream",
    name="StreamDock",
    description="Live stream via Liquidsoap",
    radio
)

print("Liquidsoap started - listening on port 8001 for encoder connections")
