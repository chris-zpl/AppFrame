import React from 'react';
import { Card, Button } from '../../../components/ui';

interface SettingsDangerSectionProps {
  onTriggerDeleteModal: () => void;
}

export const SettingsDangerSection: React.FC<SettingsDangerSectionProps> = ({
  onTriggerDeleteModal,
}) => {
  return (
    <div className="flex flex-col gap-space-md animate-in fade-in duration-200">
      <Card className="p-6 bg-error-container/10 border-2 border-error/40 shadow-xl flex flex-col gap-4">
        <div className="flex items-center gap-3 text-error">
          <span className="material-symbols-outlined text-[28px]">warning</span>
          <h3 className="font-title-md text-title-md font-bold text-on-surface">
            Exclusão Permanente de Conta
          </h3>
        </div>

        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl leading-relaxed">
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
