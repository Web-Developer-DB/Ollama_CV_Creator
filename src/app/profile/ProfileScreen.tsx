"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { useProjectStore } from "@/stores/project-store";
import type {
  CandidateProfile,
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

const joinList = (items: string[]): string => items.join(", ");

const splitList = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const splitLines = (value: string): string[] =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const getEditableExperience = (
  experiences: WorkExperience[]
): WorkExperience => experiences[0] ?? createEmptyExperience();

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
  const checks = [
    profile.personalInfo.fullName,
    profile.personalInfo.email,
    profile.personalInfo.location,
    profile.summary,
    getEditableExperience(profile.experiences).role,
    getEditableExperience(profile.experiences).company,
    profile.skills.technical.length > 0 ? "technical" : undefined,
    profile.skills.soft.length > 0 ? "soft" : undefined
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

function SkillChips({ items }: Readonly<{ items: string[] }>) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">Noch keine Einträge.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge className="border-indigo-100 bg-indigo-50/80" key={item}>
          {item}
        </Badge>
      ))}
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
  const [technicalSkills, setTechnicalSkills] = useState(() =>
    joinList(initialProfile.skills.technical)
  );
  const [softSkills, setSoftSkills] = useState(() =>
    joinList(initialProfile.skills.soft)
  );
  const [toolSkills, setToolSkills] = useState(() =>
    joinList(initialProfile.skills.tools)
  );
  const [responsibilities, setResponsibilities] = useState(() =>
    getEditableExperience(initialProfile.experiences).responsibilities.join("\n")
  );
  const [savedMessage, setSavedMessage] = useState<string | undefined>();
  const technicalSkillsRef = useRef<HTMLTextAreaElement>(null);
  const softSkillsRef = useRef<HTMLTextAreaElement>(null);
  const editableExperience = getEditableExperience(profile.experiences);
  const uncertainFields = profile.extractionMeta?.uncertainFields ?? [];
  const warnings = profile.extractionMeta?.warnings ?? [];
  const hasExtractionConcerns =
    uncertainFields.length > 0 || warnings.length > 0;
  const completion = calculateProfileCompletion(profile);
  const fullName = profile.personalInfo.fullName ?? "Max Mustermann";

  useEffect(() => {
    const nextProfile =
      selectedProject?.candidateProfile ?? createEmptyProfile();

    setProfile(nextProfile);
    setTechnicalSkills(joinList(nextProfile.skills.technical));
    setSoftSkills(joinList(nextProfile.skills.soft));
    setToolSkills(joinList(nextProfile.skills.tools));
    setResponsibilities(
      getEditableExperience(nextProfile.experiences).responsibilities.join("\n")
    );
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
      const currentExperience = getEditableExperience(currentProfile.experiences);
      const nextExperience = {
        ...currentExperience,
        [field]: value
      };

      return {
        ...currentProfile,
        experiences: [
          nextExperience,
          ...currentProfile.experiences.filter(
            (experience) => experience.id !== currentExperience.id
          )
        ]
      };
    });
  };

  const updateResponsibilities = (value: string) => {
    setResponsibilities(value);
    setProfile((currentProfile) => {
      const currentExperience = getEditableExperience(currentProfile.experiences);
      const nextExperience = {
        ...currentExperience,
        responsibilities: splitLines(value)
      };

      return {
        ...currentProfile,
        experiences: [
          nextExperience,
          ...currentProfile.experiences.filter(
            (experience) => experience.id !== currentExperience.id
          )
        ]
      };
    });
  };

  const updateSkillField = (
    field: SkillField,
    value: string,
    setText: (value: string) => void
  ) => {
    setText(value);
    setProfile((currentProfile) => ({
      ...currentProfile,
      skills: {
        ...currentProfile.skills,
        [field]: splitList(value)
      }
    }));
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
    setSavedMessage("Profile saved locally");
  };

  return (
    <AppShell
      metrics={[
        { label: "Project status", value: "Profile review" },
        { label: "Purpose", value: "Verify facts" },
        { label: "Storage", value: "Local only" }
      ]}
      title="Candidate Profile"
    >
      <form className="grid gap-6" onSubmit={handleSubmit}>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-start justify-between gap-5 border-b border-slate-200 pb-5">
            <div className="flex items-center gap-4">
              <span className="flex size-14 items-center justify-center rounded-full bg-action text-base font-semibold text-white shadow-sm">
                {avatarLetters(fullName)}
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  {fullName}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editableExperience.role ?? "Software Developer"}
                </p>
              </div>
            </div>

            <div className="w-48">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>{completion}% vollständig</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-action"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-6 border-b border-slate-200 text-sm font-semibold text-slate-500">
            {["Überblick", "Erfahrung", "Fähigkeiten", "Ausbildung", "Zertifikate"].map(
              (tab) => (
                <span
                  className={`pb-3 ${
                    tab === "Fähigkeiten"
                      ? "border-b-2 border-action text-action"
                      : ""
                  }`}
                  key={tab}
                >
                  {tab}
                </span>
              )
            )}
          </div>

          <div className="mt-5 grid gap-5">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-950">
                  Technische Fähigkeiten
                </h3>
                <button
                  className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-action hover:bg-indigo-50"
                  onClick={() => technicalSkillsRef.current?.focus()}
                  type="button"
                >
                  + Hinzufügen
                </button>
              </div>
              <SkillChips items={profile.skills.technical.slice(0, 12)} />
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-950">
                  Soft Skills
                </h3>
                <button
                  className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-action hover:bg-indigo-50"
                  onClick={() => softSkillsRef.current?.focus()}
                  type="button"
                >
                  + Hinzufügen
                </button>
              </div>
              <SkillChips items={profile.skills.soft.slice(0, 10)} />
            </div>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
            <h2 className="text-base font-semibold text-slate-950">
              Personal information
            </h2>
            <p className="text-sm text-slate-600">
              Review the extracted contact data before generating documents.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Full name
              <input
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-action"
                onChange={(event) =>
                  updatePersonalInfo("fullName", event.target.value)
                }
                value={profile.personalInfo.fullName ?? ""}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Email
              <input
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-action"
                onChange={(event) =>
                  updatePersonalInfo("email", event.target.value)
                }
                type="email"
                value={profile.personalInfo.email ?? ""}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Phone
              <input
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-action"
                onChange={(event) =>
                  updatePersonalInfo("phone", event.target.value)
                }
                value={profile.personalInfo.phone ?? ""}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Location
              <input
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-action"
                onChange={(event) =>
                  updatePersonalInfo("location", event.target.value)
                }
                value={profile.personalInfo.location ?? ""}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Website
              <input
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-action"
                onChange={(event) =>
                  updatePersonalInfo("website", event.target.value)
                }
                value={profile.personalInfo.website ?? ""}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              LinkedIn
              <input
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-action"
                onChange={(event) =>
                  updatePersonalInfo("linkedin", event.target.value)
                }
                value={profile.personalInfo.linkedin ?? ""}
              />
            </label>
          </div>

          <label className="mt-4 grid gap-2 text-sm font-medium text-slate-700">
            Summary
            <textarea
              className="min-h-28 resize-none rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-action"
              onChange={(event) =>
                setProfile((currentProfile) => ({
                  ...currentProfile,
                  summary: event.target.value
                }))
              }
              value={profile.summary ?? ""}
            />
          </label>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
            <h2 className="text-base font-semibold text-slate-950">
              Primary experience
            </h2>
            <p className="text-sm text-slate-600">
              Edit the first extracted role and its core responsibilities.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Experience role
              <input
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-action"
                onChange={(event) =>
                  updateExperience("role", event.target.value)
                }
                value={editableExperience.role ?? ""}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Experience company
              <input
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-action"
                onChange={(event) =>
                  updateExperience("company", event.target.value)
                }
                value={editableExperience.company ?? ""}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Experience location
              <input
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-action"
                onChange={(event) =>
                  updateExperience("location", event.target.value)
                }
                value={editableExperience.location ?? ""}
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Start date
                <input
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-action"
                  onChange={(event) =>
                    updateExperience("startDate", event.target.value)
                  }
                  value={editableExperience.startDate ?? ""}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                End date
                <input
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-action"
                  onChange={(event) =>
                    updateExperience("endDate", event.target.value)
                  }
                  value={editableExperience.endDate ?? ""}
                />
              </label>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Experience description
              <textarea
                className="min-h-28 resize-none rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-action"
                onChange={(event) =>
                  updateExperience("description", event.target.value)
                }
                value={editableExperience.description ?? ""}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Responsibilities
              <textarea
                className="min-h-28 resize-none rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-action"
                onChange={(event) => updateResponsibilities(event.target.value)}
                value={responsibilities}
              />
            </label>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
            <h2 className="text-base font-semibold text-slate-950">Skills</h2>
            <p className="text-sm text-slate-600">
              Keep comma-separated skill lists ready for CV and cover letter
              writing.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Technical skills
              <textarea
                className="min-h-24 resize-none rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-action"
                onChange={(event) =>
                  updateSkillField(
                    "technical",
                    event.target.value,
                    setTechnicalSkills
                  )
                }
                ref={technicalSkillsRef}
                value={technicalSkills}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Soft skills
              <textarea
                className="min-h-24 resize-none rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-action"
                onChange={(event) =>
                  updateSkillField("soft", event.target.value, setSoftSkills)
                }
                ref={softSkillsRef}
                value={softSkills}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Tools
              <textarea
                className="min-h-24 resize-none rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-action"
                onChange={(event) =>
                  updateSkillField("tools", event.target.value, setToolSkills)
                }
                value={toolSkills}
              />
            </label>
          </div>
        </section>

        <section
          className={`rounded-md border p-5 ${
            hasExtractionConcerns
              ? "border-amber-200 bg-amber-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <h2
            className={`text-base font-semibold ${
              hasExtractionConcerns ? "text-amber-950" : "text-slate-950"
            }`}
          >
            Uncertain fields
          </h2>

          {uncertainFields.length > 0 ? (
            <ul className="mt-3 grid gap-2 text-sm text-amber-950">
              {uncertainFields.map((field) => (
                <li
                  className="rounded-md border border-amber-200 bg-white px-3 py-2"
                  key={field}
                >
                  {field}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              No uncertain fields were reported.
            </p>
          )}

          {warnings.length > 0 ? (
            <div className="mt-4 grid gap-2">
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
        </section>

        <div className="flex flex-row items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">
            Changes are saved locally to the current project.
          </p>
          <button
            className="h-10 rounded-md bg-action px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={isLoading}
            type="submit"
          >
            Save profile
          </button>
        </div>

        {savedMessage ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
            {savedMessage}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-900">
            Save failed
          </p>
        ) : null}
      </form>
    </AppShell>
  );
}
