import type { ReactNode } from "react";
import Link from "next/link";
import { DashboardAiStatus } from "@/components/dashboard/DashboardAiStatus";
import { AppShell } from "@/components/layout/AppShell";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { routeItems } from "@/components/layout/Sidebar";
import { workflowSteps } from "@/lib/workflow/application-workflow";
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
  const quickStartItems: Array<{
    href: string;
    icon: IconName;
    tone: string;
    title: string;
    description: string;
  }> = [
    {
      href: workflowSteps[0].href,
      icon: "user",
      tone: "border-indigo-200 bg-indigo-50 text-action",
      title: "Erfahrung sammeln",
      description: "Notizen, Text oder Dateien importieren"
    },
    {
      href: workflowSteps[1].href,
      icon: "clipboard",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
      title: "Profil überprüfen",
      description: "Verifizierte Profildaten ansehen"
    },
    {
      href: workflowSteps[2].href,
      icon: "edit",
      tone: "border-amber-200 bg-amber-50 text-amber-700",
      title: "Lebenslauf erstellen",
      description: "Neue Version generieren"
    },
    {
      href: "/documents",
      icon: "document",
      tone: "border-indigo-200 bg-indigo-50 text-action",
      title: "Anschreiben verfassen",
      description: "Für eine Zielrolle anpassen"
    }
  ];
  const activities = [
    "Lebenslauf \"Software Developer\" exportiert",
    "Anschreiben für \"Software Developer\" erstellt",
    "Profil aktualisiert",
    "Zertifikat \"AWS Solutions Architect\" hinzugefügt"
  ];

  return (
    <ShellFrame
      metrics={[
        { label: "Projektstatus", value: "Bereit", tone: "success" },
        { label: "Erster Schritt", value: "Kontext sammeln" },
        { label: "KI Modell", value: "Lokal (Ollama)" }
      ]}
      title="Dashboard"
    >
      <div className="grid gap-6">
        <div className="grid grid-cols-5 gap-4">
          <KpiCard label="Profil Vollständigkeit" value="72%" progress={72} />
          <KpiCard helper="+3 diese Woche" label="Dokumente" value="12" />
          <KpiCard helper="Vorlagen verfügbar" label="Lebensläufe" value="4" />
          <KpiCard helper="Generiert" label="Anschreiben" value="3" />
          <KpiCard helper="Diese Woche" label="Zuletzt exportiert" value="2" />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-5">
          <div className="grid grid-cols-2 gap-5">
            <Panel description="Wähle deinen nächsten Schritt" title="Schnellstart">
              <div className="grid gap-3">
                {quickStartItems.map((item) => (
                  <Link
                    className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-3 transition hover:border-indigo-200 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
                    href={item.href}
                    key={item.title}
                  >
                    <span
                      className={`flex size-9 items-center justify-center rounded-full border ${item.tone}`}
                    >
                      <Icon className="size-4" name={item.icon} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-950">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {item.description}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </Panel>

            <Panel title="Letzte Aktivitäten">
              <div className="grid gap-4">
                {activities.map((activity, index) => (
                  <div
                    className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3"
                    key={activity}
                  >
                    <span
                      className={`mt-0.5 flex size-6 items-center justify-center rounded-full ${
                        index === 0
                          ? "bg-red-50 text-red-600"
                          : index === 1
                            ? "bg-indigo-50 text-action"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Icon
                        className="size-3.5"
                        name={index === 0 ? "file" : index === 1 ? "document" : "check"}
                      />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {activity}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Heute, {index === 0 ? "10:42" : index === 1 ? "09:15" : "08:33"}
                      </p>
                    </div>
                  </div>
                ))}
                <Link
                  className="mt-1 text-sm font-semibold text-action"
                  href="/documents"
                >
                  Alle Aktivitäten anzeigen
                </Link>
              </div>
            </Panel>
          </div>

          <div className="grid gap-5">
            <DashboardAiStatus />

            <Panel title="Schneller Tipp">
              <p className="text-sm leading-6 text-slate-600">
                Nutze Zielrollen, um Lebensläufe und Anschreiben optimal anzupassen.
              </p>
            </Panel>
          </div>
        </div>
      </div>
    </ShellFrame>
  );
}

type KpiCardProps = Readonly<{
  helper?: string;
  label: string;
  progress?: number;
  value: string;
}>;

function KpiCard({ helper, label, progress, value }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold leading-none text-slate-950">
        {value}
      </p>
      {typeof progress === "number" ? (
        <div className="mt-4 h-2 rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-action"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500">{helper}</p>
      )}
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
        <dl className="grid grid-cols-2 gap-4">
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
