import React, { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { NavigationProvider, useNavigation, type AppRoute } from './contexts/NavigationContext';
import {
  RegisterPage,
  LoginPage,
  AuthCallbackPage,
  TwoFactorChallengePage,
  ScraperPage,
} from './pages';
import { AppShell } from './components/layout/AppShell';
import { Card } from './components/ui/Card';
import { Button } from './components/ui/Button';

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

      {/* Páginas do AppShell secundárias */}
      {currentRoute === 'studio' && (
        <AppShell currentPath="studio" onNavigate={(path) => navigate(path)}>
          <Card className="p-8 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-12">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary mb-4 shadow-[0_0_20px_rgba(212,163,70,0.2)]">
              <span className="material-symbols-outlined text-[36px]">
                content_cut
              </span>
            </div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-2">
              Studio de Edição e Cortes
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-6">
              Edição precisa com FFmpeg (-ss e -to), corte sem drift, legendas com cálculo fix_bounds e narração TTS via Google Gemini.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('scraper')}
              leftIcon={
                <span className="material-symbols-outlined text-[18px]">
                  radar
                </span>
              }
            >
              Voltar para Varredura de Canais
            </Button>
          </Card>
        </AppShell>
      )}

      {currentRoute === 'marcas-dagua' && (
        <AppShell currentPath="marcas-dagua" onNavigate={(path) => navigate(path)}>
          <Card className="p-8 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-12">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary mb-4 shadow-[0_0_20px_rgba(212,163,70,0.2)]">
              <span className="material-symbols-outlined text-[36px]">
                branding_watermark
              </span>
            </div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-2">
              Gestão de Marcas d'Água
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-6">
              Upload de PNGs transparentes e posicionamento dinâmico na matriz de coordenadas 3x3 para queima de logo no vídeo.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('scraper')}
              leftIcon={
                <span className="material-symbols-outlined text-[18px]">
                  arrow_back
                </span>
              }
            >
              Voltar para Varredura
            </Button>
          </Card>
        </AppShell>
      )}

      {currentRoute === 'historico' && (
        <AppShell currentPath="historico" onNavigate={(path) => navigate(path)}>
          <Card className="p-8 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-12">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary mb-4 shadow-[0_0_20px_rgba(212,163,70,0.2)]">
              <span className="material-symbols-outlined text-[36px]">
                history
              </span>
            </div>
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-2">
              Histórico de Jobs e Filas BullMQ
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-6">
              Acompanhamento de progresso em tempo real das filas media:download e media:render com status e logs sanitizados.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('scraper')}
              leftIcon={
                <span className="material-symbols-outlined text-[18px]">
                  arrow_back
                </span>
              }
            >
              Voltar para Varredura
            </Button>
          </Card>
        </AppShell>
      )}

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
                { route: 'register', label: 'Cadastro' },
                { route: 'login', label: 'Login' },
                { route: '2fa', label: '2FA' },
                { route: 'auth-callback', label: 'OAuth Callback' },
              ] as { route: AppRoute; label: string }[]
            ).map((item) => (
              <button
                key={item.route}
                type="button"
                onClick={() => navigate(item.route)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                  currentRoute === item.route
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                {item.label}
              </button>
            ))}
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
