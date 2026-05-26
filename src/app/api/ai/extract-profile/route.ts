import { z } from "zod";
import { buildExtractProfilePrompt } from "@/lib/ai/prompts/extract-profile";
import {
  generateOllamaJson,
  OllamaClientError
} from "@/lib/ai/ollama-client";
import { candidateProfileSchema } from "@/lib/validation/schemas";
import type { ApiErrorCode, ApiResponse } from "@/types/api";
import type { CandidateProfile, LanguageProficiency } from "@/types/profile";

const extractProfileRequestSchema = z.object({
  text: z.string().trim().min(1),
  language: z.enum(["de", "en"]),
  model: z.string().trim().min(1).optional()
});

const errorStatusByCode: Record<ApiErrorCode, number> = {
  INVALID_INPUT: 400,
  OLLAMA_UNAVAILABLE: 503,
  AI_MODEL_NOT_READY: 409,
  AI_TIMEOUT: 504,
  INVALID_AI_JSON: 502,
  SCHEMA_VALIDATION_FAILED: 502,
  BUSINESS_RULE_FAILED: 422,
  HALLUCINATION_DETECTED: 422,
  EXPORT_FAILED: 500
};
const EXTRACTION_TIMEOUT_MS = 120_000;

const createJsonResponse = <T>(
  payload: ApiResponse<T>,
  status: number
): Response =>
  Response.json(payload, {
    status
  });

const createErrorResponse = (
  code: ApiErrorCode,
  message: string
): Response =>
  createJsonResponse(
    {
      success: false,
      error: {
        code,
        message
      }
    },
    errorStatusByCode[code]
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const removeNullValues = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== null && item !== "")
      .map((item) => removeNullValues(item));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, nestedValue]) =>
      nestedValue === null || nestedValue === ""
        ? []
        : [[key, removeNullValues(nestedValue)]]
    )
  );
};

