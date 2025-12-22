import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Radio, Users, Wifi, Plus, ExternalLink } from 'lucide-react';
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

function StationQuickCard({ station }) {
  return (
    <div className="p-4 rounded-lg bg-[#0d1229] border border-[#1e2337] hover:border-[#2d3555] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#4b7baf]" />
          <span className="font-medium text-white">{station.name}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${station.status === 'active'
          ? 'bg-[#4ade80]/10 text-[#4ade80]'
          : 'bg-[#f87171]/10 text-[#f87171]'
          }`}>
          {station.status}
        </span>
      </div>
      <p className="text-sm text-[#64748b] font-mono mb-2">{station.mountPoint}</p>
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#8896ab]">{station.format} • {station.bitrate}kbps</span>
        <Link to="/servers" className="text-[#4b7baf] hover:text-[#6b9fd4] flex items-center gap-1">
          View <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/stations`)
      .then(res => res.json())
      .then(data => {
        setStations(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching stations:', err);
        setLoading(false);
      });
  }, []);

  const activeStations = stations.filter(s => s.status === 'active').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-1 text-white">Dashboard</h1>
          <p className="text-[#8896ab] mt-1">StreamDock station management</p>
        </div>
        <Link to="/create">
          <Button icon={Plus}>New Station</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={Radio}
          label="Active Stations"
          value={activeStations}
          color="green"
        />
        <StatCard
          icon={Users}
          label="Total Stations"
          value={stations.length}
          color="blue"
        />
        <StatCard
          icon={Wifi}
          label="Server"
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
            <div className="text-center py-8 text-[#64748b]">Loading stations...</div>
          ) : stations.length === 0 ? (
            <div className="text-center py-12">
              <Radio className="w-12 h-12 text-[#64748b] mx-auto mb-4" />
              <h3 className="font-heading font-bold text-white mb-2">No stations yet</h3>
              <p className="text-[#8896ab] mb-6">Create your first radio station to get started</p>
              <Link to="/create">
                <Button icon={Plus}>Create Station</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stations.slice(0, 6).map(station => (
                <StationQuickCard key={station.id} station={station} />
              ))}
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
                <p className="text-sm text-[#8896ab]">Connect with BUTT, OBS, or StationDock</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
