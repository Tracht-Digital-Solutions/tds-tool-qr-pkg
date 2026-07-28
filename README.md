# @tracht-digital-solutions/tds-tool-qr

QR-Code-Generator tool package for the **TDS tools platform** (`tds-tools-frontend`).
Client-side QR generation for URL/Text, WLAN access and vCard contacts, with live
preview and PNG + SVG export. No network, no login — everything runs in the
browser.

This is a **tool package**: it exports a `ToolPackManifest`
(`@tracht-digital-solutions/tds-tools-contract`) plus the raw `.astro`/`.tsx`
components the `tds-tools-frontend` site composes at build time. Enable it by adding it to
the site's `toolHost({ packs: [...] })` array.

## Tools

| id | slug | premium | description |
|---|---|---|---|
| `qr-code` | `qr-code-generator` | no | URL / Text / WLAN / vCard → QR (PNG + SVG) |

## Develop

```bash
npm install
npm run type-check   # tsc on src/index.ts (the manifest)
npm run test:run     # vitest — manifest contract + payload builder
npm run build        # tsup → dist manifest (islands ship raw)
```

## Tests

- **`src/index.test.ts`** — manifest contract: unique + URL-safe ids/slugs, SEO
  length budgets, and that the declared `component` resolves to a file the
  `files` list actually publishes.
- **`islands/QrCode.test.tsx`** — the payload builder, the part that can break
  silently. The `qrcode` library is mocked so the exact encoded string is
  asserted: the `WIFI:` format (open / WEP / hidden), **escaping of the reserved
  `\ ; , : "` characters**, the vCard envelope and its optional lines, the
  render options (ECC, the `margin: 2` quiet zone, colours) and both downloads.

A WLAN password containing `;` is the case worth remembering — unescaped, the
payload truncates, and the code still scans but joins nothing.

The `.astro` shell + `.tsx` island are validated at the **site** build (they are
not in this package's tsconfig `include`). Releases run automatically on push to `main` (@latest); the manual button is for a minor/major bump.