const splitTextList = (value: string): string[] =>
  value
    .split(/[,;\n•]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const readStringArray = (value: unknown): string[] => {
  if (typeof value === "string") {
    return splitTextList(value);
  }

  return Array.isArray(value)
    ? value.flatMap((item) =>
        typeof item === "string" ? splitTextList(item) : []
      )
    : [];
};

const readRecordArray = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const hasTextValue = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const hasTextList = (items?: string[]): boolean =>
  items?.some(hasTextValue) ?? false;

const lineBreakPattern = /\r?\n/;

const withGeneratedId = (
  value: Record<string, unknown>,
  prefix: string,
  index: number
): Record<string, unknown> => ({
  ...value,
  id: typeof value.id === "string" && value.id ? value.id : `${prefix}-${index + 1}`
});

const normalizeCandidateProfile = (value: unknown): unknown => {
  const normalizedValue = removeNullValues(value);

  if (!isRecord(normalizedValue)) {
    return normalizedValue;
  }

  const skills = isRecord(normalizedValue.skills) ? normalizedValue.skills : {};
  const extractionMeta = isRecord(normalizedValue.extractionMeta)
    ? {
        ...normalizedValue.extractionMeta,
        uncertainFields: readStringArray(
          normalizedValue.extractionMeta.uncertainFields
        )
      }
    : undefined;

  return {
    ...normalizedValue,
    personalInfo: isRecord(normalizedValue.personalInfo)
      ? normalizedValue.personalInfo
      : {},
    experiences: readRecordArray(normalizedValue.experiences).map(
      (experience, index) => ({
        ...withGeneratedId(experience, "experience", index),
        responsibilities: readStringArray(experience.responsibilities),
        achievements: readStringArray(experience.achievements),
        technologies: readStringArray(experience.technologies)
      })
    ),
    education: readRecordArray(normalizedValue.education).map(
      (education, index) => ({
        ...withGeneratedId(education, "education", index),
        details: readStringArray(education.details)
      })
    ),
    skills: {
      technical: readStringArray(skills.technical),
      soft: readStringArray(skills.soft),
      tools: readStringArray(skills.tools),
      languages: readStringArray(skills.languages),
      methods: readStringArray(skills.methods)
    },
    projects: readRecordArray(normalizedValue.projects).map((project, index) => ({
      ...withGeneratedId(project, "project", index),
      highlights: readStringArray(project.highlights),
      technologies: readStringArray(project.technologies)
    })),
    languages: readRecordArray(normalizedValue.languages).map((language, index) =>
      withGeneratedId(language, "language", index)
    ),
    certificates: readRecordArray(normalizedValue.certificates).map(
      (certificate, index) => withGeneratedId(certificate, "certificate", index)
    ),
    ...(extractionMeta ? { extractionMeta } : {})
  };
};

const hasMeaningfulCandidateProfile = (profile: CandidateProfile): boolean => {
  const hasPersonalInfo = Object.values(profile.personalInfo).some(hasTextValue);
  const hasSkills = Object.values(profile.skills).some(hasTextList);
  const hasExperience = profile.experiences.some(
    (experience) =>
      [
        experience.company,
        experience.role,
        experience.location,
        experience.startDate,
        experience.endDate,
        experience.description
      ].some(hasTextValue) ||
      hasTextList(experience.responsibilities) ||
      hasTextList(experience.achievements) ||
      hasTextList(experience.technologies)
  );
  const hasEducation = profile.education.some(
    (education) =>
      [
        education.institution,
        education.degree,
        education.field,
        education.location,
        education.startDate,
        education.endDate
      ].some(hasTextValue) || hasTextList(education.details)
  );
  const hasProjects = profile.projects.some(
    (project) =>
      [
        project.name,
        project.role,
        project.description,
        project.startDate,
        project.endDate,
        project.url
      ].some(hasTextValue) ||
      hasTextList(project.highlights) ||
      hasTextList(project.technologies)
  );
  const hasLanguages = profile.languages.some(
    (language) =>
      [language.language, language.details].some(hasTextValue)
  );
  const hasCertificates = profile.certificates.some(
    (certificate) =>
      [
        certificate.name,
        certificate.issuer,
        certificate.issueDate,
        certificate.expirationDate,
        certificate.credentialId,
        certificate.url
      ].some(hasTextValue)
  );

  return (
    hasPersonalInfo ||
    hasTextValue(profile.summary) ||
    hasExperience ||
    hasEducation ||
    hasSkills ||
    hasProjects ||
    hasLanguages ||
    hasCertificates
  );
};

const hasMeaningfulEducation = (
  education: CandidateProfile["education"][number]
): boolean =>
  [
    education.institution,
    education.degree,
    education.field,
    education.location,
    education.startDate,
    education.endDate
  ].some(hasTextValue) || hasTextList(education.details);

const hasMeaningfulCertificate = (
  certificate: CandidateProfile["certificates"][number]
): boolean =>
  [
    certificate.name,
    certificate.issuer,
    certificate.issueDate,
    certificate.expirationDate,
    certificate.credentialId,
    certificate.url
  ].some(hasTextValue);

const extractNamedLine = (text: string): string | undefined => {
  const explicitName = text.match(
    /(?:^|\n)(?:demo candidate context|candidate context|name|full name):\s*([^\n]+)/i
  )?.[1];

  return explicitName?.trim();
};

const extractSectionLines = (text: string, heading: string): string[] => {
  const lines = text.split(lineBreakPattern);
  const sectionLines: string[] = [];
  let isCollecting = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    const isHeading = /^[A-Z][A-Za-z ,&-]+:\s*$/.test(trimmedLine);

    if (trimmedLine.toLowerCase() === `${heading.toLowerCase()}:`) {
      isCollecting = true;
      continue;
    }

    if (isCollecting && isHeading) {
      break;
    }

    if (isCollecting) {
      sectionLines.push(line);
    }
  }

  return sectionLines;
};

const extractLabeledList = (text: string, label: string): string[] => {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const value = text.match(
    new RegExp(`(?:^|\\n)${escapedLabel}:\\s*([^\\n]+)`, "i")
  )?.[1];

  return value ? splitTextList(value) : [];
};

const parseEducationContent = (
  content: string
): Pick<
  CandidateProfile["education"][number],
  "institution" | "degree" | "field" | "location"
