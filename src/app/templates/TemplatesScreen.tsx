"use client";

// Screen for choosing the visual template and previewing generated documents.
// Template choice is presentation-only and does not change document facts.
import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Icon } from "@/components/ui/Icon";
import {
  DocumentTemplate,
  type DocumentPreviewMode,
  templateDefinitions
} from "@/components/templates/DocumentTemplate";
import { useProjectStore } from "@/stores/project-store";
import type { ApplicationProject } from "@/types/project";
import type { TemplateCategory, TemplateStyle } from "@/types/templates";

const previewModes: Array<{
  id: DocumentPreviewMode;
  label: string;
}> = [
  { id: "both", label: "Both" },
  { id: "cv", label: "CV" },
  { id: "cover_letter", label: "Cover letter" }
];

type TemplateCategoryFilter = "all" | TemplateCategory;

const categoryOptions: Array<{
  id: TemplateCategoryFilter;
  label: string;
}> = [
  { id: "all", label: "Alle Kategorien" },
  { id: "professional", label: "Professionell" },
  { id: "classic", label: "Klassisch" },
  { id: "technical", label: "Technisch" },
  { id: "compact", label: "Kompakt" }
];

const miniPreviewClassMap: Record<
  TemplateStyle,
  {
    header: string;
    primaryLine: string;
    secondaryLine: string;
    panel: string;
  }
> = {
  modern: {
    header: "bg-slate-950",
    primaryLine: "bg-blue-500",
    secondaryLine: "bg-slate-300",
    panel: "bg-blue-50"
  },
  classic: {
    header: "border-b border-stone-300 bg-white",
    primaryLine: "bg-stone-500",
    secondaryLine: "bg-stone-200",
    panel: "bg-stone-50"
  },
  minimal: {
    header: "bg-slate-100",
    primaryLine: "bg-slate-500",
    secondaryLine: "bg-slate-200",
    panel: "bg-slate-50"
  },
  executive: {
    header: "bg-emerald-950",
    primaryLine: "bg-emerald-500",
    secondaryLine: "bg-emerald-100",
    panel: "bg-emerald-50"
  },
  technical: {
    header: "border-b-4 border-cyan-500 bg-white",
    primaryLine: "bg-cyan-500",
    secondaryLine: "bg-cyan-100",
    panel: "bg-cyan-50"
  },
  compact: {
    header: "bg-amber-100",
    primaryLine: "bg-amber-500",
    secondaryLine: "bg-stone-200",
    panel: "bg-amber-50"
  }
};

const createId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isPreviewMode = (value: string | null): value is DocumentPreviewMode =>
  value === "both" || value === "cv" || value === "cover_letter";

const readInitialPreviewMode = (): DocumentPreviewMode => {
  if (typeof window === "undefined") {
    return "both";
  }

  const requestedPreviewMode = new URLSearchParams(window.location.search).get(
    "preview"
  );

  return isPreviewMode(requestedPreviewMode) ? requestedPreviewMode : "both";
};

function TemplateMiniPreview({
  template,
  selected
}: Readonly<{ selected: boolean; template: TemplateStyle }>) {
  const previewClasses = miniPreviewClassMap[template];

  return (
    <div
      className={`aspect-[4/5] rounded-md border bg-white p-3 ${
        selected ? "border-action" : "border-slate-200"
      }`}
    >
      <div className={`h-5 rounded-sm ${previewClasses.header}`} />
      <div className="mt-4 grid gap-2">
        <span className={`h-2 w-3/4 rounded-full ${previewClasses.primaryLine}`} />
        <span className={`h-2 w-1/2 rounded-full ${previewClasses.secondaryLine}`} />
        <span className={`h-2 w-2/3 rounded-full ${previewClasses.secondaryLine}`} />
      </div>
      <div className="mt-5 grid gap-2">
        <span className="h-1.5 rounded-full bg-slate-200" />
        <span className="h-1.5 rounded-full bg-slate-200" />
        <span className="h-1.5 w-5/6 rounded-full bg-slate-200" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <span className={`h-8 rounded-sm ${previewClasses.panel}`} />
        <span className={`h-8 rounded-sm ${previewClasses.panel}`} />
      </div>
    </div>
  );
}

