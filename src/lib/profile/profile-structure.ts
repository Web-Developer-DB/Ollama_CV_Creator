import type { CandidateProfile, Education, WorkExperience } from "@/types/profile";

// Repairs common extraction shapes where an LLM placed structured facts into
// free-text detail fields. It only moves facts already present in the source.
const lineBreakPattern = /\r?\n/;
const dateRangePattern =
  /^(\d{4})\s*[-–]\s*(\d{4}|present|current|heute|aktuell)\s*:?\s*(.+)$/i;

const hasText = (value: string | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

const splitLines = (values: Array<string | undefined>): string[] =>
  values
    .flatMap((value) => value?.split(lineBreakPattern) ?? [])
    .map((line) => line.trim().replace(/^[-•]\s*/, ""))
    .filter(Boolean);

const normalizeHeading = (value: string): string =>
  value
    .trim()
    .replace(/:$/, "")
    .toLowerCase();

const extractSectionLines = (text: string, headings: string[]): string[] => {
  const normalizedHeadings = headings.map(normalizeHeading);
  const lines = text.split(lineBreakPattern);
  const sectionLines: string[] = [];
  let isCollecting = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    const isHeading =
      /^[A-ZÄÖÜ][A-Za-zÄÖÜäöüß ,&/()-]+:\s*$/.test(trimmedLine);

    if (normalizedHeadings.includes(normalizeHeading(trimmedLine))) {
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

const parseRoleCompanyLocation = (
  value: string
): Pick<WorkExperience, "role" | "company" | "location"> => {
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

const parseEducationContent = (
  value: string
): Pick<Education, "institution" | "degree" | "field" | "location"> => {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const firstPart = parts[0] ?? value.trim();
  const secondPart = parts[1];
  const degreeMatch = firstPart.match(
    /^(B\.[A-Za-z.]+|M\.[A-Za-z.]+|Bachelor|Master)\s*(.*)$/i
  );

  if (degreeMatch) {
    return {
      degree: degreeMatch[1],
      field: degreeMatch[2]?.trim() || undefined,
      institution: secondPart,
      location: parts.slice(2).join(", ") || undefined
    };
  }

  return {
    institution: firstPart,
    location: secondPart
  };
};

const isLikelyLocation = (value: string): boolean =>
  /^[A-ZÄÖÜ][A-Za-zÄÖÜäöüß .-]{2,40}$/.test(value) &&
  !/(reife|abschluss|bachelor|master|diplom|abitur|schwerpunkt|degree)/i.test(
    value
  );

const parseEducationDetailLines = (
  lines: string[]
): Partial<Education> & { consumedIndexes: Set<number> } => {
  const consumedIndexes = new Set<number>();
  const result: Partial<Education> = {};
  const headerIndex = lines.findIndex((line) => dateRangePattern.test(line));

  if (headerIndex >= 0) {
    const match = lines[headerIndex].match(dateRangePattern);

    if (match) {
      result.startDate = match[1];
      result.endDate = match[2];
      Object.assign(result, parseEducationContent(match[3]));
      consumedIndexes.add(headerIndex);
    }
  }

  for (const [index, line] of lines.entries()) {
    if (consumedIndexes.has(index)) {
      continue;
    }

    const degree = line.match(/^(?:Abschluss|Degree):\s*(.+)$/i);
    const field = line.match(/^(?:Fachrichtung|Field|Schwerpunkt):\s*(.+)$/i);
    const location = line.match(/^(?:Ort|Location):\s*(.+)$/i);
    const institution = line.match(/^(?:Institution|School|Schule):\s*(.+)$/i);

    if (institution && !result.institution) {
      result.institution = institution[1].trim();
      consumedIndexes.add(index);
      continue;
    }

    if (degree && !result.degree) {
      result.degree = degree[1].trim();
      consumedIndexes.add(index);
      continue;
    }

    if (field && !result.field) {
      result.field = field[1].trim();
      consumedIndexes.add(index);
      continue;
    }

    if (location && !result.location) {
      result.location = location[1].trim();
      consumedIndexes.add(index);
      continue;
    }

    if (!result.location && isLikelyLocation(line)) {
      result.location = line;
      consumedIndexes.add(index);
      continue;
    }

    if (!result.degree) {
      result.degree = line;
      consumedIndexes.add(index);
      continue;
    }

    if (!result.field && /^Schwerpunkt\s+/i.test(line)) {
      result.field = line.replace(/^Schwerpunkt\s*/i, "").trim();
      consumedIndexes.add(index);
    }
  }

  return {
    ...result,
    consumedIndexes
  };
};

const normalizeEducationEntry = (education: Education): Education => {
  const lines = splitLines(education.details ?? []);
  const parsed = parseEducationDetailLines(lines);
  const remainingDetails = lines.filter(
    (_, index) => !parsed.consumedIndexes.has(index)
  );

  return {
    ...education,
    institution: education.institution ?? parsed.institution,
    degree: education.degree ?? parsed.degree,
    field: education.field ?? parsed.field,
    location: education.location ?? parsed.location,
    startDate: education.startDate ?? parsed.startDate,
    endDate: education.endDate ?? parsed.endDate,
    details: remainingDetails.length > 0 ? remainingDetails : []
  };
};

const parseExperienceDetailLines = (
  lines: string[]
): Partial<WorkExperience> & { consumedIndexes: Set<number> } => {
  const consumedIndexes = new Set<number>();
  const result: Partial<WorkExperience> = {};

  for (const [index, line] of lines.entries()) {
    const dateMatch = line.match(dateRangePattern);
    const role = line.match(/^(?:Role|Rolle|Position):\s*(.+)$/i);
    const company = line.match(/^(?:Company|Unternehmen|Arbeitgeber):\s*(.+)$/i);
    const location = line.match(/^(?:Location|Ort):\s*(.+)$/i);
    const description = line.match(/^(?:Description|Beschreibung):\s*(.+)$/i);

    if (dateMatch) {
      result.startDate = result.startDate ?? dateMatch[1];
      result.endDate = result.endDate ?? dateMatch[2];
      Object.assign(result, parseRoleCompanyLocation(dateMatch[3]));
      consumedIndexes.add(index);
      continue;
    }

    if (role && !result.role) {
      result.role = role[1].trim();
      consumedIndexes.add(index);
      continue;
    }

    if (company && !result.company) {
      result.company = company[1].trim();
      consumedIndexes.add(index);
      continue;
    }

    if (location && !result.location) {
      result.location = location[1].trim();
      consumedIndexes.add(index);
      continue;
    }

    if (description && !result.description) {
      result.description = description[1].trim();
      consumedIndexes.add(index);
    }
  }

  return {
    ...result,
    consumedIndexes
  };
};

const normalizeExperienceEntry = (experience: WorkExperience): WorkExperience => {
  const lines = splitLines([
    experience.description,
    ...experience.responsibilities
  ]);
  const parsed = parseExperienceDetailLines(lines);
  const remainingResponsibilities = lines.filter(
    (_, index) => !parsed.consumedIndexes.has(index)
  );

  return {
    ...experience,
    company: experience.company ?? parsed.company,
    role: experience.role ?? parsed.role,
    location: experience.location ?? parsed.location,
    startDate: experience.startDate ?? parsed.startDate,
    endDate: experience.endDate ?? parsed.endDate,
    description: experience.description ?? parsed.description,
    responsibilities:
      remainingResponsibilities.length > 0
        ? remainingResponsibilities
        : experience.responsibilities,
    achievements: experience.achievements
  };
};

const extractEducationFromSource = (text: string): Education[] => {
  const lines = extractSectionLines(text, [
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
  ]);
  const entries: Education[] = [];
  let currentLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (dateRangePattern.test(trimmedLine) && currentLines.length > 0) {
      entries.push(normalizeEducationEntry({
        id: `education-source-${entries.length + 1}`,
        details: currentLines
      }));
      currentLines = [];
    }

    if (trimmedLine) {
      currentLines.push(trimmedLine);
    }
  }

  if (currentLines.length > 0) {
    entries.push(normalizeEducationEntry({
      id: `education-source-${entries.length + 1}`,
      details: currentLines
    }));
  }

  return entries;
};

const extractExperiencesFromSource = (text: string): WorkExperience[] => {
  const lines = extractSectionLines(text, [
    "Professional experience",
    "Work experience",
    "Experience",
    "Berufserfahrung",
    "Berufliche Erfahrung",
    "Arbeitserfahrung"
  ]);
  const entries: WorkExperience[] = [];
  let currentLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (dateRangePattern.test(trimmedLine) && currentLines.length > 0) {
      entries.push(normalizeExperienceEntry({
        id: `experience-source-${entries.length + 1}`,
        responsibilities: currentLines,
        achievements: []
      }));
      currentLines = [];
    }

    if (trimmedLine) {
      currentLines.push(trimmedLine);
    }
  }

  if (currentLines.length > 0) {
    entries.push(normalizeExperienceEntry({
      id: `experience-source-${entries.length + 1}`,
      responsibilities: currentLines,
      achievements: []
    }));
  }

  return entries;
};

const mergeExperience = (
  current: WorkExperience,
  source: WorkExperience | undefined
): WorkExperience => ({
  ...current,
  company: current.company ?? source?.company,
  role: current.role ?? source?.role,
  location: current.location ?? source?.location,
  startDate: current.startDate ?? source?.startDate,
  endDate: current.endDate ?? source?.endDate,
  description: current.description ?? source?.description,
  responsibilities:
    current.responsibilities.length > 0
      ? current.responsibilities
      : source?.responsibilities ?? current.responsibilities,
  achievements:
    current.achievements.length > 0
      ? current.achievements
      : source?.achievements ?? current.achievements,
  technologies: current.technologies ?? source?.technologies
});

const mergeEducation = (
  current: Education,
  source: Education | undefined
): Education => ({
  ...current,
  institution: current.institution ?? source?.institution,
  degree: current.degree ?? source?.degree,
  field: current.field ?? source?.field,
  location: current.location ?? source?.location,
  startDate: current.startDate ?? source?.startDate,
  endDate: current.endDate ?? source?.endDate,
  details:
    current.details && current.details.length > 0
      ? current.details
      : source?.details ?? current.details
});

export const normalizeCandidateProfileStructure = (
  profile: CandidateProfile,
  sourceText?: string
): CandidateProfile => {
  const sourceExperiences = sourceText ? extractExperiencesFromSource(sourceText) : [];
  const sourceEducation = sourceText ? extractEducationFromSource(sourceText) : [];
  const experiences = profile.experiences.map((experience, index) =>
    mergeExperience(normalizeExperienceEntry(experience), sourceExperiences[index])
  );
  const education = profile.education.map((educationEntry, index) =>
    mergeEducation(normalizeEducationEntry(educationEntry), sourceEducation[index])
  );

  return {
    ...profile,
    experiences: experiences.length > 0 ? experiences : sourceExperiences,
    education: education.length > 0 ? education : sourceEducation
  };
};
