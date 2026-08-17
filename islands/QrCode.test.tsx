// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * The payload builder is the part worth testing here — the WLAN and vCard
 * formats are consumed by phone cameras, so a stray unescaped `;` or a missing
 * `VERSION:3.0` produces a QR code that scans but does nothing useful.
 *
 * That payload never reaches the DOM (it goes straight into `qrcode`), so the
 * library is mocked and the exact encoded string is asserted from the call.
 * That also keeps jsdom out of real canvas rendering, which it cannot do.
 */

const { toCanvas, toString: toSvgString } = vi.hoisted(() => ({
  toCanvas: vi.fn(),
  toString: vi.fn(),
}));

vi.mock("qrcode", () => ({
  default: { toCanvas, toString: toSvgString },
  toCanvas,
  toString: toSvgString,
}));

const { default: QrCode } = await import("./QrCode");

const user = () => userEvent.setup({ delay: null });

/** The payload string passed to the most recent toCanvas call. */
const lastPayload = (): string => {
  const calls = toCanvas.mock.calls;
  return calls.length ? (calls[calls.length - 1][1] as string) : "";
};

/** The options object of the most recent toCanvas call. */
const lastOptions = () => {
  const calls = toCanvas.mock.calls;
  return calls[calls.length - 1][2] as Record<string, unknown>;
};

const switchTo = async (tab: string) => user().click(screen.getByRole("tab", { name: tab }));
const fill = async (label: string, value: string) => {
  const input = screen.getByLabelText(label);
  await user().clear(input);
  await user().type(input, value);
};

beforeEach(() => {
  toCanvas.mockReset().mockResolvedValue(undefined);
  toSvgString.mockReset().mockResolvedValue("<svg/>");
});

afterEach(cleanup);

describe("URL / text mode", () => {
  it("encodes the default URL on mount", async () => {
    render(<QrCode />);
    await waitFor(() => expect(toCanvas).toHaveBeenCalled());
    expect(lastPayload()).toBe("https://tracht-digital.de");
  });

  it("encodes free text verbatim", async () => {
    render(<QrCode />);
    await fill("URL oder Text", "Hallo Welt");
    await waitFor(() => expect(lastPayload()).toBe("Hallo Welt"));
  });

  it("shows the empty hint and no payload when the text is cleared", async () => {
    render(<QrCode />);
    const area = screen.getByLabelText("URL oder Text");
    await user().clear(area);

    expect(await screen.findByText("Geben Sie Daten ein, um den QR-Code zu erzeugen.")).toBeDefined();
  });
});

describe("WLAN payload", () => {
  const goWifi = async () => {
    render(<QrCode />);
    await switchTo("WLAN");
  };

  it("produces nothing until an SSID is given", async () => {
    await goWifi();
    expect(await screen.findByText("Geben Sie Daten ein, um den QR-Code zu erzeugen.")).toBeDefined();
  });

  it("builds the standard WIFI: payload", async () => {
    await goWifi();
    await fill("Netzwerkname (SSID)", "Gaestenetz");
    await fill("Passwort", "geheim123");

    await waitFor(() => expect(lastPayload()).toBe("WIFI:S:Gaestenetz;T:WPA;P:geheim123;;"));
  });

  it("omits the password for an open network", async () => {
    await goWifi();
    await fill("Netzwerkname (SSID)", "Offen");
    await user().selectOptions(screen.getByLabelText("Verschlüsselung"), "nopass");

    await waitFor(() => expect(lastPayload()).toBe("WIFI:S:Offen;T:nopass;;"));
  });

  it("marks a hidden network", async () => {
    await goWifi();
    await fill("Netzwerkname (SSID)", "Versteckt");
    await fill("Passwort", "pw");
    await user().click(screen.getByLabelText("Verstecktes Netzwerk"));

    await waitFor(() => expect(lastPayload()).toBe("WIFI:S:Versteckt;T:WPA;P:pw;H:true;;"));
  });

  it("escapes the reserved characters in SSID and password", async () => {
    // \ ; , : and " all terminate or confuse a WIFI: field — a password like
    // `a;b` would otherwise silently truncate on the scanning phone.
    await goWifi();
    await fill("Netzwerkname (SSID)", 'Cafe;Bar');
    await fill("Passwort", 'p:a,s"s\\w');

    await waitFor(() =>
      expect(lastPayload()).toBe('WIFI:S:Cafe\\;Bar;T:WPA;P:p\\:a\\,s\\"s\\\\w;;'),
    );
  });

  it("switches encryption to WEP", async () => {
    await goWifi();
    await fill("Netzwerkname (SSID)", "Alt");
    await fill("Passwort", "x");
    await user().selectOptions(screen.getByLabelText("Verschlüsselung"), "WEP");

    await waitFor(() => expect(lastPayload()).toContain("T:WEP"));
  });
});

