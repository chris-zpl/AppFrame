import React from 'react';
import { cn } from '../../../lib/utils';

export interface AdminTabButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count?: number;
  hasStatusDot?: boolean;
  statusDotColor?: string;
  className?: string;
}

export const AdminTabButton: React.FC<AdminTabButtonProps> = ({
  isActive,
  onClick,
  icon,
  label,
  count,
  hasStatusDot = false,
  statusDotColor = 'bg-emerald-400',
  className,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer whitespace-nowrap',
        isActive
          ? 'bg-primary text-on-primary shadow-sm'
          : 'text-on-surface-variant hover:text-surface hover:bg-inverse-surface',
        className
      )}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            'px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold',
            isActive
              ? 'bg-on-primary/15 text-surface'
              : 'bg-black/20 text-surface dark:bg-surface-container-highest dark:text-on-surface-variant'
          )}
        >
          {count}
        </span>
      )}
      {hasStatusDot && (
        <span className={cn('w-2 h-2 rounded-full', statusDotColor)} />
      )}
    </button>
  );
};
