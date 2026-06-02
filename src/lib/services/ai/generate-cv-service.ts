// Framework-independent service for CV generation. It normalizes LLM output,
// validates semantic facts, adds missing-data warnings, and returns typed data.
import { z } from "zod";
import { buildGenerateCVPrompt } from "@/lib/ai/prompts/generate-cv";
import {
  generateOllamaJson,
  OllamaClientError
} from "@/lib/ai/ollama-client";
import {
  hasCandidateFacts,
  hasText
} from "@/lib/services/ai/candidate-facts";
import {
  isRecord,
  normalizeGeneratedId,
  parseLlmDocumentOutput,
  readDateRange,
  readRecordValue,
  readString,
  readStringArray
} from "@/lib/services/ai/llm-document-pipeline";
import {
  attachDocumentWarnings,
  collectMissingDataWarnings,
  formatSemanticFactErrorMessage,
  hasSemanticFactErrors,
  validateGeneratedCvFacts
} from "@/lib/services/ai/semantic-fact-validation";
import {
  createErrorResponse,
  createSuccessResponse
} from "@/lib/services/api-response";
import { resolveContextWindow } from "@/lib/services/ai/context-window";
import {
  candidateProfileSchema,
  generatedCVSchema,
  jobAnalysisSchema,
  jobTargetSchema,
  templateStyleSchema
} from "@/lib/validation/schemas";
import type {
  AiRuntimeOptions,
  ApiResponse,
  GenerateCVRequest
} from "@/types/api";
import type {
  CVContact,
  CVSection,
  CVSectionType,
  DocumentSectionItem,
  GeneratedCV
} from "@/types/documents";

const generateCVRequestSchema = z.object({
  candidateProfile: candidateProfileSchema,
  jobTarget: jobTargetSchema.optional(),
  jobAnalysis: jobAnalysisSchema.optional(),
  model: z.string().trim().min(1).optional(),
  runtime: z
    .object({
      contextWindow: z.number().int().positive().optional(),
      timeoutMs: z.number().int().positive().optional()
    })
    .optional(),
  options: z.object({
    language: z.enum(["de", "en"]),
    length: z.literal("one_page"),
    style: templateStyleSchema
  })
});

const createOllamaOptions = (
  model: string | undefined,
  runtime: AiRuntimeOptions | undefined
) => ({
  ...(model ? { model } : {}),
  ...(runtime?.timeoutMs ? { timeoutMs: runtime.timeoutMs } : {})
});

const cvSectionTypes: CVSectionType[] = [
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "languages",
  "certificates",
  "custom"
];

const normalizeSectionType = (
  value: unknown,
  title: string | undefined,
  fallback: CVSectionType
): CVSectionType => {
  const rawType = readString(value)?.toLowerCase().replace(/[^a-z]+/g, "_");

  if (rawType && cvSectionTypes.includes(rawType as CVSectionType)) {
    return rawType as CVSectionType;
  }

  const typeSource = `${rawType ?? ""} ${title ?? ""}`.toLowerCase();

  if (/work|experience|employment|career/.test(typeSource)) {
    return "experience";
  }

  if (/education|degree|school|university|training/.test(typeSource)) {
    return "education";
  }

  if (/skill|technology|technologies|tools/.test(typeSource)) {
    return "skills";
  }

  if (/project/.test(typeSource)) {
    return "projects";
  }

  if (/language/.test(typeSource)) {
    return "languages";
  }

  if (/certificate|certification/.test(typeSource)) {
    return "certificates";
  }

  if (/summary|profile|objective/.test(typeSource)) {
    return "summary";
  }

  return fallback;
};

const defaultSectionTitle = (type: CVSectionType): string => {
  switch (type) {
    case "summary":
      return "Profile";
    case "experience":
      return "Experience";
    case "education":
      return "Education";
    case "skills":
      return "Skills";
    case "projects":
      return "Projects";
    case "languages":
      return "Languages";
    case "certificates":
      return "Certificates";
    case "custom":
      return "Details";
  }
};

