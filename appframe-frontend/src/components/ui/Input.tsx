import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  inputSize?: 'sm' | 'md' | 'lg';
  label?: string;
  labelClassName?: string;
  labelRight?: React.ReactNode;
  containerClassName?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      size,
      inputSize,
      label,
      labelClassName,
      labelRight,
      containerClassName,
      leftIcon,
      rightElement,
      error,
      helperText,
      id,
      disabled,
      ...props
    },
    ref,
  ) => {
    const effectiveSize = inputSize || size || 'md';
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className={cn("flex flex-col gap-1.5 w-full", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "font-label-md text-label-md text-neutral-700 dark:text-on-surface font-medium flex items-center justify-between",
              labelClassName
            )}
          >
            <span>{label}</span>
            {labelRight && <div>{labelRight}</div>}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div
              className={cn(
                "absolute text-neutral-500 dark:text-on-surface-variant flex items-center justify-center pointer-events-none",
                effectiveSize === 'sm' ? "left-2.5 text-[16px]" : effectiveSize === 'lg' ? "left-3.5 text-[20px]" : "left-3 text-[18px]"
              )}
            >
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full rounded-lg bg-white dark:bg-surface-container-lowest text-neutral-900 dark:text-on-surface',
              'placeholder:text-neutral-400 dark:placeholder:text-outline border border-neutral-300 dark:border-transparent transition-all duration-200',
              'focus:outline-none focus:bg-white dark:focus:bg-surface-container-low focus:border-primary/80 dark:focus:border-primary/50 focus:ring-1 focus:ring-primary/40',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              effectiveSize === 'sm' && 'h-9 text-body-sm rounded-lg',
              effectiveSize === 'md' && 'h-11 text-body-md rounded-lg',
              effectiveSize === 'lg' && 'h-12 text-body-lg rounded-xl',
              effectiveSize === 'sm'
                ? leftIcon ? 'pl-8' : 'pl-3'
                : effectiveSize === 'lg'
                ? leftIcon ? 'pl-11' : 'pl-4'
                : leftIcon ? 'pl-10' : 'pl-3.5',
              effectiveSize === 'sm'
                ? rightElement ? 'pr-8' : 'pr-3'
                : effectiveSize === 'lg'
                ? rightElement ? 'pr-11' : 'pr-4'
                : rightElement ? 'pr-10' : 'pr-3.5',
              error && 'border-error focus:border-error focus:ring-error/40',
              className,
            )}
            {...props}
          />

          {rightElement && (
            <div
              className={cn(
                "absolute flex items-center justify-center",
                effectiveSize === 'sm' ? "right-2.5" : effectiveSize === 'lg' ? "right-3.5" : "right-3"
              )}
            >
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
