import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Toggle from '../components/ui/Toggle';
import { alertRules as initialRules } from '../data/mockData';

const API_URL = import.meta.env.VITE_API_URL || '';

const alertIcons = {
  error: XCircle,
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
};

const alertColors = {
  error: { bg: 'bg-[#f87171]/10', text: 'text-[#f87171]' },
  warning: { bg: 'bg-[#fbbf24]/10', text: 'text-[#fbbf24]' },
  success: { bg: 'bg-[#4ade80]/10', text: 'text-[#4ade80]' },
  info: { bg: 'bg-[#4b7baf]/10', text: 'text-[#4b7baf]' },
};

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function Alerts() {
  const [activeTab, setActiveTab] = useState('alerts');
  const [alertList, setAlertList] = useState([]);
  const [rules, setRules] = useState(initialRules);
  const [loading, setLoading] = useState(true);

  const unreadCount = alertList.filter(a => !a.read).length;

  // Fetch alerts from API
  const fetchAlerts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/alerts`);
      const data = await response.json();
      setAlertList(data);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Poll every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await fetch(`${API_URL}/api/alerts/${id}/read`, { method: 'POST' });
      setAlertList(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    } catch (err) {
      console.error('Failed to mark alert read:', err);
    }
  };

  const handleToggleRule = (id) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-1 text-white">Alerts</h1>
          <p className="text-[#8896ab] mt-2">Notifications and alert rules</p>
        </div>
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchAlerts}>
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-[#1e2337]">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'alerts'
            ? 'border-[#4b7baf] text-white'
            : 'border-transparent text-[#8896ab] hover:text-white'
            }`}
        >
          Alerts {unreadCount > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-[#f87171] text-white">{unreadCount}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'rules'
            ? 'border-[#4b7baf] text-white'
            : 'border-transparent text-[#8896ab] hover:text-white'
            }`}
        >
          Alert Rules
        </button>
      </div>

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-[#64748b]">Loading alerts...</div>
          ) : alertList.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-12 h-12 text-[#4ade80] mx-auto mb-4" />
                <h3 className="font-heading font-bold text-white mb-2">All clear!</h3>
                <p className="text-[#8896ab]">No alerts at this time</p>
              </CardContent>
            </Card>
          ) : (
            alertList.map((alert) => {
              const Icon = alertIcons[alert.type] || Info;
              const colors = alertColors[alert.type] || alertColors.info;

              return (
                <Card key={alert.id} className={!alert.read ? 'border-l-2 border-l-[#4b7baf]' : ''}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${colors.bg}`}>
                        <Icon className={`w-4 h-4 ${colors.text}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-white">{alert.title}</h3>
                            <p className="text-sm text-[#8896ab] mt-1">{alert.message}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-[#64748b]">
                              <span>{getTimeAgo(new Date(alert.createdAt))}</span>
                            </div>
                          </div>
                          {!alert.read && (
                            <button
                              onClick={() => handleMarkRead(alert.id)}
                              className="text-xs text-[#4b7baf] hover:text-[#6b9fd4]"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Rules Tab - Keep as placeholder for Phase 3 */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-white">{rule.name}</h3>
                    <p className="text-sm text-[#64748b] mt-1">
                      Condition: <code className="text-[#4b7baf]">{rule.condition}</code>
                    </p>
                  </div>
                  <Toggle enabled={rule.enabled} onChange={() => handleToggleRule(rule.id)} />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`capitalize ${rule.severity === 'critical' || rule.severity === 'error' ? 'text-[#f87171]' :
                    rule.severity === 'warning' ? 'text-[#fbbf24]' : 'text-[#4b7baf]'
                    }`}>
                    {rule.severity}
                  </span>
                  <span className="text-[#64748b]">•</span>
                  <span className="text-[#64748b]">{rule.channels.join(', ')}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="border-dashed border-[#2d3555]">
            <CardContent className="p-5 text-center text-[#64748b]">
              <p className="text-sm">Custom alert rules coming in Phase 3</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
