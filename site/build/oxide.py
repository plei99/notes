#!/usr/bin/env python3
"""Compile the LaTeX notes into HTML fragments with latexml_oxide.

    python3 site/build/oxide.py                  # every note in the catalogue
    python3 site/build/oxide.py good-moduli-spaces schemes
    python3 site/build/oxide.py --jobs 4

An alternative to build.py that writes the same per-note output; the pages
(pages/[slug].tsx, components/Note.tsx, scripts/finish.ts) cannot tell the two
apart. For each note, in its own scratch directory under site/.cache/oxide-<slug>/:

 1. The note is staged as build.py stages it (a copy of its directory and the
    shared style files).
 2. latexml_oxide, a Rust port of LaTeXML, converts it to HTML5 with MathML and
    SVG in one go: sectioning, theorems, references, footnotes, the bibliography,
    the mathematics and the TikZ / tikz-cd pictures (drawn as SVG, their labels
    set in HTML and MathML). It runs as the corpus protocol runs it
    (latexml/fork/corpus/run_one.sh), in the note's engine persona, with
    OXIDE_PROTOCOL=native by default: TeX Live packages and classes through
    oxide's own bindings, the note's own .sty files (notes.sty) read raw;
    OXIDE_PROTOCOL=raw reads every package and class raw. Errors, warnings and the status code are read off its log.
 3. The HTML is cut down to the note's text: the `article` element without the
    title block, the authors and dates, and oxide's own contents; headings get
    numbers in `span.secnum` and levels that start at h2; footnotes move to a
    list at the end; pictures are sized in em and drawn in the text colour;
    images are copied beside the page. Everything else (theorems, equations,
    citations, MathML) stays as oxide wrote it, with its `ltx_*` classes.

The output is the one build.py writes, in site/generated/<slug>/: _body.html,
_toc.html and _meta.json, plus the images the text includes. There is no
diagrams/<pairing>.json: the labels of a picture are real text in the page's
fonts, so they follow the reader's choice by themselves, and client/note.ts,
which looks for `.diagram[data-n]`, has nothing to do.

oxide's HTML5 is not well-formed XML (void elements are not closed), so, like
build.py, this works with regular expressions and build.element_end.
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
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import build  # noqa: E402  (only runs its main under __main__)

CACHE, OUT, REPO = build.CACHE, build.OUT, build.REPO
element_end = build.element_end

# Where oxide and TeX Live are, as the corpus protocol has them.
OXIDE_BIN = os.environ.get("OXIDE_BIN", "/Users/patrick/.t3/projects/latexml/target/release/latexml_oxide")
TEX_BIN = os.environ.get("TEXBIN", "/usr/local/texlive/2026/bin/universal-darwin")
# oxide's own timeout; the process gets a little longer to write its log.
OXIDE_TIMEOUT = 600
PERSONAS = {"xe": "xetex,", "lua": "luatex,", "pdf": ""}
# latexml.sty's options for each protocol, as run_one.sh has them.
PROTOCOLS = {"native": "localrawstyles", "raw": "rawstyles,rawclasses"}
PROTOCOL = os.environ.get("OXIDE_PROTOCOL", "native")
if PROTOCOL not in PROTOCOLS:
    sys.exit(f"oxide.py: OXIDE_PROTOCOL must be native or raw, not {PROTOCOL!r}")
# oxide dates its output from this, so a rerun gives the same text.
SOURCE_DATE_EPOCH = "1767225600"


# ---- Stage 2: oxide ------------------------------------------------------------------


def run_oxide(tex: Path, engine: str, work: Path) -> dict:
    """Convert the staged note; the counts and status are read off oxide's log."""
    out = work / "out"
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    log = work / "oxide.log"
    log.unlink(missing_ok=True)
    cmd = [
        OXIDE_BIN, f"--preload=[{PERSONAS[engine]}{PROTOCOLS[PROTOCOL]}]latexml.sty",
        f"--timeout={OXIDE_TIMEOUT}", f"--path={tex.parent}", f"--sourcedirectory={tex.parent}",
        f"--log={log}", f"--dest={out / (tex.stem + '.html')}", tex.name,
    ]
    env = {**os.environ, "PATH": f"{TEX_BIN}:{os.environ['PATH']}", "SOURCE_DATE_EPOCH": SOURCE_DATE_EPOCH}
    stdout = work / "oxide.out"
    with stdout.open("w") as fh:
        try:
            subprocess.run(
                cmd, cwd=tex.parent, stdout=fh, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                timeout=OXIDE_TIMEOUT + 60, env=env,
            )
        except subprocess.TimeoutExpired:
            fh.write(f"\n!! timed out after {OXIDE_TIMEOUT + 60}s\n")
    # As run_one.sh: with no log file, what oxide printed is the log.
    text = log.read_text(errors="replace") if log.exists() and log.stat().st_size else stdout.read_text(errors="replace")
    text = re.sub(r"\x1b\[[0-9;]*m", "", text)
    status = re.findall(r"^Status:conversion:(\d)", text, re.M)
    page = out / (tex.stem + ".html")
    return {
        "errors": len(re.findall(r"^Error:", text, re.M)),
        "warnings": len(re.findall(r"^Warning:", text, re.M)),
        "fatals": len(re.findall(r"^Fatal:", text, re.M)),
        # 4 as in run_one.sh: no output, or no status line.
        "status": int(status[-1]) if status and page.exists() and page.stat().st_size else 4,
    }


