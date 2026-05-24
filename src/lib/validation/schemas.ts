import { z } from "zod";
import type { ApiErrorCode } from "@/types/api";
import type {
  Certificate,
  CandidateProfile,
  CandidateProject,
  Education,
  ExtractionMeta,
  LanguageProficiency,
  LanguageSkill,
  PersonalInfo,
  SkillSet,
  WorkExperience
} from "@/types/profile";
import type { JobAnalysis, JobLanguage, JobTarget, JobTone } from "@/types/job";
import type {
  ApplicationProject,
  ProjectStatus,
  RawInput,
  RawInputSourceType
} from "@/types/project";
import type {
  DesignSettings,
  DocumentDensity,
  FontFamily,
  TemplateStyle
} from "@/types/templates";
import type {
  CoverLetterRecipient,
  CVSection,
  CVSectionType,
  DocumentLanguage,
  DocumentSectionItem,
  ExportDocumentType,
  ExportFormat,
  ExportRecord,
  GeneratedCoverLetter,
  GeneratedCV,
  GeneratedDocumentMeta,
  GeneratedDocuments
} from "@/types/documents";

const requiredString = z.string().min(1);
const optionalString = z.string().optional();
const timestampString = z.string().datetime();
const confidenceScore = z.number().min(0).max(1);
const percentageScore = z.number().min(0).max(100);

export const languageCodeSchema: z.ZodType<JobLanguage> = z.enum(["de", "en"]);

export const projectStatusSchema: z.ZodType<ProjectStatus> = z.enum([
  "draft",
  "text_imported",
  "profile_extracted",
  "profile_reviewed",
  "job_imported",
  "job_analyzed",
  "documents_generated",
  "template_selected",
  "export_ready"
]);

export const rawInputSourceTypeSchema: z.ZodType<RawInputSourceType> = z.enum([
  "manual_text",
  "old_cv",
  "linkedin_text",
  "project_notes"
]);

export const rawInputSchema: z.ZodType<RawInput> = z.object({
  id: requiredString,
  sourceType: rawInputSourceTypeSchema,
  text: requiredString,
  language: languageCodeSchema.optional(),
  createdAt: timestampString
});

export const personalInfoSchema: z.ZodType<PersonalInfo> = z.object({
  fullName: optionalString,
  email: z.string().email().optional(),
  phone: optionalString,
  location: optionalString,
  website: optionalString,
  linkedin: optionalString,
  github: optionalString,
  portfolio: optionalString
});

export const workExperienceSchema: z.ZodType<WorkExperience> = z.object({
  id: requiredString,
  company: optionalString,
  role: optionalString,
  location: optionalString,
  startDate: optionalString,
  endDate: optionalString,
  isCurrent: z.boolean().optional(),
  description: optionalString,
  responsibilities: z.array(z.string()),
  achievements: z.array(z.string()),
  technologies: z.array(z.string()).optional(),
  confidence: confidenceScore.optional()
});

export const educationSchema: z.ZodType<Education> = z.object({
  id: requiredString,
  institution: optionalString,
  degree: optionalString,
  field: optionalString,
  location: optionalString,
  startDate: optionalString,
  endDate: optionalString,
  details: z.array(z.string()).optional(),
  confidence: confidenceScore.optional()
});

export const skillSetSchema: z.ZodType<SkillSet> = z.object({
  technical: z.array(z.string()),
  soft: z.array(z.string()),
  tools: z.array(z.string()),
  languages: z.array(z.string()),
  methods: z.array(z.string())
});

export const candidateProjectSchema: z.ZodType<CandidateProject> = z.object({
  id: requiredString,
  name: optionalString,
  role: optionalString,
  description: optionalString,
  startDate: optionalString,
  endDate: optionalString,
  url: optionalString,
  highlights: z.array(z.string()),
  technologies: z.array(z.string()).optional(),
  confidence: confidenceScore.optional()
});

export const languageProficiencySchema: z.ZodType<LanguageProficiency> = z.enum([
  "basic",
  "intermediate",
  "advanced",
  "fluent",
  "native"
]);

export const languageSkillSchema: z.ZodType<LanguageSkill> = z.object({
  id: requiredString,
  language: requiredString,
  proficiency: languageProficiencySchema.optional(),
  details: optionalString,
  confidence: confidenceScore.optional()
});

export const certificateSchema: z.ZodType<Certificate> = z.object({
  id: requiredString,
  name: optionalString,
  issuer: optionalString,
  issueDate: optionalString,
  expirationDate: optionalString,
  credentialId: optionalString,
  url: optionalString,
  confidence: confidenceScore.optional()
});

export const extractionMetaSchema: z.ZodType<ExtractionMeta> = z.object({
  language: languageCodeSchema.optional(),
  extractedAt: timestampString.optional(),
  model: optionalString,
  confidence: confidenceScore.optional(),
  uncertainFields: z.array(z.string()),
  warnings: z.array(z.string()).optional()
});

export const candidateProfileSchema: z.ZodType<CandidateProfile> = z.object({
  personalInfo: personalInfoSchema,
  summary: optionalString,
  experiences: z.array(workExperienceSchema),
  education: z.array(educationSchema),
  skills: skillSetSchema,
  projects: z.array(candidateProjectSchema),
  languages: z.array(languageSkillSchema),
  certificates: z.array(certificateSchema),
  extractionMeta: extractionMetaSchema.optional()
});

