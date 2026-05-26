"use client";

import { FormEvent, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel } from "@/components/ui/Panel";
import { useProjectStore } from "@/stores/project-store";
import type {
  GeneratedCoverLetter,
  GeneratedCV,
  GeneratedDocuments
} from "@/types/documents";
import type { ApplicationProject } from "@/types/project";

const createId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const splitParagraphs = (value: string): string[] =>
  value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

const cvToText = (cv: GeneratedCV | undefined): string => {
  if (!cv) {
    return "";
  }

  const sectionText = cv.sections
    .flatMap((section) =>
      section.items.flatMap((item) => [
        item.title,
        item.subtitle,
        item.dateRange,
        item.body,
        ...item.bullets
      ])
    )
    .filter(Boolean)
    .join("\n");

  return [cv.summary, sectionText].filter(Boolean).join("\n\n");
};

const coverLetterToText = (
  coverLetter: GeneratedCoverLetter | undefined
): string => {
  if (!coverLetter) {
    return "";
  }

  return [
    coverLetter.opening,
    ...coverLetter.body,
    coverLetter.closing,
    coverLetter.signature
  ]
    .filter(Boolean)
    .join("\n\n");
};

const createCVFromText = (
  text: string,
  existingCV: GeneratedCV | undefined,
  now: string
): GeneratedCV => ({
  id: existingCV?.id ?? createId(),
  title: existingCV?.title ?? "Edited CV",
  language: existingCV?.language ?? "de",
  summary: text,
  sections:
    existingCV?.sections.length === 0 || !existingCV?.sections
      ? [
          {
            id: "draft-section",
            type: "custom",
            title: "Draft",
            items: [
              {
                id: "draft-item",
                body: text,
                bullets: []
              }
            ]
          }
        ]
      : existingCV.sections,
  meta: {
    ...existingCV?.meta,
    generatedAt: existingCV?.meta.generatedAt ?? now
  }
});

const createCoverLetterFromText = (
  text: string,
  existingCoverLetter: GeneratedCoverLetter | undefined,
  now: string
): GeneratedCoverLetter => {
  const paragraphs = splitParagraphs(text);
  const opening =
    paragraphs[0] ?? existingCoverLetter?.opening ?? "Draft cover letter";
  const closing =
    paragraphs.length > 1
      ? paragraphs[paragraphs.length - 1]
      : existingCoverLetter?.closing ?? "Sincerely,";

  return {
    id: existingCoverLetter?.id ?? createId(),
    language: existingCoverLetter?.language ?? "de",
    recipient: existingCoverLetter?.recipient,
    subject: existingCoverLetter?.subject,
    greeting: existingCoverLetter?.greeting,
    opening,
    body: paragraphs.slice(1, -1),
    closing,
    signature: existingCoverLetter?.signature,
    meta: {
      ...existingCoverLetter?.meta,
      generatedAt: existingCoverLetter?.meta.generatedAt ?? now
    }
  };
};

export function DocumentsScreen() {
  const { error, isLoading, projects, saveProject, selectedProjectId } =
    useProjectStore();
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const initialDocuments = selectedProject?.generatedDocuments;

  const [cvDraft, setCvDraft] = useState(() => cvToText(initialDocuments?.cv));
  const [coverLetterDraft, setCoverLetterDraft] = useState(() =>
    coverLetterToText(initialDocuments?.coverLetter)
  );
  const [savedMessage, setSavedMessage] = useState<string | undefined>();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const now = new Date().toISOString();
    const existingDocuments = selectedProject?.generatedDocuments;
    const nextDocuments: GeneratedDocuments = {
      cv: createCVFromText(cvDraft.trim(), existingDocuments?.cv, now),
      coverLetter: createCoverLetterFromText(
        coverLetterDraft.trim(),
        existingDocuments?.coverLetter,
        now
      )
    };
    const project: ApplicationProject = selectedProject
      ? {
          ...selectedProject,
          status: "documents_generated",
          updatedAt: now,
          generatedDocuments: nextDocuments
        }
      : {
          id: createId(),
          title: "Edited documents",
          status: "documents_generated",
          createdAt: now,
          updatedAt: now,
          generatedDocuments: nextDocuments
        };

    await saveProject(project);
    setSavedMessage("Documents saved locally");
  };

  return (
    <AppShell
      metrics={[
        { label: "Project status", value: "Writing" },
        { label: "Document set", value: "CV + letter" },
        { label: "Storage", value: "Local only" }
      ]}
      title="Write Documents"
    >
      <form className="grid gap-6" onSubmit={handleSubmit}>
        <Panel
          description="Edit the generated wording before choosing the final visual design. Keep facts accurate; use the target role only to decide emphasis and tone."
          title="Professional application drafts"
        >
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Source
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                Verified profile data
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Optional focus
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                Target role tailoring
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Next step
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                Choose visual design
              </p>
            </div>
          </div>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <label className="grid gap-2 rounded-md border border-slate-200 bg-white p-5 text-sm font-medium text-slate-700">
            CV draft
            <textarea
              className="min-h-96 resize-y rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-action"
              onChange={(event) => setCvDraft(event.target.value)}
              value={cvDraft}
            />
          </label>

          <label className="grid gap-2 rounded-md border border-slate-200 bg-white p-5 text-sm font-medium text-slate-700">
            Cover letter draft
            <textarea
              className="min-h-96 resize-y rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-action"
              onChange={(event) => setCoverLetterDraft(event.target.value)}
              value={coverLetterDraft}
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Draft edits are saved to the selected local project.
          </p>
          <button
            className="h-10 rounded-md bg-action px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={isLoading}
            type="submit"
          >
            Save documents
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
