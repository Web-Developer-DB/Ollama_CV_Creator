import { Icon, type IconName } from "@/components/ui/Icon";
import { classNames } from "@/lib/ui/class-names";
import type {
  CVSection,
  CVSectionType,
  DocumentSectionItem,
  GeneratedCoverLetter,
  GeneratedCV
} from "@/types/documents";
import type { TemplateDefinition, TemplateStyle } from "@/types/templates";

// Printable document renderer. CV pages use DIN A4 dimensions and visual
// components that can later be reused by the desktop PDF export path.
export type DocumentPreviewMode = "both" | "cv" | "cover_letter";

export const templateDefinitions: TemplateDefinition[] = [
  {
    id: "modern",
    name: "Modern",
    description: "Confident structure with a crisp header and strong section rhythm.",
    category: "professional",
    bestFor: "Product, SaaS, and general business roles"
  },
  {
    id: "classic",
    name: "Classic",
    description: "Formal typography and measured spacing for conservative roles.",
    category: "classic",
    bestFor: "Conservative companies, public sector, and formal applications"
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Quiet ATS-friendly presentation focused on clean content.",
    category: "professional",
    bestFor: "ATS-focused applications and content-heavy profiles"
  },
  {
    id: "executive",
    name: "Executive",
    description: "Premium leadership layout with restrained contrast and confident framing.",
    category: "professional",
    bestFor: "Senior, lead, management, and consulting roles"
  },
  {
    id: "technical",
    name: "Technical",
    description: "Precise engineering-oriented layout for skills, systems, and projects.",
    category: "technical",
    bestFor: "Software, data, infrastructure, and technical specialist roles"
  },
  {
    id: "compact",
    name: "Compact",
    description: "Dense one-page layout with strong scanability and efficient spacing.",
    category: "compact",
    bestFor: "Long experience histories that need tight readable structure"
  }
];

type DocumentTemplateProps = Readonly<{
  template: TemplateStyle;
  cv?: GeneratedCV;
  coverLetter?: GeneratedCoverLetter;
  previewMode?: DocumentPreviewMode;
}>;

type TemplateClasses = {
  shell: string;
  page: string;
  pageBorder: string;
  header: string;
  headerEyebrow: string;
  headerText: string;
  headerMuted: string;
  accentText: string;
  accentBorder: string;
  accentBg: string;
  iconBadge: string;
  sectionTitle: string;
  itemTitle: string;
  meta: string;
  bodyText: string;
  bullet: string;
  chip: string;
  timeline: string;
  sidebar: string;
};

type PageBudget = {
  first: number;
  next: number;
  bulletLimit: number;
};

