"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  DocumentTemplate,
  templateDefinitions
} from "@/components/templates/DocumentTemplate";
import { useProjectStore } from "@/stores/project-store";
import type { ApplicationProject } from "@/types/project";
import type { TemplateStyle } from "@/types/templates";

const createId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function TemplatesScreen() {
  const { error, isLoading, projects, saveProject, selectedProjectId } =
    useProjectStore();
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateStyle>(
    selectedProject?.designSettings?.template ?? "modern"
  );
  const [savedMessage, setSavedMessage] = useState<string | undefined>();

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

  return (
    <AppShell
      metrics={[
        { label: "Project status", value: "Templates" },
        { label: "Current task", value: "TASK-017" },
        { label: "Template", value: selectedTemplate }
      ]}
      title="Templates"
    >
      <div className="grid gap-6">
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <div className="grid gap-3 md:grid-cols-3">
            {templateDefinitions.map((template) => {
              const isSelected = template.id === selectedTemplate;

              return (
                <button
                  aria-label={template.name}
                  aria-pressed={isSelected}
                  className={`rounded-md border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-action bg-blue-50 text-slate-950"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  type="button"
                >
                  <span className="block text-sm font-semibold">
                    {template.name}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">
                    {template.description}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Selection is stored with the current local project.
            </p>
            <button
              className="h-10 rounded-md bg-action px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
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

        <DocumentTemplate
          coverLetter={selectedProject?.generatedDocuments?.coverLetter}
          cv={selectedProject?.generatedDocuments?.cv}
          template={selectedTemplate}
        />
      </div>
    </AppShell>
  );
}
