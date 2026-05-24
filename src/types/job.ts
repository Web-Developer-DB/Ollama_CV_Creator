export type JobLanguage = "de" | "en";

export type JobTone =
  | "professional"
  | "modern"
  | "conservative"
  | "confident";

export type JobTarget = {
  id: string;
  title?: string;
  company?: string;
  location?: string;
  jobDescription: string;
  language: JobLanguage;
  tone: JobTone;
};

export type JobAnalysis = {
  requiredSkills: string[];
  optionalSkills: string[];
  responsibilities: string[];
  keywords: string[];
  softSkills: string[];
  matchScore?: number;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
};
