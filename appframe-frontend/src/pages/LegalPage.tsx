import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LegalModal } from '../features/legal';
import { AppFrameLogo } from '../components/common/AppFrameLogo';
import { Button } from '../components/ui/Button';

export const LegalPage: React.FC<{ defaultDoc?: 'terms' | 'privacy' }> = ({ defaultDoc }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const docType = defaultDoc || (location.pathname.includes('privacy') ? 'privacy' : 'terms');
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen w-full bg-surface flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <AppFrameLogo size="md" onClick={() => navigate('/login')} />
        <p className="text-on-surface-variant text-body-sm">Documento Legal • AppFrame</p>
        {!isOpen && (
          <Button variant="primary" size="sm" onClick={() => setIsOpen(true)}>
            Abrir Documento
          </Button>
        )}
      </div>

      <LegalModal
        isOpen={isOpen}
        onClose={handleClose}
        initialDoc={docType}
      />
    </div>
  );
};
