// Data and helpers shared by the pages. Everything here runs at build time,
// from the site/ directory.
import { themes } from "../data/themes";
import type { Note, Theme } from "../data/types";
import { noteBody } from "./security";

export { notes } from "../data/notes";
export { site } from "../data/site";
export { themes } from "../data/themes";
export type * from "../data/types";
export { ui } from "../data/ui";

// The notes live at https://plei99.github.io/notes/, beside the homepage. Being
// on the same origin, they share its saved theme and font choices.
export const SITE_URL = "https://plei99.github.io";
const BASE = "/notes";

/** A path on this site, such as "/zh/", as a link. */
export const url = (path: string) => BASE + path;
/** The same, with the origin. */
export const absolute = (path: string) => SITE_URL + BASE + path;

// Appended to stylesheet and script URLs. scripts/finish.ts replaces it with
// one id per build, since Bake may render pages in several workers. GitHub
// Pages caches for ten minutes, so fresh HTML could otherwise meet stale CSS.
export const rev = "__REV__";

// build/build.py writes each note into generated/<slug>/: _toc.html, which the
// note's page reads; _body.html, which scripts/finish.ts puts into the page;
// and the images and diagrams that scripts/finish.ts copies beside it.
export const GENERATED = "generated";

/** A note's table of contents, as HTML. Like the text, it may hold no script. */
export async function toc(slug: string) {
  const file = Bun.file(`${GENERATED}/${slug}/_toc.html`);
  return (await file.exists())
    ? noteBody(await file.text(), `${slug}/_toc.html`)
    : "";
}

/** The notes with a page; the index links the others to their PDF. */
export async function built(notes: Note[]) {
  const have = await Promise.all(
    notes.map((n) => Bun.file(`${GENERATED}/${n.slug}/_body.html`).exists()),
  );
  return new Set(notes.filter((_, i) => have[i]).map((n) => n.slug));
}

/** The compiled PDF of a note, when the repository has one. */
export async function pdf(source: string) {
  const file = source.replace(/\.tex$/, ".pdf");
  return (await Bun.file(`../${file}`).exists())
    ? `https://github.com/plei99/notes/raw/main/${file}`
    : undefined;
}

/** "algebraic geometry" -> "algebraic-geometry", for data attributes. */
export const key = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/** ["a", "b", "c"] -> "a, b and c" */
export const conjoin = (items: string[]) =>
  items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

/** "{n} notes" with n filled in. */
export const fill = (text: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce(
    (t, [k, v]) => t.replaceAll(`{${k}}`, String(v)),
    text,
  );

export const allThemes: Theme[] = themes.flatMap((f) => f.themes);

// Each theme's brightness and its counterpart of the other brightness: the
// theme in the same place among its family's other half (Gruvbox Dark Soft for
// Gruvbox Light Soft, the last one if the other half is shorter), or the
// default when the family has none. As on the homepage (lib/site.ts there).
export const themePairs: Record<string, [0 | 1, string]> = Object.fromEntries(
  themes.flatMap((family) =>
    family.themes.map((t) => {
      const same = family.themes.filter((o) => o.dark === t.dark);
      const other = family.themes.filter((o) => o.dark !== t.dark);
      const pair = other[Math.min(same.indexOf(t), other.length - 1)] ??
        allThemes.find((o) => o.dark !== t.dark)!;
      return [t.id, [t.dark ? 1 : 0, pair.id]];
    })
  ),
);
