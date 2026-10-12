import lume from "lume/mod.ts";

// The notes live at https://plei99.github.io/notes/, beside the homepage. Being
// on the same origin, they share its saved theme and font choices.
const site = lume({
  src: "./src",
  dest: "./_site",
  location: new URL("https://plei99.github.io/notes/"),
});

// A per-build id for the stylesheet and script URLs, as on the homepage: GitHub
// Pages caches for ten minutes, so fresh HTML could otherwise meet stale CSS.
site.data("rev", Date.now().toString(36));

site.copy("styles.css");
site.copy("js");
site.copy("fonts");

// build/build.py writes each note into src/n/<slug>/: the HTML fragments, which
// notes.page.ts reads (their names start with _, so Lume skips them), any
// images the note includes, and its diagrams in each font pairing
// (diagrams/<pairing>.json), which belong beside the note's page at /<slug>/.
site.copy(
  [".png", ".jpg", ".jpeg", ".gif", ".svg", ".json"],
  (path) => path.replace(/^\/n\//, "/"),
);

// The compiled PDF of a note, when the repository has one.
const repo = new URL("../", import.meta.url);
site.filter("pdf", (source: string) => {
  const pdf = source.replace(/\.tex$/, ".pdf");
  try {
    Deno.statSync(new URL(pdf, repo));
    return `https://github.com/plei99/notes/raw/main/${pdf}`;
  } catch {
    return "";
  }
});

// "algebraic geometry" -> "algebraic-geometry", for data attributes and URLs.
site.filter(
  "key",
  (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
);

// ["a", "b", "c"] -> "a, b and c"
site.filter("conjoin", (items: string[]) =>
  items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

export default site;
