import { useState, useEffect } from 'react';
import { Image, Globe, Save } from 'lucide-react';
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
        websiteUrl: ''
    });
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
                websiteUrl: station.websiteUrl || ''
            });
        }
    }, [station]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
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
            <form onSubmit={handleSubmit} className="space-y-4">
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

                {error && (
                    <p className="text-[#f87171] text-sm">{error}</p>
                )}

                <div className="flex gap-3 pt-2">
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
