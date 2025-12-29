import { useState, useEffect } from 'react';
import { Server, Save, Check, Loader2, AlertTriangle, RotateCw } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import Button from './ui/Button';
import Input, { Select } from './ui/Input';
import Toggle from './ui/Toggle';

const API_URL = import.meta.env.VITE_API_URL || '';

// Preset configurations by station type
const PRESETS = {
    small: {
        maxClients: 250,
        maxSources: 5,
        burstSize: 65535,
        queueSize: 524288,
        logLevel: 'INFO'
    },
    regional: {
        maxClients: 750,
        maxSources: 15,
        burstSize: 131072,
        queueSize: 1048576,
        logLevel: 'INFO'
    },
    large: {
        maxClients: 2000,
        maxSources: 30,
        burstSize: 131072,
        queueSize: 2097152,
        logLevel: 'WARN'
    },
    custom: null // User configures manually
};

export default function IcecastConfigForm() {
    const [settings, setSettings] = useState({
        maxClients: 500,
        maxSources: 10,
        burstSize: 65535,
        queueSize: 524288,
        logLevel: 'INFO',
        logIPs: true,
        logUserAgents: true,
        corsOrigins: [],
        hostname: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [restarting, setRestarting] = useState(false);
    const [saved, setSaved] = useState(false);
    const [configChanged, setConfigChanged] = useState(false);
    const [warnings, setWarnings] = useState([]);

    // Load settings on mount
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch(`${API_URL}/api/icecast-config`);
                const data = await res.json();
                setSettings(data);
            } catch (err) {
                console.error('Failed to load Icecast config:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handlePresetChange = (e) => {
        const preset = PRESETS[e.target.value];
        if (preset) {
            setSettings(s => ({ ...s, ...preset }));
            setConfigChanged(true);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setSaved(false);
        setWarnings([]);
        try {
            const res = await fetch(`${API_URL}/api/icecast-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });

            const data = await res.json();

            if (res.ok) {
                setSaved(true);
                setConfigChanged(true); // Config saved, restart needed
                if (data.warnings && data.warnings.length > 0) {
                    setWarnings(data.warnings);
                }
                setTimeout(() => setSaved(false), 3000);
            } else {
                alert(`Error: ${data.errors ? data.errors.map(e => e.message).join(', ') : data.error}`);
            }
        } catch (err) {
            console.error('Failed to save Icecast config:', err);
            alert('Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const handleRestart = async () => {
        if (!confirm('Restart Icecast server? This will briefly interrupt all active streams.')) {
            return;
        }

        setRestarting(true);
        try {
            const res = await fetch(`${API_URL}/api/icecast-config/restart`, {
                method: 'POST'
            });

            const data = await res.json();

            if (res.ok) {
                setConfigChanged(false); // Restart completed
                alert(data.message || 'Icecast restarted successfully');
            } else {
                alert(`Restart failed: ${data.error}`);
            }
        } catch (err) {
            console.error('Failed to restart Icecast:', err);
            alert('Failed to restart Icecast');
        } finally {
            setRestarting(false);
        }
    };

    // CORS management
    const handleCorsAdd = () => {
        setSettings(s => ({
            ...s,
            corsOrigins: [...s.corsOrigins, '']
        }));
    };

    const handleCorsChange = (idx, value) => {
        const newOrigins = [...settings.corsOrigins];
        newOrigins[idx] = value;
        setSettings(s => ({ ...s, corsOrigins: newOrigins }));
    };

    const handleCorsRemove = (idx) => {
        setSettings(s => ({
            ...s,
            corsOrigins: s.corsOrigins.filter((_, i) => i !== idx)
        }));
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center py-8 text-[#64748b]">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Loading configuration...
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-[#4b7baf]/10">
                        <Server className="w-5 h-5 text-[#4b7baf]" />
                    </div>
                    <div>
                        <h2 className="heading-2 text-white">Icecast Server Configuration</h2>
                        <p className="text-sm text-[#64748b]">Configure global server limits and logging</p>
                    </div>
                </div>

                {/* Preset Selector */}
                <div className="mb-6 p-4 rounded-lg bg-[#1a1f3a] border border-[#2d3555]">
                    <Select
                        label="Quick Preset (Optional)"
                        onChange={handlePresetChange}
                        options={[
                            { value: 'custom', label: 'Custom Configuration' },
                            { value: 'small', label: 'Small/Community Station (<100 listeners)' },
                            { value: 'regional', label: 'Regional Public Radio (100-500 listeners)' },
                            { value: 'large', label: 'Large Market / NPR (500+ listeners)' }
                        ]}
                    />
                    <p className="text-xs text-[#64748b] mt-2">
                        Select a preset to auto-fill recommended values, or choose Custom to configure manually
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Server Limits Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-[#94a3b8] uppercase">Server Limits</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Max Clients"
                                type="number"
                                value={settings.maxClients}
                                onChange={(e) => setSettings({ ...settings, maxClients: parseInt(e.target.value) || 0 })}
                            />
                            <Input
                                label="Max Sources"
                                type="number"
                                value={settings.maxSources}
                                onChange={(e) => setSettings({ ...settings, maxSources: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Burst Size (bytes)"
                                type="number"
                                value={settings.burstSize}
                                onChange={(e) => setSettings({ ...settings, burstSize: parseInt(e.target.value) || 0 })}
                            />
                            <Input
                                label="Queue Size (bytes)"
                                type="number"
                                value={settings.queueSize}
                                onChange={(e) => setSettings({ ...settings, queueSize: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        <p className="text-xs text-[#64748b]">
                            <strong>Tip:</strong> Higher burst/queue sizes = smoother playback but more memory usage
                        </p>
                    </div>

                    {/* Logging Section */}
                    <div className="border-t border-[#1e2337] pt-6 space-y-4">
                        <h3 className="text-sm font-medium text-[#94a3b8] uppercase">Logging</h3>

                        <Select
                            label="Log Level"
                            value={settings.logLevel}
                            onChange={(e) => setSettings({ ...settings, logLevel: e.target.value })}
                            options={[
                                { value: 'ERROR', label: 'Error - Critical issues only' },
                                { value: 'WARN', label: 'Warning - Production recommended' },
                                { value: 'INFO', label: 'Info - General monitoring (default)' },
                                { value: 'DEBUG', label: 'Debug - Troubleshooting (high disk usage)' }
                            ]}
                        />

                        <Toggle
                            label="Log Listener IP Addresses"
                            description="Track listener IPs in access logs (useful for analytics/compliance)"
                            enabled={settings.logIPs}
                            onChange={(v) => setSettings({ ...settings, logIPs: v })}
                        />

                        <Toggle
                            label="Log User Agents"
                            description="Track listener devices and apps (browser, mobile app, etc.)"
                            enabled={settings.logUserAgents}
                            onChange={(v) => setSettings({ ...settings, logUserAgents: v })}
                        />
                    </div>

                    {/* CORS Section */}
                    <div className="border-t border-[#1e2337] pt-6 space-y-4">
                        <h3 className="text-sm font-medium text-[#94a3b8] uppercase">Web Player Access (CORS)</h3>
                        <p className="text-xs text-[#64748b]">
                            Allow your website's player to access streams without browser errors
                        </p>

                        <div className="space-y-2">
                            {settings.corsOrigins.map((origin, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <Input
                                        value={origin}
                                        onChange={(e) => handleCorsChange(idx, e.target.value)}
                                        placeholder="https://mystation.org"
                                        className="flex-1"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCorsRemove(idx)}
                                    >
                                        ×
                                    </Button>
                                </div>
                            ))}

                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleCorsAdd}
                            >
                                + Add Origin
                            </Button>
                        </div>
                    </div>

                    {/* Warnings Display */}
                    {warnings.length > 0 && (
                        <div className="p-4 rounded-lg bg-[#fbbf24]/10 border border-[#fbbf24]/30">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-[#fbbf24] mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-[#fbbf24]">Configuration Warnings</p>
                                    <ul className="mt-2 space-y-1 text-xs text-[#fbbf24]">
                                        {warnings.map((w, idx) => (
                                            <li key={idx}>• {w.message}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="border-t border-[#1e2337] pt-6 flex gap-3 flex-wrap">
                        <Button
                            onClick={handleSave}
                            icon={saved ? Check : null}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Configuration'}
                        </Button>

                        {configChanged && (
                            <Button
                                variant="warning"
                                onClick={handleRestart}
                                icon={restarting ? Loader2 : RotateCw}
                                disabled={restarting}
                            >
                                {restarting ? 'Restarting...' : 'Restart Icecast'}
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
