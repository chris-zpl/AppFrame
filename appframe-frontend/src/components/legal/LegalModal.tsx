import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { marked } from 'marked';
import { legalService, type LegalDocumentsResponse } from '../../services/legal.service';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';

export interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDoc?: 'terms' | 'privacy';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialDoc = 'terms',
}) => {
  const [activeDoc, setActiveDoc] = useState<'terms' | 'privacy'>(initialDoc);

  // Sincroniza o documento ativo sempre que o modal abre ou a prop muda
  useEffect(() => {
    if (isOpen) {
      setActiveDoc(initialDoc);
    }
  }, [isOpen, initialDoc]);

  // Busca os documentos legais públicos da API
  const { data, isLoading } = useQuery<LegalDocumentsResponse>({
    queryKey: ['public-legal-documents'],
    queryFn: () => legalService.getLegalDocuments(),
    staleTime: 1000 * 60 * 10, // Cache de 10 minutos
    enabled: isOpen,
  });

  const currentItem = activeDoc === 'terms' ? data?.terms : data?.privacy;
  const currentTitle = activeDoc === 'terms' ? 'Termos de Serviço' : 'Política de Privacidade';

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
        {/* ================= HEADER DO MODAL ================= */}
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
                <span>Última atualização: {currentItem?.updatedAt || '16 de Outubro de 2026'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Alternador de Documentos (Tabs internas) */}
            <div className="flex items-center p-1 bg-surface-container-lowest rounded-xl border border-surface-container-highest">
              <button
                type="button"
                onClick={() => setActiveDoc('terms')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-label-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                  activeDoc === 'terms'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                )}
              >
                <span className="material-symbols-outlined text-[16px]">gavel</span>
                <span>Termos</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDoc('privacy')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-label-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5',
                  activeDoc === 'privacy'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                )}
              >
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
                <span>Privacidade</span>
              </button>
            </div>

            {/* Botão Fechar (X) */}
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

        {/* ================= CORPO COM O CONTEÚDO ================= */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4 text-on-surface selection:bg-primary/20 selection:text-primary">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-body-sm text-on-surface-variant font-medium">
                Carregando documento legal oficial...
              </p>
            </div>
          ) : (
            <div
              className="legal-content prose prose-invert max-w-none text-body-md text-on-surface-variant leading-relaxed [&_h1]:text-title-lg [&_h1]:font-bold [&_h1]:text-on-surface [&_h1]:mb-3 [&_h1]:mt-0 [&_h2]:text-title-md [&_h2]:font-bold [&_h2]:text-on-surface [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-title-sm [&_h3]:font-bold [&_h3]:text-on-surface [&_h3]:mt-6 [&_h3]:mb-2 [&_h4]:text-label-lg [&_h4]:font-bold [&_h4]:text-on-surface [&_h4]:mt-4 [&_h4]:mb-1 [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_ol]:space-y-1.5 [&_li]:leading-relaxed [&_hr]:border-surface-container-high [&_hr]:my-6 [&_strong]:text-on-surface [&_strong]:font-semibold [&_em]:text-on-surface-variant [&_a]:text-primary [&_a]:underline [&_a]:hover:opacity-85 [&_table]:w-full [&_table]:border-collapse [&_table]:my-6 [&_th]:bg-surface-container-high [&_th]:text-on-surface [&_th]:font-semibold [&_th]:p-3 [&_th]:text-left [&_th]:border [&_th]:border-surface-container-highest [&_td]:p-3 [&_td]:border [&_td]:border-surface-container-highest [&_td]:text-body-sm [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:my-4 [&_blockquote]:italic [&_code]:font-mono [&_code]:text-primary [&_code]:bg-surface-container-highest [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded"
              dangerouslySetInnerHTML={{ __html: parsedHtml }}
            />
          )}
        </div>

        {/* ================= RODAPÉ DO MODAL ================= */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-surface-container-high bg-surface-container-high/30">
          <div className="flex items-center gap-2 text-label-sm text-on-surface-variant text-center sm:text-left">
            <span className="material-symbols-outlined text-[16px] text-primary">security</span>
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
      </div>
    </div>
  );
};
