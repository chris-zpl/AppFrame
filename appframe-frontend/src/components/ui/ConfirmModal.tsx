import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { cn } from '../../lib/utils';
import { useModalA11y } from '../../hooks';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  icon?: string;
  message?: React.ReactNode;
  itemTitle?: string;
  itemSubtitle?: string;
  warningText?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'primary';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmação',
  icon = 'delete_forever',
  message = 'Tem certeza de que deseja continuar?',
  itemTitle,
  itemSubtitle,
  warningText,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false,
  variant = 'danger',
}) => {
  useModalA11y({ isOpen, onClose });

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconColor: 'text-red-600 dark:text-red-400',
      buttonBg: 'bg-red-600 hover:bg-red-700 text-white font-bold',
      buttonIcon: 'delete',
    },
    warning: {
      iconColor: 'text-amber-500',
      buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white font-bold',
      buttonIcon: 'warning',
    },
    primary: {
      iconColor: 'text-primary',
      buttonBg: 'bg-primary hover:bg-primary/90 text-on-primary font-bold',
      buttonIcon: 'check_circle',
    },
  }[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md p-6 bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-high shadow-2xl flex flex-col gap-4"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-surface-container-highest pb-3">
          <div className={cn('flex items-center gap-2 font-bold min-w-0', variantStyles.iconColor)}>
            <span className="material-symbols-outlined text-[24px] shrink-0">{icon}</span>
            <span id="confirm-modal-title" className="font-title-sm text-title-sm text-on-surface truncate">{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-neutral-400 hover:text-on-surface cursor-pointer p-1 rounded transition-colors disabled:opacity-40 shrink-0"
            title="Fechar"
            aria-label="Fechar confirmação"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="flex flex-col gap-2.5">
          {typeof message === 'string' ? (
            <p className="text-body-sm text-on-surface">{message}</p>
          ) : (
            message
          )}

          {(itemTitle || itemSubtitle) && (
            <div className="p-3 rounded-xl bg-neutral-100 dark:bg-surface-container-lowest flex flex-col gap-1 border border-neutral-200 dark:border-surface-container-high min-w-0">
              {itemTitle && (
                <span className="font-semibold text-body-sm text-on-surface line-clamp-2 break-words">
                  {itemTitle}
                </span>
              )}
              {itemSubtitle && (
                <span className="text-label-sm font-mono text-outline line-clamp-1 break-all">
                  {itemSubtitle}
                </span>
              )}
            </div>
          )}

          {warningText && (
            <p className="text-[12px] text-on-surface-variant leading-relaxed">
              {warningText}
            </p>
          )}
        </div>

        {/* Rodapé / Ações */}
        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-surface-container-highest">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isLoading}
            onClick={onClose}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            isLoading={isLoading}
            onClick={onConfirm}
            className={cn('cursor-pointer shadow-sm', variantStyles.buttonBg)}
            leftIcon={
              <span className="material-symbols-outlined text-[16px]">
                {variantStyles.buttonIcon}
              </span>
            }
          >
            {confirmText}
          </Button>
        </div>
      </Card>
    </div>
  );
};
