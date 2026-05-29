"use client";

import { FormEvent, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel } from "@/components/ui/Panel";
import { useProjectStore } from "@/stores/project-store";
import type { JobLanguage, JobTone } from "@/types/job";
import type { ApplicationProject } from "@/types/project";

const createId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const optionalValue = (value: string): string | undefined => {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

const createProjectTitle = (
  title: string,
  company: string,
  description: string
): string => {
  const trimmedTitle = title.trim();
  const trimmedCompany = company.trim();

  if (trimmedTitle && trimmedCompany) {
    return `${trimmedTitle} at ${trimmedCompany}`;
  }

  if (trimmedTitle) {
    return trimmedTitle;
  }

  if (trimmedCompany) {
    return trimmedCompany;
  }

  const firstLine = description.trim().split("\n")[0]?.trim();

  if (!firstLine) {
    return "Imported job posting";
  }

  return firstLine.length > 48 ? `${firstLine.slice(0, 48)}...` : firstLine;
};

export function JobScreen() {
  const { error, isLoading, projects, saveProject, selectedProjectId } =
    useProjectStore();
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const initialJobTarget = selectedProject?.jobTarget;

  const [jobTitle, setJobTitle] = useState(initialJobTarget?.title ?? "");
  const [company, setCompany] = useState(initialJobTarget?.company ?? "");
  const [location, setLocation] = useState(initialJobTarget?.location ?? "");
  const [jobDescription, setJobDescription] = useState(
    initialJobTarget?.jobDescription ?? ""
  );
  const [language, setLanguage] = useState<JobLanguage>(
    initialJobTarget?.language ?? "de"
  );
  const [tone, setTone] = useState<JobTone>(
    initialJobTarget?.tone ?? "professional"
  );
  const [savedMessage, setSavedMessage] = useState<string | undefined>();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedDescription = jobDescription.trim();
    if (!trimmedDescription) {
      setSavedMessage(undefined);
      return;
    }

    const now = new Date().toISOString();
    const project: ApplicationProject = {
      id: selectedProject?.id ?? createId(),
      title:
        selectedProject?.title ??
        createProjectTitle(jobTitle, company, trimmedDescription),
      status: "job_imported",
      createdAt: selectedProject?.createdAt ?? now,
      updatedAt: now,
      rawInput: selectedProject?.rawInput,
      candidateProfile: selectedProject?.candidateProfile,
      jobTarget: {
        id: selectedProject?.jobTarget?.id ?? createId(),
        title: optionalValue(jobTitle),
        company: optionalValue(company),
        location: optionalValue(location),
        jobDescription: trimmedDescription,
        language,
        tone
      },
      jobAnalysis: selectedProject?.jobAnalysis,
      generatedDocuments: selectedProject?.generatedDocuments,
      designSettings: selectedProject?.designSettings,
      exportHistory: selectedProject?.exportHistory
    };

    await saveProject(project);
    setSavedMessage("Job saved locally");
  };

  return (
    <AppShell
      metrics={[
        { label: "Project status", value: "Target role" },
        { label: "Purpose", value: "Tailor documents" },
        { label: "Storage", value: "Local only" }
      ]}
      title="Target Role"
    >
      <form className="grid gap-6" onSubmit={handleSubmit}>
        <Panel
          description="Paste the job description when you want the CV and cover letter to emphasize the most relevant verified experience."
          title="Role context for tailoring"
        >
          <div className="mb-5 grid gap-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-3 text-sm leading-6 text-blue-950">
            <p className="font-semibold">What this step does</p>
            <p>
              The job text is used to identify priorities, language, and role
              signals for the documents. It does not replace the candidate
              profile and it must not introduce facts the candidate did not
              provide.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Job title
              <input
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-action"
                onChange={(event) => setJobTitle(event.target.value)}
                value={jobTitle}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Company
              <input
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-action"
                onChange={(event) => setCompany(event.target.value)}
                value={company}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Location
              <input
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-action"
                onChange={(event) => setLocation(event.target.value)}
                value={location}
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Language
                <select
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-action"
                  onChange={(event) =>
                    setLanguage(event.target.value as JobLanguage)
                  }
                  value={language}
                >
                  <option value="de">German</option>
                  <option value="en">English</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Tone
                <select
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-action"
                  onChange={(event) => setTone(event.target.value as JobTone)}
                  value={tone}
                >
                  <option value="professional">Professional</option>
                  <option value="modern">Modern</option>
                  <option value="conservative">Conservative</option>
                  <option value="confident">Confident</option>
                </select>
              </label>
            </div>
          </div>

          <label className="mt-5 grid gap-2 text-sm font-medium text-slate-700">
            Job description
            <textarea
              className="min-h-72 resize-none rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-action"
              onChange={(event) => setJobDescription(event.target.value)}
              value={jobDescription}
            />
          </label>

          <div className="mt-5 flex flex-row items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <p className="text-sm leading-6 text-slate-600">
              Output: local tailoring context for the CV and cover letter.
            </p>
            <button
              className="h-10 rounded-md bg-action px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isLoading || jobDescription.trim().length === 0}
              type="submit"
            >
              Save target role
            </button>
          </div>

          {savedMessage ? (
            <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
              {savedMessage}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-900">
              Save failed
            </p>
          ) : null}
        </Panel>
      </form>
    </AppShell>
  );
}
