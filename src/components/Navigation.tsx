import React from 'react';
import { Home, Dumbbell, LayoutGrid, History, Sparkles } from 'lucide-react';
import { TabType } from '../types';

interface NavigationProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isWorkoutActive: boolean;
  activeSetsCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  isWorkoutActive,
  activeSetsCount = 0,
}) => {
  const tabs = [
    {
      id: 'home' as TabType,
      label: 'Home',
      icon: Home,
    },
    {
      id: 'workout' as TabType,
      label: 'Workout',
      icon: Dumbbell,
      hasBadge: isWorkoutActive,
      badgeText: activeSetsCount > 0 ? `${activeSetsCount}` : 'LIVE',
    },
    {
      id: 'plan' as TabType,
      label: 'Plan',
      icon: LayoutGrid,
    },
    {
      id: 'history' as TabType,
      label: 'History',
      icon: History,
    },
    {
      id: 'coach' as TabType,
      label: 'Coach',
      icon: Sparkles,
    },
  ];

  return (
    <nav
      id="bottom-nav-bar"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0e0f17]/95 backdrop-blur-lg border-t border-[#222436] px-3 py-2 max-w-md mx-auto"
      aria-label="Main Navigation"
    >
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-150 min-w-[56px] ${
                isActive
                  ? 'text-theme-light font-bold'
                  : 'text-slate-500 hover:text-slate-300 font-medium'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-theme-light' : 'text-slate-500'
                  }`}
                />
                {tab.hasBadge && (
                  <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[14px] h-3.5 bg-theme-accent text-[#0d0a18] text-[9px] font-black rounded-full flex items-center justify-center shadow-sm animate-pulse">
                    {tab.badgeText}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight leading-none">
                {tab.label}
              </span>
              {isActive && (
                <span
                  className="absolute bottom-0 w-5 h-0.5 rounded-full bg-theme-accent"
                  style={{ boxShadow: '0 0 8px var(--theme-glow)' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