const normalizeSectionItem = (
  value: unknown,
  index: number,
  sectionType: CVSectionType
): DocumentSectionItem | undefined => {
  if (typeof value === "string") {
    return {
      id: `item-${sectionType}-${index + 1}`,
      body: sectionType === "skills" ? undefined : value,
      bullets: sectionType === "skills" ? [value] : []
    };
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const bullets = [
    ...readStringArray(readRecordValue(value, ["bullets", "points"])),
    ...readStringArray(
      readRecordValue(value, [
        "responsibilities",
        "achievements",
        "tasks",
        "duties"
      ])
    )
  ];
  const title = readString(
    readRecordValue(value, [
      "title",
      "role",
      "position",
      "degree",
      "name",
      "language"
    ])
  );
  const subtitle = readString(
    readRecordValue(value, [
      "subtitle",
      "company",
      "employer",
      "organization",
      "institution",
      "issuer"
    ])
  );
  const body =
    readString(
      readRecordValue(value, [
        "body",
        "content",
        "text",
        "description",
        "summary"
      ])
    ) ??
    (readStringArray(readRecordValue(value, ["details"])).join("\n") ||
      undefined) ??
    undefined;

  if (!title && !subtitle && !body && bullets.length === 0) {
    return undefined;
  }

  return {
    id: normalizeGeneratedId(`item-${sectionType}-${index + 1}`, value.id),
    title,
    subtitle,
    dateRange: readDateRange(value),
    body,
    bullets
  };
};

const skillCategoryConfigs = [
  {
    keys: ["technical", "technicalSkills", "technical_skills"],
    title: "Technical skills"
  },
  { keys: ["soft", "softSkills", "soft_skills"], title: "Soft skills" },
  { keys: ["tools"], title: "Tools" },
  { keys: ["methods"], title: "Methods" },
  { keys: ["languages"], title: "Languages" }
];

const readSkillCategoryItems = (
  value: Record<string, unknown>
): DocumentSectionItem[] =>
  skillCategoryConfigs
    .flatMap((config, index) => {
      const skills = readStringArray(readRecordValue(value, config.keys));

      return skills.length > 0
        ? [
            {
              id: `item-skills-${index + 1}`,
              title: config.title,
              bullets: [skills.join(", ")]
            }
          ]
        : [];
    });

const readSectionItems = (
  value: Record<string, unknown>,
  sectionType: CVSectionType
): DocumentSectionItem[] => {
  const directItems = readRecordValue(value, [
    "items",
    "entries",
    "roles",
    "jobs",
    "list"
  ]);

  if (sectionType === "skills" && !Array.isArray(directItems)) {
    const skillCategoryItems = readSkillCategoryItems(value);

    if (skillCategoryItems.length > 0) {
      return skillCategoryItems;
    }
  }

  const rawItems = Array.isArray(directItems)
    ? directItems
    : ["body", "description", "summary", "bullets", "responsibilities"].some(
          (key) => value[key] !== undefined
        )
      ? [value]
      : [];

  return rawItems
    .map((item, index) => normalizeSectionItem(item, index, sectionType))
    .filter((item): item is DocumentSectionItem => Boolean(item));
};

const normalizeSection = (
  value: unknown,
  index: number,
  fallbackType: CVSectionType,
  fallbackTitle?: string
): CVSection | undefined => {
  if (typeof value === "string" || Array.isArray(value)) {
    const sectionType = fallbackType;
    const rawItems = Array.isArray(value) ? value : [value];
    const items = rawItems
      .map((item, itemIndex) =>
        normalizeSectionItem(item, itemIndex, sectionType)
      )
      .filter((item): item is DocumentSectionItem => Boolean(item));

    return items.length > 0
      ? {
          id: `section-${sectionType}-${index + 1}`,
          type: sectionType,
          title: fallbackTitle ?? defaultSectionTitle(sectionType),
          items
        }
      : undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const title =
    readString(
      readRecordValue(value, [
        "title",
        "sectionTitle",
        "section_title",
        "heading",
        "name"
      ])
    ) ?? fallbackTitle;
  const sectionType = normalizeSectionType(
    readRecordValue(value, ["type", "sectionType", "section_type", "kind"]),
    title,
    fallbackType
  );
  const items = readSectionItems(value, sectionType);

  return items.length > 0
    ? {
        id: normalizeGeneratedId(
          `section-${sectionType}-${index + 1}`,
          value.id
        ),
        type: sectionType,
        title: title ?? defaultSectionTitle(sectionType),
        items
      }
    : undefined;
};

const topLevelSectionConfigs: Array<{
  keys: string[];
  title: string;
  type: CVSectionType;
}> = [
  { keys: ["summary", "profile"], title: "Profile", type: "summary" },
  {
    keys: [
      "experience",
      "experiences",
      "workExperience",
      "work_experience",
      "workHistory",
      "work_history",
      "employment"
    ],
    title: "Experience",
    type: "experience"
  },
  {
    keys: ["education", "educationHistory", "education_history", "studies"],
    title: "Education",
    type: "education"
  },
  { keys: ["skills"], title: "Skills", type: "skills" },
  { keys: ["projects"], title: "Projects", type: "projects" },
  { keys: ["languages"], title: "Languages", type: "languages" },
  {
    keys: ["certificates", "certifications"],
    title: "Certificates",
    type: "certificates"
  }
];

const unwrapGeneratedCV = (value: unknown): unknown => {
  if (!isRecord(value)) {
    return value;
  }

  const wrapped = readRecordValue(value, [
    "cv",
    "resume",
    "curriculumVitae",
    "curriculum_vitae",
    "generatedCV",
    "generatedCv",
    "generated_cv",
    "document",
    "data"
  ]);

  return isRecord(wrapped) ? wrapped : value;
};

const collectSections = (value: Record<string, unknown>): CVSection[] => {
  if (Array.isArray(value.sections)) {
    return value.sections
      .map((section, index) => normalizeSection(section, index, "custom"))
      .filter((section): section is CVSection => Boolean(section));
  }

  return topLevelSectionConfigs
    .flatMap((config, index) => {
      const sectionValue = readRecordValue(value, config.keys);

      return sectionValue === undefined
        ? []
        : [
            normalizeSection(
              sectionValue,
              index,
              config.type,
              config.title
            )
          ];
    })
    .filter((section): section is CVSection => Boolean(section));
};

const normalizeGeneratedCV = (
  value: unknown,
  request: GenerateCVRequest
): GeneratedCV | undefined => {
  const root = unwrapGeneratedCV(value);

  if (!isRecord(root)) {
    return undefined;
  }

  const sections = collectSections(root);

  if (sections.length === 0) {
    return undefined;
  }

  const meta = isRecord(root.meta) ? root.meta : {};
  const generatedAt = readString(
    readRecordValue(meta, ["generatedAt", "generated_at"])
  );

  return {
    id: normalizeGeneratedId("generated-cv", root.id),
    title: readString(root.title),
    language:
      readString(root.language) === "en" || readString(root.language) === "de"
        ? (readString(root.language) as "en" | "de")
        : request.options.language,
    contact: createCvContact(request.candidateProfile),
    summary: readString(root.summary),
    sections,
    meta: {
      generatedAt:
        generatedAt && !Number.isNaN(Date.parse(generatedAt))
          ? generatedAt
          : new Date().toISOString(),
      model: readString(meta.model),
      sourceProjectId: readString(meta.sourceProjectId),
      warnings: readStringArray(meta.warnings)
    }
  };
};

const createCvContact = (
  profile: GenerateCVRequest["candidateProfile"]
): CVContact | undefined => {
  const contact: CVContact = {
    email: profile.personalInfo.email,
    phone: profile.personalInfo.phone,
    location: profile.personalInfo.location,
    website: profile.personalInfo.website,
    linkedin: profile.personalInfo.linkedin,
    github: profile.personalInfo.github,
    portfolio: profile.personalInfo.portfolio
  };

  return Object.values(contact).some(hasText) ? contact : undefined;
};

const attachProfileContact = (
  cv: GeneratedCV,
  request: GenerateCVRequest
): GeneratedCV => ({
  ...cv,
  contact: createCvContact(request.candidateProfile)
});

const createDateRange = (
  startDate: string | undefined,
  endDate: string | undefined
): string | undefined => [startDate, endDate].filter(hasText).join(" - ") || undefined;

const createFallbackSection = (
  type: CVSectionType,
  title: string,
  items: DocumentSectionItem[]
): CVSection | undefined =>
  items.length > 0
    ? {
        id: `section-${type}`,
        type,
        title,
        items
      }
    : undefined;

const createFallbackGeneratedCV = (
  request: GenerateCVRequest,
  warnings: string[]
): GeneratedCV => {
  const profile = request.candidateProfile;
  const language = request.options.language;
  const summaryItems: DocumentSectionItem[] = profile.summary
    ? [
        {
          id: "item-summary-1",
          body: profile.summary,
          bullets: []
        }
      ]
    : [];
  const sections = [
    createFallbackSection(
      "summary",
      language === "de" ? "Profil" : "Profile",
      summaryItems
    ),
    createFallbackSection(
      "experience",
      language === "de" ? "Berufserfahrung" : "Experience",
      profile.experiences.map((experience, index) => ({
        id: `item-experience-${index + 1}`,
        title: experience.role,
        subtitle: experience.company,
        dateRange: createDateRange(experience.startDate, experience.endDate),
        body: experience.description,
        bullets: [
          ...experience.responsibilities,
          ...experience.achievements,
          ...(experience.technologies && experience.technologies.length > 0
            ? [
                `${language === "de" ? "Technologien" : "Technologies"}: ${experience.technologies.join(", ")}`
              ]
            : [])
        ].slice(0, 7)
      }))
    ),
    createFallbackSection(
      "skills",
      language === "de" ? "Fähigkeiten" : "Skills",
      [
        { title: "Technical skills", values: profile.skills.technical },
        { title: "Soft skills", values: profile.skills.soft },
        { title: "Tools", values: profile.skills.tools },
        { title: "Methods", values: profile.skills.methods },
        { title: "Languages", values: profile.skills.languages }
      ].flatMap((category, index) =>
        category.values.length > 0
          ? [
              {
                id: `item-skills-${index + 1}`,
                title: category.title,
                bullets: [category.values.join(", ")]
              }
            ]
          : []
      )
    ),
    createFallbackSection(
      "projects",
      language === "de" ? "Projekte" : "Projects",
      profile.projects.map((project, index) => ({
        id: `item-project-${index + 1}`,
        title: project.name,
        subtitle: project.role,
        dateRange: createDateRange(project.startDate, project.endDate),
        body: project.description,
        bullets: [
          ...project.highlights,
          ...(project.technologies && project.technologies.length > 0
            ? [
                `${language === "de" ? "Technologien" : "Technologies"}: ${project.technologies.join(", ")}`
              ]
            : [])
        ]
      }))
    ),
    createFallbackSection(
      "education",
      language === "de" ? "Ausbildung" : "Education",
      profile.education.map((education, index) => ({
        id: `item-education-${index + 1}`,
        title: [education.degree, education.field].filter(hasText).join(" "),
        subtitle: education.institution,
        dateRange: createDateRange(education.startDate, education.endDate),
        body: education.location,
        bullets: education.details ?? []
      }))
    ),
    createFallbackSection(
      "certificates",
      language === "de" ? "Zertifikate" : "Certificates",
      profile.certificates.map((certificate, index) => ({
        id: `item-certificate-${index + 1}`,
        title: certificate.name,
        subtitle: certificate.issuer,
        dateRange: createDateRange(
          certificate.issueDate,
          certificate.expirationDate
        ),
        bullets: []
      }))
    ),
    createFallbackSection(
      "languages",
      language === "de" ? "Sprachen" : "Languages",
      profile.languages.map((profileLanguage, index) => ({
        id: `item-language-${index + 1}`,
        title: profileLanguage.language,
        subtitle: profileLanguage.proficiency,
        body: profileLanguage.details,
        bullets: []
      }))
    )
  ].filter((section): section is CVSection => Boolean(section));

  return {
    id: "generated-cv-fallback",
    title: profile.personalInfo.fullName
      ? `${profile.personalInfo.fullName} CV`
      : language === "de"
        ? "Lebenslauf"
        : "Curriculum Vitae",
    language,
    contact: createCvContact(profile),
    summary: profile.summary,
    sections,
    meta: {
      generatedAt: new Date().toISOString(),
      model: request.model,
      warnings
    }
  };
};

const createFallbackCvResponse = (
  request: GenerateCVRequest,
  warnings: string[]
): ApiResponse<GeneratedCV> =>
  createSuccessResponse(
    attachDocumentWarnings(
      createFallbackGeneratedCV(request, warnings),
      collectMissingDataWarnings(request.candidateProfile, "cv", request.jobTarget)
    )
  );

export const generateCv = async (
  input: unknown
): Promise<ApiResponse<GeneratedCV>> => {
  const parsedRequest = generateCVRequestSchema.safeParse(input);
  if (!parsedRequest.success) {
    return createErrorResponse(
      "INVALID_INPUT",
      "Candidate profile and CV options are required"
    );
  }

  const request: GenerateCVRequest = parsedRequest.data;

  if (!hasCandidateFacts(request.candidateProfile)) {
    return createErrorResponse(
      "BUSINESS_RULE_FAILED",
      "Candidate profile must contain usable facts"
    );
  }

  const prompt = {
    ...buildGenerateCVPrompt(request)
  };
  const runtimePrompt = {
    ...prompt,
    numCtx: resolveContextWindow({
      texts: [prompt.system, prompt.prompt],
      runtime: request.runtime,
      minimum: 8192,
      expectedOutputTokens: 3072,
      overheadTokens: 1024
    })
  };

  try {
    const aiCV = await generateOllamaJson<unknown>(
      runtimePrompt,
      createOllamaOptions(request.model, request.runtime)
    );

    // Accept exact schema output first, then recover common LLM aliases before
    // treating the response as invalid. This keeps cloud/local models usable.
    const parsedCV = parseLlmDocumentOutput({
      value: aiCV,
      schema: generatedCVSchema,
      normalize: (value) => normalizeGeneratedCV(value, request),
      schemaErrorMessage: "AI response did not match the generated CV schema"
    });

    if (!parsedCV.success) {
      return createFallbackCvResponse(request, [
        "Das KI-Ergebnis hatte kein gültiges CV-Schema. Die App hat einen belegten Entwurf direkt aus dem Profil erstellt."
      ]);
    }
    const cvWithProfileContact = attachProfileContact(parsedCV.data, request);

    // Block only unsupported generated facts. Missing source data becomes a
    // warning below so users can still edit a useful draft.
    const semanticFactValidation = validateGeneratedCvFacts(
      cvWithProfileContact,
      request.candidateProfile
    );

    if (hasSemanticFactErrors(semanticFactValidation)) {
      return createFallbackCvResponse(request, [
        formatSemanticFactErrorMessage(semanticFactValidation),
        "Die KI-Antwort wurde verworfen. Die App hat einen belegten Entwurf direkt aus dem Profil erstellt."
      ]);
    }

    // Warnings travel with the generated document and are displayed in the
    // Documents screen without turning the draft into a failed generation.
    const cvWithWarnings = attachDocumentWarnings(
      cvWithProfileContact,
      collectMissingDataWarnings(
        request.candidateProfile,
        "cv",
        request.jobTarget
      )
    );

    return createSuccessResponse(cvWithWarnings);
  } catch (error) {
    if (error instanceof OllamaClientError) {
      if (error.code === "INVALID_AI_JSON" || error.code === "AI_TIMEOUT") {
        return createFallbackCvResponse(request, [
          error.code === "AI_TIMEOUT"
            ? "Die KI-Anfrage hat zu lange gedauert. Die App hat einen belegten Entwurf direkt aus dem Profil erstellt."
            : "Die KI hat kein gültiges JSON erzeugt. Die App hat einen belegten Entwurf direkt aus dem Profil erstellt."
        ]);
      }

      return createErrorResponse(error.code, error.message);
    }

    return createErrorResponse("OLLAMA_UNAVAILABLE", "AI request failed");
  }
};
