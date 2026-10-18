import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { LegalTabSwitcher } from './LegalTabSwitcher';
import type { LegalModalHeaderProps } from '../interfaces';

export const LegalModalHeader: React.FC<LegalModalHeaderProps> = ({
  activeDoc,
  onSelectDoc,
  onClose,
  updatedAt,
}) => {
  const currentTitle = activeDoc === 'terms' ? 'Termos de Serviço' : 'Política de Privacidade';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4.5 border-b border-surface-container-high bg-surface-container-high/40">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
          <span className="material-symbols-outlined text-[24px]">
            {activeDoc === 'terms' ? 'gavel' : 'verified_user'}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 id="legal-modal-title" className="text-title-lg font-bold text-on-surface">
              {currentTitle}
            </h2>
            <Badge variant="primary" className="text-[10px] font-bold">
              AppFrame
            </Badge>
          </div>
          <p className="text-body-sm text-on-surface-variant flex items-center gap-1.5 mt-0.5">
            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
            <span>Última atualização: {updatedAt || '16 de Outubro de 2026'}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        <LegalTabSwitcher activeDoc={activeDoc} onSelectDoc={onSelectDoc} />

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar modal"
          className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    </div>
  );
};
