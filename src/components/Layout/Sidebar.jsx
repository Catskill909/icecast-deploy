import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Server,
  Radio,
  Activity,
  Bell,
  FileText,
  Settings,
  HelpCircle,
  GripVertical
} from 'lucide-react';

const navItems = [
  { path: '/create', icon: Radio, label: 'Create Station', highlight: true },
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/servers', icon: Server, label: 'Stations' },
  { path: '/alerts', icon: Bell, label: 'Alerts' },
  { path: '/logs', icon: FileText, label: 'Logs' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const SIDEBAR_WIDTH = 224; // 14rem
const SIDEBAR_COLLAPSED_WIDTH = 64; // 4rem

export default function Sidebar({ collapsed, onToggle }) {
  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <aside
      style={{ width: `${width}px` }}
      className="fixed left-0 top-0 h-screen bg-[#0d1229] border-r border-[#1e2337] flex flex-col z-50 transition-all duration-300 ease-in-out"
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-[#1e2337]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#4b7baf] to-[#4a9b9f] flex items-center justify-center flex-shrink-0">
            <Radio className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-heading font-bold text-lg text-white whitespace-nowrap tracking-wide">ICECAST PRO</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 ${isActive
                    ? 'bg-[#4b7baf]/15 text-[#6b9fd4]'
                    : 'text-[#8896ab] hover:bg-[#151b30] hover:text-white'
                  }`
                }
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Help Link */}
      {!collapsed && (
        <div className="px-2 py-3 border-t border-[#1e2337]">
          <a
            href="#"
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-[#8896ab] hover:bg-[#151b30] hover:text-white transition-all duration-150"
          >
            <HelpCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">Help & Docs</span>
          </a>
        </div>
      )}

      {/* Collapse Toggle - Center Grip */}
      <button
        onClick={onToggle}
        className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-12 bg-[#1e2337] border border-[#2d3555] rounded-r-md flex items-center justify-center text-[#64748b] hover:text-white hover:bg-[#2d3555] transition-all duration-150 group"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <GripVertical className="w-3 h-3" />
      </button>
    </aside>
  );
}
