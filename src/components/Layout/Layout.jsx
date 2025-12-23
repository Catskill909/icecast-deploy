import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const SIDEBAR_WIDTH = 224; // 14rem = 224px
const SIDEBAR_COLLAPSED_WIDTH = 80; // 5rem = 80px

export default function Layout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const isFirstRender = useRef(true);

  // Auto-collapse sidebar on navigation
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSidebarCollapsed(true);
  }, [location.pathname]);

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
