import React from 'react';
import { cn } from '../../lib/utils';

interface AppFrameLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  glow?: boolean;
  className?: string;
  onClick?: () => void;
}

export const AppFrameLogo: React.FC<AppFrameLogoProps> = ({
  size = 'md',
  showText = true,
  glow = false,
  className,
  onClick,
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textStyles = {
    sm: 'text-headline-sm',
    md: 'text-headline-md',
    lg: 'text-headline-lg',
    xl: 'text-headline-xl',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 select-none transition-transform',
        onClick && 'cursor-pointer hover:opacity-95',
        className,
      )}
    >
      <div className="relative flex items-center justify-center shrink-0 group">
        {glow && (
          <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-lg transition-transform group-hover:scale-110 pointer-events-none" />
        )}
        <svg
          className={cn(
            iconDimensions[size],
            'relative z-10 transition-transform duration-300 group-hover:-translate-y-0.5 shrink-0',
          )}
          fill="none"
          viewBox="0 0 48 48"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Camada Inferior (Base) */}
          <path
            d="M24 32L6 22.5L24 13L42 22.5L24 32Z"
            fill="#1d2027"
            fillOpacity="0.9"
          />
          <path
            d="M24 32L6 22.5L24 13L42 22.5L24 32Z"
            stroke="#4f4537"
            strokeLinejoin="round"
            strokeWidth="1.2"
          />

          {/* Camada Intermediária */}
          <path
            d="M24 26L8 17.5L24 9L40 17.5L24 26Z"
            fill="#272a31"
            fillOpacity="0.85"
          />
          <path
            d="M24 26L8 17.5L24 9L40 17.5L24 26Z"
            stroke="#9b8f7d"
            strokeLinejoin="round"
            strokeOpacity="0.7"
            strokeWidth="1.2"
          />

          {/* Camada Superior (Dourado Âmbar Oficial) */}
          <path
            d="M24 20L10 12.5L24 5L38 12.5L24 20Z"
            fill="url(#amber-gradient-layer)"
          />
          <path
            d="M24 20L10 12.5L24 5L38 12.5L24 20Z"
            stroke="#ffdea8"
            strokeLinejoin="round"
            strokeWidth="1.4"
          />

          <defs>
            <linearGradient
              id="amber-gradient-layer"
              x1="10"
              y1="5"
              x2="38"
              y2="20"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#f2be5e" />
              <stop offset="1" stopColor="#d4a346" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div
          className={cn(
            'flex items-baseline tracking-tight font-sans',
            textStyles[size],
          )}
        >
          <span className="text-on-surface font-bold">App</span>
          <span className="text-primary font-bold">Frame</span>
        </div>
      )}
    </div>
  );
};
