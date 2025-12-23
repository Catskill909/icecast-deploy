import { useState, useEffect } from 'react';
import { Image, Globe, Save, Settings, Bell, Plus, X, AlertTriangle } from 'lucide-react';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function EditStationModal({ isOpen, onClose, station, onSave }) {
    const [activeTab, setActiveTab] = useState('general');
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        genre: '',
        logoUrl: '',
        websiteUrl: '',
        alertEmails: []
    });
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Populate form when station changes
    useEffect(() => {
        if (station) {
            setFormData({
                name: station.name || '',
                description: station.description || '',
                genre: station.genre || 'Various',
                logoUrl: station.logoUrl || '',
                websiteUrl: station.websiteUrl || '',
                alertEmails: station.alertEmails || []
            });
            setActiveTab('general');
        }
    }, [station]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleAddEmail = () => {
        const email = newEmail.trim().toLowerCase();
        if (email && email.includes('@') && !formData.alertEmails.includes(email)) {
            setFormData(prev => ({
                ...prev,
                alertEmails: [...prev.alertEmails, email]
            }));
            setNewEmail('');
        }
    };

    const handleRemoveEmail = (email) => {
        setFormData(prev => ({
            ...prev,
            alertEmails: prev.alertEmails.filter(e => e !== email)
        }));
    };

    const handleEmailKeyPress = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            handleAddEmail();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError('Station name is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/api/stations/${station.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update station');
            }

            onSave();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Station" size="sm">
            {/* Tabs */}
            <div className="flex border-b border-[#1e2337] mb-5">
                <button
                    type="button"
                    onClick={() => setActiveTab('general')}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-medium transition-colors ${activeTab === 'general'
                        ? 'border-[#4b7baf] text-[#4b7baf]'
                        : 'border-transparent text-[#64748b] hover:text-[#94a3b8]'
                        }`}
                >
                    <Settings className="w-4 h-4" />
                    General
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('alerts')}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 text-sm font-medium transition-colors ${activeTab === 'alerts'
                        ? 'border-[#4b7baf] text-[#4b7baf]'
                        : 'border-transparent text-[#64748b] hover:text-[#94a3b8]'
                        }`}
                >
                    <Bell className="w-4 h-4" />
                    Alerts
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {activeTab === 'general' ? (
                    <>
                        <Input
                            label="Station Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="My Radio Station"
                            required
                        />

                        <Input
                            label="Description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="A brief description..."
                        />

                        <Input
                            label="Genre"
                            name="genre"
                            value={formData.genre}
                            onChange={handleChange}
                            placeholder="Music, Talk, News..."
                        />

                        <div className="pt-2 border-t border-[#2d3555]">
                            <p className="text-xs text-[#64748b] uppercase tracking-wider mb-3">Branding</p>

                            <Input
                                label="Logo URL"
                                name="logoUrl"
                                value={formData.logoUrl}
                                onChange={handleChange}
                                placeholder="https://example.com/logo.png"
                                icon={Image}
                            />

                            {formData.logoUrl && (
                                <div className="mt-2 flex justify-center">
                                    <img
                                        src={formData.logoUrl}
                                        alt="Logo preview"
                                        className="w-16 h-16 rounded-lg object-cover bg-[#0d1229]"
                                        onError={(e) => e.target.style.display = 'none'}
                                    />
                                </div>
                            )}

                            <Input
                                label="Website URL"
                                name="websiteUrl"
                                value={formData.websiteUrl}
                                onChange={handleChange}
                                placeholder="https://mystation.com"
                                icon={Globe}
                                className="mt-3"
                            />
                        </div>
                    </>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-[#1e2337]/50 rounded-lg p-3 text-sm text-[#94a3b8]">
                            <p>Configure specific email recipients for <strong>{formData.name}</strong>.</p>
                            <p className="mt-1 text-xs opacity-70">
                                These recipients will receive alerts regardless of global settings.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
                                Station-Specific Recipients
                            </label>
                            <div className="flex gap-2 mb-2">
                                <Input
                                    placeholder="Add email address..."
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    onKeyDown={handleEmailKeyPress}
                                    className="flex-1"
                                />
                                <Button variant="secondary" icon={Plus} onClick={handleAddEmail} type="button">
                                    Add
                                </Button>
                            </div>
                            {formData.alertEmails.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {formData.alertEmails.map(email => (
                                        <span
                                            key={email}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full 
                                                   bg-[#1e2337] border border-[#2d3555] text-sm text-white"
                                        >
                                            {email}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveEmail(email)}
                                                className="text-[#64748b] hover:text-[#f87171] transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-[#64748b] italic">
                                    No station-specific recipients added.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {error && (
                    <p className="text-[#f87171] text-sm">{error}</p>
                )}

                <div className="flex gap-3 pt-2 mt-4 border-t border-[#1e2337]">
                    <Button variant="secondary" onClick={onClose} type="button" className="flex-1">
                        Cancel
                    </Button>
                    <Button type="submit" loading={loading} icon={Save} className="flex-1">
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
