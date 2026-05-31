"use client";

import { FormEvent, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Panel } from "@/components/ui/Panel";
import {
  analyzeJob,
  generateCoverLetter,
  generateCv
} from "@/lib/api/ai-client";
import { useProjectStore } from "@/stores/project-store";
import type {
  GeneratedCoverLetter,
  GeneratedCV,
  GeneratedDocuments
} from "@/types/documents";
import type { JobAnalysis } from "@/types/job";
import type { ApplicationProject } from "@/types/project";
import type { TemplateStyle } from "@/types/templates";

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

const toGenerationErrorMessage = (fallback: string, error: unknown): string =>
  error instanceof Error ? error.message : fallback;

const hasTargetRole = (project: ApplicationProject | undefined): boolean =>
  Boolean(project?.jobTarget?.jobDescription.trim());

const hasProfile = (project: ApplicationProject | undefined): boolean =>
  Boolean(project?.candidateProfile);

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
  const [generationError, setGenerationError] = useState<string | undefined>();
  const [activeGeneration, setActiveGeneration] = useState<
    | "general_cv"
    | "tailored_cv"
    | "general_cover_letter"
    | "tailored_cover_letter"
    | undefined
  >();

  const resolveDocumentLanguage = (): "de" | "en" =>
    selectedProject?.jobTarget?.language ??
    selectedProject?.candidateProfile?.extractionMeta?.language ??
    "de";

  const resolveTemplateStyle = (): TemplateStyle =>
    selectedProject?.designSettings?.template ?? "modern";

  const saveGeneratedDocuments = async (
    documents: Partial<GeneratedDocuments>,
    jobAnalysis?: JobAnalysis
  ) => {
    if (!selectedProject) {
      throw new Error("No local project is selected");
    }

    const now = new Date().toISOString();
    const nextDocuments = {
      ...selectedProject.generatedDocuments,
      ...documents
    };

    await saveProject({
      ...selectedProject,
      status: "documents_generated",
      updatedAt: now,
      jobAnalysis: jobAnalysis ?? selectedProject.jobAnalysis,
      generatedDocuments: nextDocuments
    });
  };

  const ensureJobAnalysis = async (): Promise<JobAnalysis> => {
    if (selectedProject?.jobAnalysis) {
      return selectedProject.jobAnalysis;
    }

    const jobTarget = selectedProject?.jobTarget;
    if (!jobTarget?.jobDescription.trim()) {
      throw new Error("Add a target role before creating tailored documents");
    }

    const payload = await analyzeJob({
      jobDescription: jobTarget.jobDescription,
      language: jobTarget.language
    });

    if (!payload.success || !payload.data) {
      throw new Error(payload.error?.message ?? "Job analysis failed");
    }

    return payload.data;
  };

  const handleGenerateGeneralCv = async () => {
    if (!selectedProject?.candidateProfile) {
      setGenerationError("Review or extract a candidate profile first");
      return;
    }

    setActiveGeneration("general_cv");
    setGenerationError(undefined);
    setSavedMessage(undefined);

    try {
      const payload = await generateCv({
        candidateProfile: selectedProject.candidateProfile,
        options: {
          language: resolveDocumentLanguage(),
          length: "one_page",
          style: resolveTemplateStyle()
        }
      });

      if (!payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? "CV generation failed");
      }

      await saveGeneratedDocuments({ cv: payload.data });
      setCvDraft(cvToText(payload.data));
      setSavedMessage("General CV generated and saved locally");
    } catch (error) {
      setGenerationError(
        toGenerationErrorMessage("CV generation failed", error)
      );
    } finally {
      setActiveGeneration(undefined);
    }
  };

  const handleGenerateTailoredCv = async () => {
    if (!selectedProject?.candidateProfile) {
      setGenerationError("Review or extract a candidate profile first");
      return;
    }

    if (!selectedProject.jobTarget?.jobDescription.trim()) {
      setGenerationError("Add a target role before creating a tailored CV");
      return;
    }

    setActiveGeneration("tailored_cv");
    setGenerationError(undefined);
    setSavedMessage(undefined);

    try {
      const jobAnalysis = await ensureJobAnalysis();
      const payload = await generateCv({
        candidateProfile: selectedProject.candidateProfile,
        jobTarget: selectedProject.jobTarget,
        jobAnalysis,
        options: {
          language: selectedProject.jobTarget.language,
          length: "one_page",
          style: resolveTemplateStyle()
        }
      });

      if (!payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? "Tailored CV generation failed");
      }

      await saveGeneratedDocuments({ cv: payload.data }, jobAnalysis);
      setCvDraft(cvToText(payload.data));
      setSavedMessage("Tailored CV generated and saved locally");
    } catch (error) {
      setGenerationError(
        toGenerationErrorMessage("Tailored CV generation failed", error)
      );
    } finally {
      setActiveGeneration(undefined);
    }
  };

  const handleGenerateGeneralCoverLetter = async () => {
    if (!selectedProject?.candidateProfile) {
      setGenerationError("Review or extract a candidate profile first");
      return;
    }

    setActiveGeneration("general_cover_letter");
    setGenerationError(undefined);
    setSavedMessage(undefined);

    try {
      const payload = await generateCoverLetter({
        candidateProfile: selectedProject.candidateProfile,
        options: {
          language: resolveDocumentLanguage(),
          tone: selectedProject.jobTarget?.tone ?? "professional"
        }
      });

      if (!payload.success || !payload.data) {
        throw new Error(
          payload.error?.message ?? "Cover letter generation failed"
        );
      }

      await saveGeneratedDocuments({
        coverLetter: payload.data
      });
      setCoverLetterDraft(coverLetterToText(payload.data));
      setSavedMessage("General cover letter generated and saved locally");
    } catch (error) {
      setGenerationError(
        toGenerationErrorMessage("Cover letter generation failed", error)
      );
    } finally {
      setActiveGeneration(undefined);
    }
  };

  const handleGenerateTailoredCoverLetter = async () => {
    if (!selectedProject?.candidateProfile) {
      setGenerationError("Review or extract a candidate profile first");
      return;
    }

    if (!selectedProject.jobTarget?.jobDescription.trim()) {
      setGenerationError("Add a target role before creating a cover letter");
      return;
    }

    setActiveGeneration("tailored_cover_letter");
    setGenerationError(undefined);
    setSavedMessage(undefined);

    try {
      const jobAnalysis = await ensureJobAnalysis();
      const payload = await generateCoverLetter({
        candidateProfile: selectedProject.candidateProfile,
        jobTarget: selectedProject.jobTarget,
        jobAnalysis,
        options: {
          language: selectedProject.jobTarget.language,
          tone: selectedProject.jobTarget.tone
        }
      });

      if (!payload.success || !payload.data) {
        throw new Error(
          payload.error?.message ?? "Cover letter generation failed"
        );
      }

      await saveGeneratedDocuments(
        {
          coverLetter: payload.data
        },
        jobAnalysis
      );
      setCoverLetterDraft(coverLetterToText(payload.data));
      setSavedMessage("Tailored cover letter generated and saved locally");
    } catch (error) {
      setGenerationError(
        toGenerationErrorMessage("Cover letter generation failed", error)
      );
    } finally {
      setActiveGeneration(undefined);
    }
  };

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
    setGenerationError(undefined);
  };

  const isGenerating = Boolean(activeGeneration);
  const canGenerateFromProfile = hasProfile(selectedProject) && !isGenerating;
  const canGenerateWithTarget =
    hasProfile(selectedProject) && hasTargetRole(selectedProject) && !isGenerating;
  const profileName =
    selectedProject?.candidateProfile?.personalInfo.fullName ??
    selectedProject?.title ??
    "No profile selected";
  const targetLabel = selectedProject?.jobTarget?.title
    ? [
        selectedProject.jobTarget.title,
        selectedProject.jobTarget.company
      ]
        .filter(Boolean)
        .join(" at ")
    : "No target role";

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
          description="Create a CV or cover letter from the reviewed profile. Target role context is optional and only changes emphasis; it never adds new facts."
          title="Document creation studio"
        >
          <div className="grid grid-cols-4 gap-3">
            {[
              "Profile",
              "Document",
              "Context",
              "Edit"
            ].map((step, index) => (
              <div
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3"
                key={step}
              >
                <p className="text-xs font-semibold uppercase text-slate-500">
                  {index + 1}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {step}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Profile source
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {hasProfile(selectedProject) ? profileName : "Profile required"}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {hasProfile(selectedProject)
                  ? "Ready for document generation"
                  : "Extract or review a profile first"}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Target context
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {targetLabel}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {hasTargetRole(selectedProject)
                  ? "Tailored documents available"
                  : "Optional for general CVs and letters"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-200 pt-5">
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-950">
                General CV
              </p>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
                Create a strong one-page CV from the verified profile without a
                target role.
              </p>
              <button
                className="mt-4 h-10 w-full rounded-md bg-action px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!canGenerateFromProfile}
                onClick={handleGenerateGeneralCv}
                type="button"
              >
                {activeGeneration === "general_cv"
                  ? "Creating CV..."
                  : "Create general CV"}
              </button>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-950">
                Tailored CV
              </p>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
                Analyze the saved job description if needed and emphasize the
                most relevant verified experience.
              </p>
              <button
                className="mt-4 h-10 w-full rounded-md bg-action px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!canGenerateWithTarget}
                onClick={handleGenerateTailoredCv}
                type="button"
              >
                {activeGeneration === "tailored_cv"
                  ? "Creating tailored CV..."
                  : "Create tailored CV"}
              </button>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-950">
                General cover letter
              </p>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
                Create a reusable letter from verified profile facts without a
                company or job description.
              </p>
              <button
                className="mt-4 h-10 w-full rounded-md bg-action px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!canGenerateFromProfile}
                onClick={handleGenerateGeneralCoverLetter}
                type="button"
              >
                {activeGeneration === "general_cover_letter"
                  ? "Creating letter..."
                  : "Create general letter"}
              </button>
            </div>

            <div className="rounded-md border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-950">
                Tailored cover letter
              </p>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">
                Generate a concise letter for the saved company and role using
                only profile facts.
              </p>
              <button
                className="mt-4 h-10 w-full rounded-md bg-action px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!canGenerateWithTarget}
                onClick={handleGenerateTailoredCoverLetter}
                type="button"
              >
                {activeGeneration === "tailored_cover_letter"
                  ? "Creating letter..."
                  : "Create tailored letter"}
              </button>
            </div>
          </div>

          {!hasProfile(selectedProject) ? (
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
              Extract or review a candidate profile before generating documents.
            </p>
          ) : null}
          {hasProfile(selectedProject) && !hasTargetRole(selectedProject) ? (
            <p className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-950">
              General CV and general cover letter are ready. Add a target role
              to generate tailored documents.
            </p>
          ) : null}
          {generationError ? (
            <div
              className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-950"
              role="alert"
            >
              <p className="font-semibold">
                Dokument konnte nicht erstellt werden
              </p>
              <p className="mt-1 leading-6">{generationError}</p>
              <p className="mt-2 text-xs font-medium text-red-800">
                Prüfe den AI Status, ob Ollama erreichbar ist und ein Modell
                geladen ist. Bei einem Timeout kann ein kleineres Modell helfen.
              </p>
            </div>
          ) : null}
        </Panel>

        <div className="grid grid-cols-2 gap-6">
          <label className="grid gap-2 rounded-md border border-slate-200 bg-white p-5 text-sm font-medium text-slate-700">
            CV draft
            <textarea
              className="min-h-96 resize-none rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-action"
              onChange={(event) => setCvDraft(event.target.value)}
              value={cvDraft}
            />
          </label>

          <label className="grid gap-2 rounded-md border border-slate-200 bg-white p-5 text-sm font-medium text-slate-700">
            Cover letter draft
            <textarea
              className="min-h-96 resize-none rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-action"
              onChange={(event) => setCoverLetterDraft(event.target.value)}
              value={coverLetterDraft}
            />
          </label>
        </div>

        <div className="flex flex-row items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-4">
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
