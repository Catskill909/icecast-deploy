# IceCast Pro - Station Management Dashboard

A modern Icecast streaming server management interface with a clean dark-mode UI. Create stations, manage connection credentials, and monitor live streams.

**Production URL:** https://icecast.supersoul.top

## ✨ Features

### � Station Creation Wizard
- **3-Step Setup**: Create new radio stations with a guided wizard
- **Auto-Generated Credentials**: Secure passwords and mount points created automatically
- **Copy-to-Clipboard**: One-click copy for all connection details
- **Format Options**: MP3 or AAC with quality presets (Low/Standard/High)

### 🎯 Station Management
- **Station Cards**: View all your stations at a glance
- **Connection Info**: Server, port, mount point, and password display
- **Password Toggle**: Show/hide source passwords securely
- **Delete Stations**: Remove stations with confirmation modal

### � Live Status Detection
- **Real-Time Polling**: Checks Icecast server every 5 seconds
- **LIVE Badge**: Animated pulsing indicator when streaming
- **Listener Count**: Shows current listeners per station
- **Visual Highlights**: Green ring around active stations

### 🎧 Built-in Audio Player
- **Listen Button**: One-click playback of live streams
- **Play/Pause Controls**: Toggle stream audio in-browser
- **Auto-Stop**: Stops playback when station goes offline

### 📊 Dashboard
- **Station Overview**: Quick stats on active vs total stations
- **Server Status**: Online/offline indicator
- **Quick Start Guide**: Step-by-step onboarding for new users

## 🛠 Tech Stack

| Frontend | Backend | Deployment |
|----------|---------|------------|
| React 19 | Node.js/Express | Docker |
| Vite | SQLite | Coolify |
| Tailwind CSS v4 | REST API | |
| Lucide React | | |

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
docker build -t icecast-pro .

# Run container
docker run -p 3000:3000 icecast-pro
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
├── Dockerfile           # Production Docker config
└── package.json
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stations` | List all stations |
| GET | `/api/stations/:id` | Get station details |
| POST | `/api/stations` | Create new station |
| DELETE | `/api/stations/:id` | Delete station |
| GET | `/api/icecast-status` | Get live stream status |
| GET | `/api/health` | Health check |

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ICECAST_HOST` | `icecast.supersoul.top` | Icecast server hostname |
| `ICECAST_PORT` | `8000` | Icecast server port |
| `PORT` | `3001` | API server port |
| `DATABASE_PATH` | `server/stations.db` | SQLite database path |

## 📻 Connecting Your Encoder

Use these settings in BUTT, ReaCast, OBS, or other streaming software:

| Setting | Value |
|---------|-------|
| **Host:port** | `icecast.supersoul.top:8000/your-mount-point` |
| **Password** | (from station card) |
| **Format** | MP3 or AAC |
| **Bitrate** | 64-320 kbps |

## 📄 License

MIT License
