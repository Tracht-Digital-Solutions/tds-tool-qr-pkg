# Architecture

## Layout

- `src/index.ts` — the `ToolPackManifest` (`defineToolPack` + `defineTool`). It is the
  only file tsup compiles and the only file `tsc` type-checks.
- `tools/*.astro` — tool shells that the site's `/tools/[slug]` template renders.
- `islands/*.tsx` — hydrated React islands (`client:load`). QR rendering and PNG/SVG
  export use the `qrcode` dependency. Nothing leaves the browser.

## Manifest contract

- `component` is a package subpath such as `@…/tds-tool-qr/tools/QrCode.astro`,
  resolved via `exports`. Never use a relative path.
- Tool `id` and `slug` must stay unique across all composed packs. The site build
  fails hard on a collision.

## Compilation and dependencies

- `islands/` and `tools/` are **not** in this repo's tsconfig `include`. They ship as
  raw source and compile in the `tds-tools-frontend` build. That build is the real
  gate for a markup change.
- Keep dependencies explicit. `qrcode` is a real dependency so that the site installs
  it transitively.
- Styling comes from `tds-shared-pkg` tokens and Tailwind utilities provided by the
  site. Don't inline a design system here (see [conventions.md](conventions.md)).
