# IceCast Pro - Deployment & Monitoring Service

A modern Icecast streaming server management interface with a clean dark-mode UI.

**Production URL:** https://icecast.supersoul.top

## Features

### 🚀 Server Deployment
- **Quick Deploy**: One-click Icecast server deployment with intelligent defaults
- **Custom Configuration**: Advanced configuration editor for experienced users
- **Multiple Server Support**: Manage multiple Icecast instances from one dashboard
- **Server Templates**: Pre-configured templates for podcasting, radio, music streaming, and live events

### 📡 Mount Point Management
- Visual interface to create/edit/delete mount points
- Configure codecs (MP3, AAC, Opus, Vorbis) and bitrates
- Stream metadata and ICY protocol options
- Listener limits and connection settings

### 📊 Real-Time Monitoring
- Live listener count (total and per mount point)
- Bandwidth usage (real-time and historical)
- Server resource usage (CPU, RAM, network)
- Stream quality metrics
- Geographic listener distribution
- User agent statistics

### 🔔 Alert System
- Real-time notifications for server issues
- Source disconnection alerts
- Threshold-based alerts
- Multiple notification channels (email, SMS, webhooks, in-app)
- Custom alert rules

### 📝 Log Management
- Real-time log streaming
- Log filtering and search
- Error highlighting
- Downloadable log archives

### 🔒 Security
- SSL/TLS certificate management
- IP whitelisting/blacklisting
- DDoS protection settings
- Source authentication management
- Two-factor authentication support

### 🎵 Stream Player
- Built-in audio player for testing streams
- Preview any active mount point
- Encoder connection information

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool
- **Tailwind CSS v4** - Styling
- **Recharts** - Data visualization
- **Lucide React** - Icons
- **React Router** - Navigation

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── Layout/          # Sidebar, Header, Layout
│   └── ui/              # Reusable UI components
├── data/
│   └── mockData.js      # Mock data for demo
├── pages/               # Page components
├── App.jsx              # Main app with routing
├── index.css            # Global styles + Tailwind
└── main.jsx             # Entry point
```

## License

MIT License
