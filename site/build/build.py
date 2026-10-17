#!/usr/bin/env python3
"""Compile the LaTeX notes into HTML fragments for the notes site.

    python3 site/build/build.py                 # every note in the catalogue
    python3 site/build/build.py moduli tc      # just these slugs
    python3 site/build/build.py --jobs 4

For each note, in its own scratch directory under site/.cache/<slug>/:

 1. Diagram units (see units.py) are found. A copy of the source with each unit
    wrapped in a `preview` environment is run through LaTeX in DVI mode and
    dvisvgm, giving one SVG per unit; then again through XeLaTeX once per font
    pairing of the site (fontvariants.py), so each diagram can be shown in the
    fonts the reader picked.
 2. A copy with each unit replaced by a placeholder goes through tex4ht
    (make4ht) in MathJax mode, which handles sectioning, theorems, references,
    footnotes and the bibliography, and leaves the mathematics as TeX source.
 3. Every formula is converted to MathML by MathJax (tex2mml.mjs) with the
    note's own macros, then brought down to MathML Core (mathml_core.py).
 4. The HTML is tidied: title block and tex4ht's contents removed, headings
    collected into a table of contents, font classes made semantic, diagrams
    inlined as SVGs drawn in the text colour.

Output goes to site/generated/<slug>/: _body.html, _toc.html and _meta.json,
which pages/[slug].tsx and scripts/finish.ts turn into the note's page, plus any
images the note includes and its diagrams in each font pairing.
"""

from __future__ import annotations

import argparse
import html as htmllib
import json
import os
import re
import shutil
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = HERE.parent
REPO = SITE.parent
CACHE = SITE / ".cache"
OUT = SITE / "generated"

sys.path.insert(0, str(HERE))
import mathml_core  # noqa: E402
import texfix  # noqa: E402
import units as unitlib  # noqa: E402

try:  # fontTools, for drawing diagrams in the site's fonts (build/.venv)
    import fontvariants
except ImportError:
    fontvariants = None

# The site's font pairings, set up once in main(); None draws diagrams only in
# the notes' own fonts.
PAIRINGS = None
# The pairing a page shows before any choice is made (styles.css :root).
DEFAULT_PAIRING = "pagella"

SHARED_FILES = ["notes.sty", "essay.sty", "macaulay2.sty", "math.bib"]
SKIP_SUFFIXES = {
    ".aux", ".log", ".out", ".toc", ".fls", ".fdb_latexmk", ".synctex", ".gz", ".bbl", ".bcf",
    ".blg", ".run", ".xml", ".nav", ".snm", ".vrb", ".dvi", ".xdv", ".html", ".css", ".4ct", ".4tc",
    ".idv", ".lg", ".tmp", ".xref", ".script", ".DS_Store",
}
TEX4HT_CFG = r"""\Preamble{xhtml,mathjax,fn-in}
\begin{document}
\EndPreamble
"""


# ---- Catalogue -----------------------------------------------------------------


def read_catalog() -> list[dict]:
    """Every note in the catalogue, data/notes.ts, which Bun reads for us."""
    out = subprocess.run(
        ["bun", "scripts/catalog.ts"], cwd=SITE, capture_output=True, text=True, check=True,
    ).stdout
    return [n for n in json.loads(out) if "source" in n]


# ---- Running things ------------------------------------------------------------


def run(cmd: list[str], cwd: Path, log: Path, timeout: int = 1800, env: dict | None = None) -> int:
    with log.open("a") as fh:
        fh.write(f"\n$ {' '.join(cmd)}\n")
        fh.flush()
        try:
            proc = subprocess.run(
                cmd, cwd=cwd, stdout=fh, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                timeout=timeout, env={**os.environ, **(env or {})},
            )
            return proc.returncode
        except subprocess.TimeoutExpired:
            fh.write(f"\n!! timed out after {timeout}s\n")
            return 124


def engine_of(preamble: str) -> str:
    magic = re.search(r"^%\s*!TEX\s+(?:TS-)?program\s*=\s*(\w+)", preamble, re.M | re.I)
    if magic and magic.group(1).lower() in ("xelatex", "lualatex", "pdflatex"):
        return {"xelatex": "xe", "lualatex": "lua", "pdflatex": "pdf"}[magic.group(1).lower()]
    pre = texfix.strip_comments(preamble)
    # ctex is written for XeTeX first; under LuaTeX's DVI mode it skips fontspec.
    if re.search(r"\\usepackage(\[[^\]]*\])?\{(xeCJK|ctex)\}", pre) or re.search(r"\\documentclass(\[[^\]]*\])?\{ctex", pre):
        return "xe"
    if re.search(r"\\usepackage(\[[^\]]*\])?\{(fontspec|unicode-math|luatexja)", pre):
        return "lua"
    return "pdf"


def font_size_pt(preamble: str) -> float:
    m = re.search(r"\\documentclass\[([^\]]*)\]", preamble)
    if m:
        s = re.search(r"(\d+)pt", m.group(1))
        if s:
            return float(s.group(1))
    return 10.0


# ---- Stage 0: a scratch copy ---------------------------------------------------


