import React from 'react';
import { Card } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import type { WatermarkItem } from '../interfaces';
import { formatFileSize } from '../constants';
import { watermarksService } from '../services';

interface WatermarkGridProps {
  watermarks: WatermarkItem[];
  defaultWatermarkId: string | null;
  onSetDefault: (id: string) => void;
  onConfirmDelete: (id: string) => void;
}

export const WatermarkGrid: React.FC<WatermarkGridProps> = ({
  watermarks,
  defaultWatermarkId,
  onSetDefault,
  onConfirmDelete,
}) => {
  return (
    <section className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <span className="font-title-sm text-title-sm font-bold text-on-surface">
          Marcas Cadastradas ({watermarks.length})
        </span>
        <span className="text-label-sm font-label-sm text-on-surface-variant">
          O fundo xadrez valida o canal de transparência
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
        {watermarks.map((wm) => {
          const isDefault = defaultWatermarkId === wm.id;
          return (
            <Card
              key={wm.id}
              className={cn(
                'overflow-hidden bg-white dark:bg-surface-container border transition-all duration-300 hover:-translate-y-1 shadow-md dark:shadow-lg flex flex-col',
                isDefault
                  ? 'border-primary/50 shadow-[0_0_15px_rgba(212,163,70,0.15)] ring-1 ring-primary/30'
                  : 'border-neutral-200 dark:border-surface-container-high hover:border-primary/40'
              )}
            >
              {/* Fundo Xadrez (Checkerboard) para Testar Transparência do Canal Alfa */}
              <div
                className={cn(
                  'relative w-full h-44 flex items-center justify-center p-6 overflow-hidden',
                  'bg-[linear-gradient(45deg,#cbd5e1_25%,transparent_25%),linear-gradient(-45deg,#cbd5e1_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#cbd5e1_75%),linear-gradient(-45deg,transparent_75%,#cbd5e1_75%)]',
                  'dark:bg-[linear-gradient(45deg,#232732_25%,transparent_25%),linear-gradient(-45deg,#232732_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#232732_75%),linear-gradient(-45deg,transparent_75%,#232732_75%)]',
                  'bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] bg-neutral-100 dark:bg-[#141720]'
                )}
              >
                <img
                  src={wm.url || watermarksService.getFileUrl(wm.id)}
                  alt={wm.original_name}
                  className="max-h-full max-w-full object-contain filter drop-shadow-md transition-transform hover:scale-105"
                />

                {/* Badge de Padrão */}
                {isDefault && (
                  <div className="absolute top-2.5 left-2.5 bg-primary text-on-primary font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">star</span>
                    <span>Padrão Studio</span>
                  </div>
                )}

                <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-sm text-outline font-mono text-[10px] px-2 py-0.5 rounded-md uppercase text-neutral-200">
                  PNG Alpha
                </div>
              </div>

              {/* Informações e Metadados Tabulares */}
              <div className="p-4 flex flex-col flex-1 justify-between gap-3 bg-white dark:bg-surface-container">
                <div>
                  <h4
                    className="font-title-sm text-title-sm font-bold text-on-surface truncate"
                    title={wm.original_name}
                  >
                    {wm.original_name}
                  </h4>

                  {/* Metadados Tabulares */}
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-neutral-200 dark:border-surface-container-highest/60 text-center font-mono tabular-nums">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-outline uppercase font-sans">Tamanho</span>
                      <span className="text-label-md font-bold text-primary">
                        {formatFileSize(wm.file_size)}
                      </span>
                    </div>
                    <div className="flex flex-col border-l border-neutral-200 dark:border-surface-container-highest/60">
                      <span className="text-[10px] text-outline uppercase font-sans">Data</span>
                      <span className="text-label-md font-bold text-on-surface-variant">
                        {new Date(wm.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center justify-between gap-2 pt-2">
                  {!isDefault ? (
                    <button
                      type="button"
                      onClick={() => onSetDefault(wm.id)}
                      className="text-label-sm font-label-sm text-primary hover:underline font-semibold cursor-pointer"
                    >
                      Tornar Padrão
                    </button>
                  ) : (
                    <span className="text-label-sm font-label-sm text-primary font-medium">
                      Logo Ativo
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => onConfirmDelete(wm.id)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Excluir marca d'água"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      delete
                    </span>
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
};
