import type { ReactNode } from "react";
import { Header, type HeaderMetric } from "./Header";
import { Sidebar } from "./Sidebar";

type AppShellProps = Readonly<{
  title: string;
  children: ReactNode;
  metrics?: HeaderMetric[];
}>;

const defaultMetrics: HeaderMetric[] = [
  { label: "Project status", value: "No project loaded" },
  { label: "Current task", value: "TASK-006" },
  { label: "Progress", value: "App layout" }
];

export function AppShell({
  title,
  children,
  metrics = defaultMetrics
}: AppShellProps) {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <Header metrics={metrics} title={title} />

        <div className="grid flex-1 gap-6 py-6 lg:grid-cols-[220px_1fr]">
          <Sidebar />
          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </main>
  );
}
