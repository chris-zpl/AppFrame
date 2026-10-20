import React, { useMemo } from 'react';
import type { SettingsSection } from '../types';
import { useSettingsContext } from '../context';
import { Tabs, type TabItem } from '../../../components/ui';

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

  const tabs = useMemo<TabItem[]>(
    () => [
      {
        id: 'profile',
        label: 'Perfil & Conta',
        icon: 'person',
      },
      {
        id: 'security',
        label: 'Segurança & 2FA',
        icon: 'shield',
      },
      {
        id: 'sessions',
        label: 'Dispositivos Conectados',
        icon: 'devices',
        count: sessionsCount,
      },
      {
        id: 'danger',
        label: 'Zona de Perigo',
        icon: 'warning',
        className: 'text-error hover:bg-error-container/20',
        activeClassName:
          'bg-error-container/40 text-error font-bold border border-error/40 shadow-sm',
      },
    ],
    [sessionsCount],
  );

  return (
    <div className="mb-space-md border-b border-neutral-200 dark:border-surface-container-high/80 pb-2">
      <Tabs
        tabs={tabs}
        activeTab={activeSection}
        onChange={(id) => onSelectSection(id as SettingsSection)}
        variant="pills"
        ariaLabel="Abas de configurações da conta"
      />
    </div>
  );
};
