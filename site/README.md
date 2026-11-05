# Landing site

Static marketing page for the root domain. The app (`client1/`) moves to an `app.` subdomain.

- One file, no build step: `site/index.html`.
- To rename, replace `BrotherPay` in `index.html`. To point at the app's new address, replace `https://bronew.vercel.app/` (every app link has a `data-app` attribute).
- Deploy as its own Vercel project with Root Directory `site` and Framework Preset "Other".

## Test deployment

`client1` copies this page to `/home/` on every build (`client1/scripts/copy-landing.mjs`), so the app's Vercel deployment serves both: the app at `/` and the landing page at `/home/`. App links on the copy point to `/`.
