# @tracht-digital-solutions/tds-tool-qr

QR-Code-Generator tool package for the **TDS tools platform** (`tds-tools`).
Client-side QR generation for URL/Text, WLAN access and vCard contacts, with live
preview and PNG + SVG export. No network, no login — everything runs in the
browser.

This is a **tool package**: it exports a `ToolPackManifest`
(`@tracht-digital-solutions/tds-tools-contract`) plus the raw `.astro`/`.tsx`
components the `tds-tools` site composes at build time. Enable it by adding it to
the site's `toolHost({ packs: [...] })` array.

## Tools

| id | slug | premium | description |
|---|---|---|---|
| `qr-code` | `qr-code-generator` | no | URL / Text / WLAN / vCard → QR (PNG + SVG) |

## Develop

```bash
npm install
npm run type-check   # tsc on src/index.ts (the manifest)
npm run build        # tsup → dist manifest (islands ship raw)
```

The `.astro` shell + `.tsx` island are validated at the **site** build (they are
not in this package's tsconfig `include`). Releases run automatically on push to `main` (@latest); the manual button is for a minor/major bump.
