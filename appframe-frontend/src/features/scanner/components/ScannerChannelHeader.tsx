import React from 'react';
import type { ChannelMeta } from '../types';

interface ScannerChannelHeaderProps {
  channelMeta: ChannelMeta;
  totalVideos: number;
}

export const ScannerChannelHeader: React.FC<ScannerChannelHeaderProps> = ({
  channelMeta,
  totalVideos,
}) => {
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [channelMeta.avatarUrl]);

  const loadedCount = Math.max(totalVideos, channelMeta.totalIndexed || 0);
  const displayTotal = Math.max(channelMeta.totalChannelVideos || 0, loadedCount);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-surface-container-low p-space-md sm:p-space-lg shadow-[0_6px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] border border-neutral-200 dark:border-primary/20">
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md relative z-10">
        <div className="flex items-center gap-space-md">
          {/* Avatar do Canal */}
          <div className="relative shrink-0">
            {channelMeta.avatarUrl && !imgError ? (
              <img
                src={channelMeta.avatarUrl}
                alt={channelMeta.name}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-14 h-14 md:w-16 md:h-16 rounded-2xl object-cover shadow-[0_0_16px_rgba(212,163,70,0.25)] ring-1 ring-primary/40"
              />
            ) : (
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-neutral-100 dark:bg-surface-container-highest flex items-center justify-center text-primary ring-1 ring-primary/40">
                <span className="material-symbols-outlined text-[28px]">
                  smart_display
                </span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-neutral-950 flex items-center justify-center text-[12px] shadow-sm">
              <span className="material-symbols-outlined text-[14px]">
                check
              </span>
            </div>
          </div>

          {/* Metadados do Canal */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                {channelMeta.name}
              </span>
              <span
                className="material-symbols-outlined text-amber-600 dark:text-primary text-[18px]"
                title="Canal Verificado"
              >
                verified
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1 font-body-sm text-body-sm text-on-surface-variant">
              <span className="font-semibold text-on-surface">Canal Oficial</span>
              <span className="text-outline">•</span>
              <span>
                {displayTotal > loadedCount
                  ? `${loadedCount.toLocaleString('pt-BR')} de ${displayTotal.toLocaleString('pt-BR')} mídias carregadas`
                  : `${loadedCount.toLocaleString('pt-BR')} mídias indexadas`}
              </span>
              <span className="text-outline">•</span>
              <span className="text-amber-700 dark:text-primary flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-primary" />
                Indexação em tempo real
              </span>
            </div>
          </div>
        </div>

        {/* Contadores e Métricas */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="bg-neutral-50 dark:bg-surface-container px-3.5 py-2 rounded-xl flex flex-col items-center min-w-[90px] border border-neutral-200 dark:border-outline/10">
            <span className="text-label-sm font-label-sm text-outline">Total</span>
            <span className="text-title-md font-title-md font-bold text-on-surface">
              {displayTotal.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="bg-neutral-50 dark:bg-surface-container px-3.5 py-2 rounded-xl flex flex-col items-center min-w-[90px] border border-neutral-200 dark:border-outline/10">
            <span className="text-label-sm font-label-sm text-outline">Vídeos</span>
            <span className="text-title-md font-title-md font-bold text-on-surface">
              {channelMeta.longCount.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="bg-neutral-50 dark:bg-surface-container px-3.5 py-2 rounded-xl flex flex-col items-center min-w-[90px] border border-neutral-200 dark:border-outline/10">
            <span className="text-label-sm font-label-sm text-outline">Shorts</span>
            <span className="text-title-md font-title-md font-bold text-amber-700 dark:text-primary">
              {channelMeta.shortsCount.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
