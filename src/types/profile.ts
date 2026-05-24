export type PersonalInfo = {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
};

export type WorkExperience = {
  id: string;
  company?: string;
  role?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  responsibilities: string[];
  achievements: string[];
  technologies?: string[];
  confidence?: number;
};

export type Education = {
  id: string;
  institution?: string;
  degree?: string;
  field?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  details?: string[];
  confidence?: number;
};

export type SkillSet = {
  technical: string[];
  soft: string[];
  tools: string[];
  languages: string[];
  methods: string[];
};

export type CandidateProject = {
  id: string;
  name?: string;
  role?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  highlights: string[];
  technologies?: string[];
  confidence?: number;
};

export type LanguageProficiency =
  | "basic"
  | "intermediate"
  | "advanced"
  | "fluent"
  | "native";

export type LanguageSkill = {
  id: string;
  language: string;
  proficiency?: LanguageProficiency;
  details?: string;
  confidence?: number;
};

export type Certificate = {
  id: string;
  name?: string;
  issuer?: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  url?: string;
  confidence?: number;
};

export type ExtractionMeta = {
  language?: "de" | "en";
  extractedAt?: string;
  model?: string;
  confidence?: number;
  uncertainFields: string[];
  warnings?: string[];
};

export type CandidateProfile = {
  personalInfo: PersonalInfo;
  summary?: string;
  experiences: WorkExperience[];
  education: Education[];
  skills: SkillSet;
  projects: CandidateProject[];
  languages: LanguageSkill[];
  certificates: Certificate[];
  extractionMeta?: ExtractionMeta;
};
