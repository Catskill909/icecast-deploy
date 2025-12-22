import { useState, useEffect } from 'react';
import { Users, Wifi, Activity, Clock } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { Card, CardContent } from '../components/ui/Card';
import { servers, mountPoints, listenerHistory, weeklyStats } from '../data/mockData';

function StatCard({ icon: Icon, label, value, subtext }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-[#4b7baf]/10">
            <Icon className="w-5 h-5 text-[#4b7baf]" />
          </div>
          <div>
            <p className="text-2xl font-semibold text-white">{value}</p>
            <p className="text-sm text-[#8896ab]">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1e2337] border border-[#2d3555] rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs text-[#8896ab]">{label}</p>
        <p className="text-sm font-medium text-white">{payload[0].value}</p>
      </div>
    );
  }
  return null;
}

export default function Monitoring() {
  const [liveData, setLiveData] = useState(listenerHistory);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveData(prev => {
        const newData = [...prev];
        const lastValue = newData[newData.length - 1];
        const variation = Math.floor(Math.random() * 30) - 15;
        newData[newData.length - 1] = {
          ...lastValue,
          listeners: Math.max(0, lastValue.listeners + variation),
        };
        return newData;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const totalListeners = servers.reduce((acc, s) => acc + s.listeners, 0);
  const totalBandwidth = servers.reduce((acc, s) => acc + parseFloat(s.bandwidth), 0).toFixed(1);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="heading-1 text-white">Monitoring</h1>
        <p className="text-[#8896ab] mt-2">Real-time analytics and metrics</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard icon={Users} label="Total Listeners" value={totalListeners} />
        <StatCard icon={Wifi} label="Bandwidth" value={`${totalBandwidth} MB/s`} />
        <StatCard icon={Activity} label="Active Streams" value={mountPoints.filter(m => m.sourceConnected).length} />
        <StatCard icon={Clock} label="Avg. Uptime" value="99.7%" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="heading-2 text-white">Listener Activity (24h)</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
                <span className="text-xs text-[#64748b]">Live</span>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={liveData}>
                  <defs>
                    <linearGradient id="listenerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4b7baf" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4b7baf" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="listeners" stroke="#4b7baf" strokeWidth={2} fill="url(#listenerGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="heading-2 text-white mb-6">Weekly Peak Listeners</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyStats}>
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="peakListeners" fill="#4b7baf" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mount Point Stats */}
      <Card>
        <CardContent className="p-6">
          <h2 className="heading-2 text-white mb-6">Mount Point Status</h2>
          <div className="space-y-4">
            {mountPoints.map((mount) => {
              const server = servers.find(s => s.id === mount.serverId);
              const percentage = (mount.listeners / mount.maxListeners) * 100;

              return (
                <div key={mount.id} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-white">{mount.name}</span>
                        <span className="text-[#64748b] ml-2">({server?.name})</span>
                      </div>
                      <span className="text-sm text-[#8896ab]">{mount.listeners} listeners</span>
                    </div>
                    <div className="w-full bg-[#1e2337] rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${percentage > 80 ? 'bg-[#f87171]' : percentage > 60 ? 'bg-[#fbbf24]' : 'bg-[#4ade80]'
                          }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
