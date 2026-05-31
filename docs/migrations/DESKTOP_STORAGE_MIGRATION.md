# Desktop Storage Migration

## Current Desktop Location

Electron stores projects in a deterministic local JSON file:

```text
<Electron userData>/projects.json
```

The exact path is available through the desktop storage bridge via
`storage.getLocation()`.

## JSON Import And Export Path

The desktop bridge now exposes project JSON import and export primitives:

- `storage.exportProjectsJson(filePath)`
- `storage.importProjectsJson({ filePath, mode })`

`mode: "merge"` keeps existing projects and replaces only matching project IDs.
`mode: "replace"` replaces the desktop project list with the imported file.

## Existing Browser IndexedDB Data

Older browser-only builds stored projects in IndexedDB under the
`ollama-cv-creator` database. That data is not deleted. The browser fallback
still reads IndexedDB when the Electron bridge is unavailable.

To migrate existing browser projects into the desktop store, export the projects
as JSON from the browser fallback or a temporary migration utility, then import
that JSON through the desktop storage bridge. The imported file is validated
before it is written to `projects.json`.