export const jobToneSchema: z.ZodType<JobTone> = z.enum([
  "professional",
  "modern",
  "conservative",
  "confident"
]);

export const jobTargetSchema: z.ZodType<JobTarget> = z.object({
  id: requiredString,
  title: optionalString,
  company: optionalString,
  location: optionalString,
  jobDescription: requiredString,
  language: languageCodeSchema,
  tone: jobToneSchema
});

export const jobAnalysisSchema: z.ZodType<JobAnalysis> = z.object({
  requiredSkills: z.array(z.string()),
  optionalSkills: z.array(z.string()),
  responsibilities: z.array(z.string()),
  keywords: z.array(z.string()),
  softSkills: z.array(z.string()),
  matchScore: percentageScore.optional(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  recommendations: z.array(z.string())
});

export const templateStyleSchema: z.ZodType<TemplateStyle> = z.enum([
  "modern",
  "classic",
  "minimal"
]);

export const fontFamilySchema: z.ZodType<FontFamily> = z.enum([
  "inter",
  "serif",
  "system"
]);

export const documentDensitySchema: z.ZodType<DocumentDensity> = z.enum([
  "compact",
  "comfortable"
]);

export const designSettingsSchema: z.ZodType<DesignSettings> = z.object({
  template: templateStyleSchema,
  accentColor: optionalString,
  fontFamily: fontFamilySchema.optional(),
  density: documentDensitySchema.optional(),
  showPhoto: z.boolean().optional()
});

export const documentLanguageSchema: z.ZodType<DocumentLanguage> =
  languageCodeSchema;

export const generatedDocumentMetaSchema: z.ZodType<GeneratedDocumentMeta> =
  z.object({
    generatedAt: timestampString,
    model: optionalString,
    sourceProjectId: optionalString
  });

export const cvSectionTypeSchema: z.ZodType<CVSectionType> = z.enum([
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "languages",
  "certificates",
  "custom"
]);

export const documentSectionItemSchema: z.ZodType<DocumentSectionItem> =
  z.object({
    id: requiredString,
    title: optionalString,
    subtitle: optionalString,
    dateRange: optionalString,
    body: optionalString,
    bullets: z.array(z.string())
  });

export const cvSectionSchema: z.ZodType<CVSection> = z.object({
  id: requiredString,
  type: cvSectionTypeSchema,
  title: requiredString,
  items: z.array(documentSectionItemSchema)
});

export const generatedCVSchema: z.ZodType<GeneratedCV> = z.object({
  id: requiredString,
  title: optionalString,
  language: documentLanguageSchema,
  summary: optionalString,
  sections: z.array(cvSectionSchema),
  meta: generatedDocumentMetaSchema
});

export const coverLetterRecipientSchema: z.ZodType<CoverLetterRecipient> =
  z.object({
    company: optionalString,
    contactName: optionalString,
    addressLines: z.array(z.string()).optional()
  });

export const generatedCoverLetterSchema: z.ZodType<GeneratedCoverLetter> =
  z.object({
    id: requiredString,
    language: documentLanguageSchema,
    recipient: coverLetterRecipientSchema.optional(),
    subject: optionalString,
    greeting: optionalString,
    opening: requiredString,
    body: z.array(z.string()),
    closing: requiredString,
    signature: optionalString,
    meta: generatedDocumentMetaSchema
  });

export const generatedDocumentsSchema: z.ZodType<GeneratedDocuments> = z.object({
  cv: generatedCVSchema.optional(),
  coverLetter: generatedCoverLetterSchema.optional()
});

export const exportDocumentTypeSchema: z.ZodType<ExportDocumentType> = z.enum([
  "cv",
  "cover_letter",
  "project_json"
]);

export const exportFormatSchema: z.ZodType<ExportFormat> = z.enum([
  "pdf",
  "json"
]);

export const exportRecordSchema: z.ZodType<ExportRecord> = z.object({
  id: requiredString,
  documentType: exportDocumentTypeSchema,
  format: exportFormatSchema,
  createdAt: timestampString,
  template: templateStyleSchema.optional(),
  filename: optionalString
});

export const applicationProjectSchema: z.ZodType<ApplicationProject> = z.object({
  id: requiredString,
  title: requiredString,
  status: projectStatusSchema,
  createdAt: timestampString,
  updatedAt: timestampString,
  rawInput: rawInputSchema.optional(),
  candidateProfile: candidateProfileSchema.optional(),
  jobTarget: jobTargetSchema.optional(),
  jobAnalysis: jobAnalysisSchema.optional(),
  generatedDocuments: generatedDocumentsSchema.optional(),
  designSettings: designSettingsSchema.optional(),
  exportHistory: z.array(exportRecordSchema).optional()
});

export const apiErrorCodeSchema: z.ZodType<ApiErrorCode> = z.enum([
  "INVALID_INPUT",
  "OLLAMA_UNAVAILABLE",
  "AI_TIMEOUT",
  "INVALID_AI_JSON",
  "SCHEMA_VALIDATION_FAILED",
  "BUSINESS_RULE_FAILED",
  "HALLUCINATION_DETECTED",
  "EXPORT_FAILED"
]);
