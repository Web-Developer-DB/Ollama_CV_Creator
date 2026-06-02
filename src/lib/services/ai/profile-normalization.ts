import type {
  CandidateProfile,
  LanguageProficiency,
  PersonalInfo,
  SkillSet
} from "@/types/profile";

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readRecordValue = (
  value: Record<string, unknown>,
  keys: string[]
): unknown => keys.map((key) => value[key]).find((item) => item !== undefined);

const readString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value.trim() || undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
};

const splitTextList = (value: string): string[] =>
  value
    .split(/[,;\n•]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const readStringArray = (value: unknown): string[] => {
  if (typeof value === "string" || typeof value === "number") {
    const text = readString(value);

    return text ? splitTextList(text) : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string" || typeof item === "number") {
        return readStringArray(item);
      }

      if (isPlainRecord(item)) {
        return readStringArray(
          readRecordValue(item, [
            "text",
            "content",
            "body",
            "description",
            "title",
            "name",
            "skill",
            "technology",
            "language"
          ])
        );
      }

      return [];
    });
  }

  if (isPlainRecord(value)) {
    return Object.values(value).flatMap(readStringArray);
  }

  return [];
};

const readRecordArray = (value: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(value)) {
    return value.filter(isPlainRecord);
  }

  if (isPlainRecord(value)) {
    return Object.values(value).filter(isPlainRecord);
  }

  return [];
};

const readStringRecordArray = (
  value: unknown
): Array<Record<string, unknown> | string> => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> | string =>
        isPlainRecord(item) || typeof item === "string"
    );
  }

  if (typeof value === "string") {
    return splitTextList(value);
  }

  if (isPlainRecord(value)) {
    return Object.values(value).filter(
      (item): item is Record<string, unknown> | string =>
        isPlainRecord(item) || typeof item === "string"
    );
  }

  return [];
};

const removeEmptyValues = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value
      .map(removeEmptyValues)
      .filter((item) => item !== undefined && item !== null && item !== "");
  }

  if (!isPlainRecord(value)) {
    return value === "" || value === null ? undefined : value;
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, nestedValue]) => {
      const cleanedValue = removeEmptyValues(nestedValue);

      return cleanedValue === undefined || cleanedValue === null
        ? []
        : [[key, cleanedValue]];
    })
  );
};

const withGeneratedId = (
  value: Record<string, unknown>,
  prefix: string,
  index: number
): Record<string, unknown> => ({
  ...value,
  id: readString(value.id) ?? `${prefix}-${index + 1}`
});

const normalizeConfidence = (value: unknown): number | undefined => {
  const numericValue =
    typeof value === "number" ? value : Number.parseFloat(readString(value) ?? "");

  if (!Number.isFinite(numericValue)) {
    return undefined;
  }

  if (numericValue >= 0 && numericValue <= 1) {
    return numericValue;
  }

  if (numericValue > 1 && numericValue <= 100) {
    return numericValue / 100;
  }

  return undefined;
};

const normalizeBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") {
    return value;
  }

  const text = readString(value)?.toLowerCase();
  if (!text) {
    return undefined;
  }

  if (/^(true|yes|ja|current|present|ongoing|heute|aktuell)$/.test(text)) {
    return true;
  }

  if (/^(false|no|nein|past|ended)$/.test(text)) {
    return false;
  }

  return undefined;
};

const readEmail = (value: unknown): string | undefined => {
  const email = readString(value);

  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
};

const unwrapCandidateProfile = (value: unknown): unknown => {
  if (Array.isArray(value) && value.length === 1) {
    return unwrapCandidateProfile(value[0]);
  }

  if (!isPlainRecord(value)) {
    return value;
  }

  const wrapped = readRecordValue(value, [
    "candidateProfile",
    "candidate_profile",
    "profile",
    "extractedProfile",
    "extracted_profile",
    "data",
    "result"
  ]);

  return isPlainRecord(wrapped) ? wrapped : value;
};

