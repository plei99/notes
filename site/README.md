# Notes site

The notes as web pages, at https://plei99.github.io/notes/. Built like the
homepage: React components rendered to static HTML by
[Bun Bake](https://bun.com) (`bun build --app`), with no React in the browser,
and published to the `gh-pages` branch. It shares the homepage's themes, fonts
and saved preferences (same origin, same storage keys). Everything that is code
is TypeScript and type checked, including the catalogue and the browser scripts;
the LaTeX pipeline in `build/` is Python.

## Building

Requires TeX Live (with tex4ht, dvisvgm), Python 3.9+ and a canary build of Bun
(Bake is experimental and only in canary builds; developed against
1.4.4-canary.1). Put the canary `bun` first on your `PATH`, since package
scripts call `bun` again. The diagrams are drawn in the homepage's fonts, read
from a checkout beside this repository (`../plei99.github.io/public/fonts`) or
else from the live site.

```sh
cd site
bun install                 # once: React, MathJax, the checkers
bun run setup               # once: Python venv with fontTools
bun run notes               # compile every note to HTML (about 20 minutes)
bun run notes good-moduli-spaces schemes  # ...or some, by slug
bun run dev                 # preview at http://localhost:3001/notes/
bun run check               # dprint check, oxlint, bun check
bun run publish             # build and push to gh-pages
```

`bun run notes --no-tex` reruns only the MathML and HTML stages from the cache
in `.cache/`, which is enough after changing anything in `build/` except
`units.py`.

## Layout

```
bun.app.ts              Bake config: the built-in React framework
pages/                  One file per route
  index.tsx, zh/        The index, in English and Chinese
  [slug].tsx            One page per built note
components/
  Base.tsx              <head>, masthead, footer
  Index.tsx             The filterable list of notes
  Note.tsx              A note's header, contents and text
lib/
  site.ts               Data, URLs under /notes/, the fragments, theme pairs
  inline.ts             Builds client/inline/*.ts into the scripts inlined in <head>
data/
  types.ts              The shape of everything below, and the filter vocabularies
  notes.ts              The catalogue
  site.ts               Font pairings, credits, facets, filter values in Chinese
  ui.ts                 Interface strings for en + zh
  themes.ts             The homepage's colour themes; /themes.css comes from this
client/                 Browser scripts, compiled one to one into /js/ (DOM only)
  theme.ts, dom.ts      The homepage's theme and font pickers, unchanged
  filter.ts             The index's filters
  note.ts               Contents open or closed; diagrams in the chosen fonts
  inline/               The head script that applies saved preferences
public/                 Copied verbatim: styles.css, fonts/
scripts/
  finish.ts             After Bake: <html lang>, the note text, themes.css, assets
  serve.ts              The dev server
  catalog.ts            The catalogue as JSON, for build.py
build/                  The LaTeX pipeline (Python) and publish.sh
generated/              What build.py writes (not committed)
```

Bake's React shell owns `<html>`, so each page renders a `<template data-shell>`
carrying its language and `scripts/finish.ts` moves it into place. A note's text
is often megabytes of MathML, more than React renders well, so its page has an
empty `.note-body` and `finish.ts` puts the text in.

## How a note becomes a page

`build/build.py`, for each note in `data/notes.ts`:

1. **Diagrams.** `units.py` finds every tikz-cd, TikZ, Young tableau, Dynkin
   diagram and spectral sequence, widened to the whole formula when one sits
   inside mathematics. A copy of the note with each unit in a `preview`
   environment goes through LaTeX in DVI mode and dvisvgm: one SVG per unit, in
   the PDF's fonts. Then once more per font pairing of the site
   (`fontvariants.py`): XeLaTeX with the note's font packages switched off and
   the pairing's text and math fonts set by unicode-math, symbols the math font
   lacks taken from Asana Math as the browser does. The default pairing's
   drawings are inlined in the text colour, so they follow the theme; the others
   wait in `diagrams/<pairing>.json` beside the page, and `note.ts` swaps them
   in when the reader picks a font.
2. **Structure.** A copy with each unit replaced by a placeholder goes through
   tex4ht (`make4ht`, MathJax mode), which handles sections, theorems,
   references, footnotes and the bibliography.
3. **Mathematics.** Every formula goes through MathJax (`tex2mml.mjs`, run by
   Bun) with the note's own macros, scraped from its preamble by `texfix.py`;
   `shims.json` covers package commands MathJax lacks. `mathml_core.py` then
   brings the MathML down to MathML Core, which browsers draw natively in the
   math font chosen in the font picker.
4. **The page.** Title block and tex4ht's contents removed, headings collected
   into the table of contents, font changes made semantic.

Fragments land in `generated/<slug>/`; `pages/[slug].tsx` and
`scripts/finish.ts` turn them into pages. A formula MathJax cannot read is shown
as its TeX source; `.cache/report.json` lists every note's counts and errors.

## The catalogue

`data/notes.ts` lists every note: its source, title, description, date, place,
and the three filter values (`location`, `type`, `subjects`). The vocabularies
are described at the top of the file and are types in `data/types.ts`, so a
misspelt value fails `bun run check`. A note with `parent` is listed as part of
another; one with `translation_of` is listed under the note it translates.
