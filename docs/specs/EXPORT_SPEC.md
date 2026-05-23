# EXPORT_SPEC.md

## PDF Strategy

Use HTML/CSS preview rendered to PDF via Playwright.

## Benefits

- preview and PDF can share structure
- good CSS support
- A4 control
- template consistency

## Requirements

- A4 layout
- no clipped content
- no external JavaScript
- validated content only
- CV export
- cover letter export

## Print CSS

```css
@page {
  size: A4;
  margin: 16mm;
}

.page {
  width: 210mm;
  min-height: 297mm;
}

.page-break {
  page-break-before: always;
}
```

## Templates

- modern
- classic
- minimal
