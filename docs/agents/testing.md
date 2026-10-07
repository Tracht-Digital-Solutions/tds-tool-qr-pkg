# Testing

`npm run test:run` runs vitest. The island opts into jsdom through a
`@vitest-environment` docblock. The manifest suite runs in node.

- **`qrcode` is mocked**, so tests assert the exact payload string handed to it. The
  payload never reaches the DOM, so there is no other way to observe it. It is also
  the part that breaks silently: a bad `WIFI:` string still produces a scannable code
  that does nothing.
- `wifiEscape` covers `\ ; , : "`. Removing the escape makes
  `escapes the reserved characters in SSID and password` fail.
- Mocking keeps jsdom away from canvas rendering, which it cannot do. `toDataURL`
  and `HTMLAnchorElement.click` are stubbed for the download paths.
- The `margin: 2` assertion guards the QR quiet zone. At 0 many scanners reject the code.
