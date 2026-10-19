import React from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  labelClassName?: string;
  labelRight?: React.ReactNode;
  containerClassName?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      labelClassName,
      labelRight,
      containerClassName,
      error,
      helperText,
      id,
      disabled,
      rows = 4,
      ...props
    },
    ref,
  ) => {
    const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className={cn("flex flex-col gap-1.5 w-full", containerClassName)}>
        {label && (
          <label
            htmlFor={textareaId}
            className={cn(
              "font-label-md text-label-md text-neutral-700 dark:text-on-surface font-medium flex items-center justify-between",
              labelClassName
            )}
          >
            <span>{label}</span>
            {labelRight && <div>{labelRight}</div>}
          </label>
        )}

        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          disabled={disabled}
          className={cn(
            'w-full rounded-xl bg-white dark:bg-surface-container-lowest text-neutral-900 dark:text-on-surface font-body-md text-body-md p-3.5',
            'placeholder:text-neutral-400 dark:placeholder:text-outline border border-neutral-300 dark:border-transparent',
            'outline-none focus:outline-none focus-visible:outline-none',
            'transition-colors duration-150',
            'focus:bg-white dark:focus:bg-surface-container-low focus:border-primary/80 dark:focus:border-primary focus:ring-1 focus:ring-primary/40 dark:focus:ring-primary/40 focus:ring-offset-0 focus:ring-offset-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-error dark:border-error focus:border-error dark:focus:border-error focus:ring-error/40 dark:focus:ring-error/40',
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
  },
);

Textarea.displayName = 'Textarea';
