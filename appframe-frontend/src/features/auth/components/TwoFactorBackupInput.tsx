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
    <Input
      label="Código de Recuperação"
      placeholder="Ex: A8B2-9F1C-4D"
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value.toUpperCase())}
      disabled={disabled}
      required
      helperText="Códigos reserva são de uso único"
      leftIcon={
        <span className="material-symbols-outlined text-[18px]">
          key
        </span>
      }
    />
  );
};
