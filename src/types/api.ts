import type {
  GeneratedCoverLetter,
  GeneratedCV
} from "./documents";
import type { JobAnalysis, JobTarget } from "./job";
import type { CandidateProfile } from "./profile";
import type { TemplateStyle } from "./templates";

export type ApiErrorCode =
  | "INVALID_INPUT"
  | "OLLAMA_UNAVAILABLE"
  | "AI_MODEL_NOT_READY"
  | "AI_TIMEOUT"
  | "INVALID_AI_JSON"
  | "SCHEMA_VALIDATION_FAILED"
  | "BUSINESS_RULE_FAILED"
  | "HALLUCINATION_DETECTED"
  | "EXPORT_FAILED";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: ApiError;
};

export type ExtractProfileRequest = {
  text: string;
  language: "de" | "en";
  model?: string;
};

export type ExtractProfileResponse = ApiResponse<CandidateProfile>;

export type AnalyzeJobRequest = {
  jobDescription: string;
  language: "de" | "en";
  model?: string;
};

export type AnalyzeJobResponse = ApiResponse<JobAnalysis>;

export type GenerateCVRequest = {
  candidateProfile: CandidateProfile;
  jobTarget: JobTarget;
  jobAnalysis: JobAnalysis;
  model?: string;
  options: {
    language: "de" | "en";
    length: "one_page";
    style: TemplateStyle;
  };
};

export type GenerateCVResponse = ApiResponse<GeneratedCV>;

export type GenerateCoverLetterRequest = {
  candidateProfile: CandidateProfile;
  jobTarget: JobTarget;
  jobAnalysis: JobAnalysis;
  model?: string;
  options: {
    language: "de" | "en";
    tone: JobTarget["tone"];
  };
};

export type GenerateCoverLetterResponse = ApiResponse<GeneratedCoverLetter>;

export type AtsFeedback = {
  score?: number;
  missingKeywords: string[];
  formattingWarnings: string[];
  recommendations: string[];
};

export type CheckAtsRequest = {
  cv: GeneratedCV;
  jobAnalysis: JobAnalysis;
};

export type CheckAtsResponse = ApiResponse<AtsFeedback>;

export type PdfExportRequest = {
  documentType: "cv" | "cover_letter";
  template: TemplateStyle;
  theme: Record<string, unknown>;
  content: GeneratedCV | GeneratedCoverLetter;
};

export type OllamaModelStatus = {
  name: string;
  size?: number;
  digest?: string;
  modifiedAt?: string;
  parameterSize?: string;
  quantizationLevel?: string;
  loaded: boolean;
};

export type OllamaLoadedModelStatus = {
  name: string;
  size?: number;
  sizeVram?: number;
  digest?: string;
  expiresAt?: string;
  parameterSize?: string;
  quantizationLevel?: string;
};

export type OllamaStatus = {
  baseUrl: string;
  configuredModel: string;
  reachable: boolean;
  selectedModelAvailable: boolean;
  selectedModelLoaded: boolean;
  checkedAt: string;
  models: OllamaModelStatus[];
  loadedModels: OllamaLoadedModelStatus[];
  error?: string;
};

export type ModelControlAction = "load" | "unload";

export type ModelControlRequest = {
  action: ModelControlAction;
  model: string;
};

export type ModelControlResponse = {
  action: ModelControlAction;
  model: string;
};
