"use client";

import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { classNames } from "@/lib/ui/class-names";
import { useProjectStore } from "@/stores/project-store";
import type {
  CandidateProfile,
  Certificate,
  Education,
  PersonalInfo,
  SkillSet,
  WorkExperience
} from "@/types/profile";
import type { ApplicationProject } from "@/types/project";

type PersonalInfoField = keyof Pick<
  PersonalInfo,
  "fullName" | "email" | "phone" | "location" | "website" | "linkedin"
>;

type ExperienceTextField = keyof Pick<
  WorkExperience,
  "role" | "company" | "location" | "startDate" | "endDate" | "description"
>;

type SkillField = keyof Pick<
  SkillSet,
  "technical" | "soft" | "tools" | "languages" | "methods"
>;

type ProfileSectionId =
  | "personal"
  | "experience"
  | "skills"
  | "education"
  | "certificates"
  | "quality";

type SkillDrafts = Record<SkillField, string>;

const emptySkillDrafts: SkillDrafts = {
  technical: "",
  soft: "",
  tools: "",
  languages: "",
  methods: ""
};

const profileSections: Array<{
  ariaLabel?: string;
  id: ProfileSectionId;
  icon: IconName;
  label: string;
}> = [
  {
    ariaLabel: "Kontaktdaten",
    id: "personal",
    icon: "user",
    label: "Kontakt"
  },
  { id: "experience", icon: "briefcase", label: "Erfahrung" },
  {
    ariaLabel: "Fähigkeiten",
    id: "skills",
    icon: "activity",
    label: "Skills"
  },
  { id: "education", icon: "graduation", label: "Ausbildung" },
  { id: "certificates", icon: "award", label: "Zertifikate" },
  {
    ariaLabel: "LLM-Hinweise",
    id: "quality",
    icon: "shield",
    label: "Hinweise"
  }
];

const skillConfigs: Record<
  SkillField,
  {
    addLabel: string;
    description: string;
    icon: IconName;
    singular: string;
    title: string;
  }
> = {
  technical: {
    addLabel: "Technische Fähigkeit hinzufügen",
    description: "Frameworks, Programmiersprachen und fachliche Technologien.",
    icon: "settings",
    singular: "Technische Fähigkeit",
    title: "Technische Fähigkeiten"
  },
  soft: {
    addLabel: "Soft Skill hinzufügen",
    description: "Arbeitsweise, Kommunikation und Zusammenarbeit.",
    icon: "user",
    singular: "Soft Skill",
    title: "Soft Skills"
  },
  tools: {
    addLabel: "Tool hinzufügen",
    description: "Werkzeuge, Plattformen und produktive Arbeitsumgebung.",
    icon: "clipboard",
    singular: "Tool",
    title: "Tools"
  },
  languages: {
    addLabel: "Sprache hinzufügen",
    description: "Sprachen als kurze Profil-Stichworte.",
    icon: "document",
    singular: "Sprache",
    title: "Sprachen"
  },
  methods: {
    addLabel: "Methode hinzufügen",
    description: "Methoden, Prozesse und Arbeitspraktiken.",
    icon: "target",
    singular: "Methode",
    title: "Methoden"
  }
};

const inputClassName =
  "h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-action focus:ring-2 focus:ring-indigo-100";

const textareaClassName =
  "min-h-28 resize-y rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-action focus:ring-2 focus:ring-indigo-100";

const createId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createEmptyExperience = (): WorkExperience => ({
  id: createId(),
  responsibilities: [],
  achievements: []
});

const createEmptyEducation = (): Education => ({
  id: createId(),
  details: []
});

const createEmptyCertificate = (): Certificate => ({
  id: createId()
});

const createEmptyProfile = (): CandidateProfile => ({
  personalInfo: {},
  experiences: [createEmptyExperience()],
  education: [],
  skills: {
    technical: [],
    soft: [],
    tools: [],
    languages: [],
    methods: []
  },
  projects: [],
  languages: [],
  certificates: []
});

const splitList = (value: string): string[] =>
  value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const splitLines = (value: string): string[] =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const joinLines = (items: string[] | undefined): string =>
  items?.join("\n") ?? "";

