import type { GeneratedDocuments, ExportRecord } from "./documents";
import type { JobAnalysis, JobTarget } from "./job";
import type { CandidateProfile } from "./profile";
import type { DesignSettings } from "./templates";

export type ProjectStatus =
  | "draft"
  | "text_imported"
  | "profile_extracted"
  | "profile_reviewed"
  | "job_imported"
  | "job_analyzed"
  | "documents_generated"
  | "template_selected"
  | "export_ready";

export type RawInputSourceType =
  | "manual_text"
  | "old_cv"
  | "linkedin_text"
  | "project_notes";

export type RawInput = {
  id: string;
  sourceType: RawInputSourceType;
  text: string;
  language?: "de" | "en";
  createdAt: string;
};

export type ApplicationProject = {
  id: string;
  title: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  rawInput?: RawInput;
  candidateProfile?: CandidateProfile;
  jobTarget?: JobTarget;
  jobAnalysis?: JobAnalysis;
  generatedDocuments?: GeneratedDocuments;
  designSettings?: DesignSettings;
  exportHistory?: ExportRecord[];
};
