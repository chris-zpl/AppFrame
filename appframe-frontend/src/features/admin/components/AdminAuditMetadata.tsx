import React from 'react';

interface AdminAuditMetadataProps {
  metadata: Record<string, any> | null;
}

export const AdminAuditMetadata: React.FC<AdminAuditMetadataProps> = ({ metadata: meta }) => {
  if (!meta || Object.keys(meta).length === 0) {
    return <span className="text-outline text-xs italic">Sem detalhes adicionais</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5 max-w-md">
      {meta.previousRole && meta.newRole && (
        <span className="px-2 py-0.5 rounded text-[11px] bg-purple-500/15 text-purple-300 font-mono border border-purple-500/30 font-semibold">
          Função: {meta.previousRole} ➔ {meta.newRole}
        </span>
      )}
      {meta.oldEmail && meta.newEmail && (
        <span className="px-2 py-0.5 rounded text-[11px] bg-purple-500/10 text-purple-300 font-mono border border-purple-500/20">
          {meta.oldEmail} ➔ {meta.newEmail}
        </span>
      )}
      {meta.oldName && meta.newName && (
        <span className="px-2 py-0.5 rounded text-[11px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          {meta.oldName} ➔ {meta.newName}
        </span>
      )}
      {meta.googleEmail && (
        <span className="px-2 py-0.5 rounded text-[11px] bg-cyan-500/10 text-cyan-300 font-mono border border-cyan-500/20">
          Google: {meta.googleEmail}
        </span>
      )}
      {meta.email && (
        <span className="px-2 py-0.5 rounded text-[11px] bg-amber-500/10 text-amber-300 font-mono border border-amber-500/20">
          E-mail: {meta.email}
        </span>
      )}
      {meta.userFound === false && (
        <span className="px-2 py-0.5 rounded text-[11px] bg-red-500/15 text-red-400 border border-red-500/20 font-semibold">
          E-mail não cadastrado
        </span>
      )}
      {meta.performedBy && (
        <span className="px-2 py-0.5 rounded text-[11px] bg-primary/10 text-primary font-medium border border-primary/20">
          Admin: {meta.performedBy}
        </span>
      )}
      {meta.targetUserEmail && (
        <span className="px-2 py-0.5 rounded text-[11px] bg-rose-500/10 text-rose-300 font-mono border border-rose-500/20">
          Alvo: {meta.targetUserEmail}
        </span>
      )}
      {meta.maskedKey && (
        <span className="px-2 py-0.5 rounded text-[11px] bg-indigo-500/10 text-indigo-300 font-mono border border-indigo-500/20">
          Chave: {meta.maskedKey}
        </span>
      )}
      {meta.model && (
        <span className="px-2 py-0.5 rounded text-[11px] bg-cyan-500/10 text-cyan-300 font-mono border border-cyan-500/20">
          Modelo: {meta.model}
        </span>
      )}
      {meta.sizeBytes !== undefined && (
        <span className="px-2 py-0.5 rounded text-[11px] bg-amber-500/10 text-amber-300 font-mono border border-amber-500/20">
          Tamanho: {meta.sizeBytes} B
        </span>
      )}
      {meta.reason && (
        <span className="px-2 py-0.5 rounded text-[11px] bg-surface-container-high text-on-surface-variant">
          Motivo: {meta.reason}
        </span>
      )}
      {Object.entries(meta)
        .filter(
          ([k]) =>
            ![
              'oldEmail',
              'newEmail',
              'oldName',
              'newName',
              'googleEmail',
              'email',
              'userFound',
              'reason',
              'googleId',
              'performedBy',
              'targetUserEmail',
              'targetUserName',
              'adminId',
              'status',
              'maskedKey',
              'model',
              'sizeBytes',
              'previousRole',
              'newRole',
            ].includes(k)
        )
        .map(([k, v]) => (
          <span
            key={k}
            className="px-2 py-0.5 rounded text-[11px] bg-surface-container-high text-outline font-mono"
          >
            {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
          </span>
        ))}
    </div>
  );
};
