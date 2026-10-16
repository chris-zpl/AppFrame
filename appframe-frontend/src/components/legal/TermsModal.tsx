import React from 'react';
import { LegalModal } from './LegalModal';

export interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  return <LegalModal isOpen={isOpen} onClose={onClose} initialDoc="terms" />;
};
