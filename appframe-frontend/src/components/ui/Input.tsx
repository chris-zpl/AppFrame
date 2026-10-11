import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      leftIcon,
      rightElement,
      error,
      helperText,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="font-label-md text-label-md text-neutral-700 dark:text-on-surface font-medium flex items-center justify-between"
          >
            <span>{label}</span>
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3 text-neutral-500 dark:text-on-surface-variant flex items-center justify-center pointer-events-none text-[18px]">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full h-11 rounded-lg bg-white dark:bg-surface-container-lowest text-neutral-900 dark:text-on-surface font-body-md text-body-md',
              'placeholder:text-neutral-400 dark:placeholder:text-outline border border-neutral-300 dark:border-transparent transition-all duration-200',
              'focus:outline-none focus:bg-white dark:focus:bg-surface-container-low focus:border-primary/80 dark:focus:border-primary/50 focus:ring-1 focus:ring-primary/40',
              leftIcon ? 'pl-10' : 'pl-3.5',
              rightElement ? 'pr-10' : 'pr-3.5',
              error && 'border-error focus:border-error focus:ring-error/40',
              className,
            )}
            {...props}
          />

          {rightElement && (
            <div className="absolute right-3 flex items-center justify-center">
              {rightElement}
            </div>
          )}
        </div>

        {error && (
          <span className="text-error font-body-sm text-body-sm flex items-center gap-1 mt-0.5">
            <span className="material-symbols-outlined text-[14px]">error</span>
            <span>{error}</span>
          </span>
        )}

        {!error && helperText && (
          <span className="text-neutral-600 dark:text-on-surface-variant font-body-sm text-body-sm mt-0.5">
            {helperText}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
