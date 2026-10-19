import React from 'react';
import { Button } from '../../../components/ui/Button';

export interface LegalModalFooterProps {
  onClose: () => void;
}

export const LegalModalFooter: React.FC<LegalModalFooterProps> = ({ onClose }) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-neutral-200 dark:border-surface-container-high bg-neutral-50 dark:bg-surface-container-high/30">
      <div className="flex items-center gap-2 text-label-sm text-neutral-600 dark:text-on-surface-variant text-center sm:text-left">
        <span className="material-symbols-outlined text-[16px] text-amber-700 dark:text-primary">security</span>
        <span>
          Documento oficial da plataforma SaaS <strong>AppFrame</strong>
        </span>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onClose}
          className="w-full sm:w-auto"
        >
          Entendido e Ciente
        </Button>
      </div>
    </div>
  );
};
