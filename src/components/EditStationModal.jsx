import { useState, useEffect } from 'react';
import { Image, Globe, Save, Settings, Bell, Plus, X, AlertTriangle } from 'lucide-react';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function EditStationModal({ isOpen, onClose, station, onSave }) {
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
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Station" size="xl">
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: General & Branding */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-sm font-medium text-[#94a3b8] uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                General Information
                            </h3>
                            <div className="space-y-4">
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
                            </div>
                        </div>

                        <div className="pt-6 border-t border-[#2d3555]">
                            <h3 className="text-sm font-medium text-[#94a3b8] uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Image className="w-4 h-4" />
                                Branding
                            </h3>
                            <div className="space-y-4">
                                <Input
                                    label="Logo URL"
                                    name="logoUrl"
                                    value={formData.logoUrl}
                                    onChange={handleChange}
                                    placeholder="https://example.com/logo.png"
                                />

                                {formData.logoUrl && (
                                    <div className="flex justify-center p-4 bg-[#0d1229] rounded-lg border border-[#1e2337]">
                                        <img
                                            src={formData.logoUrl}
                                            alt="Logo preview"
                                            className="w-24 h-24 rounded-lg object-cover"
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
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Alerts */}
                    <div className="space-y-6">
                        <div className="md:pl-8 md:border-l md:border-[#2d3555] h-full">
                            <h3 className="text-sm font-medium text-[#94a3b8] uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Bell className="w-4 h-4" />
                                Alert Settings
                            </h3>

                            <div className="bg-[#1e2337]/50 rounded-lg p-4 text-sm text-[#94a3b8] mb-6 border border-[#2d3555]">
                                <p className="text-white font-medium mb-1">Station-Specific Recipients</p>
                                <p className="leading-relaxed opacity-80">
                                    Configure users who should receive alerts specifically for <strong>{formData.name || 'this station'}</strong>.
                                    These override global settings unless "Monitor All" is active.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-[#94a3b8]">
                                    Add Recipient
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="email@example.com"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        onKeyDown={handleEmailKeyPress}
                                        className="flex-1"
                                    />
                                    <Button variant="secondary" icon={Plus} onClick={handleAddEmail} type="button">
                                        Add
                                    </Button>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-[#94a3b8] mb-3">
                                        Current Recipients
                                    </label>
                                    {formData.alertEmails.length > 0 ? (
                                        <div className="flex flex-col gap-2">
                                            {formData.alertEmails.map(email => (
                                                <div
                                                    key={email}
                                                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#2d3555]/30 border border-[#2d3555] group hover:border-[#4b7baf]/30 transition-colors"
                                                >
                                                    <span className="text-sm text-white">{email}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveEmail(email)}
                                                        className="text-[#64748b] hover:text-[#f87171] p-1 rounded-md hover:bg-[#f87171]/10 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 rounded-lg border-2 border-dashed border-[#2d3555] bg-[#1e2337]/30">
                                            <Bell className="w-8 h-8 text-[#2d3555] mx-auto mb-2" />
                                            <p className="text-sm text-[#64748b]">No specific recipients added</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mt-6 p-3 rounded-lg bg-[#f87171]/10 border border-[#f87171]/20 flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-[#f87171]" />
                        <p className="text-[#f87171] text-sm">{error}</p>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-6 mt-8 border-t border-[#2d3555]">
                    <Button variant="secondary" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" loading={loading} icon={Save}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
