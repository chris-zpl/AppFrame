import React from "react";
import { useNavigation } from "../contexts/NavigationContext";
import { AppShell } from "../components/layout/AppShell";
import {
  ScannerProvider,
  ScannerHeader,
  ScannerSearchBar,
  ScannerVideoFeed,
  ScannerBatchDock,
  useScannerContext,
} from "../features/scanner";

const ScraperPageContent: React.FC = () => {
  const { navigate } = useNavigation();
  const { handleDownloadSelected, handleOpenStudio } = useScannerContext();

  return (
    <div className="flex flex-col w-full text-neutral-900 dark:text-on-surface">
      {/* CONTROLES SUPERIORES & HERO */}
      <section className="flex flex-col gap-space-md mb-space-lg">
        <ScannerHeader />
        <ScannerSearchBar />
      </section>

      {/* FEED DE VÍDEOS E FILTROS*/}
      <ScannerVideoFeed />

      {/* DOCK FLUTUANTE DE LOTE (BatchDock) */}
      <ScannerBatchDock
        onDownloadSelected={() =>
          handleDownloadSelected(() => navigate("historico"))
        }
        onOpenStudio={() =>
          handleOpenStudio((params) => navigate("studio", params))
        }
      />
    </div>
  );
};

export const ScraperPage: React.FC = () => {
  const { navigate } = useNavigation();

  return (
    <ScannerProvider>
      <AppShell currentPath="varredura" onNavigate={(path) => navigate(path)}>
        <ScraperPageContent />
      </AppShell>
    </ScannerProvider>
  );
};
