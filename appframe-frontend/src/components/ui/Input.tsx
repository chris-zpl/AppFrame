import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  inputSize?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'digit';
  label?: React.ReactNode;
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
      variant = 'default',
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
    const generatedId = React.useId();
    const effectiveSize = inputSize || size || 'md';
    const inputId =
      id ||
      (typeof label === 'string'
        ? `input-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
        : props.name
        ? `input-${props.name}`
        : `input-${generatedId.replace(/:/g, '')}`);
    const inputName = props.name || inputId;

    // Variante 1: Dígitos individuais para autenticação 2FA
    if (variant === 'digit') {
      return (
        <input
          id={inputId}
          name={inputName}
          ref={ref}
          disabled={disabled}
          className={cn(
            'w-12 h-14 sm:w-13 sm:h-16 text-center text-[24px] sm:text-[28px] font-bold rounded-xl bg-white dark:bg-surface-container-lowest border transition-all duration-200 outline-none tabular-nums',
            disabled
              ? 'opacity-50 cursor-not-allowed border-neutral-300 dark:border-surface-container-highest'
              : props.value
              ? 'border-primary text-[#B8851B] dark:text-primary shadow-[0_0_12px_rgba(242,190,94,0.25)]'
              : 'border-neutral-300 dark:border-surface-container-highest text-neutral-900 dark:text-on-surface focus:border-primary/80 dark:focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/20',
            className,
          )}
          {...props}
        />
      );
    }

    // Variante 2: Seletor nativo de cor
    if (props.type === 'color') {
      return (
        <input
          id={inputId}
          name={inputName}
          ref={ref}
          type="color"
          disabled={disabled}
          className={cn(
            'w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 shrink-0 outline-none',
            className,
          )}
          {...props}
        />
      );
    }

    // Variante 3: Slider / Range (ex: tamanho de fonte, opacidade, escala)
    if (props.type === 'range') {
      return (
        <div className={cn("flex flex-col gap-1.5 w-full", containerClassName)}>
          {(label || labelRight) && (
            <div className="flex items-center justify-between text-label-sm font-label-sm">
              {label && (
                <label
                  htmlFor={inputId}
                  className={cn("text-neutral-500 dark:text-outline font-semibold", labelClassName)}
                >
                  {label}
                </label>
              )}
              {labelRight && <div>{labelRight}</div>}
            </div>
          )}
          <input
            id={inputId}
            name={inputName}
            ref={ref}
            type="range"
            disabled={disabled}
            className={cn(
              'w-full accent-amber-400 dark:accent-primary h-2 bg-neutral-200 dark:bg-surface-container-highest rounded-lg cursor-pointer outline-none transition-colors',
              className,
            )}
            {...props}
          />
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
    }

    // Variante 4: Input de arquivo oculto (ex: upload de cookie ou watermark)
    if (props.type === 'file' && className?.includes('hidden')) {
      return (
        <input
          id={inputId}
          name={inputName}
          ref={ref}
          type="file"
          disabled={disabled}
          className="hidden"
          {...props}
        />
      );
    }

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
            name={inputName}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full rounded-lg bg-white dark:bg-surface-container-lowest text-neutral-900 dark:text-on-surface',
              'placeholder:text-neutral-400 dark:placeholder:text-outline border border-neutral-300 dark:border-transparent',
              'outline-none focus:outline-none focus-visible:outline-none',
              'transition-colors duration-150',
              'focus:bg-white dark:focus:bg-surface-container-low focus:border-primary/80 dark:focus:border-primary focus:ring-1 focus:ring-primary/40 dark:focus:ring-primary/40 focus:ring-offset-0 focus:ring-offset-transparent',
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
              error && 'border-error dark:border-error focus:border-error dark:focus:border-error focus:ring-error/40 dark:focus:ring-error/40',
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
