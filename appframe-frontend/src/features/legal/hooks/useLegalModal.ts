import { useState, useCallback } from 'react';
import type { LegalDocType } from '../interfaces';

export const useLegalModal = (defaultDoc: LegalDocType = 'terms') => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<LegalDocType>(defaultDoc);

  const open = useCallback((doc?: LegalDocType) => {
    if (doc) setActiveDoc(doc);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openTerms = useCallback(() => {
    setActiveDoc('terms');
    setIsOpen(true);
  }, []);

  const openPrivacy = useCallback(() => {
    setActiveDoc('privacy');
    setIsOpen(true);
  }, []);

  const toggleDoc = useCallback(() => {
    setActiveDoc((prev) => (prev === 'terms' ? 'privacy' : 'terms'));
  }, []);

  return {
    isOpen,
    activeDoc,
    setActiveDoc,
    open,
    close,
    openTerms,
    openPrivacy,
    toggleDoc,
  };
};
