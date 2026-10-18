import { useEffect } from 'react';

export interface UseModalA11yOptions {
  isOpen: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
  preventScroll?: boolean;
}

/**
 * Hook reutilizável de acessibilidade (a11y) e comportamento para modais e dialogs.
 * - Gerencia o bloqueio de scroll do body com restauração segura.
 * - Captura e trata a tecla Escape para fechamento acessível.
 */
export const useModalA11y = ({
  isOpen,
  onClose,
  closeOnEscape = true,
  preventScroll = true,
}: UseModalA11yOptions) => {
  // 1. Bloqueio de scroll do body com restauração
  useEffect(() => {
    if (!isOpen || !preventScroll) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, preventScroll]);

  // 2. Tecla Escape
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeOnEscape, onClose]);
};
