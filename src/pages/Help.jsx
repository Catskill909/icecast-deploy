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
    },
    'alerts': {
        title: 'Understanding Alerts',
        content: (
            <div className="space-y-4 text-[#8896ab]">
                <p>StreamDock automatically generates alerts to keep you informed about your stream status.</p>

                <h4 className="text-white font-medium mt-4">Alert Types:</h4>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong className="text-[#4ade80]">Station Now Broadcasting:</strong> When your stream goes live</li>
                    <li><strong className="text-[#f87171]">Broadcast Ended:</strong> When your stream goes offline</li>
                    <li><strong className="text-[#4b7baf]">Listener Milestone:</strong> When you hit 50, 100, 250, or 500+ listeners</li>
                </ul>

                <h4 className="text-white font-medium mt-4">Where to Find Alerts:</h4>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Bell Icon:</strong> Click the bell in the header to see recent alerts</li>
                    <li><strong>Alerts Page:</strong> Full alert history in the sidebar</li>
                </ul>

                <div className="bg-[#4b7baf]/10 p-4 rounded-lg border border-[#4b7baf]/20 mt-4">
                    <p className="text-[#4b7baf] text-sm font-medium">💡 Tip: Keep the Dashboard open while streaming - this is what triggers the status checks that generate alerts.</p>
                </div>
            </div>
        )
    },
    'email-alerts': {
        title: 'Setting up Email Alerts',
        content: (
            <div className="space-y-4 text-[#8896ab]">
                <p>Receive instant email notifications when your stream goes down or recovers. This requires configuring an SMTP server.</p>

                <h3 className="text-white font-bold text-lg mt-6">Using Gmail (Recommended)</h3>
                <p>Gmail is the easiest way to send alerts. You must use an <strong>App Password</strong>, not your regular login password.</p>

                <h4 className="text-white font-medium mt-4">Step 1: Get an App Password</h4>
                <ol className="list-decimal pl-5 space-y-2">
                    <li>Go to your <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-[#4b7baf] hover:underline">Google Account Security</a> page.</li>
                    <li>Enable <strong>2-Step Verification</strong> if it's not already on.</li>
                    <li>Search for "App passwords" in the top search bar (or look under 2-Step Verification).</li>
                    <li>Create a new app password named "StreamDock".</li>
                    <li>Copy the 16-character code (e.g., <code>abcd efgh ijkl mnop</code>).</li>
                </ol>

                <h4 className="text-white font-medium mt-4">Step 2: Configure StreamDock</h4>
                <p>Go to <strong>Settings &rarr; Email Config</strong> and enter:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Host:</strong> <code>smtp.gmail.com</code></li>
                    <li><strong>Port:</strong> <code>587</code> (STARTTLS)</li>
                    <li><strong>Username:</strong> Your full Gmail address</li>
                    <li><strong>Password:</strong> The 16-character App Password (remove spaces)</li>
                </ul>

                <h4 className="text-white font-medium mt-4">Step 3: Add Recipients</h4>
                <p>Go to the <strong>Stream Alerts</strong> tab in Settings and add the email addresses that should receive notifications.</p>

                <h4 className="text-white font-medium mt-4">Step 4: Smart Alert Routing</h4>
                <p>StreamDock uses a smart routing system to determine who gets emailed:</p>
                <div className="bg-[#0f1633] border border-[#1e2337] rounded-lg p-3 mt-2 text-sm">
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Station-Specific:</strong> Set custom recipients in <em>Edit Station &rarr; Alerts</em>. These users ONLY receive alerts for that station.</li>
                        <li><strong>Global Fallback:</strong> If a station has no custom recipients, it sends to the Global Email list (configured in Settings).</li>
                        <li><strong>Monitor All Streams:</strong> Enable this in Settings to send alerts to the Global list for <em>every</em> station, even if it has its own custom recipients.</li>
                    </ul>
                </div>

                <div className="bg-[#fbbf24]/10 p-4 rounded-lg border border-[#fbbf24]/20 mt-4">
                    <p className="text-[#fbbf24] text-sm font-medium">⚠️ Security Note: Your SMTP password is encrypted with AES-256 before being stored in the database.</p>
                </div>
            </div>
        )
    },
    'relay-restreaming': {
        title: 'Stream Relay & Fallback',
        content: (
            <div className="space-y-4 text-[#8896ab]">
                <p>StreamDock can pull audio from external stream URLs and rebroadcast it through your stations. This is useful for syndicating content or creating automatic failovers.</p>

                <h3 className="text-white font-bold text-lg mt-6">Badge Color Legend</h3>
                <div className="bg-[#0f1633] border border-[#1e2337] rounded-lg p-4 mt-2 space-y-3">
                    <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full border bg-[#10b981]/10 text-[#10b981] border-[#10b981]/20">AUTO FALLBACK</span>
                        <span className="text-sm">Fallback is <strong>actively streaming</strong> (encoder disconnected)</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 text-xs font-bold rounded-full border bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20">AUTO FALLBACK</span>
                        <span className="text-sm">Fallback is <strong>on standby</strong> (encoder is live)</span>
                    </div>
                </div>
                <p className="text-sm text-[#64748b]">Badge updates automatically within 5 seconds — no page refresh needed!</p>

                <h3 className="text-white font-bold text-lg mt-6">Setting Up a Relay</h3>
                <ol className="list-decimal pl-5 space-y-2">
                    <li>Click <strong>Edit</strong> on any station card</li>
                    <li>Scroll to the <strong>External Source</strong> section</li>
                    <li>Enter the external stream URL (e.g., <code>https://stream.example.com/mount</code>)</li>
                    <li>Click <strong>Test URL</strong> to validate the stream</li>
                    <li>Toggle <strong>Enable Relay</strong> on</li>
                    <li>Choose your relay mode</li>
                </ol>

                <h3 className="text-white font-bold text-lg mt-6">Relay Modes</h3>
                <div className="bg-[#0f1633] border border-[#1e2337] rounded-lg p-4 mt-2 space-y-4">
                    <div>
                        <h4 className="text-white font-medium">🎯 Primary Mode</h4>
                        <p className="text-sm">The external stream IS the station. No encoder needed. The relay starts automatically when the server boots.</p>
                        <p className="text-sm mt-1"><em>Use for: 24/7 syndicated content, network feeds, backup stations</em></p>
                    </div>
                    <div className="pt-3 border-t border-[#1e2337]">
                        <h4 className="text-white font-medium">🔄 Fallback Mode</h4>
                        <p className="text-sm">Your encoder is the primary source. If the encoder disconnects, StreamDock automatically switches to the relay URL. When the encoder returns, it switches back.</p>
                        <p className="text-sm mt-1"><em>Use for: Automated failover, dead air prevention, backup programming</em></p>
                    </div>
                </div>

                <h3 className="text-white font-bold text-lg mt-6">Supported Formats</h3>
                <p>StreamDock can relay most common streaming formats:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>MP3</strong> (audio/mpeg) - Most common</li>
                    <li><strong>AAC</strong> (audio/aac, audio/aacp)</li>
                    <li><strong>Ogg Vorbis</strong> (audio/ogg)</li>
                    <li><strong>Opus</strong> (audio/opus)</li>
                </ul>

                <div className="bg-[#4b7baf]/10 p-4 rounded-lg border border-[#4b7baf]/20 mt-4">
                    <p className="text-[#4b7baf] text-sm font-medium">💡 Tip: Always use the "Test URL" button to verify your external stream before enabling relay. This checks connectivity and detects the audio format.</p>
                </div>
            </div>
        )
    },
    'diagnostics': {
        title: 'System Diagnostics & Logs',
        content: (
            <div className="space-y-4 text-[#8896ab]">
                <p>The Diagnostics page provides comprehensive system monitoring and advanced log management for debugging your Icecast server.</p>

                <h3 className="text-white font-bold text-lg mt-6">Real-Time Monitoring</h3>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Icecast Status:</strong> Connection status, active mounts, total listeners, and uptime</li>
                    <li><strong>Station Configuration:</strong> View all stations with relay settings and live status</li>
                    <li><strong>Active Relays:</strong> Monitor running relay streams and their health</li>
                    <li><strong>Auto-Refresh:</strong> Updates every 5 seconds automatically</li>
                </ul>

                <h3 className="text-white font-bold text-lg mt-6">Enhanced Log Viewer</h3>
                <p>Navigate to the <strong>Debug Logs</strong> section at the bottom of the Diagnostics page to access powerful log management features:</p>

                <h4 className="text-white font-medium mt-4">Search & Filter</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Text Search:</strong> Find specific errors, mount points, or events instantly</li>
                    <li><strong>Level Filters:</strong> Quick buttons for ERROR, WARN, INFO, DEBUG, RELAY, FALLBACK</li>
                    <li><strong>Entry Count:</strong> See how many logs match your filters (e.g., "Showing 12 of 100 entries")</li>
                </ul>

                <h4 className="text-white font-medium mt-4">Log Management</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Line Numbers:</strong> Each log entry is numbered for easy reference</li>
                    <li><strong>Download:</strong> Export all logs to a timestamped .txt file for offline analysis</li>
                    <li><strong>Clear Logs:</strong> Delete all log entries (with confirmation)</li>
                    <li><strong>Auto-Scroll:</strong> Toggle automatic scrolling to newest log entries</li>
                </ul>

                <h4 className="text-white font-medium mt-4">Understanding Log Colors</h4>
                <div className="bg-[#0f1633] border border-[#1e2337] rounded-lg p-3 mt-2 text-sm space-y-2">
                    <div><span className="text-red-400">• RED</span> = ERROR messages</div>
                    <div><span className="text-yellow-400">• YELLOW</span> = WARN messages</div>
                    <div><span className="text-green-400">• GREEN</span> = RELAY messages</div>
                    <div><span className="text-orange-400">• ORANGE</span> = FALLBACK messages</div>
                    <div><span className="text-blue-400">• BLUE</span> = DEBUG messages</div>
                    <div><span className="text-gray-400">• GRAY</span> = INFO messages</div>
                </div>

                <div className="bg-[#4b7baf]/10 p-4 rounded-lg border border-[#4b7baf]/20 mt-4">
                    <p className="text-[#4b7baf] text-sm font-medium">💡 Tip: Use the search box to quickly find specific mount points, timestamps, or error messages. Combine with level filters for precise debugging.</p>
                </div>
            </div>
        )
    },
    'playlists': {
        title: 'Playlist Manager',
        content: (
            <div className="space-y-4 text-[#8896ab]">
                <p>The Playlist Manager allows you to upload audio files, organize them into playlists, and use them with AutoDJ for automated broadcasting.</p>

                <h3 className="text-white font-bold text-lg mt-6">Audio Library</h3>
                <p>Your library is where all uploaded audio files are stored. Access it from the <strong>Playlists</strong> page in the sidebar.</p>

                <h4 className="text-white font-medium mt-4">Uploading Files</h4>
                <ol className="list-decimal pl-5 space-y-2">
                    <li>Navigate to <strong>Playlists → Library</strong></li>
                    <li>Click the <strong>"Upload Files"</strong> button or drag-and-drop files directly onto the library area</li>
                    <li>Supported formats: <strong>MP3, AAC</strong></li>
                    <li>StreamDock automatically extracts ID3 tags, artwork, duration, bitrate, and other metadata</li>
                </ol>

                <h4 className="text-white font-medium mt-4">Library Features</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Preview:</strong> Click the Play button to listen to any track</li>
                    <li><strong>Track Details:</strong> Click the Info icon to view comprehensive file information</li>
                    <li><strong>Add to Playlist:</strong> Click the '+' button next to any track to add it to a playlist</li>
                    <li><strong>Delete Files:</strong> Remove unwanted files from your library</li>
                    <li><strong>Sort & Search:</strong> Organize your library by title, artist, duration, or file size</li>
                </ul>

                <h3 className="text-white font-bold text-lg mt-6">Creating Playlists</h3>
                <ol className="list-decimal pl-5 space-y-2">
                    <li>Click <strong>"New Playlist"</strong> in the playlists sidebar</li>
                    <li>Enter a name for your playlist</li>
                    <li>Click <strong>Create</strong></li>
                </ol>

                <h3 className="text-white font-bold text-lg mt-6">Managing Playlists</h3>
                <h4 className="text-white font-medium mt-4">Adding Tracks</h4>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>From Library:</strong> Click the '+' icon next to any track and select a playlist</li>
                    <li><strong>From Playlist View:</strong> Click "Add Tracks" and browse your library</li>
                </ul>

                <h4 className="text-white font-medium mt-4">Reordering Tracks</h4>
                <p>Drag and drop tracks within a playlist to change the playback order. Grab the grip icon on the left side of each track.</p>

                <h4 className="text-white font-medium mt-4">Removing Tracks</h4>
                <p>Click the trash icon next to any track to remove it from the playlist (this does not delete the file from your library).</p>

                <div className="bg-[#4b7baf]/10 p-4 rounded-lg border border-[#4b7baf]/20 mt-4">
                    <p className="text-[#4b7baf] text-sm font-medium">💡 Tip: Create multiple playlists for different shows, genres, or times of day. You can quickly switch between them in AutoDJ settings.</p>
                </div>
            </div>
        )
    },
    'autodj': {
        title: 'AutoDJ - 24/7 Automation',
        content: (
            <div className="space-y-4 text-[#8896ab]">
                <p>AutoDJ allows your station to broadcast continuously from a playlist without needing a live encoder. Perfect for overnight programming, backup content, or fully automated stations.</p>

                <h3 className="text-white font-bold text-lg mt-6">Setting Up AutoDJ</h3>
                <ol className="list-decimal pl-5 space-y-2">
                    <li>Create a playlist with at least one audio file (see <strong>Playlist Manager</strong>)</li>
                    <li>Click <strong>Edit</strong> on any station card</li>
                    <li>Scroll to the <strong>AutoDJ Settings</strong> section</li>
                    <li>Toggle <strong>Enable AutoDJ</strong> on</li>
                    <li>Select a <strong>Playlist</strong> from the dropdown</li>
                    <li>Choose your <strong>Mode</strong> (Primary or Fallback)</li>
                    <li>Set <strong>Crossfade Duration</strong> (0-10 seconds)</li>
                    <li>Click <strong>Save Changes</strong></li>
                </ol>

                <h3 className="text-white font-bold text-lg mt-6">AutoDJ Modes</h3>
                <div className="bg-[#0f1633] border border-[#1e2337] rounded-lg p-4 mt-2 space-y-4">
                    <div>
                        <h4 className="text-white font-medium">🎯 Primary Mode</h4>
                        <p className="text-sm">AutoDJ is the main source. The station streams continuously from the selected playlist. No encoder is needed.</p>
                        <p className="text-sm mt-1"><em>Best for: 24/7 automated stations, music-only channels, syndicated content</em></p>
                    </div>
                    <div className="pt-3 border-t border-[#1e2337]">
                        <h4 className="text-white font-medium">🔄 Fallback Mode</h4>
                        <p className="text-sm">Your live encoder is the primary source. If the encoder disconnects, AutoDJ automatically takes over and plays the playlist. When your encoder reconnects, it seamlessly switches back.</p>
                        <p className="text-sm mt-1"><em>Best for: Live shows with backup content, preventing dead air during technical issues</em></p>
                    </div>
                </div>

                <h3 className="text-white font-bold text-lg mt-6">Crossfade</h3>
                <p>The crossfade setting creates smooth transitions between tracks by fading out the current song while fading in the next one.</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>0 seconds:</strong> Hard cuts (instant transition)</li>
                    <li><strong>2-4 seconds:</strong> Natural, radio-style transitions</li>
                    <li><strong>6-10 seconds:</strong> Long, smooth blends (club/mix style)</li>
                </ul>

                <h3 className="text-white font-bold text-lg mt-6">Visual Indicators</h3>
                <p>When AutoDJ is active, you'll see a <strong className="text-[#9333ea]">purple "AUTO DJ" badge</strong> on the station card in the Stations page. You can also view AutoDJ settings in the <strong>Diagnostics</strong> page under Station Configuration.</p>

                <h3 className="text-white font-bold text-lg mt-6">Important Notes</h3>
                <div className="bg-[#fbbf24]/10 p-4 rounded-lg border border-[#fbbf24]/20 mt-4">
                    <ul className="space-y-2 text-sm text-[#fbbf24]">
                        <li>⚠️ <strong>Relay + AutoDJ:</strong> You cannot enable both Relay and AutoDJ simultaneously. Choose one or connect a live encoder.</li>
                        <li>⚠️ <strong>Empty Playlists:</strong> AutoDJ will not start if the selected playlist has no tracks. Add at least one file first.</li>
                        <li>⚠️ <strong>Server Restart:</strong> Changing AutoDJ settings requires a Liquidsoap restart, which takes a few seconds.</li>
                    </ul>
                </div>

                <div className="bg-[#4b7baf]/10 p-4 rounded-lg border border-[#4b7baf]/20 mt-4">
                    <p className="text-[#4b7baf] text-sm font-medium">💡 Tip: Use AutoDJ in Fallback mode as a safety net for live shows. If your internet drops or your encoder crashes, listeners will hear music instead of silence.</p>
                </div>
            </div>
        )
    },
    'server-config': {
        title: 'Server Configuration',
        content: (
            <div className="space-y-4 text-[#8896ab]">
                <p>Configure your Icecast server settings directly from the web UI - no SSH required!</p>

                <h3 className="text-white font-bold text-lg mt-6">Accessing Server Config</h3>
                <p>Navigate to <strong>Settings → Server Config</strong> in the sidebar. This opens the server configuration panel.</p>

                <h3 className="text-white font-bold text-lg mt-6">Quick Presets</h3>
                <p>Use the <strong>Quick Preset</strong> dropdown to automatically configure your server based on station size:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Small/Community:</strong> Up to 100 listeners (250 max clients, 5 sources)</li>
                    <li><strong>Regional Public Radio:</strong> 100-500 listeners (750 max clients, 15 sources)</li>
                    <li><strong>Large Market / NPR:</strong> 500+ listeners (2,000 max clients, 30 sources)</li>
                </ul>

                <h3 className="text-white font-bold text-lg mt-6">Server Limits</h3>
                <p><strong>Max Clients:</strong> Maximum simultaneous listeners. <strong>Max Sources:</strong> Maximum encoders/stations.</p>
                <p><strong>Burst Size:</strong> Initial buffer for faster playback start. <strong>Queue Size:</strong> Per-client buffer (higher = smoother, more memory).</p>

                <h3 className="text-white font-bold text-lg mt-6">CORS Settings</h3>
                <div className="bg-[#4b7baf]/10 p-4 rounded-lg border border-[#4b7baf]/20 mt-2">
                    <p className="text-[#4b7baf] text-sm font-medium">💡 <strong>Default: Full Access (*)</strong> - Any website can play your stream. Recommended for public radio to maximize reach.</p>
                </div>

                <h3 className="text-white font-bold text-lg mt-6">Saving Changes</h3>
                <ol className="list-decimal pl-5 space-y-2">
                    <li>Make your configuration changes</li>
                    <li>Click <strong>Save Configuration</strong></li>
                    <li>Click the yellow <strong>Restart Icecast</strong> button</li>
                    <li>Confirm the restart (streams reconnect automatically)</li>
                </ol>
            </div>
        )
    }
};


function HelpCategory({ icon: Icon, title, description, links, onOpenArticle }) {
    return (
        <Card className="h-full hover:border-[#4b7baf]/30 transition-colors group">
            <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-[#4b7baf]/10 group-hover:bg-[#4b7baf]/20 transition-colors">
                        <Icon className="w-5 h-5 text-[#4b7baf]" />
                    </div>
                    <h3 className="text-base font-bold text-white">{title}</h3>
                </div>
                <p className="text-[#94a3b8] text-sm mb-5 h-10 line-clamp-2">{description}</p>
                <div className="space-y-1">
                    {links.map((link, i) => (
                        <button
                            key={i}
                            onClick={() => onOpenArticle(link.id)}
                            className="w-full flex items-center justify-between text-sm text-[#94a3b8] hover:text-white group/link px-2 py-1.5 -mx-2 rounded hover:bg-[#1e2337] transition-all text-left"
                        >
                            <span className="flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 opacity-50 group-hover/link:text-[#4b7baf] group-hover/link:opacity-100 transition-all" />
                                {link.label}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all text-[#4b7baf]" />
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
            icon: FileText,
            title: "Features & Tools",
            description: "Learn about playlists, alerts, automation, and more.",
            links: [
                { id: 'alerts', label: "Understanding Alerts" },
                { id: 'email-alerts', label: "Setting up Email Alerts" },
                { id: 'relay-restreaming', label: "Stream Relay & Fallback" },
                { id: 'playlists', label: "Playlist Manager" },
                { id: 'autodj', label: "AutoDJ - 24/7 Automation" }
            ]
        },
        {
            icon: Server,
            title: "Server Management",
            description: "Configure and monitor your Icecast server settings.",
            links: [
                { id: 'server-config', label: "Server Configuration" },
                { id: 'diagnostics', label: "System Diagnostics & Logs" }
            ]
        },
        {
            icon: Shield,
            title: "Troubleshooting",
            description: "Common issues and how to resolve them quickly.",
            links: [
                { id: 'quick-start', label: "Connection Refused" },
                { id: 'mount-points', label: "Audio Buffering Issues" },
                { id: 'alerts', label: "Alerts Not Appearing" }
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
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="heading-1 text-white">Help Center</h1>
                    <p className="text-[#8896ab] mt-1">Documentation & Support</p>
                </div>
                <div className="relative w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
                    <input
                        type="text"
                        placeholder="Search documentation..."
                        className="w-full bg-[#0d1229] border border-[#1e2337] rounded-lg pl-10 pr-4 py-2 text-white placeholder-[#64748b] focus:outline-none focus:border-[#4b7baf] transition-colors text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Quick Links Grid - Fills available space */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {categories.map((cat, i) => (
                    <HelpCategory
                        key={i}
                        {...cat}
                        onOpenArticle={handleOpenArticle}
                    />
                ))}
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
