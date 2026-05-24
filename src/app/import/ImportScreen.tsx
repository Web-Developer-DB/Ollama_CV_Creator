"use client";

import { FormEvent, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { useProjectStore } from "@/stores/project-store";
import type { ApplicationProject, RawInputSourceType } from "@/types/project";

type ImportLanguage = "de" | "en";

const createId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createProjectTitle = (text: string): string => {
  const firstLine = text.trim().split("\n")[0]?.trim();

  if (!firstLine) {
    return "Imported candidate text";
  }

  return firstLine.length > 48 ? `${firstLine.slice(0, 48)}...` : firstLine;
};

export function ImportScreen() {
  const [rawText, setRawText] = useState("");
  const [language, setLanguage] = useState<ImportLanguage>("de");
  const [sourceType, setSourceType] =
    useState<RawInputSourceType>("manual_text");
  const [savedMessage, setSavedMessage] = useState<string | undefined>();
  const { error, isLoading, projects, saveProject, selectedProjectId } =
    useProjectStore();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedText = rawText.trim();
    if (!trimmedText) {
      setSavedMessage(undefined);
      return;
    }

    const existingProject =
      projects.find((project) => project.id === selectedProjectId) ??
      projects[0];
    const now = new Date().toISOString();
    const project: ApplicationProject = {
      id: existingProject?.id ?? createId(),
      title: existingProject?.title ?? createProjectTitle(trimmedText),
      status: "text_imported",
      createdAt: existingProject?.createdAt ?? now,
      updatedAt: now,
      rawInput: {
        id: existingProject?.rawInput?.id ?? createId(),
        sourceType,
        text: trimmedText,
        language,
        createdAt: existingProject?.rawInput?.createdAt ?? now
      },
      candidateProfile: existingProject?.candidateProfile,
      jobTarget: existingProject?.jobTarget,
      jobAnalysis: existingProject?.jobAnalysis,
      generatedDocuments: existingProject?.generatedDocuments,
      designSettings: existingProject?.designSettings,
      exportHistory: existingProject?.exportHistory
    };

    await saveProject(project);
    setSavedMessage("Raw input saved locally");
  };

  return (
    <AppShell
      metrics={[
        { label: "Project status", value: "Import" },
        { label: "Current task", value: "TASK-007" },
        { label: "Storage", value: "Local only" }
      ]}
      title="Import"
    >
      <form
        className="grid gap-5 rounded-md border border-slate-200 bg-white p-5"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Language
            <select
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-action"
              onChange={(event) =>
                setLanguage(event.target.value as ImportLanguage)
              }
              value={language}
            >
              <option value="de">German</option>
              <option value="en">English</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Source
            <select
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-action"
              onChange={(event) =>
                setSourceType(event.target.value as RawInputSourceType)
              }
              value={sourceType}
            >
              <option value="manual_text">Manual text</option>
              <option value="old_cv">Old CV</option>
              <option value="linkedin_text">LinkedIn text</option>
              <option value="project_notes">Project notes</option>
            </select>
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Raw candidate text
          <textarea
            className="min-h-72 resize-y rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-action"
            onChange={(event) => setRawText(event.target.value)}
            placeholder="Paste candidate notes, an old CV, LinkedIn text, or project notes."
            value={rawText}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Text is stored locally. AI extraction is a later step.
          </p>
          <button
            className="h-10 rounded-md bg-action px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={isLoading || rawText.trim().length === 0}
            type="submit"
          >
            Save import
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
