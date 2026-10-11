import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';

interface ThemeToggleProps {
  variant?: 'floating' | 'header' | 'inline' | 'auth';
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'header',
  className,
  showLabel = false,
}) => {
  const { isDark, toggleTheme } = useTheme();

  if (variant === 'auth' || variant === 'floating') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
        title={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md',
          'bg-white text-neutral-800 hover:text-neutral-950 hover:bg-neutral-100 border border-neutral-300/80',
          'dark:bg-[#1E222D] dark:text-[#E0E2EC] dark:hover:text-[#F2BE5E] dark:hover:bg-[#282D3C] dark:border-white/10 dark:hover:ring-2 dark:hover:ring-[#D4A346]/30',
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
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all shadow-sm cursor-pointer',
          'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 border border-neutral-300/70',
          'dark:bg-surface-container dark:hover:bg-surface-container-high dark:text-on-surface-variant dark:hover:text-on-surface text-label-md font-label-md',
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
      title={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
      className={cn(
        'flex items-center justify-center w-9 h-9 rounded-lg transition-colors cursor-pointer',
        'bg-neutral-100 text-neutral-700 hover:text-neutral-950 hover:bg-neutral-200 border border-neutral-200',
        'dark:bg-surface-container dark:text-on-surface-variant dark:hover:text-on-surface dark:hover:bg-surface-container-high dark:border-transparent',
        className,
      )}
    >
      <span className="material-symbols-outlined text-[18px]">
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  );
};
