import React from 'react';

export interface HistoryJobNotificationProps {
  jobCreated?: boolean | string;
  jobId?: string;
}

export const HistoryJobNotification: React.FC<HistoryJobNotificationProps> = ({
  jobCreated,
  jobId,
}) => {
  if (!jobCreated) return null;

  return (
    <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-primary/40 shadow-lg flex items-center justify-between gap-4 animate-in fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold">
          <span className="material-symbols-outlined text-[24px] animate-spin" style={{ animationDuration: '3s' }}>
            sync
          </span>
        </div>
        <div className="flex flex-col">
          <span className="font-title-sm text-title-sm font-bold text-on-surface">
            Job despachado com sucesso para a fila!
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {jobId ? `ID: ${jobId} • ` : ''}Orquestração BullMQ e processamento FFmpeg em andamento.
          </span>
        </div>
      </div>
      <span className="text-label-sm font-label-sm font-bold text-primary uppercase tracking-wider hidden sm:inline">
        Fila: media-render
      </span>
    </div>
  );
};