const templateClassMap: Record<TemplateStyle, TemplateClasses> = {
  modern: {
    shell: "border-blue-200 bg-slate-50",
    page: "bg-white text-slate-950 shadow-panel",
    pageBorder: "border-blue-100",
    header: "bg-slate-950 text-white",
    headerEyebrow: "text-blue-200",
    headerText: "text-white",
    headerMuted: "text-slate-200",
    accentText: "text-blue-700",
    accentBorder: "border-blue-200",
    accentBg: "bg-blue-50",
    iconBadge: "bg-blue-100 text-blue-700",
    sectionTitle: "text-blue-950",
    itemTitle: "text-slate-950",
    meta: "text-blue-800",
    bodyText: "text-slate-700",
    bullet: "marker:text-blue-600",
    chip: "border-blue-100 bg-blue-50 text-blue-950",
    timeline: "border-blue-200",
    sidebar: "border-blue-100 bg-blue-50/70"
  },
  classic: {
    shell: "border-stone-300 bg-stone-50",
    page: "bg-white font-serif text-stone-950 shadow-panel",
    pageBorder: "border-stone-200",
    header: "border-b border-stone-300 bg-white text-stone-950",
    headerEyebrow: "text-stone-600",
    headerText: "text-stone-950",
    headerMuted: "text-stone-600",
    accentText: "text-stone-700",
    accentBorder: "border-stone-300",
    accentBg: "bg-stone-50",
    iconBadge: "bg-stone-100 text-stone-700",
    sectionTitle: "text-stone-950",
    itemTitle: "text-stone-950",
    meta: "text-stone-700",
    bodyText: "text-stone-700",
    bullet: "marker:text-stone-600",
    chip: "border-stone-200 bg-white text-stone-800",
    timeline: "border-stone-300",
    sidebar: "border-stone-200 bg-stone-50"
  },
  minimal: {
    shell: "border-slate-200 bg-slate-50",
    page: "bg-white text-slate-950 shadow-panel",
    pageBorder: "border-slate-200",
    header: "border-b border-slate-200 bg-white text-slate-950",
    headerEyebrow: "text-slate-500",
    headerText: "text-slate-950",
    headerMuted: "text-slate-500",
    accentText: "text-slate-700",
    accentBorder: "border-slate-200",
    accentBg: "bg-slate-50",
    iconBadge: "bg-slate-100 text-slate-600",
    sectionTitle: "text-slate-950",
    itemTitle: "text-slate-950",
    meta: "text-slate-600",
    bodyText: "text-slate-700",
    bullet: "marker:text-slate-500",
    chip: "border-slate-200 bg-white text-slate-800",
    timeline: "border-slate-200",
    sidebar: "border-slate-200 bg-slate-50"
  },
  executive: {
    shell: "border-emerald-200 bg-emerald-50",
    page: "bg-white text-slate-950 shadow-panel",
    pageBorder: "border-emerald-100",
    header: "bg-emerald-950 text-white",
    headerEyebrow: "text-emerald-100",
    headerText: "text-white",
    headerMuted: "text-emerald-50",
    accentText: "text-emerald-700",
    accentBorder: "border-emerald-200",
    accentBg: "bg-emerald-50",
    iconBadge: "bg-emerald-100 text-emerald-700",
    sectionTitle: "text-emerald-950",
    itemTitle: "text-slate-950",
    meta: "text-emerald-800",
    bodyText: "text-slate-700",
    bullet: "marker:text-emerald-600",
    chip: "border-emerald-100 bg-emerald-50 text-emerald-950",
    timeline: "border-emerald-200",
    sidebar: "border-emerald-100 bg-emerald-50/80"
  },
  technical: {
    shell: "border-cyan-200 bg-cyan-50",
    page: "bg-white text-slate-950 shadow-panel",
    pageBorder: "border-cyan-100",
    header: "border-b-4 border-cyan-500 bg-white text-slate-950",
    headerEyebrow: "text-cyan-700",
    headerText: "text-slate-950",
    headerMuted: "text-slate-500",
    accentText: "text-cyan-700",
    accentBorder: "border-cyan-200",
    accentBg: "bg-cyan-50",
    iconBadge: "bg-cyan-100 text-cyan-700",
    sectionTitle: "text-cyan-950",
    itemTitle: "text-slate-950",
    meta: "text-cyan-800",
    bodyText: "text-slate-700",
    bullet: "marker:text-cyan-600",
    chip: "border-cyan-100 bg-cyan-50 text-cyan-950",
    timeline: "border-cyan-200",
    sidebar: "border-cyan-100 bg-cyan-50/80"
  },
  compact: {
    shell: "border-amber-200 bg-stone-50",
    page: "bg-white text-stone-950 shadow-panel",
    pageBorder: "border-amber-100",
    header: "border-b border-amber-200 bg-stone-50 text-stone-950",
    headerEyebrow: "text-amber-700",
    headerText: "text-stone-950",
    headerMuted: "text-stone-600",
    accentText: "text-amber-700",
    accentBorder: "border-amber-200",
    accentBg: "bg-amber-50",
    iconBadge: "bg-amber-100 text-amber-700",
    sectionTitle: "text-stone-950",
    itemTitle: "text-stone-950",
    meta: "text-amber-800",
    bodyText: "text-stone-700",
    bullet: "marker:text-amber-600",
    chip: "border-amber-100 bg-amber-50 text-stone-900",
    timeline: "border-amber-200",
    sidebar: "border-amber-100 bg-amber-50/75"
  }
};

const pageBudgets: Record<TemplateStyle, PageBudget> = {
  modern: { first: 42, next: 56, bulletLimit: 4 },
  classic: { first: 44, next: 58, bulletLimit: 4 },
  minimal: { first: 50, next: 62, bulletLimit: 5 },
  executive: { first: 38, next: 52, bulletLimit: 3 },
  technical: { first: 44, next: 58, bulletLimit: 4 },
  compact: { first: 58, next: 70, bulletLimit: 5 }
};

