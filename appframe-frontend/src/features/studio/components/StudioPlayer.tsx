import React from "react";
import { Card, Button } from "../../../components/ui";
import { cn } from "../../../lib/utils";
import { toast } from "sonner";
import type { AspectRatio } from "../types";
import { formatStudioTime as formatTime } from "../utils";

import type { StudioVideoQueueItem } from "../../history";
import { useStudioContext } from "../context";

export interface StudioPlayerProps {
  currentVideo?: StudioVideoQueueItem | null;
  aspectRatio?: AspectRatio;
  setAspectRatio?: (ratio: AspectRatio) => void;
  previewStreamUrl?: string | null;
  isPreparingPreview?: boolean;
  previewError?: string | null;
  isAuthError?: boolean;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  isPlaying?: boolean;
  isMuted?: boolean;
  setIsMuted?: React.Dispatch<React.SetStateAction<boolean>>;
  currentTime?: number;
  totalDuration?: number;
  trimIn?: number;
  trimOut?: number;
  setTotalDuration?: React.Dispatch<React.SetStateAction<number>>;
  setTrimOut?: React.Dispatch<React.SetStateAction<number>>;
  setCurrentTime?: React.Dispatch<React.SetStateAction<number>>;
  setIsPlaying?: React.Dispatch<React.SetStateAction<boolean>>;
  handleTogglePlay?: () => void;
  seekVideoTo?: (time: number) => void;
  loadVideoPreview?: (videoItem: any, force?: boolean) => void;
  onNavigateToVarredura?: () => void;
  isGenerating?: boolean;
  renderProgress?: number;
  initialSeekTimeRef?: React.MutableRefObject<number | null>;
}

