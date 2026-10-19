import React from 'react';
import { Card, Button } from '../../../components/ui';

import { useSettingsContext } from '../context';

export interface SettingsDangerSectionProps {
  onTriggerDeleteModal?: () => void;
}

export const SettingsDangerSection: React.FC<SettingsDangerSectionProps> = (props) => {
  const settings = useSettingsContext();

  const onTriggerDeleteModal = props.onTriggerDeleteModal ?? (() => settings.setDeleteAccountModal(true));
  return (
    <div className="flex flex-col gap-space-md animate-in fade-in duration-200">
      <Card className="p-6 bg-red-50/70 dark:bg-error-container/10 border-2 border-red-200 dark:border-error/40 shadow-sm dark:shadow-xl flex flex-col gap-4">
        <div className="flex items-center gap-3 text-error">
          <span className="material-symbols-outlined text-[28px]">warning</span>
          <h3 className="font-title-md text-title-md font-bold text-neutral-900 dark:text-on-surface">
            Exclusão Permanente de Conta
          </h3>
        </div>

        <p className="font-body-md text-body-md text-neutral-600 dark:text-on-surface-variant max-w-2xl leading-relaxed">
          Ao excluir sua conta, todas as suas sessões ativas serão invalidadas, todos os registros de jobs no banco de dados serão eliminados em cascata e os arquivos gerados no storage (vídeos finais e marcas d'água) serão apagados permanentemente. <strong>Esta ação é irreversível.</strong>
        </p>

        <div className="pt-2">
          <Button
            variant="danger"
            onClick={onTriggerDeleteModal}
            leftIcon={
              <span className="material-symbols-outlined text-[18px]">delete_forever</span>
            }
          >
            Excluir Minha Conta Permanentemente
          </Button>
        </div>
      </Card>
    </div>
  );
};