# ---- Stage 3: the page ---------------------------------------------------------------

BLOCK_TAG = re.compile(r"<(?:p|div|ul|ol|dl|table|figure|pre|blockquote|section|aside|h[1-6])\b")


def article_text(page: str) -> str:
    """The inner HTML of the document's `article`; the page's header and footer stay out."""
    m = re.search(r'<article class="ltx_document[^"]*"[^>]*>', page)
    if not m:
        raise ValueError("no article.ltx_document in oxide's output")
    return page[m.end() : element_end(page, m.start(), "article") - len("</article>")]


def strip_tags(text: str) -> str:
    return htmllib.unescape(re.sub(r"<[^>]+>", "", text))


def drop_front_matter(body: str) -> str:
    """The page header prints the title, authors and date from the catalogue, and
    the page has its own contents."""
    body, _ = build.cut(body, r'<h1 class="ltx_title ltx_title_document"', "h1")
    body, _ = build.cut(body, r'<div class="ltx_(?:authors|dates|classification|keywords)\b')
    body, _ = build.cut(body, r'<nav class="ltx_TOC\b', "nav")
    return body.strip()


# ---- Footnotes

# What a screen reader says for a footnote's mark and for the link back to it: the
# mark alone ("1", "*") does not say where it leads (WCAG 2.4.4). Each name keeps
# the visible mark (WCAG 2.5.3).
FOOTNOTE_WORDS = {
    "en": {"note": "Footnote {}", "back": "Back to footnote {} in the text", "list": "Footnotes"},
    "zh": {"note": "脚注 {}", "back": "返回正文脚注 {}", "list": "脚注"},
}


def footnote_words(lang: str | None) -> dict[str, str]:
    return FOOTNOTE_WORDS.get(lang or "en", FOOTNOTE_WORDS["en"])


NOTE_OPEN = re.compile(r'<span (?:id="([^"]*)" )?class="ltx_note ltx_role_(\w+)"[^>]*>')
NOTE_SHAPE = re.compile(
    r'<sup class="ltx_note_mark">(.*?)</sup><span class="ltx_note_outer"><span class="ltx_note_content">'
    r'(?:<sup class="ltx_note_mark">.*?</sup>)?(.*)</span></span>',
    re.S,
)


