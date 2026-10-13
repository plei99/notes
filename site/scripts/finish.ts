// Runs after `bun build --app` and turns dist/ into the site:
//
// - Bake's React shell owns <html>, so each page's <template data-shell>
//   carries its language, and the shell's own <title> goes.
// - Pages have no client components, so Bake ships no client runtime; the
//   inlined RSC payload and the .rsc files that only it would read go too, and
//   so does React's render-blocking marker: it waits for an element at the very
//   end of the page, and a note can be megabytes long.
// - Each note's text, from generated/<slug>/_body.html, goes into its page.
//   It is often megabytes of MathML: React would copy it into the RSC payload
//   and, past 512 kB, warn that it cannot render it progressively.
// - public/ is copied, the browser scripts in client/ are compiled into js/,
//   themes.css is written, and each note's images and diagrams are copied
//   beside its page.
import { cp, rm } from "node:fs/promises";
import { allThemes, GENERATED, type Theme } from "../lib/site";

const OUT = "dist";
const rev = Date.now().toString(36);

async function finishPage(html: string) {
  let lang = "";
  let fragment = "";
  html = new HTMLRewriter()
    .on("div.note-body[data-fragment]", {
      element(el) {
        fragment = el.getAttribute("data-fragment")!;
        el.removeAttribute("data-fragment");
        el.setInnerContent("<!--body-->", { html: true });
      },
    })
    .on("template[data-shell]", {
      element(el) {
        lang = el.getAttribute("data-lang") ?? "";
        el.remove();
      },
    })
    .on('link[rel="expect"][blocking="render"]', {
      element(el) {
        el.remove();
      },
    })
    .on("template#_R_", {
      element(el) {
        el.remove();
      },
    })
    .transform(html);
  html = new HTMLRewriter()
    .on("html", {
      element(el) {
        if (lang) el.setAttribute("lang", lang);
      },
    })
    .transform(html)
    .replace("<title>Bun + React Server Components</title>", "")
    .replace(
      /<script>\(self\.__bun_f\|\|=\[\]\)\.push\([\s\S]*?<\/script>/g,
      "",
    )
    .replaceAll("__REV__", rev);
  if (!fragment) return html;
  const body = await Bun.file(`${GENERATED}/${fragment}/_body.html`).text();
  return html.replace("<!--body-->", () => body);
}

// Generated from data/themes.ts: one block per theme, selected by data-theme
// on <html>. The defaults also apply with no data-theme: the light one always,
// the dark one when the system is set to dark.
function themesCss() {
  const [light, dark] = [
    allThemes.find((t) => !t.dark)!,
    allThemes.find((t) => t.dark)!,
  ];
  const block = (t: Theme, indent: string) =>
    [
      `color-scheme: ${t.dark ? "dark" : "light"};`,
      ...(["paper", "text", "muted", "ink", "link", "rule"] as const).map((
        role,
      ) => `--${role}: ${t[role]};`),
      `--stage: ${
        t.stage || "color-mix(in srgb, var(--paper) 92%, var(--text))"
      };`,
      `--shadow: ${t.dark ? "rgb(0 0 0 / 0.6)" : "rgb(17 17 17 / 0.35)"};`,
    ].map((line) => indent + line).join("\n");
  let css = `:root {\n${
    block(light, "  ")
  }\n}\n\n@media (prefers-color-scheme: dark) {\n  :root:not([data-theme]) {\n${
    block(dark, "    ")
  }\n  }\n}\n`;
  for (const t of allThemes) {
    if (t !== light) {
      css += `\n:root[data-theme="${t.id}"] {\n${block(t, "  ")}\n}\n`;
    }
  }
  return css;
}

let pages = 0;
for (const file of new Bun.Glob("**/index.html").scanSync(OUT)) {
  const path = `${OUT}/${file}`;
  await Bun.write(path, await finishPage(await Bun.file(path).text()));
  pages++;
}
for (const file of new Bun.Glob("**/*.rsc").scanSync(OUT)) {
  await rm(`${OUT}/${file}`);
}
await rm(`${OUT}/_bun`, { recursive: true, force: true });

await cp("public", OUT, { recursive: true });

// Each browser script is compiled on its own, keeping its imports, so
// client/note.ts becomes js/note.js. client/inline/ is built into the pages.
const transpiler = new Bun.Transpiler({ loader: "ts", target: "browser" });
for (const file of new Bun.Glob("*.ts").scanSync("client")) {
  if (file.endsWith(".d.ts")) continue;
  const code = transpiler.transformSync(
    await Bun.file(`client/${file}`).text(),
  );
  await Bun.write(`${OUT}/js/${file.replace(/\.ts$/, ".js")}`, code);
}
await Bun.write(`${OUT}/themes.css`, themesCss());

// A note's images and its diagrams in each font pairing
// (diagrams/<pairing>.json) belong beside its page at /<slug>/. The fragments,
// whose names start with _, are already in the page.
let assets = 0;
for (
  const file of new Bun.Glob("**/*").scanSync({
    cwd: GENERATED,
    onlyFiles: true,
  })
) {
  const [slug, ...rest] = file.split("/");
  if (rest.length === 0 || rest.at(-1)!.startsWith("_")) continue;
  if (!(await Bun.file(`${OUT}/${slug}/index.html`).exists())) continue;
  await Bun.write(`${OUT}/${file}`, Bun.file(`${GENERATED}/${file}`));
  assets++;
}
console.log(`Finished ${pages} pages and ${assets} note files in ${OUT}/`);
