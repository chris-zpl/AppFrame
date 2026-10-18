import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useModalA11y } from '../../../hooks';
import type { VideoJobItem } from '../types';

interface HistoryErrorModalProps {
  job: VideoJobItem | null;
  onClose: () => void;
}

export const HistoryErrorModal: React.FC<HistoryErrorModalProps> = ({ job, onClose }) => {
  useModalA11y({ isOpen: Boolean(job), onClose });

  if (!job) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-failure-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg p-6 bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-high shadow-2xl flex flex-col gap-4"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-surface-container-highest pb-3">
          <div className="flex items-center gap-2 text-red-500 font-bold min-w-0">
            <span className="material-symbols-outlined text-[22px] shrink-0">error</span>
            <span id="job-failure-title" className="truncate">Detalhes da Falha no Job</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar"
            className="text-neutral-400 hover:text-on-surface cursor-pointer p-1 rounded transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-body-sm text-on-surface-variant">
            <strong>ID:</strong> {job.id}
          </span>
          <span className="text-body-sm text-on-surface-variant">
            <strong>Vídeo:</strong> {job.original_title || job.source_url}
          </span>
          <div className="mt-2 p-3 rounded-xl bg-neutral-100 dark:bg-surface-container-lowest font-mono text-[12px] text-red-600 dark:text-red-400 overflow-x-auto whitespace-pre-wrap">
            {job.error_log || 'Nenhum detalhe adicional disponível.'}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </Card>
    </div>
  );
};
