import React from 'react';
import { Button, Textarea } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';
import type { FontFamily, SubtitleMode } from '../types';
import type { GeminiSubtitleSegment } from '../../history';

import { useStudioContext } from '../context';

export interface StudioSubtitlesTabProps {
  isGeminiConnected?: boolean;
  subtitleMode?: SubtitleMode;
  setSubtitleMode?: (mode: SubtitleMode) => void;
  staticText?: string;
  setStaticText?: (val: string) => void;
  isTranscribingAudio?: boolean;
  isGeneratingSubtitles?: boolean;
  hasCurrentVideo?: boolean;
  trimIn?: number;
  trimOut?: number;
  totalDuration?: number;
  handleTranscribeCurrentVideo?: () => void;
  showAdvancedGeminiOptions?: boolean;
  setShowAdvancedGeminiOptions?: React.Dispatch<React.SetStateAction<boolean>>;
  geminiPrompt?: string;
  setGeminiPrompt?: (val: string) => void;
  mediaFileInputRef?: React.RefObject<HTMLInputElement | null>;
  selectedMediaFile?: File | null;
  setSelectedMediaFile?: (file: File | null) => void;
  handleGenerateGeminiSubtitles?: (prompt: string) => void;
  dynamicSegments?: GeminiSubtitleSegment[];
  currentTime?: number;
  setCurrentTime?: (t: number) => void;
  fontFamily?: FontFamily;
  setFontFamily?: (f: FontFamily) => void;
  textColor?: string;
  setTextColor?: (c: string) => void;
  strokeColor?: string;
  setStrokeColor?: (c: string) => void;
  bgColor?: string;
  setBgColor?: (c: string) => void;
  fontSize?: number;
  setFontSize?: (s: number) => void;
  useBackgroundBox?: boolean;
  setUseBackgroundBox?: (b: boolean) => void;
}

