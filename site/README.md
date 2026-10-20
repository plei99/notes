# Notes site

The notes as web pages, at https://plei99.github.io/notes/. Built like the
homepage: React components rendered to static HTML by
[Bun Bake](https://bun.com) (`bun build --app`), with no React in the browser,
and published to the `gh-pages` branch. It shares the homepage's themes, fonts
and saved preferences (same origin, same storage keys). Everything that is code
is TypeScript and type checked, including the catalogue and the browser scripts;
the LaTeX pipeline in `build/` is Python.

## Building

Requires TeX Live, [latexml-oxide](https://github.com/plei99/latexml-oxide)
(a release build of `latexml_oxide`; `build/oxide.py` looks for it in a checkout
at the path in `OXIDE_BIN`), Python 3.9+ and a canary build of Bun (Bake is
experimental and only in canary builds; developed against 1.4.4-canary.1). Put
the canary `bun` first on your `PATH`, since package scripts call `bun` again.

```sh
cd site
bun install                 # once: React, MathJax, the checkers
bun run setup               # once: Python venv with fontTools
bun run notes               # convert every note to HTML with latexml-oxide
bun run notes good-moduli-spaces schemes  # ...or some, by slug
bun run dev                 # preview at http://localhost:3001/notes/
bun run check               # dprint check, oxlint, bun check
bun run publish             # build and push to gh-pages
```

`bun run notes --no-oxide` redoes only the HTML stage from the conversions
cached in `.cache/oxide-<slug>/`. `bun run notes:tex4ht` runs the older
pipeline, `build/build.py` (tex4ht, MathJax, dvisvgm), described at the end.

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
generated/              What the notes build writes (not committed)
```

Bake's React shell owns `<html>`, so each page renders a `<template data-shell>`
carrying its language and `scripts/finish.ts` moves it into place. A note's text
is often megabytes of MathML, more than React renders well, so its page has an
empty `.note-body` and `finish.ts` puts the text in.

## How a note becomes a page

`build/oxide.py`, for each note in `data/notes.ts`, stages the note in
`.cache/oxide-<slug>/` and converts it with latexml-oxide, a Rust port of
LaTeXML, in the note's engine persona: TeX Live packages through oxide's own
bindings, the note's own `.sty` files read as they are. One run gives HTML5
with MathML Core and SVG: sectioning, theorems, references, footnotes, the
bibliography, the mathematics, and the TikZ and tikz-cd pictures, whose labels
are real text in the page's fonts. The HTML is then cut down to the note's
text (title block and oxide's contents removed, headings numbered and collected
into the table of contents, footnotes moved to the end). Fragments land in
`generated/<slug>/`; `pages/[slug].tsx` and `scripts/finish.ts` turn them into
pages. `.cache/report.json` lists every note's errors, warnings and status.

The older pipeline, `build/build.py`, goes through four stages for each note:

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
