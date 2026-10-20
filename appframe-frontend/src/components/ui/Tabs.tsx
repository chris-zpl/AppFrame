import React from 'react';
import { cn } from '../../lib/utils';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: string | React.ReactNode;
  count?: number;
  badge?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  activeClassName?: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'pills' | 'segmented' | 'underline';
  colorScheme?: 'primary' | 'surface';
  size?: 'sm' | 'md';
  className?: string;
  tabClassName?: string;
  ariaLabel?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'pills',
  colorScheme = 'primary',
  size = 'md',
  className,
  tabClassName,
  ariaLabel = 'Navegação por abas',
}) => {
  const isSm = size === 'sm';

  // Container styling de acordo com a variante
  const containerStyles = {
    pills: 'flex items-center gap-2 overflow-x-auto pb-1',
    segmented:
      'inline-flex items-center p-1 bg-neutral-100 dark:bg-surface-container rounded-xl border border-neutral-200 dark:border-surface-container-highest overflow-x-auto',
    underline:
      'flex items-center gap-2 border-b border-neutral-200 dark:border-surface-container-high overflow-x-auto',
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(containerStyles[variant], className)}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        // Estilos de cada variante
        let activeStyles = '';
        let inactiveStyles = '';
        let baseStyles = '';

        if (variant === 'pills') {
          baseStyles = isSm
            ? 'px-3 py-1.5 rounded-lg text-label-md font-label-md'
            : 'px-4 py-2 rounded-xl text-title-sm font-title-sm';
          activeStyles =
            colorScheme === 'primary'
              ? 'bg-primary text-on-primary font-bold shadow-sm'
              : 'bg-white dark:bg-surface-container-highest text-neutral-900 dark:text-on-surface font-bold shadow-xs';
          inactiveStyles =
            'text-neutral-700 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface hover:bg-neutral-100 dark:hover:bg-surface-container';
        } else if (variant === 'segmented') {
          baseStyles = isSm
            ? 'px-3 py-1.5 rounded-lg text-label-sm font-semibold'
            : 'px-3.5 py-2 rounded-lg text-label-md font-semibold';
          activeStyles =
            colorScheme === 'primary'
              ? 'bg-primary text-on-primary font-bold shadow-sm'
              : 'bg-white dark:bg-surface-container-highest text-neutral-900 dark:text-on-surface shadow-xs font-bold';
          inactiveStyles =
            'text-neutral-600 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface';
        } else if (variant === 'underline') {
          baseStyles = isSm
            ? 'px-3 py-2 text-label-md relative -mb-[1px]'
            : 'px-4 py-2.5 text-title-sm relative -mb-[1px]';
          activeStyles =
            'text-amber-800 dark:text-primary font-bold border-b-2 border-amber-600 dark:border-primary';
          inactiveStyles =
            'text-neutral-600 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface border-b-2 border-transparent';
        }

        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer select-none',
              baseStyles,
              isActive
                ? (tab.activeClassName || activeStyles)
                : (tab.className || inactiveStyles),
              tab.disabled && 'opacity-40 pointer-events-none cursor-not-allowed',
              tabClassName,
            )}
          >
            {tab.icon && typeof tab.icon === 'string' ? (
              <span
                className={cn(
                  'material-symbols-outlined shrink-0',
                  isSm ? 'text-[16px]' : 'text-[18px]',
                )}
              >
                {tab.icon}
              </span>
            ) : (
              tab.icon
            )}

            <span>{tab.label}</span>

            {tab.count !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full font-mono text-[10px] font-bold leading-none',
                  isActive
                    ? colorScheme === 'primary'
                      ? 'bg-on-primary/20 text-on-primary'
                      : 'bg-neutral-200 dark:bg-surface-container text-neutral-900 dark:text-on-surface'
                    : 'bg-neutral-200 dark:bg-surface-container-highest text-neutral-800 dark:text-on-surface',
                )}
              >
                {tab.count}
              </span>
            )}

            {tab.badge}
          </button>
        );
      })}
    </div>
  );
};
