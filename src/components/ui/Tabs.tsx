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
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-2 shadow-sm">
        <nav className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100'
                    : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {tab.label}
                {tab.badge !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
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
