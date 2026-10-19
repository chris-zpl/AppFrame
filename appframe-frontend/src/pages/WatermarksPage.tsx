import React from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { AppShell } from '../components/layout/AppShell';
import {
  WatermarksProvider,
  WatermarkHeader,
  WatermarkUploadDropzone,
  WatermarkGridSection,
  WatermarkDeleteModal,
} from '../features/watermarks';

export const WatermarksPage: React.FC = () => {
  const { navigate } = useNavigation();

  return (
    <WatermarksProvider>
      <AppShell
        currentPath="marcas-dagua"
        onNavigate={(path) => navigate(path)}
        onUserAvatarClick={() => navigate('settings')}
      >
        <div className="flex flex-col w-full text-neutral-900 dark:text-on-surface pb-12">
          {/* ================= HEADER ================= */}
          <WatermarkHeader />

          {/* ================= DROPZONE DE UPLOAD ================= */}
          <WatermarkUploadDropzone />

          {/* ================= GRADE DE LOGOS OU ESTADO VAZIO ================= */}
          <WatermarkGridSection />

          {/* ================= MODAIS ================= */}
          <WatermarkDeleteModal />
        </div>
      </AppShell>
    </WatermarksProvider>
  );
};
