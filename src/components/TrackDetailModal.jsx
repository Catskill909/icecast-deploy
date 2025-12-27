import { useState, useRef, useEffect } from 'react';
import {
    X, Play, Pause, Volume2, VolumeX, Volume1, Music, Disc,
    FileAudio, Waves, Info
} from 'lucide-react';

// Format duration in seconds to mm:ss
const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Format file size
const formatFileSize = (bytes) => {
    if (!bytes) return '--';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Default album art placeholder
const defaultArtwork = 'data:image/svg+xml,' + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
    <rect width="200" height="200" fill="#1e2337"/>
    <circle cx="100" cy="100" r="60" stroke="#4b7baf" stroke-width="2" fill="none"/>
    <circle cx="100" cy="100" r="20" fill="#4b7baf"/>
    <path d="M85 70 L130 100 L85 130 Z" fill="#4b7baf" opacity="0.3"/>
  </svg>
`);

export default function TrackDetailModal({ track, onClose }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    const [metadata, setMetadata] = useState(null);
    const [artworkUrl, setArtworkUrl] = useState(defaultArtwork);
    const [isLoading, setIsLoading] = useState(true);

    const audioRef = useRef(null);
    const progressRef = useRef(null);


    // Fetch full metadata
    useEffect(() => {
        if (track?.id) {
            fetchMetadata();
            checkArtwork();
        }
    }, [track?.id]);

    const fetchMetadata = async () => {
        try {
            const res = await fetch(`/api/library/${track.id}/metadata`);
            const data = await res.json();
            setMetadata(data);
        } catch (error) {
            console.error('Error fetching metadata:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const checkArtwork = async () => {
        try {
            const res = await fetch(`/api/library/${track.id}/artwork`);
            if (res.ok) {
                setArtworkUrl(`/api/library/${track.id}/artwork`);
            }
        } catch {
            // Use default artwork
        }
    };

    // Audio event handlers
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleDurationChange = () => setDuration(audio.duration);
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('durationchange', handleDurationChange);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('durationchange', handleDurationChange);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleProgressClick = (e) => {
        if (progressRef.current && audioRef.current && duration) {
            const rect = progressRef.current.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            audioRef.current.currentTime = pos * duration;
        }
    };

    const handleVolumeChange = (e) => {
        const value = parseFloat(e.target.value);
        setVolume(value);
        if (audioRef.current) {
            audioRef.current.volume = value;
        }
        setIsMuted(value === 0);
    };

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    if (!track) return null;

    const data = metadata || track;
    const progress = duration ? (currentTime / duration) * 100 : 0;

    // Volume icon based on level
    const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#12182b] rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl border border-[#2d3555] overflow-visible"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2337] relative z-0 bg-[#12182b] rounded-t-2xl">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Info className="w-5 h-5 text-[#4b7baf]" />
                        Track Details
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-[#1e2337] text-[#8896ab] hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto overflow-x-visible max-h-[calc(90vh-80px)] relative z-10 bg-[#12182b] rounded-b-2xl">
                    {/* Top Section: Artwork + Info + Player */}
                    <div className="flex gap-6 mb-6">
                        {/* Album Artwork */}
                        <div className="flex-shrink-0">
                            <div className="w-36 h-36 rounded-xl overflow-hidden bg-[#1e2337] shadow-lg">
                                <img
                                    src={artworkUrl}
                                    alt="Album artwork"
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.src = defaultArtwork; }}
                                />
                            </div>
                        </div>

                        {/* Track Info + Player */}
                        <div className="flex-1 min-w-0 flex flex-col">
                            {/* Title - smaller with 2 line clamp */}
                            <h3 className="text-xl font-bold text-white line-clamp-2 mb-1 leading-tight">
                                {data.title || 'Unknown Title'}
                            </h3>
                            <p className="text-[#6b9fd4] truncate text-base">
                                {data.artist || 'Unknown Artist'}
                            </p>
                            <p className="text-[#8896ab] text-sm truncate mb-3">
                                {data.album || 'Unknown Album'}
                            </p>

                            {/* Audio Player - Compact */}
                            <div className="bg-[#0d1229] rounded-xl p-3 border border-[#2d3555] mt-auto">
                                <audio
                                    ref={audioRef}
                                    src={`/api/library/${track.id}/stream`}
                                    preload="metadata"
                                />

                                {/* Controls Row */}
                                <div className="flex items-center gap-3">
                                    {/* Play/Pause */}
                                    <button
                                        onClick={togglePlay}
                                        className="w-10 h-10 rounded-full bg-[#4b7baf] hover:bg-[#5d8dc0] text-white flex items-center justify-center transition-colors shadow-lg flex-shrink-0"
                                    >
                                        {isPlaying ? (
                                            <Pause className="w-4 h-4" />
                                        ) : (
                                            <Play className="w-4 h-4 ml-0.5" />
                                        )}
                                    </button>

                                    {/* Time + Progress */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-[#8896ab] w-10 text-right tabular-nums">
                                                {formatDuration(currentTime)}
                                            </span>

                                            {/* Progress Bar */}
                                            <div
                                                ref={progressRef}
                                                onClick={handleProgressClick}
                                                className="flex-1 h-1.5 bg-[#1e2337] rounded-full cursor-pointer overflow-hidden group"
                                            >
                                                <div
                                                    className="h-full bg-gradient-to-r from-[#4b7baf] to-[#6b9fd4] rounded-full transition-all relative"
                                                    style={{ width: `${progress}%` }}
                                                >
                                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </div>

                                            <span className="text-xs text-[#8896ab] w-10 tabular-nums">
                                                {formatDuration(duration || data.duration)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Volume - Simple mute toggle */}
                                    <button
                                        onClick={toggleMute}
                                        className="p-2 rounded-lg hover:bg-[#1e2337] text-[#8896ab] hover:text-white transition-colors"
                                        title={isMuted ? 'Unmute' : 'Mute'}
                                    >
                                        <VolumeIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Metadata Grid - 2x2 */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* File Info */}
                        <div className="bg-[#1e2337]/50 rounded-xl p-4">
                            <h4 className="text-xs font-medium text-[#8896ab] uppercase tracking-wide mb-2.5 flex items-center gap-2">
                                <FileAudio className="w-3.5 h-3.5" />
                                File Info
                            </h4>
                            <dl className="space-y-1.5 text-sm">
                                <div className="flex justify-between gap-2">
                                    <dt className="text-[#64748b]">Filename</dt>
                                    <dd className="text-white truncate max-w-[180px]" title={data.filename}>
                                        {data.filename}
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-[#64748b]">Format</dt>
                                    <dd className="text-white">{data.format || '--'}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-[#64748b]">Size</dt>
                                    <dd className="text-white">{formatFileSize(data.filesize)}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-[#64748b]">Duration</dt>
                                    <dd className="text-white">{formatDuration(data.duration)}</dd>
                                </div>
                            </dl>
                        </div>

                        {/* Audio Quality */}
                        <div className="bg-[#1e2337]/50 rounded-xl p-4">
                            <h4 className="text-xs font-medium text-[#8896ab] uppercase tracking-wide mb-2.5 flex items-center gap-2">
                                <Waves className="w-3.5 h-3.5" />
                                Audio Quality
                            </h4>
                            <dl className="space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-[#64748b]">Bitrate</dt>
                                    <dd className="text-white">{data.bitrate ? `${data.bitrate} kbps` : '--'}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-[#64748b]">Sample Rate</dt>
                                    <dd className="text-white">{data.sampleRate ? `${data.sampleRate} Hz` : '--'}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-[#64748b]">Channels</dt>
                                    <dd className="text-white">{data.channels === 2 ? 'Stereo' : data.channels === 1 ? 'Mono' : data.channels || '--'}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-[#64748b]">Codec</dt>
                                    <dd className="text-white">{data.codec || '--'}</dd>
                                </div>
                            </dl>
                        </div>

                        {/* Track Metadata */}
                        <div className="bg-[#1e2337]/50 rounded-xl p-4">
                            <h4 className="text-xs font-medium text-[#8896ab] uppercase tracking-wide mb-2.5 flex items-center gap-2">
                                <Music className="w-3.5 h-3.5" />
                                Track Info
                            </h4>
                            <dl className="space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-[#64748b]">Genre</dt>
                                    <dd className="text-white truncate max-w-[150px]">{Array.isArray(data.genre) ? data.genre.join(', ') : data.genre || '--'}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-[#64748b]">Year</dt>
                                    <dd className="text-white">{data.year || '--'}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-[#64748b]">Track #</dt>
                                    <dd className="text-white">
                                        {data.trackNumber ? `${data.trackNumber}${data.trackTotal ? ` / ${data.trackTotal}` : ''}` : '--'}
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-[#64748b]">BPM</dt>
                                    <dd className="text-white">{data.bpm || '--'}</dd>
                                </div>
                            </dl>
                        </div>

                        {/* Album Info */}
                        <div className="bg-[#1e2337]/50 rounded-xl p-4">
                            <h4 className="text-xs font-medium text-[#8896ab] uppercase tracking-wide mb-2.5 flex items-center gap-2">
                                <Disc className="w-3.5 h-3.5" />
                                Album Info
                            </h4>
                            <dl className="space-y-1.5 text-sm">
                                <div className="flex justify-between gap-2">
                                    <dt className="text-[#64748b]">Album</dt>
                                    <dd className="text-white truncate max-w-[150px]">{data.album || '--'}</dd>
                                </div>
                                <div className="flex justify-between gap-2">
                                    <dt className="text-[#64748b]">Album Artist</dt>
                                    <dd className="text-white truncate max-w-[150px]">{data.albumArtist || '--'}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-[#64748b]">Disc #</dt>
                                    <dd className="text-white">
                                        {data.discNumber ? `${data.discNumber}${data.discTotal ? ` / ${data.discTotal}` : ''}` : '--'}
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-[#64748b]">Artwork</dt>
                                    <dd className={data.hasArtwork ? 'text-[#4ade80]' : 'text-[#64748b]'}>
                                        {data.hasArtwork ? 'Embedded' : 'None'}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
