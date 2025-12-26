import { useState, useEffect } from 'react';
import { Image, Globe, Save, Settings, Bell, Plus, X, AlertTriangle, Rss, Radio, CheckCircle2, Loader2, XCircle } from 'lucide-react';
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
        alertEmails: [],
        relayUrl: '',
        relayEnabled: false,
        relayMode: 'fallback'
    });
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [relayTest, setRelayTest] = useState({ testing: false, result: null });

    // Populate form when station changes
    useEffect(() => {
        if (station) {
            setFormData({
                name: station.name || '',
                description: station.description || '',
                genre: station.genre || 'Various',
                logoUrl: station.logoUrl || '',
                websiteUrl: station.websiteUrl || '',
                alertEmails: station.alertEmails || [],
                relayUrl: station.relayUrl || '',
                relayEnabled: station.relayEnabled || false,
                relayMode: station.relayMode || 'fallback'
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
            // Reload page to show updated badge colors (relay status changes)
            window.location.reload();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Station" size="full">
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: General & Branding */}
                    <div className="space-y-4">
                        <section>
                            <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Settings className="w-3.5 h-3.5" />
                                General Information
                            </h3>
                            <div className="space-y-2">
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

                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        label="Genre"
                                        name="genre"
                                        value={formData.genre}
                                        onChange={handleChange}
                                        placeholder="Music..."
                                    />
                                    <Input
                                        label="Website URL"
                                        name="websiteUrl"
                                        value={formData.websiteUrl}
                                        onChange={handleChange}
                                        placeholder="https://..."
                                        icon={Globe}
                                    />
                                </div>
                            </div>
                        </section>

                        <div className="pt-3 border-t border-[#2d3555]">
                            <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Image className="w-3.5 h-3.5" />
                                Branding
                            </h3>

                            <div className="flex gap-3">
                                {/* Logo Preview - Large */}
                                <div className="flex-shrink-0">
                                    <div className="w-24 h-24 bg-[#0d1229] rounded-lg border border-[#1e2337] overflow-hidden flex items-center justify-center">
                                        {formData.logoUrl ? (
                                            <img
                                                src={formData.logoUrl}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'flex';
                                                }}
                                            />
                                        ) : (
                                            <Image className="w-8 h-8 text-[#2d3555]" />
                                        )}
                                    </div>
                                </div>
                                {/* Logo URL Input */}
                                <div className="flex-1 min-w-0">
                                    <Input
                                        label="Logo URL"
                                        name="logoUrl"
                                        value={formData.logoUrl}
                                        onChange={handleChange}
                                        placeholder="https://example.com/logo.png"
                                    />
                                    <p className="text-[10px] text-[#64748b] mt-1">Square images work best (PNG or JPG)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Alerts */}
                    <div className="md:pl-6 md:border-l md:border-[#2d3555]">
                        <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Bell className="w-3.5 h-3.5" />
                            Alert Settings
                        </h3>

                        <div className="bg-[#1e2337]/50 rounded-lg p-2 text-[#94a3b8] mb-3 border border-[#2d3555]">
                            <p className="text-white text-xs font-medium mb-0.5">Station-Specific Recipients</p>
                            <p className="text-[10px] leading-relaxed opacity-80">
                                Alerts for <strong>{formData.name || 'this station'}</strong> go to these emails.
                            </p>
                        </div>

                        <div className="space-y-2">
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

                            <div className="mt-2">
                                <label className="block text-sm font-medium text-[#94a3b8] mb-2">
                                    Current Recipients
                                </label>
                                <div className="max-h-[200px] overflow-y-auto pr-1">
                                    {formData.alertEmails.length > 0 ? (
                                        <div className="flex flex-col gap-2">
                                            {formData.alertEmails.map(email => (
                                                <div
                                                    key={email}
                                                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#2d3555]/30 border border-[#2d3555] group hover:border-[#4b7baf]/30 transition-colors"
                                                >
                                                    <span className="text-sm text-white truncate max-w-[200px]" title={email}>{email}</span>
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
                                        <div className="text-center py-3 rounded-lg border-2 border-dashed border-[#2d3555] bg-[#1e2337]/30">
                                            <Bell className="w-5 h-5 text-[#2d3555] mx-auto mb-1" />
                                            <p className="text-[10px] text-[#64748b]">No recipients</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* External Source Section */}
                        <div className="pt-3 mt-3 border-t border-[#2d3555]">
                            <h3 className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-2 flex items-center gap-2">
                                <Rss className="w-3.5 h-3.5 text-[#4b7baf]" />
                                <span className="text-[#4b7baf]">External Source</span>
                            </h3>

                            <p className="text-[10px] text-[#94a3b8] mb-2">
                                Pull audio from an external stream URL as primary source or auto-fallback.
                            </p>

                            {/* Stream Restart Warning */}
                            <div className="flex items-start gap-2 p-2 mb-3 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/30">
                                <AlertTriangle className="w-4 h-4 text-[#f59e0b] flex-shrink-0 mt-0.5" />
                                <p className="text-[10px] text-[#f59e0b] leading-relaxed">
                                    <span className="font-semibold">Interruption Warning:</span> Saving changes to relay settings will restart the stream engine. If currently live, expect a 2-5 second audio drop.
                                </p>
                            </div>

                            <div className="space-y-3 bg-[#1a1f35] rounded-lg p-3 border border-[#2d3555]">
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <Input
                                            label="Relay URL"
                                            name="relayUrl"
                                            value={formData.relayUrl}
                                            onChange={(e) => {
                                                handleChange(e);
                                                setRelayTest({ testing: false, result: null });
                                            }}
                                            placeholder="https://stream.example.com/mount"
                                            icon={Radio}
                                        />
                                    </div>
                                    <div className="flex items-end pb-[1px]">
                                        <button
                                            type="button"
                                            disabled={!formData.relayUrl || relayTest.testing}
                                            onClick={async () => {
                                                setRelayTest({ testing: true, result: null });
                                                try {
                                                    const res = await fetch(`${API_URL}/api/relay/test-url`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        credentials: 'include',
                                                        body: JSON.stringify({ url: formData.relayUrl })
                                                    });
                                                    const data = await res.json();
                                                    setRelayTest({ testing: false, result: data });
                                                } catch (err) {
                                                    setRelayTest({ testing: false, result: { valid: false, error: err.message } });
                                                }
                                            }}
                                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${!formData.relayUrl || relayTest.testing
                                                ? 'bg-[#2d3555] text-[#64748b] cursor-not-allowed'
                                                : 'bg-[#4b7baf] text-white hover:bg-[#3b6a9e]'
                                                }`}
                                        >
                                            {relayTest.testing ? (
                                                <><Loader2 className="w-3 h-3 animate-spin" /> Testing</>
                                            ) : (
                                                'Test'
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {relayTest.result && (
                                    <div className={`flex items-center gap-2 p-2 rounded-lg text-xs ${relayTest.result.valid
                                        ? 'bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e]'
                                        : 'bg-[#f87171]/10 border border-[#f87171]/30 text-[#f87171]'
                                        }`}>
                                        {relayTest.result.valid ? (
                                            <><CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Valid • {relayTest.result.formatDetails}</>
                                        ) : (
                                            <><XCircle className="w-4 h-4 flex-shrink-0" /> {relayTest.result.error}</>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-2 border-t border-[#2d3555]">
                                    <div className="flex items-center gap-2">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.relayEnabled}
                                                onChange={(e) => setFormData(prev => ({ ...prev, relayEnabled: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-[#2d3555] peer-focus:ring-2 peer-focus:ring-[#4b7baf]/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4b7baf]"></div>
                                        </label>
                                        <span className="text-xs font-medium text-white">Enable</span>
                                    </div>
                                    {formData.relayEnabled && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#4b7baf]/20 text-[#4b7baf] font-medium">Active</span>
                                    )}
                                </div>

                                {formData.relayEnabled && formData.relayUrl && (
                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2d3555]">
                                        <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs ${formData.relayMode === 'primary'
                                            ? 'border-[#4b7baf] bg-[#4b7baf]/10'
                                            : 'border-[#2d3555]'
                                            }`}>
                                            <input type="radio" name="relayMode" value="primary" checked={formData.relayMode === 'primary'} onChange={handleChange} className="w-3 h-3" />
                                            <span className="text-white">Primary</span>
                                        </label>
                                        <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs ${formData.relayMode === 'fallback'
                                            ? 'border-[#4b7baf] bg-[#4b7baf]/10'
                                            : 'border-[#2d3555]'
                                            }`}>
                                            <input type="radio" name="relayMode" value="fallback" checked={formData.relayMode === 'fallback'} onChange={handleChange} className="w-3 h-3" />
                                            <span className="text-white">Fallback</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-3 rounded-lg bg-[#f87171]/10 border border-[#f87171]/20 flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-[#f87171]" />
                        <p className="text-[#f87171] text-sm">{error}</p>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-[#2d3555]">
                    <Button variant="secondary" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" loading={loading} icon={Save}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Modal >
    );
}
