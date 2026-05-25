"use client";

import { FormEvent, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
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
  const editableExperience = getEditableExperience(profile.experiences);
  const uncertainFields = profile.extractionMeta?.uncertainFields ?? [];
  const warnings = profile.extractionMeta?.warnings ?? [];
  const hasExtractionConcerns =
    uncertainFields.length > 0 || warnings.length > 0;

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
        { label: "Current task", value: "TASK-010" },
        { label: "Storage", value: "Local only" }
      ]}
      title="Profile"
    >
      <form className="grid gap-6" onSubmit={handleSubmit}>
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-1 border-b border-slate-200 pb-4">
            <h2 className="text-base font-semibold text-slate-950">
              Personal information
            </h2>
            <p className="text-sm text-slate-600">
              Review the extracted contact data before generating documents.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
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
              className="min-h-28 resize-y rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-action"
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

          <div className="mt-5 grid gap-4 md:grid-cols-2">
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

            <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Experience description
              <textarea
                className="min-h-28 resize-y rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-action"
                onChange={(event) =>
                  updateExperience("description", event.target.value)
                }
                value={editableExperience.description ?? ""}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Responsibilities
              <textarea
                className="min-h-28 resize-y rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-action"
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
              Keep comma-separated skill lists ready for matching and generation.
            </p>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Technical skills
              <textarea
                className="min-h-24 resize-y rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-action"
                onChange={(event) =>
                  updateSkillField(
                    "technical",
                    event.target.value,
                    setTechnicalSkills
                  )
                }
                value={technicalSkills}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Soft skills
              <textarea
                className="min-h-24 resize-y rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-action"
                onChange={(event) =>
                  updateSkillField("soft", event.target.value, setSoftSkills)
                }
                value={softSkills}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Tools
              <textarea
                className="min-h-24 resize-y rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-action"
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

        <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
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
