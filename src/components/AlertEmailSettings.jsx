import { useState, useEffect } from 'react';
import { Bell, Plus, X, Loader2, AlertTriangle, Check } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import Button from './ui/Button';
import Input, { Select } from './ui/Input';
import Toggle from './ui/Toggle';

const API_URL = import.meta.env.VITE_API_URL || '';

const COOLDOWN_OPTIONS = [
    { value: 1, label: '1 minute' },
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '60 minutes' },
];

export default function AlertEmailSettings() {
    const [settings, setSettings] = useState({
        alertEmails: [],
        alertAllStreams: false,
        alertCooldownMins: 5,
        alertOnRecovery: true,
    });
    const [hasSmtpConfigured, setHasSmtpConfigured] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    // Load settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch(`${API_URL}/api/settings/alerts`);
                const data = await res.json();
                setSettings({
                    alertEmails: data.alertEmails || [],
                    alertAllStreams: data.alertAllStreams || false,
                    alertCooldownMins: data.alertCooldownMins || 5,
                    alertOnRecovery: data.alertOnRecovery !== false,
                });
                setHasSmtpConfigured(data.hasSmtpConfigured);
            } catch (err) {
                console.error('Failed to load alert settings:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleAddEmail = () => {
        const email = newEmail.trim().toLowerCase();
        if (email && email.includes('@') && !settings.alertEmails.includes(email)) {
            setSettings(s => ({
                ...s,
                alertEmails: [...s.alertEmails, email],
            }));
            setNewEmail('');
        }
    };

    const handleRemoveEmail = (email) => {
        setSettings(s => ({
            ...s,
            alertEmails: s.alertEmails.filter(e => e !== email),
        }));
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            handleAddEmail();
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            const res = await fetch(`${API_URL}/api/settings/alerts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        } catch (err) {
            console.error('Failed to save alert settings:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center py-8 text-[#64748b]">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Loading settings...
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-[#4b7baf]/10">
                        <Bell className="w-5 h-5 text-[#4b7baf]" />
                    </div>
                    <div>
                        <h2 className="heading-2 text-white">Stream Alert Preferences</h2>
                        <p className="text-sm text-[#64748b]">Configure email notifications for stream events</p>
                    </div>
                </div>

                {/* Warning if SMTP not configured */}
                {!hasSmtpConfigured && (
                    <div className="mb-5 p-3 rounded-lg bg-[#fbbf24]/10 border border-[#fbbf24]/30 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-[#fbbf24] flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-[#fbbf24]">
                            <strong>SMTP not configured.</strong> Configure email settings above before alerts can be sent.
                        </div>
                    </div>
                )}

                <div className="space-y-5">
                    {/* Alert Recipients */}
                    <div>
                        <label className="block text-sm font-medium text-[#94a3b8] mb-1.5">
                            Alert Recipients
                        </label>
                        <div className="flex gap-2 mb-2">
                            <Input
                                placeholder="Add email address..."
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className="flex-1"
                            />
                            <Button variant="secondary" icon={Plus} onClick={handleAddEmail}>
                                Add
                            </Button>
                        </div>
                        {settings.alertEmails.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {settings.alertEmails.map(email => (
                                    <span
                                        key={email}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full 
                                                   bg-[#1e2337] border border-[#2d3555] text-sm text-white"
                                    >
                                        {email}
                                        <button
                                            onClick={() => handleRemoveEmail(email)}
                                            className="text-[#64748b] hover:text-[#f87171] transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-[#64748b]">No recipients added yet</p>
                        )}
                    </div>

                    <div className="border-t border-[#1e2337]" />

                    {/* Alert Options */}
                    <Toggle
                        label="Monitor All Streams"
                        description="Send alerts for all streams, not just the primary"
                        enabled={settings.alertAllStreams}
                        onChange={(v) => setSettings({ ...settings, alertAllStreams: v })}
                    />

                    <div className="border-t border-[#1e2337]" />

                    <Toggle
                        label="Recovery Notifications"
                        description="Send email when a stream recovers after going down"
                        enabled={settings.alertOnRecovery}
                        onChange={(v) => setSettings({ ...settings, alertOnRecovery: v })}
                    />

                    <div className="border-t border-[#1e2337]" />

                    <Select
                        label="Alert Cooldown"
                        value={settings.alertCooldownMins}
                        onChange={(e) => setSettings({ ...settings, alertCooldownMins: parseInt(e.target.value) })}
                        options={COOLDOWN_OPTIONS}
                    />
                    <p className="text-xs text-[#64748b] -mt-3">
                        Minimum time between repeated alerts for the same event
                    </p>

                    <div className="border-t border-[#1e2337] pt-5">
                        <Button onClick={handleSave} icon={saved ? Check : null} disabled={saving}>
                            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Alert Settings'}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
