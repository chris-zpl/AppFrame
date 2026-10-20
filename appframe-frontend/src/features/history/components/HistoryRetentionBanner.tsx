import React, { useState } from 'react';
import { Button } from '../../../components/ui';

export const HistoryRetentionBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-400/5 border border-amber-500/25 dark:border-amber-400/20 shadow-xs flex items-start justify-between gap-4 animate-in fade-in transition-all">
      <div className="flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 dark:bg-primary/20 text-amber-800 dark:text-primary flex items-center justify-center shrink-0 mt-0.5">
          <span className="material-symbols-outlined text-[20px]">
            schedule
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-title-sm text-title-sm font-bold text-on-surface">
              Aviso de Retenção de Vídeos (24 horas)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 dark:bg-primary/20 text-amber-800 dark:text-primary text-[10px] font-mono font-semibold">
              Auto-Expiração
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed max-w-4xl">
            Os vídeos concluídos permanecem disponíveis para download no servidor por até <strong>24 horas</strong>. Após esse período, o arquivo físico expira e o download não poderá mais ser realizado. O registro continuará no histórico como <em>Expirado</em> até que você opte por excluí-lo.
          </p>
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setIsDismissed(true)}
        className="w-7 h-7 text-on-surface-variant hover:text-on-surface"
        title="Fechar aviso"
        aria-label="Fechar aviso"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </Button>
    </div>
  );
};
