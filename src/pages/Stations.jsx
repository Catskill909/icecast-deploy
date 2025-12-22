import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Radio, Plus, Copy, Check, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';

const API_URL = import.meta.env.VITE_API_URL || '';

function StationCard({ station, onDelete }) {
    const [showPassword, setShowPassword] = useState(false);
    const [copiedField, setCopiedField] = useState(null);
    const [connectionInfo, setConnectionInfo] = useState(null);

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

    return (
        <Card>
            <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#4b7baf]/10">
                            <Radio className="w-5 h-5 text-[#4b7baf]" />
                        </div>
                        <div>
                            <h3 className="font-heading font-bold text-white">{station.name}</h3>
                            <p className="text-sm text-[#64748b]">{station.mountPoint}</p>
                        </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${station.status === 'active' ? 'bg-[#4ade80]/10 text-[#4ade80]' : 'bg-[#f87171]/10 text-[#f87171]'}`}>
                        {station.status}
                    </div>
                </div>

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

    useEffect(() => {
        fetchStations();
    }, []);

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
                    {stations.map(station => (
                        <StationCard key={station.id} station={station} onDelete={openDeleteModal} />
                    ))}
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
