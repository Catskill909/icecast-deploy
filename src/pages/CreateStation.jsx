import { useState } from 'react';
import { Radio, Check, Copy, ArrowRight, ArrowLeft, Music, Headphones } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

// Use empty string in dev (Vite proxy handles it), or env var in production
const API_URL = import.meta.env.VITE_API_URL || '';

// Step indicator component
function StepIndicator({ currentStep, totalSteps }) {
    return (
        <div className="flex items-center justify-center gap-2 mb-4">
            {[...Array(totalSteps)].map((_, i) => (
                <div key={i} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-heading font-bold text-sm transition-all ${i < currentStep ? 'bg-[#4ade80] text-white' :
                        i === currentStep ? 'bg-[#4b7baf] text-white' :
                            'bg-[#1e2337] text-[#64748b]'
                        }`}>
                        {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
                    </div>
                    {i < totalSteps - 1 && (
                        <div className={`w-8 h-0.5 mx-1 rounded transition-all ${i < currentStep ? 'bg-[#4ade80]' : 'bg-[#1e2337]'
                            }`} />
                    )}
                </div>
            ))}
        </div>
    );
}

// Connection info display component
function ConnectionInfo({ info, onCopy, copiedField }) {
    const fields = [
        { label: 'Server', value: info.server, key: 'server' },
        { label: 'Port', value: info.port, key: 'port' },
        { label: 'Mount Point', value: info.mountPoint, key: 'mount' },
        { label: 'Password', value: info.sourcePassword, key: 'password', sensitive: true },
    ];

    return (
        <div className="space-y-3">
            <div className="bg-[#0d1229] rounded-xl p-4 grid grid-cols-2 gap-3">
                {fields.map(field => (
                    <div key={field.key} className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-[#64748b] uppercase tracking-wide">{field.label}</p>
                            <p className="text-sm font-medium text-white font-mono">{field.value}</p>
                        </div>
                        <button
                            onClick={() => onCopy(field.value, field.key)}
                            className="p-1.5 rounded-lg text-[#64748b] hover:text-white hover:bg-[#1e2337] transition-colors"
                        >
                            {copiedField === field.key ? <Check className="w-3 h-3 text-[#4ade80]" /> : <Copy className="w-3 h-3" />}
                        </button>
                    </div>
                ))}
            </div>

            <div className="bg-[#4b7baf]/10 border border-[#4b7baf]/30 rounded-xl p-4">
                <p className="text-xs text-[#4b7baf] uppercase tracking-wide mb-1">Stream URL (for listeners)</p>
                <div className="flex items-center justify-between">
                    <code className="text-sm text-[#4b7baf] font-mono">{info.streamUrl}</code>
                    <button
                        onClick={() => onCopy(info.streamUrl, 'streamUrl')}
                        className="p-1.5 rounded-lg text-[#4b7baf] hover:bg-[#4b7baf]/20 transition-colors"
                    >
                        {copiedField === 'streamUrl' ? <Check className="w-3 h-3 text-[#4ade80]" /> : <Copy className="w-3 h-3" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function CreateStation() {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copiedField, setCopiedField] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        genre: 'Music',
        format: 'MP3',
        bitrate: '128'
    });

    const [connectionInfo, setConnectionInfo] = useState(null);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleCopy = (value, field) => {
        navigator.clipboard.writeText(value);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            setError('Please enter a station name');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_URL}/api/stations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create station');
            }

            setConnectionInfo(data.connectionInfo);
            setStep(2);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-4">
            {/* Header */}
            <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br from-[#4b7baf] to-[#4a9b9f] flex items-center justify-center">
                    <Radio className="w-6 h-6 text-white" />
                </div>
                <h1 className="heading-1 text-white text-xl">Create Your Station</h1>
                <p className="text-[#8896ab] text-sm">Set up your radio stream in minutes</p>
            </div>

            <StepIndicator currentStep={step} totalSteps={3} />

            <Card>
                <CardContent className="p-6">
                    {/* Step 1: Station Info */}
                    {step === 0 && (
                        <div className="space-y-4">
                            <div className="text-center mb-4">
                                <Music className="w-8 h-8 text-[#4b7baf] mx-auto mb-2" />
                                <h2 className="heading-2 text-white text-base">Station Details</h2>
                                <p className="text-[#8896ab] text-sm">Tell us about your radio station</p>
                            </div>

                            <Input
                                label="Station Name"
                                name="name"
                                placeholder="My Awesome Radio"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />

                            <Input
                                label="Description"
                                name="description"
                                placeholder="A brief description of your station..."
                                value={formData.description}
                                onChange={handleInputChange}
                            />

                            <Input
                                label="Genre"
                                name="genre"
                                placeholder="Music, Talk, News..."
                                value={formData.genre}
                                onChange={handleInputChange}
                            />

                            {error && (
                                <p className="text-[#f87171] text-sm">{error}</p>
                            )}

                            <div className="pt-2">
                                <Button onClick={() => setStep(1)} className="w-full" icon={ArrowRight} iconPosition="right">
                                    Continue
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Quality Settings */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="text-center mb-4">
                                <Headphones className="w-8 h-8 text-[#4b7baf] mx-auto mb-2" />
                                <h2 className="heading-2 text-white text-base">Stream Quality</h2>
                                <p className="text-[#8896ab] text-sm">Choose your audio settings</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {['MP3', 'AAC'].map(format => (
                                    <button
                                        key={format}
                                        onClick={() => setFormData({ ...formData, format })}
                                        className={`p-4 rounded-xl border text-center transition-all ${formData.format === format
                                            ? 'border-[#4b7baf] bg-[#4b7baf]/10 text-white'
                                            : 'border-[#2d3555] text-[#8896ab] hover:border-[#3d4565]'
                                            }`}
                                    >
                                        <p className="font-heading font-bold text-lg">{format}</p>
                                        <p className="text-xs mt-1">{format === 'MP3' ? 'Universal compatibility' : 'Better quality'}</p>
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label className="block text-sm text-[#8896ab] mb-2">Bitrate</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['64', '128', '256'].map(bitrate => (
                                        <button
                                            key={bitrate}
                                            onClick={() => setFormData({ ...formData, bitrate })}
                                            className={`p-3 rounded-lg border text-center transition-all ${formData.bitrate === bitrate
                                                ? 'border-[#4b7baf] bg-[#4b7baf]/10 text-white'
                                                : 'border-[#2d3555] text-[#8896ab] hover:border-[#3d4565]'
                                                }`}
                                        >
                                            {bitrate} kbps
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <p className="text-[#f87171] text-sm">{error}</p>
                            )}

                            <div className="flex gap-4 pt-4">
                                <Button variant="secondary" onClick={() => setStep(0)} icon={ArrowLeft}>
                                    Back
                                </Button>
                                <Button onClick={handleSubmit} className="flex-1" loading={loading}>
                                    {loading ? 'Creating Station...' : 'Create Station'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Connection Info */}
                    {step === 2 && connectionInfo && (
                        <div className="space-y-4">
                            <div className="text-center mb-3">
                                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[#4ade80]/10 flex items-center justify-center">
                                    <Check className="w-6 h-6 text-[#4ade80]" />
                                </div>
                                <h2 className="heading-2 text-white text-base">Station Created!</h2>
                                <p className="text-[#8896ab] text-sm">Use these settings to connect your encoder</p>
                            </div>

                            <ConnectionInfo
                                info={connectionInfo}
                                onCopy={handleCopy}
                                copiedField={copiedField}
                            />

                            <div className="bg-[#1e2337] rounded-xl p-4">
                                <h3 className="font-heading font-bold text-white text-sm mb-2">Next Steps</h3>
                                <ol className="space-y-1 text-[#8896ab] text-sm">
                                    <li className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-[#4b7baf]/20 text-[#4b7baf] flex items-center justify-center text-xs flex-shrink-0">1</span>
                                        Open your streaming software (BUTT, OBS, etc.)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-[#4b7baf]/20 text-[#4b7baf] flex items-center justify-center text-xs flex-shrink-0">2</span>
                                        Enter the connection details above
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-[#4b7baf]/20 text-[#4b7baf] flex items-center justify-center text-xs flex-shrink-0">3</span>
                                        Click connect and start streaming!
                                    </li>
                                </ol>
                            </div>

                            <div className="pt-2">
                                <Button onClick={() => window.location.href = '/servers'} className="w-full">
                                    View All Stations
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
