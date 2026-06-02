import { z } from "zod";
import { buildGenerateCVPrompt } from "@/lib/ai/prompts/generate-cv";
import {
  generateOllamaJson,
  OllamaClientError
} from "@/lib/ai/ollama-client";
import {
  hasCandidateFacts
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
    ...buildGenerateCVPrompt(request),
    ...(request.runtime?.contextWindow
      ? { numCtx: request.runtime.contextWindow }
      : {})
  };

  try {
    const aiCV = await generateOllamaJson<unknown>(
      prompt,
      createOllamaOptions(request.model, request.runtime)
    );

    const parsedCV = parseLlmDocumentOutput({
      value: aiCV,
      schema: generatedCVSchema,
      normalize: (value) => normalizeGeneratedCV(value, request),
      schemaErrorMessage: "AI response did not match the generated CV schema"
    });

    if (!parsedCV.success) {
      return parsedCV.response;
    }

    const semanticFactValidation = validateGeneratedCvFacts(
      parsedCV.data,
      request.candidateProfile
    );

    if (hasSemanticFactErrors(semanticFactValidation)) {
      return createErrorResponse(
        "HALLUCINATION_DETECTED",
        formatSemanticFactErrorMessage(semanticFactValidation),
        semanticFactValidation
      );
    }

    const cvWithWarnings = attachDocumentWarnings(
      parsedCV.data,
      collectMissingDataWarnings(
        request.candidateProfile,
        "cv",
        request.jobTarget
      )
    );

    return createSuccessResponse(cvWithWarnings);
  } catch (error) {
    if (error instanceof OllamaClientError) {
      return createErrorResponse(error.code, error.message);
    }

    return createErrorResponse("OLLAMA_UNAVAILABLE", "AI request failed");
  }
};
