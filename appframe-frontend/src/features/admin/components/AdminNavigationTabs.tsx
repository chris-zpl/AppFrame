import React from 'react';
import { cn } from '../../../lib/utils';
import type { AdminTab } from '../interfaces';

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
    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container border border-surface-container-highest overflow-x-auto">
      <button
        type="button"
        onClick={() => onSelectTab('users')}
        className={cn(
          'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer whitespace-nowrap',
          activeTab === 'users'
            ? 'bg-primary text-on-primary shadow-sm'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
        )}
      >
        <span className="material-symbols-outlined text-[18px]">group</span>
        <span>Usuários & Sessões</span>
        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white font-mono">
          {usersCount}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onSelectTab('audit')}
        className={cn(
          'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer whitespace-nowrap',
          activeTab === 'audit'
            ? 'bg-primary text-on-primary shadow-sm'
            : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
        )}
      >
        <span className="material-symbols-outlined text-[18px]">policy</span>
        <span>Auditoria de Segurança</span>
        {auditCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white font-mono">
            {auditCount}
          </span>
        )}
      </button>

      {isSuperAdmin && (
        <>
          <button
            type="button"
            onClick={() => onSelectTab('youtube')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer whitespace-nowrap',
              activeTab === 'youtube'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            )}
          >
            <span className="material-symbols-outlined text-[18px]">smart_display</span>
            <span>YouTube (Sessão Global)</span>
            {hasYoutubeCookies && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('gemini')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer whitespace-nowrap',
              activeTab === 'gemini'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            )}
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            <span>Google Gemini AI</span>
            {isGeminiConfigured && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('smtp')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer whitespace-nowrap',
              activeTab === 'smtp'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            )}
          >
            <span className="material-symbols-outlined text-[18px]">mail</span>
            <span>Servidor SMTP</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('legal')}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer whitespace-nowrap',
              activeTab === 'legal'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            )}
          >
            <span className="material-symbols-outlined text-[18px]">gavel</span>
            <span>Termos & Privacidade</span>
          </button>
        </>
      )}
    </div>
  );
};
