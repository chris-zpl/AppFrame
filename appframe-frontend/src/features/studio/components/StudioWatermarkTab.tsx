import React from 'react';
import { Button } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import { API_BASE_URL } from '../../../lib/api';
import type { WatermarkPosition } from '../types';
import { MATRIX_POSITIONS } from '../constants';

import { useStudioContext } from '../context';

export interface StudioWatermarkTabProps {
  userWatermarks?: Array<{
    id: string;
    original_name: string;
    url?: string;
  }>;
  isLoadingWatermarks?: boolean;
  selectedWatermarkId?: string;
  setSelectedWatermarkId?: (id: string) => void;
  watermarkPosition?: WatermarkPosition;
  setWatermarkPosition?: (pos: WatermarkPosition) => void;
  watermarkOpacity?: number;
  setWatermarkOpacity?: (val: number) => void;
  watermarkScale?: number;
  setWatermarkScale?: (val: number) => void;
  onNavigateToWatermarks?: () => void;
}

export const StudioWatermarkTab: React.FC<StudioWatermarkTabProps> = (props) => {
  const studio = useStudioContext();

  const userWatermarks = props.userWatermarks ?? studio.userWatermarks;
  const isLoadingWatermarks = props.isLoadingWatermarks ?? studio.isLoadingWatermarks;
  const selectedWatermarkId = props.selectedWatermarkId ?? studio.selectedWatermarkId;
  const setSelectedWatermarkId = props.setSelectedWatermarkId ?? studio.setSelectedWatermarkId;
  const watermarkPosition = props.watermarkPosition ?? studio.watermarkPosition;
  const setWatermarkPosition = props.setWatermarkPosition ?? studio.setWatermarkPosition;
  const watermarkOpacity = props.watermarkOpacity ?? studio.watermarkOpacity;
  const setWatermarkOpacity = props.setWatermarkOpacity ?? studio.setWatermarkOpacity;
  const watermarkScale = props.watermarkScale ?? studio.watermarkScale;
  const setWatermarkScale = props.setWatermarkScale ?? studio.setWatermarkScale;
  const onNavigateToWatermarks = props.onNavigateToWatermarks ?? (() => studio.navigate('marcas'));
  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Seletor de Logos Cadastrados na Conta */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-label-sm font-label-sm text-outline font-semibold uppercase tracking-wider">
            Logo Cadastrado
          </label>
          <button
            type="button"
            onClick={onNavigateToWatermarks}
            className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">tune</span>
            Gerenciar
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {/* Opção: Sem Marca d'Água */}
          <div
            onClick={() => setSelectedWatermarkId('none')}
            className={cn(
              'flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer',
              selectedWatermarkId === 'none'
                ? 'bg-primary/15 border-primary shadow-[0_0_10px_rgba(212,163,70,0.15)]'
                : 'bg-surface-container border-surface-container-highest hover:bg-surface-container-high'
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center p-1 border border-outline/10 text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">block</span>
              </div>
              <span className="text-title-sm font-semibold text-on-surface">
                Sem Marca d'Água
              </span>
            </div>
            {selectedWatermarkId === 'none' && (
              <span className="material-symbols-outlined text-[18px] text-primary">
                check_circle
              </span>
            )}
          </div>

          {/* Lista Real de Marcas do Usuário */}
          {isLoadingWatermarks && (
            <div className="p-3 text-center text-body-sm text-outline">
              Carregando marcas d'água...
            </div>
          )}

          {!isLoadingWatermarks && userWatermarks.length === 0 && (
            <div className="p-3 rounded-xl bg-surface-container-lowest border border-dashed border-outline/30 text-center flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-[24px] text-outline">
                branding_watermark
              </span>
              <p className="text-body-xs text-outline">
                Nenhuma marca d'água salva na sua conta.
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={onNavigateToWatermarks}
                leftIcon={
                  <span className="material-symbols-outlined text-[16px]">add</span>
                }
              >
                Nova Marca
              </Button>
            </div>
          )}

          {userWatermarks.map((logo) => (
            <div
              key={logo.id}
              onClick={() => setSelectedWatermarkId(logo.id)}
              className={cn(
                'flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer',
                selectedWatermarkId === logo.id
                  ? 'bg-primary/15 border-primary shadow-[0_0_10px_rgba(212,163,70,0.15)]'
                  : 'bg-surface-container border-surface-container-highest hover:bg-surface-container-high'
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[repeating-conic-gradient(#202020_0%_25%,#303030_0%_50%)] bg-[length:8px_8px] flex items-center justify-center p-0.5 border border-outline/10 overflow-hidden shrink-0">
                  <img
                    src={logo.url || `${API_BASE_URL}/watermarks/${logo.id}/file`}
                    alt={logo.original_name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <span className="text-title-sm font-semibold text-on-surface truncate">
                  {logo.original_name}
                </span>
              </div>
              {selectedWatermarkId === logo.id && (
                <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
                  check_circle
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Matriz 3x3 de Posicionamento na Tela */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-label-sm font-label-sm text-outline font-semibold uppercase tracking-wider">
            Posição na Tela (Matriz 3x3)
          </label>
          <span className="text-[10px] font-mono text-primary uppercase">
            {watermarkPosition}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 p-2 rounded-2xl bg-surface-container-lowest border border-surface-container-highest">
          {MATRIX_POSITIONS.map((pos) => {
            const isSelected = watermarkPosition === pos.key;
            return (
              <button
                key={pos.key}
                type="button"
                onClick={() => setWatermarkPosition(pos.key)}
                title={pos.label}
                className={cn(
                  'h-12 rounded-xl flex items-center justify-center transition-all cursor-pointer border',
                  isSelected
                    ? 'bg-primary text-on-primary border-primary shadow-[0_0_12px_rgba(242,190,94,0.4)] font-bold scale-105'
                    : 'bg-surface-container border-surface-container-highest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                )}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {pos.icon}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slider de Opacidade (0% a 100%) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-label-sm font-label-sm">
          <span className="text-outline font-semibold">Opacidade da Marca</span>
          <span className="text-primary font-bold font-mono">{watermarkOpacity}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={watermarkOpacity}
          onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
          className="w-full accent-amber-400 h-2 bg-surface-container-highest rounded-lg cursor-pointer"
        />
      </div>

      {/* Slider de Escala da Marca */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-label-sm font-label-sm">
          <span className="text-outline font-semibold">Tamanho / Escala</span>
          <span className="text-primary font-bold font-mono">{watermarkScale}%</span>
        </div>
        <input
          type="range"
          min={50}
          max={150}
          value={watermarkScale}
          onChange={(e) => setWatermarkScale(Number(e.target.value))}
          className="w-full accent-amber-400 h-2 bg-surface-container-highest rounded-lg cursor-pointer"
        />
      </div>
    </div>
  );
};
