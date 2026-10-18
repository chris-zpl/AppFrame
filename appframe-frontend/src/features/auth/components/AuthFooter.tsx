import React from 'react';
import { LegalModal, useLegalModal } from '../../legal';

interface AuthFooterProps {
  showLegalLinks?: boolean;
}

export const AuthFooter: React.FC<AuthFooterProps> = ({
  showLegalLinks = true,
}) => {
  const { isOpen, activeDoc, openTerms, openPrivacy, close } = useLegalModal();

  return (
    <>
      <footer className="w-full text-center py-4 text-label-sm font-label-sm text-neutral-500 dark:text-[#949DAF] z-10 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <span>AppFrame © 2026 • Executive Video Intelligence</span>
        {showLegalLinks && (
          <>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={openTerms}
                className="hover:text-primary transition-colors cursor-pointer hover:underline"
              >
                Termos de Serviço
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={openPrivacy}
                className="hover:text-primary transition-colors cursor-pointer hover:underline"
              >
                Política de Privacidade
              </button>
            </div>
          </>
        )}
      </footer>

      {showLegalLinks && (
        <LegalModal
          isOpen={isOpen}
          onClose={close}
          initialDoc={activeDoc}
        />
      )}
    </>
  );
};