describe("vCard payload", () => {
  const goVcard = async () => {
    render(<QrCode />);
    await switchTo("Kontakt (vCard)");
  };

  it("produces nothing until name, phone or e-mail is given", async () => {
    await goVcard();
    expect(await screen.findByText("Geben Sie Daten ein, um den QR-Code zu erzeugen.")).toBeDefined();
  });

  it("builds a minimal valid vCard from just a name", async () => {
    await goVcard();
    await fill("Name", "Julian Tracht");

    await waitFor(() =>
      expect(lastPayload()).toBe("BEGIN:VCARD\nVERSION:3.0\nN:Julian Tracht\nEND:VCARD"),
    );
  });

  it("includes every optional field that is filled in", async () => {
    await goVcard();
    await fill("Name", "Julian Tracht");
    await fill("Firma (optional)", "Tracht Digital Solutions");
    await fill("Telefon (optional)", "+49 4151 000000");
    await fill("E-Mail (optional)", "info@tracht-digital.de");
    await fill("Website (optional)", "https://tracht-digital.de");

    await waitFor(() =>
      expect(lastPayload()).toBe(
        [
          "BEGIN:VCARD",
          "VERSION:3.0",
          "N:Julian Tracht",
          "ORG:Tracht Digital Solutions",
          "TEL:+49 4151 000000",
          "EMAIL:info@tracht-digital.de",
          "URL:https://tracht-digital.de",
          "END:VCARD",
        ].join("\n"),
      ),
    );
  });

  it("omits empty optional lines entirely", async () => {
    await goVcard();
    await fill("Telefon (optional)", "+4900");

    await waitFor(() => {
      const p = lastPayload();
      expect(p).toContain("TEL:+4900");
      expect(p).not.toContain("ORG:");
      expect(p).not.toContain("EMAIL:");
      expect(p).not.toContain("URL:");
    });
  });

  it("always opens and closes the vCard envelope", async () => {
    await goVcard();
    await fill("E-Mail (optional)", "a@b.de");

    await waitFor(() => {
      const lines = lastPayload().split("\n");
      expect(lines[0]).toBe("BEGIN:VCARD");
      expect(lines[1]).toBe("VERSION:3.0");
      expect(lines[lines.length - 1]).toBe("END:VCARD");
    });
  });
});

describe("render options", () => {
  it("passes the error-correction level through", async () => {
    render(<QrCode />);
    await user().selectOptions(screen.getByLabelText("Fehlerkorrektur"), "H");

    await waitFor(() => expect(lastOptions().errorCorrectionLevel).toBe("H"));
  });

  it("defaults to medium correction and a quiet-zone margin", async () => {
    render(<QrCode />);
    await waitFor(() => expect(toCanvas).toHaveBeenCalled());

    expect(lastOptions().errorCorrectionLevel).toBe("M");
    // margin 2 keeps the required quiet zone; 0 makes codes unscannable.
    expect(lastOptions().margin).toBe(2);
  });

  it("passes the chosen colours through", async () => {
    render(<QrCode />);
    await waitFor(() => expect(toCanvas).toHaveBeenCalled());

    expect(lastOptions().color).toEqual({ dark: "#0f172a", light: "#ffffff" });
  });

  it("surfaces an encoding failure as a message", async () => {
    toCanvas.mockRejectedValue(new Error("Daten zu lang"));
    render(<QrCode />);

    expect(await screen.findByText("Daten zu lang")).toBeDefined();
  });
});

