import React from 'react';
import { Input } from '../../../components/ui/Input';

interface TwoFactorBackupInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const TwoFactorBackupInput: React.FC<TwoFactorBackupInputProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-2">
      <Input
        label="Código de Recuperação"
        placeholder="Ex: A8B2-9F1C-4D"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        disabled={disabled}
        required
        leftIcon={
          <span className="material-symbols-outlined text-[18px]">
            key
          </span>
        }
      />
      <span className="text-label-sm font-label-sm text-neutral-500 dark:text-[#949DAF]">
        Códigos reserva são de uso único
      </span>
    </div>
  );
};