def stage(note: dict, work: Path) -> Path:
    if work.exists():
        shutil.rmtree(work)
    src = REPO / note["source"]
    dest_dir = work / src.parent.relative_to(REPO)
    dest_dir.mkdir(parents=True)
    for name in SHARED_FILES:
        if (REPO / name).exists():
            shutil.copy(REPO / name, work / name)
    # The note's directory with its subdirectories (code listings, figures),
    # leaving out compiled PDFs of the notes themselves and LaTeX's leftovers.
    for p in src.parent.rglob("*"):
        if not p.is_file() or p.suffix.lower() in SKIP_SUFFIXES or p.name.startswith("."):
            continue
        if p.suffix == ".pdf" and p.with_suffix(".tex").exists():
            continue
        if "contourtmp" in p.name or p.stat().st_size > 30_000_000:
            continue
        target = dest_dir / p.relative_to(src.parent)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(p, target)
    return dest_dir / src.name


# ---- Stage 1: diagrams ---------------------------------------------------------

ID_ATTR = re.compile(r"""\bid=(['"])([^'"]+)\1""")


GREYS = {"black": 0, "white": 255, "gray": 128, "grey": 128}
PAINT = re.compile(r"""\s(fill|stroke)=(['"])(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|black|white|gr[ae]y)\2""")


def theme_colour(value: str) -> str | None:
    """A grey as a blend of text and paper; None for a real colour, kept as is."""
    v = value.lower()
    if v in GREYS:
        r = g = b = GREYS[v]
    else:
        h = v[1:]
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        r, g, b = (int(h[i : i + 2], 16) for i in (0, 2, 4))
    if not (r == g == b):
        return None
    ink = round(100 * (1 - r / 255))
    if ink == 100:
        return "currentColor"
    if ink == 0:
        return "var(--paper)"
    return f"color-mix(in srgb, currentColor {ink}%, var(--paper))"


def recolor_tag(m: re.Match) -> str:
    """LaTeX draws in black on white; the page draws in --text on --paper. Greys
    become blends of the two, so black!50 stays half-way in every theme. CSS
    variables only work in style, not in presentation attributes."""
    tag = m.group(0)
    styles = []

    def paint(a: re.Match) -> str:
        colour = theme_colour(a.group(3))
        if colour is None:
            return a.group(0)
        styles.append(f"{a.group(1)}:{colour}")
        return ""

    tag = PAINT.sub(paint, tag)
    if not styles:
        return tag
    decl = ";".join(styles)
    if re.search(r"""\sstyle=(['"])""", tag):
        return re.sub(r"""\sstyle=(['"])""", lambda s: f" style={s.group(1)}{decl};", tag, count=1)
    end = -2 if tag.endswith("/>") else -1
    return f"{tag[:end].rstrip()} style='{decl}'{tag[end:]}"


def theme_svg(svg: str, n: int, size_pt: float) -> str:
    """Inline-ready SVG: unique ids, drawn in currentColor, sized in em."""
    svg = re.sub(r"<\?xml[^>]*\?>|<!DOCTYPE[^>]*>|<!--.*?-->", "", svg, flags=re.S).strip()
    ids = {m.group(2) for m in ID_ATTR.finditer(svg)}
    if ids:
        pat = "|".join(sorted(map(re.escape, ids), key=len, reverse=True))
        svg = re.sub(rf"""(\bid=['"])({pat})(['"])""", rf"\1d{n}-\2\3", svg)
        svg = re.sub(rf"(#)({pat})(?=['\")])", rf"\1d{n}-\2", svg)
    svg = re.sub(r"<[a-zA-Z][^>]*>", recolor_tag, svg)

    def size(m: re.Match) -> str:
        value = float(m.group(2))
        return f"{m.group(1)}='{value / size_pt:.3f}em'"

    head_end = svg.find(">")
    head = re.sub(r"(width|height)=['\"]([\d.]+)pt['\"]", size, svg[:head_end])
    head = head.replace("<svg ", "<svg fill='currentColor' aria-hidden='true' focusable='false' ", 1)
    return head + svg[head_end:]


# Alphabet commands that, under unicode-math, must be braced after _ and ^.
SCRIPT_ALPHABETS = {"mathbb", "mathcal", "mathfrak", "mathscr", "mathrm", "mathbf", "mathsf", "mathit", "mathtt", "mathbbm", "bm", "boldsymbol"}


def brace_scripts(src: str, macros: dict) -> str:
    """Brace a sub- or superscript that is a bare macro: `_\\C` with
    \\C = \\mathbb{C}, or `_\\mf{P}` with \\mf = \\mathfrak, work under pdfLaTeX,
    but unicode-math's alphabets need `_{\\C}` and `_{\\mf{P}}`."""
    takes = {k: (0 if isinstance(v, str) else v[1]) for k, v in macros.items()}
    takes.update({a: 1 for a in SCRIPT_ALPHABETS})
    begin = src.find("\\begin{document}")
    body = src[begin:]
    out, last = [], 0
    for m in re.finditer(r"([_^])\s*\\([A-Za-z]+)(?![A-Za-z])", body):
        if m.start() < last or m.group(2) not in takes:
            continue
        end = m.end()
        for _ in range(takes[m.group(2)]):
            j = unitlib.skip_space(body, end)
            if j < len(body) and body[j] == "{":
                end = unitlib.group_end(body, j)
            elif j < len(body):
                end = j + 1
        out.append(body[last : m.start()] + f"{m.group(1)}{{" + body[m.start() + 1 : end] + "}")
        last = end
    out.append(body[last:])
    return src[:begin] + "".join(out)


