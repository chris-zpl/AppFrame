import React from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../features/auth';
import { AppShell } from '../components/layout/AppShell';
import {
  StudioProvider,
  StudioVideoQueue,
  StudioHeader,
  StudioPlayer,
  StudioTimeline,
  StudioSidebarTabs,
  StudioDeleteModal,
  type AspectRatio,
  type SubtitleMode,
  type FontFamily,
  type WatermarkPosition,
} from '../features/studio';

export type { AspectRatio, SubtitleMode, FontFamily, WatermarkPosition };

export const StudioPage: React.FC = () => {
  const { navigate, params } = useNavigation();
  const { user } = useAuth();

  return (
    <StudioProvider navigate={navigate} params={params}>
      <AppShell
        currentPath="studio"
        onNavigate={(path) => navigate(path)}
        userName={user?.name || ''}
        onUserAvatarClick={() => navigate('configuracoes')}
      >
        <div className="flex flex-col w-full text-on-surface pb-8">
          {/* BARRA SUPERIOR DE CONTROLE DO STUDIO */}
          <StudioHeader />

          {/* FILA DE VÍDEOS PENDENTES (SELECIONADOS NA VARREDURA) */}
          <StudioVideoQueue />

          {/* CORPO PRINCIPAL DO STUDIO */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
            {/* LADO ESQUERDO: PLAYER + TIMELINE (8 COLUNAS) */}
            <div className="lg:col-span-8 flex flex-col gap-space-md">
              <StudioPlayer />
              <StudioTimeline />
            </div>

            {/* LADO DIREITO: ABAS DE CUSTOMIZAÇÃO (4 COLUNAS) */}
            <div className="lg:col-span-4 flex flex-col gap-space-md">
              <StudioSidebarTabs />
            </div>
          </div>
        </div>

        {/* Modal de Confirmação de Exclusão do Studio */}
        <StudioDeleteModal />
      </AppShell>
    </StudioProvider>
  );
};
