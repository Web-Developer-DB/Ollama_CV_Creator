"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  navigationGroups,
  routeItems,
  type NavigationGroup,
  type WorkflowRoute
} from "@/lib/workflow/application-workflow";
import { Icon, type IconName } from "@/components/ui/Icon";

export { navigationGroups, routeItems };
export type RouteItem = WorkflowRoute;

type SidebarProps = Readonly<{
  groups?: NavigationGroup[];
  items?: WorkflowRoute[];
}>;

const createGroupsFromItems = (items: WorkflowRoute[]): NavigationGroup[] => [
  {
    label: "Navigation",
    items
  }
];

const iconByHref: Record<string, IconName> = {
  "/dashboard": "home",
  "/import": "user",
  "/profile": "clipboard",
  "/documents": "edit",
  "/templates": "palette",
  "/export": "download",
  "/job": "target",
  "/analysis": "activity",
  "/ai": "bot"
};

export function Sidebar({
  groups = navigationGroups,
  items
}: SidebarProps) {
  const pathname = usePathname();
  const renderedGroups = items ? createGroupsFromItems(items) : groups;

  return (
    <nav
      aria-label="Primary"
      className="flex min-h-full flex-col border-r border-slate-200 bg-white px-5 py-5"
    >
      <Link className="mb-7 flex items-center gap-3" href="/dashboard">
        <span className="flex size-8 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-action">
          <Icon className="size-4" name="home" />
        </span>
        <span className="text-xs font-bold uppercase text-action">
          Ollama CV Creator
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-5">
        {renderedGroups.map((group) => (
          <div className="min-w-0" key={group.label}>
            <p className="px-1 text-[11px] font-semibold uppercase text-slate-500">
              {group.label}
            </p>
            <div className="mt-2 grid gap-1">
              {group.items.map((routeItem) => {
                const isActive =
                  pathname === routeItem.href ||
                  (pathname === "/" && routeItem.href === "/dashboard");
                const icon = iconByHref[routeItem.href] ?? "file";

                return (
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    aria-label={routeItem.label}
                    className={`grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 ${
                      isActive
                        ? "bg-indigo-50 text-action"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                    href={routeItem.href}
                    key={routeItem.href}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex size-6 items-center justify-center rounded-md ${
                        isActive
                          ? "bg-white text-action shadow-sm"
                          : "text-slate-500"
                      }`}
                    >
                      <Icon className="size-4" name={icon} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate">{routeItem.label}</span>
                      <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-500">
                        {routeItem.outcome}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3 border-t border-slate-200 pt-4">
        <span className="flex size-9 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
          N
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-950">
            Nutzer
          </span>
          <span className="block truncate text-xs text-slate-500">
            Lokales Konto
          </span>
        </span>
      </div>
    </nav>
  );
}
