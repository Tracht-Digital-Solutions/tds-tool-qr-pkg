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

/**
 * Fully client-side QR-Code-Generator: URL/Text, WLAN and vCard payloads, live
 * canvas preview, and PNG + SVG download. No network, no login — everything
 * happens in the browser.
 */
export default function QrCode() {
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
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "QR-Code konnte nicht erstellt werden."));
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

  const field = "w-full rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-paper)] px-3 py-2";

  return (
    <div className="qr-tool grid gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="qr-tool__form space-y-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="QR-Typ">
          {(
            [
              ["url", "URL / Text"],
              ["wifi", "WLAN"],
              ["vcard", "Kontakt (vCard)"],
            ] as [Mode, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={`rounded-full px-4 py-1.5 text-sm ${
                mode === value
                  ? "bg-[color:var(--color-primary)] text-[color:var(--color-paper)]"
                  : "border border-[color:var(--color-border)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "url" && (
          <label className="block text-sm">
            <span className="mb-1 block opacity-80">URL oder Text</span>
            <textarea className={field} rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
        )}

        {mode === "wifi" && (
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block opacity-80">Netzwerkname (SSID)</span>
              <input className={field} value={ssid} onChange={(e) => setSsid(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block opacity-80">Verschlüsselung</span>
              <select
                className={field}
                value={encryption}
                onChange={(e) => setEncryption(e.target.value as "WPA" | "WEP" | "nopass")}
              >
                <option value="WPA">WPA / WPA2 / WPA3</option>
                <option value="WEP">WEP</option>
                <option value="nopass">Kein Passwort</option>
              </select>
            </label>
            {encryption !== "nopass" && (
              <label className="block text-sm">
                <span className="mb-1 block opacity-80">Passwort</span>
                <input className={field} value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
              Verstecktes Netzwerk
            </label>
          </div>
        )}

        {mode === "vcard" && (
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block opacity-80">Name</span>
              <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block opacity-80">Firma (optional)</span>
              <input className={field} value={org} onChange={(e) => setOrg(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block opacity-80">Telefon (optional)</span>
              <input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block opacity-80">E-Mail (optional)</span>
              <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block opacity-80">Website (optional)</span>
              <input className={field} value={vurl} onChange={(e) => setVurl(e.target.value)} />
            </label>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 border-t border-[color:var(--color-border)] pt-4">
          <label className="block text-sm">
            <span className="mb-1 block opacity-80">Fehlerkorrektur</span>
            <select className={field} value={ecc} onChange={(e) => setEcc(e.target.value as Ecc)}>
              <option value="L">Niedrig (L)</option>
              <option value="M">Mittel (M)</option>
              <option value="Q">Hoch (Q)</option>
              <option value="H">Sehr hoch (H)</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block opacity-80">Größe: {size}px</span>
            <input type="range" min={128} max={640} step={16} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block opacity-80">Vordergrund</span>
            <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} className="h-10 w-full" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block opacity-80">Hintergrund</span>
            <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-10 w-full" />
          </label>
        </div>
      </div>

      <div className="qr-tool__preview flex flex-col items-center gap-3">
        <canvas ref={canvasRef} width={size} height={size} className="rounded-xl border border-[color:var(--color-border)]" />
        {error && <p className="status-pill status-pill--danger text-sm">{error}</p>}
        {!payload && !error && <p className="text-sm opacity-70">Gib Daten ein, um den QR-Code zu erzeugen.</p>}
        <div className="flex gap-2">
          <button type="button" onClick={downloadPng} disabled={!payload} className="rounded-lg bg-[color:var(--color-primary)] px-4 py-2 text-sm text-[color:var(--color-paper)] disabled:opacity-50">
            PNG herunterladen
          </button>
          <button type="button" onClick={downloadSvg} disabled={!payload} className="rounded-lg border border-[color:var(--color-border)] px-4 py-2 text-sm disabled:opacity-50">
            SVG herunterladen
          </button>
        </div>
      </div>
    </div>
  );
}
