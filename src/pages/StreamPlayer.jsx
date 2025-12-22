import { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Radio,
  Music,
  Users,
  Wifi,
  ExternalLink,
  Copy,
  Check,
  SkipBack,
  SkipForward
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import { mountPoints, servers } from '../data/mockData';

function StreamCard({ mount, isPlaying, onPlay }) {
  const [copied, setCopied] = useState(false);
  const server = servers.find(s => s.id === mount.serverId);
  const streamUrl = `https://${server?.hostname}:${server?.port}${mount.name}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(streamUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card hover className={`transition-all ${isPlaying ? 'ring-2 ring-[#4b7baf]' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => onPlay(mount)}
            disabled={!mount.sourceConnected}
            className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${
              mount.sourceConnected
                ? isPlaying
                  ? 'bg-[#4b7baf] text-white'
                  : 'bg-[#4b7baf]/20 text-[#4b7baf] hover:bg-[#4b7baf] hover:text-white'
                : 'bg-[#2d3555] text-[#64748b] cursor-not-allowed'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-white">{mount.name}</h3>
              <StatusBadge 
                status={mount.sourceConnected ? 'online' : 'offline'} 
                showDot={true}
              />
            </div>
            <p className="text-sm text-[#64748b] mb-2">{server?.name}</p>
            
            {mount.sourceConnected && (
              <div className="flex items-center gap-2 mb-2">
                <Music className="w-3 h-3 text-[#4ade80]" />
                <span className="text-sm text-[#94a3b8] truncate">
                  {mount.metadata.artist} - {mount.metadata.title}
                </span>
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-[#64748b]">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {mount.listeners}
              </span>
              <span className="flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                {mount.bitrate}kbps
              </span>
              <span>{mount.format}</span>
            </div>
          </div>

          <button
            onClick={copyUrl}
            className="p-2 rounded-lg text-[#64748b] hover:text-white hover:bg-[#2d3555] transition-colors"
            title="Copy stream URL"
          >
            {copied ? <Check className="w-4 h-4 text-[#4ade80]" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function NowPlaying({ mount, isPlaying, onToggle, volume, onVolumeChange }) {
  const server = servers.find(s => s.id === mount?.serverId);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);

  const toggleMute = () => {
    if (isMuted) {
      onVolumeChange(prevVolume);
    } else {
      setPrevVolume(volume);
      onVolumeChange(0);
    }
    setIsMuted(!isMuted);
  };

  if (!mount) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-[#2d3555] flex items-center justify-center mx-auto mb-4">
            <Radio className="w-10 h-10 text-[#64748b]" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Stream Selected</h3>
          <p className="text-sm text-[#94a3b8]">
            Select a stream from the list to start listening
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Album Art / Visualizer */}
      <div className="relative h-48 bg-gradient-to-br from-[#4b7baf] to-[#4a9b9f] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 text-center">
          <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 border border-white/20">
            <Music className="w-12 h-12 text-white" />
          </div>
          {isPlaying && (
            <div className="flex items-center justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-white rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 20 + 10}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-6">
        {/* Track Info */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white mb-1">
            {mount.metadata.title}
          </h2>
          <p className="text-[#94a3b8]">{mount.metadata.artist}</p>
          <p className="text-sm text-[#64748b] mt-2">
            {mount.name} • {server?.name}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button className="p-2 rounded-full text-[#64748b] hover:text-white transition-colors">
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={onToggle}
            className="w-14 h-14 rounded-full bg-[#4b7baf] text-white flex items-center justify-center hover:bg-[#5d8aa8] transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </button>
          <button className="p-2 rounded-full text-[#64748b] hover:text-white transition-colors">
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className="p-2 rounded-lg text-[#64748b] hover:text-white transition-colors"
          >
            {volume === 0 || isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => {
              onVolumeChange(parseInt(e.target.value));
              if (isMuted) setIsMuted(false);
            }}
            className="flex-1 h-2 bg-[#2d3555] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-[#4b7baf]
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:hover:bg-[#5d8aa8]"
          />
          <span className="text-sm text-[#64748b] w-8">{volume}%</span>
        </div>

        {/* Stream Info */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#2d3555]">
          <div className="text-center">
            <p className="text-lg font-semibold text-white">{mount.format}</p>
            <p className="text-xs text-[#64748b]">Format</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-white">{mount.bitrate}</p>
            <p className="text-xs text-[#64748b]">kbps</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-white">{mount.sampleRate}</p>
            <p className="text-xs text-[#64748b]">Hz</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StreamPlayer() {
  const [currentMount, setCurrentMount] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(75);
  const audioRef = useRef(null);

  const connectedMounts = mountPoints.filter(m => m.sourceConnected);

  const handlePlay = (mount) => {
    if (currentMount?.id === mount.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentMount(mount);
      setIsPlaying(true);
    }
  };

  const handleToggle = () => {
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Stream Player</h1>
        <p className="text-[#94a3b8] mt-1">Test and preview your streams</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Now Playing */}
        <div className="lg:col-span-1">
          <NowPlaying
            mount={currentMount}
            isPlaying={isPlaying}
            onToggle={handleToggle}
            volume={volume}
            onVolumeChange={setVolume}
          />
        </div>

        {/* Stream List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Available Streams</h2>
            <span className="text-sm text-[#64748b]">
              {connectedMounts.length} streams online
            </span>
          </div>

          <div className="space-y-3">
            {connectedMounts.map((mount) => (
              <StreamCard
                key={mount.id}
                mount={mount}
                isPlaying={isPlaying && currentMount?.id === mount.id}
                onPlay={handlePlay}
              />
            ))}
          </div>

          {connectedMounts.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Radio className="w-12 h-12 text-[#64748b] mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No streams available</h3>
                <p className="text-[#94a3b8]">
                  Connect a source to start streaming
                </p>
              </CardContent>
            </Card>
          )}

          {/* Connection Info */}
          <Card>
            <CardHeader>
              <CardTitle>Encoder Connection Info</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#94a3b8] mb-4">
                Use these settings to connect your streaming software (OBS, BUTT, etc.)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#64748b] mb-1">Server</label>
                  <div className="bg-[#0a0e27] rounded-lg px-3 py-2">
                    <code className="text-sm text-[#4b7baf]">stream.example.com</code>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#64748b] mb-1">Port</label>
                  <div className="bg-[#0a0e27] rounded-lg px-3 py-2">
                    <code className="text-sm text-[#4b7baf]">8000</code>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#64748b] mb-1">Mount Point</label>
                  <div className="bg-[#0a0e27] rounded-lg px-3 py-2">
                    <code className="text-sm text-[#4b7baf]">/live</code>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#64748b] mb-1">Password</label>
                  <div className="bg-[#0a0e27] rounded-lg px-3 py-2">
                    <code className="text-sm text-[#4b7baf]">••••••••</code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden audio element for actual playback */}
      <audio ref={audioRef} />
    </div>
  );
}
