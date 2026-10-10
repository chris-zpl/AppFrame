import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';

interface ThemeToggleProps {
  variant?: 'floating' | 'header' | 'inline';
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'header',
  className,
  showLabel = false,
}) => {
  const { isDark, toggleTheme } = useTheme();

  if (variant === 'floating') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Alternar Tema Claro/Escuro"
        className={cn(
          'w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center',
          'text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all duration-200 shadow-sm',
          className,
        )}
      >
        <span className="material-symbols-outlined text-[20px]">
          {isDark ? 'light_mode' : 'dark_mode'}
        </span>
      </button>
    );
  }

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high',
          'text-on-surface-variant hover:text-on-surface text-label-md font-label-md transition-all shadow-sm',
          className,
        )}
      >
        <span className="material-symbols-outlined text-[18px] text-primary">
          {isDark ? 'light_mode' : 'dark_mode'}
        </span>
        {showLabel && (
          <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
        )}
      </button>
    );
  }

  // Padrão Header: 36px (w-9 h-9)
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Alternar tema"
      className={cn(
        'flex items-center justify-center w-9 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high',
        'text-on-surface-variant hover:text-on-surface transition-colors',
        className,
      )}
    >
      <span className="material-symbols-outlined text-[18px]">
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  );
};
