import { useState } from 'react';
import {
  Radio,
  Plus,
  Settings,
  Trash2,
  Copy,
  Check,
  Music
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import Input, { Select } from '../components/ui/Input';
import Toggle from '../components/ui/Toggle';
import { mountPoints as initialMounts, servers, PRODUCTION_HOST } from '../data/mockData';

function MountPointCard({ mount, onEdit, onDelete }) {
  const [copied, setCopied] = useState(false);
  const server = servers.find(s => s.id === mount.serverId);
  const streamUrl = `https://${server?.hostname}:${server?.port}${mount.name}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(streamUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${mount.sourceConnected ? 'bg-[#4ade80]/10' : 'bg-[#f87171]/10'
              }`}>
              <Radio className={`w-5 h-5 ${mount.sourceConnected ? 'text-[#4ade80]' : 'text-[#f87171]'
                }`} />
            </div>
            <div>
              <h3 className="font-medium text-white">{mount.name}</h3>
              <p className="text-sm text-[#64748b]">{server?.name}</p>
            </div>
          </div>
          <StatusBadge status={mount.sourceConnected ? 'online' : 'offline'} />
        </div>

        {/* Now Playing */}
        {mount.sourceConnected && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0d1229] mb-4">
            <Music className="w-4 h-4 text-[#4ade80]" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{mount.metadata.title}</p>
              <p className="text-xs text-[#64748b] truncate">{mount.metadata.artist}</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 py-4 border-y border-[#1e2337]">
          <div className="text-center">
            <p className="text-lg font-medium text-white">{mount.listeners}</p>
            <p className="text-xs text-[#64748b]">Listeners</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-white">{mount.bitrate}</p>
            <p className="text-xs text-[#64748b]">kbps</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-white">{mount.format}</p>
            <p className="text-xs text-[#64748b]">Format</p>
          </div>
        </div>

        {/* Stream URL */}
        <div className="flex items-center gap-2 mt-4 p-2 rounded-lg bg-[#0d1229]">
          <code className="flex-1 text-xs text-[#4b7baf] truncate">{streamUrl}</code>
          <button
            onClick={copyUrl}
            className="p-1.5 rounded text-[#64748b] hover:text-white transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-[#4ade80]" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            onClick={() => onEdit(mount)}
            className="p-2 rounded-lg text-[#8896ab] hover:text-white hover:bg-[#1e2337] transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(mount)}
            className="p-2 rounded-lg text-[#8896ab] hover:text-[#f87171] hover:bg-[#1e2337] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function MountPointEditor({ isOpen, onClose, mount }) {
  const [config, setConfig] = useState({
    name: mount?.name || '/live',
    format: mount?.format || 'MP3',
    bitrate: mount?.bitrate?.toString() || '128',
    maxListeners: mount?.maxListeners?.toString() || '250',
    description: mount?.description || '',
    public: mount?.public ?? true,
  });

  const handleSave = () => {
    console.log('Saving mount point:', config);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mount ? `Edit ${mount.name}` : 'New Mount Point'}
      size="md"
    >
      <div className="space-y-5">
        <Input
          label="Mount Point"
          placeholder="/live"
          value={config.name}
          onChange={(e) => setConfig({ ...config, name: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Format"
            value={config.format}
            onChange={(e) => setConfig({ ...config, format: e.target.value })}
            options={[
              { value: 'MP3', label: 'MP3' },
              { value: 'AAC', label: 'AAC' },
              { value: 'Opus', label: 'Opus' },
              { value: 'Vorbis', label: 'Ogg Vorbis' },
            ]}
          />
          <Select
            label="Bitrate"
            value={config.bitrate}
            onChange={(e) => setConfig({ ...config, bitrate: e.target.value })}
            options={[
              { value: '64', label: '64 kbps' },
              { value: '96', label: '96 kbps' },
              { value: '128', label: '128 kbps' },
              { value: '192', label: '192 kbps' },
              { value: '256', label: '256 kbps' },
              { value: '320', label: '320 kbps' },
            ]}
          />
        </div>

        <Input
          label="Max Listeners"
          type="number"
          value={config.maxListeners}
          onChange={(e) => setConfig({ ...config, maxListeners: e.target.value })}
        />

        <Input
          label="Description"
          placeholder="Stream description..."
          value={config.description}
          onChange={(e) => setConfig({ ...config, description: e.target.value })}
        />

        <Toggle
          label="Public Listing"
          description="Show in public stream directories"
          enabled={config.public}
          onChange={(enabled) => setConfig({ ...config, public: enabled })}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-[#1e2337]">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>
            {mount ? 'Save Changes' : 'Create'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function MountPoints() {
  const [mounts, setMounts] = useState(initialMounts);
  const [showEditor, setShowEditor] = useState(false);
  const [editingMount, setEditingMount] = useState(null);

  const handleEdit = (mount) => {
    setEditingMount(mount);
    setShowEditor(true);
  };

  const handleDelete = (mount) => {
    if (confirm(`Delete "${mount.name}"?`)) {
      setMounts(mounts.filter(m => m.id !== mount.id));
    }
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingMount(null);
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-1 text-white">Mount Points</h1>
          <p className="text-[#8896ab] mt-2">Configure stream endpoints</p>
        </div>
        <Button icon={Plus} onClick={() => setShowEditor(true)}>
          New Mount Point
        </Button>
      </div>

      {/* Mount Points Grid */}
      {mounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mounts.map((mount) => (
            <MountPointCard
              key={mount.id}
              mount={mount}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Radio className="w-12 h-12 text-[#64748b] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No mount points</h3>
            <p className="text-[#8896ab] mb-6">
              Create a mount point to start streaming
            </p>
            <Button icon={Plus} onClick={() => setShowEditor(true)}>
              Create Mount Point
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Editor Modal */}
      <MountPointEditor
        isOpen={showEditor}
        onClose={handleCloseEditor}
        mount={editingMount}
      />
    </div>
  );
}
