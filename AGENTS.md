# AGENTS.md — tds-tool-qr-pkg

A **tool package** for the TDS tools platform. Read `tds-tools-contract-pkg`'s
AGENTS.md for the platform model; this repo just contributes tools.

## Shape

- `src/index.ts` — the `ToolPackManifest` (`defineToolPack` + `defineTool`). The
  only file tsup compiles + the only file `tsc` type-checks.
- `tools/*.astro` — tool shells the site's `/tools/[slug]` template renders.
- `islands/*.tsx` — hydrated React islands (`client:load`). Fully client-side;
  QR rendering + PNG/SVG export via the `qrcode` dependency, no network.

## Tests

`npm run test:run` (vitest). The island opts into jsdom via a
`@vitest-environment` docblock; the manifest suite runs in node.

- **The `qrcode` library is mocked**, so the tests assert the exact payload
  string handed to it. That payload never reaches the DOM, so there is no other
  way to observe it — and it is the part that breaks silently (a bad `WIFI:`
  string still produces a scannable code that simply does nothing).
- `wifiEscape` covers `\ ; , : "`. Removing the escape makes
  `escapes the reserved characters in SSID and password` fail — verified.
- Mocking also keeps jsdom away from real canvas rendering, which it cannot do.
  `toDataURL` and `HTMLAnchorElement.click` are stubbed for the download paths.
- The `margin: 2` assertion guards the QR quiet zone; dropping it to 0 produces
  codes many scanners reject.

## Gotchas

- **This pack ships NO CSS — every control must carry a shared class.** The tools
  site renders on the `blog` surface (it moved there 2026-08-17; it was `panel`
  before, and both are token-only layers), and a surface layer only sets tokens: they
  reach an element through `btn` / `chip` / `field-boxed` / `tds-card`. A
  `<button>` without `btn` therefore has no padding, no radius and no 44px touch
  target, and an `<input>` without `field-boxed` renders **invisible**, because
  Tailwind preflight zeroes borders.
  Until 2026-08-16 every button in this pack was bare and the markup wrote its own
  radii — `rounded-full` tabs (the *marketing* pill) and `rounded-lg` inputs, long
  after the site had left the marketing surface. That is why the tools rounded
  differently from everything around them. `npm run lint:primitives` runs in CI and fails on a bare
  control; the script is a byte-identical copy of the seed in `tds-ext-template-pkg`.
- **Never hand-author a radius, and do not reach for `rounded-[var(--tds-radius-*)]`
  either.** Tailwind does not generate arbitrary values out of a package inside
  `node_modules`, so from here that ships as no rule at all. Use the shared class.
- **Don't draw a line — the consuming site is borderless.** `tds-tools-frontend`
  renders the blog surface's flat variant (`data-flat`, tds-shared 0.25.1):
  no outlines anywhere, separation by fill, tone and spacing. A hand-authored
  `border-t` between the input group and the options grid survived that change
  and was, verifiably, the only 1px line left on the entire site — replaced by
  padding on 2026-08-17. `lint-primitives` does not check for this (a border is
  not a missing class), and neither does the build; walk the rendered page at
  1280 and 375 and count `borderWidth > 0`.
- **Attribute order no longer matters, and neither does what you name a class
  constant** (fixed 2026-08-16). `lint-primitives` used to match a tag with
  `[^>]*>`, which stops at the first `>` — and an arrow handler
  (`onClick={() => …}`) supplies one, so a correctly classed control written after
  its handler was reported as bare. It also read `className={x}` as the literal
  text `x`, so `{field}` passed and `{area}` did not. The script now walks the tag
  tracking quotes and brace depth, and resolves a local `const` to its string.
  Both workarounds are gone; all 20 repos carry the identical fixed script.
- **`islands/` is NOT type-checked here** (`tsconfig` covers `src/**/*` only). The
  islands are compiled by the tds-tools-frontend build — that build is the real
  gate for a markup change, not `npm run type-check`.

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
