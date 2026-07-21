# AGENTS.md — tds-tool-qr-pkg

A **tool package** for the TDS tools platform. Read `tds-tools-contract-pkg`'s
AGENTS.md for the platform model; this repo just contributes tools.

## Shape

- `src/index.ts` — the `ToolPackManifest` (`defineToolPack` + `defineTool`). The
  only file tsup compiles + the only file `tsc` type-checks.
- `tools/*.astro` — tool shells the site's `/tools/[slug]` template renders.
- `islands/*.tsx` — hydrated React islands (`client:load`). Fully client-side;
  QR rendering + PNG/SVG export via the `qrcode` dependency, no network.

## Gotchas

- `component` in the manifest is a **package subpath** (`@…/tds-tool-qr/tools/QrCode.astro`),
  resolved via `exports` — never a relative path.
- Tool `id` + `slug` must stay globally unique across all composed packs (the
  site build hard-errors on a collision).
- Islands/.astro are **not** in this repo's tsconfig `include` — they compile at
  the site build. Keep them dependency-explicit (`qrcode` is a real dependency so
  the site installs it transitively).
- Styling uses tds-shared-pkg tokens + Tailwind utilities provided by the site; don't
  inline a design system here.
- Version stays in the `0.1.x` line unless coordinated (the site pins `^0.1.x`).
