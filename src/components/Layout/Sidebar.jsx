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
  { path: '/help', icon: HelpCircle, label: 'Help' },
];

const SIDEBAR_WIDTH = 224; // 14rem
const SIDEBAR_COLLAPSED_WIDTH = 80; // 5rem

export default function Sidebar({ collapsed, onToggle }) {
  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <aside
      style={{ width: `${width}px` }}
      className="fixed left-0 top-0 h-screen bg-[#0d1229] border-r border-[#1e2337] flex flex-col z-50 transition-all duration-300 ease-in-out"
    >
      <div className={`h-20 flex items-center justify-center border-b border-[#1e2337] ${collapsed ? 'px-2' : 'px-4'}`}>
        {collapsed ? (
          <img src="/icon.png" alt="StreamDock" className="w-10 h-10 object-contain" />
        ) : (
          <img src="/header.png" alt="StreamDock" className="h-12 object-contain" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-4 py-3.5 rounded-lg transition-all duration-150 ${isActive
                    ? 'bg-[#4b7baf]/15 text-[#6b9fd4]'
                    : 'text-[#8896ab] hover:bg-[#151b30] hover:text-white'
                  }`
                }
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-6 h-6 flex-shrink-0" />
                {!collapsed && <span className="text-base font-medium">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>



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
