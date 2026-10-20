import React from 'react';
import { Button } from '../../../components/ui/Button';

import { useHistoryContext } from '../context';

export interface HistoryHeaderProps {
  onRefresh?: () => void;
  onNewCut?: () => void;
}

export const HistoryHeader: React.FC<HistoryHeaderProps> = (props) => {
  const history = useHistoryContext();

  const onRefresh = props.onRefresh ?? (() => history.refetch());
  const onNewCut = props.onNewCut ?? (() => {});
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-space-lg">
      <div className="flex flex-col">
        <div className="flex items-center gap-space-sm mb-1 flex-wrap">
          <h1 className="font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg font-bold text-on-surface tracking-tight">
            Histórico de Renderizações e Filas
          </h1>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
          Monitoramento em tempo real das filas de renderização.
        </p>
      </div>

      <div className="flex items-center gap-2 self-start md:self-auto">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          leftIcon={
            <span className="material-symbols-outlined text-[16px] text-amber-700 dark:text-primary">
              refresh
            </span>
          }
        >
          Atualizar
        </Button>

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
