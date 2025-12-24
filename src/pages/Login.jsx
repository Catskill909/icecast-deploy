import { useState } from 'react';
import { Lock, Eye, EyeOff, Radio } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Login() {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ password }),
            });

            const data = await res.json();

            if (data.success) {
                // Force a hard reload to ensure all auth state is fresh
                window.location.href = '/';
            } else {
                setError(data.error || 'Invalid password');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#0a0e17] flex items-center justify-center overflow-hidden">
            <div className="w-full max-w-sm px-4">
                <Card className="border-[#1a1a1a] bg-black shadow-2xl">
                    <CardContent className="p-8">
                        <div className="flex flex-col items-center mb-8">
                            <img
                                src="/header.png"
                                alt="StreamDock"
                                className="h-16 object-contain mb-4"
                            />
                            <p className="text-[#94a3b8] font-medium">Admin Access</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <div className="relative">
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10" // Extra padding for icons
                                        error={error}
                                        icon={Lock}
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-[#1e2337] hover:bg-[#252b45] border border-[#2d3555] h-11"
                                loading={loading}
                                icon={null} // Override default if needed
                            >
                                Sign In
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
