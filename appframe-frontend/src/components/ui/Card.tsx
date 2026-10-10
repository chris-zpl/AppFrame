import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'auth' | 'interactive';
  glowTopLine?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = 'default',
      glowTopLine = false,
      children,
      ...props
    },
    ref,
  ) => {
    const isAuth = variant === 'auth';
    const showGlowLine = glowTopLine || isAuth;

    const variantStyles = {
      default:
        'bg-surface-container rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.25)] border border-outline/10',
      elevated:
        'bg-surface-container-low rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.35)] border border-primary/15',
      auth:
        'bg-surface-container-low rounded-[24px] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.65),0_0_24px_rgba(212,163,70,0.06)] border border-outline/10',
      interactive:
        'bg-surface-container rounded-2xl transition-all duration-300 hover:-translate-y-1 shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)] border border-outline/10 cursor-pointer',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-hidden transition-all duration-200',
          variantStyles[variant],
          className,
        )}
        {...props}
      >
        {showGlowLine && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent pointer-events-none z-10" />
        )}
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
