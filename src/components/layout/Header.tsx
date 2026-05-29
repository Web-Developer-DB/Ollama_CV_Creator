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
    <header className="flex items-center justify-between gap-6 border-b border-line pb-5">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-accent">
          Ollama CV Creator
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-950">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Turn verified experience into polished CVs and cover letters tailored
          for a target role.
        </p>
      </div>
      <dl className="grid w-[520px] shrink-0 grid-cols-3 gap-3 text-sm">
        {metrics.map((metric) => (
          <div
            className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm"
            key={metric.label}
          >
            <dt className="text-xs font-semibold uppercase text-slate-500">
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