const normalizePersonalInfo = (
  value: Record<string, unknown>
): PersonalInfo => {
  const source = isPlainRecord(
    readRecordValue(value, [
      "personalInfo",
      "personal_info",
      "contactInfo",
      "contact_info",
      "contact",
      "candidate"
    ])
  )
    ? (readRecordValue(value, [
        "personalInfo",
        "personal_info",
        "contactInfo",
        "contact_info",
        "contact",
        "candidate"
      ]) as Record<string, unknown>)
    : value;

  return removeEmptyValues({
    fullName: readString(
      readRecordValue(source, [
        "fullName",
        "full_name",
        "name",
        "candidateName",
        "candidate_name"
      ])
    ),
    email: readEmail(readRecordValue(source, ["email", "mail", "emailAddress"])),
    phone: readString(readRecordValue(source, ["phone", "telephone", "mobile"])),
    location: readString(
      readRecordValue(source, ["location", "city", "address", "ort"])
    ),
    website: readString(readRecordValue(source, ["website", "url"])),
    linkedin: readString(
      readRecordValue(source, ["linkedin", "linkedIn", "linkedinUrl"])
    ),
    github: readString(readRecordValue(source, ["github", "gitHub"])),
    portfolio: readString(readRecordValue(source, ["portfolio", "portfolioUrl"]))
  }) as PersonalInfo;
};

const normalizeExperience = (
  value: Record<string, unknown>,
  index: number
): CandidateProfile["experiences"][number] => {
  const confidence = normalizeConfidence(value.confidence);
  const isCurrent = normalizeBoolean(
    readRecordValue(value, ["isCurrent", "is_current", "current"])
  );

  return removeEmptyValues({
    ...withGeneratedId(value, "experience", index),
    company: readString(
      readRecordValue(value, ["company", "employer", "organization", "org"])
    ),
    role: readString(
      readRecordValue(value, ["role", "title", "position", "jobTitle", "job_title"])
    ),
    location: readString(readRecordValue(value, ["location", "city", "place"])),
    startDate: readString(
      readRecordValue(value, ["startDate", "start_date", "start"])
    ),
    endDate: readString(readRecordValue(value, ["endDate", "end_date", "end"])),
    ...(isCurrent === undefined ? {} : { isCurrent }),
    description: readString(
      readRecordValue(value, ["description", "summary", "body", "profile"])
    ),
    responsibilities: readStringArray(
      readRecordValue(value, [
        "responsibilities",
        "responsibility",
        "tasks",
        "duties",
        "keyResponsibilities",
        "key_responsibilities"
      ])
    ),
    achievements: readStringArray(
      readRecordValue(value, ["achievements", "accomplishments", "results"])
    ),
    technologies: readStringArray(
      readRecordValue(value, [
        "technologies",
        "technology",
        "techStack",
        "tech_stack",
        "tools",
        "skills"
      ])
    ),
    ...(confidence === undefined ? {} : { confidence })
  }) as CandidateProfile["experiences"][number];
};

const normalizeEducation = (
  value: Record<string, unknown>,
  index: number
): CandidateProfile["education"][number] => {
  const confidence = normalizeConfidence(value.confidence);

  return removeEmptyValues({
    ...withGeneratedId(value, "education", index),
    institution: readString(
      readRecordValue(value, ["institution", "school", "university", "provider"])
    ),
    degree: readString(
      readRecordValue(value, ["degree", "qualification", "program"])
    ),
    field: readString(
      readRecordValue(value, ["field", "fieldOfStudy", "field_of_study", "major"])
    ),
    location: readString(readRecordValue(value, ["location", "city", "place"])),
    startDate: readString(
      readRecordValue(value, ["startDate", "start_date", "start"])
    ),
    endDate: readString(readRecordValue(value, ["endDate", "end_date", "end"])),
    details: readStringArray(
      readRecordValue(value, ["details", "subjects", "modules", "courses", "notes"])
    ),
    ...(confidence === undefined ? {} : { confidence })
  }) as CandidateProfile["education"][number];
};

const readSkills = (
  skills: Record<string, unknown>,
  keys: string[]
): string[] => readStringArray(readRecordValue(skills, keys));

