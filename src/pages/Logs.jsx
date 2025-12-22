import { useState, useEffect, useRef } from 'react';
import { FileText, Search, Download, Pause, Play } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { logs as initialLogs, servers } from '../data/mockData';

const levelColors = {
  INFO: 'text-[#4b7baf]',
  WARN: 'text-[#fbbf24]',
  ERROR: 'text-[#f87171]',
};

const levelBgColors = {
  INFO: 'bg-[#4b7baf]/10',
  WARN: 'bg-[#fbbf24]/10',
  ERROR: 'bg-[#f87171]/10',
};

function generateRandomLog() {
  const levels = ['INFO', 'INFO', 'INFO', 'WARN', 'ERROR'];
  const messages = [
    'Client connected to /live',
    'Metadata updated',
    'Client disconnected',
    'Source authenticated',
    'Connection timeout',
  ];
  const serverIds = servers.map(s => s.id);
  const level = levels[Math.floor(Math.random() * levels.length)];
  const message = messages[Math.floor(Math.random() * messages.length)];

  return {
    id: Date.now(),
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    level,
    source: serverIds[Math.floor(Math.random() * serverIds.length)],
    message,
  };
}

export default function Logs() {
  const [logList, setLogList] = useState(initialLogs);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [isLive, setIsLive] = useState(true);
  const logContainerRef = useRef(null);

  const filteredLogs = logList.filter(log => {
    if (levelFilter !== 'all' && log.level !== levelFilter) return false;
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setLogList(prev => [generateRandomLog(), ...prev].slice(0, 100));
    }, 2000);
    return () => clearInterval(interval);
  }, [isLive]);

  const handleDownload = () => {
    const content = filteredLogs
      .map(log => `${log.timestamp} [${log.level}] ${log.message}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-1 text-white">Logs</h1>
          <p className="text-[#8896ab] mt-2">Real-time log streaming</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isLive ? 'success' : 'secondary'}
            size="sm"
            icon={isLive ? Pause : Play}
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? 'Pause' : 'Resume'}
          </Button>
          <Button variant="secondary" size="sm" icon={Download} onClick={handleDownload}>
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
              <input
                type="text"
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0d1229] border border-[#1e2337] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#4b7baf]"
              />
            </div>
            <div className="flex items-center gap-1">
              {['all', 'INFO', 'WARN', 'ERROR'].map((level) => (
                <button
                  key={level}
                  onClick={() => setLevelFilter(level)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${levelFilter === level
                      ? level === 'all' ? 'bg-[#4b7baf] text-white' : `${levelBgColors[level]} ${levelColors[level]}`
                      : 'bg-[#1e2337] text-[#8896ab] hover:text-white'
                    }`}
                >
                  {level === 'all' ? 'All' : level}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Viewer */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2337]">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">Log Stream</span>
              {isLive && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
                  <span className="text-xs text-[#4ade80]">Live</span>
                </div>
              )}
            </div>
            <span className="text-xs text-[#64748b]">{filteredLogs.length} entries</span>
          </div>
          <div ref={logContainerRef} className="h-96 overflow-y-auto bg-[#0a0e27] font-mono text-sm">
            {filteredLogs.map((log) => {
              const server = servers.find(s => s.id === log.source);
              return (
                <div key={log.id} className="flex items-start gap-3 px-4 py-2 hover:bg-[#0d1229] border-b border-[#0d1229]">
                  <span className="text-[#64748b] whitespace-nowrap">{log.timestamp}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs ${levelBgColors[log.level]} ${levelColors[log.level]}`}>
                    {log.level}
                  </span>
                  <span className="text-[#4a9b9f] whitespace-nowrap">[{server?.name || log.source}]</span>
                  <span className={log.level === 'ERROR' ? 'text-[#f87171]' : 'text-[#8896ab]'}>{log.message}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
