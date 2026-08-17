import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";

type Mode = "url" | "wifi" | "vcard";
type Ecc = "L" | "M" | "Q" | "H";

/** Escape the special characters in a WLAN QR payload (`\ ; , : "`). */
function wifiEscape(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

/** Build the raw string a QR code encodes from the current form state. */
function buildPayload(state: {
  mode: Mode;
  text: string;
  ssid: string;
  password: string;
  encryption: "WPA" | "WEP" | "nopass";
  hidden: boolean;
  name: string;
  org: string;
  phone: string;
  email: string;
  vurl: string;
}): string {
  if (state.mode === "wifi") {
    if (!state.ssid) return "";
    const parts = [
      `S:${wifiEscape(state.ssid)}`,
      `T:${state.encryption}`,
      state.encryption !== "nopass" ? `P:${wifiEscape(state.password)}` : "",
      state.hidden ? "H:true" : "",
    ].filter(Boolean);
    return `WIFI:${parts.join(";")};;`;
  }
  if (state.mode === "vcard") {
    if (!state.name && !state.email && !state.phone) return "";
    return [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:${state.name}`,
      state.org ? `ORG:${state.org}` : "",
      state.phone ? `TEL:${state.phone}` : "",
      state.email ? `EMAIL:${state.email}` : "",
      state.vurl ? `URL:${state.vurl}` : "",
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return state.text;
}

/** See the tools-site convention: labels are translated, logic is not. */
type Lang = "de" | "en";

interface Strings {
  renderFailed: string;
  qrType: string;
  tabUrl: string;
  tabWifi: string;
  tabVcard: string;
  urlOrText: string;
  ssid: string;
  encryption: string;
  noPassword: string;
  password: string;
  hiddenNetwork: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  optional: string;
  ecc: string;
  eccLow: string;
  eccMedium: string;
  eccHigh: string;
  eccVeryHigh: string;
  size: string;
  foreground: string;
  background: string;
  emptyHint: string;
  downloadPng: string;
  downloadSvg: string;
}

/** German is the default — every existing test here asserts German labels. */
const STRINGS = {
  de: {
    renderFailed: "QR-Code konnte nicht erstellt werden.",
    qrType: "QR-Typ",
    tabUrl: "URL / Text",
    tabWifi: "WLAN",
    tabVcard: "Kontakt (vCard)",
    urlOrText: "URL oder Text",
    ssid: "Netzwerkname (SSID)",
    encryption: "Verschlüsselung",
    noPassword: "Kein Passwort",
    password: "Passwort",
    hiddenNetwork: "Verstecktes Netzwerk",
    name: "Name",
    company: "Firma",
    phone: "Telefon",
    email: "E-Mail",
    website: "Website",
    optional: "(optional)",
    ecc: "Fehlerkorrektur",
    eccLow: "Niedrig (L)",
    eccMedium: "Mittel (M)",
    eccHigh: "Hoch (Q)",
    eccVeryHigh: "Sehr hoch (H)",
    size: "Größe",
    foreground: "Vordergrund",
    background: "Hintergrund",
    emptyHint: "Geben Sie Daten ein, um den QR-Code zu erzeugen.",
    downloadPng: "PNG herunterladen",
    downloadSvg: "SVG herunterladen",
  },
  en: {
    renderFailed: "The QR code could not be created.",
    qrType: "QR type",
    tabUrl: "URL / text",
    tabWifi: "Wi-Fi",
    tabVcard: "Contact (vCard)",
    urlOrText: "URL or text",
    ssid: "Network name (SSID)",
    encryption: "Encryption",
    noPassword: "No password",
    password: "Password",
    hiddenNetwork: "Hidden network",
    name: "Name",
    company: "Company",
    phone: "Phone",
    email: "Email",
    website: "Website",
    optional: "(optional)",
    ecc: "Error correction",
    eccLow: "Low (L)",
    eccMedium: "Medium (M)",
    eccHigh: "High (Q)",
    eccVeryHigh: "Very high (H)",
    size: "Size",
    foreground: "Foreground",
    background: "Background",
    emptyHint: "Enter some data to generate the QR code.",
    downloadPng: "Download PNG",
    downloadSvg: "Download SVG",
  },
} satisfies Record<Lang, Strings>;

interface Props {
  lang?: Lang;
}

/**
 * Fully client-side QR-Code-Generator: URL/Text, WLAN and vCard payloads, live
 * canvas preview, and PNG + SVG download. No network, no login — everything
 * happens in the browser.
 */
export default function QrCode({ lang = "de" }: Props) {
  const t = STRINGS[lang];
  const [mode, setMode] = useState<Mode>("url");
  const [text, setText] = useState("https://tracht-digital.de");
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [encryption, setEncryption] = useState<"WPA" | "WEP" | "nopass">("WPA");
  const [hidden, setHidden] = useState(false);
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [vurl, setVurl] = useState("");

  const [ecc, setEcc] = useState<Ecc>("M");
  const [size, setSize] = useState(320);
  const [fg, setFg] = useState("#0f172a");
  const [bg, setBg] = useState("#ffffff");
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const payload = useMemo(
    () =>
      buildPayload({ mode, text, ssid, password, encryption, hidden, name, org, phone, email, vurl }),
    [mode, text, ssid, password, encryption, hidden, name, org, phone, email, vurl],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!payload) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      setError(null);
      return;
    }
    QRCode.toCanvas(canvas, payload, {
      width: size,
      errorCorrectionLevel: ecc,
      margin: 2,
      color: { dark: fg, light: bg },
    })
      .then(() => setError(null))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : t.renderFailed));
  }, [payload, size, ecc, fg, bg]);

  const download = (href: string, filename: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas || !payload) return;
    download(canvas.toDataURL("image/png"), "qr-code.png");
  };

  const downloadSvg = async () => {
    if (!payload) return;
    const svg = await QRCode.toString(payload, {
      type: "svg",
      errorCorrectionLevel: ecc,
      margin: 2,
      color: { dark: fg, light: bg },
    });
    download(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, "qr-code.svg");
  };

  // Geometry, border and padding come from the shared primitive, never from
  // this file: the pack ships no CSS, and the radius has to follow whatever
  // surface composes it (`--tds-radius-input` is 0.5rem on the panel, 4px on
  // marketing). A hand-rolled `rounded-lg` pinned it to one surface.
  const field = "field-boxed w-full";

  return (
    <div className="qr-tool grid gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="qr-tool__form space-y-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t.qrType}>
          {(
            [
              ["url", t.tabUrl],
              ["wifi", t.tabWifi],
              ["vcard", t.tabVcard],
            ] as [Mode, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              className={mode === value ? "chip chip-active" : "chip"}
              onClick={() => setMode(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "url" && (
          <label className="block text-sm">
            <span className="mb-1 block opacity-80">{t.urlOrText}</span>
            <textarea className={field} rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
        )}

        {mode === "wifi" && (
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block opacity-80">{t.ssid}</span>
              <input className={field} value={ssid} onChange={(e) => setSsid(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block opacity-80">{t.encryption}</span>
              <select
                className={field}
                value={encryption}
                onChange={(e) => setEncryption(e.target.value as "WPA" | "WEP" | "nopass")}
              >
                <option value="WPA">WPA / WPA2 / WPA3</option>
                <option value="WEP">WEP</option>
                <option value="nopass">{t.noPassword}</option>
              </select>
            </label>
            {encryption !== "nopass" && (
              <label className="block text-sm">
                <span className="mb-1 block opacity-80">{t.password}</span>
                <input className={field} value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
              {t.hiddenNetwork}
            </label>
          </div>
        )}

        {mode === "vcard" && (
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block opacity-80">{t.name}</span>
              <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block opacity-80">{t.company} {t.optional}</span>
              <input className={field} value={org} onChange={(e) => setOrg(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block opacity-80">{t.phone} {t.optional}</span>
              <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block opacity-80">{t.email} {t.optional}</span>
              <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block opacity-80">{t.website} {t.optional}</span>
              <input className={field} value={vurl} onChange={(e) => setVurl(e.target.value)} />
            </label>
          </div>
        )}

        {/* Separated by SPACING, not by a rule. The tools site renders on the
            panel surface's flat variant (`data-flat`, tds-shared 0.24.2) —
            no outlines anywhere — and this `border-t` was the single 1px line
            left on the whole site once that shipped. Judge it in a browser:
            it is invisible in a diff and obvious on the page. */}
        <div className="grid grid-cols-2 gap-3 pt-6">
          <label className="block text-sm">
            <span className="mb-1 block opacity-80">{t.ecc}</span>
            <select className={field} value={ecc} onChange={(e) => setEcc(e.target.value as Ecc)}>
              <option value="L">{t.eccLow}</option>
              <option value="M">{t.eccMedium}</option>
              <option value="Q">{t.eccHigh}</option>
              <option value="H">{t.eccVeryHigh}</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block opacity-80">{t.size}: {size}px</span>
            <input type="range" min={128} max={640} step={16} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block opacity-80">{t.foreground}</span>
            <input type="color" className="field-boxed h-10 w-full" value={fg} onChange={(e) => setFg(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block opacity-80">{t.background}</span>
            <input type="color" className="field-boxed h-10 w-full" value={bg} onChange={(e) => setBg(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="qr-tool__preview flex flex-col items-center gap-3">
        {/* `max-w-full h-auto` is load-bearing, not cosmetic: the canvas takes
            its intrinsic width from the size slider (up to 640px), and inside
            the tool card's padding that overflowed a 375px viewport from the
            day this shipped. `body { overflow-x: hidden }` CLIPS that instead
            of revealing it, so there was no scrollbar and no warning — the
            preview, the download buttons and the page's right edge were simply
            gone on a phone. */}
        <canvas ref={canvasRef} width={size} height={size} className="tds-card h-auto max-w-full" />
        {error && <p className="status-pill status-pill--danger text-sm">{error}</p>}
        {!payload && !error && <p className="text-sm opacity-70">{t.emptyHint}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={downloadPng} disabled={!payload} className="btn btn-primary">
            {t.downloadPng}
          </button>
          <button type="button" onClick={downloadSvg} disabled={!payload} className="btn btn-ghost">
            {t.downloadSvg}
          </button>
        </div>
      </div>
    </div>
  );
}
