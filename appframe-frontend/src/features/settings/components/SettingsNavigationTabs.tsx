import React from 'react';
import { cn } from '../../../lib/utils';
import type { SettingsSection } from '../types';

import { useSettingsContext } from '../context';

export interface SettingsNavigationTabsProps {
  activeSection?: SettingsSection;
  onSelectSection?: (section: SettingsSection) => void;
  sessionsCount?: number;
}

export const SettingsNavigationTabs: React.FC<SettingsNavigationTabsProps> = (props) => {
  const settings = useSettingsContext();

  const activeSection = props.activeSection ?? settings.activeSection;
  const onSelectSection = props.onSelectSection ?? settings.handleSelectSection;
  const sessionsCount = props.sessionsCount ?? settings.sessions.length;
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-space-md border-b border-neutral-200 dark:border-surface-container-high/80">
      <button
        type="button"
        onClick={() => onSelectSection('profile')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl font-title-sm text-title-sm transition-all cursor-pointer whitespace-nowrap',
          activeSection === 'profile'
            ? 'bg-primary text-on-primary font-bold shadow-sm'
            : 'text-neutral-700 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface hover:bg-neutral-100 dark:hover:bg-surface-container'
        )}
      >
        <span className="material-symbols-outlined text-[18px]">person</span>
        <span>Perfil & Conta</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectSection('security')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl font-title-sm text-title-sm transition-all cursor-pointer whitespace-nowrap',
          activeSection === 'security'
            ? 'bg-primary text-on-primary font-bold shadow-sm'
            : 'text-neutral-700 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface hover:bg-neutral-100 dark:hover:bg-surface-container'
        )}
      >
        <span className="material-symbols-outlined text-[18px]">shield</span>
        <span>Segurança & 2FA</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectSection('sessions')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl font-title-sm text-title-sm transition-all cursor-pointer whitespace-nowrap',
          activeSection === 'sessions'
            ? 'bg-primary text-on-primary font-bold shadow-sm'
            : 'text-neutral-700 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface hover:bg-neutral-100 dark:hover:bg-surface-container'
        )}
      >
        <span className="material-symbols-outlined text-[18px]">devices</span>
        <span>Dispositivos Conectados</span>
        <span className="px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-surface-container-highest text-label-sm font-label-sm font-mono text-neutral-800 dark:text-on-surface">
          {sessionsCount}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onSelectSection('danger')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl font-title-sm text-title-sm transition-all cursor-pointer whitespace-nowrap text-error hover:bg-error-container/20',
          activeSection === 'danger' && 'bg-error-container/40 text-error font-bold border border-error/40'
        )}
      >
        <span className="material-symbols-outlined text-[18px]">warning</span>
        <span>Zona de Perigo</span>
      </button>
    </div>
  );
};
