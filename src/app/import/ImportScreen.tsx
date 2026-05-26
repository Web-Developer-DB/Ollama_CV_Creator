"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { readStoredModel } from "@/lib/ai/selected-model";
import { sampleCandidateContext } from "@/lib/demo/sample-candidate-context";
import { useProjectStore } from "@/stores/project-store";
import type { ApiResponse } from "@/types/api";
import type { CandidateProfile } from "@/types/profile";
import type { ApplicationProject, RawInputSourceType } from "@/types/project";

type ImportLanguage = "de" | "en";

type OllamaStatusSummary = {
  configuredModel: string;
  reachable: boolean;
  selectedModelAvailable: boolean;
  selectedModelLoaded: boolean;
  error?: string;
};

type AiReadinessCheck =
  | {
      ready: true;
      model?: string;
    }
  | {
      ready: false;
      message: string;
    };

const isAiAvailabilityErrorCode = (code: string | undefined): boolean =>
  code === "AI_MODEL_NOT_READY" ||
  code === "OLLAMA_UNAVAILABLE" ||
  code === "AI_TIMEOUT";

const checkAiReadiness = async (): Promise<AiReadinessCheck> => {
  try {
    const selectedModel = readStoredModel();
    const statusUrl = selectedModel
      ? `/api/ai/status?model=${encodeURIComponent(selectedModel)}`
      : "/api/ai/status";
    const response = await fetch(statusUrl, {
      cache: "no-store"
    });
    const payload = (await response.json()) as ApiResponse<OllamaStatusSummary>;

    if (!response.ok || !payload.success || !payload.data) {
      return {
        ready: false,
        message:
          payload.error?.message ??
          "Could not verify the Ollama model status. Open AI Status and try again."
      };
    }

    const status = payload.data;
    const model = selectedModel ?? status.configuredModel;
    const modelLabel = model || "the selected model";

    if (!status.reachable) {
      return {
        ready: false,
        message:
          "Ollama is not reachable. Open AI Status, start Ollama, then try extraction again."
      };
    }

    if (!status.selectedModelAvailable) {
      return {
        ready: false,
        message: `Ollama model ${modelLabel} is not installed. Open AI Status, install or select an available model, then try extraction again.`
      };
    }

    if (!status.selectedModelLoaded) {
      return {
        ready: false,
        message: `Ollama model ${modelLabel} is installed but not loaded. Open AI Status, load the model in Ollama, then try extraction again.`
      };
    }

    return { ready: true, model };
  } catch {
    return {
      ready: false,
      message:
        "Could not verify the Ollama model status. Open AI Status and try again."
    };
  }
};

const createId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createProjectTitle = (
  text: string,
  candidateProfile?: CandidateProfile
): string => {
  const fullName = candidateProfile?.personalInfo.fullName?.trim();

  if (fullName) {
    return fullName;
  }

  const firstLine = text.trim().split("\n")[0]?.trim();

  if (!firstLine) {
    return "Imported candidate text";
  }

  return firstLine.length > 48 ? `${firstLine.slice(0, 48)}...` : firstLine;
};

