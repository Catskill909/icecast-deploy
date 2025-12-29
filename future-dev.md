# StreamDock - Future Development Roadmap

**Vision:** Make StreamDock the simplest, most powerful way for public radio stations to manage their streaming infrastructure.

**Last Updated:** December 29, 2024

---

## 📋 Recently Completed (Dec 2024)

- ✅ **Playlist Management** - Audio library, playlists, drag-and-drop
- ✅ **AutoDJ** - 24/7 automation with Primary/Fallback modes
- ✅ **Stream Relay & Fallback** - Auto-switch to backup stream ([full docs](docs/RELAY_FEATURE.md))
- ✅ **Email Alerts** - SMTP integration, per-station recipients, smart routing
- ✅ **Enhanced Diagnostics** - Advanced log search, filtering, download
- ✅ **Server Configuration UI** - Phase 1 MVP (limits, logging, CORS, presets)

---

## 🎯 Quick Wins (Next 1-2 Months)

### Station Management Enhancements
- [ ] **Edit Mount Points** - Allow changing mount points post-creation
  - Auto-update Liquidsoap configs
  - Warning about breaking listener URLs
  - Optional redirect from old to new mount
- [ ] **Station Templates** - Save configs for quick duplication
- [ ] **Bulk Operations** - Start/stop/delete multiple stations
- [ ] **Station Notes** - Internal admin-only notes per station

### Analytics (High Value)
- [ ] **Peak Listener Tracking** - Record and display all-time highs
- [ ] **Listener History Graphs** - Hourly/daily/weekly charts
- [ ] **Uptime Percentage** - Track reliability per station
- [ ] **CSV Export** - Download listener data for analysis

### UI/UX Polish
- [ ] **Now Playing Widget** - Metadata display on dashboard
- [ ] **Favorites** - Pin frequently used stations
- [ ] **Recent Activity Feed** - Quick access to recent changes
- [ ] **PWA Support** - Install as standalone app

---

## 📅 Near-Term Features (3-6 Months)

### Listener Analytics
- [ ] **Geographic Heatmap** - Where your listeners are located
- [ ] **User Agent Breakdown** - Browser, app, device stats
- [ ] **Weekly Summary Emails** - Automated reports

### Multi-User Management
- [ ] **DJ Accounts** - Individual credentials per DJ
- [ ] **Role-Based Access** - Admin, DJ, Viewer roles
- [ ] **DJ Dashboard** - Simplified view for streamers
- [ ] **Show Names** - Display current show info

### Stream Scheduling
- [ ] **Scheduled Activation** - Auto-start streams at specific times
- [ ] **Auto-Shutdown** - Stop after duration
- [ ] **Recurring Schedules** - Regular broadcasts
- [ ] **Calendar View** - Who's streaming when

### Enhanced Connection Tools
- [ ] **QR Code Generator** - Scan to get connection details
- [ ] **Email Connection Info** - One-click send to DJs
- [ ] **Connection URL Builder** - Presets for BUTT, OBS, ReaCast

---

## 🔬 Long-Term Features (6-12 Months)

### Audio Processing
- [ ] **Silence Detection** - Alert when stream goes silent
- [ ] **Audio Level Meter** - Real-time visualization
- [ ] **Test Tone Generator** - Verify encoder connectivity
- [ ] **Stream Recording** - Capture samples for testing

### Quality & Performance
- [ ] **Adaptive Bitrate Profiles** - Dynamic quality adjustment
- [ ] **HD Audio Option** - 256k+ AAC support
- [ ] **Podcast Preset** - Voice-optimized settings
- [ ] **Bitrate Stability Graph** - Monitor encoding consistency

### Server Configuration (Advanced)
- [ ] **XML Preview** - Real-time config preview before saving
- [ ] **Diff View** - See what changed
- [ ] **Config History** - Git-like version control
- [ ] **Rollback** - Undo to previous configs
- [ ] **Health Score** - Automatic optimization recommendations

### Distribution
- [ ] **Relay Management** - Multi-server distribution
- [ ] **CDN Integration** - Cloudflare support
- [ ] **Embed Player Generator** - Widgets for websites
- [ ] **Directory Auto-Submit** - TuneIn, Radio.net

### Platform Integrations
- [ ] **Discord Bot** - Stream status in Discord
- [ ] **Last.fm Scrobbling** - Track what's playing
- [ ] **Spotify Sync** - Share now playing data
- [ ] **Webhook Callbacks** - Custom event integrations

---

## ⏸️ Deferred Features

### SSL/TLS for DJ Connections (Phase 2)
**Status:** Deferred indefinitely

**Reason:** Coolify/Traefik already provides HTTPS for listeners. Adding SSL for DJ/encoder connections requires manual certificate management (defeating Coolify's "it just works" philosophy) or complex auto-integration (20-30 hours dev time). Current security (strong passwords, studio-only connections) is adequate for small/medium stations.

**Revisit if:**
- Station grows to NPR-scale
- Remote DJs from untrusted networks
- Actual security incident occurs

**Planning:** Full plan available in `/ssl_tls_phase2_plan.md`

---

### StationDock Integration
**Status:** On hold pending StationDock development

- Auto-populate streams in StationDock
- Sync station metadata between apps
- Combined analytics dashboard
- Unified authentication

---

### Mobile Apps
**Status:** Web-first focus, apps later

- Listener app (push notifications, CarPlay)
- DJ mobile app (stream from phone)
- PWA may satisfy most mobile needs

---

## 🤝 API Enhancements (Developer Tools)

### API Keys (Settings UI)
- [ ] **Generate/Revoke Keys** - From Settings page
- [ ] **Scoped Permissions** - Read-only vs full access
- [ ] **Rate Limiting** - Prevent abuse
- [ ] **OpenAPI Documentation** - Auto-generated docs

**Use Cases:**
- Automation scripts (start/stop streams)
- Third-party integrations (Discord, analytics)
- Mobile/desktop apps
- CI/CD pipelines
- Custom monitoring dashboards

---

## 📊 Current Priorities (January 2025)

1. **Edit Mount Points** - High user demand
2. **Peak Listener Tracking** - Easy analytics win
3. **Station Templates** - Time-saver for multi-station setups
4. **Now Playing Widget** - Dashboard UX improvement

---

## 💭 Feature Requests

Have an idea? Open an issue or discuss in the community forum.

**Evaluation Criteria:**
- ✅ Simplicity - Does it "just work"?
- ✅ Value - Solves real pain points?
- ✅ Scope - Fits StreamDock's mission?
- ❌ Complexity - Maintenance burden?

---

*For completed feature details, see [README.md](README.md)*
