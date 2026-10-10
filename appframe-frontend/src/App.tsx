import React, { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppShell, type AppNavigationPath } from './components/layout/AppShell';
import { ChannelScannerView } from './components/scanner/ChannelScannerView';
import { AuthForm } from './components/auth/AuthForm';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppNavigationPath>('varredura');
  const [showAuthScreen, setShowAuthScreen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  // Se o usuário alternar para o modo de tela inteira de Autenticação (Referência 1)
  if (showAuthScreen) {
    return (
      <div className="min-h-screen w-full bg-surface text-on-surface flex flex-col justify-between p-4 sm:p-6 relative overflow-x-hidden antialiased selection:bg-primary/20 selection:text-primary">
        {/* Barra superior de controle para alternar de volta ao Workspace */}
        <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 z-20">
          <button
            type="button"
            onClick={() => setShowAuthScreen(false)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-label-md font-label-md transition-all shadow-sm cursor-pointer border border-surface-container-highest/60"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">
              arrow_back
            </span>
            <span>Voltar ao Workspace (Referência 2)</span>
          </button>

          <span className="font-label-sm text-label-sm text-on-surface-variant hidden sm:inline">
            Modo Referência 1: Autenticação & Design System
          </span>
        </header>

        {/* Componente de Autenticação Centralizado */}
        <main className="flex-1 flex items-center justify-center py-6 sm:py-10 z-10 w-full">
          <AuthForm
            onSubmitSuccess={() => {
              alert('Autenticado com sucesso! Redirecionando para o Workspace...');
              setShowAuthScreen(false);
            }}
          />
        </main>

        <footer className="w-full text-center py-2 text-label-sm font-label-sm text-outline z-10">
          AppFrame © 2026 • Executive Video Intelligence
        </footer>
      </div>
    );
  }

  return (
    <AppShell
      currentPath={activeTab}
      onNavigate={(path) => setActiveTab(path)}
      userName="Christian"
      onUserAvatarClick={() => setAuthModalOpen(true)}
    >
      {/* Banner / Toolbar de Pré-visualização das 2 Referências do Stitch */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl bg-surface-container-low border border-surface-container-high/60 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          <span className="font-title-sm text-title-sm text-on-surface font-semibold">
            Design System AppFrame 2.0
          </span>
          <span className="hidden sm:inline font-body-sm text-body-sm text-on-surface-variant">
            • Cores, tokens e componentes consolidados do Stitch
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAuthScreen(true)}
            leftIcon={
              <span className="material-symbols-outlined text-[16px] text-primary">
                badge
              </span>
            }
          >
            <span>Ver Tela de Auth (Ref. 1)</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAuthModalOpen(true)}
            leftIcon={
              <span className="material-symbols-outlined text-[16px]">
                login
              </span>
            }
          >
            <span>Login Rápido</span>
          </Button>
        </div>
      </div>

      {/* Conteúdo Dinâmico com base na aba ativa */}
      {activeTab === 'varredura' && <ChannelScannerView />}

      {activeTab === 'studio' && (
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
            Selecione vídeos na Varredura de Canais para carregar cortes inteligentes com detecção de silêncio, síntese Gemini TTS e legendas com cálculo fix_bounds.
          </p>
          <Button
            variant="primary"
            onClick={() => setActiveTab('varredura')}
            leftIcon={
              <span className="material-symbols-outlined text-[18px]">
                radar
              </span>
            }
          >
            Ir para Varredura de Canais
          </Button>
        </Card>
      )}

      {activeTab === 'marcas-dagua' && (
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
            Faça upload de PNGs com canal alfa transparente e defina o posicionamento nas 9 âncoras da matriz 3x3 para queima via FFmpeg.
          </p>
          <Button
            variant="primary"
            onClick={() => alert('Abrir modal de upload de marca dágua')}
            leftIcon={
              <span className="material-symbols-outlined text-[18px]">
                upload
              </span>
            }
          >
            Novo Upload de Marca d'Água
          </Button>
        </Card>
      )}

      {activeTab === 'historico' && (
        <Card className="p-8 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-12">
          <div className="w-16 h-16 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary mb-4 shadow-[0_0_20px_rgba(212,163,70,0.2)]">
            <span className="material-symbols-outlined text-[36px]">
              history
            </span>
          </div>
          <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-2">
            Histórico de Renderizações
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-6">
            Acompanhe a fila BullMQ (media:download e media:render) com progresso em tempo real (0% a 100%) e logs sanitizados.
          </p>
          <Button
            variant="primary"
            onClick={() => setActiveTab('varredura')}
            leftIcon={
              <span className="material-symbols-outlined text-[18px]">
                refresh
              </span>
            }
          >
            Iniciar Nova Fila
          </Button>
        </Card>
      )}

      {/* Modal Interativo de Autenticação */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md">
            <button
              type="button"
              onClick={() => setAuthModalOpen(false)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white flex items-center gap-1 font-label-sm text-label-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">
                close
              </span>
              <span>Fechar</span>
            </button>
            <AuthForm
              onSubmitSuccess={() => {
                alert('Sessão iniciada!');
                setAuthModalOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
