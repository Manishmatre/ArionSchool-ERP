import React from 'react';
import { useBranding } from '../context/BrandingContext';

/**
 * Compact, theme-aware in-page Sub-Navigation Tab Bar.
 * Matches SectionNavTabs (main topbar) in height, typography, active brand underline,
 * and light/dark mode contrast so every multi-tab page feels 100% consistent.
 *
 * Props:
 * - tabs: Array<{ id: string, label: string, icon?: React.ComponentType, badge?: string | number }>
 * - activeTab: string
 * - onChange: (id: string) => void
 * - rightContent?: React.ReactNode
 * - className?: string
 */
export default function SubNavTabs({
  tabs = [],
  activeTab,
  onChange,
  rightContent = null,
  className = ''
}) {
  const { isDarkCanvas, themeMode } = useBranding();

  return (
    <div
      className={`mb-4 rounded-xl border transition-colors duration-200 px-2.5 ${
        isDarkCanvas
          ? 'bg-slate-900 border-slate-800'
          : themeMode === 'tinted-studio'
            ? 'bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-sm'
            : 'bg-white border-slate-200/90 shadow-sm'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 min-h-[40px]">
        <div className="flex items-center min-w-0 flex-1 overflow-x-auto no-scrollbar gap-0.5 -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                style={
                  active
                    ? isDarkCanvas
                      ? {
                          color: 'rgb(var(--brand-300))',
                          borderBottomColor: 'rgb(var(--brand-400))',
                          backgroundColor: 'rgb(var(--brand-600) / 0.18)'
                        }
                      : {
                          color: 'rgb(var(--brand-700))',
                          borderBottomColor: 'rgb(var(--brand-600))',
                          backgroundColor: 'rgb(var(--brand-50) / 0.72)'
                        }
                    : undefined
                }
                className={`text-xs font-semibold px-3 py-2.5 rounded-t-md transition-all whitespace-nowrap border-b-2 inline-flex items-center gap-1.5 shrink-0 ${
                  active
                    ? 'font-bold'
                    : isDarkCanvas
                      ? 'text-slate-300 border-transparent hover:text-white hover:bg-slate-800/80 hover:border-slate-600'
                      : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge !== null && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                      active
                        ? isDarkCanvas
                          ? 'bg-slate-800 text-slate-100'
                          : 'bg-primary-100 text-primary-700'
                        : isDarkCanvas
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {rightContent && (
          <div className="flex items-center gap-2 py-1 shrink-0">
            {rightContent}
          </div>
        )}
      </div>
    </div>
  );
}
