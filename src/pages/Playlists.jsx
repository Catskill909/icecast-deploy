import { useState, useEffect, useCallback } from 'react';
import {
    Music, ListMusic, Plus, Search, Upload, Trash2, Edit2, Play,
    GripVertical, Clock, MoreVertical, X, Check, FolderOpen, Info,
    ChevronUp, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import TrackDetailModal from '../components/TrackDetailModal';
import ConfirmModal from '../components/ConfirmModal';
import AlertModal from '../components/AlertModal';

// Format duration in seconds to mm:ss
const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
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

export default function Playlists() {
    // State
    const [activeTab, setActiveTab] = useState('library');
    const [library, setLibrary] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);
    const [playlistTracks, setPlaylistTracks] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(null);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [showNewPlaylist, setShowNewPlaylist] = useState(false);
    const [editingPlaylist, setEditingPlaylist] = useState(null);
    const [selectedTrack, setSelectedTrack] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'file'|'playlist', id, name }
    const [addToPlaylistMenu, setAddToPlaylistMenu] = useState(null); // audioFileId for open dropdown
    const [dragIndex, setDragIndex] = useState(null); // For playlist track reordering

    // Playlist Title Editing
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState('');

    // Alerts
    const [alertModal, setAlertModal] = useState(null);

    // Pagination & Sorting
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(15);
    const [sortConfig, setSortConfig] = useState({ key: 'title', direction: 'asc' });

    // Fetch data on mount
    useEffect(() => {
        fetchLibrary();
        fetchPlaylists();
    }, []);

    // Close playlist dropdown on click outside
    useEffect(() => {
        if (!addToPlaylistMenu) return;
        const handleClickOutside = () => setAddToPlaylistMenu(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [addToPlaylistMenu]);

    // Fetch playlist tracks when selected JSON.stringify(selectedPlaylist) is too aggressive
    useEffect(() => {
        if (selectedPlaylist?.id) {
            fetchPlaylistTracks(selectedPlaylist.id);
        }
    }, [selectedPlaylist?.id]);

    const fetchLibrary = async () => {
        try {
            const res = await fetch('/api/library');
            const data = await res.json();
            setLibrary(data);
        } catch (error) {
            console.error('Error fetching library:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPlaylists = async () => {
        try {
            const res = await fetch('/api/playlists');
            const data = await res.json();
            setPlaylists(data);
        } catch (error) {
            console.error('Error fetching playlists:', error);
        }
    };

    const fetchPlaylistTracks = async (playlistId) => {
        try {
            const res = await fetch(`/api/playlists/${playlistId}`);
            const data = await res.json();
            setPlaylistTracks(data.tracks || []);
        } catch (error) {
            console.error('Error fetching playlist tracks:', error);
        }
    };

    // Create playlist
    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) return;

        try {
            const res = await fetch('/api/playlists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newPlaylistName.trim() })
            });

            if (res.ok) {
                setNewPlaylistName('');
                setShowNewPlaylist(false);
                fetchPlaylists();
            }
        } catch (error) {
            console.error('Error creating playlist:', error);
        }
    };

    // Delete playlist - actual deletion
    const confirmDeletePlaylist = async (id) => {
        try {
            await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
            if (selectedPlaylist?.id === id) {
                setSelectedPlaylist(null);
                setPlaylistTracks([]);
            }
            fetchPlaylists();
        } catch (error) {
            console.error('Error deleting playlist:', error);
        }
    };

    // Show delete confirmation for playlist
    const handleDeletePlaylist = (playlist) => {
        setDeleteConfirm({
            type: 'playlist',
            id: playlist.id,
            name: playlist.name
        });
    };

    // Add track to playlist
    const handleAddToPlaylist = async (audioFileId) => {
        if (!selectedPlaylist) return;

        try {
            await fetch(`/api/playlists/${selectedPlaylist.id}/tracks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioFileId })
            });
            fetchPlaylistTracks(selectedPlaylist.id);
            fetchPlaylists(); // Refresh track counts
        } catch (error) {
            console.error('Error adding track:', error);
        }
    };

    // Add track to any playlist (used from library view)
    const addToAnyPlaylist = async (audioFileId, playlistId) => {
        try {
            await fetch(`/api/playlists/${playlistId}/tracks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioFileId })
            });
            fetchPlaylists(); // Refresh track counts
            setAddToPlaylistMenu(null); // Close dropdown
        } catch (error) {
            console.error('Error adding track:', error);
        }
    };

    // Remove track from playlist
    const handleRemoveTrack = async (trackId) => {
        if (!selectedPlaylist) return;

        try {
            await fetch(`/api/playlists/${selectedPlaylist.id}/tracks/${trackId}`, {
                method: 'DELETE'
            });
            fetchPlaylistTracks(selectedPlaylist.id);
            fetchPlaylists();
        } catch (error) {
            console.error('Error removing track:', error);
        }
    };

    // Drag and drop handlers for playlist reordering
    const handleTrackDragStart = (index) => {
        setDragIndex(index);
    };

    const handleTrackDragOver = (e, overIndex) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === overIndex) return;

        // Reorder locally for visual feedback
        const newTracks = [...playlistTracks];
        const [draggedTrack] = newTracks.splice(dragIndex, 1);
        newTracks.splice(overIndex, 0, draggedTrack);
        setPlaylistTracks(newTracks);
        setDragIndex(overIndex);
    };

    const handleTrackDrop = async () => {
        if (!selectedPlaylist) return;

        try {
            const trackIds = playlistTracks.map(t => t.id);
            await fetch(`/api/playlists/${selectedPlaylist.id}/tracks/reorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trackIds })
            });
        } catch (error) {
            console.error('Error reordering tracks:', error);
            fetchPlaylistTracks(selectedPlaylist.id); // Revert on error
        }
        setDragIndex(null);
    };

    // Rename playlist
    const handleRenamePlaylist = async (newName) => {
        if (!selectedPlaylist || !newName.trim()) return;

        try {
            const res = await fetch(`/api/playlists/${selectedPlaylist.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            });

            if (res.ok) {
                // Update local state
                const updatedPlaylists = playlists.map(p =>
                    p.id === selectedPlaylist.id ? { ...p, name: newName } : p
                );
                setPlaylists(updatedPlaylists);
                setSelectedPlaylist({ ...selectedPlaylist, name: newName });
            }
        } catch (error) {
            console.error('Error renaming playlist:', error);
        }
    };

    const handleSaveTitle = async () => {
        if (tempTitle.trim() && tempTitle.trim() !== selectedPlaylist.name) {
            await handleRenamePlaylist(tempTitle);
        }
        setIsEditingTitle(false);
    };

    // Delete library file - actual deletion
    const confirmDeleteFile = async (id) => {
        try {
            await fetch(`/api/library/${id}`, { method: 'DELETE' });
            fetchLibrary();
        } catch (error) {
            console.error('Error deleting file:', error);
        }
    };

    // Show delete confirmation for file
    const handleDeleteFile = (file) => {
        setDeleteConfirm({
            type: 'file',
            id: file.id,
            name: file.title || file.filename
        });
    };

    // Handle confirm modal action
    const handleConfirmDelete = () => {
        if (!deleteConfirm) return;

        if (deleteConfirm.type === 'file') {
            confirmDeleteFile(deleteConfirm.id);
        } else if (deleteConfirm.type === 'playlist') {
            confirmDeletePlaylist(deleteConfirm.id);
        }
    };

    // Drag and drop handlers for file upload
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    // Upload files to API
    const uploadFiles = async (files) => {
        if (files.length === 0) return;

        setUploadProgress({ current: 0, total: files.length, uploading: true });

        const formData = new FormData();
        files.forEach(file => formData.append('files', file));

        try {
            const res = await fetch('/api/library/upload', {
                method: 'POST',
                body: formData
            });

            const result = await res.json();

            if (res.ok) {
                setUploadProgress({
                    current: files.length,
                    total: files.length,
                    uploading: false,
                    message: result.message
                });
                fetchLibrary(); // Refresh library

                // Clear progress after 3 seconds
                setTimeout(() => setUploadProgress(null), 3000);
            } else {
                const message = result.error || 'Upload failed';
                setUploadProgress({
                    uploading: false,
                    error: message
                });
                setAlertModal({
                    title: 'Upload Failed',
                    message: message,
                    variant: 'error'
                });
            }
        } catch (error) {
            console.error('Upload error:', error);
            const message = error.message || 'An error occurred while uploading.';
            setUploadProgress({ uploading: false, error: message });
            setAlertModal({
                title: 'Upload Failed',
                message: message,
                variant: 'error'
            });
        }
    };

    const handleDrop = useCallback(async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files).filter(f =>
            f.type.startsWith('audio/') ||
            f.name.match(/\.(mp3|ogg|flac|aac|m4a)$/i)
        );

        if (files.length === 0) {
            setAlertModal({
                title: 'Invalid File Type',
                message: 'Please drop audio files only (MP3, OGG, FLAC, AAC).',
                variant: 'error'
            });
            return;
        }

        await uploadFiles(files);
    }, []);

    // Handle file input click
    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files).filter(f =>
            f.type.startsWith('audio/') ||
            f.name.match(/\.(mp3|ogg|flac|aac|m4a)$/i)
        );

        if (files.length === 0) {
            setAlertModal({
                title: 'Invalid File Type',
                message: 'Please select audio files only (MP3, OGG, FLAC, AAC).',
                variant: 'error'
            });
            return;
        }

        await uploadFiles(files);
        e.target.value = ''; // Reset input
    };

    // Sort handler
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
        setCurrentPage(1);
    };

    // Filter, sort, and paginate library
    const filteredLibrary = library.filter(file => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            file.title?.toLowerCase().includes(query) ||
            file.artist?.toLowerCase().includes(query) ||
            file.album?.toLowerCase().includes(query) ||
            file.filename?.toLowerCase().includes(query)
        );
    });

    // Reset page when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    // Sorted library
    const sortedLibrary = [...filteredLibrary].sort((a, b) => {
        const { key, direction } = sortConfig;
        let aVal = a[key] || '';
        let bVal = b[key] || '';

        // Handle numeric values
        if (key === 'duration' || key === 'filesize' || key === 'bitrate') {
            aVal = aVal || 0;
            bVal = bVal || 0;
            return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // String comparison
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Pagination
    const totalPages = Math.ceil(sortedLibrary.length / itemsPerPage);
    const paginatedLibrary = sortedLibrary.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Calculate total duration
    const totalDuration = playlistTracks.reduce((sum, t) => sum + (t.duration || 0), 0);

    const tabs = [
        { id: 'library', label: 'Audio Library', icon: Music },
        { id: 'playlists', label: 'Playlists', icon: ListMusic },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="heading-1 text-white flex items-center gap-3">
                        <ListMusic className="w-8 h-8 text-[#4b7baf]" />
                        Playlist Manager
                    </h1>
                    <p className="text-[#8896ab] mt-2">Manage your audio library and create playlists</p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-[#1e2337] pb-3">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                            ? 'bg-[#4b7baf]/15 text-[#6b9fd4]'
                            : 'text-[#8896ab] hover:bg-[#151b30] hover:text-white'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Library Tab */}
            {activeTab === 'library' && (
                <div className="space-y-4">
                    {/* Upload Zone - Click or Drag */}
                    <input
                        type="file"
                        id="audio-file-input"
                        multiple
                        accept=".mp3,.ogg,.flac,.aac,.m4a,audio/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <label
                        htmlFor="audio-file-input"
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className={`block border-2 border-dashed rounded-xl p-6 text-center transition-all ${uploadProgress?.uploading
                            ? 'border-[#4b7baf] bg-[#4b7baf]/10 pointer-events-none'
                            : isDragging
                                ? 'border-[#4b7baf] bg-[#4b7baf]/10'
                                : 'border-[#2d3555] hover:border-[#4b7baf]/50 hover:bg-[#1e2337]/30 cursor-pointer'
                            }`}
                    >
                        {uploadProgress?.uploading ? (
                            <>
                                <div className="w-8 h-8 mx-auto mb-2 border-2 border-[#4b7baf] border-t-transparent rounded-full animate-spin" />
                                <p className="text-white font-medium">Uploading {uploadProgress.total} file(s)...</p>
                                <p className="text-[#64748b] text-sm mt-1">Please wait</p>
                            </>
                        ) : uploadProgress?.message ? (
                            <>
                                <Check className="w-8 h-8 mx-auto mb-2 text-[#4ade80]" />
                                <p className="text-[#4ade80] font-medium">{uploadProgress.message}</p>
                            </>
                        ) : uploadProgress?.error ? (
                            <>
                                <X className="w-8 h-8 mx-auto mb-2 text-red-400" />
                                <p className="text-red-400 font-medium">Upload failed</p>
                                <p className="text-[#64748b] text-sm mt-1">{uploadProgress.error}</p>
                            </>
                        ) : (
                            <>
                                <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-[#4b7baf]' : 'text-[#64748b]'}`} />
                                <p className="text-white font-medium">Drop audio files here or click to browse</p>
                                <p className="text-[#64748b] text-sm mt-1">
                                    MP3, AAC, OGG, FLAC • Max 400MB per file
                                </p>
                            </>
                        )}
                    </label>

                    {/* Search Bar */}
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
                        <input
                            type="text"
                            placeholder="Search by title, artist..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-[#0d1229] border border-[#2d3555] rounded-lg text-white placeholder-[#64748b] focus:border-[#4b7baf] focus:outline-none"
                        />
                    </div>

                    {/* Library Table */}
                    <Card>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="p-8 text-center text-[#64748b]">Loading library...</div>
                            ) : filteredLibrary.length === 0 ? (
                                <div className="p-12 text-center">
                                    <FolderOpen className="w-12 h-12 mx-auto mb-3 text-[#64748b]" />
                                    <p className="text-[#8896ab]">
                                        {library.length === 0
                                            ? 'No audio files in library'
                                            : 'No files match your search'}
                                    </p>
                                    <p className="text-[#64748b] text-sm mt-1">
                                        Drag and drop audio files above to get started
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="border-b border-[#1e2337]">
                                            <tr className="text-left text-xs uppercase tracking-wider text-[#64748b]">
                                                <th
                                                    className="px-4 py-3 font-medium cursor-pointer hover:text-white transition-colors select-none"
                                                    onClick={() => handleSort('title')}
                                                >
                                                    <span className="flex items-center gap-1">
                                                        <span style={{ color: sortConfig.key === 'title' ? '#ffffff' : '#64748b' }}>Title</span>
                                                        {sortConfig.key === 'title' && sortConfig.direction === 'desc'
                                                            ? <ChevronDown className="w-3.5 h-3.5 text-[#4b7baf]" />
                                                            : <ChevronUp className={`w-3.5 h-3.5 ${sortConfig.key === 'title' ? 'text-[#4b7baf]' : 'opacity-40'}`} />
                                                        }
                                                    </span>
                                                </th>
                                                <th
                                                    className="px-4 py-3 font-medium cursor-pointer hover:text-white transition-colors select-none"
                                                    onClick={() => handleSort('artist')}
                                                >
                                                    <span className="flex items-center gap-1">
                                                        <span style={{ color: sortConfig.key === 'artist' ? '#ffffff' : '#64748b' }}>Artist</span>
                                                        {sortConfig.key === 'artist' && sortConfig.direction === 'desc'
                                                            ? <ChevronDown className="w-3.5 h-3.5 text-[#4b7baf]" />
                                                            : <ChevronUp className={`w-3.5 h-3.5 ${sortConfig.key === 'artist' ? 'text-[#4b7baf]' : 'opacity-40'}`} />
                                                        }
                                                    </span>
                                                </th>
                                                <th
                                                    className="px-4 py-3 font-medium cursor-pointer hover:text-white transition-colors select-none"
                                                    onClick={() => handleSort('album')}
                                                >
                                                    <span className="flex items-center gap-1">
                                                        <span style={{ color: sortConfig.key === 'album' ? '#ffffff' : '#64748b' }}>Album</span>
                                                        {sortConfig.key === 'album' && sortConfig.direction === 'desc'
                                                            ? <ChevronDown className="w-3.5 h-3.5 text-[#4b7baf]" />
                                                            : <ChevronUp className={`w-3.5 h-3.5 ${sortConfig.key === 'album' ? 'text-[#4b7baf]' : 'opacity-40'}`} />
                                                        }
                                                    </span>
                                                </th>
                                                <th
                                                    className="px-4 py-3 font-medium cursor-pointer hover:text-white transition-colors select-none"
                                                    onClick={() => handleSort('duration')}
                                                >
                                                    <span className="flex items-center gap-1">
                                                        <span style={{ color: sortConfig.key === 'duration' ? '#ffffff' : '#64748b' }}>Duration</span>
                                                        {sortConfig.key === 'duration' && sortConfig.direction === 'desc'
                                                            ? <ChevronDown className="w-3.5 h-3.5 text-[#4b7baf]" />
                                                            : <ChevronUp className={`w-3.5 h-3.5 ${sortConfig.key === 'duration' ? 'text-[#4b7baf]' : 'opacity-40'}`} />
                                                        }
                                                    </span>
                                                </th>
                                                <th
                                                    className="px-4 py-3 font-medium cursor-pointer hover:text-white transition-colors select-none"
                                                    onClick={() => handleSort('format')}
                                                >
                                                    <span className="flex items-center gap-1">
                                                        <span style={{ color: sortConfig.key === 'format' ? '#ffffff' : '#64748b' }}>Format</span>
                                                        {sortConfig.key === 'format' && sortConfig.direction === 'desc'
                                                            ? <ChevronDown className="w-3.5 h-3.5 text-[#4b7baf]" />
                                                            : <ChevronUp className={`w-3.5 h-3.5 ${sortConfig.key === 'format' ? 'text-[#4b7baf]' : 'opacity-40'}`} />
                                                        }
                                                    </span>
                                                </th>
                                                <th
                                                    className="px-4 py-3 font-medium cursor-pointer hover:text-white transition-colors select-none"
                                                    onClick={() => handleSort('filesize')}
                                                >
                                                    <span className="flex items-center gap-1">
                                                        <span style={{ color: sortConfig.key === 'filesize' ? '#ffffff' : '#64748b' }}>Size</span>
                                                        {sortConfig.key === 'filesize' && sortConfig.direction === 'desc'
                                                            ? <ChevronDown className="w-3.5 h-3.5 text-[#4b7baf]" />
                                                            : <ChevronUp className={`w-3.5 h-3.5 ${sortConfig.key === 'filesize' ? 'text-[#4b7baf]' : 'opacity-40'}`} />
                                                        }
                                                    </span>
                                                </th>
                                                <th className="px-4 py-3 font-medium w-20"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#1e2337]">
                                            {paginatedLibrary.map((file) => (
                                                <tr
                                                    key={file.id}
                                                    className="hover:bg-[#151b30] group cursor-pointer transition-colors"
                                                    onClick={() => setSelectedTrack(file)}
                                                >
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex items-center gap-3">
                                                            {/* Album art thumbnail */}
                                                            <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#1e2337] flex-shrink-0 relative">
                                                                <img
                                                                    src={`/api/library/${file.id}/artwork`}
                                                                    alt=""
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                        e.target.nextSibling.style.display = 'flex';
                                                                    }}
                                                                />
                                                                <div className="absolute inset-0 items-center justify-center hidden bg-[#1e2337]">
                                                                    <Music className="w-4 h-4 text-[#4b7baf]" />
                                                                </div>
                                                            </div>
                                                            <div className="min-w-0">
                                                                <span className="text-[#8896ab] font-medium block truncate max-w-[180px] group-hover:text-white transition-colors">
                                                                    {file.title || file.filename}
                                                                </span>
                                                                {/* Click hint - shows on hover */}
                                                                <span className="text-[#64748b] text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                                    <Info className="w-3 h-3" />
                                                                    Click for details
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-[#8896ab]">{file.artist || '—'}</td>
                                                    <td className="px-4 py-3 text-[#8896ab]">{file.album || '—'}</td>
                                                    <td className="px-4 py-3 text-[#8896ab]">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {formatDuration(file.duration)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-0.5 bg-[#4b7baf]/15 text-[#6b9fd4] text-xs rounded uppercase">
                                                            {file.format || 'MP3'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-[#64748b] text-sm">
                                                        {formatFileSize(file.filesize)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Toggle or open new
                                                                    if (addToPlaylistMenu?.id === file.id) {
                                                                        setAddToPlaylistMenu(null);
                                                                    } else {
                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                        setAddToPlaylistMenu({
                                                                            id: file.id,
                                                                            top: rect.top,
                                                                            bottom: rect.bottom,
                                                                            right: rect.right
                                                                        });
                                                                    }
                                                                }}
                                                                className={`w-8 h-8 flex items-center justify-center rounded transition-all shadow-sm ${addToPlaylistMenu?.id === file.id
                                                                    ? 'bg-[#4b7baf] text-white ring-2 ring-[#4b7baf]/30'
                                                                    : 'bg-[#1e2337] border border-[#2d3555] text-[#4b7baf] hover:bg-[#4b7baf] hover:text-white hover:border-[#4b7baf]'
                                                                    }`}
                                                                title="Add to playlist"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteFile(file); }}
                                                                className="p-1.5 rounded hover:bg-red-500/20 text-red-400"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Stats & Pagination */}
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex gap-4 text-[#64748b]">
                            <span>{library.length} files in library</span>
                            {searchQuery && <span>• {filteredLibrary.length} matching</span>}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 rounded-lg hover:bg-[#1e2337] text-[#8896ab] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                <span className="text-[#8896ab] tabular-nums px-2">
                                    Page {currentPage} of {totalPages}
                                </span>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 rounded-lg hover:bg-[#1e2337] text-[#8896ab] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Playlists Tab */}
            {activeTab === 'playlists' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Playlist List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="heading-2 text-white">Your Playlists</h2>
                            <button
                                onClick={() => setShowNewPlaylist(true)}
                                className="p-2 rounded-lg bg-[#4b7baf]/15 text-[#6b9fd4] hover:bg-[#4b7baf]/25 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        {/* New Playlist Input */}
                        {showNewPlaylist && (
                            <Card>
                                <CardContent className="p-3">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Playlist name..."
                                            value={newPlaylistName}
                                            onChange={(e) => setNewPlaylistName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                                            className="flex-1 px-3 py-2 bg-[#0d1229] border border-[#2d3555] rounded-md text-white placeholder-[#64748b] text-sm focus:border-[#4b7baf] focus:outline-none"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleCreatePlaylist}
                                            className="p-2 rounded-md bg-[#4b7baf] text-white hover:bg-[#5d8dc0]"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => { setShowNewPlaylist(false); setNewPlaylistName(''); }}
                                            className="p-2 rounded-md bg-[#1e2337] text-[#8896ab] hover:bg-[#2d3555]"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Playlist Cards */}
                        <div className="space-y-2">
                            {playlists.length === 0 ? (
                                <Card>
                                    <CardContent className="p-6 text-center">
                                        <ListMusic className="w-10 h-10 mx-auto mb-2 text-[#64748b]" />
                                        <p className="text-[#8896ab]">No playlists yet</p>
                                        <p className="text-[#64748b] text-sm mt-1">Create one to get started</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                playlists.map((playlist) => (
                                    <button
                                        key={playlist.id}
                                        onClick={() => setSelectedPlaylist(playlist)}
                                        className={`w-full text-left p-4 rounded-lg border transition-all ${selectedPlaylist?.id === playlist.id
                                            ? 'bg-[#4b7baf]/15 border-[#4b7baf]/50'
                                            : 'bg-[#1e2337] border-[#2d3555] hover:border-[#4b7baf]/30'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-medium text-white">{playlist.name}</h3>
                                                <p className="text-sm text-[#64748b] mt-0.5">
                                                    {playlist.trackCount || 0} tracks
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeletePlaylist(playlist); }}
                                                className="p-1.5 rounded hover:bg-red-500/20 text-[#64748b] hover:text-red-400"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Playlist Editor */}
                    <div className="lg:col-span-3">
                        {selectedPlaylist ? (
                            <Card>
                                <CardContent className="p-0">
                                    {/* Header */}
                                    <div className="p-4 border-b border-[#1e2337]">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 max-w-lg">

                                                {isEditingTitle ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={tempTitle}
                                                            onChange={(e) => setTempTitle(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleSaveTitle();
                                                                if (e.key === 'Escape') setIsEditingTitle(false);
                                                            }}
                                                            className="text-xl font-bold text-white bg-[#151b30] border border-[#4b7baf] rounded px-3 py-1 outline-none flex-1 transition-all"
                                                            autoFocus
                                                            placeholder="Playlist Name"
                                                        />
                                                        <button
                                                            onClick={handleSaveTitle}
                                                            className="p-1.5 rounded bg-[#4b7baf]/20 text-[#4b7baf] hover:bg-[#4b7baf]/30 transition-colors"
                                                            title="Save"
                                                        >
                                                            <Check className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => setIsEditingTitle(false)}
                                                            className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                                                            title="Cancel"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3 group">
                                                        <h2 className="text-xl font-bold text-white cursor-pointer" onClick={() => {
                                                            setTempTitle(selectedPlaylist.name);
                                                            setIsEditingTitle(true);
                                                        }}>
                                                            {selectedPlaylist.name}
                                                        </h2>
                                                        <button
                                                            onClick={() => {
                                                                setTempTitle(selectedPlaylist.name);
                                                                setIsEditingTitle(true);
                                                            }}
                                                            className="p-1.5 rounded hover:bg-[#151b30] text-[#64748b] hover:text-white transition-all"
                                                            title="Edit Title"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                                <p className="text-sm text-[#64748b] mt-1">
                                                    {playlistTracks.length} tracks • {formatDuration(totalDuration)} total
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Track List */}
                                    {playlistTracks.length === 0 ? (
                                        <div className="p-12 text-center">
                                            <Music className="w-10 h-10 mx-auto mb-3 text-[#64748b]" />
                                            <p className="text-[#8896ab]">No tracks in this playlist</p>
                                            <p className="text-[#64748b] text-sm mt-1">
                                                Go to the Library tab to add songs
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            {/* Subtle hint */}
                                            <div className="px-4 py-2 text-xs text-[#64748b] flex items-center gap-1">
                                                <GripVertical className="w-3 h-3" />
                                                Drag tracks to reorder
                                            </div>
                                            <div className="divide-y divide-[#1e2337] max-h-[500px] overflow-y-auto">
                                                {playlistTracks.map((track, index) => (
                                                    <div
                                                        key={track.id}
                                                        draggable
                                                        onDragStart={() => handleTrackDragStart(index)}
                                                        onDragOver={(e) => handleTrackDragOver(e, index)}
                                                        onDragEnd={handleTrackDrop}
                                                        className={`flex items-center gap-3 px-4 py-2 hover:bg-[#151b30] group cursor-grab active:cursor-grabbing transition-colors ${dragIndex === index ? 'bg-[#1e2337] opacity-50' : ''}`}
                                                    >
                                                        {/* Track number */}
                                                        <div className="w-6 text-center text-[#64748b] text-sm">
                                                            {index + 1}
                                                        </div>

                                                        {/* Drag handle */}
                                                        <GripVertical className="w-4 h-4 text-[#64748b] opacity-0 group-hover:opacity-100" />

                                                        {/* Album art */}
                                                        <div className="w-10 h-10 rounded overflow-hidden bg-[#1e2337] flex-shrink-0 relative">
                                                            <img
                                                                src={`/api/library/${track.audio_file_id || track.id}/artwork`}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    e.target.style.display = 'none';
                                                                    e.target.nextSibling.style.display = 'flex';
                                                                }}
                                                            />
                                                            <div className="absolute inset-0 items-center justify-center hidden bg-[#1e2337]">
                                                                <Music className="w-4 h-4 text-[#4b7baf]" />
                                                            </div>
                                                        </div>

                                                        {/* Track info */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-white truncate">{track.title || track.filename}</p>
                                                            <p className="text-sm text-[#64748b] truncate">{track.artist || 'Unknown Artist'}</p>
                                                        </div>

                                                        {/* Duration */}
                                                        <span className="text-sm text-[#64748b]">{formatDuration(track.duration)}</span>

                                                        {/* Preview button */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedTrack({ ...track, id: track.audio_file_id || track.id });
                                                            }}
                                                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-black hover:scale-110 opacity-0 group-hover:opacity-100 transition-all shadow-lg mx-2"
                                                            title="Preview"
                                                        >
                                                            <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                                                        </button>

                                                        {/* Remove button */}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleRemoveTrack(track.id); }}
                                                            className="p-1.5 rounded hover:bg-red-500/20 text-[#64748b] hover:text-red-400 opacity-0 group-hover:opacity-100"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <ListMusic className="w-12 h-12 mx-auto mb-3 text-[#64748b]" />
                                    <p className="text-[#8896ab]">Select a playlist to edit</p>
                                    <p className="text-[#64748b] text-sm mt-1">
                                        Or create a new one to get started
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            )}

            {/* Track Detail Modal */}
            {selectedTrack && (
                <TrackDetailModal
                    track={selectedTrack}
                    onClose={() => setSelectedTrack(null)}
                />
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={handleConfirmDelete}
                title={deleteConfirm?.type === 'playlist' ? 'Delete Playlist' : 'Delete Track'}
                message={deleteConfirm?.type === 'playlist'
                    ? 'Are you sure you want to delete this playlist? This will remove all tracks from the playlist.'
                    : 'Are you sure you want to delete this file from the library? This cannot be undone.'
                }
                itemName={deleteConfirm?.name}
                confirmText="Delete"
                confirmVariant="danger"
            />

            {/* Fixed Add to Playlist Menu */}
            {addToPlaylistMenu && (() => {
                const activeFile = library.find(f => f.id === addToPlaylistMenu.id);
                if (!activeFile) return null; // Should not happen

                // Calculate position
                const spaceBelow = window.innerHeight - addToPlaylistMenu.bottom;
                const showAbove = spaceBelow < 250; // Threshold for showing above

                const style = {
                    left: Math.max(16, addToPlaylistMenu.right - 224),
                    width: '14rem' // w-56
                };

                if (showAbove) {
                    style.bottom = window.innerHeight - addToPlaylistMenu.top + 6;
                    style.transformOrigin = 'bottom right';
                } else {
                    style.top = addToPlaylistMenu.bottom + 6;
                    style.transformOrigin = 'top right';
                }

                return (
                    <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setAddToPlaylistMenu(null)} />
                        <div
                            className="fixed z-[70] bg-[#1e2337] rounded-lg shadow-xl border border-[#2d3555] py-1 animate-in fade-in zoom-in-95 duration-100"
                            style={style}
                        >
                            <div className="px-3 py-2 text-xs text-[#64748b] uppercase tracking-wide border-b border-[#2d3555] font-semibold truncate">
                                ADD TO PLAYLIST
                            </div>
                            <div className="max-h-56 overflow-y-auto">
                                {playlists.length === 0 ? (
                                    <div className="px-3 py-4 text-sm text-[#8896ab] text-center italic">
                                        No playlists found
                                    </div>
                                ) : (
                                    playlists.map(pl => (
                                        <button
                                            key={pl.id}
                                            onClick={() => addToAnyPlaylist(activeFile.id, pl.id)}
                                            className="w-full text-left px-3 py-2.5 text-sm text-[#c8d0df] hover:bg-[#4b7baf] hover:text-white flex items-center gap-2 transition-colors border-l-2 border-transparent hover:border-white"
                                        >
                                            <ListMusic className="w-4 h-4 shrink-0" />
                                            <span className="truncate">{pl.name}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                            <div className="border-t border-[#2d3555] mt-1 pt-1">
                                <button
                                    onClick={() => {
                                        setAddToPlaylistMenu(null);
                                        setShowNewPlaylist(true);
                                        setActiveTab('playlists');
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-[#4b7baf] hover:bg-[#151b30] flex items-center gap-2 font-medium"
                                >
                                    <Plus className="w-4 h-4 shrink-0" />
                                    New Playlist
                                </button>
                            </div>
                        </div>
                    </>
                );
            })()}

            {/* Alert Modal */}
            <AlertModal
                isOpen={!!alertModal}
                onClose={() => setAlertModal(null)}
                title={alertModal?.title}
                message={alertModal?.message}
                variant={alertModal?.variant}
            />
        </div>
    );
}
