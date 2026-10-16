import React from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { AppShell } from '../components/layout/AppShell';
import {
  HistoryHeader,
  HistoryJobNotification,
  HistoryFilterTabs,
  HistoryJobList,
  HistoryModals,
  useHistoryJobs,
} from '../features/history';

export const HistoryPage: React.FC = () => {
  const { navigate, params } = useNavigation();

  const {
    jobs,
    filteredJobs,
    isLoading,
    filter,
    setFilter,
    errorDrawerJob,
    setErrorDrawerJob,
    jobToDelete,
    setJobToDelete,
    deletingJobId,
    handleDownloadVideo,
    handleDeleteJob,
    refetch,
  } = useHistoryJobs();

  const handleConfirmDelete = async () => {
    if (jobToDelete) {
      await handleDeleteJob(jobToDelete);
      setJobToDelete(null);
    }
  };

  return (
    <AppShell
      currentPath="historico"
      onNavigate={(path) => navigate(path)}
      onUserAvatarClick={() => navigate('settings')}
    >
      <div className="flex flex-col w-full text-on-surface pb-12">
        <HistoryHeader
          onRefresh={() => refetch()}
          onNewCut={() => navigate('studio')}
        />

        <HistoryJobNotification
          jobCreated={Boolean(params.jobCreated)}
          jobId={params.jobId}
        />

        <HistoryFilterTabs
          filter={filter}
          onFilterChange={setFilter}
          jobs={jobs}
        />

        <HistoryJobList
          jobs={filteredJobs}
          isLoading={isLoading}
          deletingJobId={deletingJobId}
          onDownload={handleDownloadVideo}
          onViewError={setErrorDrawerJob}
          onDelete={setJobToDelete}
          onNavigateVarredura={() => navigate('varredura')}
          onNavigateStudio={() => navigate('studio')}
        />

        <HistoryModals
          errorJob={errorDrawerJob}
          onCloseError={() => setErrorDrawerJob(null)}
          jobToDelete={jobToDelete}
          isDeleting={Boolean(deletingJobId)}
          onCloseDelete={() => setJobToDelete(null)}
          onConfirmDelete={handleConfirmDelete}
        />
      </div>
    </AppShell>
  );
};
