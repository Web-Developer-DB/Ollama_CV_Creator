"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  navigationGroups,
  routeItems,
  type NavigationGroup,
  type WorkflowRoute
} from "@/lib/workflow/application-workflow";

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

export function Sidebar({
  groups = navigationGroups,
  items
}: SidebarProps) {
  const pathname = usePathname();
  const renderedGroups = items ? createGroupsFromItems(items) : groups;

  return (
    <nav
      aria-label="Primary"
      className="flex flex-col gap-5 overflow-hidden border-r border-line pr-4"
    >
      {renderedGroups.map((group) => (
        <div className="min-w-0" key={group.label}>
          <p className="px-3 text-xs font-semibold uppercase text-slate-500">
            {group.label}
          </p>
          <div className="mt-2 grid gap-1">
            {group.items.map((routeItem) => {
              const isActive = pathname === routeItem.href;

              return (
                <Link
                  aria-current={isActive ? "page" : undefined}
                  aria-label={routeItem.label}
                  className={`grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 ${
                    isActive
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm"
                  }`}
                  href={routeItem.href}
                  key={routeItem.href}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-6 w-6 items-center justify-center rounded-md border text-xs font-semibold ${
                      isActive
                        ? "border-action bg-blue-50 text-action"
                        : "border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    {routeItem.step ?? "-"}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">{routeItem.label}</span>
                    <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">
                      {routeItem.outcome}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
