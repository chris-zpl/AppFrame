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
      'bg-primary text-label-sm font-label-sm text-neutral-950 dark:text-neutral-950 font-bold shadow-md rounded-md px-2 py-0.5',
    short:
      'bg-primary text-label-sm font-label-sm text-neutral-950 dark:text-neutral-950 font-bold shadow-md rounded-md px-2 py-0.5',
    long:
      'bg-surface-container-lowest/85 backdrop-blur-md text-label-sm font-label-sm text-white font-semibold tracking-wide rounded-md px-2 py-0.5',
    timestamp:
      'bg-surface-container-lowest/90 backdrop-blur-md text-label-sm font-label-sm text-white font-mono tracking-wider rounded px-2 py-0.5',
    'status-live':
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-container/15 text-label-sm font-label-sm text-primary border border-primary/30 shadow-[0_0_12px_rgba(212,163,70,0.15)]',
    'status-processing':
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-label-sm font-label-sm text-amber-500 border border-amber-500/30 shadow-[0_0_12px_rgba(212,163,70,0.15)]',
    'status-completed':
      'truncate items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-label-sm font-label-sm text-emerald-500 border border-emerald-500/30',
    'status-failed':
      'truncate items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-label-sm font-label-sm text-rose-500 border border-rose-500/30',
    count:
      'px-1.5 py-0.5 rounded-full bg-primary/20 text-label-sm font-label-sm font-semibold',
    neutral:
      'bg-surface-container text-label-sm font-label-sm text-on-surface-variant rounded-md px-2 py-0.5',
  };

  const isPulsing = pulseDot || variant === 'status-live' || variant === 'status-processing';
  const pulseColor = variant === 'status-processing' ? 'bg-amber-400' : 'bg-primary';

  return (
    <span
      className={cn(
        'items-center',
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
