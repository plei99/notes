// Local preview: build with Bake, serve dist/ at http://localhost:3001/notes/,
// and rebuild when a source file changes, as the homepage's dev server does
// (3001, so both can run at once). Bake has its own dev server with hot
// reloading, but it renders pages on request and skips scripts/finish.ts, so
// this serves the same files GitHub Pages would. Fonts come from the live
// homepage, as on the published site.
import { watch } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";

const OUT = "dist";
const BASE = "/notes";
const SOURCES = [
  "pages",
  "components",
  "lib",
  "data",
  "client",
  "public",
  "generated",
];

async function build() {
  const started = performance.now();
  // Bake writes into dist/ without clearing it, so every build starts clean.
  await rm(OUT, { recursive: true, force: true });
  for (const args of [["build", "--app"], ["scripts/finish.ts"]]) {
    const proc = Bun.spawn([process.execPath, ...args], {
      stdout: "ignore",
      stderr: "inherit",
    });
    if ((await proc.exited) !== 0) {
      return console.error(`bun ${args.join(" ")} failed`);
    }
  }
  console.log(`Built in ${(performance.now() - started).toFixed(0)} ms`);
}

await build();

// Only rebuild for files modified since the last build started; copying or
// reading files can fire watch events on macOS too.
let lastBuild = Date.now();
let timer: Timer | undefined;
for (const dir of SOURCES) {
  watch(dir, { recursive: true }, async (_, name) => {
    const stat = name &&
      (await Bun.file(path.join(dir, name)).stat().catch(() => null));
    if (stat && stat.mtimeMs < lastBuild) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      lastBuild = Date.now();
      build().catch(console.error);
    }, 100);
  });
}

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3001),
  async fetch(req) {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p === "/" || p === BASE) return Response.redirect(`${BASE}/`);
    if (!p.startsWith(`${BASE}/`)) {
      return new Response("Not found", { status: 404 });
    }
    p = p.slice(BASE.length);
    if (p.endsWith("/")) p += "index.html";
    const file = Bun.file(path.join(OUT, path.normalize(p)));
    if (await file.exists()) return new Response(file);
    return new Response("Not found", { status: 404 });
  },
});
console.log(`Serving ${OUT} at ${server.url}notes/`);
