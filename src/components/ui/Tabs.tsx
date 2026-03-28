import { ReactNode, useState } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: any;
  badge?: number;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export default function Tabs({ tabs, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const currentTab = tabs.find((tab) => tab.id === activeTab);

  return (
    <div>
      <div className="border-b border-slate-200">
        <nav className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-t-2xl border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {tab.label}
                {tab.badge !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      isActive ? 'bg-white text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="py-6">{currentTab?.content}</div>
    </div>
  );
}
