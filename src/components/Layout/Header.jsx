import { useState, useEffect } from 'react';
import { Bell, User, ChevronDown } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function Header() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch alerts and unread count
  const fetchAlerts = async () => {
    try {
      const [alertsRes, countRes] = await Promise.all([
        fetch(`${API_URL}/api/alerts?limit=5`),
        fetch(`${API_URL}/api/alerts/unread-count`)
      ]);
      const alertsData = await alertsRes.json();
      const countData = await countRes.json();
      setAlerts(alertsData);
      setUnreadCount(countData.count || 0);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Poll every 10 seconds for header badge
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await fetch(`${API_URL}/api/alerts/${id}/read`, { method: 'POST' });
      fetchAlerts(); // Refresh
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  return (
    <header className="h-16 bg-[#0a0e27] border-b border-[#1e2337] flex items-center justify-end px-8 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfile(false);
            }}
            className="relative p-2 rounded-lg text-[#94a3b8] hover:bg-[#1e2337] hover:text-white transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#f87171] rounded-full animate-pulse-dot" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-[#1e2337] border border-[#2d3555] rounded-xl shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2d3555]">
                <h3 className="font-semibold text-white">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="px-4 py-6 text-center text-[#64748b]">
                    No notifications
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`px-4 py-3 border-b border-[#2d3555] hover:bg-[#252b45] transition-colors ${!alert.read ? 'bg-[#4b7baf]/5' : ''
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${alert.type === 'error'
                              ? 'bg-[#f87171]'
                              : alert.type === 'warning'
                                ? 'bg-[#fbbf24]'
                                : alert.type === 'success'
                                  ? 'bg-[#4ade80]'
                                  : 'bg-[#4b7baf]'
                            }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {alert.title}
                          </p>
                          <p className="text-xs text-[#94a3b8] mt-0.5 truncate">
                            {alert.message}
                          </p>
                          <p className="text-xs text-[#64748b] mt-1">
                            {new Date(alert.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        {!alert.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkRead(alert.id);
                            }}
                            className="text-xs text-[#4b7baf] hover:text-white"
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2 border-t border-[#2d3555]">
                <a href="/alerts" className="text-sm text-[#4b7baf] hover:text-[#5d8aa8] transition-colors">
                  View all notifications
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#1e2337] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4b7baf] to-[#4a9b9f] flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-white hidden sm:block">Admin</span>
            <ChevronDown className="w-4 h-4 text-[#64748b]" />
          </button>

          {/* Profile Dropdown */}
          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-[#1e2337] border border-[#2d3555] rounded-xl shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#2d3555]">
                <p className="font-medium text-white">Admin User</p>
                <p className="text-xs text-[#64748b]">admin@example.com</p>
              </div>
              <div className="py-1">
                <button className="w-full px-4 py-2 text-left text-sm text-[#94a3b8] hover:bg-[#252b45] hover:text-white transition-colors">
                  Profile Settings
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-[#94a3b8] hover:bg-[#252b45] hover:text-white transition-colors">
                  API Keys
                </button>
                <button className="w-full px-4 py-2 text-left text-sm text-[#f87171] hover:bg-[#252b45] transition-colors">
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
