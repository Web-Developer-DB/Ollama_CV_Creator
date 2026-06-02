// Shared candidate-fact utilities. These helpers decide whether generated text
// is backed by the profile while allowing faithful translations/simplifications.
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

const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

export const normalizeFact = (value: string): string =>
  collapseWhitespace(
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9+#.]+/g, " ")
  );

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

const skillPhraseReplacements: Array<[RegExp, string]> = [
  [/\bstakeholder kommunikation\b/g, "stakeholder communication"],
  [/\bkommunikation\b/g, "communication"],
  [/\bstrukturierte problemlosung\b/g, "structured problem solving"],
  [/\bproblemlosung\b/g, "problem solving"],
  [/\bprodukt thinking\b/g, "product thinking"],
  [/\bproduktdenken\b/g, "product thinking"],
  [/\bworkshop moderation\b/g, "workshop facilitation"],
  [/\bmoderation\b/g, "facilitation"],
  [/\bsorgfaltige dokumentation\b/g, "careful documentation"],
  [/\btechnische dokumentation\b/g, "technical documentation"],
  [/\bdokumentation\b/g, "documentation"],
  [
    /\bbereichsubergreifende zusammenarbeit\b/g,
    "cross functional collaboration"
  ],
  [/\bzusammenarbeit\b/g, "collaboration"],
  [/\bbarrierefreiheit\b/g, "accessibility"],
  [/\bschema validierung\b/g, "schema validation"],
  [/\bvalidierung\b/g, "validation"],
  [/\bkomponententest(?:s)?\b/g, "component testing"],
  [/\bkomponenten test(?:s)?\b/g, "component testing"],
  [/\bkomponententests\b/g, "component testing"],
  [/\bdesign systeme\b/g, "design systems"],
  [/\bsysteme\b/g, "systems"],
  [/\bgrundlagen\b/g, "basics"],
  [/\bgrundkenntnisse\b/g, "basics"],
  [/\bapis\b/g, "api"]
];

const removableSkillModifiers =
  /\b(?:advanced|basic|basics|beginner|expert|fundamental|fundamentals|foundation|foundational|grundlagen|grundkenntnisse|kenntnisse|skill|skills|fahigkeit|fahigkeiten|technisch|technische|technical|soft|tools|tool|method|methods|methode|methoden)\b/g;

export const normalizeSkillFact = (value: string): string => {
  let normalizedValue = normalizeFact(value);

  skillPhraseReplacements.forEach(([pattern, replacement]) => {
    normalizedValue = normalizedValue.replace(pattern, replacement);
  });

  return collapseWhitespace(
    normalizedValue
      .replace(removableSkillModifiers, " ")
      .replace(/\bjs\b/g, "javascript")
      .replace(/\bts\b/g, "typescript")
  );
};

export const includesKnownSkillFact = (
  value: string,
  knownFacts: string[]
): boolean => {
  if (includesKnownFact(value, knownFacts)) {
    return true;
  }

  const normalizedValue = normalizeSkillFact(value);
  if (!normalizedValue) {
    return false;
  }

  return knownFacts
    .map(normalizeSkillFact)
    .filter(Boolean)
    .some(
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
