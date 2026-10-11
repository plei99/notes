# Notes site

The notes as web pages, at https://plei99.github.io/notes/. Built with
[Lume](https://lume.land) and published to the `gh-pages` branch. It shares the
homepage's themes, fonts and saved preferences (same origin, same storage keys).

## Building

Requires TeX Live (with tex4ht, dvisvgm), Python 3.9+, Node and Deno 2.

```sh
cd site
(cd build && npm install)   # MathJax, once
deno task notes             # compile every note to HTML (about 5 minutes)
deno task notes good-moduli-spaces schemes  # ...or some, by slug
deno task serve             # preview at http://localhost:3000/
deno task publish           # build and push to gh-pages
```

`deno task notes --no-tex` reruns only the MathML and HTML stages from the
cache in `.cache/`, which is enough after changing anything in `build/` except
`units.py`.

## How a note becomes a page

`build/build.py`, for each note in `src/_data/notes.yaml`:

1. **Diagrams.** `units.py` finds every tikz-cd, TikZ, Young tableau, Dynkin
   diagram and spectral sequence, widened to the whole formula when one sits
   inside mathematics. A copy of the note with each unit in a `preview`
   environment goes through LaTeX in DVI mode and dvisvgm: one SVG per unit,
   drawn in the PDF's fonts. They are inlined in the text colour, so they
   follow the theme.
2. **Structure.** A copy with each unit replaced by a placeholder goes through
   tex4ht (`make4ht`, MathJax mode), which handles sections, theorems,
   references, footnotes and the bibliography.
3. **Mathematics.** Every formula goes through MathJax (`tex2mml.mjs`) with
   the note's own macros, scraped from its preamble by `texfix.py`; `shims.json`
   covers package commands MathJax lacks. `mathml_core.py` then brings the
   MathML down to MathML Core, which browsers draw natively in the math font
   chosen in the font picker.
4. **The page.** Title block and tex4ht's contents removed, headings collected
   into the table of contents, font changes made semantic.

Fragments land in `src/n/<slug>/`; `src/notes.page.ts` turns them into pages.
A formula MathJax cannot read is shown as its TeX source;
`.cache/report.json` lists every note's counts and errors.

## The catalogue

`src/_data/notes.yaml` lists every note: its source, title, description, date,
place, and the three filter values (`location`, `type`, `subjects`). The
vocabularies are described at the top of the file. A note with `parent` is
listed as part of another; one with `translation_of` is listed under the note
it translates.
