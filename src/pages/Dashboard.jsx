import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Radio, Users, Wifi, Plus, ExternalLink, Headphones, Activity } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';

const API_URL = import.meta.env.VITE_API_URL || '';

function StatCard({ icon: Icon, label, value, color = 'blue' }) {
  const colors = {
    blue: 'bg-[#4b7baf]/10 text-[#4b7baf]',
    green: 'bg-[#4ade80]/10 text-[#4ade80]',
    teal: 'bg-[#4a9b9f]/10 text-[#4a9b9f]'
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${colors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-sm text-[#8896ab]">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StationQuickCard({ station, isLive, listeners }) {
  return (
    <div className={`group relative p-4 rounded-xl border transition-all duration-300 ${isLive
        ? 'bg-gradient-to-br from-[#0d1229] to-[#0f1633] border-[#4ade80]/30 shadow-[0_0_15px_rgba(74,222,128,0.1)]'
        : 'bg-[#0d1229] border-[#1e2337] hover:border-[#2d3555]'
      }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isLive ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-[#1e2337] text-[#64748b]'
            }`}>
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white block">{station.name}</span>
            <span className="text-xs text-[#64748b] font-mono">{station.mountPoint}</span>
          </div>
        </div>

        {isLive ? (
          <div className="flex flex-col items-end gap-1">
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#4ade80]/10 text-[#4ade80] text-[10px] font-bold uppercase tracking-wider rounded-full border border-[#4ade80]/20 animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
              ON AIR
            </span>
            <span className="flex items-center gap-1 text-xs text-[#8896ab]">
              <Headphones className="w-3 h-3" />
              {listeners}
            </span>
          </div>
        ) : (
          <span className="px-2 py-0.5 bg-[#1e2337] text-[#64748b] text-[10px] font-bold uppercase tracking-wider rounded-full border border-[#2a3044]">
            OFFLINE
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[#1e2337]/50">
        <span className="text-xs text-[#8896ab] flex items-center gap-1.5">
          <Activity className="w-3 h-3" />
          {station.bitrate}kbps • {station.format}
        </span>
        <Link to="/servers" className="text-xs font-medium text-[#4b7baf] hover:text-[#6b9fd4] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          Manage <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveStatus, setLiveStatus] = useState({ mounts: [] });

  const fetchStations = async () => {
    try {
      const res = await fetch(`${API_URL}/api/stations`);
      const data = await res.json();
      setStations(data);
    } catch (err) {
      console.error('Error fetching stations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/icecast-status`);
      const data = await res.json();
      setLiveStatus(data);
    } catch (err) {
      console.error('Error fetching live status:', err);
    }
  };

  useEffect(() => {
    fetchStations();
    fetchLiveStatus();
    const interval = setInterval(fetchLiveStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStationStatus = (mount) => {
    const cleanMount = mount.startsWith('/') ? mount.substring(1) : mount;
    const source = liveStatus.mounts.find(m =>
      m.mount === mount || m.mount === cleanMount || m.mount === `/${cleanMount}`
    );
    return {
      isLive: !!source,
      listeners: source ? (source.listeners || 0) : 0
    };
  };

  // Calculate real active stats
  const activeStreamCount = stations.filter(s => getStationStatus(s.mountPoint).isLive).length;
  const totalListeners = stations.reduce((acc, s) => acc + getStationStatus(s.mountPoint).listeners, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-1 text-white">Dashboard</h1>
          <p className="text-[#8896ab] mt-1">Real-time station monitoring</p>
        </div>
        <Link to="/create">
          <Button icon={Plus}>New Station</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={Radio}
          label="Stations On Air"
          value={activeStreamCount}
          color={activeStreamCount > 0 ? "green" : "blue"}
        />
        <StatCard
          icon={Headphones}
          label="Total Listeners"
          value={totalListeners}
          color="blue"
        />
        <StatCard
          icon={Wifi}
          label="Server Status"
          value="Online"
          color="teal"
        />
      </div>

      {/* Stations Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="heading-2 text-white">Your Stations</h2>
            <Link to="/servers" className="text-sm text-[#4b7baf] hover:text-[#6b9fd4]">
              Manage All
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#64748b]">
              <div className="w-8 h-8 border-2 border-[#4b7baf] border-t-transparent rounded-full animate-spin mb-4" />
              <p>Loading station data...</p>
            </div>
          ) : stations.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-[#1e2337] rounded-xl">
              <Radio className="w-12 h-12 text-[#64748b] mx-auto mb-4" />
              <h3 className="font-heading font-bold text-white mb-2">No stations yet</h3>
              <p className="text-[#8896ab] mb-6">Create your first radio station to get started</p>
              <Link to="/create">
                <Button icon={Plus}>Create Station</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stations.slice(0, 6).map(station => {
                const { isLive, listeners } = getStationStatus(station.mountPoint);
                return (
                  <StationQuickCard
                    key={station.id}
                    station={station}
                    isLive={isLive}
                    listeners={listeners}
                  />
                );
              })}
            </div>
          )}

          {stations.length > 6 && (
            <div className="text-center mt-6">
              <Link to="/servers" className="text-sm text-[#4b7baf] hover:text-[#6b9fd4]">
                View all {stations.length} stations →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Start Guide */}
      <Card>
        <CardContent className="p-6">
          <h2 className="heading-2 text-white mb-4">Quick Start</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#4b7baf]/20 text-[#4b7baf] flex items-center justify-center font-bold flex-shrink-0">1</div>
              <div>
                <h3 className="font-medium text-white mb-1">Create Station</h3>
                <p className="text-sm text-[#8896ab]">Set up your radio stream with a few clicks</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#4b7baf]/20 text-[#4b7baf] flex items-center justify-center font-bold flex-shrink-0">2</div>
              <div>
                <h3 className="font-medium text-white mb-1">Get Connection Info</h3>
                <p className="text-sm text-[#8896ab]">Copy server, port, mount point & password</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#4b7baf]/20 text-[#4b7baf] flex items-center justify-center font-bold flex-shrink-0">3</div>
              <div>
                <h3 className="font-medium text-white mb-1">Start Streaming</h3>
                <p className="text-sm text-[#8896ab]">Connect with Mixxx, BUTT, or OBS</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