describe("downloads", () => {
  it("disables both buttons while there is no payload", async () => {
    render(<QrCode />);
    await user().clear(screen.getByLabelText("URL oder Text"));

    await waitFor(() => {
      expect((screen.getByRole("button", { name: /PNG/ }) as HTMLButtonElement).disabled).toBe(
        true,
      );
      expect((screen.getByRole("button", { name: /SVG/ }) as HTMLButtonElement).disabled).toBe(
        true,
      );
    });
  });

  it("renders an SVG through the library and triggers a download", async () => {
    toSvgString.mockResolvedValue("<svg>qr</svg>");
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<QrCode />);
    await waitFor(() => expect(toCanvas).toHaveBeenCalled());
    await user().click(screen.getByRole("button", { name: /SVG/ }));

    await waitFor(() => expect(toSvgString).toHaveBeenCalled());
    expect(toSvgString.mock.calls[0][1]).toMatchObject({ type: "svg", margin: 2 });
    expect(click).toHaveBeenCalled();
  });

  it("downloads the canvas as a PNG data URL", async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi
      .spyOn(HTMLCanvasElement.prototype, "toDataURL")
      .mockReturnValue("data:image/png;base64,AAAA");

    render(<QrCode />);
    await waitFor(() => expect(toCanvas).toHaveBeenCalled());
    await user().click(screen.getByRole("button", { name: /PNG/ }));

    expect(click).toHaveBeenCalled();
  });
});

describe("mode switching", () => {
  it("marks exactly one tab selected", async () => {
    render(<QrCode />);
    const selected = () =>
      screen.getAllByRole("tab").filter((t) => t.getAttribute("aria-selected") === "true");

    expect(selected()).toHaveLength(1);
    expect(selected()[0].textContent).toBe("URL / Text");

    await switchTo("WLAN");
    expect(selected()).toHaveLength(1);
    expect(selected()[0].textContent).toBe("WLAN");
  });

  it("shows only the active mode's fields", async () => {
    render(<QrCode />);
    expect(screen.queryByLabelText("Netzwerkname (SSID)")).toBeNull();

    await switchTo("WLAN");
    expect(screen.getByLabelText("Netzwerkname (SSID)")).toBeDefined();
    expect(screen.queryByLabelText("URL oder Text")).toBeNull();
  });

  it("hides the password field for an open network", async () => {
    render(<QrCode />);
    await switchTo("WLAN");
    expect(screen.getByLabelText("Passwort")).toBeDefined();

    await user().selectOptions(screen.getByLabelText("Verschlüsselung"), "nopass");
    expect(screen.queryByLabelText("Passwort")).toBeNull();
  });
});

/**
 * The English branch. Every case above renders without props and so doubles
 * as the regression test for the German default.
 *
 * The PAYLOADS are not translated — a vCard's field names and a Wi-Fi
 * string's `WIFI:T:WPA;S:…` grammar are format, not copy. A scanner would
 * stop understanding them the moment they were localised, which is what the
 * last case pins.
 */
describe("in English", () => {
  it("translates the mode tabs", () => {
    render(<QrCode lang="en" />);
    expect(screen.getByRole("tab", { name: "Wi-Fi" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Contact (vCard)" })).toBeDefined();
    expect(screen.queryByRole("tab", { name: "WLAN" })).toBeNull();
  });

  it("translates the download buttons", () => {
    render(<QrCode lang="en" />);
    expect(screen.getByRole("button", { name: "Download PNG" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Download SVG" })).toBeDefined();
  });

  it("keeps the Wi-Fi payload grammar in both languages", async () => {
    const u = userEvent.setup({ delay: null });
    render(<QrCode lang="en" />);
    await u.click(screen.getByRole("tab", { name: "Wi-Fi" }));
    await u.type(screen.getByLabelText(/Network name/), "Werkstatt");
    // The payload is what a scanner reads. It must stay `WIFI:T:…;S:…;`
    // regardless of the interface language.
    await waitFor(() => expect(lastPayload()).toMatch(/^WIFI:S:Werkstatt;T:WPA;/));
  });
});
