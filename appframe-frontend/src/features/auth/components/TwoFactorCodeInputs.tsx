import React from 'react';
import { Input } from '../../../components/ui';

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
          <Input
            key={idx}
            variant="digit"
            id={`two-factor-digit-${idx + 1}`}
            name={`two_factor_digit_${idx + 1}`}
            aria-label={`Dígito ${idx + 1} do código 2FA`}
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
          />
        ))}
      </div>

      <span className="text-label-sm font-label-sm text-neutral-500 dark:text-[#949DAF] mt-1">
        Cole o código de 6 dígitos ou digite individualmente
      </span>
    </div>
  );
};
