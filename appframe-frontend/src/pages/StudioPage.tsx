import React from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';
import {
  StudioVideoQueue,
  StudioHeader,
  StudioPlayer,
  StudioTimeline,
  StudioSubtitlesTab,
  StudioWatermarkTab,
  StudioDeleteModal,
  type AspectRatio,
  type SubtitleMode,
  type FontFamily,
  type WatermarkPosition,
  useStudio,
} from '../features/studio';

export type { AspectRatio, SubtitleMode, FontFamily, WatermarkPosition };

export const StudioPage: React.FC = () => {
  const { navigate, params } = useNavigation();
  const { user } = useAuth();

  const {
    // Queue
    videoQueue,
    activeQueueIndex,
    setActiveQueueIndex,
    completedVideoIds,
    currentVideo,
    studioProjectTitle,
    isDeleteStudioModalOpen,
    setIsDeleteStudioModalOpen,
    isDeletingFromStudio,
    setIsDeletingFromStudio,
    handleDeleteFromStudio,

    // Player
    aspectRatio,
    setAspectRatio,
    isPlaying,
    setIsPlaying,
    isMuted,
    setIsMuted,
    currentTime,
    setCurrentTime,
    totalDuration,
    setTotalDuration,
    trimIn,
    setTrimIn,
    trimOut,
    setTrimOut,
    waveformPeaks,
    isPreparingPreview,
    previewError,
    previewStreamUrl,
    isAuthError,
    videoRef,
    timelineRef,
    seekVideoTo,
    handleTogglePlay,
    handleTimelineMouseDown,
    handleTimelineClick,
    loadVideoPreview,

    // Canvas
    canvasRef,

    // Subtitles & Tab
    activeTab,
    setActiveTab,
    subtitleMode,
    setSubtitleMode,
    staticText,
    setStaticText,
    geminiPrompt,
    setGeminiPrompt,
    fontFamily,
    setFontFamily,
    textColor,
    setTextColor,
    bgColor,
    setBgColor,
    strokeColor,
    setStrokeColor,
    fontSize,
    setFontSize,
    useBackgroundBox,
    setUseBackgroundBox,
    mediaFileInputRef,
    isGeminiConnected,
    isTranscribingAudio,
    isGeneratingSubtitles,
    showAdvancedGeminiOptions,
    setShowAdvancedGeminiOptions,
    selectedMediaFile,
    setSelectedMediaFile,
    dynamicSegments,
    handleGenerateGeminiSubtitles,
    handleTranscribeCurrentVideo,

    // Watermarks
    userWatermarks,
    isLoadingWatermarks,
    selectedWatermarkId,
    setSelectedWatermarkId,
    watermarkPosition,
    setWatermarkPosition,
    watermarkOpacity,
    setWatermarkOpacity,
    watermarkScale,
    setWatermarkScale,

    // Render
    isGenerating,
    renderProgress,
    handleGenerateVideo,

    // Persistence
    handleResetStudio,
  } = useStudio({ navigate, params });

  return (
    <AppShell
      currentPath="studio"
      onNavigate={(path) => navigate(path)}
      userName={user?.name || ''}
      onUserAvatarClick={() => navigate('configuracoes')}
    >
      <div className="flex flex-col w-full text-on-surface pb-8">
        {/* ================= BARRA SUPERIOR DE CONTROLE DO STUDIO ================= */}
        <StudioHeader
          studioProjectTitle={studioProjectTitle}
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          videoQueueLength={videoQueue.length}
          activeQueueIndex={activeQueueIndex}
          hasCurrentVideo={Boolean(currentVideo)}
          isPreparingPreview={isPreparingPreview}
          isGenerating={isGenerating}
          renderProgress={renderProgress}
          onNavigateBack={() => navigate('varredura')}
          onResetStudio={handleResetStudio}
          onOpenDeleteModal={() => setIsDeleteStudioModalOpen(true)}
          onGenerateVideo={handleGenerateVideo}
        />

        {/* ================= FILA DE VÍDEOS PENDENTES (SELECIONADOS NA VARREDURA) ================= */}
        <StudioVideoQueue
          videoQueue={videoQueue}
          activeQueueIndex={activeQueueIndex}
          completedVideoIds={completedVideoIds}
          isGenerating={isGenerating}
          isPreparingPreview={isPreparingPreview}
          onSelectVideo={setActiveQueueIndex}
        />

        {/* ================= CORPO PRINCIPAL DO STUDIO ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
          {/* LADO ESQUERDO: PLAYER + TIMELINE (8 COLUNAS) */}
          <div className="lg:col-span-8 flex flex-col gap-space-md">
            <StudioPlayer
              currentVideo={currentVideo}
              aspectRatio={aspectRatio}
              previewStreamUrl={previewStreamUrl}
              isPreparingPreview={isPreparingPreview}
              previewError={previewError}
              isAuthError={isAuthError}
              videoRef={videoRef}
              canvasRef={canvasRef}
              isPlaying={isPlaying}
              isMuted={isMuted}
              setIsMuted={setIsMuted}
              currentTime={currentTime}
              totalDuration={totalDuration}
              trimIn={trimIn}
              trimOut={trimOut}
              setTotalDuration={setTotalDuration}
              setTrimOut={setTrimOut}
              setCurrentTime={setCurrentTime}
              setIsPlaying={setIsPlaying}
              handleTogglePlay={handleTogglePlay}
              seekVideoTo={seekVideoTo}
              loadVideoPreview={loadVideoPreview}
              onNavigateToVarredura={() => navigate('varredura')}
            />

            <StudioTimeline
              trimIn={trimIn}
              trimOut={trimOut}
              currentTime={currentTime}
              totalDuration={totalDuration}
              waveformPeaks={waveformPeaks}
              isPreparingPreview={isPreparingPreview}
              previewError={previewError}
              timelineRef={timelineRef}
              handleTimelineClick={handleTimelineClick}
              handleTimelineMouseDown={handleTimelineMouseDown}
              setTrimIn={setTrimIn}
              setTrimOut={setTrimOut}
            />
          </div>

          {/* LADO DIREITO: ABAS DE CUSTOMIZAÇÃO (4 COLUNAS) */}
          <div className="lg:col-span-4 flex flex-col gap-space-md">
            <Card className="bg-surface-container-low border border-surface-container-high/90 p-4 shadow-xl flex flex-col gap-4">
              {/* Abas Superiores do Painel Lateral */}
              <div className="flex items-center p-1 rounded-xl bg-surface-container border border-surface-container-highest">
                <button
                  type="button"
                  onClick={() => setActiveTab('legendas')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-title-sm text-title-sm transition-all cursor-pointer',
                    activeTab === 'legendas'
                      ? 'bg-primary text-on-primary font-bold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  )}
                >
                  <span className="material-symbols-outlined text-[18px]">subtitles</span>
                  <span>Legendas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('marca-dagua')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-title-sm text-title-sm transition-all cursor-pointer',
                    activeTab === 'marca-dagua'
                      ? 'bg-primary text-on-primary font-bold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  )}
                >
                  <span className="material-symbols-outlined text-[18px]">branding_watermark</span>
                  <span>Marca d'Água</span>
                </button>
              </div>

              {/* ABA 1: CONFIGURAÇÕES DE LEGENDA */}
              {activeTab === 'legendas' && (
                <StudioSubtitlesTab
                  isGeminiConnected={isGeminiConnected}
                  subtitleMode={subtitleMode}
                  setSubtitleMode={setSubtitleMode}
                  staticText={staticText}
                  setStaticText={setStaticText}
                  isTranscribingAudio={isTranscribingAudio}
                  isGeneratingSubtitles={isGeneratingSubtitles}
                  hasCurrentVideo={Boolean(currentVideo)}
                  trimIn={trimIn}
                  trimOut={trimOut}
                  totalDuration={totalDuration}
                  handleTranscribeCurrentVideo={handleTranscribeCurrentVideo}
                  showAdvancedGeminiOptions={showAdvancedGeminiOptions}
                  setShowAdvancedGeminiOptions={setShowAdvancedGeminiOptions}
                  geminiPrompt={geminiPrompt}
                  setGeminiPrompt={setGeminiPrompt}
                  mediaFileInputRef={mediaFileInputRef}
                  selectedMediaFile={selectedMediaFile}
                  setSelectedMediaFile={setSelectedMediaFile}
                  handleGenerateGeminiSubtitles={handleGenerateGeminiSubtitles}
                  dynamicSegments={dynamicSegments}
                  currentTime={currentTime}
                  setCurrentTime={setCurrentTime}
                  fontFamily={fontFamily}
                  setFontFamily={setFontFamily}
                  textColor={textColor}
                  setTextColor={setTextColor}
                  strokeColor={strokeColor}
                  setStrokeColor={setStrokeColor}
                  bgColor={bgColor}
                  setBgColor={setBgColor}
                  fontSize={fontSize}
                  setFontSize={setFontSize}
                  useBackgroundBox={useBackgroundBox}
                  setUseBackgroundBox={setUseBackgroundBox}
                />
              )}

              {/* ABA 2: MARCA D'ÁGUA */}
              {activeTab === 'marca-dagua' && (
                <StudioWatermarkTab
                  userWatermarks={userWatermarks}
                  isLoadingWatermarks={isLoadingWatermarks}
                  selectedWatermarkId={selectedWatermarkId}
                  setSelectedWatermarkId={setSelectedWatermarkId}
                  watermarkPosition={watermarkPosition}
                  setWatermarkPosition={setWatermarkPosition}
                  watermarkOpacity={watermarkOpacity}
                  setWatermarkOpacity={setWatermarkOpacity}
                  watermarkScale={watermarkScale}
                  setWatermarkScale={setWatermarkScale}
                  onNavigateToWatermarks={() => navigate('marcas')}
                />
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão do Studio */}
      <StudioDeleteModal
        isOpen={isDeleteStudioModalOpen}
        isLoading={isDeletingFromStudio}
        currentVideo={currentVideo}
        onClose={() => setIsDeleteStudioModalOpen(false)}
        onConfirm={async () => {
          setIsDeletingFromStudio(true);
          try {
            await handleDeleteFromStudio();
            setIsDeleteStudioModalOpen(false);
          } finally {
            setIsDeletingFromStudio(false);
          }
        }}
      />
    </AppShell>
  );
};
