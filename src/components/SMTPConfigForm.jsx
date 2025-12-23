import { useState, useEffect } from 'react';
import { Mail, Send, Check, Loader2 } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import Button from './ui/Button';
import Input, { Select } from './ui/Input';
import Toggle from './ui/Toggle';

const API_URL = import.meta.env.VITE_API_URL || '';

const PORT_OPTIONS = [
    { value: 587, label: '587 (STARTTLS)' },
    { value: 465, label: '465 (SSL)' },
    { value: 25, label: '25 (Unencrypted)' },
    { value: 2525, label: '2525 (Alternative)' },
];

export default function SMTPConfigForm() {
    const [settings, setSettings] = useState({
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
        smtpFromName: 'StreamDock Alerts',
        smtpUseTls: true,
    });
    const [hasPassword, setHasPassword] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [saved, setSaved] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch(`${API_URL}/api/settings/smtp`);
                const data = await res.json();
                setSettings({
                    smtpHost: data.smtpHost || '',
                    smtpPort: data.smtpPort || 587,
                    smtpUser: data.smtpUser || '',
                    smtpPassword: '',  // Never returned from server
                    smtpFromName: data.smtpFromName || 'StreamDock Alerts',
                    smtpUseTls: data.smtpUseTls !== false,
                });
                setHasPassword(data.hasPassword);
            } catch (err) {
                console.error('Failed to load SMTP settings:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        try {
            const payload = {
                ...settings,
                // Only send password if user entered a new one
                smtpPassword: settings.smtpPassword || null,
            };
            const res = await fetch(`${API_URL}/api/settings/smtp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setSaved(true);
                if (settings.smtpPassword) {
                    setHasPassword(true);
                    setSettings(s => ({ ...s, smtpPassword: '' }));
                }
                setTimeout(() => setSaved(false), 3000);
            }
        } catch (err) {
            console.error('Failed to save SMTP settings:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch(`${API_URL}/api/settings/smtp/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testEmail }),
            });
            const data = await res.json();
            setTestResult(data);
        } catch (err) {
            setTestResult({ success: false, error: 'Network error' });
        } finally {
            setTesting(false);
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
                        <Mail className="w-5 h-5 text-[#4b7baf]" />
                    </div>
                    <div>
                        <h2 className="heading-2 text-white">SMTP Configuration</h2>
                        <p className="text-sm text-[#64748b]">Configure outgoing email server for alerts</p>
                    </div>
                </div>

                <div className="space-y-5">
                    {/* Server Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="SMTP Host"
                            placeholder="smtp.gmail.com"
                            value={settings.smtpHost}
                            onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                        />
                        <Select
                            label="Port"
                            value={settings.smtpPort}
                            onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) })}
                            options={PORT_OPTIONS}
                        />
                    </div>

                    {/* Credentials */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Username"
                            placeholder="alerts@yourdomain.com"
                            value={settings.smtpUser}
                            onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                        />
                        <Input
                            label="Password"
                            type="password"
                            placeholder={hasPassword ? '••••••••' : 'Enter password'}
                            value={settings.smtpPassword}
                            onChange={(e) => setSettings({ ...settings, smtpPassword: e.target.value })}
                        />
                    </div>

                    {/* From Name */}
                    <Input
                        label="From Name"
                        placeholder="StreamDock Alerts"
                        value={settings.smtpFromName}
                        onChange={(e) => setSettings({ ...settings, smtpFromName: e.target.value })}
                    />

                    {/* TLS Toggle */}
                    <Toggle
                        label="Use TLS/STARTTLS"
                        description="Enable TLS encryption for secure email transmission"
                        enabled={settings.smtpUseTls}
                        onChange={(v) => setSettings({ ...settings, smtpUseTls: v })}
                    />

                    <div className="border-t border-[#1e2337] pt-5">
                        <Button onClick={handleSave} icon={saved ? Check : null} disabled={saving}>
                            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
                        </Button>
                    </div>

                    {/* Test Email Section */}
                    <div className="border-t border-[#1e2337] pt-5 mt-5">
                        <h3 className="text-sm font-medium text-[#94a3b8] mb-3">Test Email</h3>
                        <div className="flex gap-3">
                            <Input
                                placeholder="Enter your email to test"
                                value={testEmail}
                                onChange={(e) => setTestEmail(e.target.value)}
                                className="flex-1"
                            />
                            <Button
                                variant="secondary"
                                icon={testing ? Loader2 : Send}
                                onClick={handleTest}
                                disabled={testing || !testEmail || !hasPassword}
                            >
                                {testing ? 'Sending...' : 'Send Test'}
                            </Button>
                        </div>
                        {!hasPassword && (
                            <p className="text-xs text-[#fbbf24] mt-2">
                                Save SMTP settings with a password before testing
                            </p>
                        )}
                        {testResult && (
                            <div className={`mt-3 p-3 rounded-lg text-sm ${testResult.success
                                    ? 'bg-[#4ade80]/10 text-[#4ade80]'
                                    : 'bg-[#f87171]/10 text-[#f87171]'
                                }`}>
                                {testResult.success ? 'Test email sent successfully!' : testResult.error}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
