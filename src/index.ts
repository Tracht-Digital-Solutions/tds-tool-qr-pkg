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
        "QR-Codes kostenlos erstellen, ohne Anmeldung: für Links, Text, WLAN-Zugänge oder Kontaktdaten. Download als PNG oder SVG; die Codes laufen nicht ab.",
      icon: "qr-code",
      keywords: [
        "qr code erstellen",
        "qr code kostenlos",
        "qr code ohne anmeldung",
        "qr-code-generator",
        "wlan qr code",
        "vcard",
        "url",
      ],
      component: "@tracht-digital-solutions/tds-tool-qr/tools/QrCode.astro",
      seo: {
        title: "QR-Code erstellen – kostenlos & ohne Anmeldung",
        description:
          "QR-Code kostenlos erstellen, ohne Anmeldung und ohne Ablaufdatum: für Link, Text, WLAN und vCard. Download als PNG oder SVG, direkt im Browser.",
        jsonLdType: "WebApplication",
      },
    }),
  ],
  i18n: {
    de: { "qr.title": "QR-Code-Generator" },
    en: { "qr.title": "QR Code Generator" },
  },
});
