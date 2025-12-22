import { useState } from 'react';
import {
  Server,
  Plus,
  Settings,
  Trash2,
  Play,
  Square,
  Radio,
  Mic,
  Calendar,
  Share2,
  Check,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import Input, { Select } from '../components/ui/Input';
import { servers as initialServers, mountPoints, PRODUCTION_HOST, getNextPort, serverTemplates } from '../data/mockData';

const templateIcons = {
  Radio: Radio,
  Mic: Mic,
  Calendar: Calendar,
  Share2: Share2,
};

function ServerCard({ server, onEdit, onDelete }) {
  const serverMounts = mountPoints.filter(m => m.serverId === server.id);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${server.status === 'online' ? 'bg-[#4ade80]/10' :
                server.status === 'warning' ? 'bg-[#fbbf24]/10' : 'bg-[#f87171]/10'
              }`}>
              <Server className={`w-5 h-5 ${server.status === 'online' ? 'text-[#4ade80]' :
                  server.status === 'warning' ? 'text-[#fbbf24]' : 'text-[#f87171]'
                }`} />
            </div>
            <div>
              <h3 className="font-medium text-white">{server.name}</h3>
              <p className="text-sm text-[#64748b]">{server.hostname}:{server.port}</p>
            </div>
          </div>
          <StatusBadge status={server.status} />
        </div>

        <div className="grid grid-cols-3 gap-4 py-4 border-y border-[#1e2337]">
          <div>
            <p className="text-xs text-[#64748b]">Listeners</p>
            <p className="text-lg font-medium text-white">{server.listeners}</p>
          </div>
          <div>
            <p className="text-xs text-[#64748b]">Bandwidth</p>
            <p className="text-lg font-medium text-white">{server.bandwidth}</p>
          </div>
          <div>
            <p className="text-xs text-[#64748b]">Uptime</p>
            <p className="text-lg font-medium text-white">{server.uptime}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-sm text-[#8896ab]">
            <Radio className="w-4 h-4" />
            <span>{serverMounts.length} mount points</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(server)}
              className="p-2 rounded-lg text-[#8896ab] hover:text-white hover:bg-[#1e2337] transition-colors"
              title="Edit server"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(server)}
              className="p-2 rounded-lg text-[#8896ab] hover:text-[#f87171] hover:bg-[#1e2337] transition-colors"
              title="Delete server"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ServerWizard({ isOpen, onClose, editServer = null }) {
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState(editServer ? 'tpl_radio' : null);
  const [config, setConfig] = useState({
    name: editServer?.name || '',
    hostname: editServer?.hostname || PRODUCTION_HOST,
    port: editServer?.port?.toString() || getNextPort().toString(),
    maxListeners: editServer?.maxListeners?.toString() || '500',
  });
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);

  const isEditing = !!editServer;

  const handleDeploy = () => {
    setDeploying(true);
    setTimeout(() => {
      setDeploying(false);
      setDeployed(true);
    }, 1500);
  };

  const resetWizard = () => {
    setStep(1);
    setSelectedTemplate(null);
    setConfig({
      name: '',
      hostname: PRODUCTION_HOST,
      port: getNextPort().toString(),
      maxListeners: '500',
    });
    setDeploying(false);
    setDeployed(false);
    onClose();
  };

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
    const template = serverTemplates.find(t => t.id === templateId);
    if (template) {
      setConfig(prev => ({
        ...prev,
        name: template.name + ' Server',
        maxListeners: template.config.maxListeners.toString(),
      }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetWizard}
      title={isEditing ? 'Edit Server' : 'New Server'}
      size="md"
    >
      {/* Progress Steps - only show for new servers */}
      {!isEditing && !deployed && (
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${step >= s ? 'bg-[#4b7baf] text-white' : 'bg-[#1e2337] text-[#64748b]'
                }`}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 2 && (
                <div className={`w-12 h-0.5 mx-2 transition-colors ${step > s ? 'bg-[#4b7baf]' : 'bg-[#1e2337]'
                  }`} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Choose Template */}
      {step === 1 && !isEditing && (
        <div>
          <p className="text-[#8896ab] mb-6">Select a template to get started quickly</p>

          <div className="space-y-3 mb-6">
            {serverTemplates.map((template) => {
              const Icon = templateIcons[template.icon] || Radio;
              return (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-all ${selectedTemplate === template.id
                      ? 'border-[#4b7baf] bg-[#4b7baf]/10'
                      : 'border-[#1e2337] hover:border-[#2d3555] hover:bg-[#0d1229]'
                    }`}
                >
                  <div className={`p-2.5 rounded-lg ${selectedTemplate === template.id ? 'bg-[#4b7baf]/20' : 'bg-[#1e2337]'
                    }`}>
                    <Icon className={`w-5 h-5 ${selectedTemplate === template.id ? 'text-[#4b7baf]' : 'text-[#8896ab]'
                      }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-white">{template.name}</h4>
                    <p className="text-sm text-[#64748b]">{template.description}</p>
                  </div>
                  {selectedTemplate === template.id && (
                    <Check className="w-5 h-5 text-[#4b7baf]" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!selectedTemplate}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Configure (or Edit mode) */}
      {(step === 2 || isEditing) && !deployed && (
        <div>
          {!isEditing && <p className="text-[#8896ab] mb-6">Configure your server settings</p>}

          <div className="space-y-5 mb-6">
            <Input
              label="Server Name"
              placeholder="My Radio Server"
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
            />

            <Input
              label="Hostname"
              value={config.hostname}
              onChange={(e) => setConfig({ ...config, hostname: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Port"
                type="number"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: e.target.value })}
              />
              <Input
                label="Max Listeners"
                type="number"
                value={config.maxListeners}
                onChange={(e) => setConfig({ ...config, maxListeners: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-between">
            {!isEditing && (
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
            )}
            <div className={isEditing ? 'w-full flex justify-end' : ''}>
              <Button onClick={handleDeploy} loading={deploying}>
                {deploying ? 'Saving...' : isEditing ? 'Save Changes' : 'Deploy Server'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success */}
      {deployed && (
        <div className="text-center py-6">
          <div className="w-14 h-14 rounded-full bg-[#4ade80]/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-[#4ade80]" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {isEditing ? 'Server Updated!' : 'Server Deployed!'}
          </h3>
          <p className="text-[#8896ab] mb-6">
            {isEditing
              ? 'Your changes have been saved.'
              : 'Your server is now being provisioned.'}
          </p>

          <div className="bg-[#0d1229] rounded-lg p-4 mb-6 text-left">
            <p className="text-xs text-[#64748b] mb-2">Server URL</p>
            <code className="text-sm text-[#4b7baf]">
              https://{config.hostname}:{config.port}
            </code>
          </div>

          <Button onClick={resetWizard}>Done</Button>
        </div>
      )}
    </Modal>
  );
}

export default function Servers() {
  const [servers, setServers] = useState(initialServers);
  const [showWizard, setShowWizard] = useState(false);
  const [editingServer, setEditingServer] = useState(null);

  const handleEdit = (server) => {
    setEditingServer(server);
    setShowWizard(true);
  };

  const handleDelete = (server) => {
    if (confirm(`Delete "${server.name}"? This cannot be undone.`)) {
      setServers(servers.filter(s => s.id !== server.id));
    }
  };

  const handleCloseWizard = () => {
    setShowWizard(false);
    setEditingServer(null);
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-1 text-white">Servers</h1>
          <p className="text-[#8896ab] mt-2">Manage your Icecast server instances</p>
        </div>
        <Button icon={Plus} onClick={() => setShowWizard(true)}>
          New Server
        </Button>
      </div>

      {/* Server Grid */}
      {servers.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {servers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Server className="w-12 h-12 text-[#64748b] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No servers yet</h3>
            <p className="text-[#8896ab] mb-6">
              Deploy your first Icecast server to start streaming
            </p>
            <Button icon={Plus} onClick={() => setShowWizard(true)}>
              Deploy Server
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Wizard Modal */}
      <ServerWizard
        isOpen={showWizard}
        onClose={handleCloseWizard}
        editServer={editingServer}
      />
    </div>
  );
}
