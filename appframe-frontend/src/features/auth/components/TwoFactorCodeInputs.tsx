import React from 'react';

interface TwoFactorCodeInputsProps {
  digits: string[];
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  onChange: (index: number, value: string) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export const TwoFactorCodeInputs: React.FC<TwoFactorCodeInputsProps> = ({
  digits,
  inputRefs,
  onChange,
  onKeyDown,
  onPaste,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-between gap-2 sm:gap-2.5 w-full">
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            disabled={disabled}
            value={digit}
            onChange={(e) => onChange(idx, e.target.value)}
            onKeyDown={(e) => onKeyDown(idx, e)}
            onPaste={onPaste}
            className={`w-12 h-14 sm:w-13 sm:h-16 text-center text-[24px] sm:text-[28px] font-bold rounded-xl bg-white dark:bg-surface-container-lowest border transition-all duration-200 outline-none tabular-nums ${
              disabled
                ? 'opacity-50 cursor-not-allowed border-neutral-300 dark:border-surface-container-highest'
                : digit
                ? 'border-primary text-[#B8851B] dark:text-primary shadow-[0_0_12px_rgba(242,190,94,0.25)]'
                : 'border-neutral-300 dark:border-surface-container-highest text-neutral-900 dark:text-on-surface focus:border-primary/80 focus:ring-2 focus:ring-primary/20'
            }`}
          />
        ))}
      </div>

      <span className="text-label-sm font-label-sm text-neutral-500 dark:text-[#949DAF] mt-1">
        Cole o código de 6 dígitos ou digite individualmente
      </span>
    </div>
  );
};
