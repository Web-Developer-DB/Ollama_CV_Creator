"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useProjectStore } from "@/stores/project-store";

type AnalysisListProps = Readonly<{
  title: string;
  items: string[];
  emptyText: string;
  accentClassName: string;
}>;

const formatScore = (score: number | undefined): string =>
  typeof score === "number" ? `${Math.round(score)}%` : "--";

function AnalysisList({
  title,
  items,
  emptyText,
  accentClassName
}: AnalysisListProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${accentClassName}`} />
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      </div>

      {items.length > 0 ? (
        <ul className="mt-4 grid gap-3">
          {items.map((item) => (
            <li
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-800"
              key={item}
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-600">{emptyText}</p>
      )}
    </section>
  );
}

export function AnalysisScreen() {
  const { projects, selectedProjectId } = useProjectStore();
  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const analysis = selectedProject?.jobAnalysis;
  const jobTarget = selectedProject?.jobTarget;

  return (
    <AppShell
      metrics={[
        { label: "Project status", value: "Job analysis" },
        { label: "Current task", value: "TASK-013" },
        { label: "Source", value: "Local project" }
      ]}
      title="Analysis"
    >
      {analysis ? (
        <div className="grid gap-6">
          <section className="rounded-md border border-slate-200 bg-white p-5">
            <div className="grid gap-5 md:grid-cols-[180px_1fr] md:items-center">
              <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-900">
                  Match score
                </p>
                <p className="mt-2 text-4xl font-semibold text-blue-950">
                  {formatScore(analysis.matchScore)}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-500">
                  Target role
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {jobTarget?.title ?? selectedProject.title}
                </h2>
                {jobTarget?.company ? (
                  <p className="mt-2 text-sm text-slate-600">
                    {jobTarget.company}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <AnalysisList
              accentClassName="bg-emerald-500"
              emptyText="No strengths recorded."
              items={analysis.strengths}
              title="Strengths"
            />
            <AnalysisList
              accentClassName="bg-amber-500"
              emptyText="No gaps recorded."
              items={analysis.gaps}
              title="Gaps"
            />
            <AnalysisList
              accentClassName="bg-blue-500"
              emptyText="No recommendations recorded."
              items={analysis.recommendations}
              title="Recommendations"
            />
          </div>
        </div>
      ) : (
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-950">
            No analysis available
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Import and analyze a job before reviewing match details.
          </p>
        </section>
      )}
    </AppShell>
  );
}