def take_footnotes(body: str, notes: list[tuple[int, str, str]], lang: str | None = None) -> str:
    """Footnotes out of the text and into `notes` as (number, mark, content); each
    leaves its mark behind, linked to the list at the end of the page. A note's
    own footnotes are numbered after it."""
    pieces, pos = [], 0
    while (m := NOTE_OPEN.search(body, pos)) :
        end = element_end(body, m.start(), "span")
        shape = NOTE_SHAPE.fullmatch(body[m.end() : end - len("</span>")]) if m.group(2) == "footnote" else None
        if not shape:  # a margin note, or something unexpected: left as oxide wrote it
            pieces.append(body[pos : m.end()])
            pos = m.end()
            continue
        n = len(notes) + 1
        mark, content = shape.group(1), shape.group(2)
        notes.append((n, mark, ""))  # the number is taken before the note's own footnotes
        # oxide repeats the mark as a `ltx_tag` span in the content.
        content = content.lstrip()
        if content.startswith('<span class="ltx_tag ltx_tag_note"'):
            content = content[element_end(content, 0, "span") :]
        notes[n - 1] = (n, mark, take_footnotes(content.strip(), notes, lang))
        ident = f" id='{m.group(1)}'" if m.group(1) else ""  # \footref points at it
        pieces.append(body[pos : m.start()])
        name = htmllib.escape(footnote_words(lang)["note"].format(strip_tags(mark).strip()), quote=True)
        pieces.append(
            f"<span class='footnote-mark'{ident}><a href='#fn{n}' id='fn{n}-bk' role='doc-noteref' aria-label='{name}'>"
            f"<sup>{mark}</sup></a></span>"
        )
        pos = end
    pieces.append(body[pos:])
    return "".join(pieces)


def render_footnotes(notes: list[tuple[int, str, str]], lang: str | None = None) -> str:
    if not notes:
        return ""
    words = footnote_words(lang)
    # A labelled section is a region a reader can jump to, as the notes' own list.
    out = [f"<section class='footnotes' aria-label='{htmllib.escape(words['list'], quote=True)}'>"]
    for n, mark, content in notes:
        back = htmllib.escape(words["back"].format(strip_tags(mark).strip()), quote=True)
        label = f"<span class='footnote-mark'><a href='#fn{n}-bk' role='doc-backlink' aria-label='{back}'><sup>{mark}</sup></a></span>"
        # A paragraph cannot hold blocks; a note that has any goes in the aside as it is.
        inner = f"{label} {content}" if BLOCK_TAG.search(content) else f"<p>{label} {content}</p>"
        out.append(f"<aside class='footnotetext' role='doc-footnote' id='fn{n}'>{inner}</aside>")
    out.append("</section>")
    return "\n".join(out)


# ---- Headings and contents

DIVISION = re.compile(r'<section id="([^"]*)" class="ltx_(\w+)\b[^"]*"[^>]*>\s*')
HEADING = re.compile(r'<(h[1-6])( class="ltx_title [^"]*\bltx_title_\w+"[^>]*)>')
# Where each kind of division stands. Anything else that comes with a title (an
# appendix, the bibliography, an index) stands at the top: the last chapter or section.
LEVEL = {"chapter": 1, "section": 2, "subsection": 3, "subsubsection": 4}
TITLED = set(LEVEL) | {"part", "appendix", "bibliography", "index", "glossary", "acknowledgements"}


def section_number(tag_html: str) -> str:
    """'Chapter 1 ' -> '1', 'Appendix A ' -> 'A', 'Part II ' -> 'II', '2.1. ' -> '2.1'."""
    words = strip_tags(tag_html).replace("\xa0", " ").split()
    return words[-1].rstrip(".") if words else ""


TOC_NUMBER = re.compile(r'<a href="#([^"]+)"[^>]*><span class="ltx_text ltx_ref_title">(?=<span class="ltx_tag ltx_tag_ref">)')


def toc_numbers(page: str) -> dict[str, str]:
    """Each division's number as oxide's own contents print it, by id. The contents
    line has `\\thechapter` (`\\numberline`), where a chapter style may head the
    chapter with something else: memoir's demo2 prints "One" (memoir.cls 3063-3067)."""
    numbers = {}
    for m in TOC_NUMBER.finditer(page):
        numbers[m.group(1)] = section_number(page[m.end() : element_end(page, m.end(), "span")])
    return numbers


