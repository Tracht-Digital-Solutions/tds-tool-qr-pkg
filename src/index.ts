import { defineToolPack, defineTool } from "@tracht-digital-solutions/tds-tools-contract";

/**
 * QR-Code tool pack. One tool today; the pack shape lets more QR-adjacent tools
 * (e.g. batch export) join later without a new repo.
 */
export default defineToolPack({
  id: "qr",
  name: "QR-Codes",
  version: "0.1.0",
  tools: [
    defineTool({
      id: "qr-code",
      slug: "qr-code-generator",
      name: "QR-Code-Generator",
      category: "marketing",
      description:
        "Erstelle QR-Codes für URLs, Text, WLAN-Zugänge oder Kontaktdaten — direkt im Browser, mit PNG- und SVG-Export.",
      icon: "qr-code",
      keywords: ["qr", "qr-code", "generator", "wlan", "vcard", "url"],
      component: "@tracht-digital-solutions/tds-tool-qr/tools/QrCode.astro",
      seo: {
        title: "QR-Code-Generator — kostenlos, ohne Anmeldung",
        description:
          "Kostenloser QR-Code-Generator für URL, Text, WLAN und vCard. PNG- und SVG-Download, alles lokal im Browser — keine Anmeldung nötig.",
        jsonLdType: "WebApplication",
      },
    }),
  ],
  i18n: {
    de: { "qr.title": "QR-Code-Generator" },
    en: { "qr.title": "QR Code Generator" },
  },
});
