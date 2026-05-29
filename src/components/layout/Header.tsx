export type HeaderMetric = {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning" | "danger";
};

type HeaderProps = Readonly<{
  title: string;
  metrics: HeaderMetric[];
}>;

export function Header({ title, metrics }: HeaderProps) {
  return (
    <header className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold leading-tight text-slate-950">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Deine Bewerbungsunterlagen auf einen Blick.
        </p>
      </div>
      <dl className="grid w-[560px] shrink-0 grid-cols-3 gap-3 text-sm">
        {metrics.map((metric) => (
          <div
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
            key={metric.label}
          >
            <dt className="text-xs font-semibold uppercase text-slate-500">
              {metric.label}
            </dt>
            <dd className="mt-2 flex items-center gap-2 font-semibold text-slate-950">
              {metric.tone ? (
                <span
                  aria-hidden="true"
                  className={`status-dot ${
                    metric.tone === "success"
                      ? "bg-emerald-500"
                      : metric.tone === "warning"
                        ? "bg-amber-500"
                        : metric.tone === "danger"
                          ? "bg-red-500"
                          : "bg-slate-400"
                  }`}
                />
              ) : null}
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
