import React from 'react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  className?: string;
  actionSlot?: React.ReactNode;
  suggestionsTitle?: string;
  suggestions?: Array<{
    label: string;
    onClick: () => void;
  }>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'radar',
  title,
  description,
  className,
  actionSlot,
  suggestionsTitle,
  suggestions,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-6 md:p-space-xl my-6 rounded-2xl',
        'bg-surface-container-low/70 border border-primary/20 shadow-[0_12px_40px_rgba(0,0,0,0.4)]',
        'text-center relative overflow-hidden select-none',
        className,
      )}
    >
      {/* Halo ambiental no fundo */}
      <div className="absolute w-72 md:w-80 h-72 md:h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Ícone Central com Anel Pulsante */}
      <div className="relative w-16 md:w-20 h-16 md:h-20 rounded-full bg-surface-container flex items-center justify-center shadow-[0_0_30px_rgba(212,163,70,0.25)] border border-primary/40 mb-space-md z-10">
        <span className="material-symbols-outlined text-primary text-[30px] md:text-[36px] animate-pulse">
          {icon}
        </span>
        <div className="absolute inset-0 rounded-full border border-primary/30 animate-ping opacity-25 pointer-events-none" />
      </div>

      {/* Título & Descrição */}
      <h3 className="font-headline-sm md:font-headline-md text-headline-sm md:text-headline-md font-bold text-on-surface mb-2 z-10">
        {title}
      </h3>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-lg mb-space-lg z-10">
        {description}
      </p>

      {/* Botão de Ação Customizado */}
      {actionSlot && <div className="z-10 mb-space-md">{actionSlot}</div>}

      {/* Sugestões Rápidas (opcional) */}
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-col items-center gap-2 z-10">
          {suggestionsTitle && (
            <span className="text-label-sm font-label-sm text-outline uppercase tracking-wider">
              {suggestionsTitle}
            </span>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={sug.onClick}
                className={cn(
                  'px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high',
                  'border border-primary/20 text-on-surface text-title-sm font-title-sm',
                  'flex items-center gap-2 hover:border-primary/50 transition-all shadow-sm cursor-pointer',
                )}
              >
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>{sug.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
