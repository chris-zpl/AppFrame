import React from 'react';
import { LegalModal } from './LegalModal';

export interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  return <LegalModal isOpen={isOpen} onClose={onClose} initialDoc="privacy" />;
};
