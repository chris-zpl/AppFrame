import React from 'react';
import { cn } from '../../lib/utils';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  variant?: 'default' | 'card-indicator';
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      checked,
      variant = 'default',
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id || (typeof label === 'string' ? `chk-${label.slice(0, 10).replace(/\s+/g, '-')}` : undefined);

    if (variant === 'card-indicator') {
      return (
        <label className="relative flex items-center justify-center cursor-pointer select-none">
          <input
            id={inputId}
            ref={ref}
            type="checkbox"
            checked={checked}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              'w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200',
              checked
                ? 'bg-primary text-on-primary shadow-md ring-2 ring-primary/40'
                : 'bg-surface-container-low text-on-surface/40 border border-outline/30 hover:border-primary/50',
              className,
            )}
          >
            <span
              className={cn(
                'material-symbols-outlined text-[16px] font-bold transition-opacity',
                checked ? 'opacity-100' : 'opacity-0',
              )}
            >
              check
            </span>
          </div>
        </label>
      );
    }

    return (
      <div className="flex items-start gap-2.5 select-none">
        <label
          htmlFor={inputId}
          className="relative flex items-center justify-center cursor-pointer select-none pt-0.5"
        >
          <input
            id={inputId}
            ref={ref}
            type="checkbox"
            checked={checked}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              'w-4 h-4 rounded bg-surface-container-lowest transition-colors flex items-center justify-center border border-outline/20',
              'peer-checked:bg-primary peer-checked:border-primary',
              className,
            )}
          >
            <span
              className={cn(
                'material-symbols-outlined text-[13px] text-on-primary font-bold transition-opacity',
                checked ? 'opacity-100' : 'opacity-0',
              )}
            >
              check
            </span>
          </div>
        </label>
        {label && (
          <label
            htmlFor={inputId}
            className="font-label-sm text-label-sm text-on-surface-variant cursor-pointer leading-tight"
          >
            {label}
          </label>
        )}
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';
