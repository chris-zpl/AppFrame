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

