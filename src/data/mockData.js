export const PRODUCTION_HOST = "icecast.supersoul.top";

export const servers = [
  {
    id: "srv_001",
    name: "Production Server",
    status: "online",
    hostname: "icecast.supersoul.top",
    port: 8000,
    listeners: 42,
    maxListeners: 500,
    bandwidth: "1.2 MB/s",
    uptime: "5d 3h 12m",
    cpu: 24,
    memory: 38,
    region: "Production",
    ssl: true,
    mountPoints: ["mount_001", "mount_002"]
  }
];

export const getNextPort = () => {
  const usedPorts = servers.map(s => s.port);
  let port = 8000;
  while (usedPorts.includes(port)) {
    port += 1;
  }
  return port;
};

export const mountPoints = [
  {
    id: "mount_001",
    serverId: "srv_001",
    name: "/live",
    format: "MP3",
    bitrate: 128,
    sampleRate: 44100,
    channels: 2,
    listeners: 28,
    maxListeners: 250,
    sourceConnected: true,
    sourceIP: "127.0.0.1",
    genre: "Music",
    description: "Main live stream",
    public: true,
    metadata: {
      title: "Now Playing",
      artist: "Live Stream"
    }
  },
  {
    id: "mount_002",
    serverId: "srv_001",
    name: "/hifi",
    format: "AAC",
    bitrate: 256,
    sampleRate: 48000,
    channels: 2,
    listeners: 14,
    maxListeners: 250,
    sourceConnected: true,
    sourceIP: "127.0.0.1",
    genre: "Music",
    description: "High quality stream",
    public: true,
    metadata: {
      title: "Now Playing",
      artist: "Live Stream"
    }
  }
];

export const listenerHistory = [
  { time: "00:00", listeners: 320, bandwidth: 1.8 },
  { time: "02:00", listeners: 180, bandwidth: 1.0 },
  { time: "04:00", listeners: 95, bandwidth: 0.5 },
  { time: "06:00", listeners: 150, bandwidth: 0.8 },
  { time: "08:00", listeners: 380, bandwidth: 2.1 },
  { time: "10:00", listeners: 520, bandwidth: 2.9 },
  { time: "12:00", listeners: 610, bandwidth: 3.4 },
  { time: "14:00", listeners: 580, bandwidth: 3.2 },
  { time: "16:00", listeners: 490, bandwidth: 2.7 },
  { time: "18:00", listeners: 620, bandwidth: 3.5 },
  { time: "20:00", listeners: 750, bandwidth: 4.2 },
  { time: "22:00", listeners: 680, bandwidth: 3.8 },
  { time: "Now", listeners: 432, bandwidth: 2.4 }
];

export const weeklyStats = [
  { day: "Mon", listeners: 12400, peakListeners: 890 },
  { day: "Tue", listeners: 14200, peakListeners: 920 },
  { day: "Wed", listeners: 13800, peakListeners: 875 },
  { day: "Thu", listeners: 15600, peakListeners: 1050 },
  { day: "Fri", listeners: 18200, peakListeners: 1180 },
  { day: "Sat", listeners: 22400, peakListeners: 1420 },
  { day: "Sun", listeners: 19800, peakListeners: 1280 }
];

export const geoData = [
  { country: "United States", listeners: 245, percentage: 35 },
  { country: "United Kingdom", listeners: 98, percentage: 14 },
  { country: "Germany", listeners: 76, percentage: 11 },
  { country: "Canada", listeners: 54, percentage: 8 },
  { country: "Australia", listeners: 43, percentage: 6 },
  { country: "France", listeners: 38, percentage: 5 },
  { country: "Netherlands", listeners: 32, percentage: 5 },
  { country: "Other", listeners: 114, percentage: 16 }
];

export const userAgents = [
  { name: "VLC Media Player", count: 156, percentage: 36 },
  { name: "Chrome Browser", count: 98, percentage: 23 },
  { name: "iTunes/Apple Music", count: 67, percentage: 16 },
  { name: "Winamp", count: 45, percentage: 10 },
  { name: "Firefox Browser", count: 34, percentage: 8 },
  { name: "Other", count: 32, percentage: 7 }
];

export const alerts = [
  {
    id: "alert_001",
    type: "warning",
    title: "High CPU Usage",
    message: "Podcast Server CPU usage at 78%",
    server: "srv_003",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    read: false
  },
  {
    id: "alert_002",
    type: "error",
    title: "Source Disconnected",
    message: "Mount point /live-talk lost source connection",
    server: "srv_003",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    read: false
  },
  {
    id: "alert_003",
    type: "info",
    title: "Listener Milestone",
    message: "Main Radio Server reached 400+ concurrent listeners",
    server: "srv_001",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    read: true
  },
  {
    id: "alert_004",
    type: "warning",
    title: "Memory Usage High",
    message: "Podcast Server memory usage at 85%",
    server: "srv_003",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    read: true
  },
  {
    id: "alert_005",
    type: "success",
    title: "SSL Certificate Renewed",
    message: "Certificate for stream.example.com renewed successfully",
    server: "srv_001",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    read: true
  }
];

