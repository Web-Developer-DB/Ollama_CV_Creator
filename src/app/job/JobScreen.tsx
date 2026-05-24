"use client";

import { FormEvent, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
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
        { label: "Project status", value: "Job import" },
        { label: "Current task", value: "TASK-011" },
        { label: "Storage", value: "Local only" }
      ]}
      title="Job"
    >
      <form
        className="grid gap-5 rounded-md border border-slate-200 bg-white p-5"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 md:grid-cols-2">
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

          <div className="grid gap-4 sm:grid-cols-2">
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

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Job description
          <textarea
            className="min-h-72 resize-y rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-action"
            onChange={(event) => setJobDescription(event.target.value)}
            value={jobDescription}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Job details are kept with the current local project.
          </p>
          <button
            className="h-10 rounded-md bg-action px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={isLoading || jobDescription.trim().length === 0}
            type="submit"
          >
            Save job
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
