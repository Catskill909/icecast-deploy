import { useState, useEffect } from 'react';
import { User, Bell, Mail, Key, Server, Save, Check } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input, { Select } from '../components/ui/Input';
import SMTPConfigForm from '../components/SMTPConfigForm';
import AlertEmailSettings from '../components/AlertEmailSettings';
import IcecastConfigForm from '../components/IcecastConfigForm';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({
    name: 'Admin User',
    email: 'admin@supersoul.top',
    timezone: 'America/New_York',
  });

  // Check URL for tab parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['profile', 'email', 'alerts', 'server', 'api'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'email', label: 'Email Config', icon: Mail },
    { id: 'alerts', label: 'Stream Alerts', icon: Bell },
    { id: 'server', label: 'Server Config', icon: Server },
    { id: 'api', label: 'API Keys', icon: Key },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="heading-1 text-white">Settings</h1>
        <p className="text-[#8896ab] mt-2">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-56 flex-shrink-0">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${activeTab === tab.id
                      ? 'bg-[#4b7baf]/15 text-[#6b9fd4]'
                      : 'text-[#8896ab] hover:bg-[#0d1229] hover:text-white'
                      }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6">
          {activeTab === 'profile' && (
            <Card>
              <CardContent className="p-6">
                <h2 className="heading-2 text-white mb-6">Profile Information</h2>
                <div className="space-y-5">
                  <Input
                    label="Display Name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                  <Select
                    label="Timezone"
                    value={profile.timezone}
                    onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                    options={[
                      { value: 'America/New_York', label: 'Eastern Time' },
                      { value: 'America/Chicago', label: 'Central Time' },
                      { value: 'America/Los_Angeles', label: 'Pacific Time' },
                      { value: 'Europe/London', label: 'London' },
                    ]}
                  />
                  <div className="pt-4">
                    <Button onClick={handleSave} icon={saved ? Check : Save}>
                      {saved ? 'Saved!' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'email' && (
            <SMTPConfigForm />
          )}

          {activeTab === 'alerts' && (
            <AlertEmailSettings />
          )}

          {activeTab === 'server' && (
            <IcecastConfigForm />
          )}

          {activeTab === 'api' && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="heading-2 text-white">API Keys</h2>
                  <Button size="sm">Generate Key</Button>
                </div>
                <div className="p-4 rounded-lg bg-[#0d1229] border border-[#1e2337]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Production API Key</p>
                      <code className="text-sm text-[#64748b]">sk_live_••••••••••••</code>
                    </div>
                    <Button variant="danger" size="sm">Revoke</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
