# Future Development Roadmap

Brainstorming session for StreamDock features and StationDock integration.

---

## 🎯 Vision

**Make StreamDock the simplest, most powerful way for public radio stations to manage their streaming infrastructure** - with seamless integration to StationDock for a complete broadcast-to-listener experience.

---

## 🔗 StationDock Integration

### Stream Source Integration
- [ ] **Auto-populate streams** in StationDock from StreamDock stations
- [ ] **Sync station metadata** (name, description, genre) between apps
- [ ] **Stream health alerts** - notify StationDock when a stream goes down
- [ ] **Failover triggers** - automatically switch to backup stream in StationDock

### Shared Authentication
- [ ] Single sign-on between StreamDock and StationDock
- [ ] Unified user management
- [ ] Role-based access (admin, DJ, listener)

### Listener Analytics Bridge
- [ ] Push listener counts from Icecast to StationDock
- [ ] Combined analytics dashboard
- [ ] Geographic data sharing

---

## 📻 Station Management Features

### Multi-Station Support
- [ ] **Station Groups** - organize stations by type (music, talk, backup)
- [ ] **Station Templates** - quick-create from presets
- [ ] **Bulk Operations** - start/stop/delete multiple stations

### Enhanced Connection Info
- [ ] **QR Code** for connection details (scan with mobile DJ apps)
- [ ] **One-click email** connection info to DJs
- [ ] **Connection URL builder** for different encoder formats (BUTT, OBS, ReaCast)

### Stream Scheduling
- [ ] **Scheduled activation** - auto-start stations at specific times
- [ ] **Auto-shutdown** after specified duration
- [ ] **Recurring schedules** for regular broadcasts

---

## 🔊 Audio & Quality Features

### Audio Processing
- [ ] **Silence detection** - alert when stream goes silent
- [ ] **Audio normalization** settings
- [ ] **Stereo/Mono** toggle

### Quality Presets
- [ ] **Adaptive bitrate** profiles
- [ ] **HD Audio** option (256k+ AAC)
- [ ] **Podcast preset** (optimized for voice)

### Stream Testing
- [ ] **Test tone generator** to verify encoder connection
- [ ] **Audio level meter** in dashboard
- [ ] **Recording** - capture stream samples for testing

---

## 📊 Analytics & Monitoring

### Listener Analytics
- [ ] **Peak listeners** tracking
- [ ] **Listener history** graphs (hourly/daily/weekly)
- [ ] **Geographic heatmap** of listeners
- [ ] **User agent breakdown** (browser, app, device)

### Stream Health
- [ ] **Uptime percentage** display
- [ ] **Bitrate stability** graph
- [ ] **Connection quality** indicator
- [ ] **Historical downtime** log

### Export & Reports
- [ ] **CSV export** of listener data
- [ ] **Weekly summary emails**
- [ ] **Compliance reports** for FCC/licensing

---

## 🔔 Alerts & Notifications

### Alert Types
- [x] **Stream down** notification ✅ DONE (Dec 2024)
- [x] **Stream live** notification ✅ DONE (Dec 2024)
- [x] **High listener count** threshold ✅ DONE (Dec 2024) - Milestones at 50, 100, 250, 500
- [ ] **Low listener** warning
- [ ] **Encoder disconnect** alert
- [ ] **Silent stream** detection

### Notification Channels
- [x] **In-app alerts** with bell icon ✅ DONE (Dec 2024)
- [x] **Email** alerts ✅ DONE (Dec 2024) - Full implementation: SMTP config, test email, auto-send on stream events
- [x] **Per-station recipients** ✅ DONE (Dec 2024) - Configure specific emails per station
- [x] **Smart fallback routing** ✅ DONE (Dec 2024) - Global list acts as fallback
- [ ] **SMS** via Twilio
- [ ] **Webhook** for custom integrations
- [ ] **Push notifications** (browser/mobile)
- [ ] **Slack/Discord** integration

