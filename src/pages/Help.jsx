import { useState } from 'react';
import { Search, Radio, Server, Shield, FileText, ChevronRight, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

// Dummy content for articles
const ARTICLES = {
    'quick-start': {
        title: 'Quick Start Guide',
        content: (
            <div className="space-y-4 text-[#8896ab]">
                <p>Welcome to StreamDock! Follow these steps to get your radio station on air in minutes.</p>

                <h3 className="text-white font-bold text-lg mt-6">1. Create a Station</h3>
                <p>Click the <strong>"New Station"</strong> button on your dashboard. Give your station a name (e.g., "My Awesome Radio") and a unique mount point (e.g., <code className="bg-[#0f1633] px-1 py-0.5 rounded text-sm">/live</code>).</p>

                <h3 className="text-white font-bold text-lg mt-6">2. Get Connection Details</h3>
                <p>Once created, click the <strong>Eye icon</strong> or "Manage" on your station card. You will see:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Server:</strong> e.g., icecast.supersoul.top</li>
                    <li><strong>Port:</strong> 8100</li>
                    <li><strong>Mount:</strong> /live</li>
                    <li><strong>Password:</strong> (Click the eye to reveal)</li>
                </ul>

                <h3 className="text-white font-bold text-lg mt-6">3. Configure Your Encoder</h3>
                <p>Open your broadcasting software (Mixxx, BUTT, OBS, etc.) and enter the details exactly as shown. Start streaming!</p>
            </div>
        )
    },
    'mount-points': {
        title: 'Understanding Mount Points',
        content: (
            <div className="space-y-4 text-[#8896ab]">
                <p>A <strong>Mount Point</strong> is a unique identifier for your stream on the server. It's like a channel or a URL path.</p>
                <p>When listeners tune in, they access your stream via: <br /><code className="text-[#4b7baf]">http://server:port/your-mount-point</code></p>
                <div className="bg-[#4b7baf]/10 p-4 rounded-lg border border-[#4b7baf]/20 mt-4">
                    <p className="text-[#4b7baf] text-sm font-medium">💡 Tip: Keep mount points simple and lowercase (e.g., /jazz, /rock, /live). Avoid spaces and special characters.</p>
                </div>
            </div>
        )
    },
    'encoders': {
        title: 'Connecting Your Encoder',
        content: (
            <div className="space-y-4 text-[#8896ab]">
                <p>StreamDock supports any standard Icecast source client.</p>
                <h4 className="text-white font-medium">Recommended Software:</h4>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Mixxx:</strong> Free, open-source DJ software. Perfect for live mixing.</li>
                    <li><strong>BUTT (Broadcast Using This Tool):</strong> Simple, rock-solid tool for piping audio from line-in to the server.</li>
                    <li><strong>OBS Studio:</strong> Great for adding simple visual streams or advanced routing.</li>
                </ul>
            </div>
        )
    }
};

function HelpCategory({ icon: Icon, title, description, links, onOpenArticle }) {
    return (
        <Card className="h-full hover:border-[#4b7baf]/30 transition-colors group">
            <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-lg bg-[#4b7baf]/10 group-hover:bg-[#4b7baf]/20 transition-colors">
                        <Icon className="w-6 h-6 text-[#4b7baf]" />
                    </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-[#8896ab] text-sm mb-6 h-10">{description}</p>
                <div className="space-y-2">
                    {links.map((link, i) => (
                        <button
                            key={i}
                            onClick={() => onOpenArticle(link.id)}
                            className="w-full flex items-center justify-between text-sm text-[#8896ab] hover:text-white group/link p-2 -mx-2 rounded hover:bg-[#1e2337] transition-all text-left"
                        >
                            <span className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 opacity-50" />
                                {link.label}
                            </span>
                            <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all" />
                        </button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export default function Help() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeArticle, setActiveArticle] = useState(null);

    const categories = [
        {
            icon: Radio,
            title: "Getting Started",
            description: "Everything you need to get your first station up and running.",
            links: [
                { id: 'quick-start', label: "Quick Start Guide" },
                { id: 'mount-points', label: "Understanding Mount Points" },
                { id: 'encoders', label: "Connecting your Encoder" }
            ]
        },
        {
            icon: Server,
            title: "Server Management",
            description: "Guides on managing server settings and performance.",
            links: [
                { id: 'quick-start', label: "Understanding Bitrates" },
                { id: 'mount-points', label: "Server Status & Monitoring" },
                { id: 'encoders', label: "Managing Multiple Stations" }
            ]
        },
        {
            icon: Shield,
            title: "Troubleshooting",
            description: "Common issues and how to resolve them quickly.",
            links: [
                { id: 'quick-start', label: "Connection Refused" },
                { id: 'mount-points', label: "Audio Buffering" },
                { id: 'encoders', label: "Listener Count Issues" }
            ]
        }
    ];

    const handleOpenArticle = (id) => {
        const article = ARTICLES[id] || {
            title: 'Coming Soon',
            content: <p className="text-[#8896ab]">This article is currently being written.</p>
        };
        setActiveArticle(article);
    };

    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col animate-in fade-in duration-500">
            {/* Compact Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="heading-1 text-white">Help Center</h1>
                    <p className="text-[#8896ab] mt-1">Documentation & Support</p>
                </div>
                <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
                    <input
                        type="text"
                        placeholder="Search documentation..."
                        className="w-full bg-[#0d1229] border border-[#1e2337] rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-[#64748b] focus:outline-none focus:border-[#4b7baf] transition-colors text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Quick Links Grid - Fills available space */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {categories.map((cat, i) => (
                    <HelpCategory
                        key={i}
                        {...cat}
                        onOpenArticle={handleOpenArticle}
                    />
                ))}
            </div>

            {/* External Support Footer */}
            <div className="mt-auto pt-6 border-t border-[#1e2337] flex items-center justify-between">
                <div>
                    <h3 className="text-white font-medium">Still need help?</h3>
                    <p className="text-sm text-[#8896ab]">Check out our external resources.</p>
                </div>
                <div className="flex gap-3">
                    <a href="#" className="text-sm text-[#4b7baf] hover:text-[#6b9fd4] font-medium flex items-center gap-1.5 px-4 py-2 rounded-lg hover:bg-[#4b7baf]/10 transition-colors">
                        Full Documentation <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                </div>
            </div>

            {/* Article Modal */}
            <Modal
                isOpen={!!activeArticle}
                onClose={() => setActiveArticle(null)}
                title={activeArticle?.title || ''}
                size="lg"
            >
                {activeArticle?.content}

                <div className="mt-8 pt-6 border-t border-[#2d3555] flex justify-end">
                    <Button onClick={() => setActiveArticle(null)}>
                        Close Article
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
