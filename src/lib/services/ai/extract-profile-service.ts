// Framework-independent service for converting raw candidate text into the
// canonical CandidateProfile that later document generation treats as source.
import { z } from "zod";
import { buildExtractProfilePrompt } from "@/lib/ai/prompts/extract-profile";
import {
  generateOllamaJson,
  OllamaClientError
} from "@/lib/ai/ollama-client";
import {
  createErrorResponse,
  createSuccessResponse
} from "@/lib/services/api-response";
import { resolveContextWindow } from "@/lib/services/ai/context-window";
import { normalizeCandidateProfileOutput } from "@/lib/services/ai/profile-normalization";
import { candidateProfileSchema } from "@/lib/validation/schemas";
import type {
  AiRuntimeOptions,
  ApiResponse,
  ExtractProfileRequest
} from "@/types/api";
import type { CandidateProfile, LanguageProficiency } from "@/types/profile";

const extractProfileRequestSchema = z.object({
  text: z.string().trim().min(1),
  language: z.enum(["de", "en"]),
  model: z.string().trim().min(1).optional(),
  runtime: z
    .object({
      contextWindow: z.number().int().positive().optional(),
      timeoutMs: z.number().int().positive().optional()
    })
    .optional()
});

const EXTRACTION_TIMEOUT_MS = 120_000;

