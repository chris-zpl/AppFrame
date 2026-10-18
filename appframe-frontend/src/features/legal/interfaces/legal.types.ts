export type LegalDocType = 'terms' | 'privacy';

export interface LegalDocumentItem {
  raw: string;
  rendered: string;
  updatedAt: string;
}

export interface LegalVariables {
  publishDate: string;
  companyName: string;
  contactEmail: string;
  dpoEmail: string;
  websiteUrl: string;
  forumCity: string;
  retentionPeriod: string;
}

export interface LegalDocumentsResponse {
  terms: LegalDocumentItem;
  privacy: LegalDocumentItem;
  variables: LegalVariables;
}

export interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDoc?: LegalDocType;
}

export interface LegalTabSwitcherProps {
  activeDoc: LegalDocType;
  onSelectDoc: (doc: LegalDocType) => void;
  className?: string;
}

export interface LegalModalHeaderProps {
  activeDoc: LegalDocType;
  onSelectDoc: (doc: LegalDocType) => void;
  onClose: () => void;
  updatedAt?: string;
}

export interface LegalModalContentProps {
  isLoading: boolean;
  parsedHtml: string;
}

export interface LegalModalFooterProps {
  onClose: () => void;
}
