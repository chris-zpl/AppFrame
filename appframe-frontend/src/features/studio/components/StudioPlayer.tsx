import React from 'react';
import { Card, Button } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';
import type { AspectRatio } from '../types';
import { formatStudioTime as formatTime } from '../utils';

import type { StudioVideoQueueItem } from '../../history';
import { useStudioContext } from '../context';

export interface StudioPlayerProps {
  currentVideo?: StudioVideoQueueItem | null;
  aspectRatio?: AspectRatio;
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
  loadVideoPreview?: (videoItem: any) => void;
  onNavigateToVarredura?: () => void;
}

export const StudioPlayer: React.FC<StudioPlayerProps> = (props) => {
  const studio = useStudioContext();

  const currentVideo = props.currentVideo ?? studio.currentVideo;
  const aspectRatio = props.aspectRatio ?? studio.aspectRatio;
  const previewStreamUrl = props.previewStreamUrl ?? studio.previewStreamUrl;
  const isPreparingPreview = props.isPreparingPreview ?? studio.isPreparingPreview;
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
  const onNavigateToVarredura = props.onNavigateToVarredura ?? (() => studio.navigate('varredura'));
  return (
    <Card className="relative overflow-hidden bg-surface-container-lowest border border-surface-container-high/90 p-4 flex flex-col items-center justify-center min-h-[460px] shadow-2xl">
      {/* Halos Luminosos Sutis no Player */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Moldura do Vídeo com Aspect Ratio Dinâmico */}
      <div
        onClick={previewStreamUrl && !isPreparingPreview ? handleTogglePlay : undefined}
        className={cn(
          'relative overflow-hidden rounded-2xl bg-black border border-surface-container-highest transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.8)] flex items-center justify-center',
          previewStreamUrl && !isPreparingPreview ? 'cursor-pointer' : '',
          aspectRatio === '9:16'
            ? 'w-[290px] h-[515px] sm:w-[320px] sm:h-[568px]'
            : 'w-full max-w-[620px] aspect-video'
        )}
      >
        {!currentVideo ? (
          <div className="flex flex-col items-center justify-center text-center p-6 gap-3 z-30">
            <span className="material-symbols-outlined text-[42px] text-primary/70">
              video_library
            </span>
            <p className="font-title-sm text-title-sm font-bold text-on-surface">
              Nenhum vídeo selecionado
            </p>
            <p className="text-body-sm text-on-surface-variant max-w-xs">
              Selecione um ou mais vídeos na tela de Varredura para carregá-los e editá-los em tempo real no Studio.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={onNavigateToVarredura}
              leftIcon={
                <span className="material-symbols-outlined text-[16px]">
                  travel_explore
                </span>
              }
            >
              Ir para Varredura
            </Button>
          </div>
        ) : isPreparingPreview ? (
          <div className="flex flex-col items-center justify-center text-center p-6 gap-3 z-30">
            <span className="material-symbols-outlined text-[40px] text-primary animate-spin">
              progress_activity
            </span>
            <p className="font-title-sm text-title-sm font-bold text-on-surface">
              Baixando vídeo para visualização em tempo real...
            </p>
            <p className="text-label-sm text-on-surface-variant max-w-xs line-clamp-2">
              {currentVideo.title}
            </p>
          </div>
        ) : previewError ? (
          <div className="flex flex-col items-center justify-center text-center p-6 gap-3 z-30 max-w-sm mx-auto">
            <span className="material-symbols-outlined text-[42px] text-error">
              {isAuthError ? 'lock_person' : 'error'}
            </span>
            <p className="font-title-sm text-title-sm font-bold text-on-surface">
              {isAuthError ? 'Vídeo com Restrição de Idade (+18)' : 'Falha ao carregar o vídeo'}
            </p>
            <p className="text-body-sm text-on-surface-variant line-clamp-4">
              {isAuthError
                ? 'Este vídeo possui restrição de idade (+18) do YouTube. O download requer autorização da conta global configurada no servidor (storage/cookies.txt).'
                : previewError}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (currentVideo) loadVideoPreview(currentVideo);
                }}
                leftIcon={
                  <span className="material-symbols-outlined text-[16px]">
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
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(e) => {
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
              console.error('Erro no elemento de vídeo:', err?.code, err?.message);
              toast.error('Erro ao decodificar stream do vídeo no navegador.');
            }}
            className="w-full h-full object-contain select-none"
          />
        ) : null}

        {/* Camada de Canvas Sobreposta ao Vídeo */}
        <canvas
          ref={canvasRef}
          width={aspectRatio === '9:16' ? 360 : 640}
          height={aspectRatio === '9:16' ? 640 : 360}
          className={cn(
            'absolute inset-0 w-full h-full object-contain pointer-events-none z-20',
            (!previewStreamUrl || isPreparingPreview || Boolean(previewError)) &&
              'hidden'
          )}
        />

        {/* Indicador de Margens Seguras (Safe Zone) */}
        <div className="absolute inset-4 border border-dashed border-primary/20 rounded-xl pointer-events-none z-10 flex items-start justify-end p-1">
          <span className="text-[9px] font-bold tracking-wider uppercase text-primary/40 bg-black/40 px-1 rounded">
            Safe Zone
          </span>
        </div>

        {/* Botão Central de Play no Hover */}
        {!isPlaying && Boolean(previewStreamUrl) && !isPreparingPreview && (
          <button
            type="button"
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
      <div className="w-full max-w-xl mt-4 flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-surface-container/80 backdrop-blur-md border border-surface-container-high/80">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={!previewStreamUrl || isPreparingPreview}
            onClick={handleTogglePlay}
            className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95 cursor-pointer shadow-sm disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[20px]">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>

          <button
            type="button"
            disabled={!previewStreamUrl || isPreparingPreview}
            onClick={() => seekVideoTo(Math.max(trimIn, currentTime - 5))}
            title="Retroceder 5 segundos"
            className="w-8 h-8 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[18px]">replay_5</span>
          </button>

          <button
            type="button"
            disabled={!previewStreamUrl || isPreparingPreview}
            onClick={() => seekVideoTo(Math.min(trimOut, currentTime + 5))}
            title="Avançar 5 segundos"
            className="w-8 h-8 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[18px]">forward_5</span>
          </button>

          <button
            type="button"
            disabled={!previewStreamUrl || isPreparingPreview}
            onClick={() => {
              const next = !isMuted;
              setIsMuted(next);
              if (videoRef.current) {
                videoRef.current.muted = next;
              }
            }}
            title={isMuted ? 'Ativar som' : 'Silenciar áudio'}
            className="w-8 h-8 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[18px]">
              {isMuted ? 'volume_off' : 'volume_up'}
            </span>
          </button>
        </div>

        {/* Cronômetro com Números Tabulares Precisos */}
        <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-lg border border-outline/10">
          <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
          <span className="font-mono text-title-sm text-title-sm font-bold text-on-surface tabular-nums">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </span>
          <span className="text-[10px] text-outline px-1 py-0.5 rounded bg-surface-container font-mono">
            Corte: {formatTime(Math.max(0, trimOut - trimIn))}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!previewStreamUrl || isPreparingPreview}
            onClick={() => seekVideoTo(trimIn)}
            title="Ir para Marcador In"
            className="px-2 py-1 text-label-sm font-label-sm rounded-md bg-surface-container hover:bg-surface-container-high text-primary font-bold cursor-pointer disabled:opacity-40"
          >
            Ir ao In
          </button>
          <button
            type="button"
            disabled={!previewStreamUrl || isPreparingPreview}
            onClick={() => seekVideoTo(trimOut)}
            title="Ir para Marcador Out"
            className="px-2 py-1 text-label-sm font-label-sm rounded-md bg-surface-container hover:bg-surface-container-high text-primary font-bold cursor-pointer disabled:opacity-40"
          >
            Ir ao Out
          </button>
        </div>
      </div>
    </Card>
  );
};
