import React from 'react';
import { Button, Textarea, Input, Select, Checkbox, Tabs } from '../../../components/ui';
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
        <Tabs
          tabs={[
            { id: 'static', label: 'Legenda Fixa', icon: 'title' },
            {
              id: 'dynamic',
              label: 'Dinâmica (Gemini)',
              icon: isGeminiConnected ? 'auto_awesome' : 'lock',
            },
          ]}
          activeTab={subtitleMode}
          onChange={(mode) => {
            if (mode === 'dynamic' && !isGeminiConnected) {
              toast.info(
                'O assistente de inteligência artificial (Gemini) ainda não foi configurado na plataforma pelo administrador.'
              );
              return;
            }
            setSubtitleMode(mode as SubtitleMode);
          }}
          variant="segmented"
          className="w-full flex"
          tabClassName="flex-1 justify-center"
          ariaLabel="Modo de legenda"
        />
      </div>

      {/* Campo de Texto Estático ou Gerador Dinâmico Gemini */}
      {subtitleMode === 'static' ? (
        <Textarea
          id="subtitle-static-text"
          name="staticText"
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
      <Select
        id="subtitle-font-family"
        name="fontFamily"
        label="Família Tipográfica"
        labelClassName="text-label-sm font-label-sm text-neutral-500 dark:text-outline font-semibold"
        value={fontFamily}
        onChange={(e) => setFontFamily(e.target.value as FontFamily)}
        options={[
          { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans (Padrão)" },
          { value: "Montserrat", label: "Montserrat (Impactante)" },
          { value: "Bebas Neue", label: "Bebas Neue (Condensada)" },
          { value: "Anton", label: "Anton (Bold Pesado)" },
        ]}
      />

      {/* Seletores Nativos de Cor Hexadecimal */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="subtitle-text-color-hex"
            className="text-[11px] font-label-sm text-neutral-500 dark:text-outline font-semibold"
          >
            Cor do Texto
          </label>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-surface-container-lowest border border-neutral-200 dark:border-surface-container-highest">
            <Input
              id="subtitle-text-color-picker"
              name="textColorPicker"
              type="color"
              aria-label="Paleta de cor do texto"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
            />
            <Input
              id="subtitle-text-color-hex"
              name="textColor"
              type="text"
              aria-label="Código hexadecimal da cor do texto"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-full bg-transparent text-[11px] font-mono outline-none border-0 text-neutral-900 dark:text-on-surface uppercase h-auto p-0 focus:ring-0 focus:border-0"
              containerClassName="flex-1"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="subtitle-stroke-color-hex"
            className="text-[11px] font-label-sm text-neutral-500 dark:text-outline font-semibold"
          >
            Contorno
          </label>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-surface-container-lowest border border-neutral-200 dark:border-surface-container-highest">
            <Input
              id="subtitle-stroke-color-picker"
              name="strokeColorPicker"
              type="color"
              aria-label="Paleta de cor do contorno"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
            />
            <Input
              id="subtitle-stroke-color-hex"
              name="strokeColor"
              type="text"
              aria-label="Código hexadecimal da cor do contorno"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="w-full bg-transparent text-[11px] font-mono outline-none border-0 text-neutral-900 dark:text-on-surface uppercase h-auto p-0 focus:ring-0 focus:border-0"
              containerClassName="flex-1"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="subtitle-bg-color-hex"
            className="text-[11px] font-label-sm text-neutral-500 dark:text-outline font-semibold"
          >
            Cor do Fundo
          </label>
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-surface-container-lowest border border-neutral-200 dark:border-surface-container-highest">
            <Input
              id="subtitle-bg-color-picker"
              name="bgColorPicker"
              type="color"
              aria-label="Paleta de cor do fundo"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
            />
            <Input
              id="subtitle-bg-color-hex"
              name="bgColor"
              type="text"
              aria-label="Código hexadecimal da cor do fundo"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="w-full bg-transparent text-[11px] font-mono outline-none border-0 text-neutral-900 dark:text-on-surface uppercase h-auto p-0 focus:ring-0 focus:border-0"
              containerClassName="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Slider de Tamanho da Fonte com Trilho Âmbar */}
      <Input
        id="subtitle-font-size"
        name="fontSize"
        type="range"
        min={18}
        max={48}
        value={fontSize}
        onChange={(e) => setFontSize(Number(e.target.value))}
        label="Tamanho da Fonte"
        labelRight={<span className="text-amber-800 dark:text-primary font-bold font-mono">{fontSize}px</span>}
      />

      {/* Toggle Caixa de Fundo vs Contorno */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-surface-container border border-neutral-200 dark:border-surface-container-highest">
        <label htmlFor="subtitle-use-background-box" className="text-body-sm font-body-sm text-neutral-800 dark:text-on-surface cursor-pointer">
          Caixa de fundo arredondada
        </label>
        <Checkbox
          id="subtitle-use-background-box"
          name="useBackgroundBox"
          checked={useBackgroundBox}
          onChange={(e) => setUseBackgroundBox(e.target.checked)}
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