def render_diagrams(tex: Path, diag_src: str, engine: str, log: Path, name: str = "diagrams") -> dict[int, str]:
    work = tex.parent
    stem = f"{tex.stem}-{name}"
    (work / f"{stem}.tex").write_text(diag_src)
    cmd = {
        "pdf": ["latex"],
        "lua": ["dvilualatex"],
        "xe": ["xelatex", "-no-pdf"],
    }[engine] + ["-interaction=nonstopmode", f"{stem}.tex"]
    run(cmd, work, log, timeout=1800)
    dvi = work / (f"{stem}.xdv" if engine == "xe" else f"{stem}.dvi")
    if not dvi.exists():
        return {}
    out = work / name
    if out.exists():
        shutil.rmtree(out)
    out.mkdir()
    run(["dvisvgm", "--no-fonts", "--exact-bbox", "--optimize", "-p", "1-", "-o", str(out / "%p.svg"), dvi.name], work, log)
    return read_diagrams(out)


def read_diagrams(out: Path) -> dict[int, str]:
    """The SVG of each unit, found by the unit number LaTeX wrote into it."""
    found: dict[int, str] = {}
    for svg in sorted(out.glob("*.svg")):
        text = svg.read_text()
        m = re.search(r"<!--unit:(\d+)-->", text)
        if m:
            found.setdefault(int(m.group(1)), text)
    return found


# ---- Stage 2: tex4ht -------------------------------------------------------------


def run_tex4ht(tex: Path, engine: str, bib: str, log: Path) -> Path | None:
    work = tex.parent
    (work / "notes-site.cfg").write_text(TEX4HT_CFG)
    steps = ["Make:htlatex {}"]
    if bib == "biber":
        steps += ['Make:add("biber", "biber ${input}")', "Make:biber {}"]
    elif bib == "bibtex":
        steps += ["Make:bibtex {}"]
    steps += ["Make:htlatex {}"]
    (work / "notes-site.mk4").write_text("\n".join(steps) + "\n")
    flag = {"pdf": [], "lua": ["-l"], "xe": ["-x"]}[engine]
    run(["make4ht", *flag, "-c", "notes-site.cfg", "-e", "notes-site.mk4", "-d", "html", tex.name], work, log, timeout=2400)
    out = work / "html" / f"{tex.stem}.html"
    return out if out.exists() else None


# ---- Stage 3: mathematics ------------------------------------------------------------

MATH = re.compile(
    r"<span class='mathjax-inline'>(?P<inline>.*?)</span>"
    r"|<div class='mathjax-(?:env [^']*|block)'>(?P<display>.*?)</div>"
    r"|<span class='mathjax-(?:env [^']*|block)'>(?P<display2>.*?)</span>",
    re.S,
)


# A browser will break a line between an inline formula and the comma after it,
# or the bracket before it, which TeX never does; the two are kept together.
STUCK = re.compile(
    r"(?P<before>[(\[{“‘'\"（「『]*)(?P<math><math>(?:(?!</math>).)*</math>)"
    r"(?P<after>[-–—.,;:!?)\]}’”'\"…，。；：、！？）」』A-Za-z]*)",
    re.S,
)


def keep_together(page: str) -> str:
    return STUCK.sub(
        lambda m: f"<span class='nobr'>{m[0]}</span>" if m["before"] or m["after"] else m[0], page
    )


def unwrap_delims(tex: str) -> str:
    tex = tex.strip()
    for a, b in (("\\(", "\\)"), ("\\[", "\\]"), ("$$", "$$"), ("$", "$")):
        if tex.startswith(a) and tex.endswith(b) and len(tex) >= len(a) + len(b):
            return tex[len(a) : -len(b)]
    return tex


def split_inline(tex: str) -> list[tuple[bool, str]]:
    """tex4ht puts `$A_1$ $qq$` inside \\textit into one span as `\\(A_1\\) \\(qq\\)`.
    Split it into (is_math, text) pieces; a lone formula comes back as one piece."""
    pieces, i = [], 0
    tex = tex.strip()
    while i < len(tex):
        if not tex.startswith("\\(", i):
            j = tex.find("\\(", i)
            j = len(tex) if j < 0 else j
            pieces.append((False, tex[i:j]))
            i = j
            continue
        depth, k = 0, i + 2
        while k < len(tex):
            if tex[k] == "\\":
                if depth == 0 and tex.startswith("\\)", k):
                    break
                k += 2
                continue
            depth += {"{": 1, "}": -1}.get(tex[k], 0)
            k += 1
        pieces.append((True, tex[i + 2 : k]))
        i = k + 2
    return pieces or [(True, tex)]


