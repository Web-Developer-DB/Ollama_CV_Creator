import type { CandidateProfile, WorkExperience } from "@/types/profile";

export const hasText = (value: string | undefined): boolean =>
  typeof value === "string" && value.trim().length > 0;

export const hasArrayValues = (values: string[] | undefined): boolean =>
  Array.isArray(values) && values.some((value) => value.trim().length > 0);

const hasExperienceFacts = (experience: WorkExperience): boolean =>
  [
    experience.company,
    experience.role,
    experience.location,
    experience.startDate,
    experience.endDate,
    experience.description
  ].some(hasText) ||
  hasArrayValues(experience.responsibilities) ||
  hasArrayValues(experience.achievements) ||
  hasArrayValues(experience.technologies);

export const hasCandidateFacts = (
  candidateProfile: CandidateProfile
): boolean =>
  Object.values(candidateProfile.personalInfo).some(hasText) ||
  hasText(candidateProfile.summary) ||
  candidateProfile.experiences.some(hasExperienceFacts) ||
  candidateProfile.education.length > 0 ||
  candidateProfile.projects.length > 0 ||
  candidateProfile.languages.length > 0 ||
  candidateProfile.certificates.length > 0 ||
  Object.values(candidateProfile.skills).some(hasArrayValues);

export const normalizeFact = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .trim();

export const compactFacts = (values: Array<string | undefined>): string[] =>
  Array.from(
    new Set(
      values
        .filter((value): value is string => hasText(value))
        .map(normalizeFact)
        .filter(Boolean)
    )
  );

export const includesKnownFact = (
  value: string,
  knownFacts: string[]
): boolean => {
  const normalizedValue = normalizeFact(value);

  return knownFacts.some(
    (knownFact) =>
      normalizedValue === knownFact ||
      normalizedValue.includes(knownFact) ||
      knownFact.includes(normalizedValue)
  );
};

export const collectCandidateSkillEvidence = (
  candidateProfile: CandidateProfile
): string[] =>
  compactFacts([
    candidateProfile.summary,
    ...candidateProfile.skills.technical,
    ...candidateProfile.skills.soft,
    ...candidateProfile.skills.tools,
    ...candidateProfile.skills.languages,
    ...candidateProfile.skills.methods,
    ...candidateProfile.experiences.flatMap((experience) => [
      experience.role,
      experience.description,
      ...(experience.responsibilities ?? []),
      ...(experience.achievements ?? []),
      ...(experience.technologies ?? [])
    ]),
    ...candidateProfile.education.flatMap((education) => [
      education.institution,
      education.degree,
      education.field,
      ...(education.details ?? [])
    ]),
    ...candidateProfile.projects.flatMap((project) => [
      project.name,
      project.role,
      project.description,
      ...(project.highlights ?? []),
      ...(project.technologies ?? [])
    ]),
    ...candidateProfile.languages.flatMap((language) => [
      language.language,
      language.proficiency,
      language.details
    ]),
    ...candidateProfile.certificates.flatMap((certificate) => [
      certificate.name,
      certificate.issuer
    ])
  ]);