const sideSectionTypes = new Set<CVSectionType>([
  "skills",
  "languages",
  "certificates"
]);

const sectionIconMap: Record<CVSectionType, IconName> = {
  summary: "user",
  experience: "briefcase",
  education: "graduation",
  skills: "code",
  projects: "document",
  languages: "globe",
  certificates: "award",
  custom: "file"
};

const hasText = (value: string | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

const joinPresent = (values: Array<string | undefined>, separator: string) =>
  values.filter(hasText).join(separator);

const SUMMARY_PREVIEW_LIMIT = 520;

const trimPreviewSummary = (value: string | undefined): string | undefined => {
  if (!hasText(value)) {
    return undefined;
  }

  const firstParagraph = value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .find(Boolean);

  if (!firstParagraph) {
    return undefined;
  }

  if (firstParagraph.length <= SUMMARY_PREVIEW_LIMIT) {
    return firstParagraph;
  }

  const words = firstParagraph.split(/\s+/);
  let nextSummary = "";

  for (const word of words) {
    const candidate = nextSummary ? `${nextSummary} ${word}` : word;

    if (candidate.length > SUMMARY_PREVIEW_LIMIT) {
      break;
    }

    nextSummary = candidate;
  }

  return `${nextSummary.replace(/[,.!?;:]+$/, "")}...`;
};

const formatGeneratedAt = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? undefined
    : date.toLocaleDateString("en", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
};

const languageLabel = (language: string | undefined): string | undefined =>
  language === "de" ? "German" : language === "en" ? "English" : undefined;

const normalizeSkill = (value: string): string => value.trim().replace(/\.$/, "");

const splitSkillValues = (item: DocumentSectionItem): string[] =>
  [
    item.body,
    ...item.bullets
  ].flatMap((value) =>
    value
      ? value
          .split(/[,;•]+/)
          .map(normalizeSkill)
          .filter(Boolean)
      : []
  );

const deriveCvName = (cv: GeneratedCV | undefined): string =>
  cv?.title
    ?.replace(/\s+(CV|Curriculum Vitae|Lebenslauf)$/i, "")
    .trim() ||
  cv?.title ||
  "Untitled CV";

const deriveCvRole = (cv: GeneratedCV | undefined): string | undefined =>
  cv?.sections
    .find((section) => section.type === "experience")
    ?.items.find((item) => hasText(item.title))?.title;

const contactItems = (
  cv: GeneratedCV | undefined
): Array<{ icon: IconName; label: string }> => {
  const contact = cv?.contact;
  const items: Array<{ icon: IconName; label: string } | undefined> = [
    contact?.email ? { icon: "mail", label: contact.email } : undefined,
    contact?.phone ? { icon: "phone", label: contact.phone } : undefined,
    contact?.location ? { icon: "map", label: contact.location } : undefined,
    contact?.linkedin ? { icon: "link", label: contact.linkedin } : undefined,
    contact?.github ? { icon: "code", label: contact.github } : undefined,
    contact?.website ? { icon: "globe", label: contact.website } : undefined,
    contact?.portfolio
      ? { icon: "document", label: contact.portfolio }
      : undefined
  ];

  return items.filter(
    (item): item is { icon: IconName; label: string } => Boolean(item)
  );
};

function EmptyDocumentState({ label }: Readonly<{ label: string }>) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm leading-6 text-slate-600">
      <p className="font-semibold text-slate-950">{label} is waiting for content</p>
      <p className="mt-1">
        Generate or edit the documents first, then return here to inspect the
        final presentation before export.
      </p>
    </div>
  );
}

const trimItemForPage = (
  item: DocumentSectionItem,
  sectionType: CVSectionType,
  template: TemplateStyle
): DocumentSectionItem => {
  if (sectionType === "skills") {
    return item;
  }

  return {
    ...item,
    bullets: item.bullets.slice(0, pageBudgets[template].bulletLimit)
  };
};

const trimSectionForPage = (
  section: CVSection,
  template: TemplateStyle
): CVSection => ({
  ...section,
  items: section.items.map((item) =>
    trimItemForPage(item, section.type, template)
  )
});

