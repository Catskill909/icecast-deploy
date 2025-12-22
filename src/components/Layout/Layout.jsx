import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const SIDEBAR_WIDTH = 224; // 14rem = 224px
const SIDEBAR_COLLAPSED_WIDTH = 80; // 5rem = 80px

export default function Layout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const contentMargin = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <div className="min-h-screen bg-[#0a0e27]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div
        style={{ marginLeft: `${contentMargin}px` }}
        className="transition-all duration-300 ease-in-out"
      >
        <Header />
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