def nest(entries: list[tuple[int, str, str, str]]) -> list[tuple[int, str, str, str]]:
    """No entry deeper than one below the one before it, so the contents nest as
    lists do: a section under an untitled chapter would otherwise open two at once.
    The first entry stands at its own level, as it does on the live page (an
    unnumbered section before the first chapter is indented like a section)."""
    out: list[tuple[int, str, str, str]] = []
    for level, ident, num, title in entries:
        out.append((min(level, out[-1][0] + 1) if out else level, ident, num, title))
    return out


def render_toc(entries: list[tuple[int, str, str, str]]) -> str:
    """build.render_toc; a first entry deeper than the shallowest opens lists inside
    lists, which are in an `li` of their own (an `ol` holds `li` only)."""
    toc = build.render_toc(entries)
    return re.sub(r"^((?:<ol>)+)", lambda m: "<ol>" + "<li><ol>" * (m.group(1).count("<ol>") - 1), toc)


# amsart runs these in (amsart.cls \@startsection with a negative afterskip); oxide,
# like LaTeXML, leaves that to ltx-amsart.css, which the site does not load.
AMSART_RUNIN = {"subsection", "subsubsection"}


def tidy_headings(body: str, runin: set[str] = frozenset(), numbers: dict[str, str] | None = None) -> tuple[str, list[tuple[int, str, str, str]], int]:
    """Each division's title becomes `<hN>` (h2 for the shallowest division, a part
    aside) with its number in `span.secnum`; the entries of the contents come back too."""
    found = []  # (start, end, id, kind, tag, attrs, inner)
    pos = 0
    while (m := DIVISION.search(body, pos)) :
        pos = m.end()
        h = HEADING.match(body, m.end())
        if m.group(2) not in TITLED or not h:
            continue
        end = element_end(body, h.start(), h.group(1))
        found.append((h.start(), end, m.group(1), m.group(2), h.group(2), body[h.end() : end - len(f"</{h.group(1)}>")]))
        pos = end
    top = min((LEVEL[d[3]] for d in found if d[3] in LEVEL), default=2)
    toc: list[tuple[int, str, str, str]] = []
    pieces, last = [], 0
    for start, end, ident, kind, attrs, inner in found:
        pieces.append(body[last:start])
        last = end
        level = 0 if kind == "part" else LEVEL.get(kind, top) - top + 2
        num, title = "", inner.strip()
        if title.startswith('<span class="ltx_tag ltx_tag_'):
            cut = element_end(title, 0, "span")
            num, title = section_number(title[:cut]), title[cut:].strip()
            # The number the contents give it, as the live page shows it (toc_numbers).
            num = (numbers or {}).get(ident, num)
        num_html = f"<span class='secnum'>{htmllib.escape(num)}</span> " if num else ""
        if level <= 3 and kind != "part":
            # The contents carry no footnote marks and no ids (the text has them).
            plain = re.sub(r"<span class='footnote-mark'.*?</span>", "", title, flags=re.S)
            plain = re.sub(r"\s+id=(\"[^\"]*\"|'[^']*')", "", plain)
            toc.append((level, ident, num, re.sub(r"\.(</span>)?$", r"\1", plain)))
        tag = f"h{min(max(level, 2), 6)}"
        # A heading titlesec formatted has its own shape (and says so with ltx_runin).
        if kind in runin and "ltx_tag_titlesec" not in title and "ltx_runin" not in attrs:
            # A bold head ending in a full stop, as amsart sets it: "1.1. Title."
            attrs = attrs.replace('class="ltx_title ', 'class="ltx_title ltx_runin ltx_font_bold ', 1)
            if not re.search(r"[.!?:]\s*(</[^>]+>\s*)*$", title):
                title += "."
        pieces.append(f"<{tag}{attrs}>{num_html}{title}</{tag}>")
    pieces.append(body[last:])
    return "".join(pieces), nest(toc), len(found)