> => {
  const parts = content.split(",").map((part) => part.trim()).filter(Boolean);
  const firstPart = parts[0] ?? content.trim();
  const secondPart = parts[1];

  if (/^B\.[A-Za-z.]+|^M\.[A-Za-z.]+|^Bachelor|^Master/i.test(firstPart)) {
    const degreeMatch = firstPart.match(
      /^(B\.[A-Za-z.]+|M\.[A-Za-z.]+|Bachelor|Master)\s*(.*)$/i
    );

    return {
      degree: degreeMatch?.[1] ?? firstPart,
      field: degreeMatch?.[2]?.trim() || undefined,
      institution: secondPart
    };
  }

  if (/^Vocational training/i.test(firstPart)) {
    return {
      degree: firstPart,
      institution: secondPart
    };
  }

  return {
    institution: firstPart,
    location: secondPart
  };
};

const extractEducationFromText = (
  text: string
): CandidateProfile["education"] => {
  const educationHeadings = [
    "School education",
    "College and preparatory education",
    "Vocational education",
    "University education"
  ];
  const entries: CandidateProfile["education"] = [];

  for (const heading of educationHeadings) {
    const lines = extractSectionLines(text, heading);
    let currentEntry:
      | (CandidateProfile["education"][number] & { details: string[] })
      | undefined;

    for (const line of lines) {
      const trimmedLine = line.trim();
      const dateMatch = trimmedLine.match(
        /^(\d{4})\s*[-–]\s*(\d{4}|present|current)\s+(.+)$/i
      );

      if (dateMatch) {
        if (currentEntry) {
          entries.push(currentEntry);
        }

        currentEntry = {
          id: `education-${entries.length + 1}`,
          startDate: dateMatch[1],
          endDate: dateMatch[2],
          details: [],
          ...parseEducationContent(dateMatch[3])
        };
        continue;
      }

      const detail = trimmedLine.replace(/^[-•]\s*/, "").trim();
      if (currentEntry && detail) {
        currentEntry.details = [...(currentEntry.details ?? []), detail];
      }
    }

    if (currentEntry) {
      entries.push(currentEntry);
    }
  }

  return entries;
};

const extractSkillsFromText = (text: string): CandidateProfile["skills"] => ({
  technical: extractLabeledList(text, "Technical skills"),
  soft: extractLabeledList(text, "Soft skills"),
  tools: extractLabeledList(text, "Tools"),
  languages: [],
  methods: extractLabeledList(text, "Methods")
});

const proficiencyByText: Record<string, LanguageProficiency> = {
  basic: "basic",
  intermediate: "intermediate",
  advanced: "advanced",
  fluent: "fluent",
  native: "native"
};

const extractLanguagesFromText = (
  text: string
): CandidateProfile["languages"] =>
  extractSectionLines(text, "Languages")
    .flatMap((line, index) => {
      const languageMatch = line
        .trim()
        .match(/^(.+?)\s+(basic|intermediate|advanced|fluent|native)$/i);

      if (!languageMatch) {
        return [];
      }

      return [
        {
          id: `language-${index + 1}`,
          language: languageMatch[1].trim(),
          proficiency: proficiencyByText[languageMatch[2].toLowerCase()]
        }
      ];
    });

const extractCertificatesFromText = (
  text: string
): CandidateProfile["certificates"] =>
  extractSectionLines(text, "Continuing education and certifications")
    .flatMap((line, index) => {
      const certificateMatch = line
        .trim()
        .match(/^(\d{4})\s+([^:,]+?)(?:,\s*([^:]+))?(?::|$)/);

      if (!certificateMatch) {
        return [];
      }

      return [
        {
          id: `certificate-${index + 1}`,
          name: certificateMatch[2].trim(),
          issuer: certificateMatch[3]?.trim(),
          issueDate: certificateMatch[1]
        }
      ];
    });

