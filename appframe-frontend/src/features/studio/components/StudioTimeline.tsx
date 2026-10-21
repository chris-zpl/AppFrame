import React from "react";
import { Card } from "../../../components/ui";
import { cn } from "../../../lib/utils";
import { formatStudioTime as formatTime } from "../utils";

import { useStudioContext } from "../context";

export interface StudioTimelineProps {
  trimIn?: number;
  trimOut?: number;
  currentTime?: number;
  totalDuration?: number;
  waveformPeaks?: number[];
  isPreparingPreview?: boolean;
  previewError?: string | null;
  timelineRef?: React.RefObject<HTMLDivElement | null>;
  handleTimelineClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleTimelineMouseDown?: (
    e: React.MouseEvent<HTMLDivElement>,
    type: "in" | "out" | "playhead",
  ) => void;
  setTrimIn?: React.Dispatch<React.SetStateAction<number>>;
  setTrimOut?: React.Dispatch<React.SetStateAction<number>>;
}

export const StudioTimeline: React.FC<StudioTimelineProps> = (props) => {
  const studio = useStudioContext();

  const trimIn = props.trimIn ?? studio.trimIn;
  const trimOut = props.trimOut ?? studio.trimOut;
  const currentTime = props.currentTime ?? studio.currentTime;
  const totalDuration = props.totalDuration ?? studio.totalDuration;
  const waveformPeaks = props.waveformPeaks ?? studio.waveformPeaks;
  const isPreparingPreview =
    props.isPreparingPreview ?? studio.isPreparingPreview;
  const previewError = props.previewError ?? studio.previewError;
  const timelineRef = props.timelineRef ?? studio.timelineRef;
  const handleTimelineClick =
    props.handleTimelineClick ?? studio.handleTimelineClick;
  const handleTimelineMouseDown =
    props.handleTimelineMouseDown ?? studio.handleTimelineMouseDown;
  const setTrimIn = props.setTrimIn ?? studio.setTrimIn;
  const setTrimOut = props.setTrimOut ?? studio.setTrimOut;
  return (
    <Card className="relative isolate bg-white dark:bg-surface-container-low border border-neutral-200 dark:border-surface-container-high/90 p-4 flex flex-col gap-3 shadow-sm dark:shadow-lg">
      <div className="flex flex-col sm:flex-row gap-1.5 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-primary">
            graphic_eq
          </span>
          <span className="font-title-sm text-title-sm font-bold text-neutral-900 dark:text-on-surface">
            Timeline de Precisão (Audio Waveform & Trim)
          </span>
        </div>

        {/* Tooltips dos Marcadores de Corte */}
        <div className="flex items-center gap-3 font-mono text-label-sm font-label-sm tabular-nums">
          <span className="text-neutral-600 dark:text-on-surface-variant">
            In:{" "}
            <strong className="text-amber-800 dark:text-primary">{formatTime(trimIn, true)}</strong>
          </span>
          <span className="text-neutral-500 dark:text-outline">•</span>
          <span className="text-neutral-600 dark:text-on-surface-variant">
            Out:{" "}
            <strong className="text-amber-800 dark:text-primary">
              {formatTime(trimOut, true)}
            </strong>
          </span>
          <span className="text-neutral-500 dark:text-outline">•</span>
          <span className="text-neutral-800 dark:text-tertiary">
            Duração:{" "}
            <strong>{Math.max(0, trimOut - trimIn).toFixed(2)}s</strong>
          </span>
        </div>
      </div>

      {/* Contêiner Interativo da Timeline */}
      <div className="relative flex flex-col select-none pt-4 pb-2">
        {/* Régua de Tempo Dinâmica conforme a duração real do vídeo */}
        <div className="w-full flex justify-between text-[10px] text-neutral-500 dark:text-outline font-mono mb-1.5 px-1">
          {[0, 0.166, 0.333, 0.5, 0.666, 0.833, 1].map((ratio, idx) => (
            <span key={idx}>{formatTime(totalDuration * ratio)}</span>
          ))}
        </div>

        {/* Pista da Onda Sonora Real do Vídeo e Região de Corte */}
        <div
          ref={timelineRef}
          onClick={totalDuration > 0 ? handleTimelineClick : undefined}
          className={cn(
            "relative w-full h-20 rounded-xl bg-neutral-100 dark:bg-surface-container-lowest border border-neutral-200 dark:border-surface-container-highest/80 overflow-hidden flex items-center px-1",
            totalDuration > 0 ? "cursor-pointer" : "cursor-default",
          )}
        >
          {waveformPeaks.length === 0 || totalDuration <= 0 ? (
            <div className="w-full h-full flex items-center justify-center gap-2 text-label-sm text-neutral-600 dark:text-on-surface-variant">
              {isPreparingPreview ? (
                <>
                  <span className="material-symbols-outlined text-[18px] text-primary animate-spin">
                    progress_activity
                  </span>
                  <span>
                    Extraindo onda sonora real (Audio Waveform) do vídeo...
                  </span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px] text-neutral-500 dark:text-outline">
                    graphic_eq
                  </span>
                  <span>
                    {previewError
                      ? "Não foi possível extrair o áudio do vídeo."
                      : "Aguardando carregamento do vídeo para exibir a onda sonora real."}
                  </span>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Gráfico da Onda Sonora Real extraída via FFmpeg */}
              <div className="w-full h-full flex items-center justify-between gap-[2px] px-1 pointer-events-none">
                {waveformPeaks.map((peak, idx) => {
                  const peakTime = (idx / waveformPeaks.length) * totalDuration;
                  const isInsideCut = peakTime >= trimIn && peakTime <= trimOut;

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex-1 rounded-full transition-colors",
                        isInsideCut
                          ? "bg-primary shadow-[0_0_6px_rgba(242,190,94,0.3)]"
                          : "bg-neutral-300 dark:bg-surface-container-highest/60 opacity-50 dark:opacity-30",
                      )}
                      style={{
                        height: `${peak * 85}%`,
                      }}
                    />
                  );
                })}
              </div>

              {/* Faixa Sombreada Excluída (Antes do In) */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-black/60 pointer-events-none border-r border-primary/40"
                style={{ width: `${(trimIn / totalDuration) * 100}%` }}
              />

              {/* Faixa Sombreada Excluída (Depois do Out) */}
              <div
                className="absolute top-0 bottom-0 right-0 bg-black/60 pointer-events-none border-l border-primary/40"
                style={{ width: `${100 - (trimOut / totalDuration) * 100}%` }}
              />

              {/* Faixa Ativa com Destaque Âmbar (#D4A346) */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none border-y-2 border-primary bg-primary/10"
                style={{
                  left: `${(trimIn / totalDuration) * 100}%`,
                  width: `${((trimOut - trimIn) / totalDuration) * 100}%`,
                }}
              />

              {/* Marcador Início (In) - Arrastável */}
              <div
                onMouseDown={(e) => handleTimelineMouseDown(e, "in")}
                className="absolute top-0 bottom-0 z-30 flex flex-col items-center cursor-ew-resize group"
                style={{ left: `${(trimIn / totalDuration) * 100}%` }}
              >
                <div className="w-4 h-full bg-primary/30 flex items-center justify-center relative -translate-x-1/2">
                  <div className="w-1.5 h-full bg-primary rounded-full shadow-[0_0_8px_rgba(212,163,70,0.8)]" />
                  {/* Handle Superior com Tooltip */}
                  <div className="absolute -top-3 w-5 h-5 rounded-md bg-primary text-on-primary flex items-center justify-center text-[10px] font-bold shadow-md">
                    In
                  </div>
                </div>
              </div>

              {/* Marcador Fim (Out) - Arrastável */}
              <div
                onMouseDown={(e) => handleTimelineMouseDown(e, "out")}
                className="absolute top-0 bottom-0 z-30 flex flex-col items-center cursor-ew-resize group"
                style={{ left: `${(trimOut / totalDuration) * 100}%` }}
              >
                <div className="w-4 h-full bg-primary/30 flex items-center justify-center relative -translate-x-1/2">
                  <div className="w-1.5 h-full bg-primary rounded-full shadow-[0_0_8px_rgba(212,163,70,0.8)]" />
                  {/* Handle Superior com Tooltip */}
                  <div className="absolute -top-3 w-5 h-5 rounded-md bg-primary text-on-primary flex items-center justify-center text-[10px] font-bold shadow-md">
                    Out
                  </div>
                </div>
              </div>

              {/* Agulha de Reprodução (Playhead) */}
              <div
                onMouseDown={(e) => handleTimelineMouseDown(e, "playhead")}
                className="absolute top-0 bottom-0 z-40 flex flex-col items-center cursor-ew-resize"
                style={{ left: `${(currentTime / totalDuration) * 100}%` }}
              >
                <div className="w-0.5 h-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)] relative -translate-x-1/2">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 rounded-xs" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Botões de Micro-ajuste de 0.1s */}
        <div className="w-full mt-2 text-label-sm font-label-sm text-outline">
          {/* ========================================================= */}
          {/* 1. VERSÃO MOBILE (< sm): Em coluna geral, internamente em linha */}
          {/* ========================================================= */}
          <div className="flex flex-col items-center gap-2 sm:hidden w-full">
            {/* Linha Superior: Definir In e Definir Out juntos */}
            <div className="flex flex-row items-center justify-center gap-2 w-full">
              <button
                type="button"
                onClick={() => {
                  const newIn = Math.min(currentTime, trimOut - 0.5);
                  setTrimIn(Math.max(0, newIn));
                }}
                className="px-2.5 py-1 rounded bg-amber-500/15 text-amber-800 dark:bg-primary/20 dark:text-primary font-semibold hover:bg-amber-500/25 dark:hover:bg-primary/30 border border-amber-600/30 dark:border-transparent cursor-pointer shrink-0"
              >
                Definir In Aqui
              </button>
              <button
                type="button"
                onClick={() => {
                  const newOut = Math.max(currentTime, trimIn + 0.5);
                  setTrimOut(Math.min(totalDuration, newOut));
                }}
                className="px-2.5 py-1 rounded bg-amber-500/15 text-amber-800 dark:bg-primary/20 dark:text-primary font-semibold hover:bg-amber-500/25 dark:hover:bg-primary/30 border border-amber-600/30 dark:border-transparent cursor-pointer shrink-0"
              >
                Definir Out Aqui
              </button>
            </div>

            {/* Linha Inferior: Botões de ajuste fino juntos em linha */}
            <div className="flex flex-row flex-nowrap items-center justify-center gap-1.5 w-full">
              <button
                type="button"
                onClick={() => setTrimIn((v) => Math.max(0, v - 0.1))}
                className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-surface-container hover:bg-neutral-200 dark:hover:bg-surface-container-high text-neutral-800 dark:text-on-surface cursor-pointer shrink-0 border border-neutral-200 dark:border-transparent"
              >
                In -0.1s
              </button>
              <button
                type="button"
                onClick={() =>
                  setTrimIn((v) => Math.min(trimOut - 0.5, v + 0.1))
                }
                className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-surface-container hover:bg-neutral-200 dark:hover:bg-surface-container-high text-neutral-800 dark:text-on-surface cursor-pointer shrink-0 border border-neutral-200 dark:border-transparent"
              >
                In +0.1s
              </button>
              <button
                type="button"
                onClick={() =>
                  setTrimOut((v) => Math.max(trimIn + 0.5, v - 0.1))
                }
                className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-surface-container hover:bg-neutral-200 dark:hover:bg-surface-container-high text-neutral-800 dark:text-on-surface cursor-pointer shrink-0 border border-neutral-200 dark:border-transparent"
              >
                Out -0.1s
              </button>
              <button
                type="button"
                onClick={() =>
                  setTrimOut((v) => Math.min(totalDuration, v + 0.1))
                }
                className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-surface-container hover:bg-neutral-200 dark:hover:bg-surface-container-high text-neutral-800 dark:text-on-surface cursor-pointer shrink-0 border border-neutral-200 dark:border-transparent"
              >
                Out +0.1s
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 2. VERSÃO DESKTOP (>= sm): Exatamente o layout original */}
          {/* ========================================================= */}
          <div className="hidden sm:flex items-center justify-between w-full">
            {/* Lado Esquerdo: Bloco do In */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTrimIn((v) => Math.max(0, v - 0.1))}
                className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-surface-container hover:bg-neutral-200 dark:hover:bg-surface-container-high text-neutral-800 dark:text-on-surface cursor-pointer border border-neutral-200 dark:border-transparent"
              >
                In -0.1s
              </button>
              <button
                type="button"
                onClick={() =>
                  setTrimIn((v) => Math.min(trimOut - 0.5, v + 0.1))
                }
                className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-surface-container hover:bg-neutral-200 dark:hover:bg-surface-container-high text-neutral-800 dark:text-on-surface cursor-pointer border border-neutral-200 dark:border-transparent"
              >
                In +0.1s
              </button>
              <button
                type="button"
                onClick={() => {
                  const newIn = Math.min(currentTime, trimOut - 0.5);
                  setTrimIn(Math.max(0, newIn));
                }}
                className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:bg-primary/20 dark:text-primary font-semibold hover:bg-amber-500/25 dark:hover:bg-primary/30 border border-amber-600/30 dark:border-transparent cursor-pointer"
              >
                Definir In Aqui
              </button>
            </div>

            {/* Lado Direito: Bloco do Out */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const newOut = Math.max(currentTime, trimIn + 0.5);
                  setTrimOut(Math.min(totalDuration, newOut));
                }}
                className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:bg-primary/20 dark:text-primary font-semibold hover:bg-amber-500/25 dark:hover:bg-primary/30 border border-amber-600/30 dark:border-transparent cursor-pointer"
              >
                Definir Out Aqui
              </button>
              <button
                type="button"
                onClick={() =>
                  setTrimOut((v) => Math.max(trimIn + 0.5, v - 0.1))
                }
                className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-surface-container hover:bg-neutral-200 dark:hover:bg-surface-container-high text-neutral-800 dark:text-on-surface cursor-pointer border border-neutral-200 dark:border-transparent"
              >
                Out -0.1s
              </button>
              <button
                type="button"
                onClick={() =>
                  setTrimOut((v) => Math.min(totalDuration, v + 0.1))
                }
                className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-surface-container hover:bg-neutral-200 dark:hover:bg-surface-container-high text-neutral-800 dark:text-on-surface cursor-pointer border border-neutral-200 dark:border-transparent"
              >
                Out +0.1s
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