def convert_math(page: str, macros: dict, log: Path) -> tuple[str, dict]:
    matches = list(MATH.finditer(page))
    items, groups = [], []
    for m in matches:
        if m.group("inline") is not None:
            parts = split_inline(htmllib.unescape(m.group("inline")))
            if len(parts) == 1 and parts[0][0]:
                parts = [(True, parts[0][1])]
        else:
            raw = m.group("display") or m.group("display2") or ""
            parts = [(True, unwrap_delims(htmllib.unescape(raw)))]
        group = []
        for is_math, text in parts:
            if is_math:
                group.append(len(items))
                items.append({"tex": texfix.rewrite_math(text), "display": m.group("inline") is None})
            else:
                group.append(text)
        groups.append(group)
    proc = subprocess.run(
        ["bun", str(HERE / "tex2mml.mjs")], input=json.dumps({"macros": macros, "items": items}),
        capture_output=True, text=True, cwd=HERE, timeout=1800,
    )
    if proc.returncode:
        with log.open("a") as fh:
            fh.write(proc.stderr)
        raise RuntimeError("tex2mml failed")
    results = json.loads(proc.stdout)["results"]

    stats = {"formulas": len(items), "errors": 0, "messages": {}}
    rendered = [render_formula(item, res, stats) for item, res in zip(items, results)]
    pieces, last = [], 0
    for m, group in zip(matches, groups):
        pieces.append(page[last : m.start()])
        last = m.end()
        # tex4ht keeps the space after an inline formula inside its span
        # (`\(X\) </span>be`); it goes back between the formula and the text.
        raw = m.group("inline") or ""
        if raw[:1].isspace():
            pieces.append(" ")
        pieces.extend(rendered[g] if isinstance(g, int) else htmllib.escape(g, False) for g in group)
        if raw[-1:].isspace():
            pieces.append(" ")
    pieces.append(page[last:])
    return keep_together("".join(pieces)), stats


def render_formula(item: dict, res: dict, stats: dict) -> str:
    """One converted formula as HTML; failures show their TeX source instead."""
    if "error" in res:
        msg = res["error"][:90]
    else:
        try:
            mml, number, anchor = mathml_core.to_core(res["mml"])
        except ET.ParseError as e:
            msg = f"MathML: {e}"[:90]
        else:
            if not item["display"]:
                return mml
            if number:
                ident = f" id='{htmllib.escape(anchor, True)}'" if anchor else ""
                return f"<div class='eq'{ident}>{mml}<span class='eqno'>{htmllib.escape(number)}</span></div>"
            return f"<div class='eq'>{mml}</div>"
    stats["errors"] += 1
    stats["messages"][msg] = stats["messages"].get(msg, 0) + 1
    src, title = htmllib.escape(item["tex"]), htmllib.escape(msg, True)
    if item["display"]:
        return f"<pre class='tex-error' title='{title}'>{src}</pre>"
    return f"<code class='tex-error' title='{title}'>{src}</code>"


# ---- Stage 4: the page -------------------------------------------------------------


def element_end(page: str, start: int, tag: str) -> int:
    """End of the element whose start tag begins at `start`, counting nesting."""
    depth, pos = 0, start
    pat = re.compile(rf"<(/?){tag}\b[^>]*>")
    for m in pat.finditer(page, start):
        depth += -1 if m.group(1) else 1
        if depth == 0:
            return m.end()
        pos = m.end()
    return len(page)


def cut(page: str, pattern: str, tag: str = "div") -> tuple[str, list[str]]:
    """Remove every element whose start tag matches pattern; return the pieces."""
    pieces = []
    while (m := re.search(pattern, page)) :
        end = element_end(page, m.start(), tag)
        pieces.append(page[m.start() : end])
        page = page[: m.start()] + page[end:]
    return page, pieces


FONT_NAME = re.compile(r"(ppl|qpl|zpl|lm|cm|ec|zi4|pzc|ptm|phv|pcr|fut)([a-z]*)")


def font_shape(face: str) -> list[str]:
    """b/i/sc/tt from a TeX font name: pplbi9t (Pagella bold italic), lmcsc, cmtt..."""
    m = FONT_NAME.match(face)
    if not m:
        return []
    family, shape = m.groups()
    if family == "zi4" or shape.startswith("tt"):
        return ["tt"]
    sem = []
    if shape.startswith("b"):
        sem.append("b")
    if re.match(r"b?(r?i|ti|it|sl)", shape) and shape not in ("r", "b"):
        sem.append("i")
    if re.search(r"rc|csc", shape):
        sem.append("sc")
    return sem


def font_classes(css: str) -> dict[str, str]:
    """tex4ht names its spans after fonts (ec-lmbx-10, pplri9e-); map them to b/i/sc/tt."""
    mapping = {}
    for m in re.finditer(r"^\.([\w-]+)\s*\{([^}]*)\}", css, re.M):
        name, rule = m.group(1), m.group(2)
        if name.startswith(("mathjax-", "enumerate-", "footnote-")):
            continue
        parts = [p for p in name.split("-") if p]
        face = next((p for p in parts if FONT_NAME.match(p)), None)
        if not face:
            continue
        sem = set(font_shape(face))
        if re.search(r"font-weight:\s*bold", rule):
            sem.add("b")
        if re.search(r"font-style:\s*(italic|oblique)", rule):
            sem.add("i")
        if "small-caps" in rule:
            sem.add("sc")
        mapping[name] = " ".join(sorted(sem))
    return mapping


