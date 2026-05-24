export type HeaderMetric = {
  label: string;
  value: string;
};

type HeaderProps = Readonly<{
  title: string;
  metrics: HeaderMetric[];
}>;

export function Header({ title, metrics }: HeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold text-accent">Ollama CV Creator</p>
        <h1 className="mt-1 text-3xl font-semibold leading-tight">{title}</h1>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        {metrics.map((metric) => (
          <div
            className="rounded-md border border-slate-200 bg-white px-3 py-2"
            key={metric.label}
          >
            <dt className="text-xs font-medium uppercase text-slate-500">
              {metric.label}
            </dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
