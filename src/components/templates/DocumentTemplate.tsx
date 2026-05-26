import type {
  GeneratedCoverLetter,
  GeneratedCV,
  CVSection,
  DocumentSectionItem
} from "@/types/documents";
import type { TemplateDefinition, TemplateStyle } from "@/types/templates";

export type DocumentPreviewMode = "both" | "cv" | "cover_letter";

export const templateDefinitions: TemplateDefinition[] = [
  {
    id: "modern",
    name: "Modern",
    description: "Confident structure with a crisp header and strong section rhythm."
  },
  {
    id: "classic",
    name: "Classic",
    description: "Formal typography and measured spacing for conservative roles."
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Quiet ATS-friendly presentation focused on clean content."
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
  label: string;
  heading: string;
  rule: string;
  meta: string;
  panel: string;
  sectionTitle: string;
  itemTitle: string;
  bullet: string;
};

const templateClassMap: Record<TemplateStyle, TemplateClasses> = {
  modern: {
    shell: "border-blue-200 bg-slate-50",
    page: "bg-white text-slate-950 shadow-panel",
    label: "text-blue-700",
    heading: "text-slate-950",
    rule: "border-blue-500",
    meta: "text-blue-800",
    panel: "border-blue-100 bg-blue-50",
    sectionTitle: "border-blue-200 text-blue-950",
    itemTitle: "text-slate-950",
    bullet: "marker:text-blue-600"
  },
  classic: {
    shell: "border-slate-300 bg-slate-50",
    page: "bg-white font-serif text-slate-950 shadow-panel",
    label: "font-serif text-stone-700",
    heading: "font-serif text-stone-950",
    rule: "border-stone-500",
    meta: "font-serif text-stone-700",
    panel: "border-stone-200 bg-white",
    sectionTitle: "border-stone-300 font-serif text-stone-950",
    itemTitle: "font-serif text-stone-950",
    bullet: "marker:text-stone-600"
  },
  minimal: {
    shell: "border-slate-200 bg-slate-50",
    page: "bg-white text-slate-950 shadow-panel",
    label: "text-slate-500",
    heading: "text-slate-950",
    rule: "border-slate-900",
    meta: "text-slate-600",
    panel: "border-slate-200 bg-white",
    sectionTitle: "border-slate-200 text-slate-900",
    itemTitle: "text-slate-950",
    bullet: "marker:text-slate-500"
  }
};

const hasText = (value: string | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

const joinPresent = (values: Array<string | undefined>, separator: string) =>
  values.filter(hasText).join(separator);

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

function CVItem({
  item,
  classes
}: Readonly<{ item: DocumentSectionItem; classes: TemplateClasses }>) {
  const metaLine = joinPresent([item.subtitle, item.dateRange], " | ");

  return (
    <article className="grid gap-2">
      {hasText(item.title) ? (
        <h4 className={`text-[15px] font-semibold ${classes.itemTitle}`}>
          {item.title}
        </h4>
      ) : null}
      {metaLine ? (
        <p className={`text-xs font-medium ${classes.meta}`}>{metaLine}</p>
      ) : null}
      {hasText(item.body) ? (
        <p className="text-sm leading-6 text-slate-700">{item.body}</p>
      ) : null}
      {item.bullets.length > 0 ? (
        <ul className={`grid gap-1 pl-4 text-sm leading-6 text-slate-700 ${classes.bullet}`}>
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
  return (
    <section className="grid gap-3">
      <h3
        className={`border-b pb-2 text-xs font-semibold uppercase ${classes.sectionTitle}`}
      >
        {section.title}
      </h3>
      {section.items.length > 0 ? (
        <div className="grid gap-4">
          {section.items.map((item) => (
            <CVItem classes={classes} item={item} key={item.id} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No items yet.</p>
      )}
    </section>
  );
}

function CVPreview({
  cv,
  classes
}: Readonly<{ cv?: GeneratedCV; classes: TemplateClasses }>) {
  const hasCvContent = Boolean(cv?.sections.length || hasText(cv?.summary));

  return (
    <article className={`min-h-[720px] rounded-sm border border-slate-200 p-8 ${classes.page}`}>
      <div className="border-b pb-5">
        <p className={`text-xs font-semibold uppercase ${classes.label}`}>
          CV preview
        </p>
        <h2 className={`mt-2 text-3xl font-semibold leading-tight ${classes.heading}`}>
          {cv?.title ?? "Untitled CV"}
        </h2>
        <div className={`mt-4 w-16 border-t-2 ${classes.rule}`} />
      </div>

      {hasCvContent ? (
        <>
          {hasText(cv?.summary) ? (
            <section className={`mt-6 rounded-md border px-4 py-3 ${classes.panel}`}>
              <h3 className={`text-xs font-semibold uppercase ${classes.label}`}>
                Profile
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {cv.summary}
              </p>
            </section>
          ) : null}

          <div className="mt-6 grid gap-6">
            {cv?.sections.length ? (
              cv.sections.map((section) => (
                <CVSectionView
                  classes={classes}
                  key={section.id}
                  section={section}
                />
              ))
            ) : (
              <p className="text-sm text-slate-500">No CV sections yet.</p>
            )}
          </div>
        </>
      ) : (
        <div className="mt-6">
          <EmptyDocumentState label="CV preview" />
        </div>
      )}
      {!cv?.sections.length && hasCvContent ? (
        <p className="mt-6 text-sm text-slate-500">No CV sections yet.</p>
      ) : null}
    </article>
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
  return (
    <article className={`min-h-[720px] rounded-sm border border-slate-200 p-8 ${classes.page}`}>
      <div className="border-b pb-5">
        <p className={`text-xs font-semibold uppercase ${classes.label}`}>
          Cover letter preview
        </p>
        <h2 className={`mt-2 text-2xl font-semibold leading-tight ${classes.heading}`}>
          {coverLetter?.subject ?? "Untitled cover letter"}
        </h2>
        <div className={`mt-4 w-16 border-t-2 ${classes.rule}`} />
      </div>

      {coverLetter ? (
        <div className="mt-7 grid gap-5 text-sm leading-6 text-slate-700">
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
        <div className="mt-6">
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase ${classes.label}`}>
            Template
          </p>
          <h2 className={`mt-1 text-xl font-semibold ${classes.heading}`}>
            {definition.name}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            {definition.description}
          </p>
        </div>
        <p className="text-xs font-semibold uppercase text-slate-500">
          Print preview
        </p>
      </div>

      <div
        className={`grid gap-5 ${
          previewMode === "both" ? "xl:grid-cols-2" : ""
        }`}
      >
        {showCV ? <CVPreview classes={classes} cv={cv} /> : null}
        {showCoverLetter ? (
          <CoverLetterPreview classes={classes} coverLetter={coverLetter} />
        ) : null}
      </div>
    </section>
  );
}
