import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'primary'
    | 'short'
    | 'long'
    | 'timestamp'
    | 'status-live'
    | 'status-processing'
    | 'status-completed'
    | 'status-failed'
    | 'count'
    | 'neutral';
  pulseDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  pulseDot = false,
  children,
  ...props
}) => {
  const variantStyles = {
    primary:
      'bg-primary text-on-primary font-bold shadow-md rounded-md px-2 py-0.5 text-label-sm font-label-sm',
    short:
      'bg-primary text-on-primary text-label-sm font-label-sm font-bold shadow-md rounded-md px-2 py-0.5',
    long:
      'bg-surface-container-lowest/85 backdrop-blur-md text-on-surface text-label-sm font-label-sm tracking-wide rounded-md px-2 py-0.5',
    timestamp:
      'bg-surface-container-lowest/90 backdrop-blur-md text-on-surface text-label-sm font-label-sm font-mono tracking-wider rounded px-2 py-0.5',
    'status-live':
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-container/15 text-primary text-label-sm font-label-sm border border-primary/30 shadow-[0_0_12px_rgba(212,163,70,0.15)]',
    'status-processing':
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-label-sm font-label-sm border border-amber-500/30 shadow-[0_0_12px_rgba(212,163,70,0.15)]',
    'status-completed':
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 text-label-sm font-label-sm border border-emerald-500/30',
    'status-failed':
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-500 text-label-sm font-label-sm border border-rose-500/30',
    count:
      'px-1.5 py-0.5 rounded-full bg-primary/20 text-label-sm font-label-sm font-semibold',
    neutral:
      'bg-surface-container text-on-surface-variant text-label-sm font-label-sm rounded-md px-2 py-0.5',
  };

  const isPulsing = pulseDot || variant === 'status-live' || variant === 'status-processing';
  const pulseColor = variant === 'status-processing' ? 'bg-amber-400' : 'bg-primary';

  return (
    <span
      className={cn(
        'inline-flex items-center select-none',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {isPulsing && (
        <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse shrink-0', pulseColor)} />
      )}
      <span>{children}</span>
    </span>
  );
};