---

## 🔄 Relay & Restreaming (Phase 2.5)

> **Goal**: Allow stations to pull audio from external stream URLs, either as a primary source or as an automatic fallback when the encoder disconnects.

### Concept: Unified Station Model
Instead of a separate "Relays" menu, relay functionality is integrated directly into existing station cards. Each station can optionally have an external stream URL configured.

### Station Relay Modes

| Mode | Behavior |
|------|----------|
| **Primary Source** | Station rebroadcasts the external URL. No encoder needed. |
| **Fallback** | Encoder is primary. If encoder drops, auto-switch to relay URL. Switch back when encoder returns. |

### New Station Fields
```
relayUrl        - External stream URL (Icecast, Shoutcast, direct MP3/AAC)
relayEnabled    - Toggle relay on/off
relayMode       - 'primary' or 'fallback'
relayStatus     - 'idle' | 'active' | 'error' | 'standby'
```

### Implementation: App-Controlled Relay (Option B)
Rather than relying on Icecast's native fallback-mount (which requires config restarts), our app handles relay logic dynamically:

1. **Monitor encoder status** - Polling detects when encoder disconnects
2. **Activate relay** - App starts pulling from relay URL and pushing to Icecast mount
3. **Monitor for encoder return** - When encoder reconnects, gracefully stop relay
4. **Status tracking** - Show current source (Encoder / Relay / Fallback Active) in UI

### UI Changes

#### Edit Station Modal - New Section
```
─────────── External Source ───────────

Relay URL:  [https://stream.example.com/mount]
            [Test URL]

            ☑ Enable Relay

Relay Mode: ○ Primary Source (no encoder needed)
            ● Fallback (auto-switch when encoder drops)
```

#### Station Card Status Display
```
┌──────────────────────────────────────┐
│ 🎵 My Station               🔴 LIVE │
│ Source: 📡 Encoder                   │  ← Shows current source
│ Relay:  ✓ Standby (fallback ready)   │
│ Listeners: 45                        │
└──────────────────────────────────────┘
```

When failover is active:
```
│ Source: ⚠️ Fallback Active           │
│ Relay:  🔄 Streaming from backup     │
```

### Technical Architecture

```
┌─────────────────────────────────────────────────────┐
│                   StreamDock Server                  │
├─────────────────────────────────────────────────────┤
│  Relay Manager Service                               │
│  ├── polls Icecast status every 5s                  │
│  ├── detects encoder disconnect per station         │
│  ├── spawns relay stream (ffmpeg or node stream)    │
│  └── monitors relay health & encoder return         │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│                    Icecast Server                    │
│  /my-station ← receives from encoder OR relay       │
└─────────────────────────────────────────────────────┘
```

### Relay Engine Options
- **ffmpeg**: `ffmpeg -i <relay_url> -c copy -f mp3 icecast://source:pass@host/mount`
- **Node.js stream pipe**: Fetch relay URL, pipe to Icecast via http-proxy
- **liquidsoap**: More complex but handles reconnection gracefully

### Alerts Integration
- [x] Existing "Stream Down" alert fires when encoder drops
- [ ] New "Fallback Activated" alert when relay takes over
- [ ] New "Encoder Restored" alert when switching back
- [ ] Email notifications for all relay events (uses existing SMTP config)

### Checklist
- [ ] Add relay fields to database schema
- [ ] Add relay fields to Edit Station modal
- [ ] Add "Test URL" validation endpoint
- [ ] Create Relay Manager service
- [ ] Update station cards to show relay status
- [ ] Implement fallback activation logic
- [ ] Implement encoder-return detection
- [ ] Add relay-specific alerts
- [ ] Documentation & Help page updates

---

## 👥 Multi-User & DJ Features

### DJ Accounts
- [ ] **DJ profiles** with individual credentials
- [ ] **Schedule assignments** - which DJ streams when
- [ ] **Show names** - display current show info
- [ ] **DJ dashboard** - simplified view for streamers

