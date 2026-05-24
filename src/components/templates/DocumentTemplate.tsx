import type {
  GeneratedCoverLetter,
  GeneratedCV,
  CVSection,
  DocumentSectionItem
} from "@/types/documents";
import type { TemplateDefinition, TemplateStyle } from "@/types/templates";

export const templateDefinitions: TemplateDefinition[] = [
  {
    id: "modern",
    name: "Modern",
    description: "Clean layout with a strong header and compact sections."
  },
  {
    id: "classic",
    name: "Classic",
    description: "Traditional typography with balanced section spacing."
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Reduced styling focused on readable document content."
  }
];

type DocumentTemplateProps = Readonly<{
  template: TemplateStyle;
  cv?: GeneratedCV;
  coverLetter?: GeneratedCoverLetter;
}>;

type TemplateClasses = {
  shell: string;
  label: string;
  heading: string;
  panel: string;
  sectionTitle: string;
  itemTitle: string;
};

const templateClassMap: Record<TemplateStyle, TemplateClasses> = {
  modern: {
    shell: "border-blue-200 bg-white",
    label: "text-blue-700",
    heading: "text-slate-950",
    panel: "border-slate-200 bg-blue-50/50",
    sectionTitle: "border-blue-200 text-blue-950",
    itemTitle: "text-slate-950"
  },
  classic: {
    shell: "border-stone-300 bg-stone-50",
    label: "font-serif text-stone-700",
    heading: "font-serif text-stone-950",
    panel: "border-stone-300 bg-white",
    sectionTitle: "border-stone-300 font-serif text-stone-950",
    itemTitle: "font-serif text-stone-950"
  },
  minimal: {
    shell: "border-slate-200 bg-white",
    label: "text-slate-500",
    heading: "text-slate-950",
    panel: "border-slate-200 bg-white",
    sectionTitle: "border-slate-200 text-slate-900",
    itemTitle: "text-slate-950"
  }
};

const hasText = (value: string | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

const joinPresent = (values: Array<string | undefined>, separator: string) =>
  values.filter(hasText).join(separator);

function CVItem({
  item,
  classes
}: Readonly<{ item: DocumentSectionItem; classes: TemplateClasses }>) {
  const metaLine = joinPresent([item.subtitle, item.dateRange], " | ");

  return (
    <article className="grid gap-2">
      {hasText(item.title) ? (
        <h4 className={`text-sm font-semibold ${classes.itemTitle}`}>
          {item.title}
        </h4>
      ) : null}
      {metaLine ? <p className="text-xs text-slate-500">{metaLine}</p> : null}
      {hasText(item.body) ? (
        <p className="text-sm leading-6 text-slate-700">{item.body}</p>
      ) : null}
      {item.bullets.length > 0 ? (
        <ul className="grid gap-1 pl-4 text-sm leading-6 text-slate-700">
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
        className={`border-b pb-2 text-sm font-semibold uppercase ${classes.sectionTitle}`}
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
  return (
    <article className={`rounded-md border p-5 ${classes.panel}`}>
      <p className={`text-xs font-semibold uppercase ${classes.label}`}>
        CV preview
      </p>
      <h2 className={`mt-2 text-2xl font-semibold ${classes.heading}`}>
        {cv?.title ?? "Untitled CV"}
      </h2>
      {hasText(cv?.summary) ? (
        <p className="mt-3 text-sm leading-6 text-slate-700">{cv.summary}</p>
      ) : null}

      <div className="mt-5 grid gap-5">
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
    </article>
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
    <article className={`rounded-md border p-5 ${classes.panel}`}>
      <p className={`text-xs font-semibold uppercase ${classes.label}`}>
        Cover letter preview
      </p>
      <h2 className={`mt-2 text-xl font-semibold ${classes.heading}`}>
        {coverLetter?.subject ?? "Untitled cover letter"}
      </h2>

      {coverLetter ? (
        <div className="mt-5 grid gap-4 text-sm leading-6 text-slate-700">
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
        <p className="mt-5 text-sm text-slate-500">No cover letter yet.</p>
      )}
    </article>
  );
}

export function DocumentTemplate({
  template,
  cv,
  coverLetter
}: DocumentTemplateProps) {
  const definition =
    templateDefinitions.find((currentTemplate) => currentTemplate.id === template) ??
    templateDefinitions[0];
  const classes = templateClassMap[definition.id];

  return (
    <section
      className={`grid gap-5 rounded-md border p-5 ${classes.shell}`}
      data-testid={`template-${definition.id}`}
    >
      <div>
        <p className={`text-xs font-semibold uppercase ${classes.label}`}>
          Template
        </p>
        <h2 className={`mt-1 text-xl font-semibold ${classes.heading}`}>
          {definition.name}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{definition.description}</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <CVPreview classes={classes} cv={cv} />
        <CoverLetterPreview classes={classes} coverLetter={coverLetter} />
      </div>
    </section>
  );
}
