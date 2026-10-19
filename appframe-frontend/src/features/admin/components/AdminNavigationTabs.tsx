import React from 'react';
import type { AdminTab } from '../types';
import { AdminTabButton } from './AdminTabButton';

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
  return (
    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-100 dark:bg-surface-container border border-neutral-200 dark:border-surface-container-highest overflow-x-auto">
      <AdminTabButton
        isActive={activeTab === 'users'}
        onClick={() => onSelectTab('users')}
        icon="group"
        label="Usuários & Sessões"
        count={usersCount}
      />

      <AdminTabButton
        isActive={activeTab === 'audit'}
        onClick={() => onSelectTab('audit')}
        icon="policy"
        label="Auditoria de Segurança"
        count={auditCount > 0 ? auditCount : undefined}
      />

      {isSuperAdmin && (
        <>
          <AdminTabButton
            isActive={activeTab === 'youtube'}
            onClick={() => onSelectTab('youtube')}
            icon="smart_display"
            label="YouTube (Sessão Global)"
            hasStatusDot={hasYoutubeCookies}
          />

          <AdminTabButton
            isActive={activeTab === 'gemini'}
            onClick={() => onSelectTab('gemini')}
            icon="auto_awesome"
            label="Google Gemini AI"
            hasStatusDot={isGeminiConfigured}
          />

          <AdminTabButton
            isActive={activeTab === 'smtp'}
            onClick={() => onSelectTab('smtp')}
            icon="mail"
            label="Servidor SMTP"
          />

          <AdminTabButton
            isActive={activeTab === 'legal'}
            onClick={() => onSelectTab('legal')}
            icon="gavel"
            label="Termos & Privacidade"
          />
        </>
      )}
    </div>
  );
};

export { AdminTabButton };
export type { AdminTabButtonProps } from './AdminTabButton';