export function TemplatesScreen() {
  const { error, isLoading, projects, saveProject, selectedProjectId } =
    useProjectStore();
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const hasGeneratedDocuments = Boolean(
    selectedProject?.generatedDocuments?.cv ||
      selectedProject?.generatedDocuments?.coverLetter
  );
  const hasCvDocument = Boolean(selectedProject?.generatedDocuments?.cv);
  const hasCoverLetterDocument = Boolean(
    selectedProject?.generatedDocuments?.coverLetter
  );
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateStyle>(
    selectedProject?.designSettings?.template ?? "modern"
  );
  const [previewMode, setPreviewMode] =
    useState<DocumentPreviewMode>(() => readInitialPreviewMode());
  const [selectedCategory, setSelectedCategory] =
    useState<TemplateCategoryFilter>("all");
  const [savedMessage, setSavedMessage] = useState<string | undefined>();
  const visibleTemplates =
    selectedCategory === "all"
      ? templateDefinitions
      : templateDefinitions.filter(
          (template) => template.category === selectedCategory
        );

  const handleSaveTemplate = async () => {
    const now = new Date().toISOString();
    const project: ApplicationProject = selectedProject
      ? {
          ...selectedProject,
          status: "template_selected",
          updatedAt: now,
          designSettings: {
            ...selectedProject.designSettings,
            template: selectedTemplate
          }
        }
      : {
          id: createId(),
          title: "Template selection",
          status: "template_selected",
          createdAt: now,
          updatedAt: now,
          designSettings: {
            template: selectedTemplate
          }
        };

    await saveProject(project);
    setSavedMessage("Template saved locally");
  };

  const handlePrint = (mode: DocumentPreviewMode) => {
    setPreviewMode(mode);

    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      window.print();
    });
  };

  return (
    <AppShell
      metrics={[
        { label: "Project status", value: "Design" },
        { label: "Document look", value: "A4 preview" },
        { label: "Template", value: selectedTemplate }
      ]}
      title="Document Design"
    >
      <div className="grid gap-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">
                Design-Vorlagen
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Wähle ein modernes DIN-A4-Design für Lebenslauf und Anschreiben.
              </p>
            </div>
            <label className="grid gap-2 text-xs font-semibold text-slate-500">
              Kategorie
              <select
                className="control-field w-48"
                onChange={(event) =>
                  setSelectedCategory(
                    event.target.value as TemplateCategoryFilter
                  )
                }
                value={selectedCategory}
              >
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {visibleTemplates.map((template) => {
              const isSelected = template.id === selectedTemplate;

              return (
                <button
                  aria-label={template.name}
                  aria-pressed={isSelected}
                  className={`rounded-lg border p-3 text-left transition ${
                    isSelected
                      ? "border-action bg-indigo-50/60 text-slate-950"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200"
                  }`}
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  type="button"
                >
                  <TemplateMiniPreview
                    selected={isSelected}
                    template={template.id}
                  />
                  <span className="mt-3 flex items-center justify-between gap-2">
                    <span>
                      <span className="block text-sm font-semibold">
                        {template.name}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                        {template.description}
                      </span>
                      <span className="mt-1 block text-xs font-medium text-slate-500">
                        {template.bestFor}
                      </span>
                    </span>
                    {isSelected ? (
                      <span className="flex size-5 items-center justify-center rounded-full bg-action text-xs font-semibold text-white">
                        ✓
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-2" data-print-hidden>
            {previewModes.map((mode) => {
              const isSelected = mode.id === previewMode;

              return (
                <button
                  aria-pressed={isSelected}
                  className={`h-9 rounded-md border px-3 text-sm font-medium ${
                    isSelected
                      ? "border-action bg-indigo-50 text-action"
                      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200"
                  }`}
                  key={mode.id}
                  onClick={() => setPreviewMode(mode.id)}
                  type="button"
                >
                  {mode.label}
                </button>
              );
            })}
          </div>

          {hasGeneratedDocuments ? (
            <div
              className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3"
              data-print-hidden
            >
              <p className="text-sm leading-6 text-slate-600">
                Drucke die aktuelle A4-Vorschau oder speichere sie im
                Druckdialog als PDF.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
                  disabled={!hasCvDocument}
                  onClick={() => handlePrint("cv")}
                  type="button"
                >
                  <Icon className="size-4" name="download" />
                  CV als PDF drucken
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
                  disabled={!hasCoverLetterDocument}
                  onClick={() => handlePrint("cover_letter")}
                  type="button"
                >
                  <Icon className="size-4" name="download" />
                  Anschreiben drucken
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-action px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={!hasGeneratedDocuments}
                  onClick={() => handlePrint("both")}
                  type="button"
                >
                  <Icon className="size-4" name="file" />
                  Alles drucken
                </button>
              </div>
            </div>
          ) : null}

          <div
            className="mt-4 flex flex-row items-center justify-between gap-3"
            data-print-hidden
          >
            <p className="text-sm text-slate-600">
              Selection is stored with the current local project.
            </p>
            <button
              className="h-10 rounded-md bg-action px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isLoading}
              onClick={handleSaveTemplate}
              type="button"
            >
              Save template
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
        </section>

        {hasGeneratedDocuments ? (
          <div data-print-root>
            <DocumentTemplate
              coverLetter={selectedProject?.generatedDocuments?.coverLetter}
              cv={selectedProject?.generatedDocuments?.cv}
              previewMode={previewMode}
              template={selectedTemplate}
            />
          </div>
        ) : (
          <section className="rounded-lg border border-blue-200 bg-blue-50 p-5 shadow-panel">
            <p className="text-xs font-semibold uppercase text-blue-700">
              Vorschau wartet auf Inhalt
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">
              Erstelle zuerst Dokumente
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
              Wähle hier schon ein Design aus. Die echte Druckvorschau erscheint,
              sobald ein allgemeiner oder angepasster CV beziehungsweise ein
              Anschreiben erzeugt wurde.
            </p>
            <Link
              className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-action px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
              href="/documents"
            >
              Dokumente erstellen
            </Link>
          </section>
        )}
      </div>
    </AppShell>
  );
}