const splitTextList = (value: string): string[] =>
  value
    .split(/[,;\n•]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const hasTextValue = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const hasTextList = (items?: string[]): boolean =>
  items?.some(hasTextValue) ?? false;

const lineBreakPattern = /\r?\n/;

const normalizeHeading = (value: string): string =>
  value
    .trim()
    .replace(/:$/, "")
    .toLowerCase();

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
  const hasLanguages = profile.languages.some((language) =>
    [language.language, language.details].some(hasTextValue)
  );
  const hasCertificates = profile.certificates.some((certificate) =>
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

const hasMeaningfulExperience = (
  experience: CandidateProfile["experiences"][number]
): boolean =>
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
  hasTextList(experience.technologies);

const hasMeaningfulProject = (
  project: CandidateProfile["projects"][number]
): boolean =>
  [
    project.name,
    project.role,
    project.description,
    project.startDate,
    project.endDate,
    project.url
  ].some(hasTextValue) ||
  hasTextList(project.highlights) ||
  hasTextList(project.technologies);

const extractLabeledValue = (text: string, labels: string[]): string | undefined => {
  for (const label of labels) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const value = text.match(
      new RegExp(`(?:^|\\n)${escapedLabel}:\\s*([^\\n]+)`, "i")
    )?.[1];

    if (value?.trim()) {
      return value.trim();
    }
  }

  return undefined;
};

const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const extractEmailValue = (text: string): string | undefined => {
  const email = extractLabeledValue(text, ["Email", "E-Mail", "Mail"]);

  return email && isValidEmail(email) ? email : undefined;
};

const extractNamedLine = (text: string): string | undefined => {
  const explicitName = text.match(
    /(?:^|\n)(?:demo candidate context|candidate context|name|full name):\s*([^\n]+)/i
  )?.[1];

  return explicitName?.trim();
};

const extractSectionLines = (text: string, heading: string | string[]): string[] => {
  const lines = text.split(lineBreakPattern);
  const sectionLines: string[] = [];
  const headings = (Array.isArray(heading) ? heading : [heading]).map(
    normalizeHeading
  );
  let isCollecting = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    const isHeading =
      /^[A-ZÄÖÜ][A-Za-zÄÖÜäöüß ,&/()-]+:\s*$/.test(trimmedLine);
    const normalizedLine = normalizeHeading(trimmedLine);

    if (headings.includes(normalizedLine)) {
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

const extractLabeledList = (text: string, label: string | string[]): string[] => {
  const value = extractLabeledValue(text, Array.isArray(label) ? label : [label]);

  return value ? splitTextList(value) : [];
};

const parseEducationContent = (
  content: string
): Pick<
  CandidateProfile["education"][number],
  "institution" | "degree" | "field" | "location"
> => {
  const parts = content
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
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
    "University education",
    "Education",
    "Schulbildung",
    "Schule",
    "Berufsausbildung",
    "Ausbildung",
    "Studium",
    "Universität",
    "Hochschule"
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
        /^(\d{4})\s*[-–]\s*(\d{4}|present|current|heute|aktuell)\s+(.+)$/i
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
  technical: extractLabeledList(text, [
    "Technical skills",
    "Technische Fähigkeiten",
    "Technische Skills",
    "Fachliche Fähigkeiten"
  ]),
  soft: extractLabeledList(text, [
    "Soft skills",
    "Soft Skills",
    "Soziale Kompetenzen"
  ]),
  tools: extractLabeledList(text, ["Tools", "Werkzeuge"]),
  languages: [],
  methods: extractLabeledList(text, ["Methods", "Methoden", "Arbeitsmethoden"])
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
  extractSectionLines(text, ["Languages", "Sprachen"]).flatMap((line, index) => {
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
  extractSectionLines(text, [
    "Continuing education and certifications",
    "Certificates",
    "Certifications",
    "Weiterbildung und Zertifikate",
    "Zertifikate",
    "Fortbildungen"
  ]).flatMap((line, index) => {
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

const extractPersonalInfoFromText = (
  text: string
): CandidateProfile["personalInfo"] => {
  const fullName = extractNamedLine(text);
  const email = extractEmailValue(text);
  const phone = extractLabeledValue(text, ["Phone", "Telefon", "Mobile"]);
  const location = extractLabeledValue(text, ["Location", "Ort", "Adresse"]);
  const website = extractLabeledValue(text, ["Website"]);
  const linkedin = extractLabeledValue(text, ["LinkedIn", "Linkedin"]);
  const github = extractLabeledValue(text, ["GitHub", "Github"]);
  const portfolio = extractLabeledValue(text, ["Portfolio"]);

  return {
    ...(fullName ? { fullName } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(location ? { location } : {}),
    ...(website ? { website } : {}),
    ...(linkedin ? { linkedin } : {}),
    ...(github ? { github } : {}),
    ...(portfolio ? { portfolio } : {})
  };
};

const extractSummaryFromText = (text: string): string | undefined => {
  const summaryLines = extractSectionLines(text, [
    "Profile summary",
    "Summary",
    "Profil",
    "Kurzprofil",
    "Zusammenfassung"
  ])
    .map((line) => line.trim().replace(/^[-•]\s*/, ""))
    .filter(Boolean);

  if (summaryLines.length > 0) {
    return summaryLines.join(" ");
  }

  return text
    .split(lineBreakPattern)
    .map((line) => line.trim())
    .find((line) => line.length > 60 && !line.includes(":"));
};

const parseRoleCompanyLocation = (
  value: string
): Pick<
  CandidateProfile["experiences"][number],
  "role" | "company" | "location"
> => {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    role: parts[0],
    company: parts[1],
    location: parts.slice(2).join(", ") || undefined
  };
};

const extractExperiencesFromText = (
  text: string
): CandidateProfile["experiences"] => {
  const lines = extractSectionLines(text, [
    "Professional experience",
    "Work experience",
    "Experience",
    "Berufserfahrung",
    "Berufliche Erfahrung",
    "Arbeitserfahrung"
  ]);
  const entries: CandidateProfile["experiences"] = [];
  let currentEntry:
    | (CandidateProfile["experiences"][number] & {
        responsibilities: string[];
        achievements: string[];
      })
    | undefined;

  for (const line of lines) {
    const trimmedLine = line.trim();
    const dateMatch = trimmedLine.match(
      /^(\d{4})\s*[-–]\s*(\d{4}|present|current|heute|aktuell)\s+(.+)$/i
    );

    if (dateMatch) {
      if (currentEntry) {
        entries.push(currentEntry);
      }

      currentEntry = {
        id: `experience-${entries.length + 1}`,
        startDate: dateMatch[1],
        endDate: dateMatch[2],
        responsibilities: [],
        achievements: [],
        ...parseRoleCompanyLocation(dateMatch[3])
      };
      continue;
    }

    const detail = trimmedLine.replace(/^[-•]\s*/, "").trim();
    if (!currentEntry || !detail) {
      continue;
    }

    const technologies = detail.match(/^(?:Technologies|Technologien):\s*(.+)$/i);
    if (technologies) {
      currentEntry.technologies = splitTextList(technologies[1]);
      continue;
    }

    currentEntry.responsibilities.push(detail);
  }

  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries;
};

const extractProjectsFromText = (text: string): CandidateProfile["projects"] => {
  const lines = extractSectionLines(text, [
    "Selected projects",
    "Projects",
    "Ausgewählte Projekte",
    "Projekte"
  ]);
  const entries: CandidateProfile["projects"] = [];
  let currentEntry:
    | (CandidateProfile["projects"][number] & { highlights: string[] })
    | undefined;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      continue;
    }

    if (!/^[-•]/.test(trimmedLine)) {
      if (currentEntry) {
        entries.push(currentEntry);
      }

      const parts = trimmedLine
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      currentEntry = {
        id: `project-${entries.length + 1}`,
        name: parts[0],
        description: parts.slice(1).join(", ") || undefined,
        highlights: []
      };
      continue;
    }

    const detail = trimmedLine.replace(/^[-•]\s*/, "").trim();
    if (!currentEntry || !detail) {
      continue;
    }

    const role = detail.match(/^Role:\s*(.+)$/i);
    if (role) {
      currentEntry.role = role[1].replace(/\.$/, "");
      continue;
    }

    const technologies = detail.match(/^(?:Technologies|Technologien):\s*(.+)$/i);
    if (technologies) {
      currentEntry.technologies = splitTextList(technologies[1]);
      continue;
    }

    currentEntry.highlights.push(detail);
  }

  if (currentEntry) {
    entries.push(currentEntry);
  }

  return entries;
};

const createFallbackProfileFromText = (
  text: string,
  language: "de" | "en",
  warnings: string[]
): CandidateProfile =>
  backfillProfileFromText(
    {
      personalInfo: extractPersonalInfoFromText(text),
      summary: extractSummaryFromText(text),
      experiences: extractExperiencesFromText(text),
      education: extractEducationFromText(text),
      skills: extractSkillsFromText(text),
      projects: extractProjectsFromText(text),
      languages: extractLanguagesFromText(text),
      certificates: extractCertificatesFromText(text),
      extractionMeta: {
        language,
        extractedAt: new Date().toISOString(),
        uncertainFields: [],
        warnings
      }
    },
    text
  );

const mergeMissingPersonalInfo = (
  current: CandidateProfile["personalInfo"],
  extracted: CandidateProfile["personalInfo"]
): CandidateProfile["personalInfo"] => ({
  fullName: current.fullName ?? extracted.fullName,
  email: current.email ?? extracted.email,
  phone: current.phone ?? extracted.phone,
  location: current.location ?? extracted.location,
  website: current.website ?? extracted.website,
  linkedin: current.linkedin ?? extracted.linkedin,
  github: current.github ?? extracted.github,
  portfolio: current.portfolio ?? extracted.portfolio
});

const backfillProfileFromText = (
  profile: CandidateProfile,
  text: string
): CandidateProfile => {
  const extractedPersonalInfo = extractPersonalInfoFromText(text);
  const extractedSummary = hasTextValue(profile.summary)
    ? undefined
    : extractSummaryFromText(text);
  const extractedExperiences = profile.experiences.some(hasMeaningfulExperience)
    ? undefined
    : extractExperiencesFromText(text);
  const extractedEducation = profile.education.some(hasMeaningfulEducation)
    ? undefined
    : extractEducationFromText(text);
  const extractedSkills = extractSkillsFromText(text);
  const extractedProjects = profile.projects.some(hasMeaningfulProject)
    ? undefined
    : extractProjectsFromText(text);
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
    personalInfo: mergeMissingPersonalInfo(
      profile.personalInfo,
      extractedPersonalInfo
    ),
    summary: profile.summary ?? extractedSummary,
    experiences:
      extractedExperiences && extractedExperiences.length > 0
        ? extractedExperiences
        : profile.experiences,
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
    projects:
      extractedProjects && extractedProjects.length > 0
        ? extractedProjects
        : profile.projects,
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
  model: string | undefined,
  runtime: AiRuntimeOptions | undefined
): { model?: string; timeoutMs: number } => ({
  ...(model ? { model } : {}),
  timeoutMs: runtime?.timeoutMs ?? EXTRACTION_TIMEOUT_MS
});

const parseAiProfile = (aiProfile: unknown) =>
  candidateProfileSchema.safeParse(normalizeCandidateProfileOutput(aiProfile));

const backfillValidatedProfile = (
  profile: CandidateProfile,
  text: string
): CandidateProfile | undefined => {
  const backfilledProfile = backfillProfileFromText(profile, text);
  const parsedBackfilledProfile = candidateProfileSchema.safeParse(backfilledProfile);

  return parsedBackfilledProfile.success
    ? parsedBackfilledProfile.data
    : undefined;
};

const createValidatedFallbackProfile = (
  request: ExtractProfileRequest,
  warnings: string[]
): CandidateProfile | undefined => {
  const fallbackProfile = createFallbackProfileFromText(
    request.text,
    request.language,
    warnings
  );
  const parsedFallback = candidateProfileSchema.safeParse(fallbackProfile);

  return parsedFallback.success && hasMeaningfulCandidateProfile(parsedFallback.data)
    ? parsedFallback.data
    : undefined;
};

const createFallbackProfileResponse = (
  request: ExtractProfileRequest,
  warning: string
): ApiResponse<CandidateProfile> => {
  const fallbackProfile = createValidatedFallbackProfile(request, [warning]);

  return fallbackProfile
    ? createSuccessResponse(fallbackProfile)
    : createErrorResponse(
        "BUSINESS_RULE_FAILED",
        "AI did not extract usable candidate profile data. Add more candidate context or try another model."
      );
};

export const extractProfile = async (
  input: unknown
): Promise<ApiResponse<CandidateProfile>> => {
  const parsedRequest = extractProfileRequestSchema.safeParse(input);
  if (!parsedRequest.success) {
    return createErrorResponse("INVALID_INPUT", "Text and language are required");
  }

  const request: ExtractProfileRequest = parsedRequest.data;
  const basePrompt = buildExtractProfilePrompt(request);
  const contextWindow = resolveContextWindow({
    texts: [basePrompt.system, basePrompt.prompt],
    runtime: request.runtime,
    minimum: basePrompt.numCtx,
    expectedOutputTokens: basePrompt.numPredict,
    overheadTokens: 1536
  });
  const prompt = {
    ...basePrompt,
    numCtx: contextWindow
  };

  try {
    const generationOptions = createOllamaOptions(request.model, request.runtime);
    const aiProfile = await generateOllamaJson<unknown>(
      prompt,
      generationOptions
    );
    // The normalizer accepts common local/cloud model aliases before the Zod
    // schema checks the canonical CandidateProfile shape.
    let parsedProfile = parseAiProfile(aiProfile);
    let profile = parsedProfile.success
      ? backfillValidatedProfile(parsedProfile.data, request.text)
      : undefined;

    if (!parsedProfile.success) {
      return createFallbackProfileResponse(
        request,
        "Das KI-Profil hatte ein ungültiges Schema. Die App hat belegte Daten konservativ aus dem Rohtext übernommen."
      );
    }

    if (!profile || !hasMeaningfulCandidateProfile(profile)) {
      // Recovery uses a stricter prompt only when the first valid response is
      // empty, preserving latency for normal successful extractions.
      const recoveryPrompt = buildExtractProfilePrompt({
        ...request,
        recovery: true
      });
      const runtimeRecoveryPrompt = {
        ...recoveryPrompt,
        numCtx: resolveContextWindow({
          texts: [recoveryPrompt.system, recoveryPrompt.prompt],
          runtime: request.runtime,
          minimum: recoveryPrompt.numCtx,
          expectedOutputTokens: recoveryPrompt.numPredict,
          overheadTokens: 1536
        })
      };
      const recoveryAiProfile = await generateOllamaJson<unknown>(
        runtimeRecoveryPrompt,
        generationOptions
      );

      parsedProfile = parseAiProfile(recoveryAiProfile);
      profile = parsedProfile.success
        ? backfillValidatedProfile(parsedProfile.data, request.text)
        : undefined;

      if (!parsedProfile.success) {
        return createFallbackProfileResponse(
          request,
          "Das KI-Recovery-Profil hatte ein ungültiges Schema. Die App hat belegte Daten konservativ aus dem Rohtext übernommen."
        );
      }
    }

    if (!profile || !hasMeaningfulCandidateProfile(profile)) {
      return createFallbackProfileResponse(
        request,
        "Das KI-Profil war leer. Die App hat belegte Daten konservativ aus dem Rohtext übernommen."
      );
    }

    return createSuccessResponse(profile);
  } catch (error) {
    if (error instanceof OllamaClientError) {
      if (error.code === "INVALID_AI_JSON" || error.code === "AI_TIMEOUT") {
        return createFallbackProfileResponse(
          request,
          error.code === "AI_TIMEOUT"
            ? "Die KI-Anfrage hat zu lange gedauert. Die App hat belegte Daten konservativ aus dem Rohtext übernommen."
            : "Die KI hat kein gültiges JSON erzeugt. Die App hat belegte Daten konservativ aus dem Rohtext übernommen."
        );
      }

      return createErrorResponse(error.code, error.message);
    }

    return createErrorResponse("OLLAMA_UNAVAILABLE", "AI request failed");
  }
};
