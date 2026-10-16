import React from 'react';
import { Badge } from '../../../components/ui';

export interface AdminHeaderProps {
  isSuperAdmin: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ isSuperAdmin }) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2.5">
        <span className="material-symbols-outlined text-[28px] text-primary">
          admin_panel_settings
        </span>
        <h1 className="text-headline-sm font-bold text-on-surface">
          Painel Administrativo
        </h1>
        <Badge variant={isSuperAdmin ? 'primary' : 'neutral'} className="font-bold">
          {isSuperAdmin ? 'SUPER ADMIN' : 'ADMINISTRADOR'}
        </Badge>
      </div>
      <p className="text-body-sm text-on-surface-variant">
        {isSuperAdmin
          ? 'Controle total da plataforma: usuários, sessões, credenciais globais e servidores.'
          : 'Gestão de usuários da plataforma e controle de sessões ativas.'}
      </p>
    </div>
  );
};