HEAD_LEVEL = {"part": 0, "chapter": 1, "section": 2, "subsection": 3, "subsubsection": 4}
HEAD_OPEN = re.compile(r"<(h[1-6]|span) class='(?:like)?(part|chapter|section|subsection|subsubsection)Head'([^>]*)>")


def headings(body: str):
    """(start, end, tag, kind, attrs, inner) for each tex4ht heading, nesting-aware."""
    pos = 0
    while (m := HEAD_OPEN.search(body, pos)) :
        end = element_end(body, m.start(), m.group(1))
        inner = body[m.end() : end - len(f"</{m.group(1)}>")]
        yield m.start(), end, m.group(1), m.group(2), m.group(3), inner
        pos = end


def tidy(
    page: str, svgs: dict[int, str], size_pt: float, fonts: dict[str, str], slug: str, abstract_name: str | None = None
) -> tuple[str, str, dict]:
    info: dict = {"diagrams": 0, "missing_diagrams": []}
    body = page[page.find(">", page.find("<body")) + 1 : page.rfind("</body>")]
    body = re.sub(r"<!--\s*l\.\s*\d+\s*-->", "", body)

    # Title block: the layout prints title and lecturers from the catalogue.
    body, title_blocks = cut(body, r"<div class='maketitle'")
    abstracts = []
    for block in title_blocks:
        abstracts += re.findall(r"<div class='abstract'.*?</div>\s*", block, re.S)
    body, more = cut(body, r"<div class='abstract'")
    abstracts += more
    body, _ = cut(body, r"<div class='tableofcontents'")
    # The contents' heading; empty where \contentsname is set for babel only.
    body = re.sub(r"<h[1-6][^>]*>(\s|<a [^>]*></a>)*(Contents|目录|目錄)?\s*</h[1-6]>", "", body)
    body = re.sub(r"<(h[1-6]|div) class='(titleHead|author|date)'.*?</\1>", "", body, flags=re.S)
    if abstracts:
        abstract = re.sub(r"^<div class='abstract'[^>]*>|</div>\s*$", "", abstracts[0].strip())
        # tex4ht sets the run-in title in a small-caps font, which drops a
        # Chinese \abstractname; the title is written out again.
        title = re.search(r"<span class='title'>", abstract)
        if title and abstract_name:
            end = element_end(abstract, title.start(), "span")
            stop = "." if abstract_name.isascii() else ""
            abstract = abstract[: title.start()] + f"<span class='title'>{abstract_name}{stop}</span>" + abstract[end:]
        body = "<div class='abstract'>" + abstract + "</div>" + body

    # Diagrams.
    def diagram(m: re.Match) -> str:
        n, display = int(m.group("n")), m.group("d") == "1"
        if n not in svgs:
            info["missing_diagrams"].append(n)
            return f"<span class='diagram-missing'>[diagram {n}: see the PDF]</span>"
        info["diagrams"] += 1
        cls = "diagram diagram--display" if display else "diagram"
        return f"<span class='{cls}' data-n='{n}' role='img' aria-label='Diagram'>{theme_svg(svgs[n], n, size_pt)}</span>"

    body = re.sub(r"""<span class=["']dg["'] data-d=["'](?P<d>\d)["'] data-n=["'](?P<n>\d+)["']>\s*</span>""", diagram, body)

    # Fonts.
    def classes(m: re.Match) -> str:
        # Font classes the stylesheet never defined (pplri9t-) are read off the name.
        names = [fonts.get(c, " ".join(font_shape(c)) if re.fullmatch(r"[a-z]+\d[a-z0-9]*-", c) else c) for c in m.group(1).split()]
        names = [n for n in " ".join(names).split() if n]
        return f" class='{' '.join(names)}'" if names else ""

    body = re.sub(r" class='([^']*)'", classes, body)
    body = re.sub(r"<span>([^<]*)</span>", r"\1", body)

    # Citations. tex4ht leaves biblatex's citation links without a target
    # (<a>ACGS24</a>, or <a x0-key\relax=''> with hyperref), so each is pointed
    # at the bibliography entry carrying its label.
    labels: dict[str, str] = {}
    for m in re.finditer(r"<dt class='thebibliography' id='([^']+)'>\s*\[([^\]<]+)\]", body):
        labels.setdefault(m.group(2).strip(), m.group(1))

    def cite(m: re.Match) -> str:
        ident = labels.get(re.sub(r"<[^>]+>", "", m.group(1)).strip())
        return f"<a class='cite' href='#{ident}'>{m.group(1)}</a>" if ident else m.group(0)

    # The label may keep a font span (footnotes, a smaller size).
    body = re.sub(r"<a(?: x0-[^\s>]*\\relax='')?>((?:<span[^>]*>)?[^<]+(?:</span>)?)</a>", cite, body)
    body = re.sub(r"<a (?:\\relax='' )?id='X0-'></a>", "", body)
    info["citations"] = len(re.findall(r"<a class='cite'", body))

    # Headings: one h2 per top-level division, ids for the contents.
    found = list(headings(body))
    kinds = {h[3] for h in found}
    top = min((HEAD_LEVEL[k] for k in kinds if k != "part"), default=2)
    toc: list[tuple[int, str, str, str]] = []
    seen_ids: set[str] = set()
    pieces, last = [], 0
    for start, end, el, kind, attrs, inner in found:
        pieces.append(body[last:start])
        last = end
        level = HEAD_LEVEL[kind] - top + 2
        given = re.search(r"id='([^']+)'", attrs)
        anchor = re.search(r"<a id='([^']+)'></a>", inner)
        number = re.search(r"<span class='titlemark'>(.*?)</span>", inner, re.S)
        title = re.sub(r"<span class='titlemark'>.*?</span>|<a id='[^']*'></a>|<br\s*/?>", "", inner, flags=re.S).strip()
        # amsart's run-in subsection titles end in a full stop; the contents drop it.
        toc_title = re.sub(r"\.(</span>)?$", r"\1", title)
        num = re.sub(r"^(Chapter|Part)\s+", "", re.sub(r"<[^>]+>", "", number.group(1))).strip().rstrip(".") if number else ""
        ident = given.group(1) if given else (anchor.group(1) if anchor else "")
        ident = ident or re.sub(r"[^a-z0-9]+", "-", re.sub(r"<[^>]+>", "", title).lower()).strip("-") or "section"
        while ident in seen_ids:
            ident += "-"
        seen_ids.add(ident)
        if level <= 3 and kind != "part":
            toc.append((level, ident, num, toc_title))
        num_html = f"<span class='secnum'>{num}</span> " if num else ""
        # Keep tex4ht's own anchor so its cross-references still land here.
        old = f"<a id='{anchor.group(1)}'></a>" if anchor and anchor.group(1) != ident else ""
        if el == "span":  # run-in heading (amsart subsections)
            pieces.append(f"<span class='runin-head' id='{ident}'>{old}{num_html}{title}</span>")
        else:
            tag = f"h{min(max(level, 2), 6)}"
            pieces.append(f"<{tag} id='{ident}'>{old}{num_html}{title}</{tag}>")
    pieces.append(body[last:])
    body = "".join(pieces)

    toc_html = render_toc(toc)
    return body, toc_html, info