### Access Control
- [ ] **Admin role** - full control
- [ ] **DJ role** - stream only, no delete
- [ ] **Viewer role** - read-only monitoring

### DJ Scheduling
- [ ] **Calendar view** of who's streaming when
- [ ] **Auto-credentials** - rotate passwords per show
- [ ] **Handoff notifications** - remind DJ when their slot starts

---

## 🎨 UI/UX Improvements

### Dashboard Enhancements
- [ ] **Now Playing** widget with metadata display
- [ ] **Quick Actions** bar (start/stop/restart)
- [ ] **Recent Activity** feed
- [ ] **Favorites** - pin frequently used stations

### Mobile Experience
- [ ] **Responsive design** improvements
- [ ] **PWA support** - install as app
- [ ] **Touch-friendly** controls

### Customization
- [ ] **Custom branding** - station logo upload
- [ ] **Theme options** - light mode
- [ ] **Widget embeds** - now playing for websites

---

## 🔧 Technical Infrastructure

### Server Management
- [ ] **Icecast config editor** - edit XML from UI
- [ ] **Server restart** button
- [ ] **Mount point limits** configuration
- [ ] **Relay setup** for load balancing

### Backup & Recovery
- [ ] **Database backup** to cloud storage
- [ ] **Export/Import** station configurations
- [ ] **Disaster recovery** guide

### API Enhancements
- [ ] **API key authentication**
- [ ] **Rate limiting**
- [ ] **Webhook callbacks** for events
- [ ] **OpenAPI/Swagger** documentation

---

## 🌐 Distribution & Syndication

### Stream Distribution
- [ ] **Relay management** - distribute to multiple servers
- [ ] **CDN integration** - Cloudflare, etc.
- [ ] **Embed player generator** - for websites

### Directory Listings
- [ ] **Auto-submit** to stream directories
- [ ] **TuneIn integration**
- [ ] **Radio.net submission**

---

## 📱 Mobile Apps

### Listener App Features
- [ ] Push notifications for favorite stations
- [ ] Sleep timer
- [ ] CarPlay/Android Auto support

### DJ Mobile App
- [ ] Stream connection from phone
- [ ] Show notes input
- [ ] Emergency playlist trigger

---

## 🤝 Partner Integrations

### Broadcast Software
- [ ] **BUTT** profile export
- [ ] **OBS** connection guide
- [ ] **Reaper/ReaCast** preset

### Platforms
- [ ] **Spotify** - sync now playing
- [ ] **Last.fm** scrobbling
- [ ] **Discord** bot integration

---

## 💡 Priority Features (Next Sprint)

Based on immediate needs for public radio stations:

1. **Live status detection** ✅ DONE
2. **Listen button** ✅ DONE
3. **Secure HTTPS streaming** ✅ DONE (Dec 2024)
4. **StationDock stream integration** ✅ DONE (Dec 2024)
5. **Secure Icecast status page** ✅ DONE (Dec 2024)
6. **Real-time alerts (stream live/offline)** ✅ DONE (Dec 2024)
7. **Listener milestone alerts** ✅ DONE (Dec 2024)
8. **DJ account management**
9. **Alert emails when stream drops** ✅ DONE (Dec 2024)
10. **Listener count history**


---

## 🗓 Development Phases

### Phase 1: Core (Current)
- Basic station CRUD ✅
- Live status ✅
- Listen button ✅

### Phase 2: Alerts & Monitoring
- In-app alerts ✅ DONE (Dec 2024)
- Listener milestones ✅ DONE (Dec 2024)
- Email notifications ✅ DONE (Dec 2024)
- Real Icecast log parsing (coming)
- Uptime tracking

### Phase 3: Multi-User
- DJ accounts
- Scheduling
- Access control

### Phase 4: StationDock Integration
- Stream sync
- Unified dashboard
- Failover automation

---

*Last updated: December 2024*
