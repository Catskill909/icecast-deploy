import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Radio, Plus, Copy, Check, Trash2, Eye, EyeOff, AlertTriangle, Play, Pause, Volume2, Headphones } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

const API_URL = import.meta.env.VITE_API_URL || '';

function StationCard({ station, onDelete, isLive = false, listeners = 0 }) {
    const [showPassword, setShowPassword] = useState(false);
    const [copiedField, setCopiedField] = useState(null);
    const [connectionInfo, setConnectionInfo] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);

    const handleCopy = (value, field) => {
        navigator.clipboard.writeText(value);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    useEffect(() => {
        fetch(`${API_URL}/api/stations/${station.id}`)
            .then(res => res.json())
            .then(data => setConnectionInfo(data.connectionInfo))
            .catch(err => console.error('Error fetching station details:', err));
    }, [station.id]);

    const togglePlay = () => {
        if (!audioRef.current || !connectionInfo) return;

        if (isPlaying) {
            audioRef.current.pause();
            audioRef.current.src = '';
            setIsPlaying(false);
        } else {
            audioRef.current.src = connectionInfo.streamUrl;
            audioRef.current.play().catch(err => console.error('Playback error:', err));
            setIsPlaying(true);
        }
    };

    // Stop playing if station goes offline
    useEffect(() => {
        if (!isLive && isPlaying && audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            setIsPlaying(false);
        }
    }, [isLive]);

    return (
        <Card className={isLive ? 'ring-2 ring-[#4ade80]/50' : ''}>
            <CardContent className="p-5">
                <audio ref={audioRef} />

                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isLive ? 'bg-[#4ade80]/10' : 'bg-[#4b7baf]/10'}`}>
                            <Radio className={`w-5 h-5 ${isLive ? 'text-[#4ade80]' : 'text-[#4b7baf]'}`} />
                        </div>
                        <div>
                            <h3 className="font-heading font-bold text-white">{station.name}</h3>
                            <p className="text-sm text-[#64748b]">{station.mountPoint}</p>
                        </div>
                    </div>
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                        {isLive ? (
                            <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 text-green-400 text-xs font-bold uppercase tracking-wider rounded-full border border-green-500/20 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.2)]">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                    ON AIR
                                </span>
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-[#0f1633] text-white text-xs font-medium rounded-full border border-[#2a3044] shadow-sm">
                                    <Headphones className="w-3 h-3 text-[#64748b]" />
                                    {listeners} Listening
                                </span>
                            </div>
                        ) : (
                            <span className="px-2.5 py-1 bg-[#1e2337] text-[#64748b] text-[10px] font-bold uppercase tracking-wider rounded-full border border-[#2a3044]">
                                OFFLINE
                            </span>
                        )}
                    </div>
                </div>

                {/* Listen Button - only show when live */}
                {isLive && connectionInfo && (
                    <button
                        onClick={togglePlay}
                        className={`w-full mb-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${isPlaying
                            ? 'bg-[#4b7baf] text-white'
                            : 'bg-[#4b7baf]/10 text-[#4b7baf] hover:bg-[#4b7baf]/20'
                            }`}
                    >
                        {isPlaying ? (
                            <>
                                <Pause className="w-4 h-4" />
                                <span>Stop Listening</span>
                                <Volume2 className="w-4 h-4 animate-pulse" />
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4" />
                                <span>Listen Now</span>
                            </>
                        )}
                    </button>
                )}

                {connectionInfo && (
                    <div className="space-y-2 bg-[#0d1229] rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-[#64748b]">Server:</span>
                            <div className="flex items-center gap-2">
                                <span className="text-white font-mono">{connectionInfo.server}</span>
                                <button onClick={() => handleCopy(connectionInfo.server, 'server')} className="text-[#64748b] hover:text-white">
                                    {copiedField === 'server' ? <Check className="w-3 h-3 text-[#4ade80]" /> : <Copy className="w-3 h-3" />}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[#64748b]">Port:</span>
                            <span className="text-white font-mono">{connectionInfo.port}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[#64748b]">Mount:</span>
                            <div className="flex items-center gap-2">
                                <span className="text-white font-mono">{connectionInfo.mountPoint}</span>
                                <button onClick={() => handleCopy(connectionInfo.mountPoint, 'mount')} className="text-[#64748b] hover:text-white">
                                    {copiedField === 'mount' ? <Check className="w-3 h-3 text-[#4ade80]" /> : <Copy className="w-3 h-3" />}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[#64748b]">Password:</span>
                            <div className="flex items-center gap-2">
                                <span className="text-white font-mono">{showPassword ? connectionInfo.sourcePassword : '••••••••'}</span>
                                <button onClick={() => setShowPassword(!showPassword)} className="text-[#64748b] hover:text-white">
                                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button onClick={() => handleCopy(connectionInfo.sourcePassword, 'password')} className="text-[#64748b] hover:text-white">
                                    {copiedField === 'password' ? <Check className="w-3 h-3 text-[#4ade80]" /> : <Copy className="w-3 h-3" />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#1e2337]">
                    <div className="text-sm text-[#64748b]">
                        {station.format} • {station.bitrate} kbps
                    </div>
                    <button
                        onClick={() => onDelete(station)}
                        className="p-2 rounded-lg text-[#64748b] hover:text-[#f87171] hover:bg-[#f87171]/10 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function Stations() {
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteModal, setDeleteModal] = useState({ open: false, station: null });
    const [deleting, setDeleting] = useState(false);
    const [liveStatus, setLiveStatus] = useState({ mounts: [] });

    const fetchStations = async () => {
        try {
            const response = await fetch(`${API_URL}/api/stations`);
            const data = await response.json();
            setStations(data);
        } catch (err) {
            setError('Failed to load stations');
            console.error('Error fetching stations:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLiveStatus = async () => {
        try {
            const response = await fetch(`${API_URL}/api/icecast-status`);
            const data = await response.json();
            setLiveStatus(data);
        } catch (err) {
            console.error('Error fetching live status:', err);
        }
    };

    useEffect(() => {
        fetchStations();
        fetchLiveStatus();

        // Poll live status every 5 seconds
        const interval = setInterval(fetchLiveStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const getStationStatus = (mount) => {
        const cleanMount = mount.startsWith('/') ? mount.substring(1) : mount;
        const source = liveStatus.mounts?.find(m =>
            m.mount === mount || m.mount === cleanMount || m.mount === `/${cleanMount}`
        );
        return {
            isLive: !!source,
            listeners: source ? (source.listeners || 0) : 0
        };
    };

    const openDeleteModal = (station) => {
        setDeleteModal({ open: true, station });
    };

    const closeDeleteModal = () => {
        setDeleteModal({ open: false, station: null });
    };

    const confirmDelete = async () => {
        if (!deleteModal.station) return;

        setDeleting(true);
        try {
            const response = await fetch(`${API_URL}/api/stations/${deleteModal.station.id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setStations(stations.filter(s => s.id !== deleteModal.station.id));
            }
        } catch (err) {
            console.error('Error deleting station:', err);
        } finally {
            setDeleting(false);
            closeDeleteModal();
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="heading-1 text-white">Your Stations</h1>
                    <p className="text-[#8896ab] mt-1">Manage your radio streams</p>
                </div>
                <Link to="/create">
                    <Button icon={Plus}>New Station</Button>
                </Link>
            </div>

            {/* Stations List */}
            {loading ? (
                <div className="text-center py-12 text-[#64748b]">Loading stations...</div>
            ) : error ? (
                <div className="text-center py-12 text-[#f87171]">{error}</div>
            ) : stations.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Radio className="w-12 h-12 text-[#64748b] mx-auto mb-4" />
                        <h3 className="font-heading font-bold text-white mb-2">No stations yet</h3>
                        <p className="text-[#8896ab] mb-6">Create your first station to get started</p>
                        <Link to="/create">
                            <Button icon={Plus}>Create Station</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stations.map(station => {
                        const { isLive, listeners } = getStationStatus(station.mountPoint);
                        return (
                            <StationCard
                                key={station.id}
                                station={station}
                                onDelete={openDeleteModal}
                                isLive={isLive}
                                listeners={listeners}
                            />
                        );
                    })}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <Modal isOpen={deleteModal.open} onClose={closeDeleteModal} title="Delete Station" size="sm">
                <div className="text-center py-4">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#f87171]/10 flex items-center justify-center">
                        <AlertTriangle className="w-7 h-7 text-[#f87171]" />
                    </div>
                    <h3 className="font-heading font-bold text-white text-lg mb-2">Delete Station?</h3>
                    <p className="text-[#8896ab] mb-1">
                        Are you sure you want to delete
                    </p>
                    <p className="text-white font-medium mb-4">
                        "{deleteModal.station?.name}"
                    </p>
                    <p className="text-sm text-[#64748b]">
                        This action cannot be undone.
                    </p>
                </div>
                <div className="flex gap-3 mt-6">
                    <Button variant="secondary" onClick={closeDeleteModal} className="flex-1">
                        Cancel
                    </Button>
                    <button
                        onClick={confirmDelete}
                        disabled={deleting}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-[#f87171] text-white font-medium hover:bg-[#ef4444] transition-colors disabled:opacity-50"
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
