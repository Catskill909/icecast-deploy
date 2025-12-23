# StreamDock - Station Management Dashboard

A modern Icecast streaming server management interface with a clean dark-mode UI. Create stations, manage connection credentials, and monitor live streams.

**Production URL:** https://icecast.supersoul.top  
**Features Page:** https://icecast.supersoul.top/features.html

## ✨ Features

### 🎙️ Station Creation Wizard
- **3-Step Setup**: Create new radio stations with a guided wizard
- **Auto-Generated Credentials**: Secure passwords and mount points created automatically
- **Copy-to-Clipboard**: One-click copy for all connection details
- **Format Options**: MP3 or AAC with quality presets (Low/Standard/High)

### 🎯 Station Management
- **Station Cards**: View all your stations at a glance
- **Connection Info**: Server, port, mount point, and password display
- **Password Toggle**: Show/hide source passwords securely
- **Delete Stations**: Remove stations with confirmation modal

### 🔴 Live Status Detection
- **Real-Time Polling**: Checks Icecast server every 5 seconds
- **LIVE Badge**: Animated pulsing indicator when streaming
- **Listener Count**: Shows current listeners per station
- **Visual Highlights**: Green ring around active stations

### 🔔 Real-Time Alerts (NEW)
- **Station Now Broadcasting**: Notified when stream goes live
- **Broadcast Ended**: Alert when stream goes offline  
- **Listener Milestones**: Celebrate 50, 100, 250, 500+ listeners
- **Header Notifications**: Bell icon with unread count badge
- **Mark as Read**: Dismiss alerts from the alerts page

### 📧 Email Notifications (NEW)
- **Automatic Alerts**: Get notified instantly when a stream goes down or recovers
- **SMTP Support**: Works with Gmail, SendGrid, Amazon SES, or any SMTP server
- **Secure Storage**: SMTP passwords are encrypted using AES-256-CBC
- **Spam Prevention**: Configurable cooldowns to prevent alert flooding
- **Recipient Management**: Send alerts to multiple team members


### 🎧 Built-in Audio Player
- **Listen Button**: One-click playback of live streams
- **Play/Pause Controls**: Toggle stream audio in-browser
- **Auto-Stop**: Stops playback when station goes offline

### 📊 Dashboard
- **Station Overview**: Quick stats on active vs total stations
- **Server Status**: Online/offline indicator
- **Quick Start Guide**: Step-by-step onboarding for new users

### 🔒 Secure Streaming
- **HTTPS Streams**: Secure streams via `stream.supersoul.top` subdomain
- **StationDock Compatible**: HEAD request support for stream monitoring
- **Legacy Support**: Direct Icecast URLs on port 8100 still available
- **Secure Status Page**: Access Icecast status via HTTPS at `/icecast-status`

### 🔗 StationDock Integration (NEW)
- **Stream Monitoring**: Works with StationDock's real-time stream health checks
- **Automated Recording**: Streams can be recorded by StationDock
- **Shared Architecture**: Part of the SuperSoul Radio Suite

## 🛠 Tech Stack

| Frontend | Backend | Deployment |
|----------|---------|------------|
| React 19 | Node.js/Express | Docker |
| Vite | SQLite | Coolify |
| Tailwind CSS v4 | REST API | |
| Lucide React | http-proxy | |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Development

```bash
# Install dependencies
npm install

# Start both frontend and backend
npm run dev:all
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Docker Deployment

```bash
# Build Docker image
docker build -t streamdock .

# Run container
docker run -p 3000:3000 -p 8100:8100 streamdock
```

## 📁 Project Structure

```
├── server/
│   ├── index.js         # Express API server
│   └── db.js            # SQLite database layer
├── src/
│   ├── components/ui/   # Reusable UI components
│   ├── pages/           # Page components
│   │   ├── Dashboard.jsx
│   │   ├── CreateStation.jsx
│   │   └── Stations.jsx
│   └── App.jsx          # Main app with routing
├── public/
│   ├── features.html    # Public features page
│   ├── header.png       # StreamDock logo
│   └── icon.png         # Favicon
├── Dockerfile           # Production Docker config
└── package.json
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stations` | List all stations |
| GET | `/api/stations/:id` | Get station details |
| POST | `/api/stations` | Create new station |
| PUT | `/api/stations/:id` | Update station |
| DELETE | `/api/stations/:id` | Delete station |
| GET | `/api/alerts` | List all alerts |
| GET | `/api/alerts/unread-count` | Get unread alert count |
| POST | `/api/alerts/:id/read` | Mark alert as read |
| GET | `/api/health` | Health check |
| GET | `/icecast-status` | Secure Icecast status page |
| GET | `/icecast-status.json` | Icecast status as JSON |
| GET | `/stream/:mount` | Proxy stream via HTTPS |
| HEAD | `/stream/:mount` | Stream health check |

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ICECAST_HOST` | `127.0.0.1` | Internal Icecast hostname |
| `ICECAST_PORT` | `8100` | Internal Icecast port |
| `ICECAST_PUBLIC_HOST` | `icecast.supersoul.top` | Public hostname for encoder connections |
| `STREAM_HOST` | `stream.supersoul.top` | HTTPS stream subdomain |
| `PORT` | `3000` | API server port |
| `DATABASE_PATH` | `/app/data/stations.db` | SQLite database path |

## 📻 Connecting Your Encoder

Use these settings in BUTT, Mixxx, OBS, or other streaming software:

| Setting | Value |
|---------|-------|
| **Server** | `icecast.supersoul.top` |
| **Port** | `8100` |
| **Mount** | `/your-mount-point` |
| **Password** | (from station card) |
| **Format** | MP3 or AAC |
| **Bitrate** | 64-320 kbps |

## 🔗 Stream URLs

| Type | URL | Use Case |
|------|-----|----------|
| **Secure (HTTPS)** | `https://stream.supersoul.top/mount` | Web browsers, StationDock |
| **Direct (HTTP)** | `http://icecast.supersoul.top:8100/mount` | Encoders, legacy players |
| **Status Page** | `https://icecast.supersoul.top/icecast-status` | Debugging |

## 📄 License

MIT License

---

*Part of the [SuperSoul Radio Suite](https://radio.supersoul.top)*
