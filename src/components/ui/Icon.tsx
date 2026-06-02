// Central icon registry. Components use semantic icon names instead of inline
// SVGs so navigation and controls stay visually consistent.
import type { SVGProps } from "react";

export type IconName =
  | "activity"
  | "award"
  | "bot"
  | "briefcase"
  | "calendar"
  | "check"
  | "clipboard"
  | "code"
  | "document"
  | "download"
  | "edit"
  | "file"
  | "globe"
  | "graduation"
  | "home"
  | "link"
  | "mail"
  | "map"
  | "palette"
  | "phone"
  | "plus"
  | "settings"
  | "shield"
  | "target"
  | "trash"
  | "user"
  | "x";

type IconProps = Readonly<
  SVGProps<SVGSVGElement> & {
    name: IconName;
  }
>;

const paths: Record<IconName, string[]> = {
  activity: ["M3 12h4l2-6 4 12 2-6h6"],
  award: [
    "M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12",
    "M9 14l-1 7 4-2 4 2-1-7"
  ],
  bot: [
    "M12 8V4",
    "M8 4h8",
    "M5 12a7 7 0 0 1 14 0v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z",
    "M9 14h.01",
    "M15 14h.01",
    "M10 17h4"
  ],
  briefcase: [
    "M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1",
    "M4 7h16v12H4z",
    "M4 12h16",
    "M9 12v2h6v-2"
  ],
  calendar: [
    "M7 3v4",
    "M17 3v4",
    "M4 7h16",
    "M5 5h14a1 1 0 0 1 1 1v15H4V6a1 1 0 0 1 1-1",
    "M8 11h.01",
    "M12 11h.01",
    "M16 11h.01"
  ],
  check: ["M20 6 9 17l-5-5"],
  clipboard: [
    "M9 4h6",
    "M9 4a2 2 0 0 0-2 2v1h10V6a2 2 0 0 0-2-2",
    "M7 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"
  ],
  code: ["M8 9l-4 3 4 3", "M16 9l4 3-4 3", "M14 5l-4 14"],
  document: [
    "M6 3h8l4 4v14H6z",
    "M14 3v5h4",
    "M9 13h6",
    "M9 17h6"
  ],
  download: ["M12 3v12", "M7 10l5 5 5-5", "M5 21h14"],
  edit: [
    "M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16z",
    "M13 6l5 5"
  ],
  file: [
    "M6 3h8l4 4v14H6z",
    "M14 3v5h4",
    "M9 12h6"
  ],
  globe: [
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18",
    "M3 12h18",
    "M12 3c3 3 3 15 0 18",
    "M12 3c-3 3-3 15 0 18"
  ],
  graduation: [
    "M3 8l9-4 9 4-9 4z",
    "M7 10v5c2 2 8 2 10 0v-5",
    "M21 8v6"
  ],
  home: ["M3 11l9-8 9 8", "M5 10v10h14V10", "M9 20v-6h6v6"],
  link: [
    "M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1.5 1.5",
    "M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1.5-1.5"
  ],
  mail: ["M4 6h16v12H4z", "M4 7l8 6 8-6"],
  map: [
    "M12 21s7-5.5 7-12a7 7 0 1 0-14 0c0 6.5 7 12 7 12",
    "M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6"
  ],
  palette: [
    "M12 3a9 9 0 0 0 0 18h1.5a1.5 1.5 0 0 0 1.2-2.4 1.5 1.5 0 0 1 1.2-2.4H18a6 6 0 0 0 0-12z",
    "M7.5 10h.01",
    "M10 7h.01",
    "M14 7h.01",
    "M16.5 10h.01"
  ],
  phone: [
    "M6 5l3-2 3 5-2 1c1 2 3 4 5 5l1-2 5 3-2 3c-1 1-3 1-5 0-4-2-8-6-10-10-1-2-1-4 0-5"
  ],
  plus: ["M12 5v14", "M5 12h14"],
  settings: [
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
    "M4 12h2",
    "M18 12h2",
    "M12 4v2",
    "M12 18v2",
    "M6.6 6.6 8 8",
    "M16 16l1.4 1.4",
    "M17.4 6.6 16 8",
    "M8 16l-1.4 1.4"
  ],
  shield: ["M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"],
  target: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18", "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10", "M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2"],
  trash: [
    "M4 7h16",
    "M10 11v6",
    "M14 11v6",
    "M6 7l1 14h10l1-14",
    "M9 7V4h6v3"
  ],
  user: ["M20 21a8 8 0 0 0-16 0", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"],
  x: ["M6 6l12 12", "M18 6 6 18"]
};

export function Icon({ name, className, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
      {...props}
    >
      {paths[name].map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  );
}
