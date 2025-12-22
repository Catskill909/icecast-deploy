import { useState } from 'react';

export function Tabs({ tabs, defaultTab, onChange }) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <div>
      <div className="flex gap-1 p-1 bg-[#1e2337] rounded-lg border border-[#2d3555] w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
              ${
                activeTab === tab.id
                  ? 'bg-[#4b7baf] text-white'
                  : 'text-[#94a3b8] hover:text-white hover:bg-[#252b45]'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{activeContent}</div>
    </div>
  );
}

export function TabList({ children, className = '' }) {
  return (
    <div className={`flex gap-1 p-1 bg-[#1e2337] rounded-lg border border-[#2d3555] ${className}`}>
      {children}
    </div>
  );
}

export function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
        ${
          active
            ? 'bg-[#4b7baf] text-white'
            : 'text-[#94a3b8] hover:text-white hover:bg-[#252b45]'
        }
      `}
    >
      {children}
    </button>
  );
}
