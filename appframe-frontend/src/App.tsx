import React, { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { NavigationProvider, useNavigation, type AppRoute } from './contexts/NavigationContext';
import {
  RegisterPage,
  LoginPage,
  AuthCallbackPage,
  TwoFactorChallengePage,
  ScraperPage,
  StudioPage,
  WatermarksPage,
  HistoryPage,
  SettingsPage,
} from './pages';

const MainRouter: React.FC = () => {
  const { currentRoute, navigate } = useNavigation();
  const [showDevPill, setShowDevPill] = useState(true);

  return (
    <>
      {/* Roteador Dinâmico das Páginas */}
      {currentRoute === 'register' && <RegisterPage />}
      {currentRoute === 'login' && <LoginPage />}
      {currentRoute === 'auth-callback' && <AuthCallbackPage />}
      {currentRoute === '2fa' && <TwoFactorChallengePage />}
      {currentRoute === 'scraper' && <ScraperPage />}
      {currentRoute === 'studio' && <StudioPage />}
      {(currentRoute === 'marcas-dagua' || currentRoute === 'watermarks') && <WatermarksPage />}
      {(currentRoute === 'historico' || currentRoute === 'history') && <HistoryPage />}
      {(currentRoute === 'settings' || currentRoute === 'configuracoes') && <SettingsPage />}

      {/* Barra Rápida de Demonstração / Alternador entre Páginas */}
      <div className="fixed bottom-3 right-3 z-50 flex items-center gap-1.5 p-1.5 rounded-2xl bg-surface-container-lowest/90 backdrop-blur-md border border-surface-container-highest/80 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {showDevPill ? (
          <>
            <span className="text-[10px] font-bold text-primary px-2 uppercase tracking-wider">
              Rotas:
            </span>
            {(
              [
                { route: 'scraper', label: 'Varredura' },
                { route: 'studio', label: 'Studio' },
                { route: 'marcas-dagua', label: "Marcas d'Água" },
                { route: 'historico', label: 'Histórico' },
                { route: 'settings', label: 'Configurações' },
                { route: 'login', label: 'Login' },
                { route: 'register', label: 'Cadastro' },
                { route: '2fa', label: '2FA' },
              ] as { route: AppRoute; label: string }[]
            ).map((item) => {
              const isActive =
                currentRoute === item.route ||
                (item.route === 'marcas-dagua' && currentRoute === 'watermarks') ||
                (item.route === 'historico' && currentRoute === 'history') ||
                (item.route === 'settings' && currentRoute === 'configuracoes');

              return (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => navigate(item.route)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowDevPill(false)}
              title="Ocultar barra de rotas"
              className="p-1 text-outline hover:text-on-surface rounded-lg cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowDevPill(true)}
            title="Exibir seletor de rotas"
            className="p-1.5 text-primary hover:text-on-primary-container hover:bg-primary-container rounded-xl flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">alt_route</span>
            <span>Rotas</span>
          </button>
        )}
      </div>
    </>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <NavigationProvider>
        <MainRouter />
      </NavigationProvider>
    </ThemeProvider>
  );
}
