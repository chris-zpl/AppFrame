import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { AppFrameLogo } from '../common/AppFrameLogo';
import { ThemeToggle } from '../common/ThemeToggle';
import { Button } from '../ui';
import { useAuth } from '../../features/auth';
import { LegalModal, useLegalModal } from '../../features/legal';

export type AppNavigationPath = 'varredura' | 'studio' | 'marcas-dagua' | 'historico' | 'configuracoes' | 'admin';

export interface AppShellProps {
  currentPath?: AppNavigationPath;
  onNavigate?: (path: AppNavigationPath) => void;
  userAvatarUrl?: string;
  userName?: string;
  onUserAvatarClick?: () => void;
  children: React.ReactNode;
}

interface NavItem {
  key: AppNavigationPath;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'varredura', label: 'Varredura', icon: 'radar' },
  { key: 'studio', label: 'Studio', icon: 'content_cut' },
  { key: 'marcas-dagua', label: "Marcas d'água", icon: 'branding_watermark' },
  { key: 'historico', label: 'Histórico', icon: 'history' },
];

export const AppShell: React.FC<AppShellProps> = ({
  currentPath = 'varredura',
  onNavigate,
  userAvatarUrl,
  userName,
  onUserAvatarClick,
  children,
}) => {
  const [activePath, setActivePath] = useState<AppNavigationPath>(currentPath);
  const {
    isOpen: legalModalOpen,
    activeDoc: legalModalDoc,
    openTerms: handleOpenTerms,
    openPrivacy: handleOpenPrivacy,
    close: handleCloseLegal,
  } = useLegalModal();
  const routerNavigate = useNavigate();
  const { user, logout } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = isSuperAdmin || user?.role === 'ADMIN';

  const navItems = [
    ...NAV_ITEMS,
    ...(isAdmin
      ? [
          {
            key: 'admin' as AppNavigationPath,
            label: 'Admin',
            icon: 'admin_panel_settings',
          },
        ]
      : []),
  ];

  const effectiveUserName = userName || user?.name || user?.email?.split('@')[0] || 'Usuário';

  const handleNavClick = (path: AppNavigationPath) => {
    setActivePath(path);
    if (onNavigate) {
      onNavigate(path);
    } else {
      const routeMap: Record<AppNavigationPath, string> = {
        varredura: '/varredura',
        studio: '/studio',
        'marcas-dagua': '/marcas-dagua',
        historico: '/historico',
        configuracoes: '/settings',
        admin: '/admin',
      };
      routerNavigate(routeMap[path] || `/${path}`);
    }
  };

  const handleAvatarClick = () => {
    if (onUserAvatarClick) {
      onUserAvatarClick();
    } else {
      handleNavClick('configuracoes');
    }
  };

  return (
    <div className="min-h-screen min-w-[375px] bg-[#f8f9fd] dark:bg-surface text-neutral-900 dark:text-on-surface flex flex-col antialiased selection:bg-primary/20 selection:text-primary">
      {/* ================= HEADER FIXO 64px COM ALTO CONTRASTE ================= */}
      <header className="fixed top-0 w-full z-40 bg-white/95 dark:bg-[#10131a]/90 backdrop-blur-xl border-b border-neutral-200 dark:border-surface-container-high/60 shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-colors">
        <div className="h-16 max-w-7xl mx-auto px-4 md:px-margin flex items-center justify-between gap-space-md">
          {/* Logo Oficial */}
          <AppFrameLogo
            size="sm"
            onClick={() => handleNavClick('varredura')}
          />

          {/* Navegação Desktop (oculta em mobile < 768px) */}
          <nav className="hidden md:flex items-center gap-space-sm">
            {navItems.map((item) => {
              const isActive = (currentPath || activePath) === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavClick(item.key)}
                  className={cn(
                    'px-space-md py-space-xs font-title-sm text-title-sm rounded-lg transition-colors cursor-pointer relative',
                    isActive
                      ? 'text-amber-800 dark:text-primary font-semibold bg-amber-500/15 dark:bg-primary/20 border border-amber-600/30 dark:border-primary/40 shadow-sm'
                      : 'text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100 dark:text-on-surface-variant dark:hover:text-on-surface dark:hover:bg-surface-container-high border border-transparent',
                  )}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-[-1px] left-2 right-2 h-[2px] bg-amber-600 dark:bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Ações da Direita: ThemeToggle + Avatar + Logout */}
          <div className="flex items-center gap-3 md:gap-space-md">
            <ThemeToggle variant="header" />

            <div
              onClick={handleAvatarClick}
              title={`Perfil: ${effectiveUserName}`}
              className={cn(
                'relative flex items-center justify-center p-[2px] rounded-full shadow-[0_0_12px_rgba(212,163,70,0.25)] bg-neutral-100 dark:bg-surface-container cursor-pointer transition-transform hover:scale-105',
              )}
            >
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt={effectiveUserName}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-primary-container"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center ring-2 ring-primary-container text-on-primary font-bold text-[13px]">
                  {effectiveUserName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Botão de Logout rápido */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={logout}
              title="Encerrar Sessão"
              aria-label="Encerrar Sessão"
              className="w-8 h-8 text-neutral-500 hover:text-red-500 hover:bg-neutral-100 dark:text-on-surface-variant dark:hover:text-red-400 dark:hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ================= CONTAINER PRINCIPAL (MAIN) ================= */}
      <main className="w-full pt-16 bg-[#f8f9fd] dark:bg-surface flex-1 flex flex-col">
        <div className="max-w-7xl mx-auto px-4 py-4 md:px-margin md:py-space-lg w-full flex-1 flex flex-col pb-24 md:pb-28">
          {children}
        </div>
      </main>

      {/* ================= BARRA DE NAVEGAÇÃO MÓVEL (BOTTOM BAR < 768px) ================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#10131a]/95 backdrop-blur-xl border-t border-neutral-200 dark:border-surface-container-high/80 px-2 py-1.5 flex items-center justify-around shadow-lg pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-colors">
        {navItems.map((item) => {
          const isActive = (currentPath || activePath) === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleNavClick(item.key)}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer',
                isActive
                  ? 'text-amber-800 dark:text-primary font-bold'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-on-surface-variant dark:hover:text-on-surface',
              )}
            >
              <span
                className={cn(
                  'material-symbols-outlined text-[22px]',
                  isActive && 'text-amber-800 dark:text-primary font-bold',
                )}
              >
                {item.icon}
              </span>
              <span className="text-[11px] leading-tight mt-0.5">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ================= FOOTER MESTRE ================= */}
      <footer className="w-full bg-neutral-50 dark:bg-surface-container-lowest mt-auto border-t border-neutral-200 dark:border-surface-container/60 hidden md:block transition-colors">
        <div className="max-w-7xl mx-auto px-margin py-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-neutral-600 dark:text-on-surface-variant">
            <span>AppFrame © 2026</span>
            <span className="text-neutral-400 dark:text-outline">•</span>
            <span>Executive Video Intelligence</span>
          </div>
          <div className="flex items-center gap-space-lg font-body-sm text-body-sm text-neutral-600 dark:text-on-surface-variant">
            <button
              type="button"
              onClick={handleOpenPrivacy}
              className="hover:text-amber-800 dark:hover:text-primary transition-colors cursor-pointer"
            >
              Privacidade
            </button>
            <button
              type="button"
              onClick={handleOpenTerms}
              className="hover:text-amber-800 dark:hover:text-primary transition-colors cursor-pointer"
            >
              Termos de Serviço
            </button>
            <span className="text-on-surface-variant/60">
              v1.0.0
            </span>
          </div>
        </div>
      </footer>

      {/* Modal de Documentos Legais */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={handleCloseLegal}
        initialDoc={legalModalDoc}
      />
    </div>
  );
};
