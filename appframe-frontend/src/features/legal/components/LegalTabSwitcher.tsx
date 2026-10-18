import { cn } from '../../../lib/utils';
import type { LegalDocType } from '../types';

export interface LegalTabSwitcherProps {
  activeDoc: LegalDocType;
  onSelectDoc: (doc: LegalDocType) => void;
  className?: string;
}

export const LegalTabSwitcher: React.FC<LegalTabSwitcherProps> = ({
  activeDoc,
  onSelectDoc,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center p-1 bg-surface-container-lowest rounded-xl border border-surface-container-highest',
        className
      )}
    >
      <button
        type="button"
        onClick={() => onSelectDoc('terms')}
        className={cn(
          'px-3 py-1.5 rounded-lg text-label-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5',
          activeDoc === 'terms'
            ? 'bg-primary text-on-primary shadow-xs'
            : 'text-on-surface-variant hover:text-on-surface'
        )}
      >
        <span className="material-symbols-outlined text-[16px]">gavel</span>
        <span>Termos</span>
      </button>
      <button
        type="button"
        onClick={() => onSelectDoc('privacy')}
        className={cn(
          'px-3 py-1.5 rounded-lg text-label-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5',
          activeDoc === 'privacy'
            ? 'bg-primary text-on-primary shadow-xs'
            : 'text-on-surface-variant hover:text-on-surface'
        )}
      >
        <span className="material-symbols-outlined text-[16px]">verified_user</span>
        <span>Privacidade</span>
      </button>
    </div>
  );
};