export const StudioPlayer: React.FC<StudioPlayerProps> = (props) => {
  const studio = useStudioContext();

  const currentVideo = props.currentVideo ?? studio.currentVideo;
  const aspectRatio = props.aspectRatio ?? studio.aspectRatio;
  const setAspectRatio = props.setAspectRatio ?? studio.setAspectRatio;
  const previewStreamUrl = props.previewStreamUrl ?? studio.previewStreamUrl;
  const isPreparingPreview =
    props.isPreparingPreview ?? studio.isPreparingPreview;
  const previewError = props.previewError ?? studio.previewError;
  const isAuthError = props.isAuthError ?? studio.isAuthError;
  const videoRef = props.videoRef ?? studio.videoRef;
  const canvasRef = props.canvasRef ?? studio.canvasRef;
  const isPlaying = props.isPlaying ?? studio.isPlaying;
  const isMuted = props.isMuted ?? studio.isMuted;
  const setIsMuted = props.setIsMuted ?? studio.setIsMuted;
  const currentTime = props.currentTime ?? studio.currentTime;
  const totalDuration = props.totalDuration ?? studio.totalDuration;
  const trimIn = props.trimIn ?? studio.trimIn;
  const trimOut = props.trimOut ?? studio.trimOut;
  const setTotalDuration = props.setTotalDuration ?? studio.setTotalDuration;
  const setTrimOut = props.setTrimOut ?? studio.setTrimOut;
  const setCurrentTime = props.setCurrentTime ?? studio.setCurrentTime;
  const setIsPlaying = props.setIsPlaying ?? studio.setIsPlaying;
  const handleTogglePlay = props.handleTogglePlay ?? studio.handleTogglePlay;
  const seekVideoTo = props.seekVideoTo ?? studio.seekVideoTo;
  const loadVideoPreview = props.loadVideoPreview ?? studio.loadVideoPreview;
  const isGenerating = props.isGenerating ?? studio.isGenerating;
  const renderProgress = props.renderProgress ?? studio.renderProgress ?? 0;
  const initialSeekTimeRef = props.initialSeekTimeRef ?? studio.initialSeekTimeRef;
  const onNavigateToVarredura =
    props.onNavigateToVarredura ?? (() => studio.navigate("varredura"));

  const renderPlayerButtons = () => (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        aria-label={isPlaying ? "Pausar vídeo" : "Reproduzir vídeo"}
        title={isPlaying ? "Pausar" : "Reproduzir"}
        disabled={!previewStreamUrl || isPreparingPreview || isGenerating}
        onClick={handleTogglePlay}
        className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95 cursor-pointer shadow-sm disabled:opacity-40"
      >
        <span className="material-symbols-outlined text-[20px]">
          {isPlaying ? "pause" : "play_arrow"}
        </span>
      </button>

      <button
        type="button"
        aria-label="Retroceder 5 segundos"
        disabled={!previewStreamUrl || isPreparingPreview || isGenerating}
        onClick={() => seekVideoTo(Math.max(trimIn, currentTime - 5))}
        title="Retroceder 5 segundos"
        className="w-8 h-8 rounded-lg text-neutral-600 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface hover:bg-neutral-100 dark:hover:bg-surface-container-high flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
      >
        <span className="material-symbols-outlined text-[18px]">replay_5</span>
      </button>

      <button
        type="button"
        aria-label="Avançar 5 segundos"
        disabled={!previewStreamUrl || isPreparingPreview || isGenerating}
        onClick={() => seekVideoTo(Math.min(trimOut, currentTime + 5))}
        title="Avançar 5 segundos"
        className="w-8 h-8 rounded-lg text-neutral-600 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface hover:bg-neutral-100 dark:hover:bg-surface-container-high flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
      >
        <span className="material-symbols-outlined text-[18px]">forward_5</span>
      </button>

      <button
        type="button"
        aria-label={isMuted ? "Ativar som" : "Silenciar áudio"}
        disabled={!previewStreamUrl || isPreparingPreview || isGenerating}
        onClick={() => {
          const next = !isMuted;
          setIsMuted(next);
          if (videoRef.current) {
            videoRef.current.muted = next;
          }
        }}
        title={isMuted ? "Ativar som" : "Silenciar áudio"}
        className="w-8 h-8 rounded-lg text-neutral-600 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface hover:bg-neutral-100 dark:hover:bg-surface-container-high flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
      >
        <span className="material-symbols-outlined text-[18px]">
          {isMuted ? "volume_off" : "volume_up"}
        </span>
      </button>
    </div>
  );

  const renderTimerDisplay = (extraClasses?: string) => (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-outline/10 min-w-0 bg-slate-100 border-slate-200 text-slate-800 dark:bg-surface-container-lowest dark:border-outline/10 dark:text-on-surface",
        extraClasses,
      )}
    >
      {/* Grupo 1: Ícone de relógio + Timer principal (ficam sempre juntos na mesma linha) */}
      <div className="flex items-center gap-1.5 min-w-0 shrink-0">
        <span className="material-symbols-outlined text-[16px] text-amber-700 dark:text-primary shrink-0">
          schedule
        </span>
        <span className="font-mono text-title-sm font-bold text-neutral-900 dark:text-on-surface tabular-nums truncate">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>
      </div>

      {/* Grupo 2: Timer de corte (fica embaixo no mobile e ao lado a partir de telas sm:) */}
      <span className="text-[10px] text-neutral-600 dark:text-outline px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-surface-container font-mono shrink-0 whitespace-nowrap">
        Corte: {formatTime(Math.max(0, trimOut - trimIn))}
      </span>
    </div>
  );

  const renderMarkerInButton = () => (
    <button
      type="button"
      aria-label="Ir para Marcador In"
      disabled={!previewStreamUrl || isPreparingPreview || isGenerating}
      onClick={() => seekVideoTo(trimIn)}
      title="Ir para Marcador In"
      className="px-2 py-1 text-label-sm font-label-sm rounded-md bg-neutral-100 dark:bg-surface-container hover:bg-neutral-200 dark:hover:bg-surface-container-high text-amber-800 dark:text-primary font-bold cursor-pointer disabled:opacity-40 shrink-0 border border-neutral-200 dark:border-transparent"
    >
      Ir ao In
    </button>
  );

  const renderMarkerOutButton = () => (
    <button
      type="button"
      aria-label="Ir para Marcador Out"
      disabled={!previewStreamUrl || isPreparingPreview || isGenerating}
      onClick={() => seekVideoTo(trimOut)}
      title="Ir para Marcador Out"
      className="px-2 py-1 text-label-sm font-label-sm rounded-md bg-neutral-100 dark:bg-surface-container hover:bg-neutral-200 dark:hover:bg-surface-container-high text-amber-800 dark:text-primary font-bold cursor-pointer disabled:opacity-40 shrink-0 border border-neutral-200 dark:border-transparent"
    >
      Ir ao Out
    </button>
  );

  return (
    <Card className="relative overflow-hidden bg-white dark:bg-surface-container-lowest border border-neutral-200 dark:border-surface-container-high/90 p-4 flex flex-col items-center justify-center min-h-[460px] shadow-sm dark:shadow-2xl">
      {/* Halos Luminosos Sutis no Player */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Alternador de Aspecto entre 9:16 e 16:9 Centralizado no Topo do Player */}
      <div className="flex items-center justify-center mb-4 z-20">
        <div className="flex items-center p-1 rounded-xl bg-neutral-100 dark:bg-surface-container/90 backdrop-blur-md border border-neutral-200 dark:border-surface-container-highest shadow-sm">
          <button
            type="button"
            aria-label="Formato Vertical 9:16 (Shorts/Reels/TikTok)"
            aria-pressed={aspectRatio === "9:16"}
            onClick={() => setAspectRatio("9:16")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-md font-label-md transition-all cursor-pointer",
              aspectRatio === "9:16"
                ? "bg-primary text-on-primary font-bold shadow-sm"
                : "text-neutral-600 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface",
            )}
            title="Formato Vertical 9:16 (Shorts/Reels/TikTok)"
          >
            <span className="material-symbols-outlined text-[16px]">
              stay_current_portrait
            </span>
            <span>9:16</span>
          </button>
          <button
            type="button"
            aria-label="Formato Horizontal 16:9 (YouTube Widescreen)"
            aria-pressed={aspectRatio === "16:9"}
            onClick={() => setAspectRatio("16:9")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-md font-label-md transition-all cursor-pointer",
              aspectRatio === "16:9"
                ? "bg-primary text-on-primary font-bold shadow-sm"
                : "text-neutral-600 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface",
            )}
            title="Formato Horizontal 16:9 (YouTube Widescreen)"
          >
            <span className="material-symbols-outlined text-[16px]">
              stay_current_landscape
            </span>
            <span>16:9</span>
          </button>
        </div>
      </div>

      {/* Moldura do Vídeo com Aspect Ratio Dinâmico */}
      <div
        onClick={
          previewStreamUrl && !isPreparingPreview && !isGenerating ? handleTogglePlay : undefined
        }
        className={cn(
          "relative overflow-hidden rounded-2xl bg-black border border-surface-container-highest transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.8)] flex items-center justify-center",
          previewStreamUrl && !isPreparingPreview && !isGenerating ? "cursor-pointer" : "",
          aspectRatio === "9:16"
            ? "w-[290px] h-[515px] sm:w-[320px] sm:h-[568px]"
            : "w-full max-w-[620px] aspect-video",
        )}
      >
        {!currentVideo ? (
          <div className="flex flex-col items-center justify-center text-center p-2.5 sm:p-6 gap-1 sm:gap-3 z-30 max-h-full max-w-sm mx-auto overflow-hidden">
            <span className="material-symbols-outlined text-[26px] sm:text-[42px] text-primary/70 shrink-0">
              video_library
            </span>
            <p className="font-bold text-white dark:text-on-surface text-xs sm:text-title-sm leading-tight">
              Nenhum vídeo selecionado
            </p>
            <p className="text-[11px] sm:text-body-sm text-neutral-300 dark:text-on-surface-variant max-w-[260px] sm:max-w-xs line-clamp-2 leading-tight">
              Selecione vídeos na tela de Varredura para editá-los em tempo real
              no Studio.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={onNavigateToVarredura}
              className="h-7 sm:h-8 text-[11px] sm:text-xs px-2.5 py-0.5 mt-0.5 sm:mt-1 shrink-0"
              leftIcon={
                <span className="material-symbols-outlined text-[14px] sm:text-[16px]">
                  travel_explore
                </span>
              }
            >
              Ir para Varredura
            </Button>
          </div>
        ) : isPreparingPreview ? (
          <div className="flex flex-col items-center justify-center text-center p-2.5 sm:p-6 gap-1.5 sm:gap-3 z-30 max-h-full max-w-sm mx-auto overflow-hidden">
            <span className="material-symbols-outlined text-[26px] sm:text-[40px] text-primary animate-spin shrink-0">
              progress_activity
            </span>
            <p className="font-bold text-white text-xs sm:text-title-sm leading-tight">
              Baixando vídeo para visualização...
            </p>
            <p className="text-[11px] sm:text-label-sm text-neutral-300 max-w-[250px] sm:max-w-xs line-clamp-1 leading-tight">
              {currentVideo.title}
            </p>
          </div>
        ) : previewError ? (
          <div className="flex flex-col items-center justify-center text-center p-2.5 sm:p-6 gap-1 sm:gap-3 z-30 max-w-xs sm:max-w-sm mx-auto max-h-full overflow-hidden">
            <span className="material-symbols-outlined text-[26px] sm:text-[42px] text-error shrink-0">
              {isAuthError ? "lock_person" : "error"}
            </span>
            <p className="font-bold text-white text-xs sm:text-title-sm leading-tight">
              {isAuthError
                ? "Vídeo com Restrição (+18)"
                : "Falha ao carregar o vídeo"}
            </p>
            <p className="text-[10px] sm:text-body-sm text-neutral-300 line-clamp-2 sm:line-clamp-4 leading-tight">
              {isAuthError
                ? "Requer autorização de conta global salva no servidor (cookies.txt)."
                : previewError}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (currentVideo) loadVideoPreview(currentVideo, true);
                }}
                className="h-7 sm:h-8 text-[11px] sm:text-xs px-2.5 py-0.5 shrink-0"
                leftIcon={
                  <span className="material-symbols-outlined text-[14px] sm:text-[16px]">
                    refresh
                  </span>
                }
              >
                Tentar Novamente
              </Button>
            </div>
          </div>
        ) : previewStreamUrl ? (
          <video
            ref={videoRef}
            src={previewStreamUrl}
            playsInline
            preload="auto"
            muted={isMuted}
            onLoadedMetadata={(e) => {
              const vid = e.currentTarget;
              if (Number.isFinite(vid.duration) && vid.duration > 0) {
                const dur = Number(vid.duration.toFixed(2));
                setTotalDuration((prev) => (prev <= 0 ? dur : prev));
                setTrimOut((prev) => (prev <= 0 ? dur : prev));
              }
              const targetTime =
                initialSeekTimeRef?.current !== null && initialSeekTimeRef?.current !== undefined
                  ? initialSeekTimeRef.current
                  : (currentTime > 0 ? currentTime : null);
              if (targetTime !== null && targetTime > 0) {
                try {
                  vid.currentTime = targetTime;
                  setCurrentTime(targetTime);
                } catch {}
              }
              if (initialSeekTimeRef) {
                initialSeekTimeRef.current = null;
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(e) => {
              if (initialSeekTimeRef?.current !== null && initialSeekTimeRef?.current !== undefined) {
                return;
              }
              const vid = e.currentTarget;
              const now = vid.currentTime;
              setCurrentTime(now);
              if (trimOut > trimIn && now >= trimOut) {
                vid.pause();
                vid.currentTime = trimIn;
                setIsPlaying(false);
                setCurrentTime(trimIn);
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              seekVideoTo(trimIn);
            }}
            onError={(e) => {
              const err = e.currentTarget.error;
              console.error(
                "Erro no elemento de vídeo:",
                err?.code,
                err?.message,
              );
              toast.error("Erro ao decodificar stream do vídeo no navegador.");
            }}
            className="w-full h-full object-contain select-none"
          />
        ) : null}

        {/* Camada de Canvas Sobreposta ao Vídeo */}
        <canvas
          ref={canvasRef}
          width={aspectRatio === "9:16" ? 360 : 640}
          height={aspectRatio === "9:16" ? 640 : 360}
          className={cn(
            "absolute inset-0 w-full h-full object-contain pointer-events-none z-20",
            (!previewStreamUrl ||
              isPreparingPreview ||
              Boolean(previewError)) &&
              "hidden",
          )}
        />

        {/* Indicador de Margens Seguras (Safe Zone) */}
        <div className="absolute inset-4 border border-dashed border-primary/20 rounded-xl pointer-events-none z-10 flex items-start justify-end p-1">
          <span className="text-[9px] font-bold tracking-wider uppercase text-primary/40 bg-black/40 px-1 rounded">
            Safe Zone
          </span>
        </div>

        {/* Overlay Escuro com Spinner Centralizado e Mensagem durante a Geração do Vídeo */}
        {isGenerating && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 z-40 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-4 transition-all duration-300 pointer-events-auto select-none"
          >
            <div className="relative flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[44px] sm:text-[52px] text-primary animate-spin">
                progress_activity
              </span>
            </div>
            <p className="font-bold text-white text-xs sm:text-title-sm tracking-wide leading-tight">
              {renderProgress > 0 ? `Gerando vídeo (${renderProgress}%)...` : "Gerando vídeo..."}
            </p>
            <p className="text-[11px] sm:text-body-sm text-neutral-300 mt-1.5 max-w-[240px] sm:max-w-xs leading-tight">
              Processando cortes e renderização pelo FFmpeg. Aguarde um momento.
            </p>
          </div>
        )}

        {/* Botão Central de Play no Hover */}
        {!isPlaying && Boolean(previewStreamUrl) && !isPreparingPreview && !isGenerating && (
          <button
            type="button"
            aria-label="Reproduzir vídeo"
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePlay();
            }}
            className="absolute z-30 w-16 h-16 rounded-full bg-primary/90 text-on-primary flex items-center justify-center shadow-[0_0_24px_rgba(242,190,94,0.4)] transition-transform hover:scale-110 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[36px] ml-1">
              play_arrow
            </span>
          </button>
        )}
      </div>

      {/* Barra de Controles do Player com Cronômetro Tabular */}
      <div className="w-full max-w-xl mt-4 px-3 py-2 rounded-xl bg-white/90 text-slate-800 border border-slate-200/80 shadow-md backdrop-blur-md dark:bg-surface-container/80 dark:text-on-surface dark:border-surface-container-high/80 dark:shadow-none">
        {/* Layout para telas pequenas (sm e mobile) */}
        <div className="flex sm:hidden flex-col items-center gap-2.5 w-full">
          <div className="flex items-center justify-between w-full gap-2 min-w-0">
            {renderMarkerInButton()}
            {renderTimerDisplay("justify-center")}
            {renderMarkerOutButton()}
          </div>
          <div className="flex items-center justify-center">
            {renderPlayerButtons()}
          </div>
        </div>

        {/* Layout para desktop (sm e superior) */}
        <div className="hidden sm:flex items-center justify-between gap-3 w-full">
          {renderPlayerButtons()}
          {renderTimerDisplay()}
          <div className="flex items-center gap-1 shrink-0">
            {renderMarkerInButton()}
            {renderMarkerOutButton()}
          </div>
        </div>
      </div>
    </Card>
  );
};
