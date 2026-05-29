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
  { label: "Focus", value: "Application documents" },
  { label: "Runtime", value: "Local first" }
];

export function AppShell({
  title,
  children,
  metrics = defaultMetrics
}: AppShellProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-paper text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6">
        <Header metrics={metrics} title={title} />

        <div className="grid flex-1 grid-cols-[220px_minmax(0,1fr)] gap-6 py-6">
          <Sidebar />
          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </main>
  );
}
