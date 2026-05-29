import type { HTMLAttributes, ReactNode } from "react";
import { classNames } from "@/lib/ui/class-names";

type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

type BadgeProps = Readonly<
  HTMLAttributes<HTMLSpanElement> & {
    children: ReactNode;
    tone?: BadgeTone;
  }
>;

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-slate-200 bg-slate-100 text-slate-700",
  info: "border-indigo-200 bg-indigo-50 text-indigo-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-800"
};

export function Badge({
  children,
  className,
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={classNames(
        "inline-flex min-h-6 items-center rounded-md border px-2 py-0.5 text-xs font-semibold leading-5",
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
