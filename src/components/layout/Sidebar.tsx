import Link from "next/link";
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
  const renderedGroups = items ? createGroupsFromItems(items) : groups;

  return (
    <nav
      aria-label="Primary"
      className="flex gap-5 overflow-x-auto border-b border-line pb-4 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:pr-4"
    >
      {renderedGroups.map((group) => (
        <div className="min-w-44 lg:min-w-0" key={group.label}>
          <p className="px-3 text-xs font-semibold uppercase text-slate-500">
            {group.label}
          </p>
          <div className="mt-2 grid gap-1">
            {group.items.map((routeItem) => (
              <Link
                aria-label={routeItem.label}
                className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
                href={routeItem.href}
                key={routeItem.href}
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-500"
                >
                  {routeItem.step ?? "-"}
                </span>
                <span className="truncate">{routeItem.label}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