def render_toc(entries: list[tuple[int, str, str, str]]) -> str:
    if not entries:
        return ""
    base = min(e[0] for e in entries)
    out, depth = [], 0
    for level, ident, num, title in entries:
        level = level - base + 1
        while depth < level:
            out.append("<ol>")
            depth += 1
        while depth > level:
            out.append("</li></ol>")
            depth -= 1
        if out and out[-1] not in ("<ol>",):
            out.append("</li>")
        num_html = f"<span class='secnum'>{num}</span> " if num else ""
        out.append(f"<li><a href='#{ident}'>{num_html}{title}</a>")
    out.append("</li>" + "</ol></li>" * (depth - 1) + "</ol>")
    return "".join(out)


def copy_images(body: str, html_dir: Path, dest: Path, log: Path) -> str:
    def image(m: re.Match) -> str:
        src = htmllib.unescape(m.group(2))
        path = html_dir / src
        if not path.exists():
            alt = list(html_dir.parent.rglob(Path(src).name))
            path = alt[0] if alt else path
        if not path.exists():
            return m.group(0)
        name = path.name
        if path.suffix.lower() in (".pdf", ".eps"):
            name = path.stem + ".svg"
            if path.suffix.lower() == ".pdf":
                run(["pdftocairo", "-svg", "-f", "1", "-l", "1", str(path), str(dest / name)], html_dir, log)
            else:
                run(["dvisvgm", "--eps", "--no-fonts", "-o", str(dest / name), str(path)], html_dir, log)
        else:
            shutil.copy(path, dest / name)
        return f"{m.group(1)}{htmllib.escape(name, True)}{m.group(3)} loading='lazy'"

    return re.sub(r"(<img [^>]*?src=')([^']+)(')", image, body)


# Without biblatex, \cite leaves its keys for finish_note to link up.
CITE_KEYS = r"""\AtBeginDocument{\renewcommand\cite[2][]{\HCode{<span class="cite-keys" data-keys="#2">}#1\HCode{</span>}}}
"""


def without_biblatex(src: str) -> str:
    src = re.sub(r"^([ \t]*\\usepackage(\[[^\]]*\])?\{biblatex\})", r"%\1", src, flags=re.M)
    src = re.sub(r"^([ \t]*\\(addbibresource|printbibliography|DeclareFieldFormat|AtEveryBibitem)\b)", r"%\1", src, flags=re.M)
    begin = src.find("\\begin{document}")
    return src[:begin] + CITE_KEYS + src[begin:]