export function ImportScreen() {
  const { error, isLoading, projects, saveProject, selectedProjectId } =
    useProjectStore();
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const [rawText, setRawText] = useState(
    () => selectedProject?.rawInput?.text ?? sampleCandidateContext
  );
  const [language, setLanguage] = useState<ImportLanguage>(
    () => selectedProject?.rawInput?.language ?? "de"
  );
  const [sourceType, setSourceType] =
    useState<RawInputSourceType>(
      () => selectedProject?.rawInput?.sourceType ?? "manual_text"
    );
  const [savedMessage, setSavedMessage] = useState<string | undefined>();
  const [extractError, setExtractError] = useState<string | undefined>();
  const [showAiStatusLink, setShowAiStatusLink] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const createProject = (
    trimmedText: string,
    now: string,
    status: ApplicationProject["status"],
    candidateProfile?: CandidateProfile
  ): ApplicationProject => ({
      id: selectedProject?.id ?? createId(),
      title: candidateProfile
        ? createProjectTitle(trimmedText, candidateProfile)
        : selectedProject?.title ?? createProjectTitle(trimmedText),
      status,
      createdAt: selectedProject?.createdAt ?? now,
      updatedAt: now,
      rawInput: {
        id: selectedProject?.rawInput?.id ?? createId(),
        sourceType,
        text: trimmedText,
        language,
        createdAt: selectedProject?.rawInput?.createdAt ?? now
      },
      candidateProfile: candidateProfile ?? selectedProject?.candidateProfile,
      jobTarget: selectedProject?.jobTarget,
      jobAnalysis: selectedProject?.jobAnalysis,
      generatedDocuments: selectedProject?.generatedDocuments,
      designSettings: selectedProject?.designSettings,
      exportHistory: selectedProject?.exportHistory
    });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedText = rawText.trim();
    if (!trimmedText) {
      setSavedMessage(undefined);
      return;
    }

    const now = new Date().toISOString();
    const project = createProject(trimmedText, now, "text_imported");

    await saveProject(project);
    setExtractError(undefined);
    setShowAiStatusLink(false);
    setSavedMessage("Candidate context saved locally");
  };

  const handleExtractProfile = async () => {
    const trimmedText = rawText.trim();
    if (!trimmedText) {
      setSavedMessage(undefined);
      setExtractError("Candidate context is required");
      setShowAiStatusLink(false);
      return;
    }

    setIsExtracting(true);
    setSavedMessage(undefined);
    setExtractError(undefined);
    setShowAiStatusLink(false);

    try {
      const readiness = await checkAiReadiness();

      if (!readiness.ready) {
        setExtractError(readiness.message);
        setShowAiStatusLink(true);
        return;
      }

      const response = await fetch("/api/ai/extract-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: trimmedText,
          language,
          model: readiness.model
        })
      });
      const payload = (await response.json()) as ApiResponse<CandidateProfile>;

      if (!response.ok || !payload.success || !payload.data) {
        if (isAiAvailabilityErrorCode(payload.error?.code)) {
          setShowAiStatusLink(true);
        }

        throw new Error(payload.error?.message ?? "Profile extraction failed");
      }

      const now = new Date().toISOString();
      const project = createProject(
        trimmedText,
        now,
        "profile_extracted",
        payload.data
      );

      await saveProject(project);
      setSavedMessage("Profile extracted and saved locally");
      setShowAiStatusLink(false);
    } catch (extractProfileError) {
      setExtractError(
        extractProfileError instanceof Error
          ? extractProfileError.message
          : "Profile extraction failed"
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleResetDemoContext = () => {
    setRawText(sampleCandidateContext);
    setLanguage("de");
    setSourceType("manual_text");
    setSavedMessage(undefined);
    setExtractError(undefined);
    setShowAiStatusLink(false);
  };

  const actionDisabled = isLoading || isExtracting || rawText.trim().length === 0;

  return (
    <AppShell
      metrics={[
        { label: "Project status", value: "Candidate intake" },
        { label: "Next step", value: "Extract profile" },
        { label: "Storage", value: "Local first" }
      ]}
      title="Candidate Intake"
    >
      <form className="grid gap-6" onSubmit={handleSubmit}>
        <Panel
          actions={
            <Button onClick={handleResetDemoContext} variant="secondary">
              Load demo
            </Button>
          }
          description="Paste an existing CV, LinkedIn text, notes, or project context. The extraction step creates an editable candidate profile for CV generation; job matching stays separate."
          title="Candidate context"
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
                <option value="manual_text">Candidate notes</option>
                <option value="old_cv">Existing CV</option>
                <option value="linkedin_text">LinkedIn profile</option>
                <option value="project_notes">Project notes</option>
              </select>
            </label>
          </div>

          <label className="mt-5 grid gap-2 text-sm font-medium text-slate-700">
            Candidate context
            <textarea
              className="min-h-96 resize-y rounded-md border border-slate-300 px-3 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-action"
              onChange={(event) => setRawText(event.target.value)}
              value={rawText}
            />
          </label>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-600">
              Use the demo text or replace it. Extracting creates a profile that
              can be reviewed and edited on the Profile page.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={actionDisabled} type="submit" variant="secondary">
                Save context
              </Button>
              <Button
                disabled={actionDisabled}
                onClick={handleExtractProfile}
                type="button"
              >
                {isExtracting ? "Extracting" : "Extract profile"}
              </Button>
            </div>
          </div>

          {savedMessage ? (
            <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
              {savedMessage}
            </p>
          ) : null}
          {extractError ? (
            <div
              className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-900"
              role="alert"
            >
              <p>{extractError}</p>
              {showAiStatusLink ? (
                <Link
                  className="mt-2 inline-flex text-sm font-semibold text-red-950 underline underline-offset-4"
                  href="/ai"
                >
                  Open AI Status
                </Link>
              ) : null}
            </div>
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
