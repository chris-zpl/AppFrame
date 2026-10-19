import React from 'react';
import { cn } from '../../../lib/utils';

export interface AdminPaginationButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'page' | 'nav' | 'icon';
  isActive?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
}

export const AdminPaginationButton: React.FC<AdminPaginationButtonProps> = ({
  variant = 'page',
  isActive = false,
  icon,
  iconPosition = 'left',
  children,
  className,
  disabled,
  ...props
}) => {
  if (variant === 'icon') {
    return (
      <button
        type="button"
        disabled={disabled}
        className={cn(
          'p-1.5 rounded-lg bg-neutral-100 dark:bg-surface-container hover:bg-neutral-200 dark:hover:bg-surface-container-high text-neutral-800 dark:text-on-surface disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center cursor-pointer border border-neutral-200 dark:border-surface-container-highest',
          className
        )}
        {...props}
      >
        {icon && <span className="material-symbols-outlined text-[18px]">{icon}</span>}
        {children}
      </button>
    );
  }

  if (variant === 'nav') {
    return (
      <button
        type="button"
        disabled={disabled}
        className={cn(
          'p-1.5 rounded-lg bg-neutral-100 dark:bg-surface-container hover:bg-neutral-200 dark:hover:bg-surface-container-high text-neutral-800 dark:text-on-surface disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center cursor-pointer border border-neutral-200 dark:border-surface-container-highest',
          className
        )}
        {...props}
      >
        {icon && iconPosition === 'left' && (
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        )}
        {children}
        {icon && iconPosition === 'right' && (
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'min-w-[32px] h-8 px-2 rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center font-medium',
        isActive
          ? 'bg-primary text-neutral-950 font-bold shadow-sm'
          : 'bg-neutral-100 dark:bg-surface-container hover:bg-neutral-200 dark:hover:bg-surface-container-high text-neutral-700 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface border border-neutral-200 dark:border-surface-container-highest',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
