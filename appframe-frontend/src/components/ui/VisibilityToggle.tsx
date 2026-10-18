import React from 'react';
import { cn } from '../../lib/utils';

export interface VisibilityToggleProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  isVisible: boolean;
  onToggle?: () => void;
  iconSize?: number;
  ariaLabel?: string;
}

export const VisibilityToggle: React.FC<VisibilityToggleProps> = ({
  isVisible,
  onToggle,
  onClick,
  title,
  ariaLabel,
  iconSize = 18,
  className,
  type = 'button',
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onToggle) onToggle();
    if (onClick) onClick(e);
  };

  const defaultTitle = isVisible ? 'Ocultar' : 'Mostrar';

  return (
    <button
      type={type}
      onClick={handleClick}
      title={title || defaultTitle}
      aria-label={ariaLabel || title || defaultTitle}
      className={cn(
        'text-outline hover:text-on-surface transition-colors cursor-pointer p-1 flex items-center justify-center rounded-lg',
        className
      )}
      {...props}
    >
      <span
        className="material-symbols-outlined select-none"
        style={{ fontSize: `${iconSize}px` }}
      >
        {isVisible ? 'visibility_off' : 'visibility'}
      </span>
    </button>
  );
};

export const PasswordToggle = VisibilityToggle;
