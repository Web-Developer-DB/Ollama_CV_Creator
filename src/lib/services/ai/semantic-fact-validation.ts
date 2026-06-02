// Semantic fact validator for generated documents. It distinguishes true
// hallucinations from missing-data warnings and source-backed translations.
import {
  collectCandidateSkillEvidence,
  compactFacts,
  hasArrayValues,
  hasText,
  includesKnownFact,
  includesKnownSkillFact,
  normalizeFact,
  normalizeSkillFact
} from "@/lib/services/ai/candidate-facts";
import type {
  GeneratedCoverLetter,
  GeneratedCV,
  GeneratedDocumentMeta,
  DocumentSectionItem
} from "@/types/documents";
import type { JobAnalysis, JobTarget } from "@/types/job";
import type { CandidateProfile } from "@/types/profile";

type GeneratedDocumentWithMeta = {
  meta: GeneratedDocumentMeta;
};

export type SemanticFactValidationResult = {
  unknownSkills: string[];
  unknownEmployers: string[];
  unknownCertificates: string[];
  unknownEducationFacts: string[];
  unknownDates: string[];
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

const companyLikePattern =
  /\b[A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*)*\s+(?:GmbH|AG|Inc|LLC|Ltd|Corp|Corporation|Company)\b/g;

const dedupe = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const splitFactText = (value: string): string[] =>
  value
    .split(/[,;\n•]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const collectItemText = (item: DocumentSectionItem): string =>
  [
    item.title,
    item.subtitle,
    item.dateRange,
    item.body,
    ...item.bullets
  ]
    .filter((value): value is string => hasText(value))
    .join("\n");

const collectCvText = (generatedCV: GeneratedCV): string =>
  [
    generatedCV.title,
    generatedCV.summary,
    ...generatedCV.sections.flatMap((section) => [
      section.title,
      ...section.items.map(collectItemText)
    ])
  ]
    .filter((value): value is string => hasText(value))
    .join("\n");

const collectLetterText = (coverLetter: GeneratedCoverLetter): string =>
  [
    coverLetter.recipient?.company,
    coverLetter.recipient?.contactName,
    ...(coverLetter.recipient?.addressLines ?? []),
    coverLetter.subject,
    coverLetter.greeting,
    coverLetter.opening,
    ...coverLetter.body,
    coverLetter.closing,
    coverLetter.signature
  ]
    .filter((value): value is string => hasText(value))
    .join("\n");

const isGenericSkillLabel = (value: string): boolean =>
  genericSkillLabels.has(normalizeFact(value));

const collectKnownCompanyFacts = (
  candidateProfile: CandidateProfile,
  jobTarget?: JobTarget
): string[] =>
  compactFacts([
    ...candidateProfile.experiences.map((experience) => experience.company),
    jobTarget?.company
  ]);

const collectKnownCertificateFacts = (
  candidateProfile: CandidateProfile
): string[] =>
  compactFacts(
    candidateProfile.certificates.flatMap((certificate) => [
      certificate.name,
      certificate.issuer,
      certificate.issueDate,
      certificate.credentialId
    ])
  );

const collectKnownEducationFacts = (
  candidateProfile: CandidateProfile
): string[] =>
  compactFacts(
    candidateProfile.education.flatMap((education) => [
      education.institution,
      education.degree,
      education.field,
      education.location,
      education.startDate,
      education.endDate
    ])
  );

const collectKnownDateFacts = (candidateProfile: CandidateProfile): string[] =>
  compactFacts([
    ...candidateProfile.experiences.flatMap((experience) => [
      experience.startDate,
      experience.endDate
    ]),
    ...candidateProfile.education.flatMap((education) => [
      education.startDate,
      education.endDate
    ]),
    ...candidateProfile.projects.flatMap((project) => [
      project.startDate,
      project.endDate
    ]),
    ...candidateProfile.certificates.flatMap((certificate) => [
      certificate.issueDate,
      certificate.expirationDate
    ])
  ]);

const collectGeneratedSkillValues = (item: DocumentSectionItem): string[] => {
  const values = [
    ...splitFactText(item.body ?? ""),
    ...item.bullets.flatMap(splitFactText)
  ].filter(Boolean);

  return values.length > 0 ? values : splitFactText(item.title ?? "");
};

const collectUnknownSkillValues = (
  generatedCV: GeneratedCV,
  candidateProfile: CandidateProfile
): string[] => {
  const knownSkills = collectCandidateSkillEvidence(candidateProfile);

  return dedupe(
    generatedCV.sections
      .filter((section) => section.type === "skills")
      .flatMap((section) => section.items)
      .flatMap(collectGeneratedSkillValues)
      .filter(
        (skillValue) =>
          !isGenericSkillLabel(skillValue) &&
          !includesKnownSkillFact(skillValue, knownSkills)
      )
  );
};

const collectUnknownCompanies = (
  text: string,
  candidateProfile: CandidateProfile,
  jobTarget?: JobTarget
): string[] => {
  const allowedCompanies = collectKnownCompanyFacts(candidateProfile, jobTarget);
  const companies = text.match(companyLikePattern) ?? [];

  return dedupe(
    companies.filter((company) => !includesKnownFact(company, allowedCompanies))
  );
};

const collectUnknownCvEmployers = (
  generatedCV: GeneratedCV,
  candidateProfile: CandidateProfile
): string[] => {
  const knownExperienceFacts = compactFacts(
    candidateProfile.experiences.flatMap((experience) => [
      experience.company,
      experience.role,
      experience.location,
      experience.startDate,
      experience.endDate
    ])
  );
  const unknownSubtitles = generatedCV.sections
    .filter((section) => section.type === "experience")
    .flatMap((section) => section.items)
    .map((item) => item.subtitle)
    .filter((subtitle): subtitle is string => hasText(subtitle))
    .filter((subtitle) => !includesKnownFact(subtitle, knownExperienceFacts));

  return dedupe([
    ...unknownSubtitles,
    ...collectUnknownCompanies(collectCvText(generatedCV), candidateProfile)
  ]);
};

const collectUnknownSectionFacts = (
  generatedCV: GeneratedCV,
  sectionType: "certificates" | "education",
  knownFacts: string[]
): string[] => {
  const sectionItems = generatedCV.sections
    .filter((section) => section.type === sectionType)
    .flatMap((section) => section.items);

  if (sectionItems.length === 0) {
    return [];
  }

  return dedupe(
    sectionItems
      .flatMap((item) => [
        item.title,
        item.subtitle,
        item.dateRange,
        ...item.bullets
      ])
      .filter((value): value is string => hasText(value))
      .filter((value) => !includesKnownFact(value, knownFacts))
  );
};

const dateTokenPattern =
  /\b(?:19|20)\d{2}\b|\b(?:present|current|heute|aktuell)\b/gi;

const collectUnknownDates = (
  generatedCV: GeneratedCV,
  candidateProfile: CandidateProfile
): string[] => {
  const knownDates = collectKnownDateFacts(candidateProfile);
  const knownDateText = knownDates.join(" ");
  const generatedDateTokens = collectCvText(generatedCV).match(dateTokenPattern) ?? [];

  return dedupe(
    generatedDateTokens.filter(
      (dateToken) =>
        !normalizeFact(knownDateText).includes(normalizeFact(dateToken))
    )
  );
};

export const validateGeneratedCvFacts = (
  generatedCV: GeneratedCV,
  candidateProfile: CandidateProfile
): SemanticFactValidationResult => ({
  unknownSkills: collectUnknownSkillValues(generatedCV, candidateProfile),
  unknownEmployers: collectUnknownCvEmployers(generatedCV, candidateProfile),
  unknownCertificates: collectUnknownSectionFacts(
    generatedCV,
    "certificates",
    collectKnownCertificateFacts(candidateProfile)
  ),
  unknownEducationFacts: collectUnknownSectionFacts(
    generatedCV,
    "education",
    collectKnownEducationFacts(candidateProfile)
  ),
  unknownDates: collectUnknownDates(generatedCV, candidateProfile)
});

const collectJobSkillSignals = (jobAnalysis: JobAnalysis): string[] =>
  compactFacts([
    ...jobAnalysis.requiredSkills,
    ...jobAnalysis.optionalSkills,
    ...jobAnalysis.softSkills
  ]);

const collectUnsupportedMentionedJobSkills = (
  coverLetter: GeneratedCoverLetter,
  candidateProfile: CandidateProfile,
  jobAnalysis: JobAnalysis | undefined
): string[] => {
  if (!jobAnalysis) {
    return [];
  }

  const knownSkills = collectCandidateSkillEvidence(candidateProfile);
  const unsupportedJobSkills = collectJobSkillSignals(jobAnalysis).filter(
    (skill) => !includesKnownSkillFact(skill, knownSkills)
  );
  const letterText = normalizeSkillFact(collectLetterText(coverLetter));

  return dedupe(
    unsupportedJobSkills.filter((skill) => {
      const normalizedSkill = normalizeSkillFact(skill);

      return normalizedSkill.length > 0 && letterText.includes(normalizedSkill);
    })
  );
};

export const validateGeneratedCoverLetterFacts = (
  coverLetter: GeneratedCoverLetter,
  candidateProfile: CandidateProfile,
  jobTarget: JobTarget | undefined,
  jobAnalysis: JobAnalysis | undefined
): Pick<SemanticFactValidationResult, "unknownSkills" | "unknownEmployers"> => ({
  unknownSkills: collectUnsupportedMentionedJobSkills(
    coverLetter,
    candidateProfile,
    jobAnalysis
  ),
  unknownEmployers: collectUnknownCompanies(
    collectLetterText(coverLetter),
    candidateProfile,
    jobTarget
  )
});

export const formatSemanticFactErrorMessage = (
  result: Partial<SemanticFactValidationResult>
): string => {
  if (result.unknownSkills && result.unknownSkills.length > 0) {
    return `Generated document contains a skill not present in the candidate profile: ${result.unknownSkills
      .slice(0, 5)
      .join(", ")}`;
  }

  if (result.unknownEmployers && result.unknownEmployers.length > 0) {
    return `Generated document contains an employer or company not present in the allowed source data: ${result.unknownEmployers
      .slice(0, 5)
      .join(", ")}`;
  }

  if (result.unknownCertificates && result.unknownCertificates.length > 0) {
    return `Generated CV contains certificate facts not present in the candidate profile: ${result.unknownCertificates
      .slice(0, 5)
      .join(", ")}`;
  }

  if (result.unknownEducationFacts && result.unknownEducationFacts.length > 0) {
    return `Generated CV contains education facts not present in the candidate profile: ${result.unknownEducationFacts
      .slice(0, 5)
      .join(", ")}`;
  }

  if (result.unknownDates && result.unknownDates.length > 0) {
    return `Generated CV contains dates not present in the candidate profile: ${result.unknownDates
      .slice(0, 5)
      .join(", ")}`;
  }

  return "Generated document contains facts not present in the candidate profile";
};

export const hasSemanticFactErrors = (
  result: Partial<SemanticFactValidationResult>
): boolean =>
  Boolean(
    result.unknownSkills?.length ||
      result.unknownEmployers?.length ||
      result.unknownCertificates?.length ||
      result.unknownEducationFacts?.length ||
      result.unknownDates?.length
  );

const hasAnySkills = (candidateProfile: CandidateProfile): boolean =>
  Object.values(candidateProfile.skills).some(hasArrayValues);

const hasExperienceFacts = (candidateProfile: CandidateProfile): boolean =>
  candidateProfile.experiences.some(
    (experience) =>
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
      hasArrayValues(experience.technologies)
  );

export const collectMissingDataWarnings = (
  candidateProfile: CandidateProfile,
  documentType: "cv" | "cover_letter",
  jobTarget?: JobTarget
): string[] => {
  const warnings: string[] = [];
  const personalInfo = candidateProfile.personalInfo;

  if (!hasText(personalInfo.fullName)) {
    warnings.push("Name fehlt. Der Entwurf wurde ohne erfundene Signatur erstellt.");
  }

  if (
    ![
      personalInfo.email,
      personalInfo.phone,
      personalInfo.linkedin,
      personalInfo.website,
      personalInfo.portfolio
    ].some(hasText)
  ) {
    warnings.push(
      "Kontaktmöglichkeit fehlt. Ergänze E-Mail, Telefon, LinkedIn oder Website vor dem Export."
    );
  }

  if (!hasText(candidateProfile.summary)) {
    warnings.push("Kurzprofil fehlt. Der Entwurf nutzt stattdessen belegte Einzeldaten.");
  }

  if (!hasExperienceFacts(candidateProfile)) {
    warnings.push("Berufserfahrung fehlt oder ist unvollständig.");
  }

  if (!hasAnySkills(candidateProfile)) {
    warnings.push("Skills fehlen. Ergänze fachliche Fähigkeiten für stärkere Dokumente.");
  }

  if (documentType === "cover_letter" && !hasText(personalInfo.fullName)) {
    warnings.push("Anschreiben enthält keine Signatur, weil kein Name im Profil steht.");
  }

  if (jobTarget && !hasText(jobTarget.title)) {
    warnings.push("Zielrolle hat keinen Titel. Tailoring nutzt nur die Stellenbeschreibung.");
  }

  if (jobTarget && !hasText(jobTarget.company)) {
    warnings.push("Zielrolle hat kein Unternehmen. Das Anschreiben nennt keine Firma.");
  }

  return dedupe(warnings);
};

export const attachDocumentWarnings = <
  TDocument extends GeneratedDocumentWithMeta
>(
  document: TDocument,
  warnings: string[]
): TDocument => {
  const mergedWarnings = dedupe([...(document.meta.warnings ?? []), ...warnings]);

  return {
    ...document,
    meta:
      mergedWarnings.length > 0
        ? {
            ...document.meta,
            warnings: mergedWarnings
          }
        : document.meta
  };
};
