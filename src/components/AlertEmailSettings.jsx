import { useState, useEffect } from 'react';
import { Bell, Plus, X, Loader2, AlertTriangle, Check, Trash2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import Button from './ui/Button';
import Input, { Select } from './ui/Input';
import Toggle from './ui/Toggle';
import Modal from './ui/Modal';

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
    const [emailToDelete, setEmailToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [successfullyAddedEmail, setSuccessfullyAddedEmail] = useState(null);

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

    const handleAddEmail = async () => {
        const email = newEmail.trim().toLowerCase();
        if (email && email.includes('@') && !settings.alertEmails.includes(email)) {
            const updatedEmails = [...settings.alertEmails, email];
            const updatedSettings = { ...settings, alertEmails: updatedEmails };

            setSaving(true);
            try {
                const res = await fetch(`${API_URL}/api/settings/alerts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedSettings),
                });

                if (res.ok) {
                    setSettings(updatedSettings);
                    setNewEmail('');
                    setSuccessfullyAddedEmail(email);
                }
            } catch (err) {
                console.error('Failed to add email:', err);
            } finally {
                setSaving(false);
            }
        }
    };

    const handleRemoveEmailClick = (email) => {
        setEmailToDelete(email);
    };

    const confirmDeleteEmail = async () => {
        if (!emailToDelete) return;

        setDeleting(true);
        try {
            const updatedEmails = settings.alertEmails.filter(e => e !== emailToDelete);
            const updatedSettings = { ...settings, alertEmails: updatedEmails };

            // Save immediately
            const res = await fetch(`${API_URL}/api/settings/alerts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedSettings),
            });

            if (res.ok) {
                setSettings(updatedSettings);
                setEmailToDelete(null);
            }
        } catch (err) {
            console.error('Failed to delete email:', err);
        } finally {
            setDeleting(false);
        }
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
        <>
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

                    {/* SMTP Note */}
                    <div className="mb-6 p-4 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-start gap-3">
                        <div className="p-1 rounded-full bg-[#3b82f6]/20 text-[#3b82f6] mt-0.5">
                            <Check className="w-4 h-4" />
                        </div>
                        <div className="text-sm">
                            <p className="text-white font-medium mb-1">Streamlined Setup</p>
                            <p className="text-[#8896ab]">
                                Only the main administrator needs to configure the SMTP settings (in the Email Config tab).
                                Other users just need their email added here or on their station card to receive alerts.
                            </p>
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
                                                    bg-[#1e2337] border border-[#2d3555] text-sm text-white group"
                                        >
                                            {email}
                                            <button
                                                onClick={() => handleRemoveEmailClick(email)}
                                                className="text-[#64748b] hover:text-[#f87171] transition-colors"
                                                title="Remove recipient"
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
                            description="Receive alerts for ALL stations, even those with their own specific recipients configured."
                            enabled={settings.alertAllStreams}
                            onChange={(v) => setSettings({ ...settings, alertAllStreams: v })}
                        />

                        <div className="bg-[#0f1633] border border-[#1e2337] rounded-lg p-4 mt-2">
                            <div className="flex items-start gap-3">
                                <div className="p-1 rounded-full bg-[#3b82f6]/20 text-[#3b82f6] mt-0.5">
                                    <AlertCircle className="w-4 h-4" />
                                </div>
                                <div className="text-sm">
                                    <p className="text-white font-medium mb-1">How Alert Routing Works</p>
                                    <ul className="text-[#8896ab] space-y-1 list-disc pl-4">
                                        <li><strong>Station-Specific:</strong> Emails configured on a station card <em>always</em> receive alerts for that station.</li>
                                        <li><strong>Global Fallback:</strong> If a station has no specific emails, it uses this global list.</li>
                                        <li><strong>Monitor All:</strong> If enabled above, this global list receives alerts for <em>every</em> station, in addition to any specific recipients.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

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
                                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All Settings'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!emailToDelete}
                onClose={() => setEmailToDelete(null)}
                title="Remove Recipient"
                size="sm"
            >
                <div className="text-center py-4">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#f87171]/10 flex items-center justify-center">
                        <Trash2 className="w-7 h-7 text-[#f87171]" />
                    </div>
                    <h3 className="font-heading font-bold text-white text-lg mb-2">Remove Email?</h3>
                    <p className="text-[#8896ab] mb-6">
                        Are you sure you want to remove <br />
                        <span className="text-white font-medium">{emailToDelete}</span>
                        <br /> from alert recipients?
                    </p>

                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={() => setEmailToDelete(null)} className="flex-1">
                            Cancel
                        </Button>
                        <button
                            onClick={confirmDeleteEmail}
                            disabled={deleting}
                            className="flex-1 px-4 py-2.5 rounded-lg bg-[#f87171] text-white font-medium hover:bg-[#ef4444] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {deleting ? 'Removing...' : 'Remove'}
                        </button>
                    </div>
                </div>
            </Modal>
            {/* Success Modal */}
            <Modal
                isOpen={!!successfullyAddedEmail}
                onClose={() => setSuccessfullyAddedEmail(null)}
                title="Recipient Added"
                size="sm"
            >
                <div className="text-center py-4">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#4ade80]/10 flex items-center justify-center">
                        <Check className="w-7 h-7 text-[#4ade80]" />
                    </div>
                    <h3 className="font-heading font-bold text-white text-lg mb-2">Recipient Added!</h3>
                    <p className="text-[#8896ab] mb-6">
                        Successfully added <br />
                        <span className="text-white font-medium">{successfullyAddedEmail}</span>
                        <br /> to alert recipients.
                    </p>

                    <Button onClick={() => setSuccessfullyAddedEmail(null)} className="w-full">
                        Okay
                    </Button>
                </div>
            </Modal>
        </>
    );
}
