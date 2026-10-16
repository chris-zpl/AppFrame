import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

export interface HistoryHeaderProps {
  onRefresh: () => void;
  onNewCut: () => void;
}

export const HistoryHeader: React.FC<HistoryHeaderProps> = ({
  onRefresh,
  onNewCut,
}) => {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-space-lg">
      <div className="flex flex-col">
        <div className="flex items-center gap-space-sm mb-1 flex-wrap">
          <h1 className="font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg font-bold text-on-surface tracking-tight">
            Histórico de Renderizações e Filas
          </h1>
          <Badge variant="status-live">
            Workers BullMQ Online
          </Badge>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
          Monitoramento em tempo real das filas Redis <code>media-download</code> e <code>media-render</code> com FFmpeg.
        </p>
      </div>

      <div className="flex items-center gap-2 self-start md:self-auto">
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-surface-container dark:hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-label-md font-label-md transition-all shadow-sm cursor-pointer border border-neutral-200 dark:border-surface-container-highest/60"
        >
          <span className="material-symbols-outlined text-[16px] text-primary">
            refresh
          </span>
          <span>Atualizar</span>
        </button>

        <Button
          variant="primary"
          onClick={onNewCut}
          leftIcon={
            <span className="material-symbols-outlined text-[18px]">
              content_cut
            </span>
          }
        >
          Novo Corte no Studio
        </Button>
      </div>
    </header>
  );
};
