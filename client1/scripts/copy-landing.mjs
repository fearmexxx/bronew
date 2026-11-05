// Serves the landing page (../site/index.html) at /home/ in the app's own
// build, so one Vercel deployment shows both. App links point back to "/".
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = resolve(root, "../site/index.html");
const target = resolve(root, "public/home/index.html");

if (!existsSync(source)) {
  console.warn(`Landing page not found at ${source}; skipping /home.`);
  process.exit(0);
}
mkdirSync(dirname(target), { recursive: true });
const html = readFileSync(source, "utf8").replaceAll("https://bronew.vercel.app/", "/");
writeFileSync(target, html);
console.log("Landing page copied to public/home/index.html");
