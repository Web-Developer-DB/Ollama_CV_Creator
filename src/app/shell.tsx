import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { routeItems } from "@/components/layout/Sidebar";

export { routeItems };

type ShellFrameProps = Readonly<{
  title: string;
  children: ReactNode;
}>;

export function ShellFrame({ title, children }: ShellFrameProps) {
  return <AppShell title={title}>{children}</AppShell>;
}

export function DashboardScreen() {
  return (
    <ShellFrame title="Dashboard">
      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard label="Project status" value="No project loaded" />
        <DashboardCard label="Storage" value="IndexedDB ready" />
        <DashboardCard label="AI backend" value="Not connected" />
      </div>

      <div className="mt-6 rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Current progress</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500">Task</dt>
            <dd className="mt-1 text-base font-semibold">TASK-006</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">State</dt>
            <dd className="mt-1 text-base font-semibold">App layout</dd>
          </div>
        </dl>
      </div>
    </ShellFrame>
  );
}

type DashboardCardProps = Readonly<{
  label: string;
  value: string;
}>;

function DashboardCard({ label, value }: DashboardCardProps) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
    </article>
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
