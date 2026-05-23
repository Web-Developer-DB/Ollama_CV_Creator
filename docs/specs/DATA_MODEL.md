# DATA_MODEL.md

## ApplicationProject

```ts
type ApplicationProject = {
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
```

## ProjectStatus

```ts
type ProjectStatus =
  | "draft"
  | "text_imported"
  | "profile_extracted"
  | "profile_reviewed"
  | "job_imported"
  | "job_analyzed"
  | "documents_generated"
  | "template_selected"
  | "export_ready";
```

## RawInput

```ts
type RawInput = {
  id: string;
  sourceType: "manual_text" | "old_cv" | "linkedin_text" | "project_notes";
  text: string;
  language?: "de" | "en";
  createdAt: string;
};
```

## CandidateProfile

```ts
type CandidateProfile = {
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
```

## PersonalInfo

```ts
type PersonalInfo = {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
};
```

## WorkExperience

```ts
type WorkExperience = {
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
```

## Education

```ts
type Education = {
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
```

## SkillSet

```ts
type SkillSet = {
  technical: string[];
  soft: string[];
  tools: string[];
  languages: string[];
  methods: string[];
};
```

## JobTarget

```ts
type JobTarget = {
  id: string;
  title?: string;
  company?: string;
  location?: string;
  jobDescription: string;
  language: "de" | "en";
  tone: "professional" | "modern" | "conservative" | "confident";
};
```

## JobAnalysis

```ts
type JobAnalysis = {
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
```

## GeneratedDocuments

```ts
type GeneratedDocuments = {
  cv?: GeneratedCV;
  coverLetter?: GeneratedCoverLetter;
};
```

## DesignSettings

```ts
type DesignSettings = {
  template: "modern" | "classic" | "minimal";
  accentColor?: string;
  fontFamily?: "inter" | "serif" | "system";
  density?: "compact" | "comfortable";
  showPhoto?: boolean;
};
```
