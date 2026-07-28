import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import pack from "./index";

/**
 * Manifest contract tests. The tools site composes every pack at build time and
 * `composeToolPacks` hard-errors on a duplicate tool `id` or `slug` across ALL
 * packs — a collision here breaks the *site* build, not this repo's, so it is
 * cheaper to catch locally.
 */

const repoRoot = new URL("..", import.meta.url);
const pkg = JSON.parse(readFileSync(new URL("package.json", repoRoot), "utf8")) as {
  name: string;
  files: string[];
};

describe("pack envelope", () => {
  it("declares a stable pack id and name", () => {
    expect(pack.id).toBe("qr");
    expect(pack.name).toBe("QR-Codes");
  });

  it("ships the QR generator", () => {
    expect(pack.tools.map((t) => t.id)).toEqual(["qr-code"]);
  });
});

describe("tool ids and slugs", () => {
  it("has no duplicate id or slug within the pack", () => {
    const ids = pack.tools.map((t) => t.id);
    const slugs = pack.tools.map((t) => t.slug);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses URL-safe slugs (they become /tools/<slug>)", () => {
    for (const t of pack.tools) {
      expect(t.slug, `slug of ${t.id}`).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(encodeURIComponent(t.slug)).toBe(t.slug);
    }
  });

  it("keeps the public slug stable", () => {
    // /tools/qr-code-generator is the indexed URL and the SEO target.
    expect(pack.tools[0]?.slug).toBe("qr-code-generator");
  });
});

describe("required tool fields", () => {
  it("describes the tool fully", () => {
    const [tool] = pack.tools;
    if (!tool) throw new Error("the pack declares no tools");

    expect(tool.name.length).toBeGreaterThan(3);
    expect(tool.description.length).toBeGreaterThan(20);
    expect(tool.icon).toBeTruthy();
    expect(tool.category).toMatch(/^(developer|design|marketing|media)$/);

    const { keywords } = tool;
    if (!keywords) throw new Error("qr-code has no keywords");
    expect(keywords.length).toBeGreaterThan(2);
  });

  it("carries SEO metadata within search-result budgets", () => {
    for (const t of pack.tools) {
      const { title, description } = t.seo ?? {};
      if (!title || !description) throw new Error(`tool ${t.id} has an incomplete seo block`);
      expect(title.length, `seo.title of ${t.id}`).toBeLessThanOrEqual(70);
      expect(description.length, `seo.description of ${t.id}`).toBeGreaterThan(50);
      expect(description.length, `seo.description of ${t.id}`).toBeLessThanOrEqual(170);
    }
  });

  it("declares the JSON-LD type the tool pages emit", () => {
    expect(pack.tools[0]?.seo?.jsonLdType).toBe("WebApplication");
  });
});

describe("component wiring", () => {
  it("points the component at this package's own tools/ directory", () => {
    for (const t of pack.tools) {
      expect(t.component.startsWith(`${pkg.name}/tools/`), `${t.id} component`).toBe(true);
      expect(t.component.endsWith(".astro")).toBe(true);
    }
  });

  it("resolves every component to a file that actually exists", () => {
    // A typo here surfaces only as an ENOENT during the tools-site build.
    for (const t of pack.tools) {
      const rel = t.component.slice(`${pkg.name}/`.length);
      expect(existsSync(fileURLToPath(new URL(rel, repoRoot))), `missing ${rel}`).toBe(true);
    }
  });

  it("publishes the directories the site consumes as source", () => {
    expect(pkg.files).toContain("tools");
    expect(pkg.files).toContain("islands");
  });
});

describe("i18n", () => {
  it("provides the same keys in German and English", () => {
    const de = Object.keys(pack.i18n?.de ?? {}).sort();
    const en = Object.keys(pack.i18n?.en ?? {}).sort();
    expect(de).toEqual(en);
    expect(de.length).toBeGreaterThan(0);
  });

  it("namespaces every i18n key under the pack id", () => {
    for (const key of Object.keys(pack.i18n?.de ?? {})) {
      expect(key.startsWith(`${pack.id}.`), `key "${key}"`).toBe(true);
    }
  });
});