const normalizeSkills = (value: Record<string, unknown>): SkillSet => {
  const skillsSource = readRecordValue(value, ["skills", "skillSet", "skill_set"]);
  const skills = isPlainRecord(skillsSource)
    ? skillsSource
    : typeof skillsSource === "string" || Array.isArray(skillsSource)
      ? { technical: skillsSource }
      : {};

  return {
    technical: [
      ...readSkills(skills, [
        "technical",
        "technicalSkills",
        "technical_skills",
        "tech",
        "technologies",
        "programmingLanguages",
        "programming_languages"
      ]),
      ...readStringArray(
        readRecordValue(value, [
          "technicalSkills",
          "technical_skills",
          "technologies"
        ])
      )
    ],
    soft: [
      ...readSkills(skills, ["soft", "softSkills", "soft_skills", "interpersonal"]),
      ...readStringArray(readRecordValue(value, ["softSkills", "soft_skills"]))
    ],
    tools: [
      ...readSkills(skills, ["tools", "software", "platforms"]),
      ...readStringArray(readRecordValue(value, ["tools"]))
    ],
    languages: readSkills(skills, ["languages", "languageSkills"]),
    methods: [
      ...readSkills(skills, [
        "methods",
        "methodologies",
        "practices",
        "processes"
      ]),
      ...readStringArray(readRecordValue(value, ["methods", "methodologies"]))
    ]
  };
};

const proficiencyByText: Record<string, LanguageProficiency> = {
  basic: "basic",
  beginner: "basic",
  grundkenntnisse: "basic",
  basiskenntnisse: "basic",
  basickenntnisse: "basic",
  intermediate: "intermediate",
  mittelstufe: "intermediate",
  advanced: "advanced",
  fortgeschritten: "advanced",
  fluent: "fluent",
  fliessend: "fluent",
  fließend: "fluent",
  verhandlungssicher: "fluent",
  native: "native",
  muttersprache: "native",
  muttersprachlich: "native"
};

const normalizeProficiency = (
  value: unknown
): LanguageProficiency | undefined => {
  const text = readString(value)?.toLowerCase();

  return text ? proficiencyByText[text] : undefined;
};

const normalizeLanguage = (
  value: Record<string, unknown> | string,
  index: number
): CandidateProfile["languages"][number] | undefined => {
  if (typeof value === "string") {
    const languageMatch = value
      .trim()
      .match(/^(.+?)\s+(basic|beginner|grundkenntnisse|basiskenntnisse|intermediate|mittelstufe|advanced|fortgeschritten|fluent|fliessend|fließend|verhandlungssicher|native|muttersprache|muttersprachlich)$/i);

    if (!languageMatch) {
      return value.trim()
        ? {
            id: `language-${index + 1}`,
            language: value.trim()
          }
        : undefined;
    }

    return {
      id: `language-${index + 1}`,
      language: languageMatch[1].trim(),
      proficiency: normalizeProficiency(languageMatch[2])
    };
  }

  const confidence = normalizeConfidence(value.confidence);

  return removeEmptyValues({
    ...withGeneratedId(value, "language", index),
    language: readString(
      readRecordValue(value, ["language", "name", "label", "lang"])
    ),
    proficiency: normalizeProficiency(
      readRecordValue(value, ["proficiency", "level", "fluency"])
    ),
    details: readString(readRecordValue(value, ["details", "description"])),
    ...(confidence === undefined ? {} : { confidence })
  }) as CandidateProfile["languages"][number];
};

const normalizeProject = (
  value: Record<string, unknown>,
  index: number
): CandidateProfile["projects"][number] => {
  const confidence = normalizeConfidence(value.confidence);

  return removeEmptyValues({
    ...withGeneratedId(value, "project", index),
    name: readString(readRecordValue(value, ["name", "title", "projectName"])),
    role: readString(readRecordValue(value, ["role", "position"])),
    description: readString(readRecordValue(value, ["description", "summary"])),
    startDate: readString(
      readRecordValue(value, ["startDate", "start_date", "start"])
    ),
    endDate: readString(readRecordValue(value, ["endDate", "end_date", "end"])),
    url: readString(readRecordValue(value, ["url", "website", "link"])),
    highlights: readStringArray(
      readRecordValue(value, ["highlights", "achievements", "details", "bullets"])
    ),
    technologies: readStringArray(
      readRecordValue(value, ["technologies", "technology", "techStack", "tools"])
    ),
    ...(confidence === undefined ? {} : { confidence })
  }) as CandidateProfile["projects"][number];
};

