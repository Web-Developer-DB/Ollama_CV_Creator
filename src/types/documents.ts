import type { TemplateStyle } from "./templates";

export type DocumentLanguage = "de" | "en";

export type GeneratedDocumentMeta = {
  generatedAt: string;
  model?: string;
  sourceProjectId?: string;
};

export type CVSectionType =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "languages"
  | "certificates"
  | "custom";

export type DocumentSectionItem = {
  id: string;
  title?: string;
  subtitle?: string;
  dateRange?: string;
  body?: string;
  bullets: string[];
};

export type CVSection = {
  id: string;
  type: CVSectionType;
  title: string;
  items: DocumentSectionItem[];
};

export type GeneratedCV = {
  id: string;
  title?: string;
  language: DocumentLanguage;
  summary?: string;
  sections: CVSection[];
  meta: GeneratedDocumentMeta;
};

export type CoverLetterRecipient = {
  company?: string;
  contactName?: string;
  addressLines?: string[];
};

export type GeneratedCoverLetter = {
  id: string;
  language: DocumentLanguage;
  recipient?: CoverLetterRecipient;
  subject?: string;
  greeting?: string;
  opening: string;
  body: string[];
  closing: string;
  signature?: string;
  meta: GeneratedDocumentMeta;
};

export type GeneratedDocuments = {
  cv?: GeneratedCV;
  coverLetter?: GeneratedCoverLetter;
};

export type ExportDocumentType = "cv" | "cover_letter" | "project_json";

export type ExportFormat = "pdf" | "json";

export type ExportRecord = {
  id: string;
  documentType: ExportDocumentType;
  format: ExportFormat;
  createdAt: string;
  template?: TemplateStyle;
  filename?: string;
};
