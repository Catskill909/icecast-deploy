import { useState } from 'react';
import {
  Shield,
  Lock,
  Key,
  Users,
  Globe,
  AlertTriangle,
  Check,
  X,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Copy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Toggle from '../components/ui/Toggle';
import Modal from '../components/ui/Modal';

function SSLCard() {
  const [isRenewing, setIsRenewing] = useState(false);

  const handleRenew = () => {
    setIsRenewing(true);
    setTimeout(() => setIsRenewing(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#4ade80]/10">
            <Lock className="w-5 h-5 text-[#4ade80]" />
          </div>
          <div>
            <CardTitle>SSL/TLS Certificate</CardTitle>
            <CardDescription>Secure your streams with HTTPS</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-[#0a0e27] rounded-lg">
            <div>
              <p className="text-sm font-medium text-white">stream.example.com</p>
              <p className="text-xs text-[#64748b]">Let's Encrypt</p>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#4ade80]" />
              <span className="text-sm text-[#4ade80]">Valid</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[#64748b]">Issued</p>
              <p className="text-white">Dec 1, 2024</p>
            </div>
            <div>
              <p className="text-[#64748b]">Expires</p>
              <p className="text-white">Mar 1, 2025</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              loading={isRenewing}
              onClick={handleRenew}
            >
              Renew Certificate
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IPAccessControl() {
  const [whitelist, setWhitelist] = useState([
    { ip: '192.168.1.0/24', label: 'Office Network' },
    { ip: '10.0.0.50', label: 'Encoder Server' },
  ]);
  const [blacklist, setBlacklist] = useState([
    { ip: '45.33.32.156', label: 'Suspicious Activity' },
  ]);
  const [newIP, setNewIP] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [activeList, setActiveList] = useState('whitelist');

  const addIP = () => {
    if (!newIP) return;
    const entry = { ip: newIP, label: newLabel || 'No label' };
    if (activeList === 'whitelist') {
      setWhitelist([...whitelist, entry]);
    } else {
      setBlacklist([...blacklist, entry]);
    }
    setNewIP('');
    setNewLabel('');
  };

  const removeIP = (ip, list) => {
    if (list === 'whitelist') {
      setWhitelist(whitelist.filter(item => item.ip !== ip));
    } else {
      setBlacklist(blacklist.filter(item => item.ip !== ip));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#4b7baf]/10">
            <Globe className="w-5 h-5 text-[#4b7baf]" />
          </div>
          <div>
            <CardTitle>IP Access Control</CardTitle>
            <CardDescription>Manage allowed and blocked IP addresses</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveList('whitelist')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeList === 'whitelist'
                  ? 'bg-[#4ade80]/20 text-[#4ade80]'
                  : 'bg-[#2d3555] text-[#94a3b8] hover:text-white'
              }`}
            >
              Whitelist ({whitelist.length})
            </button>
            <button
              onClick={() => setActiveList('blacklist')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeList === 'blacklist'
                  ? 'bg-[#f87171]/20 text-[#f87171]'
                  : 'bg-[#2d3555] text-[#94a3b8] hover:text-white'
              }`}
            >
              Blacklist ({blacklist.length})
            </button>
          </div>

          {/* Add IP */}
          <div className="flex gap-2">
            <Input
              placeholder="IP address or CIDR"
              value={newIP}
              onChange={(e) => setNewIP(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Label (optional)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="flex-1"
            />
            <Button icon={Plus} onClick={addIP}>Add</Button>
          </div>

          {/* IP List */}
          <div className="space-y-2">
            {(activeList === 'whitelist' ? whitelist : blacklist).map((item) => (
              <div
                key={item.ip}
                className="flex items-center justify-between p-3 bg-[#0a0e27] rounded-lg"
              >
                <div>
                  <code className="text-sm text-[#4b7baf]">{item.ip}</code>
                  <p className="text-xs text-[#64748b]">{item.label}</p>
                </div>
                <button
                  onClick={() => removeIP(item.ip, activeList)}
                  className="p-1.5 rounded-lg text-[#64748b] hover:text-[#f87171] hover:bg-[#2d3555] transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SourceAuthentication() {
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState([
    { mount: '/live', password: 'source123', lastChanged: '2024-01-10' },
    { mount: '/hifi', password: 'hifi456', lastChanged: '2024-01-10' },
  ]);

  const regeneratePassword = (mount) => {
    const newPassword = Math.random().toString(36).substring(2, 12);
    setPasswords(passwords.map(p =>
      p.mount === mount
        ? { ...p, password: newPassword, lastChanged: new Date().toISOString().split('T')[0] }
        : p
    ));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#fbbf24]/10">
            <Key className="w-5 h-5 text-[#fbbf24]" />
          </div>
          <div>
            <CardTitle>Source Authentication</CardTitle>
            <CardDescription>Manage encoder passwords for each mount point</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {passwords.map((item) => (
            <div
              key={item.mount}
              className="p-4 bg-[#0a0e27] rounded-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white">{item.mount}</span>
                <span className="text-xs text-[#64748b]">Changed: {item.lastChanged}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-[#1e2337] rounded-lg px-3 py-2 flex items-center justify-between">
                  <code className="text-sm text-[#94a3b8]">
                    {showPassword ? item.password : '••••••••••'}
                  </code>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-[#64748b] hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(item.password)}
                      className="p-1 text-[#64748b] hover:text-white transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={RefreshCw}
                  onClick={() => regeneratePassword(item.mount)}
                >
                  Regenerate
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SecuritySettings() {
  const [settings, setSettings] = useState({
    ddosProtection: true,
    rateLimit: true,
    geoBlocking: false,
    twoFactor: true,
    auditLog: true,
  });

  const updateSetting = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#4a9b9f]/10">
            <Shield className="w-5 h-5 text-[#4a9b9f]" />
          </div>
          <div>
            <CardTitle>Security Settings</CardTitle>
            <CardDescription>Configure security features</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Toggle
            label="DDoS Protection"
            description="Automatically detect and mitigate DDoS attacks"
            enabled={settings.ddosProtection}
            onChange={(v) => updateSetting('ddosProtection', v)}
          />
          <div className="border-t border-[#2d3555]" />
          <Toggle
            label="Rate Limiting"
            description="Limit connection attempts per IP address"
            enabled={settings.rateLimit}
            onChange={(v) => updateSetting('rateLimit', v)}
          />
          <div className="border-t border-[#2d3555]" />
          <Toggle
            label="Geographic Blocking"
            description="Block connections from specific countries"
            enabled={settings.geoBlocking}
            onChange={(v) => updateSetting('geoBlocking', v)}
          />
          <div className="border-t border-[#2d3555]" />
          <Toggle
            label="Two-Factor Authentication"
            description="Require 2FA for admin access"
            enabled={settings.twoFactor}
            onChange={(v) => updateSetting('twoFactor', v)}
          />
          <div className="border-t border-[#2d3555]" />
          <Toggle
            label="Audit Logging"
            description="Log all administrative actions"
            enabled={settings.auditLog}
            onChange={(v) => updateSetting('auditLog', v)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Security() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Security</h1>
        <p className="text-[#94a3b8] mt-1">Manage security settings and access controls</p>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-[#4ade80]/10 flex items-center justify-center mx-auto mb-2">
              <Check className="w-5 h-5 text-[#4ade80]" />
            </div>
            <p className="text-lg font-semibold text-white">SSL Active</p>
            <p className="text-xs text-[#64748b]">All connections encrypted</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-[#4ade80]/10 flex items-center justify-center mx-auto mb-2">
              <Shield className="w-5 h-5 text-[#4ade80]" />
            </div>
            <p className="text-lg font-semibold text-white">DDoS Protected</p>
            <p className="text-xs text-[#64748b]">0 attacks blocked today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-[#fbbf24]/10 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-5 h-5 text-[#fbbf24]" />
            </div>
            <p className="text-lg font-semibold text-white">3 Blocked IPs</p>
            <p className="text-xs text-[#64748b]">In blacklist</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-[#4b7baf]/10 flex items-center justify-center mx-auto mb-2">
              <Users className="w-5 h-5 text-[#4b7baf]" />
            </div>
            <p className="text-lg font-semibold text-white">2FA Enabled</p>
            <p className="text-xs text-[#64748b]">For all admins</p>
          </CardContent>
        </Card>
      </div>

      {/* Security Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SSLCard />
        <SourceAuthentication />
        <IPAccessControl />
        <SecuritySettings />
      </div>
    </div>
  );
}
