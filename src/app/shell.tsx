import type { ReactNode } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { routeItems } from "@/components/layout/Sidebar";
import {
  tailoringSteps,
  workflowSteps
} from "@/lib/workflow/application-workflow";
import type { HeaderMetric } from "@/components/layout/Header";

export { routeItems };

type ShellFrameProps = Readonly<{
  title: string;
  children: ReactNode;
  metrics?: HeaderMetric[];
}>;

export function ShellFrame({ title, children, metrics }: ShellFrameProps) {
  return (
    <AppShell metrics={metrics} title={title}>
      {children}
    </AppShell>
  );
}

export function DashboardScreen() {
  const firstStep = workflowSteps[0];

  return (
    <ShellFrame
      metrics={[
        { label: "Project status", value: "Ready to create" },
        { label: "First step", value: "Candidate context" },
        { label: "AI model", value: "Local Ollama" }
      ]}
      title="Application documents"
    >
      <div className="grid gap-6">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-panel">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
            <div>
              <Badge tone="info">Local document assistant</Badge>
              <h2 className="mt-3 text-xl font-semibold text-slate-950">
                Build a professional CV and cover letter from real experience
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Start with unstructured notes, CV text, LinkedIn content, or
                project history. The local model turns it into verified profile
                facts, then the app helps write, design, and export polished
                application documents. A job description is optional context for
                tailoring, not the final product.
              </p>
            </div>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md bg-action px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
              href={firstStep.href}
            >
              Start with experience
            </Link>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Panel
            description="Follow these steps when creating the main application package."
            title="Document creation workflow"
          >
            <ol className="grid gap-3">
              {workflowSteps.map((step) => (
                <li
                  className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-[2rem_minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center"
                  key={step.href}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-950 text-sm font-semibold text-white">
                    {step.step}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {step.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {step.label}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Dependency
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {step.dependency}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">
                      Output
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {step.outcome}
                    </p>
                  </div>
                  <Link
                    className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
                    href={step.href}
                  >
                    Open {step.label}
                  </Link>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel
            description="These checks decide whether generation and export can produce useful output."
            title="Readiness"
          >
            <dl className="grid gap-3">
              <ReadinessItem label="Candidate text" value="Required first" />
              <ReadinessItem label="Profile" value="Created from import" />
              <ReadinessItem label="Target job" value="Optional tailoring" />
              <ReadinessItem label="LLM model" value="Check AI Status" />
              <ReadinessItem label="Design" value="Selected before export" />
            </dl>
          </Panel>
        </div>

        <Panel
          description="Use this branch when the CV and cover letter should speak directly to a specific role. It supports document writing; it is not the end product."
          title="Role tailoring"
        >
          <div className="grid gap-3 md:grid-cols-2">
            {tailoringSteps.map((step) => (
              <Link
                className="rounded-md border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
                href={step.href}
                key={step.href}
              >
                <span className="text-xs font-semibold uppercase text-slate-500">
                  {step.step}
                </span>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {step.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {step.dependency}
                </p>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </ShellFrame>
  );
}

type ReadinessItemProps = Readonly<{
  label: string;
  value: string;
}>;

function ReadinessItem({ label, value }: ReadinessItemProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <dt className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

type PlaceholderScreenProps = Readonly<{
  title: string;
  status?: string;
}>;

export function PlaceholderScreen({
  title,
  status = "Not started"
}: PlaceholderScreenProps) {
  return (
    <ShellFrame title={title}>
      <div className="rounded-md border border-slate-200 bg-white p-5">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500">Status</dt>
            <dd className="mt-1 text-base font-semibold">{status}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Runtime</dt>
            <dd className="mt-1 text-base font-semibold">
              No backend activity
            </dd>
          </div>
        </dl>
      </div>
    </ShellFrame>
  );
}