export const StudioSubtitlesTab: React.FC<StudioSubtitlesTabProps> = (props) => {
  const studio = useStudioContext();

  const isGeminiConnected = props.isGeminiConnected ?? studio.isGeminiConnected;
  const subtitleMode = props.subtitleMode ?? studio.subtitleMode;
  const setSubtitleMode = props.setSubtitleMode ?? studio.setSubtitleMode;
  const staticText = props.staticText ?? studio.staticText;
  const setStaticText = props.setStaticText ?? studio.setStaticText;
  const isTranscribingAudio = props.isTranscribingAudio ?? studio.isTranscribingAudio;
  const isGeneratingSubtitles = props.isGeneratingSubtitles ?? studio.isGeneratingSubtitles;
  const hasCurrentVideo = props.hasCurrentVideo ?? Boolean(studio.currentVideo);
  const trimIn = props.trimIn ?? studio.trimIn;
  const trimOut = props.trimOut ?? studio.trimOut;
  const totalDuration = props.totalDuration ?? studio.totalDuration;
  const handleTranscribeCurrentVideo = props.handleTranscribeCurrentVideo ?? studio.handleTranscribeCurrentVideo;
  const showAdvancedGeminiOptions = props.showAdvancedGeminiOptions ?? studio.showAdvancedGeminiOptions;
  const setShowAdvancedGeminiOptions = props.setShowAdvancedGeminiOptions ?? studio.setShowAdvancedGeminiOptions;
  const geminiPrompt = props.geminiPrompt ?? studio.geminiPrompt;
  const setGeminiPrompt = props.setGeminiPrompt ?? studio.setGeminiPrompt;
  const mediaFileInputRef = props.mediaFileInputRef ?? studio.mediaFileInputRef;
  const selectedMediaFile = props.selectedMediaFile ?? studio.selectedMediaFile;
  const setSelectedMediaFile = props.setSelectedMediaFile ?? studio.setSelectedMediaFile;
  const handleGenerateGeminiSubtitles = props.handleGenerateGeminiSubtitles ?? studio.handleGenerateGeminiSubtitles;
  const dynamicSegments = props.dynamicSegments ?? studio.dynamicSegments;
  const currentTime = props.currentTime ?? studio.currentTime;
  const setCurrentTime = props.setCurrentTime ?? studio.setCurrentTime;
  const fontFamily = props.fontFamily ?? studio.fontFamily;
  const setFontFamily = props.setFontFamily ?? studio.setFontFamily;
  const textColor = props.textColor ?? studio.textColor;
  const setTextColor = props.setTextColor ?? studio.setTextColor;
  const strokeColor = props.strokeColor ?? studio.strokeColor;
  const setStrokeColor = props.setStrokeColor ?? studio.setStrokeColor;
  const bgColor = props.bgColor ?? studio.bgColor;
  const setBgColor = props.setBgColor ?? studio.setBgColor;
  const fontSize = props.fontSize ?? studio.fontSize;
  const setFontSize = props.setFontSize ?? studio.setFontSize;
  const useBackgroundBox = props.useBackgroundBox ?? studio.useBackgroundBox;
  const setUseBackgroundBox = props.setUseBackgroundBox ?? studio.setUseBackgroundBox;
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Indicador de Status da IA Gemini (Global) */}
      <div
        className={cn(
          'p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all',
          isGeminiConnected
            ? 'bg-emerald-500/10 border-emerald-500/25'
            : 'bg-amber-500/10 border-amber-500/25'
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              'material-symbols-outlined text-[18px] shrink-0',
              isGeminiConnected ? 'text-emerald-400' : 'text-amber-400'
            )}
          >
            {isGeminiConnected ? 'auto_awesome' : 'info'}
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-bold text-neutral-900 dark:text-on-surface truncate">
              {isGeminiConnected ? 'IA Gemini Habilitada' : 'IA Gemini Indisponível'}
            </span>
            <span className="text-[11px] text-neutral-600 dark:text-on-surface-variant truncate">
              {isGeminiConnected
                ? 'Transcrições e legendas dinâmicas ativas'
                : 'Contate o administrador para configurar a chave global'}
            </span>
          </div>
        </div>
      </div>

      {/* Alternador entre Legenda Fixa e Legenda Dinâmica Gemini */}
      <div className="flex flex-col gap-1.5">
        <label className="text-label-sm font-label-sm text-neutral-500 dark:text-outline font-semibold uppercase tracking-wider">
          Modo de Legenda
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSubtitleMode('static')}
            className={cn(
              'flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-label-md font-label-md transition-all cursor-pointer',
              subtitleMode === 'static'
                ? 'bg-amber-500/15 dark:bg-primary/15 border-amber-600/40 dark:border-primary text-amber-800 dark:text-primary font-bold shadow-sm'
                : 'bg-neutral-50 dark:bg-surface-container border border-neutral-200 dark:border-surface-container-highest text-neutral-700 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface'
            )}
          >
            <span className="material-symbols-outlined text-[18px]">title</span>
            <span>Legenda Fixa</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isGeminiConnected) {
                toast.info(
                  'O assistente de inteligência artificial (Gemini) ainda não foi configurado na plataforma pelo administrador.'
                );
                return;
              }
              setSubtitleMode('dynamic');
            }}
            className={cn(
              'flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-label-md font-label-md transition-all cursor-pointer',
              subtitleMode === 'dynamic' && isGeminiConnected
                ? 'bg-amber-500/15 dark:bg-primary/15 border-amber-600/40 dark:border-primary text-amber-800 dark:text-primary font-bold shadow-sm'
                : !isGeminiConnected
                  ? 'bg-neutral-50 dark:bg-surface-container-lowest border border-neutral-200 dark:border-surface-container-highest text-outline opacity-75 hover:border-primary/40'
                  : 'bg-neutral-50 dark:bg-surface-container border border-neutral-200 dark:border-surface-container-highest text-neutral-700 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface'
            )}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isGeminiConnected ? 'auto_awesome' : 'lock'}
            </span>
            <span>Dinâmica (Gemini)</span>
          </button>
        </div>
      </div>

      {/* Campo de Texto Estático ou Gerador Dinâmico Gemini */}
      {subtitleMode === 'static' ? (
        <Textarea
          label="Texto da Legenda Estática"
          value={staticText}
          onChange={(e) => setStaticText(e.target.value)}
          rows={3}
          placeholder="Digite o texto que será renderizado no vídeo..."
          className="resize-none"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {/* Card Principal de Destaque: Transcrever Áudio do Vídeo (Reconhecimento de Fala Real) */}
          <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-surface-container-lowest border border-amber-500/30 dark:border-primary/40 flex flex-col gap-2.5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/15 dark:bg-primary/15 text-amber-700 dark:text-primary shrink-0">
                <span className="material-symbols-outlined text-[20px] block">
                  record_voice_over
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-label-md font-bold text-neutral-900 dark:text-on-surface">
                  Transcrever Áudio do Vídeo
                </span>
                <span className="text-[11px] text-neutral-500 dark:text-outline leading-tight">
                  Ouve a fala real do vídeo e sincroniza cada bloco com precisão
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              disabled={
                !isGeminiConnected ||
                isTranscribingAudio ||
                isGeneratingSubtitles ||
                !hasCurrentVideo
              }
              isLoading={isTranscribingAudio}
              onClick={handleTranscribeCurrentVideo}
              leftIcon={
                <span className="material-symbols-outlined text-[18px]">
                  {isGeminiConnected ? 'mic' : 'lock'}
                </span>
              }
              className="w-full font-bold shadow-md"
            >
              {!isGeminiConnected
                ? 'IA Gemini Indisponível'
                : isTranscribingAudio
                  ? 'Ouvindo e Transcrevendo Fala...'
                  : 'Transcrever Fala do Vídeo com Gemini'}
            </Button>

            {trimIn > 0 || (trimOut > 0 && trimOut < totalDuration) ? (
              <span className="text-[10px] text-amber-700 dark:text-primary/80 flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-[12px]">content_cut</span>
                Transcrevendo trecho ativo da timeline ({trimIn.toFixed(1)}s a {trimOut.toFixed(1)}s)
              </span>
            ) : null}

            {!isGeminiConnected && (
              <p className="text-[11px] text-neutral-500 dark:text-outline text-center">
                IA Gemini não configurada no servidor. Contate o administrador.
              </p>
            )}
          </div>

          {/* Opções Alternativas: Roteiro por IA ou Upload de Arquivo Próprio */}
          <div className="rounded-xl border border-neutral-200 dark:border-surface-container-highest bg-neutral-50 dark:bg-surface-container-lowest overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedGeminiOptions((v) => !v)}
              className="w-full flex items-center justify-between p-2.5 text-[12px] font-semibold text-neutral-700 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface hover:bg-neutral-100 dark:hover:bg-surface-container-low transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-neutral-500 dark:text-outline">tune</span>
                <span>Outras opções: Gerar por roteiro de IA ou arquivo externo</span>
              </span>
              <span
                className={cn(
                  'material-symbols-outlined text-[16px] transition-transform duration-200',
                  showAdvancedGeminiOptions && 'rotate-180'
                )}
              >
                expand_more
              </span>
            </button>

            {showAdvancedGeminiOptions && (
              <div className="p-3 border-t border-neutral-200 dark:border-surface-container-highest flex flex-col gap-3">
                <Textarea
                  label="Roteiro / Contexto para o Gemini"
                  value={geminiPrompt}
                  onChange={(e) => setGeminiPrompt(e.target.value)}
                  rows={3}
                  disabled={!isGeminiConnected}
                  placeholder="Informe o tema/roteiro do vídeo caso queira que a IA invente legendas dinâmicas a partir de um texto..."
                  className="resize-none"
                />

                {/* Upload opcional de arquivo externo */}
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-neutral-100 dark:bg-surface-container border border-neutral-200 dark:border-surface-container-highest">
                  <input
                    ref={mediaFileInputRef}
                    type="file"
                    accept="audio/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setSelectedMediaFile(f);
                    }}
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[18px] text-amber-700 dark:text-primary shrink-0">
                      audio_file
                    </span>
                    <span className="text-body-xs text-neutral-600 dark:text-on-surface-variant truncate">
                      {selectedMediaFile
                        ? selectedMediaFile.name
                        : 'Arquivo avulso (opcional)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {selectedMediaFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMediaFile(null);
                          if (mediaFileInputRef.current) {
                            mediaFileInputRef.current.value = '';
                          }
                        }}
                        className="p-1 rounded-lg text-neutral-500 dark:text-outline hover:text-error cursor-pointer"
                        title="Remover arquivo"
                        aria-label="Remover arquivo selecionado"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!isGeminiConnected}
                      onClick={() => mediaFileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-neutral-200 dark:bg-surface-container-high hover:bg-neutral-300 dark:hover:bg-surface-container-highest text-[11px] font-semibold text-neutral-800 dark:text-on-surface transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Escolher Arquivo
                    </button>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!isGeminiConnected || isGeneratingSubtitles || isTranscribingAudio}
                  isLoading={isGeneratingSubtitles}
                  onClick={() => handleGenerateGeminiSubtitles(geminiPrompt)}
                  leftIcon={
                    <span className="material-symbols-outlined text-[16px]">
                      auto_awesome
                    </span>
                  }
                  className="w-full font-bold"
                >
                  Gerar Legendas por Roteiro / Arquivo
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lista Real de Segmentos Gerados pelo Gemini */}
      {dynamicSegments.length > 0 && (
        <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-neutral-50 dark:bg-surface-container-lowest border border-neutral-200 dark:border-surface-container-highest max-h-40 overflow-y-auto">
          <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-outline font-semibold mb-1">
            <span>Legendas Sincronizadas ({dynamicSegments.length})</span>
            <span>Clique para pré-visualizar</span>
          </div>
          {dynamicSegments.map((seg, idx) => {
            const isActive = currentTime >= seg.start && currentTime <= seg.end;
            return (
              <button
                key={`${seg.start}-${idx}`}
                type="button"
                onClick={() => {
                  setSubtitleMode('dynamic');
                  setCurrentTime(seg.start);
                }}
                className={cn(
                  'flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-body-xs transition-colors cursor-pointer',
                  isActive
                    ? 'bg-amber-500/20 dark:bg-primary/20 text-amber-800 dark:text-primary font-bold border border-amber-600/40 dark:border-primary/40'
                    : 'hover:bg-neutral-100 dark:hover:bg-surface-container text-neutral-800 dark:text-on-surface'
                )}
              >
                <span className="truncate">{seg.text}</span>
                <span className="font-mono text-[10px] text-neutral-500 dark:text-outline shrink-0">
                  {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Seleção Tipográfica */}
      <div className="flex flex-col gap-1.5">
        <label className="text-label-sm font-label-sm text-neutral-500 dark:text-outline font-semibold">
          Família Tipográfica
        </label>
        <select
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value as FontFamily)}
          className="w-full bg-white dark:bg-surface-container-lowest border border-neutral-200 dark:border-surface-container-highest rounded-xl px-3 py-2.5 text-body-md text-neutral-900 dark:text-on-surface outline-none focus:border-primary/80 transition-all cursor-pointer shadow-2xs"
        >
          <option value="Plus Jakarta Sans">Plus Jakarta Sans (Padrão)</option>
          <option value="Montserrat">Montserrat (Impactante)</option>
          <option value="Bebas Neue">Bebas Neue (Condensada)</option>
          <option value="Anton">Anton (Bold Pesado)</option>
        </select>
      </div>

      {/* Seletores Nativos de Cor Hexadecimal */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-label-sm text-neutral-500 dark:text-outline font-semibold">
            Cor do Texto
          </label>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-surface-container-lowest border border-neutral-200 dark:border-surface-container-highest">
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
            />
            <input
              type="text"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-full bg-transparent text-[11px] font-mono outline-none text-neutral-900 dark:text-on-surface uppercase"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-label-sm text-neutral-500 dark:text-outline font-semibold">
            Contorno
          </label>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-surface-container-lowest border border-neutral-200 dark:border-surface-container-highest">
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
            />
            <input
              type="text"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="w-full bg-transparent text-[11px] font-mono outline-none text-neutral-900 dark:text-on-surface uppercase"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-label-sm text-neutral-500 dark:text-outline font-semibold">
            Cor do Fundo
          </label>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-surface-container-lowest border border-neutral-200 dark:border-surface-container-highest">
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
            />
            <input
              type="text"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-full bg-transparent text-[11px] font-mono outline-none text-neutral-900 dark:text-on-surface uppercase"
            />
          </div>
        </div>
      </div>

      {/* Slider de Tamanho da Fonte com Trilho Âmbar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-label-sm font-label-sm">
          <span className="text-neutral-500 dark:text-outline font-semibold">Tamanho da Fonte</span>
          <span className="text-amber-800 dark:text-primary font-bold font-mono">{fontSize}px</span>
        </div>
        <input
          type="range"
          min={18}
          max={48}
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="w-full accent-amber-400 h-2 bg-neutral-200 dark:bg-surface-container-highest rounded-lg cursor-pointer"
        />
      </div>

      {/* Toggle Caixa de Fundo vs Contorno */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-surface-container border border-neutral-200 dark:border-surface-container-highest">
        <span className="text-body-sm font-body-sm text-neutral-800 dark:text-on-surface">
          Caixa de fundo arredondada
        </span>
        <input
          type="checkbox"
          checked={useBackgroundBox}
          onChange={(e) => setUseBackgroundBox(e.target.checked)}
          className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
        />
      </div>

      {/* Selo fix_bounds */}
      <div className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-primary/10 border border-amber-600/30 dark:border-primary/30 flex items-center gap-2 text-label-sm font-label-sm text-amber-800 dark:text-primary">
        <span className="material-symbols-outlined text-[18px]">verified</span>
        <span>Cálculo determinístico fix_bounds ativado (sem estouro de bordas)</span>
      </div>
    </div>
  );
};
