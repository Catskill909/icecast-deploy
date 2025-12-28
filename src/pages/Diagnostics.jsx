import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { RefreshCw, Server, Radio, Rss, Database, AlertTriangle, CheckCircle, XCircle, Download, Trash2, Search, PauseCircle, PlayCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function Diagnostics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(null);

    // Log viewer controls
    const [logSearch, setLogSearch] = useState('');
    const [logLevelFilter, setLogLevelFilter] = useState('all');
    const [autoScroll, setAutoScroll] = useState(true);
    const logContainerRef = useRef(null);

    const fetchDiagnostics = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/diagnostics`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            setData(result);
            setError(null);
            setLastRefresh(new Date().toLocaleTimeString());

            // Auto-scroll to bottom if enabled
            if (autoScroll && logContainerRef.current) {
                setTimeout(() => {
                    logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
                }, 100);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDiagnostics();
        // Auto-refresh every 5 seconds
        const interval = setInterval(fetchDiagnostics, 5000);
        return () => clearInterval(interval);
    }, []);

    const StatusBadge = ({ ok, label }) => (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
            {ok ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {label}
        </span>
    );

    // Filter logs
    const filteredLogs = (data?.recentLogs || []).filter(log => {
        // Level filter
        if (logLevelFilter !== 'all') {
            if (!log.includes(`[${logLevelFilter}]`)) return false;
        }
        // Search filter
        if (logSearch && !log.toLowerCase().includes(logSearch.toLowerCase())) {
            return false;
        }
        return true;
    });

    // Download logs
    const handleDownloadLogs = () => {
        const content = (data?.recentLogs || []).join('\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `streamdock-logs-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Clear logs
    const handleClearLogs = async () => {
        if (!confirm('Clear all logs? This cannot be undone.')) return;

        try {
            const response = await fetch(`${API_URL}/api/diagnostics/clear-logs`, {
                method: 'POST',
                credentials: 'include'
            });
            if (response.ok) {
                await fetchDiagnostics();
            }
        } catch (err) {
            console.error('Failed to clear logs:', err);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">System Diagnostics</h1>
                    <p className="text-[#64748b] text-sm">
                        Last refresh: {lastRefresh || 'Loading...'}
                    </p>
                </div>
                <Button
                    onClick={fetchDiagnostics}
                    disabled={loading}
                    variant="outline"
                    className="flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-red-400">
                        <AlertTriangle className="w-5 h-5" />
                        <span>Error: {error}</span>
                    </div>
                </div>
            )}

            {data && (
                <div className="grid gap-6">
                    {/* Server Status */}
                    <Card className="bg-[#0f1729] border-[#1e2a45]">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Server className="w-5 h-5 text-[#4b7baf]" />
                                Server Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <div className="text-[#64748b] text-sm">Icecast</div>
                                    <StatusBadge ok={data.icecast?.connected} label={data.icecast?.connected ? 'Connected' : 'Disconnected'} />
                                </div>
                                <div>
                                    <div className="text-[#64748b] text-sm">Active Mounts</div>
                                    <div className="text-white font-mono">{data.icecast?.activeMounts || 0}</div>
                                </div>
                                <div>
                                    <div className="text-[#64748b] text-sm">Total Listeners</div>
                                    <div className="text-white font-mono">{data.icecast?.totalListeners || 0}</div>
                                </div>
                                <div>
                                    <div className="text-[#64748b] text-sm">Uptime</div>
                                    <div className="text-white font-mono text-sm">{data.server?.uptime || 'N/A'}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stations & Relay Config */}
                    <Card className="bg-[#0f1729] border-[#1e2a45]">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Radio className="w-5 h-5 text-[#4b7baf]" />
                                Stations & Relay Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-[#64748b] border-b border-[#1e2a45]">
                                            <th className="text-left py-2">Station</th>
                                            <th className="text-left py-2">Mount</th>
                                            <th className="text-left py-2">Live</th>
                                            <th className="text-left py-2">Relay Enabled</th>
                                            <th className="text-left py-2">Relay Mode</th>
                                            <th className="text-left py-2">AutoDJ</th>
                                            <th className="text-left py-2">Playlist</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.stations?.map(station => (
                                            <tr key={station.id} className="border-b border-[#1e2a45]/50">
                                                <td className="py-2 text-white">{station.name}</td>
                                                <td className="py-2 font-mono text-[#4b7baf]">{station.mount_point}</td>
                                                <td className="py-2">
                                                    <StatusBadge ok={station.isLive} label={station.isLive ? 'LIVE' : 'OFF'} />
                                                </td>
                                                <td className="py-2">
                                                    <span className={station.relay_enabled ? 'text-green-400' : 'text-[#64748b]'}>
                                                        {station.relay_enabled ? 'YES' : 'NO'}
                                                    </span>
                                                </td>
                                                <td className="py-2 text-white">{station.relay_mode || '-'}</td>
                                                <td className="py-2">
                                                    <span className={station.autodj_enabled ? 'text-[#9333ea]' : 'text-[#64748b]'}>
                                                        {station.autodj_enabled ? 'YES' : 'NO'}
                                                    </span>
                                                </td>
                                                <td className="py-2 text-[#64748b] text-xs">
                                                    {station.autodj_enabled && station.autodj_playlist_id
                                                        ? `Playlist ${station.autodj_playlist_id} (${station.autodj_mode})`
                                                        : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Active Relays */}
                    <Card className="bg-[#0f1729] border-[#1e2a45]">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Rss className="w-5 h-5 text-[#f59e0b]" />
                                Active Relays
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {data.activeRelays?.length > 0 ? (
                                <div className="space-y-2">
                                    {data.activeRelays.map((relay, i) => (
                                        <div key={i} className="bg-[#1a2744] rounded p-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-white font-medium">{relay.stationId}</span>
                                                    <span className="text-[#64748b] ml-2">→ {relay.mountPoint}</span>
                                                </div>
                                                <StatusBadge ok={relay.status === 'running'} label={relay.status} />
                                            </div>
                                            <div className="text-xs text-[#64748b] mt-1">
                                                URL: {relay.url}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-[#64748b] text-center py-4">
                                    No active relays
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Enhanced Logs Viewer */}
                    <Card className="bg-[#0f1729] border-[#1e2a45]">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <Database className="w-5 h-5 text-[#4b7baf]" />
                                    Debug Logs
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => setAutoScroll(!autoScroll)}
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs"
                                    >
                                        {autoScroll ? (
                                            <>
                                                <PauseCircle className="w-3 h-3 mr-1" />
                                                Auto-scroll ON
                                            </>
                                        ) : (
                                            <>
                                                <PlayCircle className="w-3 h-3 mr-1" />
                                                Auto-scroll OFF
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        onClick={handleDownloadLogs}
                                        variant="secondary"
                                        size="sm"
                                        disabled={!data?.recentLogs?.length}
                                    >
                                        <Download className="w-4 h-4 mr-1" />
                                        Download
                                    </Button>
                                    <Button
                                        onClick={handleClearLogs}
                                        variant="danger"
                                        size="sm"
                                        disabled={!data?.recentLogs?.length}
                                    >
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Clear
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Filter Controls */}
                            <div className="mb-3 flex gap-3">
                                {/* Search */}
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
                                    <input
                                        type="text"
                                        placeholder="Search logs..."
                                        value={logSearch}
                                        onChange={(e) => setLogSearch(e.target.value)}
                                        className="w-full bg-[#0a0e17] border border-[#1e2a45] rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#4b7baf]"
                                    />
                                </div>

                                {/* Level Filter */}
                                <div className="flex items-center gap-1">
                                    {['all', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'RELAY', 'FALLBACK'].map((level) => (
                                        <button
                                            key={level}
                                            onClick={() => setLogLevelFilter(level)}
                                            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${logLevelFilter === level
                                                ? level === 'ERROR'
                                                    ? 'bg-red-400/20 text-red-400'
                                                    : level === 'WARN'
                                                        ? 'bg-yellow-400/20 text-yellow-400'
                                                        : level === 'RELAY'
                                                            ? 'bg-green-400/20 text-green-400'
                                                            : level === 'FALLBACK'
                                                                ? 'bg-orange-400/20 text-orange-400'
                                                                : level === 'DEBUG'
                                                                    ? 'bg-blue-400/20 text-blue-400'
                                                                    : 'bg-[#4b7baf] text-white'
                                                : 'bg-[#1e2a45] text-[#64748b] hover:text-white'
                                                }`}
                                        >
                                            {level === 'all' ? 'All' : level}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Log Count */}
                            <div className="mb-2 text-xs text-[#64748b]">
                                Showing {filteredLogs.length} of {data?.recentLogs?.length || 0} entries
                            </div>

                            {/* Log Display */}
                            <div
                                ref={logContainerRef}
                                className="bg-[#0a0e17] rounded p-3 font-mono text-xs max-h-[400px] overflow-y-auto"
                            >
                                {filteredLogs.length > 0 ? (
                                    filteredLogs.map((log, i) => (
                                        <div
                                            key={i}
                                            className={`py-1 flex gap-2 hover:bg-[#1a2744]/50 ${log.includes('[ERROR]') ? 'text-red-400' :
                                                log.includes('[FALLBACK]') ? 'text-[#f59e0b]' :
                                                    log.includes('[RELAY]') ? 'text-green-400' :
                                                        log.includes('[DEBUG]') ? 'text-blue-400' :
                                                            log.includes('[WARN]') ? 'text-yellow-400' :
                                                                'text-[#94a3b8]'
                                                }`}
                                        >
                                            <span className="text-[#64748b] select-none w-8 text-right flex-shrink-0">
                                                {(data?.recentLogs?.length || 0) - (data?.recentLogs?.indexOf(log) || 0)}
                                            </span>
                                            <span className="flex-1">{log}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-[#64748b] text-center py-4">
                                        {logSearch || logLevelFilter !== 'all'
                                            ? 'No logs match your filters'
                                            : 'No recent logs'}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Icecast Config */}
                    <Card className="bg-[#0f1729] border-[#1e2a45]">
                        <CardHeader>
                            <CardTitle className="text-white">Generated Icecast Config (Mount Sections)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-[#0a0e17] rounded p-3 font-mono text-xs text-[#94a3b8] max-h-[200px] overflow-y-auto">
                                {data.icecastConfig || 'Not available'}
                            </pre>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