# ---- Diagrams

# oxide draws a picture in user units of one TeX point and sets its labels in HTML
# and MathML inside `foreignObject`s.
SVG_OPEN = re.compile(r"<svg\b[^>]*>")
ANY_TAG = re.compile(r"<[a-zA-Z][^>]*>")
CUSTOM_COLOUR = re.compile(r"(--ltx-(?:fg|bg|fill|stroke)-color:)(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|black|white|gr[ae]y)\b")
COLOUR_ATTR = re.compile(r"""\scolor=(['"])(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|black|white|gr[ae]y)\1""")
FO_FONT = re.compile(r"font-size:([\d.]+)pt")
# oxide's user units are LaTeXML pixels, 100 per inch, not TeX points (72.27 per
# inch): every length went through px = pt * 100 / 72.27
# (latexml_core/src/common/numeric_ops.rs).
PX_PER_PT = 100 / 72.27


def recolour(m: re.Match) -> str:
    """build.recolor_tag for `fill` and `stroke`, and the same blends for a label's
    `color` (an attribute on foreignObject, which takes no CSS variable, so it moves
    into the style) and for the `--ltx-*-color` variables oxide's stylesheet reads."""
    tag = CUSTOM_COLOUR.sub(lambda c: c.group(1) + (build.theme_colour(c.group(2)) or c.group(2)), build.recolor_tag(m))
    attr = COLOUR_ATTR.search(tag)
    colour = attr and build.theme_colour(attr.group(2))
    if not colour:
        return tag
    tag = tag[: attr.start()] + tag[attr.end() :]
    if re.search(r"""\sstyle=(['"])""", tag):
        return re.sub(r"""\sstyle=(['"])""", lambda s: f" style={s.group(1)}color:{colour};", tag, count=1)
    end = -2 if tag.endswith("/>") else -1
    return f"{tag[:end].rstrip()} style='color:{colour}'{tag[end:]}"


def labels_in_points(m: re.Match) -> str:
    """oxide sets a label in `font-size:10pt`, CSS points. The picture's units are
    LaTeXML pixels (see PX_PER_PT), scaled to the text by the em sizes of the svg,
    so the label's size in units (10pt = 13.837px) sets it as large as the text
    around the picture."""
    tag = recolour(m)
    return FO_FONT.sub(lambda f: f"font-size:{float(f.group(1)) * PX_PER_PT:.3f}px", tag) if tag.startswith("<foreignObject") else tag


def draw(svg: str, size_pt: float) -> str:
    """One picture sized in ems of the note's font, drawn in the text colour."""
    head_end = svg.find(">") + 1
    head = ANY_TAG.sub(recolour, svg[:head_end])
    # Lengths are unitless LaTeXML pixels: ems of the note's own font size.
    head = re.sub(
        r"""\b(width|height)=['"]([-\d.]+)(?:pt|px)?['"]""", lambda m: f"{m.group(1)}='{float(m.group(2)) / (size_pt * PX_PER_PT):.3f}em'", head
    )
    # An inline picture sits on the baseline by this much.
    head = re.sub(
        r"vertical-align:(-?[\d.]+)(?:px|pt)", lambda m: f"vertical-align:{float(m.group(1)) / (size_pt * PX_PER_PT):.3f}em", head
    )
    return head + ANY_TAG.sub(labels_in_points, svg[head_end:])


# The start or the end of an element that is a block of its own, as oxide writes them.
BLOCK_START = r"<(?:p|div|figure|li|td|th|dd|section)\b[^>]*>"
BLOCK_END = r"</(?:p|div|figure|li|td|th|dd|section|ul|ol|table|h[1-6])>"