export const logs = [
  { id: 1, timestamp: "2024-01-15 22:45:32", level: "INFO", source: "srv_001", message: "Client connected from 192.168.1.50 to /live" },
  { id: 2, timestamp: "2024-01-15 22:45:28", level: "INFO", source: "srv_001", message: "Metadata updated: Luna Wave - Midnight Dreams" },
  { id: 3, timestamp: "2024-01-15 22:44:15", level: "WARN", source: "srv_003", message: "CPU usage exceeded 75% threshold" },
  { id: 4, timestamp: "2024-01-15 22:43:52", level: "INFO", source: "srv_002", message: "Relay connection established to backup.example.com" },
  { id: 5, timestamp: "2024-01-15 22:42:30", level: "ERROR", source: "srv_003", message: "Source disconnected from /live-talk" },
  { id: 6, timestamp: "2024-01-15 22:41:18", level: "INFO", source: "srv_001", message: "Client disconnected from /hifi (duration: 45m 23s)" },
  { id: 7, timestamp: "2024-01-15 22:40:05", level: "INFO", source: "srv_001", message: "New source connected to /live from 192.168.1.100" },
  { id: 8, timestamp: "2024-01-15 22:38:44", level: "WARN", source: "srv_003", message: "Memory usage at 85%" },
  { id: 9, timestamp: "2024-01-15 22:37:22", level: "INFO", source: "srv_001", message: "Client connected from 10.0.0.25 to /lofi" },
  { id: 10, timestamp: "2024-01-15 22:35:11", level: "INFO", source: "srv_002", message: "SSL certificate verified successfully" },
  { id: 11, timestamp: "2024-01-15 22:34:00", level: "ERROR", source: "srv_004", message: "Server failed to start: port 8000 already in use" },
  { id: 12, timestamp: "2024-01-15 22:32:45", level: "INFO", source: "srv_001", message: "Listener count: 432 active connections" },
  { id: 13, timestamp: "2024-01-15 22:30:18", level: "INFO", source: "srv_003", message: "Podcast episode started: Episode 142" },
  { id: 14, timestamp: "2024-01-15 22:28:55", level: "WARN", source: "srv_001", message: "Bandwidth usage approaching 80% of limit" },
  { id: 15, timestamp: "2024-01-15 22:25:30", level: "INFO", source: "srv_001", message: "Authentication successful for source encoder" }
];

export const serverTemplates = [
  {
    id: "tpl_radio",
    name: "Internet Radio",
    description: "Perfect for 24/7 music streaming with multiple quality options",
    icon: "Radio",
    config: {
      maxListeners: 500,
      mountPoints: [
        { name: "/live", format: "MP3", bitrate: 128 },
        { name: "/hifi", format: "AAC", bitrate: 256 },
        { name: "/lofi", format: "MP3", bitrate: 64 }
      ]
    }
  },
  {
    id: "tpl_podcast",
    name: "Podcast Streaming",
    description: "Optimized for talk shows and podcast content",
    icon: "Mic",
    config: {
      maxListeners: 200,
      mountPoints: [
        { name: "/podcast", format: "MP3", bitrate: 96 }
      ]
    }
  },
  {
    id: "tpl_event",
    name: "Live Event",
    description: "High-capacity streaming for concerts and live events",
    icon: "Calendar",
    config: {
      maxListeners: 2000,
      mountPoints: [
        { name: "/event", format: "AAC", bitrate: 192 },
        { name: "/event-mobile", format: "MP3", bitrate: 96 }
      ]
    }
  },
  {
    id: "tpl_relay",
    name: "Relay Server",
    description: "Distribute streams across multiple geographic regions",
    icon: "Share2",
    config: {
      maxListeners: 1000,
      mountPoints: [
        { name: "/relay", format: "MP3", bitrate: 128 }
      ]
    }
  }
];

export const alertRules = [
  {
    id: "rule_001",
    name: "High CPU Alert",
    condition: "cpu_usage > 75",
    severity: "warning",
    enabled: true,
    channels: ["email", "in-app"]
  },
  {
    id: "rule_002",
    name: "Source Disconnect",
    condition: "source_disconnected",
    severity: "error",
    enabled: true,
    channels: ["email", "sms", "in-app"]
  },
  {
    id: "rule_003",
    name: "Listener Threshold",
    condition: "listeners > 90%",
    severity: "warning",
    enabled: true,
    channels: ["in-app"]
  },
  {
    id: "rule_004",
    name: "Server Offline",
    condition: "server_offline",
    severity: "critical",
    enabled: true,
    channels: ["email", "sms", "webhook", "in-app"]
  },
  {
    id: "rule_005",
    name: "Memory Warning",
    condition: "memory_usage > 80",
    severity: "warning",
    enabled: false,
    channels: ["email"]
  }
];
