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
    <main className="min-h-screen overflow-x-hidden bg-paper px-3 py-3 text-ink">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-[1510px] grid-cols-[244px_minmax(0,1fr)] overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-window">
        <Sidebar />
        <section className="min-w-0 bg-slate-50/60 px-8 py-7">
          <Header metrics={metrics} title={title} />
          <div className="mt-6 min-w-0">{children}</div>
        </section>
      </div>
    </main>
  );
}