def borrow_bibliography(body: str, toc: str, note: dict) -> tuple[str, str, int]:
    """Link a biblatex-less note's citations to the bibliography of the note it
    translates, which cites the same keys, and append that bibliography."""
    spans = re.compile(r"""<span class=["']cite-keys["'] data-keys=["']([^"']*)["']>(.*?)</span>""", re.S)
    parent = OUT / note.get("translation_of", "") / "_body.html"
    if not spans.search(body) or not note.get("translation_of") or not parent.exists():
        return body, toc, 0
    source = parent.read_text()
    start = source.find("<dl class='thebibliography'")
    if start < 0:
        return body, toc, 0
    bib = source[start : element_end(source, start, "dl")]
    entries = {
        ident[3:]: (ident, label.strip())
        for ident, label in re.findall(r"<dt class='thebibliography' id='([^']+)'>\s*\[([^\]<]+)\]", bib)
    }

    def cite(m: re.Match) -> str:
        links = []
        for key in (k.strip() for k in m.group(1).split(",")):
            ident, label = entries.get(key, ("", key))
            links.append(f"<a class='cite' href='#{ident}'>{label}</a>" if ident else label)
        post = m.group(2).strip()
        return "[" + "; ".join(links) + (f", {post}" if post else "") + "]"

    body, count = spans.subn(cite, body)
    tex = (REPO / note["source"]).read_text(encoding="utf-8", errors="replace")
    title = re.search(r"\\printbibliography\[title=\{([^}]*)\}", tex)
    title = title.group(1) if title else "References"
    section = f"<h2 id='references'>{title}</h2>\n{bib}\n"
    footnotes = body.find("<div class='footnotes'>")
    body = body[:footnotes] + section + body[footnotes:] if footnotes >= 0 else body + section
    if toc.endswith("</ol>"):
        toc = toc[: -len("</ol>")] + f"<li><a href='#references'>{title}</a></li></ol>"
    return body, toc, count


# ---- One note --------------------------------------------------------------------


def build_note(note: dict, tex_runs: bool = True) -> dict:
    slug = note["slug"]
    work = CACHE / slug
    t0 = time.time()
    report: dict = {"slug": slug, "source": note["source"]}
    if not tex_runs:
        return finish_note(note, work, report, t0)
    tex = stage(note, work)
    log = work / "build.log"
    src = tex.read_text(encoding="utf-8", errors="replace")
    begin = src.find("\\begin{document}")
    preamble = src[:begin]
    engine = engine_of(preamble)
    pre_nc = texfix.strip_comments(preamble)
    bib = "biber" if "\\addbibresource" in pre_nc else ("bibtex" if re.search(r"\\bibliography\{", texfix.strip_comments(src)) else "")
    report.update(engine=engine, bib=bib)

    # Slides become a continuous document in beamer's article mode: no overlays
    # repeating a frame, no slide furniture.
    if re.search(r"\\documentclass(\[[^\]]*\])?\{beamer\}", src):
        src = re.sub(r"\\documentclass(\[[^\]]*\])?\{beamer\}", r"\\documentclass{article}\n\\usepackage{beamerarticle}", src, count=1)
        report["article_mode"] = True
    web_src, diag_src, units = unitlib.rewrite(src)
    # ctex and tex4ht loop in the output routine; for HTML, xeCJK does the same job.
    web_src = re.sub(r"\\usepackage(\[[^\]]*\])?\{ctex\}", r"\\usepackage{xeCJK}", web_src)
    report["units"] = len(units)
    tex.write_text(web_src)
    svgs = render_diagrams(tex, diag_src, engine, log) if units else {}
    report["svgs"] = len(svgs)
    for old in tex.parent.glob("diagrams-*"):
        shutil.rmtree(old)
    if units and PAIRINGS:
        # Options the font packages are asked for, here or in a shared style file.
        scan = preamble + "".join(
            (REPO / f).read_text(errors="replace") for f in SHARED_FILES if f.endswith(".sty") and f[:-4] in preamble
        )
        report["pairings"] = {}
        braced = brace_scripts(src, texfix.scrape_macros(preamble))
        for v in PAIRINGS.pairs:
            before, setup = PAIRINGS.latex(v, scan)
            _, pairing_src, _ = unitlib.rewrite(braced, before, setup)
            report["pairings"][v] = len(render_diagrams(tex, pairing_src, "xe", log, f"diagrams-{v}"))

    page_file = run_tex4ht(tex, engine, bib, log)
    if not page_file and bib:
        # biblatex's localisation strings send XeTeX + tex4ht into a loop just by
        # being loaded; without biblatex, citations fall back to LaTeX's \\cite.
        report["bib_dropped"] = True
        for aux in tex.parent.glob(f"{tex.stem}.*"):
            if aux.suffix not in (".tex",):
                aux.unlink()
        tex.write_text(without_biblatex(web_src))
        page_file = run_tex4ht(tex, engine, "", log)
    if not page_file:
        report["error"] = "tex4ht produced no HTML"
        return report
    return finish_note(note, work, report, t0)


