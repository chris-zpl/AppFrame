import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'google' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const sizeStyles = {
      sm: 'h-9 px-3 text-label-md rounded-lg',
      md: 'h-11 px-5 text-title-sm rounded-lg',
      lg: 'h-12 px-6 text-title-md rounded-xl',
    };

    if (variant === 'google') {
      return (
        <button
          ref={ref}
          disabled={disabled || isLoading}
          className={cn(
            'w-full h-11 px-4 rounded-lg bg-white hover:bg-neutral-50 transition-all duration-200 cursor-pointer',
            'flex items-center justify-between shadow-sm active:scale-[0.99]',
            'border border-black/15 border-neutral-300 dark:border-transparent dark:hover:ring-2 dark:hover:ring-[#D4A346]/40',
            disabled && 'opacity-60 cursor-not-allowed',
            className,
          )}
          {...props}
        >
          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
          </div>
          <span className="font-title-sm text-title-sm text-neutral-900 font-semibold mx-auto">
            {children || 'Continuar com o Google'}
          </span>
          <div className="w-5 shrink-0" />
        </button>
      );
    }

    const variantStyles = {
      primary:
        'bg-[#D4A346] hover:bg-[#E0B04A] text-[#0F1115] font-bold shadow-[0_4px_20px_-2px_rgba(212,163,70,0.35)] hover:shadow-[0_0_24px_rgba(212,163,70,0.45)] active:scale-[0.99]',
      secondary:
        'bg-neutral-100 hover:bg-neutral-900 text-neutral-800 hover:text-white dark:bg-[#1E222D] dark:hover:bg-[#282D3C] dark:text-[#F8F9FA] dark:hover:text-white transition-colors font-semibold shadow-sm border border-neutral-200 dark:border-outline/10',
      outline:
        'bg-transparent border border-neutral-300 dark:border-outline/30 text-neutral-800 dark:text-[#F8F9FA] hover:bg-neutral-900 hover:text-white dark:hover:bg-[#282D3C] dark:hover:text-white transition-colors',
      ghost:
        'bg-transparent text-neutral-600 dark:text-[#949DAF] hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-surface-container dark:hover:text-white transition-colors',
      danger:
        'bg-error-container hover:bg-error-container/80 text-on-error-container font-semibold shadow-sm',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 select-none font-sans transition-all duration-200 cursor-pointer',
          sizeStyles[size],
          variantStyles[variant],
          disabled && 'opacity-60 cursor-not-allowed active:scale-100',
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <span className="material-symbols-outlined text-[18px] animate-spin">
            progress_activity
          </span>
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  },
);

Button.displayName = 'Button';