const estimateTextUnits = (value: string | undefined, unitsPerLine = 72): number =>
  value ? Math.max(1, Math.ceil(value.length / unitsPerLine)) : 0;

const estimateItemUnits = (item: DocumentSectionItem): number =>
  2 +
  estimateTextUnits(item.title, 48) +
  estimateTextUnits(item.subtitle, 56) +
  estimateTextUnits(item.dateRange, 48) +
  estimateTextUnits(item.body, 82) +
  item.bullets.reduce((total, bullet) => total + estimateTextUnits(bullet, 72), 0);

const estimateSectionUnits = (section: CVSection): number =>
  3 + section.items.reduce((total, item) => total + estimateItemUnits(item), 0);

const buildCvPages = (
  cv: GeneratedCV | undefined,
  template: TemplateStyle
): CVSection[][] => {
  if (!cv?.sections.length) {
    return [[]];
  }

  const summary = trimPreviewSummary(cv.summary);
  const visibleSections = cv.sections
    .filter((section) => section.type !== "summary" || !hasText(summary))
    .map((section) => trimSectionForPage(section, template));
  const pages: CVSection[][] = [[]];
  let currentBudget = pageBudgets[template].first;
  let usedUnits = hasText(summary) ? Math.min(8, 3 + estimateTextUnits(summary, 88)) : 0;

  for (const section of visibleSections) {
    const sectionUnits = estimateSectionUnits(section);
    const currentPage = pages[pages.length - 1];

    if (
      pages.length < 2 &&
      currentPage.length > 0 &&
      usedUnits + sectionUnits > currentBudget
    ) {
      pages.push([]);
      currentBudget = pageBudgets[template].next;
      usedUnits = 0;
    }

    pages[pages.length - 1].push(section);
    usedUnits += sectionUnits;
  }

  return pages;
};