def draw_diagrams(body: str, size_pt: float) -> tuple[str, int]:
    """Every picture outermost-first, in `span.diagram`. A picture inside a formula
    (tikz-cd in an `mtext`) is drawn the same but not wrapped, as a span cannot
    take its place in MathML."""
    pieces, pos, count = [], 0, 0
    while (m := SVG_OPEN.search(body, pos)) :
        end = element_end(body, m.start(), "svg")
        svg = draw(body[m.start() : end], size_pt)
        before, after = body[pos : m.start()], body[end:]
        in_math = re.search(r"<mtext\b[^>]*>\s*$", before[-200:]) is not None
        if in_math:
            pieces += [before, svg]
        else:
            tail = body[:m.start()][-800:]
            # Centred, or the only thing in its paragraph, figure or line.
            alone = re.search(r'<(?:p class="ltx_p[^"]*"|figure[^>]*)>\s*$', tail) and re.match(r"\s*</(?:p|figure)>", after)
            if not alone and (wrap := re.search(r'<span class="ltx_inline-block">\s*$', tail)):
                # The inline-block of a picture is alone unless text or a formula of the paragraph comes first
                # (the inline Dynkin diagrams of "A_n: o-o-o"): nothing but span starts since the last block.
                lead = tail[: wrap.start()]
                last = max((x.end() for x in re.finditer(BLOCK_START + "|" + BLOCK_END, lead)), default=0)
                alone = re.fullmatch(r"(?:\s|<span\b[^>]*>)*", lead[last:]) and re.match(r"\s*</span>", after)
            centred = re.search(r'class="[^"]*\bltx_centering\b', m.group(0))
            marked = re.search(r'class="[^"]*\bltx_markedasmath\b', m.group(0))
            display = bool(centred or (alone and not marked))
            pieces += [before, f"<span class='diagram{' diagram--display' if display else ''}'>{svg}</span>"]
        pos = end
        count += 1
    pieces.append(body[pos:])
    return "".join(pieces), count


def drop_pgf_alttext(body: str) -> str:
    """A formula holding a picture has the picture's TeX as its alttext: a few
    kilobytes of \\lxSVG@ commands, of no use to a reader."""
    return re.sub(r'(<math\b[^>]*?) alttext="[^"]*\\(?:lxSVG@|pgfpicture)[^"]*"', r"\1", body)


# ---- Images

def copy_images(body: str, html_dir: Path, dest: Path) -> tuple[str, int, list[str]]:
    """Images the text includes, copied beside it by their relative src."""
    missing: list[str] = []
    copied: set[str] = set()

    def image(m: re.Match) -> str:
        src = htmllib.unescape(m.group(2))
        if re.match(r"(?:[a-z][a-z0-9+.-]*:|/|#)", src, re.I):
            return m.group(0)
        path = (html_dir / src).resolve()
        if not path.is_file() or not path.is_relative_to(html_dir.resolve()):
            missing.append(src)
            return m.group(0)
        target = dest / src
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(path, target)
        copied.add(src)
        return m.group(0) if "loading=" in m.group(0) else m.group(0)[:-1] + " loading='lazy'>"

    return re.sub(r"""<img\b[^>]*?\bsrc=(['"])([^'"]*)\1[^>]*>""", image, body), len(copied), missing


# ---- One note ------------------------------------------------------------------------


GROUP_OPEN = re.compile(r'<table\b[^>]*\bclass="[^"]*\bltx_equationgroup\b')


def scroll_equation_groups(body: str) -> str:
    """Each group of aligned equations in `div.ltx_eqn_scroll`. A group is a table
    whose rows share their columns, and a table cannot scroll itself without
    giving up that layout; a group wider than the column scrolls in the div."""
    pieces, pos = [], 0
    while (m := GROUP_OPEN.search(body, pos)) :
        end = element_end(body, m.start(), "table")
        pieces += [body[pos : m.start()], "<div class='ltx_eqn_scroll'>", body[m.start() : end], "</div>"]
        pos = end
    pieces.append(body[pos:])
    return "".join(pieces)


