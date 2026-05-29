import type { ReactNode } from "react";
import { classNames } from "@/lib/ui/class-names";

type PanelProps = Readonly<{
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: string;
  title?: string;
}>;

export function Panel({
  actions,
  children,
  className,
  description,
  title
}: PanelProps) {
  return (
    <section
      className={classNames(
        "rounded-lg border border-slate-200/80 bg-white p-5 shadow-panel",
        className
      )}
    >
      {title || description || actions ? (
        <div className="mb-5 flex flex-row items-start justify-between gap-3">
          <div>
            {title ? (
              <h2 className="text-base font-semibold text-slate-950">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
