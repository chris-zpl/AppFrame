import React, { useState, useEffect, useMemo } from 'react';
import { marked } from 'marked';
import { useLegalDocuments } from '../hooks';
import { LegalModalHeader } from './LegalModalHeader';
import { LegalModalContent } from './LegalModalContent';
import { LegalModalFooter } from './LegalModalFooter';
import type { LegalDocType } from '../types';

export interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDoc?: LegalDocType;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialDoc = 'terms',
}) => {
  const [activeDoc, setActiveDoc] = useState<LegalDocType>(initialDoc);

  // Sincroniza o documento ativo sempre que o modal abre ou a prop muda
  useEffect(() => {
    if (isOpen) {
      setActiveDoc(initialDoc);
    }
  }, [isOpen, initialDoc]);

  // Busca os documentos legais públicos da API
  const { data, isLoading } = useLegalDocuments(isOpen);

  const currentItem = activeDoc === 'terms' ? data?.terms : data?.privacy;

  // Renderiza Markdown para HTML
  const parsedHtml = useMemo(() => {
    if (!currentItem?.rendered) return '';
    try {
      return marked.parse(currentItem.rendered) as string;
    } catch {
      return currentItem.rendered;
    }
  }, [currentItem?.rendered]);

  // Bloqueia o scroll do body enquanto o modal estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-surface-container rounded-2xl shadow-2xl border border-surface-container-high overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
      >
        <LegalModalHeader
          activeDoc={activeDoc}
          onSelectDoc={setActiveDoc}
          onClose={onClose}
          updatedAt={currentItem?.updatedAt}
        />

        <LegalModalContent
          isLoading={isLoading}
          parsedHtml={parsedHtml}
        />

        <LegalModalFooter onClose={onClose} />
      </div>
    </div>
  );
};
