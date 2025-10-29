# Heijō — Extension Packaging Guide (Chrome + O365)

This guide explains building/loading the app as a Chrome extension and Outlook (O365) add‑in for evaluation. Calendar/OAuth is not implemented in v1.

## Chrome Extension (MV3)

1. Build the app:
```bash
npm install
npm run build
```
2. Create `dist/extension` and include built assets and a `manifest.json`.
3. Load in Chrome: `chrome://extensions` → Developer Mode → Load unpacked → select `dist/extension`.

Minimal `manifest.json` example:
```json
{ "manifest_version": 3, "name": "Heijō Mini-Journal", "version": "1.0.0", "action": { "default_popup": "index.html" } }
```

Notes: You can host the app at `http://localhost:3000` and point `index.html` to it for local evaluation. Ensure CSP compatibility.

## Outlook (O365) Add‑in

1. Host the production build (Vercel or local HTTPS).
2. Create `manifest.xml` pointing to your hosted URL.
3. Sideload in Outlook (web or desktop) via the Upload custom add‑in flow.

Skeleton `manifest.xml` snippet:
```xml
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1" xsi:type="TaskPaneApp" Version="1.0.0.0" ProviderName="Heijō" DefaultLocale="en-US">
  <Id>00000000-0000-0000-0000-000000000000</Id>
  <DisplayName DefaultValue="Heijō Mini-Journal" />
  <Hosts><Host Name="Mailbox" /></Hosts>
  <DefaultSettings><SourceLocation DefaultValue="https://your-hosted-app.example.com/" /></DefaultSettings>
  <Permissions>ReadWriteItem</Permissions>
</OfficeApp>
```

## CSP & Limitations
- Avoid inline scripts/styles; follow extension and Office add‑in CSP rules.
- v1 has no Google/Microsoft calendar OAuth; analytics are local‑only.

## Troubleshooting
- Blank popup: verify paths and dev mode.
- CSP errors: remove inline code, adjust headers.
- Outlook: validate manifest and use HTTPS.