def finish_note(note: dict, work: Path, report: dict, t0: float) -> dict:
    """Stages 3 and 4, from what the TeX runs left in the scratch directory."""
    slug = note["slug"]
    log = work / "build.log"
    tex = work / note["source"]
    page_file = tex.parent / "html" / f"{tex.stem}.html"
    if not page_file.exists():
        report["error"] = "no tex4ht output in the cache; build without --no-tex"
        return report
    svgs = read_diagrams(tex.parent / "diagrams")
    report.setdefault("svgs", len(svgs))
    pairings = {d.name.removeprefix("diagrams-"): read_diagrams(d) for d in sorted(tex.parent.glob("diagrams-*"))}
    preamble = (REPO / note["source"]).read_text(encoding="utf-8", errors="replace").split("\\begin{document}")[0]
    others = [p.name for p in page_file.parent.glob(f"{tex.stem}*.html") if p != page_file]
    if others:
        report["extra_pages"] = others
    page = page_file.read_text(encoding="utf-8", errors="replace")

    macros = texfix.scrape_macros(preamble)
    page, math_stats = convert_math(page, macros, log)
    report["math"] = math_stats

    css_file = page_file.with_suffix(".css")
    fonts = font_classes(css_file.read_text() if css_file.exists() else "")
    dest = OUT / slug
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    size_pt = font_size_pt(preamble)
    # The abstract's title: the note's own \abstractname, else 摘要 on a Chinese page.
    named = re.search(r"\\renewcommand\s*\{?\\abstractname\}?\s*\{([^}]*)\}", texfix.strip_comments(preamble))
    abstract_name = named.group(1).strip() if named else ("摘要" if note.get("lang") == "zh" else None)
    body, toc, info = tidy(page, {**svgs, **pairings.get(DEFAULT_PAIRING, {})}, size_pt, fonts, slug, abstract_name)
    body, toc, borrowed = borrow_bibliography(body, toc, note)
    if borrowed:
        info["citations"] = info.get("citations", 0) + borrowed
    body = copy_images(body, page_file.parent, dest, log)
    report.update(info)

    # Every pairing's drawings, for the page to swap in; a diagram a pairing
    # failed to draw keeps the notes' own fonts.
    if pairings:
        (dest / "diagrams").mkdir()
        for v, drawn in pairings.items():
            pairing_svgs = {n: theme_svg(svg, n, size_pt) for n, svg in {**svgs, **drawn}.items()}
            (dest / "diagrams" / f"{v}.json").write_text(json.dumps(pairing_svgs, separators=(",", ":")))

    (dest / "_body.html").write_text(body)
    (dest / "_toc.html").write_text(toc)
    report["seconds"] = round(time.time() - t0, 1)
    report["bytes"] = len(body.encode())
    (dest / "_meta.json").write_text(json.dumps({k: report[k] for k in ("units", "diagrams", "bytes") if k in report}))
    return report


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("slugs", nargs="*")
    ap.add_argument("--jobs", type=int, default=8)
    ap.add_argument("--no-tex", action="store_true", help="redo only the MathML and HTML stages, from the cache")
    args = ap.parse_args()
    notes = read_catalog()
    if args.slugs:
        unknown = set(args.slugs) - {n["slug"] for n in notes}
        if unknown:
            sys.exit(f"unknown slugs: {', '.join(sorted(unknown))}")
        notes = [n for n in notes if n["slug"] in args.slugs]
    CACHE.mkdir(parents=True, exist_ok=True)
    global PAIRINGS
    if fontvariants is None:
        print("fontTools not found (see the README): diagrams stay in the notes' own fonts", flush=True)
    elif not args.no_tex:
        PAIRINGS = fontvariants.Pairings()
        for v in PAIRINGS.pairs:  # converts the fonts once, before the threads
            PAIRINGS.latex(v)
    reports = []
    # Translations borrow their originals' bibliographies, so they come after.
    waves = [[n for n in notes if not n.get("translation_of")], [n for n in notes if n.get("translation_of")]]
    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        for wave in waves:
            futures = {pool.submit(build_note, n, not args.no_tex): n for n in wave}
            for fut in as_completed(futures):
                n = futures[fut]
                try:
                    r = fut.result()
                except Exception as e:  # noqa: BLE001
                    r = {"slug": n["slug"], "source": n["source"], "error": f"{type(e).__name__}: {e}"}
                reports.append(r)
                m = r.get("math", {})
                status = r.get("error") or (
                    f"{m.get('formulas', 0)} formulas ({m.get('errors', 0)} errors), "
                    f"{r.get('diagrams', 0)}/{r.get('units', 0)} diagrams, {r.get('seconds', '?')}s"
                )
                print(f"{r['slug']:32} {status}", flush=True)
    previous = {}
    report_file = CACHE / "report.json"
    if report_file.exists():
        previous = {r["slug"]: r for r in json.loads(report_file.read_text())}
    for r in reports:  # a --no-tex run keeps what the TeX runs found
        previous[r["slug"]] = {**previous.get(r["slug"], {}), **r}
    report_file.write_text(json.dumps(sorted(previous.values(), key=lambda r: r["slug"]), indent=1))


if __name__ == "__main__":
    main()