const normalizeCertificate = (
  value: Record<string, unknown> | string,
  index: number
): CandidateProfile["certificates"][number] => {
  if (typeof value === "string") {
    return {
      id: `certificate-${index + 1}`,
      name: value
    };
  }

  const confidence = normalizeConfidence(value.confidence);

  return removeEmptyValues({
    ...withGeneratedId(value, "certificate", index),
    name: readString(readRecordValue(value, ["name", "title", "certificate"])),
    issuer: readString(readRecordValue(value, ["issuer", "provider", "authority"])),
    issueDate: readString(
      readRecordValue(value, ["issueDate", "issue_date", "date", "year"])
    ),
    expirationDate: readString(
      readRecordValue(value, [
        "expirationDate",
        "expiration_date",
        "expiryDate",
        "expiry_date"
      ])
    ),
    credentialId: readString(
      readRecordValue(value, ["credentialId", "credential_id", "idNumber"])
    ),
    url: readString(readRecordValue(value, ["url", "link"])),
    ...(confidence === undefined ? {} : { confidence })
  }) as CandidateProfile["certificates"][number];
};

const normalizeExtractionMeta = (
  value: Record<string, unknown>
): CandidateProfile["extractionMeta"] | undefined => {
  const source = readRecordValue(value, ["extractionMeta", "extraction_meta", "meta"]);

  if (!isPlainRecord(source)) {
    return undefined;
  }

  const confidence = normalizeConfidence(source.confidence);
  const extractedAt = readString(
    readRecordValue(source, ["extractedAt", "extracted_at"])
  );

  return removeEmptyValues({
    language:
      readString(source.language) === "en" || readString(source.language) === "de"
        ? readString(source.language)
        : undefined,
    extractedAt:
      extractedAt && !Number.isNaN(Date.parse(extractedAt))
        ? extractedAt
        : undefined,
    model: readString(source.model),
    ...(confidence === undefined ? {} : { confidence }),
    uncertainFields: readStringArray(
      readRecordValue(source, ["uncertainFields", "uncertain_fields"])
    ),
    warnings: readStringArray(source.warnings)
  }) as CandidateProfile["extractionMeta"];
};

export const normalizeCandidateProfileOutput = (value: unknown): unknown => {
  const normalizedValue = removeEmptyValues(unwrapCandidateProfile(value));

  if (!isPlainRecord(normalizedValue)) {
    return normalizedValue;
  }

  const summary = readString(
    readRecordValue(normalizedValue, ["summary", "profileSummary", "profile"])
  );
  const extractionMeta = normalizeExtractionMeta(normalizedValue);

  return removeEmptyValues({
    personalInfo: normalizePersonalInfo(normalizedValue),
    ...(summary ? { summary } : {}),
    experiences: readRecordArray(
      readRecordValue(normalizedValue, [
        "experiences",
        "experience",
        "workExperience",
        "work_experience",
        "employment",
        "workHistory",
        "work_history"
      ])
    ).map(normalizeExperience),
    education: readRecordArray(
      readRecordValue(normalizedValue, [
        "education",
        "educationHistory",
        "education_history",
        "training",
        "studies"
      ])
    ).map(normalizeEducation),
    skills: normalizeSkills(normalizedValue),
    projects: readRecordArray(
      readRecordValue(normalizedValue, [
        "projects",
        "selectedProjects",
        "selected_projects",
        "portfolioProjects",
        "portfolio_projects"
      ])
    ).map(normalizeProject),
    languages: readStringRecordArray(
      readRecordValue(normalizedValue, [
        "languages",
        "languageSkills",
        "language_skills"
      ])
    )
      .map(normalizeLanguage)
      .filter((item): item is CandidateProfile["languages"][number] =>
        Boolean(item?.language)
      ),
    certificates: readStringRecordArray(
      readRecordValue(normalizedValue, [
        "certificates",
        "certifications",
        "courses",
        "workshops",
        "continuingEducation",
        "continuing_education"
      ])
    ).map(normalizeCertificate),
    ...(extractionMeta ? { extractionMeta } : {})
  });
};
