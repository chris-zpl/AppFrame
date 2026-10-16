import React from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { AppShell } from '../components/layout/AppShell';
import {
  WatermarkHeader,
  WatermarkUploadDropzone,
  WatermarkGridSection,
  WatermarkModals,
  useWatermarks,
} from '../features/watermarks';

export const WatermarksPage: React.FC = () => {
  const { navigate } = useNavigation();

  const {
    watermarks,
    isLoading,
    errorMessage,
    deleteConfirmId,
    setDeleteConfirmId,
    defaultWatermarkId,
    handleSelectDefault,
    deleteWatermark,
    isUploading,
    isDeleting,
    isDragging,
    fileInputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileChange,
    openFileDialog,
  } = useWatermarks();

  return (
    <AppShell
      currentPath="marcas-dagua"
      onNavigate={(path) => navigate(path)}
      onUserAvatarClick={() => navigate('settings')}
    >
      <div className="flex flex-col w-full text-on-surface pb-12">
        {/* ================= HEADER ================= */}
        <WatermarkHeader
          onUploadClick={openFileDialog}
          isUploading={isUploading}
        />

        {/* ================= DROPZONE DE UPLOAD ================= */}
        <WatermarkUploadDropzone
          isDragging={isDragging}
          isPending={isUploading}
          errorMessage={errorMessage}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileDialog}
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
        />

        {/* ================= GRADE DE LOGOS OU ESTADO VAZIO ================= */}
        <WatermarkGridSection
          watermarks={watermarks}
          isLoading={isLoading}
          defaultWatermarkId={defaultWatermarkId}
          onSetDefault={handleSelectDefault}
          onConfirmDelete={(id) => setDeleteConfirmId(id)}
          onUploadClick={openFileDialog}
        />

        {/* ================= MODAIS ================= */}
        <WatermarkModals
          deleteConfirmId={deleteConfirmId}
          isDeleting={isDeleting}
          onCloseDelete={() => setDeleteConfirmId(null)}
          onConfirmDelete={() => {
            if (deleteConfirmId) {
              deleteWatermark(deleteConfirmId);
            }
          }}
        />
      </div>
    </AppShell>
  );
};