function ContactRow({
  cv,
  classes
}: Readonly<{ cv?: GeneratedCV; classes: TemplateClasses }>) {
  const items = contactItems(cv);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium">
      {items.map((item) => (
        <span className="inline-flex min-w-0 items-center gap-1.5" key={item.label}>
          <Icon className="size-3.5 shrink-0" name={item.icon} />
          <span className="truncate">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

function CVHeader({
  cv,
  classes,
  pageNumber,
  totalPages
}: Readonly<{
  cv?: GeneratedCV;
  classes: TemplateClasses;
  pageNumber: number;
  totalPages: number;
}>) {
  const isContinuation = pageNumber > 1;
  const metaLine = joinPresent(
    [languageLabel(cv?.language), formatGeneratedAt(cv?.meta.generatedAt)],
    " / "
  );
  const role = deriveCvRole(cv);

  if (isContinuation) {
    return (
      <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <p className={`text-[10px] font-semibold uppercase ${classes.accentText}`}>
            Curriculum vitae
          </p>
          <h3 className={`mt-1 text-lg font-semibold ${classes.itemTitle}`}>
            {deriveCvName(cv)}
          </h3>
        </div>
        <p className="text-[10px] font-semibold uppercase text-slate-400">
          Page {pageNumber} / {totalPages}
        </p>
      </div>
    );
  }

  return (
    <header className={classNames("rounded-sm px-7 py-6", classes.header)}>
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className={`text-[10px] font-semibold uppercase tracking-wide ${classes.headerEyebrow}`}>
            Curriculum vitae
          </p>
          <h2
            className={`mt-2 text-[30px] font-semibold leading-tight ${classes.headerText}`}
          >
            {deriveCvName(cv)}
          </h2>
          {role ? (
            <p className={`mt-2 text-sm font-medium ${classes.headerMuted}`}>
              {role}
            </p>
          ) : null}
        </div>
        {metaLine ? (
          <p className={`max-w-36 text-right text-[11px] leading-5 ${classes.headerMuted}`}>
            {metaLine}
          </p>
        ) : null}
      </div>
      <ContactRow classes={classes} cv={cv} />
    </header>
  );
}

function SectionHeading({
  section,
  classes
}: Readonly<{ section: CVSection; classes: TemplateClasses }>) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-full ${classes.iconBadge}`}
      >
        <Icon className="size-3.5" name={sectionIconMap[section.type]} />
      </span>
      <h3
        className={`flex-1 border-b pb-1.5 text-[11px] font-bold uppercase tracking-wide ${classes.accentBorder} ${classes.sectionTitle}`}
      >
        {section.title}
      </h3>
    </div>
  );
}

function SkillSection({
  section,
  classes
}: Readonly<{ section: CVSection; classes: TemplateClasses }>) {
  return (
    <section className="break-inside-avoid">
      <SectionHeading classes={classes} section={section} />
      <div className="grid gap-3">
        {section.items.map((item) => {
          const skills = splitSkillValues(item);

          return (
            <div key={item.id}>
              {hasText(item.title) ? (
                <p className={`mb-2 text-[11px] font-semibold ${classes.meta}`}>
                  {item.title}
                </p>
              ) : null}
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold leading-none ${classes.chip}`}
                      key={`${item.id}-${skill}`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={`text-xs leading-5 ${classes.bodyText}`}>
                  {item.body}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TimelineItem({
  item,
  classes,
  isLast
}: Readonly<{
  item: DocumentSectionItem;
  classes: TemplateClasses;
  isLast: boolean;
}>) {
  const metaLine = joinPresent([item.subtitle, item.dateRange], " | ");

  return (
    <article className="relative grid gap-1.5 pl-6">
      <span
        className={`absolute left-0 top-1.5 size-2.5 rounded-full border-2 bg-white ${classes.accentBorder}`}
      />
      {!isLast ? (
        <span className={`absolute bottom-0 left-1 top-5 border-l ${classes.timeline}`} />
      ) : null}
      {hasText(item.title) ? (
        <h4 className={`text-[13px] font-semibold leading-5 ${classes.itemTitle}`}>
          {item.title}
        </h4>
      ) : null}
      {metaLine ? (
        <p className={`text-[11px] font-semibold leading-5 ${classes.meta}`}>
          {metaLine}
        </p>
      ) : null}
      {hasText(item.body) ? (
        <p className={`text-xs leading-5 ${classes.bodyText}`}>{item.body}</p>
      ) : null}
      {item.bullets.length > 0 ? (
        <ul
          className={`grid gap-1 pl-4 text-xs leading-5 ${classes.bodyText} ${classes.bullet}`}
        >
          {item.bullets.map((bullet) => (
            <li className="list-disc" key={bullet}>
              {bullet}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function StandardItem({
  item,
  classes
}: Readonly<{ item: DocumentSectionItem; classes: TemplateClasses }>) {
  const metaLine = joinPresent([item.subtitle, item.dateRange], " | ");

  return (
    <article className="grid gap-1.5">
      {hasText(item.title) ? (
        <h4 className={`text-[13px] font-semibold leading-5 ${classes.itemTitle}`}>
          {item.title}
        </h4>
      ) : null}
      {metaLine ? (
        <p className={`text-[11px] font-semibold leading-5 ${classes.meta}`}>
          {metaLine}
        </p>
      ) : null}
      {hasText(item.body) ? (
        <p className={`text-xs leading-5 ${classes.bodyText}`}>{item.body}</p>
      ) : null}
      {item.bullets.length > 0 ? (
        <ul
          className={`grid gap-1 pl-4 text-xs leading-5 ${classes.bodyText} ${classes.bullet}`}
        >
          {item.bullets.map((bullet) => (
            <li className="list-disc" key={bullet}>
              {bullet}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function CVSectionView({
  section,
  classes
}: Readonly<{ section: CVSection; classes: TemplateClasses }>) {
  if (section.type === "skills") {
    return <SkillSection classes={classes} section={section} />;
  }

  const useTimeline = section.type === "experience" || section.type === "education";

  return (
    <section className="break-inside-avoid">
      <SectionHeading classes={classes} section={section} />
      {section.items.length > 0 ? (
        <div className="grid gap-3">
          {section.items.map((item, index) =>
            useTimeline ? (
              <TimelineItem
                classes={classes}
                isLast={index === section.items.length - 1}
                item={item}
                key={item.id}
              />
            ) : (
              <StandardItem classes={classes} item={item} key={item.id} />
            )
          )}
        </div>
      ) : (
        <p className={`text-xs ${classes.bodyText}`}>No items yet.</p>
      )}
    </section>
  );
}

function CVSummary({
  cv,
  classes
}: Readonly<{ cv?: GeneratedCV; classes: TemplateClasses }>) {
  const summary = trimPreviewSummary(cv?.summary);

  if (!hasText(summary)) {
    return null;
  }
  const textClassName =
    summary.length > 380 ? "text-[11px] leading-[1.45]" : "text-xs leading-5";

  return (
    <section className={`rounded-md border px-4 py-3 ${classes.accentBorder} ${classes.accentBg}`}>
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${classes.accentText}`} name="user" />
        <h3 className={`text-[11px] font-bold uppercase tracking-wide ${classes.accentText}`}>
          Profile
        </h3>
      </div>
      <p className={`mt-2 ${textClassName} ${classes.bodyText}`}>{summary}</p>
    </section>
  );
}

function CVPage({
  classes,
  cv,
  pageNumber,
  sections,
  template,
  totalPages
}: Readonly<{
  classes: TemplateClasses;
  cv?: GeneratedCV;
  pageNumber: number;
  sections: CVSection[];
  template: TemplateStyle;
  totalPages: number;
}>) {
  const isFirstPage = pageNumber === 1;
  const useSidebar =
    isFirstPage &&
    template !== "classic" &&
    template !== "minimal" &&
    sections.some((section) => sideSectionTypes.has(section.type));
  const sidebarSections = useSidebar
    ? sections.filter((section) => sideSectionTypes.has(section.type))
    : [];
  const mainSections = useSidebar
    ? sections.filter((section) => !sideSectionTypes.has(section.type))
    : sections;

  return (
    <article
      className={`relative mx-auto flex h-[297mm] w-full max-w-[210mm] flex-col overflow-hidden rounded-sm border ${classes.pageBorder} ${classes.page}`}
      data-page-number={pageNumber}
      data-testid="document-page-cv"
    >
      <div className="flex h-full flex-col p-[12mm]">
        <CVHeader
          classes={classes}
          cv={cv}
          pageNumber={pageNumber}
          totalPages={totalPages}
        />
        <div className="mt-5 grid min-h-0 flex-1 content-start gap-5 overflow-hidden">
          {isFirstPage ? <CVSummary classes={classes} cv={cv} /> : null}
          <div
            className={classNames(
              "min-h-0 overflow-hidden",
              useSidebar
                ? "grid grid-cols-[minmax(0,1fr)_58mm] gap-5"
                : "grid gap-5"
            )}
          >
            <main className="grid content-start gap-5 overflow-hidden">
              {mainSections.map((section) => (
                <CVSectionView
                  classes={classes}
                  key={`${pageNumber}-${section.id}`}
                  section={section}
                />
              ))}
            </main>
            {useSidebar ? (
              <aside
                className={`grid content-start gap-4 rounded-md border p-3 ${classes.sidebar}`}
              >
                {sidebarSections.map((section) => (
                  <CVSectionView
                    classes={classes}
                    key={`${pageNumber}-side-${section.id}`}
                    section={section}
                  />
                ))}
              </aside>
            ) : null}
          </div>
        </div>
        <footer className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] font-medium text-slate-400">
          <span>{deriveCvName(cv)}</span>
          <span>
            Page {pageNumber} / {totalPages}
          </span>
        </footer>
      </div>
    </article>
  );
}

function CVPreview({
  cv,
  classes,
  template
}: Readonly<{ cv?: GeneratedCV; classes: TemplateClasses; template: TemplateStyle }>) {
  const hasCvContent = Boolean(cv?.sections.length || hasText(cv?.summary));
  const pages = buildCvPages(cv, template).slice(0, 2);

  if (!hasCvContent) {
    return (
      <article
        className={`mx-auto flex h-[297mm] w-full max-w-[210mm] flex-col rounded-sm border p-[12mm] ${classes.pageBorder} ${classes.page}`}
        data-testid="document-page-cv"
      >
        <CVHeader classes={classes} cv={cv} pageNumber={1} totalPages={1} />
        <div className="mt-8">
          <EmptyDocumentState label="CV preview" />
        </div>
      </article>
    );
  }

  return (
    <div className="grid gap-5">
      {pages.map((sections, index) => (
        <CVPage
          classes={classes}
          cv={cv}
          key={`cv-page-${index + 1}`}
          pageNumber={index + 1}
          sections={sections}
          template={template}
          totalPages={pages.length}
        />
      ))}
    </div>
  );
}

function RecipientBlock({
  coverLetter
}: Readonly<{ coverLetter: GeneratedCoverLetter }>) {
  const recipientLines = [
    coverLetter.recipient?.contactName,
    coverLetter.recipient?.company,
    ...(coverLetter.recipient?.addressLines ?? [])
  ].filter(hasText);

  if (recipientLines.length === 0) {
    return null;
  }

  return (
    <div className="text-sm leading-6 text-slate-600">
      {recipientLines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

function CoverLetterPreview({
  coverLetter,
  classes
}: Readonly<{
  coverLetter?: GeneratedCoverLetter;
  classes: TemplateClasses;
}>) {
  const metaLine = joinPresent(
    [
      coverLetter?.recipient?.company,
      languageLabel(coverLetter?.language),
      formatGeneratedAt(coverLetter?.meta.generatedAt)
    ],
    " / "
  );

  return (
    <article
      className={`mx-auto h-[297mm] w-full max-w-[210mm] overflow-hidden rounded-sm border ${classes.pageBorder} ${classes.page}`}
      data-testid="document-page-cover-letter"
    >
      <div className="px-[14mm] py-[13mm]">
        <div className="flex items-start justify-between gap-6 border-b pb-5">
          <div className="min-w-0">
            <p className={`text-[11px] font-semibold uppercase ${classes.accentText}`}>
              Cover letter
            </p>
            <h2
              className={`mt-2 text-2xl font-semibold leading-tight ${classes.itemTitle}`}
            >
              {coverLetter?.subject ?? "Untitled cover letter"}
            </h2>
          </div>
          {metaLine ? (
            <p className={`max-w-44 text-right text-xs leading-5 ${classes.meta}`}>
              {metaLine}
            </p>
          ) : null}
        </div>
      </div>

      {coverLetter ? (
        <div className="grid gap-5 px-[14mm] pb-[14mm] text-sm leading-6 text-slate-700">
          <RecipientBlock coverLetter={coverLetter} />
          {hasText(coverLetter.greeting) ? <p>{coverLetter.greeting}</p> : null}
          <p>{coverLetter.opening}</p>
          {coverLetter.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p>{coverLetter.closing}</p>
          {hasText(coverLetter.signature) ? (
            <p className="font-medium text-slate-950">
              {coverLetter.signature}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="px-[14mm] pb-[14mm]">
          <EmptyDocumentState label="Cover letter preview" />
        </div>
      )}
    </article>
  );
}

export function DocumentTemplate({
  template,
  cv,
  coverLetter,
  previewMode = "both"
}: DocumentTemplateProps) {
  const definition =
    templateDefinitions.find((currentTemplate) => currentTemplate.id === template) ??
    templateDefinitions[0];
  const classes = templateClassMap[definition.id];
  const showCV = previewMode === "both" || previewMode === "cv";
  const showCoverLetter =
    previewMode === "both" || previewMode === "cover_letter";

  return (
    <section
      className={`grid gap-5 rounded-md border p-5 ${classes.shell}`}
      data-testid={`template-${definition.id}`}
    >
      <div className="flex flex-row items-end justify-between gap-3" data-print-hidden>
        <div>
          <p className={`text-xs font-semibold uppercase ${classes.accentText}`}>
            Template
          </p>
          <h2 className={`mt-1 text-xl font-semibold ${classes.itemTitle}`}>
            {definition.name}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            {definition.description}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {definition.bestFor}
          </p>
        </div>
        <p className="text-xs font-semibold uppercase text-slate-500">
          A4 preview
        </p>
      </div>

      <div
        data-print-pages
        className={`grid min-w-0 gap-5 ${
          previewMode === "both" ? "2xl:grid-cols-2" : ""
        }`}
      >
        {showCV ? (
          <CVPreview classes={classes} cv={cv} template={definition.id} />
        ) : null}
        {showCoverLetter ? (
          <CoverLetterPreview classes={classes} coverLetter={coverLetter} />
        ) : null}
      </div>
    </section>
  );
}
