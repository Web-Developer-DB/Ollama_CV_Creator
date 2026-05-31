import type {
  AnalyzeJobRequest,
  AnalyzeJobResponse,
  ApiResponse,
  ExtractProfileRequest,
  ExtractProfileResponse,
  GenerateCoverLetterRequest,
  GenerateCoverLetterResponse,
  GenerateCVRequest,
  GenerateCVResponse,
  ModelControlRequest,
  ModelControlResponse,
  OllamaStatus,
  ProjectJsonExportResult,
  ProjectJsonImportRequest,
  ProjectJsonImportResult,
  ProjectStorageLocation
} from "./api";
import type { ApplicationProject } from "./project";

export type DesktopRuntimeInfo = {
  platform: NodeJS.Platform;
  isElectron: true;
};

export type DesktopApi = {
  runtime: DesktopRuntimeInfo;
  ai: {
    status: (request?: { model?: string }) => Promise<ApiResponse<OllamaStatus>>;
    modelControl: (
      request: ModelControlRequest
    ) => Promise<ApiResponse<ModelControlResponse>>;
    extractProfile: (
      request: ExtractProfileRequest
    ) => Promise<ExtractProfileResponse>;
    analyzeJob: (request: AnalyzeJobRequest) => Promise<AnalyzeJobResponse>;
    generateCv: (request: GenerateCVRequest) => Promise<GenerateCVResponse>;
    generateCoverLetter: (
      request: GenerateCoverLetterRequest
    ) => Promise<GenerateCoverLetterResponse>;
  };
  storage: {
    listProjects: () => Promise<ApiResponse<ApplicationProject[]>>;
    saveProject: (
      project: ApplicationProject
    ) => Promise<ApiResponse<ApplicationProject>>;
    deleteProject: (id: string) => Promise<ApiResponse<void>>;
    getLocation: () => Promise<ApiResponse<ProjectStorageLocation>>;
    exportProjectsJson: (
      filePath: string
    ) => Promise<ApiResponse<ProjectJsonExportResult>>;
    importProjectsJson: (
      request: ProjectJsonImportRequest
    ) => Promise<ApiResponse<ProjectJsonImportResult>>;
  };
};

declare global {
  interface Window {
    desktopApi?: DesktopApi;
  }
}

export {};