# As build.py's keep_together: a browser breaks a line between an inline formula
# and the comma after it, or the bracket before it, which TeX never does.
STUCK = re.compile(
    r"(?P<before>[(\[{“‘'\"（「『]*)(?P<math><math\b[^>]*\bdisplay=\"inline\"[^>]*>(?:(?!</math>).)*</math>)"
    r"(?P<after>[-–—.,;:!?)\]}’”'\"…，。；：、！？）」』A-Za-z]*)",
    re.S,
)


def keep_together(body: str) -> str:
    return STUCK.sub(lambda m: f"<span class='nobr'>{m[0]}</span>" if m["before"] or m["after"] else m[0], body)


WIDE_RULE = re.compile(r'(<span class="ltx_rule" style=")width:([\d.]+)pt;([^"]*)display:inline-block;')


def full_width_rules(body: str) -> str:
    """A rule about as wide as the text (\\rule{\\textwidth}{…}) fills its line in TeX,
    so what follows starts below it; oxide gives it a fixed width in points, inline,
    which a wider column sets text beside. It spans the column as a block instead."""
    return WIDE_RULE.sub(
        lambda m: f"{m[1]}width:100%;{m[3]}display:block;" if float(m[2]) >= 200 else m[0], body
    )


def mark_qed(body: str) -> str:
    """oxide ends a proof's last paragraph with a bare ∎; in `span.qed` it sits at
    the right margin, as tex4ht's did. oxide's `\\qed` is ∎ (U+220E), Perl
    LaTeXML's choice; amsthm's default `\\qedsymbol` is `\\openbox` (amsthm.sty
    422-426), the □ the PDF prints, so ∎ becomes □, in text and in a display's
    `\\qedhere` alike. No note redefines `\\qedsymbol`."""
    body = body.replace("\u220e", "\u25a1")
    return re.sub(r"\s*([□■])\s*</p>", r" <span class='qed'>\1</span></p>", body)


BIBITEM = re.compile(r'<li\b[^>]*\bclass="ltx_bibitem\b[^"]*"[^>]*>\s*(<span class="ltx_tag\b[^>]*>)')


def wrap_bibliography(body: str) -> str:
    """The label of a reference and the rest of it side by side, in the two columns the
    list shares (the label column is as wide as the longest label): the rest of each
    `li.ltx_bibitem` goes in `div.ltx_bibbody`."""
    pieces, pos = [], 0
    while (m := BIBITEM.search(body, pos)) :
        tag_end = element_end(body, m.start(1), "span")
        li_end = body.index("</li>", tag_end)
        pieces += [body[pos:tag_end], "<div class='ltx_bibbody'>", body[tag_end:li_end].strip(), "</div>"]
        pos = li_end
    pieces.append(body[pos:])
    return "".join(pieces)


def post_process(page: str, size_pt: float, out_dir: Path, dest: Path, lang: str | None = None) -> tuple[str, str, dict]:
    """oxide's page to the note's fragment, its contents and what was found on the way."""
    numbers = toc_numbers(page)
    body = drop_front_matter(article_text(page))
    notes: list[tuple[int, str, str]] = []
    body = take_footnotes(body, notes, lang)
    runin = AMSART_RUNIN if 'href="ltx-amsart.css"' in page else frozenset()
    body, toc, headings = tidy_headings(scroll_equation_groups(mark_qed(body)), runin, numbers)
    body, diagrams = draw_diagrams(drop_pgf_alttext(body), size_pt)
    body = wrap_bibliography(full_width_rules(keep_together(body)))
    body, images, missing = copy_images(body, out_dir, dest)
    body = body + ("\n" + render_footnotes(notes, lang) if notes else "")
    info = {"headings": headings, "toc": len(toc), "diagrams": diagrams, "footnotes": len(notes), "images": images}
    if missing:
        info["missing_images"] = missing
    return body, render_toc(toc), info