const normalizeList = (items: string[]): string[] => {
  const seen = new Set<string>();

  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
};

const getEditableExperience = (
  experiences: WorkExperience[],
  activeExperienceId?: string
): WorkExperience =>
  experiences.find((experience) => experience.id === activeExperienceId) ??
  experiences[0] ??
  createEmptyExperience();

const buildProjectTitle = (
  profile: CandidateProfile,
  fallback?: string
): string => {
  const fullName = profile.personalInfo.fullName?.trim();

  if (fullName) {
    return fullName;
  }

  return fallback ?? "Candidate profile";
};

const calculateProfileCompletion = (profile: CandidateProfile): number => {
  const primaryExperience = getEditableExperience(profile.experiences);
  const checks = [
    profile.personalInfo.fullName,
    profile.personalInfo.email,
    profile.personalInfo.location,
    profile.summary,
    primaryExperience.role,
    primaryExperience.company,
    profile.skills.technical.length > 0 ? "technical" : undefined,
    profile.skills.soft.length > 0 ? "soft" : undefined,
    profile.education.length > 0 ? "education" : undefined,
    profile.certificates.length > 0 ? "certificates" : undefined
  ];
  const completed = checks.filter(Boolean).length;

  return Math.round((completed / checks.length) * 100);
};

const avatarLetters = (name: string | undefined): string => {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];

  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : (parts[0]?.slice(0, 2).toUpperCase() ?? "MS");
};

const countSkills = (skills: SkillSet): number =>
  skills.technical.length +
  skills.soft.length +
  skills.tools.length +
  skills.languages.length +
  skills.methods.length;

function SectionButton({
  active,
  ariaLabel,
  badge,
  icon,
  label,
  onClick
}: Readonly<{
  active: boolean;
  ariaLabel?: string;
  badge: string;
  icon: IconName;
  label: string;
  onClick: () => void;
}>) {
  return (
    <button
      aria-label={`${ariaLabel ?? label}: ${badge}`}
      aria-selected={active}
      className={classNames(
        "flex h-16 flex-col items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-1",
        active
          ? "border-indigo-200 bg-indigo-50 text-action shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40"
      )}
      onClick={onClick}
      role="tab"
      type="button"
    >
      <span
        className={classNames(
          "flex size-7 shrink-0 items-center justify-center rounded-full",
          active ? "bg-white text-action" : "bg-slate-100 text-slate-500"
        )}
      >
        <Icon className="size-3.5" name={icon} />
      </span>
      <span className="flex w-full min-w-0 flex-col justify-center">
        <span className="block truncate text-sm font-semibold leading-4">
          {label}
        </span>
        <span className="block truncate text-xs leading-4 text-slate-500">
          {badge}
        </span>
      </span>
    </button>
  );
}

function FieldLabel({
  children,
  label
}: Readonly<{
  children: React.ReactNode;
  label: string;
}>) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

