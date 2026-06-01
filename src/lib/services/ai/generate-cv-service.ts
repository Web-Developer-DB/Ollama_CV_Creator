import { z } from "zod";
import { buildGenerateCVPrompt } from "@/lib/ai/prompts/generate-cv";
import {
  generateOllamaJson,
  OllamaClientError
} from "@/lib/ai/ollama-client";
import {
  collectCandidateSkillEvidence,
  compactFacts,
  hasCandidateFacts,
  hasText,
  includesKnownFact,
  normalizeFact
} from "@/lib/services/ai/candidate-facts";
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
import type { CandidateProfile } from "@/types/profile";

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

const readRecordValue = (
  value: Record<string, unknown>,
  keys: string[]
): unknown => keys.map((key) => value[key]).find((item) => item !== undefined);

const readStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") {
          return [item];
        }

        if (isRecord(item)) {
          return [
            readString(
              readRecordValue(item, [
                "text",
                "content",
                "body",
                "description",
                "title",
                "name"
              ])
            )
          ];
        }

        return [];
      })
      .filter((item): item is string => Boolean(item));
  }

  const text = readString(value);

  return text
    ? text
        .split(/\n|•/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
};

const normalizeGeneratedId = (prefix: string, value: unknown): string =>
  readString(value) ?? prefix;

const readDateRange = (value: Record<string, unknown>): string | undefined => {
  const explicitDateRange = readString(
    readRecordValue(value, ["dateRange", "date_range", "period"])
  );

  if (explicitDateRange) {
    return explicitDateRange;
  }

  const startDate = readString(readRecordValue(value, ["startDate", "start"]));
  const endDate = readString(readRecordValue(value, ["endDate", "end"]));

  return [startDate, endDate].filter(Boolean).join(" - ") || undefined;
};

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
      readRecordValue(value, ["responsibilities", "achievements"])
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
    readRecordValue(value, ["subtitle", "company", "institution", "issuer"])
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
    keys: ["experience", "experiences", "workExperience", "work_experience"],
    title: "Experience",
    type: "experience"
  },
  { keys: ["education"], title: "Education", type: "education" },
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

  const wrapped = readRecordValue(value, ["cv", "generatedCV", "generatedCv"]);

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
      sourceProjectId: readString(meta.sourceProjectId)
    }
  };
};

const collectKnownExperienceFacts = (
  candidateProfile: CandidateProfile
): string[] =>
  compactFacts(
    candidateProfile.experiences.flatMap((experience) => [
      experience.company,
      experience.role,
      experience.location,
      experience.startDate,
      experience.endDate
    ])
  );

const hasAlphabeticText = (value: string): boolean => /[a-z]/i.test(value);

const hasUnknownEmployer = (
  generatedCV: GeneratedCV,
  candidateProfile: CandidateProfile
): boolean => {
  const knownExperienceFacts = collectKnownExperienceFacts(candidateProfile);

  return generatedCV.sections
    .filter((section) => section.type === "experience")
    .flatMap((section) => section.items)
    .some((item) => {
      if (!hasText(item.subtitle) || !hasAlphabeticText(item.subtitle ?? "")) {
        return false;
      }

      return !includesKnownFact(item.subtitle ?? "", knownExperienceFacts);
    });
};

const genericSkillLabels = new Set(
  compactFacts([
    "skills",
    "skill",
    "technical skills",
    "soft skills",
    "tools",
    "methods",
    "languages",
    "technologies",
    "technology stack",
    "fachliche faehigkeiten",
    "fachliche fähigkeiten",
    "technische faehigkeiten",
    "technische fähigkeiten",
    "werkzeuge",
    "methoden",
    "sprachen"
  ])
);

const isGenericSkillLabel = (value: string): boolean =>
  genericSkillLabels.has(normalizeFact(value));

const splitSkillText = (value: string): string[] =>
  value
    .split(/[,;\n•]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const collectGeneratedSkillValues = (item: DocumentSectionItem): string[] => [
  ...splitSkillText(item.body ?? ""),
  ...item.bullets.flatMap(splitSkillText)
];

const collectUnknownSkillValues = (
  generatedCV: GeneratedCV,
  candidateProfile: CandidateProfile
): string[] => {
  const knownSkills = collectCandidateSkillEvidence(candidateProfile);
  const generatedSkillValues = generatedCV.sections
    .filter((section) => section.type === "skills")
    .flatMap((section) => section.items)
    .flatMap(collectGeneratedSkillValues);

  if (generatedSkillValues.length === 0) {
    return [];
  }

  return Array.from(
    new Set(
      generatedSkillValues.filter(
        (skillValue) =>
          !isGenericSkillLabel(skillValue) &&
          !includesKnownFact(skillValue, knownSkills)
      )
    )
  );
};

const formatUnknownSkillMessage = (unknownSkills: string[]): string => {
  const preview = unknownSkills.slice(0, 5).join(", ");

  return preview
    ? `Generated CV contains a skill not present in the candidate profile: ${preview}`
    : "Generated CV contains a skill not present in the candidate profile";
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
    const directParsedCV = generatedCVSchema.safeParse(aiCV);
    const parsedCV = directParsedCV.success
      ? directParsedCV
      : generatedCVSchema.safeParse(normalizeGeneratedCV(aiCV, request));

    if (!parsedCV.success) {
      return createErrorResponse(
        "SCHEMA_VALIDATION_FAILED",
        "AI response did not match the generated CV schema"
      );
    }

    if (hasUnknownEmployer(parsedCV.data, request.candidateProfile)) {
      return createErrorResponse(
        "HALLUCINATION_DETECTED",
        "Generated CV contains an employer not present in the candidate profile"
      );
    }

    const unknownSkills = collectUnknownSkillValues(
      parsedCV.data,
      request.candidateProfile
    );

    if (unknownSkills.length > 0) {
      return createErrorResponse(
        "HALLUCINATION_DETECTED",
        formatUnknownSkillMessage(unknownSkills),
        { unknownSkills }
      );
    }

    return createSuccessResponse(parsedCV.data);
  } catch (error) {
    if (error instanceof OllamaClientError) {
      return createErrorResponse(error.code, error.message);
    }

    return createErrorResponse("OLLAMA_UNAVAILABLE", "AI request failed");
  }
};