def finish_note(note: dict, work: Path, report: dict, t0: float) -> dict:
    slug = note["slug"]
    tex = work / note["source"]
    page_file = work / "out" / (tex.stem + ".html")
    if not page_file.exists() or not page_file.stat().st_size:
        report["error"] = "oxide produced no HTML"
        return report
    preamble = (REPO / note["source"]).read_text(encoding="utf-8", errors="replace").split("\\begin{document}")[0]
    dest = OUT / slug
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    body, toc, info = post_process(page_file.read_text(encoding="utf-8", errors="replace"), build.font_size_pt(preamble), page_file.parent, dest, note.get("lang"))
    report.update(info)
    report["units"] = info["diagrams"]
    report["bytes"] = len(body.encode())
    (dest / "_body.html").write_text(body)
    (dest / "_toc.html").write_text(toc)
    (dest / "_meta.json").write_text(json.dumps({k: report[k] for k in ("units", "diagrams", "bytes")}))
    report["seconds"] = round(time.time() - t0, 1)
    return report


def build_note(note: dict, convert: bool = True) -> dict:
    slug = note["slug"]
    work = CACHE / f"oxide-{slug}"
    t0 = time.time()
    report: dict = {"slug": slug, "source": note["source"]}
    if convert:
        tex = build.stage(note, work)
        preamble = tex.read_text(encoding="utf-8", errors="replace").split("\\begin{document}")[0]
        engine = build.engine_of(preamble)
        report["engine"] = engine
        report.update(run_oxide(tex, engine, work))
    else:  # the counts of the last conversion are in the previous report
        report.update(previous_report().get(slug, {}))
    return finish_note(note, work, report, t0)


# ---- Running ---------------------------------------------------------------------------

REPORT = CACHE / "report-oxide.json"


def previous_report() -> dict[str, dict]:
    return {r["slug"]: r for r in json.loads(REPORT.read_text())} if REPORT.exists() else {}


def status_line(r: dict) -> str:
    if "error" in r:
        return f"ERROR {r['error']}"
    return (
        f"{r.get('seconds', '?'):>6}s  E{r.get('errors', '?')} W{r.get('warnings', '?')} F{r.get('fatals', '?')} "
        f"status {r.get('status', '?')}  {r['headings']} headings, {r['toc']} in contents, {r['diagrams']} diagrams, "
        f"{r['footnotes']} footnotes, {r['images']} images, {r['bytes'] / 1000:.0f} kB"
    )


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("slugs", nargs="*")
    ap.add_argument("--jobs", type=int, default=6)
    ap.add_argument("--no-oxide", action="store_true", help="redo only the HTML stage, from the cached conversions")
    args = ap.parse_args()
    notes = build.read_catalog()
    if args.slugs:
        unknown = set(args.slugs) - {n["slug"] for n in notes}
        if unknown:
            sys.exit(f"unknown slugs: {', '.join(sorted(unknown))}")
        notes = [n for n in notes if n["slug"] in args.slugs]
    if not args.no_oxide and not Path(OXIDE_BIN).exists():
        sys.exit(f"no oxide binary at {OXIDE_BIN} (set OXIDE_BIN)")
    CACHE.mkdir(parents=True, exist_ok=True)
    reports = []
    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        futures = {pool.submit(build_note, n, not args.no_oxide): n for n in notes}
        for fut in as_completed(futures):
            n = futures[fut]
            try:
                r = fut.result()
            except Exception as e:  # noqa: BLE001
                r = {"slug": n["slug"], "source": n["source"], "error": f"{type(e).__name__}: {e}"}
            reports.append(r)
            print(f"{r['slug']:40} {status_line(r)}", flush=True)
    previous = previous_report()
    for r in reports:
        previous[r["slug"]] = r
    REPORT.write_text(json.dumps(sorted(previous.values(), key=lambda r: r["slug"]), indent=1))
    bad = [r["slug"] for r in reports if "error" in r or r.get("errors") or r.get("fatals")]
    if bad:
        print(f"\nnot clean: {', '.join(sorted(bad))}", flush=True)


if __name__ == "__main__":
    main()