const backfillProfileFromText = (
  profile: CandidateProfile,
  text: string
): CandidateProfile => {
  const extractedName = profile.personalInfo.fullName
    ? undefined
    : extractNamedLine(text);
  const extractedEducation = profile.education.some(hasMeaningfulEducation)
    ? undefined
    : extractEducationFromText(text);
  const extractedSkills = extractSkillsFromText(text);
  const extractedLanguages = profile.languages.some((language) =>
    hasTextValue(language.language)
  )
    ? undefined
    : extractLanguagesFromText(text);
  const extractedCertificates = profile.certificates.some(
    hasMeaningfulCertificate
  )
    ? undefined
    : extractCertificatesFromText(text);

  return {
    ...profile,
    personalInfo: {
      ...profile.personalInfo,
      ...(extractedName ? { fullName: extractedName } : {})
    },
    education:
      extractedEducation && extractedEducation.length > 0
        ? extractedEducation
        : profile.education,
    skills: {
      technical: hasTextList(profile.skills.technical)
        ? profile.skills.technical
        : extractedSkills.technical,
      soft: hasTextList(profile.skills.soft)
        ? profile.skills.soft
        : extractedSkills.soft,
      tools: hasTextList(profile.skills.tools)
        ? profile.skills.tools
        : extractedSkills.tools,
      languages: hasTextList(profile.skills.languages)
        ? profile.skills.languages
        : extractedSkills.languages,
      methods: hasTextList(profile.skills.methods)
        ? profile.skills.methods
        : extractedSkills.methods
    },
    languages:
      extractedLanguages && extractedLanguages.length > 0
        ? extractedLanguages
        : profile.languages,
    certificates:
      extractedCertificates && extractedCertificates.length > 0
        ? extractedCertificates
        : profile.certificates
  };
};

const createOllamaOptions = (
  model: string | undefined
): { model?: string; timeoutMs: number } => ({
  ...(model ? { model } : {}),
  timeoutMs: EXTRACTION_TIMEOUT_MS
});

const parseAiProfile = (aiProfile: unknown) =>
  candidateProfileSchema.safeParse(normalizeCandidateProfile(aiProfile));

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return createErrorResponse("INVALID_INPUT", "Request body must be JSON");
  }

  const parsedRequest = extractProfileRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return createErrorResponse("INVALID_INPUT", "Text and language are required");
  }

  const prompt = buildExtractProfilePrompt(parsedRequest.data);

  try {
    const generationOptions = createOllamaOptions(parsedRequest.data.model);
    const aiProfile = await generateOllamaJson<unknown>(
      prompt,
      generationOptions
    );
    let parsedProfile = parseAiProfile(aiProfile);
    let profile = parsedProfile.success
      ? backfillProfileFromText(parsedProfile.data, parsedRequest.data.text)
      : undefined;

    if (!parsedProfile.success) {
      return createErrorResponse(
        "SCHEMA_VALIDATION_FAILED",
        "AI response did not match the candidate profile schema"
      );
    }

    if (!profile || !hasMeaningfulCandidateProfile(profile)) {
      const recoveryPrompt = buildExtractProfilePrompt({
        ...parsedRequest.data,
        recovery: true
      });
      const recoveryAiProfile = await generateOllamaJson<unknown>(
        recoveryPrompt,
        generationOptions
      );

      parsedProfile = parseAiProfile(recoveryAiProfile);
      profile = parsedProfile.success
        ? backfillProfileFromText(parsedProfile.data, parsedRequest.data.text)
        : undefined;

      if (!parsedProfile.success) {
        return createErrorResponse(
          "SCHEMA_VALIDATION_FAILED",
          "AI response did not match the candidate profile schema"
        );
      }
    }

    if (!profile || !hasMeaningfulCandidateProfile(profile)) {
      return createErrorResponse(
        "BUSINESS_RULE_FAILED",
        "AI did not extract usable candidate profile data. Add more candidate context or try another model."
      );
    }

    return createJsonResponse<CandidateProfile>(
      {
        success: true,
        data: profile
      },
      200
    );
  } catch (error) {
    if (error instanceof OllamaClientError) {
      return createErrorResponse(error.code, error.message);
    }

    return createErrorResponse("OLLAMA_UNAVAILABLE", "AI request failed");
  }
}
