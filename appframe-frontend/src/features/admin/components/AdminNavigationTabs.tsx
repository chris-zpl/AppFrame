import React, { useMemo } from 'react';
import type { AdminTab } from '../types';
import { Tabs, type TabItem } from '../../../components/ui';

export interface AdminNavigationTabsProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  isSuperAdmin: boolean;
  usersCount: number;
  auditCount: number;
  hasYoutubeCookies?: boolean;
  isGeminiConfigured?: boolean;
}

export const AdminNavigationTabs: React.FC<AdminNavigationTabsProps> = ({
  activeTab,
  onSelectTab,
  isSuperAdmin,
  usersCount,
  auditCount,
  hasYoutubeCookies,
  isGeminiConfigured,
}) => {
  const tabs = useMemo<TabItem[]>(() => {
    const list: TabItem[] = [
      {
        id: 'users',
        label: 'Usuários & Sessões',
        icon: 'group',
        count: usersCount,
      },
      {
        id: 'audit',
        label: 'Auditoria de Segurança',
        icon: 'policy',
        count: auditCount > 0 ? auditCount : undefined,
      },
    ];

    if (isSuperAdmin) {
      list.push(
        {
          id: 'youtube',
          label: 'YouTube (Sessão Global)',
          icon: 'smart_display',
          badge: hasYoutubeCookies ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          ) : undefined,
        },
        {
          id: 'gemini',
          label: 'Google Gemini AI',
          icon: 'auto_awesome',
          badge: isGeminiConfigured ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          ) : undefined,
        },
        {
          id: 'smtp',
          label: 'Servidor SMTP',
          icon: 'mail',
        },
        {
          id: 'legal',
          label: 'Termos & Privacidade',
          icon: 'gavel',
        },
      );
    }

    return list;
  }, [isSuperAdmin, usersCount, auditCount, hasYoutubeCookies, isGeminiConfigured]);

  return (
    <Tabs
      tabs={tabs}
      activeTab={activeTab}
      onChange={(id) => onSelectTab(id as AdminTab)}
      variant="segmented"
      ariaLabel="Navegação administrativa"
    />
  );
};
