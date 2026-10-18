import React from 'react';
import type { VideoJobItem } from '../interfaces';
import { HistoryErrorModal } from './HistoryErrorModal';
import { HistoryDeleteModal } from './HistoryDeleteModal';

import { useHistoryContext } from '../context';

export interface HistoryModalsProps {
  errorJob?: VideoJobItem | null;
  onCloseError?: () => void;
  jobToDelete?: VideoJobItem | null;
  isDeleting?: boolean;
  onCloseDelete?: () => void;
  onConfirmDelete?: () => void | Promise<void>;
}

export const HistoryModals: React.FC<HistoryModalsProps> = (props) => {
  const history = useHistoryContext();

  const errorJob = props.errorJob !== undefined ? props.errorJob : history.errorDrawerJob;
  const onCloseError = props.onCloseError ?? (() => history.setErrorDrawerJob(null));
  const jobToDelete = props.jobToDelete !== undefined ? props.jobToDelete : history.jobToDelete;
  const isDeleting = props.isDeleting ?? Boolean(history.deletingJobId);
  const onCloseDelete = props.onCloseDelete ?? (() => history.setJobToDelete(null));
  const onConfirmDelete = props.onConfirmDelete ?? (async () => {
    if (history.jobToDelete) {
      await history.handleDeleteJob(history.jobToDelete);
      history.setJobToDelete(null);
    }
  });
  return (
    <>
      {/* Modal de Detalhes da Falha no Job */}
      <HistoryErrorModal
        job={errorJob}
        onClose={onCloseError}
      />

      {/* Modal de Confirmação de Exclusão do Histórico */}
      <HistoryDeleteModal
        job={jobToDelete}
        isLoading={isDeleting}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
      />
    </>
  );
};
