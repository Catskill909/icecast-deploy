import { useState } from 'react';
import { Search, Book, Video, MessageCircle, ChevronRight, ExternalLink, Radio, Server, Shield } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';

function HelpCategory({ icon: Icon, title, description, links }) {
    return (
        <Card className="h-full hover:border-[#4b7baf]/30 transition-colors group">
            <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-[#4b7baf]/10 flex items-center justify-center mb-4 group-hover:bg-[#4b7baf]/20 transition-colors">
                    <Icon className="w-6 h-6 text-[#4b7baf]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-[#8896ab] text-sm mb-6">{description}</p>
                <div className="space-y-3">
                    {links.map((link, i) => (
                        <a
                            key={i}
                            href={link.href}
                            className="flex items-center justify-between text-sm text-[#8896ab] hover:text-white group/link p-2 -mx-2 rounded hover:bg-[#1e2337] transition-all"
                        >
                            <span>{link.label}</span>
                            <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all" />
                        </a>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

export default function Help() {
    const [searchQuery, setSearchQuery] = useState('');

    const categories = [
        {
            icon: Radio,
            title: "Getting Started",
            description: "Everything you need to know to get your first station up and running.",
            links: [
                { label: "Quick Start Guide", href: "#" },
                { label: "Understanding Mount Points", href: "#" },
                { label: "Connecting your Encoder", href: "#" }
            ]
        },
        {
            icon: Server,
            title: "Server Management",
            description: "Guides on managing your Icecast server settings and performance.",
            links: [
                { label: "Understanding Bitrates", href: "#" },
                { label: "Server Status & Monitoring", href: "#" },
                { label: "Managing Multiple Stations", href: "#" }
            ]
        },
        {
            icon: Shield,
            title: "Troubleshooting",
            description: "Common issues and how to resolve them quickly.",
            links: [
                { label: "Connection Refused", href: "#" },
                { label: "Audio Buffering", href: "#" },
                { label: "Listener Count Issues", href: "#" }
            ]
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto py-8">
                <h1 className="text-4xl font-heading font-bold text-white mb-4">How can we help?</h1>
                <p className="text-[#8896ab] text-lg mb-8">Search our documentation or browse categories below</p>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748b]" />
                    <input
                        type="text"
                        placeholder="Search for articles, guides, and more..."
                        className="w-full bg-[#0d1229] border border-[#1e2337] rounded-xl pl-12 pr-4 py-4 text-white placeholder-[#64748b] focus:outline-none focus:border-[#4b7baf] transition-colors shadow-lg"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Quick Links Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {categories.map((cat, i) => (
                    <HelpCategory key={i} {...cat} />
                ))}
            </div>

            {/* Support Box */}
            <Card className="bg-gradient-to-br from-[#4b7baf]/10 to-transparent border-[#4b7baf]/20">
                <CardContent className="p-8 text-center">
                    <h3 className="text-xl font-bold text-white mb-2">Still need help?</h3>
                    <p className="text-[#8896ab] mb-6">Can't find what you're looking for? Check out our external resources.</p>
                    <div className="flex justify-center gap-4">
                        <Button variant="secondary" icon={Book}>
                            Read Full Documentation
                        </Button>
                        <Button icon={MessageCircle}>
                            Contact Support
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function Button({ children, variant = 'primary', icon: Icon, ...props }) {
    const variants = {
        primary: "bg-[#4b7baf] hover:bg-[#3b6b9f] text-white",
        secondary: "bg-[#1e2337] hover:bg-[#2d3555] text-white border border-[#2d3555]"
    };

    return (
        <button
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${variants[variant]}`}
            {...props}
        >
            {Icon && <Icon className="w-4 h-4" />}
            {children}
        </button>
    );
}
