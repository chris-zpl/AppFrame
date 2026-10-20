import React from 'react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  selectSize?: 'sm' | 'md' | 'lg';
  label?: React.ReactNode;
  labelClassName?: string;
  labelRight?: React.ReactNode;
  containerClassName?: string;
  leftIcon?: React.ReactNode;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      size,
      selectSize,
      label,
      labelClassName,
      labelRight,
      containerClassName,
      leftIcon,
      error,
      helperText,
      id,
      name,
      disabled,
      options,
      children,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const effectiveSize = selectSize || size || 'md';
    const selectId =
      id ||
      (typeof label === 'string'
        ? `select-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        : name
        ? `select-${name}`
        : `select-${generatedId.replace(/:/g, '')}`);
    const selectName = name || selectId;

    return (
      <div className={cn("flex flex-col gap-1.5 w-full", containerClassName)}>
        {(label || labelRight) && (
          <div className="flex items-center justify-between">
            {label && (
              <label
                htmlFor={selectId}
                className={cn(
                  "font-label-md text-label-md text-neutral-700 dark:text-on-surface font-medium",
                  labelClassName
                )}
              >
                {label}
              </label>
            )}
            {labelRight && <div>{labelRight}</div>}
          </div>
        )}

        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div
              className={cn(
                "absolute text-neutral-500 dark:text-on-surface-variant flex items-center justify-center pointer-events-none z-10",
                effectiveSize === 'sm' ? "left-2.5 text-[16px]" : effectiveSize === 'lg' ? "left-3.5 text-[20px]" : "left-3 text-[18px]"
              )}
            >
              {leftIcon}
            </div>
          )}

          <select
            id={selectId}
            name={selectName}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full appearance-none rounded-lg bg-white dark:bg-surface-container-lowest text-neutral-900 dark:text-on-surface',
              'border border-neutral-300 dark:border-surface-container-highest cursor-pointer',
              'outline-none focus:outline-none focus-visible:outline-none',
              'transition-colors duration-150 shadow-2xs',
              'focus:bg-white dark:focus:bg-surface-container-low focus:border-primary/80 dark:focus:border-primary focus:ring-1 focus:ring-primary/40 dark:focus:ring-primary/40 focus:ring-offset-0 focus:ring-offset-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              effectiveSize === 'sm' && 'h-9 text-body-sm rounded-lg',
              effectiveSize === 'md' && 'h-11 text-body-md rounded-lg',
              effectiveSize === 'lg' && 'h-12 text-body-lg rounded-xl',
              effectiveSize === 'sm'
                ? leftIcon ? 'pl-8 pr-8' : 'pl-3 pr-8'
                : effectiveSize === 'lg'
                ? leftIcon ? 'pl-11 pr-10' : 'pl-4 pr-10'
                : leftIcon ? 'pl-10 pr-9' : 'pl-3.5 pr-9',
              error && 'border-error dark:border-error focus:border-error dark:focus:border-error focus:ring-error/40 dark:focus:ring-error/40',
              className,
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option
                    key={String(opt.value)}
                    value={opt.value}
                    disabled={opt.disabled}
                    className="bg-white dark:bg-surface-container text-neutral-900 dark:text-on-surface py-1"
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          {/* Seta seletora elegante */}
          <div className="absolute right-2.5 pointer-events-none text-neutral-500 dark:text-on-surface-variant flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">
              expand_more
            </span>
          </div>
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

Select.displayName = 'Select';
