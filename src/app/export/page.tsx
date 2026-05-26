"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Panel } from "@/components/ui/Panel";
import { useProjectStore } from "@/stores/project-store";

const readinessValue = (ready: boolean): string => (ready ? "Ready" : "Missing");

export default function ExportPage() {
  const { projects, selectedProjectId } = useProjectStore();
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const hasProfile = Boolean(selectedProject?.candidateProfile);
  const hasDocuments = Boolean(selectedProject?.generatedDocuments);
  const hasDesign = Boolean(selectedProject?.designSettings?.template);
  const exportReady = hasProfile && hasDocuments && hasDesign;

  return (
    <AppShell
      metrics={[
        { label: "Project status", value: exportReady ? "Export ready" : "Draft" },
        { label: "Output", value: "PDF package" },
        { label: "Storage", value: "Local only" }
      ]}
      title="Export Package"
    >
      <div className="grid gap-6">
        <Panel
          description="Final export will produce the polished CV, cover letter, and project data from the current local project."
          title="Final application package"
        >
          <dl className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <dt className="text-xs font-semibold uppercase text-slate-500">
                Candidate profile
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-950">
                {readinessValue(hasProfile)}
              </dd>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <dt className="text-xs font-semibold uppercase text-slate-500">
                Documents
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-950">
                {readinessValue(hasDocuments)}
              </dd>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
              <dt className="text-xs font-semibold uppercase text-slate-500">
                Design
              </dt>
              <dd className="mt-1 text-sm font-semibold text-slate-950">
                {readinessValue(hasDesign)}
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-600">
              PDF export is enabled after the document renderer and desktop
              export service are completed.
            </p>
            <button
              className="h-10 rounded-md bg-action px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled
              type="button"
            >
              Export PDF
            </button>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
