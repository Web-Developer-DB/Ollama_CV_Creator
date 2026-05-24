import Link from "next/link";

export type RouteItem = {
  href: string;
  label: string;
};

export const routeItems: RouteItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/import", label: "Import" },
  { href: "/profile", label: "Profile" },
  { href: "/job", label: "Job" },
  { href: "/analysis", label: "Analysis" },
  { href: "/documents", label: "Documents" },
  { href: "/templates", label: "Templates" },
  { href: "/ai", label: "AI Status" },
  { href: "/export", label: "Export" }
];

type SidebarProps = Readonly<{
  items?: RouteItem[];
}>;

export function Sidebar({ items = routeItems }: SidebarProps) {
  return (
    <nav
      aria-label="Primary"
      className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-4 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:pr-4"
    >
      {items.map((routeItem) => (
        <Link
          className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:text-ink"
          href={routeItem.href}
          key={routeItem.href}
        >
          {routeItem.label}
        </Link>
      ))}
    </nav>
  );
}