function SkillEditor({
  draft,
  field,
  items,
  onAdd,
  onClean,
  onDraftChange,
  onRemove,
  onRename
}: Readonly<{
  draft: string;
  field: SkillField;
  items: string[];
  onAdd: (field: SkillField) => void;
  onClean: (field: SkillField) => void;
  onDraftChange: (field: SkillField, value: string) => void;
  onRemove: (field: SkillField, index: number) => void;
  onRename: (field: SkillField, index: number, value: string) => void;
}>) {
  const config = skillConfigs[field];
  const handleDraftKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onAdd(field);
    }
  };

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/70 p-4">
      <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-white text-action">
          <Icon className="size-4" name={config.icon} />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-slate-950">
            {config.title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {config.description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {items.length > 0 ? (
          items.map((item, index) => (
            <span
              className="grid min-h-9 max-w-full grid-cols-[minmax(5rem,1fr)_1.75rem] items-center rounded-md border border-indigo-100 bg-white text-sm shadow-sm"
              key={`${field}-${index}`}
            >
              <input
                aria-label={`${config.singular} ${index + 1}`}
                className="min-w-0 bg-transparent px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:text-action"
                onBlur={() => onClean(field)}
                onChange={(event) =>
                  onRename(field, index, event.target.value)
                }
                value={item}
              />
              <button
                aria-label={`${config.singular} entfernen: ${item || index + 1}`}
                className="flex size-7 items-center justify-center rounded-r-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                onClick={() => onRemove(field, index)}
                type="button"
              >
                <Icon className="size-3.5" name="x" />
              </button>
            </span>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-500">
            Keine Einträge
          </p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <input
          aria-label={`Neue ${config.singular}`}
          className={inputClassName}
          onChange={(event) => onDraftChange(field, event.target.value)}
          onKeyDown={handleDraftKeyDown}
          value={draft}
        />
        <Button
          aria-label={config.addLabel}
          onClick={() => onAdd(field)}
          size="sm"
          variant="secondary"
        >
          <Icon className="size-4" name="plus" />
          Hinzufügen
        </Button>
      </div>
    </div>
  );
}

export function ProfileScreen() {
  const { error, isLoading, projects, saveProject, selectedProjectId } =
    useProjectStore();
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const initialProfile = selectedProject?.candidateProfile ?? createEmptyProfile();

  const [profile, setProfile] = useState<CandidateProfile>(initialProfile);
  const [activeSection, setActiveSection] =
    useState<ProfileSectionId>("skills");
  const [activeExperienceId, setActiveExperienceId] = useState<
    string | undefined
  >(initialProfile.experiences[0]?.id);
  const [skillDrafts, setSkillDrafts] =
    useState<SkillDrafts>(emptySkillDrafts);
  const [savedMessage, setSavedMessage] = useState<string | undefined>();

  const editableExperience = getEditableExperience(
    profile.experiences,
    activeExperienceId
  );
  const uncertainFields = profile.extractionMeta?.uncertainFields ?? [];
  const warnings = profile.extractionMeta?.warnings ?? [];
  const hasExtractionConcerns =
    uncertainFields.length > 0 || warnings.length > 0;
  const completion = calculateProfileCompletion(profile);
  const fullName = profile.personalInfo.fullName ?? "Max Mustermann";
  const skillCount = countSkills(profile.skills);

  useEffect(() => {
    const nextProfile =
      selectedProject?.candidateProfile ?? createEmptyProfile();

    setProfile(nextProfile);
    setActiveExperienceId(nextProfile.experiences[0]?.id);
    setSkillDrafts(emptySkillDrafts);
  }, [selectedProject?.candidateProfile, selectedProject?.id]);

  const updatePersonalInfo = (field: PersonalInfoField, value: string) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      personalInfo: {
        ...currentProfile.personalInfo,
        [field]: value
      }
    }));
  };

  const updateExperience = (field: ExperienceTextField, value: string) => {
    setProfile((currentProfile) => {
      const currentExperience = getEditableExperience(
        currentProfile.experiences,
        activeExperienceId
      );
      const nextExperience = {
        ...currentExperience,
        [field]: value
      };
      const exists = currentProfile.experiences.some(
        (experience) => experience.id === currentExperience.id
      );

      return {
        ...currentProfile,
        experiences: exists
          ? currentProfile.experiences.map((experience) =>
              experience.id === currentExperience.id
                ? nextExperience
                : experience
            )
          : [nextExperience, ...currentProfile.experiences]
      };
    });
  };

  const updateExperienceList = (
    field: "responsibilities" | "achievements",
    value: string
  ) => {
    setProfile((currentProfile) => {
      const currentExperience = getEditableExperience(
        currentProfile.experiences,
        activeExperienceId
      );
      const nextExperience = {
        ...currentExperience,
        [field]: splitLines(value)
      };

      return {
        ...currentProfile,
        experiences: currentProfile.experiences.some(
          (experience) => experience.id === currentExperience.id
        )
          ? currentProfile.experiences.map((experience) =>
              experience.id === currentExperience.id
                ? nextExperience
                : experience
            )
          : [nextExperience, ...currentProfile.experiences]
      };
    });
  };

  const addExperience = () => {
    const nextExperience = createEmptyExperience();

    setProfile((currentProfile) => ({
      ...currentProfile,
      experiences: [...currentProfile.experiences, nextExperience]
    }));
    setActiveExperienceId(nextExperience.id);
  };

  const removeExperience = (id: string) => {
    setProfile((currentProfile) => {
      const remaining = currentProfile.experiences.filter(
        (experience) => experience.id !== id
      );

      return {
        ...currentProfile,
        experiences: remaining.length > 0 ? remaining : [createEmptyExperience()]
      };
    });
  };

  const updateSkillItems = (
    field: SkillField,
    update: (items: string[]) => string[]
  ) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      skills: {
        ...currentProfile.skills,
        [field]: update(currentProfile.skills[field])
      }
    }));
  };

  const renameSkill = (field: SkillField, index: number, value: string) => {
    updateSkillItems(field, (items) =>
      items.map((item, itemIndex) => (itemIndex === index ? value : item))
    );
  };

  const cleanSkillField = (field: SkillField) => {
    updateSkillItems(field, normalizeList);
  };

  const removeSkill = (field: SkillField, index: number) => {
    updateSkillItems(field, (items) =>
      items.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const addSkill = (field: SkillField) => {
    const nextItems = splitList(skillDrafts[field]);

    if (nextItems.length === 0) {
      return;
    }

    updateSkillItems(field, (items) => normalizeList([...items, ...nextItems]));
    setSkillDrafts((currentDrafts) => ({
      ...currentDrafts,
      [field]: ""
    }));
  };

  const updateSkillDraft = (field: SkillField, value: string) => {
    setSkillDrafts((currentDrafts) => ({
      ...currentDrafts,
      [field]: value
    }));
  };

  const addEducation = () => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      education: [...currentProfile.education, createEmptyEducation()]
    }));
  };

  const updateEducation = (
    id: string,
    field: keyof Omit<Education, "id" | "details" | "confidence">,
    value: string
  ) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      education: currentProfile.education.map((education) =>
        education.id === id ? { ...education, [field]: value } : education
      )
    }));
  };

  const updateEducationDetails = (id: string, value: string) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      education: currentProfile.education.map((education) =>
        education.id === id
          ? { ...education, details: splitLines(value) }
          : education
      )
    }));
  };

  const removeEducation = (id: string) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      education: currentProfile.education.filter(
        (education) => education.id !== id
      )
    }));
  };

  const addCertificate = () => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      certificates: [...currentProfile.certificates, createEmptyCertificate()]
    }));
  };

  const updateCertificate = (
    id: string,
    field: keyof Omit<Certificate, "id" | "confidence">,
    value: string
  ) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      certificates: currentProfile.certificates.map((certificate) =>
        certificate.id === id
          ? { ...certificate, [field]: value }
          : certificate
      )
    }));
  };

  const removeCertificate = (id: string) => {
    setProfile((currentProfile) => ({
      ...currentProfile,
      certificates: currentProfile.certificates.filter(
        (certificate) => certificate.id !== id
      )
    }));
  };

  const sectionBadge = (sectionId: ProfileSectionId): string => {
    switch (sectionId) {
      case "personal":
        return profile.personalInfo.fullName ? "Name vorhanden" : "Offen";
      case "experience":
        return `${profile.experiences.length} Einträge`;
      case "skills":
        return `${skillCount} Skills`;
      case "education":
        return `${profile.education.length} Einträge`;
      case "certificates":
        return `${profile.certificates.length} Einträge`;
      case "quality":
        return hasExtractionConcerns ? "Prüfen" : "Keine Hinweise";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const now = new Date().toISOString();
    const project: ApplicationProject = selectedProject
      ? {
          ...selectedProject,
          title: buildProjectTitle(profile, selectedProject.title),
          status: "profile_reviewed",
          updatedAt: now,
          candidateProfile: profile
        }
      : {
          id: createId(),
          title: buildProjectTitle(profile),
          status: "profile_reviewed",
          createdAt: now,
          updatedAt: now,
          candidateProfile: profile
        };

    await saveProject(project);
    setSavedMessage("Profil lokal gespeichert");
  };

  return (
    <AppShell
      metrics={[
        { label: "Projektstatus", value: "Profilprüfung" },
        { label: "Vollständigkeit", value: `${completion}%` },
        { label: "Speicher", value: "Lokal" }
      ]}
      title="Kandidatenprofil"
    >
      <form className="grid gap-6" onSubmit={handleSubmit}>
        <Panel className="p-0">
          <div className="grid grid-cols-[minmax(0,1fr)_18rem] gap-6 border-b border-slate-200 p-5">
            <div className="flex items-center gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-action text-base font-semibold text-white shadow-sm">
                {avatarLetters(fullName)}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-slate-950">
                  {fullName}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editableExperience.role || "Rolle ergänzen"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.skills.technical.slice(0, 5).map((skill) => (
                    <button
                      className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 transition hover:border-action hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
                      key={skill}
                      onClick={() => setActiveSection("skills")}
                      type="button"
                    >
                      {skill}
                    </button>
                  ))}
                  {profile.skills.technical.length === 0 ? (
                    <button
                      className="rounded-md border border-dashed border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-500 transition hover:border-action hover:text-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
                      onClick={() => setActiveSection("skills")}
                      type="button"
                    >
                      Skills ergänzen
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>{completion}% vollständig</span>
                <span>{skillCount} Skills</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-action"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <StatusPill
                  active={Boolean(profile.personalInfo.email)}
                  label="Kontakt"
                />
                <StatusPill
                  active={Boolean(editableExperience.role)}
                  label="Erfahrung"
                />
                <StatusPill active={skillCount > 0} label="Skills" />
                <StatusPill active={!hasExtractionConcerns} label="LLM" />
              </div>
            </div>
          </div>

          <div
            className="grid grid-cols-6 gap-3 p-5"
            role="tablist"
            aria-label="Profilbereiche"
          >
            {profileSections.map((section) => (
              <SectionButton
                active={activeSection === section.id}
                ariaLabel={section.ariaLabel}
                badge={sectionBadge(section.id)}
                icon={section.icon}
                key={section.id}
                label={section.label}
                onClick={() => setActiveSection(section.id)}
              />
            ))}
          </div>
        </Panel>

        {activeSection === "personal" ? (
          <Panel
            description="Kontaktdaten und Kurzprofil werden später direkt in Lebenslauf und Anschreiben übernommen."
            title="Kontaktdaten und Zusammenfassung"
          >
            <div className="grid grid-cols-2 gap-4">
              <FieldLabel label="Vollständiger Name">
                <input
                  className={inputClassName}
                  onChange={(event) =>
                    updatePersonalInfo("fullName", event.target.value)
                  }
                  value={profile.personalInfo.fullName ?? ""}
                />
              </FieldLabel>

              <FieldLabel label="E-Mail">
                <input
                  className={inputClassName}
                  onChange={(event) =>
                    updatePersonalInfo("email", event.target.value)
                  }
                  type="email"
                  value={profile.personalInfo.email ?? ""}
                />
              </FieldLabel>

              <FieldLabel label="Telefon">
                <input
                  className={inputClassName}
                  onChange={(event) =>
                    updatePersonalInfo("phone", event.target.value)
                  }
                  value={profile.personalInfo.phone ?? ""}
                />
              </FieldLabel>

              <FieldLabel label="Ort">
                <input
                  className={inputClassName}
                  onChange={(event) =>
                    updatePersonalInfo("location", event.target.value)
                  }
                  value={profile.personalInfo.location ?? ""}
                />
              </FieldLabel>

              <FieldLabel label="Website">
                <input
                  className={inputClassName}
                  onChange={(event) =>
                    updatePersonalInfo("website", event.target.value)
                  }
                  value={profile.personalInfo.website ?? ""}
                />
              </FieldLabel>

              <FieldLabel label="LinkedIn">
                <input
                  className={inputClassName}
                  onChange={(event) =>
                    updatePersonalInfo("linkedin", event.target.value)
                  }
                  value={profile.personalInfo.linkedin ?? ""}
                />
              </FieldLabel>
            </div>

            <div className="mt-4">
              <FieldLabel label="Kurzprofil">
                <textarea
                  className={textareaClassName}
                  onChange={(event) =>
                    setProfile((currentProfile) => ({
                      ...currentProfile,
                      summary: event.target.value
                    }))
                  }
                  value={profile.summary ?? ""}
                />
              </FieldLabel>
            </div>
          </Panel>
        ) : null}

        {activeSection === "experience" ? (
          <Panel
            actions={
              <Button onClick={addExperience} size="sm" variant="secondary">
                <Icon className="size-4" name="plus" />
                Erfahrung
              </Button>
            }
            description="Rollen, Aufgaben und Ergebnisse bleiben als überprüfte Fakten erhalten."
            title="Berufserfahrung"
          >
            <div className="grid grid-cols-[16rem_minmax(0,1fr)] gap-5">
              <div className="grid content-start gap-2">
                {profile.experiences.map((experience, index) => (
                  <button
                    className={classNames(
                      "rounded-md border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action",
                      editableExperience.id === experience.id
                        ? "border-indigo-200 bg-indigo-50"
                        : "border-slate-200 bg-white hover:border-indigo-200"
                    )}
                    key={experience.id}
                    onClick={() => setActiveExperienceId(experience.id)}
                    type="button"
                  >
                    <span className="block text-sm font-semibold text-slate-950">
                      {experience.role || `Erfahrung ${index + 1}`}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {experience.company || "Unternehmen offen"}
                    </span>
                  </button>
                ))}
              </div>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <FieldLabel label="Rolle">
                    <input
                      className={inputClassName}
                      onChange={(event) =>
                        updateExperience("role", event.target.value)
                      }
                      value={editableExperience.role ?? ""}
                    />
                  </FieldLabel>

                  <FieldLabel label="Unternehmen">
                    <input
                      className={inputClassName}
                      onChange={(event) =>
                        updateExperience("company", event.target.value)
                      }
                      value={editableExperience.company ?? ""}
                    />
                  </FieldLabel>

                  <FieldLabel label="Ort">
                    <input
                      className={inputClassName}
                      onChange={(event) =>
                        updateExperience("location", event.target.value)
                      }
                      value={editableExperience.location ?? ""}
                    />
                  </FieldLabel>

                  <div className="grid grid-cols-2 gap-4">
                    <FieldLabel label="Start">
                      <input
                        className={inputClassName}
                        onChange={(event) =>
                          updateExperience("startDate", event.target.value)
                        }
                        value={editableExperience.startDate ?? ""}
                      />
                    </FieldLabel>

                    <FieldLabel label="Ende">
                      <input
                        className={inputClassName}
                        onChange={(event) =>
                          updateExperience("endDate", event.target.value)
                        }
                        value={editableExperience.endDate ?? ""}
                      />
                    </FieldLabel>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FieldLabel label="Beschreibung">
                    <textarea
                      className={textareaClassName}
                      onChange={(event) =>
                        updateExperience("description", event.target.value)
                      }
                      value={editableExperience.description ?? ""}
                    />
                  </FieldLabel>

                  <FieldLabel label="Aufgaben">
                    <textarea
                      className={textareaClassName}
                      onChange={(event) =>
                        updateExperienceList(
                          "responsibilities",
                          event.target.value
                        )
                      }
                      value={joinLines(editableExperience.responsibilities)}
                    />
                  </FieldLabel>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => removeExperience(editableExperience.id)}
                    size="sm"
                    variant="ghost"
                  >
                    <Icon className="size-4" name="trash" />
                    Entfernen
                  </Button>
                </div>
              </div>
            </div>
          </Panel>
        ) : null}

        {activeSection === "skills" ? (
          <Panel
            description="Präzise Skill-Gruppen verbessern Lebenslauf, Anschreiben und Rollenfokus."
            title="Fähigkeiten bearbeiten"
          >
            <div className="grid gap-4">
              {(Object.keys(skillConfigs) as SkillField[]).map((field) => (
                <SkillEditor
                  draft={skillDrafts[field]}
                  field={field}
                  items={profile.skills[field]}
                  key={field}
                  onAdd={addSkill}
                  onClean={cleanSkillField}
                  onDraftChange={updateSkillDraft}
                  onRemove={removeSkill}
                  onRename={renameSkill}
                />
              ))}
            </div>
          </Panel>
        ) : null}

        {activeSection === "education" ? (
          <Panel
            actions={
              <Button onClick={addEducation} size="sm" variant="secondary">
                <Icon className="size-4" name="plus" />
                Ausbildung
              </Button>
            }
            description="Ausbildung, Studium und Weiterbildungen können hier korrigiert oder ergänzt werden."
            title="Ausbildung"
          >
            {profile.education.length > 0 ? (
              <div className="grid gap-4">
                {profile.education.map((education, index) => (
                  <div
                    className="rounded-md border border-slate-200 bg-slate-50/70 p-4"
                    key={education.id}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-950">
                        Ausbildung {index + 1}
                      </h3>
                      <Button
                        onClick={() => removeEducation(education.id)}
                        size="sm"
                        variant="ghost"
                      >
                        <Icon className="size-4" name="trash" />
                        Entfernen
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FieldLabel label="Institution">
                        <input
                          className={inputClassName}
                          onChange={(event) =>
                            updateEducation(
                              education.id,
                              "institution",
                              event.target.value
                            )
                          }
                          value={education.institution ?? ""}
                        />
                      </FieldLabel>
                      <FieldLabel label="Abschluss">
                        <input
                          className={inputClassName}
                          onChange={(event) =>
                            updateEducation(
                              education.id,
                              "degree",
                              event.target.value
                            )
                          }
                          value={education.degree ?? ""}
                        />
                      </FieldLabel>
                      <FieldLabel label="Fachrichtung">
                        <input
                          className={inputClassName}
                          onChange={(event) =>
                            updateEducation(
                              education.id,
                              "field",
                              event.target.value
                            )
                          }
                          value={education.field ?? ""}
                        />
                      </FieldLabel>
                      <FieldLabel label="Ort">
                        <input
                          className={inputClassName}
                          onChange={(event) =>
                            updateEducation(
                              education.id,
                              "location",
                              event.target.value
                            )
                          }
                          value={education.location ?? ""}
                        />
                      </FieldLabel>
                      <FieldLabel label="Start">
                        <input
                          className={inputClassName}
                          onChange={(event) =>
                            updateEducation(
                              education.id,
                              "startDate",
                              event.target.value
                            )
                          }
                          value={education.startDate ?? ""}
                        />
                      </FieldLabel>
                      <FieldLabel label="Ende">
                        <input
                          className={inputClassName}
                          onChange={(event) =>
                            updateEducation(
                              education.id,
                              "endDate",
                              event.target.value
                            )
                          }
                          value={education.endDate ?? ""}
                        />
                      </FieldLabel>
                    </div>
                    <div className="mt-4">
                      <FieldLabel label="Details">
                        <textarea
                          className={textareaClassName}
                          onChange={(event) =>
                            updateEducationDetails(
                              education.id,
                              event.target.value
                            )
                          }
                          value={joinLines(education.details)}
                        />
                      </FieldLabel>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptySection
                actionLabel="Ausbildung hinzufügen"
                icon="graduation"
                onAction={addEducation}
                title="Noch keine Ausbildung gespeichert"
              />
            )}
          </Panel>
        ) : null}

        {activeSection === "certificates" ? (
          <Panel
            actions={
              <Button onClick={addCertificate} size="sm" variant="secondary">
                <Icon className="size-4" name="plus" />
                Zertifikat
              </Button>
            }
            description="Zertifikate und Nachweise bleiben getrennt editierbar."
            title="Zertifikate"
          >
            {profile.certificates.length > 0 ? (
              <div className="grid gap-4">
                {profile.certificates.map((certificate, index) => (
                  <div
                    className="rounded-md border border-slate-200 bg-slate-50/70 p-4"
                    key={certificate.id}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-950">
                        Zertifikat {index + 1}
                      </h3>
                      <Button
                        onClick={() => removeCertificate(certificate.id)}
                        size="sm"
                        variant="ghost"
                      >
                        <Icon className="size-4" name="trash" />
                        Entfernen
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FieldLabel label="Name">
                        <input
                          className={inputClassName}
                          onChange={(event) =>
                            updateCertificate(
                              certificate.id,
                              "name",
                              event.target.value
                            )
                          }
                          value={certificate.name ?? ""}
                        />
                      </FieldLabel>
                      <FieldLabel label="Aussteller">
                        <input
                          className={inputClassName}
                          onChange={(event) =>
                            updateCertificate(
                              certificate.id,
                              "issuer",
                              event.target.value
                            )
                          }
                          value={certificate.issuer ?? ""}
                        />
                      </FieldLabel>
                      <FieldLabel label="Ausgestellt">
                        <input
                          className={inputClassName}
                          onChange={(event) =>
                            updateCertificate(
                              certificate.id,
                              "issueDate",
                              event.target.value
                            )
                          }
                          value={certificate.issueDate ?? ""}
                        />
                      </FieldLabel>
                      <FieldLabel label="Gültig bis">
                        <input
                          className={inputClassName}
                          onChange={(event) =>
                            updateCertificate(
                              certificate.id,
                              "expirationDate",
                              event.target.value
                            )
                          }
                          value={certificate.expirationDate ?? ""}
                        />
                      </FieldLabel>
                      <FieldLabel label="Credential ID">
                        <input
                          className={inputClassName}
                          onChange={(event) =>
                            updateCertificate(
                              certificate.id,
                              "credentialId",
                              event.target.value
                            )
                          }
                          value={certificate.credentialId ?? ""}
                        />
                      </FieldLabel>
                      <FieldLabel label="URL">
                        <input
                          className={inputClassName}
                          onChange={(event) =>
                            updateCertificate(
                              certificate.id,
                              "url",
                              event.target.value
                            )
                          }
                          value={certificate.url ?? ""}
                        />
                      </FieldLabel>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptySection
                actionLabel="Zertifikat hinzufügen"
                icon="award"
                onAction={addCertificate}
                title="Noch keine Zertifikate gespeichert"
              />
            )}
          </Panel>
        ) : null}

        {activeSection === "quality" ? (
          <Panel
            className={
              hasExtractionConcerns ? "border-amber-200 bg-amber-50/80" : ""
            }
            description="Felder mit geringer Sicherheit sollten vor der Dokumenterstellung überprüft werden."
            title="LLM-Hinweise"
          >
            {uncertainFields.length > 0 ? (
              <div className="grid gap-2">
                <h3 className="text-sm font-semibold text-amber-950">
                  Unsichere Felder
                </h3>
                <ul className="grid gap-2 text-sm text-amber-950">
                  {uncertainFields.map((field) => (
                    <li
                      className="rounded-md border border-amber-200 bg-white px-3 py-2"
                      key={field}
                    >
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                Keine unsicheren Felder gemeldet.
              </p>
            )}

            {warnings.length > 0 ? (
              <div className="mt-4 grid gap-2">
                <h3 className="text-sm font-semibold text-amber-950">
                  Warnungen
                </h3>
                {warnings.map((warning) => (
                  <p
                    className="rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-amber-950"
                    key={warning}
                  >
                    {warning}
                  </p>
                ))}
              </div>
            ) : null}
          </Panel>
        ) : null}

        <div className="sticky bottom-4 z-10 flex flex-row items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/95 p-4 shadow-panel backdrop-blur">
          <p className="text-sm text-slate-600">
            Änderungen werden lokal im aktuellen Projekt gespeichert.
          </p>
          <Button disabled={isLoading} type="submit">
            <Icon className="size-4" name="check" />
            Profil speichern
          </Button>
        </div>

        {savedMessage ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
            {savedMessage}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-900">
            Speichern fehlgeschlagen
          </p>
        ) : null}
      </form>
    </AppShell>
  );
}

function StatusPill({
  active,
  label
}: Readonly<{ active: boolean; label: string }>) {
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-semibold",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-50 text-slate-500"
      )}
    >
      <span
        className={classNames(
          "size-1.5 rounded-full",
          active ? "bg-emerald-500" : "bg-slate-300"
        )}
      />
      {label}
    </span>
  );
}

function EmptySection({
  actionLabel,
  icon,
  onAction,
  title
}: Readonly<{
  actionLabel: string;
  icon: IconName;
  onAction: () => void;
  title: string;
}>) {
  return (
    <div className="grid justify-items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-white text-slate-500">
        <Icon className="size-5" name={icon} />
      </span>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <Button onClick={onAction} size="sm" variant="secondary">
        <Icon className="size-4" name="plus" />
        {actionLabel}
      </Button>
    </div>
  );
}
