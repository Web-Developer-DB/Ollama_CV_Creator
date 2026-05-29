import type { SVGProps } from "react";

export type IconName =
  | "activity"
  | "bot"
  | "check"
  | "clipboard"
  | "document"
  | "download"
  | "edit"
  | "file"
  | "home"
  | "palette"
  | "settings"
  | "shield"
  | "target"
  | "user";

type IconProps = Readonly<
  SVGProps<SVGSVGElement> & {
    name: IconName;
  }
>;

const paths: Record<IconName, string[]> = {
  activity: ["M3 12h4l2-6 4 12 2-6h6"],
  bot: [
    "M12 8V4",
    "M8 4h8",
    "M5 12a7 7 0 0 1 14 0v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z",
    "M9 14h.01",
    "M15 14h.01",
    "M10 17h4"
  ],
  check: ["M20 6 9 17l-5-5"],
  clipboard: [
    "M9 4h6",
    "M9 4a2 2 0 0 0-2 2v1h10V6a2 2 0 0 0-2-2",
    "M7 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"
  ],
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
  home: ["M3 11l9-8 9 8", "M5 10v10h14V10", "M9 20v-6h6v6"],
  palette: [
    "M12 3a9 9 0 0 0 0 18h1.5a1.5 1.5 0 0 0 1.2-2.4 1.5 1.5 0 0 1 1.2-2.4H18a6 6 0 0 0 0-12z",
    "M7.5 10h.01",
    "M10 7h.01",
    "M14 7h.01",
    "M16.5 10h.01"
  ],
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
  user: ["M20 21a8 8 0 0 0-16 0", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"]
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
