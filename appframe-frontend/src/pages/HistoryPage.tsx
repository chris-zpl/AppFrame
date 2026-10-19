import React from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { AppShell } from '../components/layout/AppShell';
import {
  HistoryProvider,
  HistoryHeader,
  HistoryJobNotification,
  HistoryFilterTabs,
  HistoryJobList,
  HistoryModals,
} from '../features/history';

export const HistoryPage: React.FC = () => {
  const { navigate, params } = useNavigation();

  return (
    <HistoryProvider>
      <AppShell
        currentPath="historico"
        onNavigate={(path) => navigate(path)}
        onUserAvatarClick={() => navigate('settings')}
      >
        <div className="flex flex-col w-full text-neutral-900 dark:text-on-surface pb-12">
          <HistoryHeader
            onNewCut={() => navigate('studio')}
          />

          <HistoryJobNotification
            jobCreated={Boolean(params.jobCreated)}
            jobId={params.jobId}
          />

          <HistoryFilterTabs />

          <HistoryJobList
            onNavigateVarredura={() => navigate('varredura')}
            onNavigateStudio={() => navigate('studio')}
          />

          <HistoryModals />
        </div>
      </AppShell>
    </HistoryProvider>
  );
};
