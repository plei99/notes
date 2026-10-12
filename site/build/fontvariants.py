"""The site's font pairings, and the LaTeX that draws a diagram in each of them.

A reader picks a text font and its math font on the page; a diagram is a drawing
made by LaTeX, so it is drawn once per pairing (one XeLaTeX run each: unicode-math
cannot vary its fallback slots between math versions) and the page shows the
one that matches. The pairings are read from styles.css (the --latin and --latin-math of
each :root[data-latin]) and the fonts are the homepage's own web fonts, converted
back to OpenType for XeTeX, so diagram and page share their glyphs exactly.

Needs fontTools and brotli (build/.venv; see the README).
"""

from __future__ import annotations

import functools
import re
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = HERE.parent
STYLES = SITE / "src" / "styles.css"
FONTS_URL = "https://plei99.github.io/fonts/"
# The homepage checkout beside this repository, when there is one: it may hold
# fonts not yet published.
LOCAL_FONTS = SITE.parent.parent / "plei99.github.io" / "src" / "fonts"
CACHE = SITE / ".cache" / "fonts"

# The math font the browser falls back to for symbols a math font lacks (see
# --math in styles.css); unicode-math takes those slots from it too.
FALLBACK_MATH = "Asana Math"
# Slots worth checking: letterlike symbols, arrows, operators and the other
# mathematical blocks, and the math alphabets.
CHECKED = [(0x2100, 0x2BFF), (0x1D400, 0x1D7FF)]

# Font packages of the notes' preambles. A diagram drawn in a site font must not
# load them, so each is marked as already loaded. (fontenc stays: fontspec asks
# for it too, and sets its own encoding after.)
SUPPRESSED = [
    "mathpazo", "eulervm", "euler", "berasans", "beramono", "inconsolata", "fourier",
    "eucal", "mathrsfs", "bbm", "bm", "lmodern", "mathptmx", "newpxtext", "newpxmath",
    "newtxtext", "newtxmath", "tgpagella", "palatino", "helvet", "libertine", "libertinus",
    "ebgaramond", "garamondx", "fira", "lato", "cmbright", "kpfonts", "charter", "utopia",
]


def first_family(value: str) -> str:
    m = re.match(r"""\s*(["']?)([^"',;]+)\1""", value)
    return m.group(2).strip() if m else ""


def pairings(css: str | None = None) -> dict[str, tuple[str, str]]:
    """id -> (text family, math family), as styles.css pairs them."""
    css = css if css is not None else STYLES.read_text()
    root = re.search(r":root\s*\{(.*?)\}", css, re.S).group(1)
    default_text = first_family(re.search(r"--latin:\s*([^;]+);", root).group(1))
    default_math = first_family(re.search(r"--latin-math:\s*([^;]+);", root).group(1))
    out = {"pagella": (default_text, default_math)}
    for m in re.finditer(r""":root\[data-latin="([\w-]+)"\]\s*\{(.*?)\}""", css, re.S):
        text = re.search(r"--latin:\s*([^;]+);", m.group(2))
        math = re.search(r"--latin-math:\s*([^;]+);", m.group(2))
        out[m.group(1)] = (
            first_family(text.group(1)) if text else default_text,
            first_family(math.group(1)) if math else default_math,
        )
    return out


def fonts_css() -> tuple[str, str]:
    """The homepage's fonts.css and where its font files live."""
    if (LOCAL_FONTS / "fonts.css").exists():
        return (LOCAL_FONTS / "fonts.css").read_text(), str(LOCAL_FONTS)
    with urllib.request.urlopen(FONTS_URL + "fonts.css") as r:
        return r.read().decode(), FONTS_URL


def faces(css: str) -> dict[str, dict[tuple[str, int], str]]:
    """family -> {(style, weight): file name}. A variable font's weight range
    is listed at both ends."""
    out: dict[str, dict[tuple[str, int], str]] = {}
    for block in re.findall(r"@font-face\s*\{(.*?)\}", css, re.S):
        family = first_family(re.search(r"font-family:\s*([^;]+);", block).group(1))
        style = (re.search(r"font-style:\s*(\w+)", block) or [None, "normal"])[1]
        weights = [int(w) for w in re.findall(r"\d+", (re.search(r"font-weight:\s*([^;]+);", block) or [None, "400"])[1])]
        src = re.search(r"""url\(["']?([^"')]+)""", block).group(1).rsplit("/", 1)[-1]
        for w in weights:
            out.setdefault(family, {})[(style, w)] = src
    return out


def sfnt(name: str, where: str, weight: int | None = None) -> Path:
    """An OpenType copy of a web font (an instance, for a variable one)."""
    from fontTools.ttLib import TTFont

    stem = name.removesuffix(".woff2") + (f"-{weight}" if weight else "")
    for ext in (".otf", ".ttf"):
        if (CACHE / (stem + ext)).exists():
            return CACHE / (stem + ext)
    CACHE.mkdir(parents=True, exist_ok=True)
    woff2 = CACHE / name
    if not woff2.exists():
        if where.startswith("http"):
            urllib.request.urlretrieve(where + name, woff2)
        else:
            woff2.write_bytes((Path(where) / name).read_bytes())
    font = TTFont(woff2)
    if "fvar" in font:
        from fontTools.varLib import instancer

        font = instancer.instantiateVariableFont(font, {"wght": weight or 400})
    font.flavor = None
    out = CACHE / (stem + (".otf" if "CFF " in font or "CFF2" in font else ".ttf"))
    font.save(out)
    return out


@functools.cache
def missing_slots(math: Path, fallback: Path) -> list[tuple[int, int]]:
    """Slots the math font lacks and the fallback has, as ranges."""
    from fontTools.ttLib import TTFont

    have = TTFont(math).getBestCmap()
    spare = TTFont(fallback).getBestCmap()
    slots = [c for a, b in CHECKED for c in range(a, b + 1) if c not in have and c in spare]
    ranges: list[tuple[int, int]] = []
    for c in slots:
        if ranges and c == ranges[-1][1] + 1:
            ranges[-1] = (ranges[-1][0], c)
        else:
            ranges.append((c, c))
    return ranges


def font_options(path: Path, extra: str = "") -> str:
    return f"Path={path.parent}/,{extra}"


class Pairings:
    """The fonts of every pairing, ready for LaTeX."""

    def __init__(self) -> None:
        css, where = fonts_css()
        self.faces = faces(css)
        self.where = where
        self.pairs = pairings()

    def face(self, family: str, style: str, weight: int) -> Path | None:
        files = self.faces.get(family, {})
        name = files.get((style, weight))
        if not name:
            return None
        variable = sum(1 for (s, _), n in files.items() if n == name and s == style) > 1
        return sfnt(name, self.where, weight if variable else None)

    def text_font(self, family: str) -> str:
        """\\newfontfamily arguments; a missing italic or bold is faked, as the
        browser does."""
        regular = self.face(family, "normal", 400)
        italic = self.face(family, "italic", 400)
        bold = self.face(family, "normal", 700)
        bold_italic = self.face(family, "italic", 700)
        opts = [f"Path={regular.parent}/"]
        opts.append(f"ItalicFont={italic.name}" if italic else f"ItalicFont={regular.name},ItalicFeatures={{FakeSlant=0.2}}")
        opts.append(f"BoldFont={bold.name}" if bold else f"BoldFont={regular.name},BoldFeatures={{FakeBold=2}}")
        if bold_italic:
            opts.append(f"BoldItalicFont={bold_italic.name}")
        else:
            opts.append(f"BoldItalicFont={(bold or regular).name},BoldItalicFeatures={{FakeSlant=0.2{'' if bold else ',FakeBold=2'}}}")
        return f"{{{regular.name}}}[{','.join(opts)}]"

    def latex(self, pairing: str, preamble: str = "") -> tuple[str, str]:
        """(before \\documentclass, before \\begin{document}) for diagrams drawn
        in one pairing. preamble is scanned for the options the suppressed
        packages are asked for, which are recorded too, lest LaTeX report an
        option clash."""
        before = ["\\makeatletter"]
        for p in SUPPRESSED:
            options = sorted({
                o.strip()
                for m in re.finditer(r"\\(?:usepackage|RequirePackage)\[([^\]]*)\]\{([^}]*)\}", preamble)
                if p in [x.strip() for x in m.group(2).split(",")]
                for o in m.group(1).split(",")
                if o.strip()
            })
            before.append(f"\\@namedef{{ver@{p}.sty}}{{2099/01/01}}\\@namedef{{opt@{p}.sty}}{{{','.join(options)}}}")
        # A note that sets its own fonts (by name, which XeTeX may not find)
        # sets nothing here; the pairing's are set with copies of the commands.
        before += [
            "\\AddToHook{package/fontspec/after}{\\NewCommandCopy\\HtmlSetmainfont\\setmainfont"
            "\\RenewDocumentCommand\\setmainfont{O{}mO{}}{}\\RenewDocumentCommand\\setsansfont{O{}mO{}}{}"
            "\\RenewDocumentCommand\\setmonofont{O{}mO{}}{}}",
            "\\AddToHook{package/unicode-math/after}{\\NewCommandCopy\\HtmlSetmathfont\\setmathfont"
            "\\RenewDocumentCommand\\setmathfont{O{}mO{}}{}}",
        ]
        before.append("\\makeatother")

        text, math = self.pairs[pairing]
        mfont = self.face(math, "normal", 400)
        fallback = self.face(FALLBACK_MATH, "normal", 400)
        setup = [
            f"% --- added by site/build: the {pairing} pairing of the site ---",
            "\\usepackage{fontspec}",
            "\\usepackage{unicode-math}",
            f"\\HtmlSetmainfont{self.text_font(text)}",
            f"\\HtmlSetmathfont{{{mfont.name}}}[Path={mfont.parent}/]",
        ]
        gaps = missing_slots(mfont, fallback) if mfont != fallback else []
        if gaps:
            slots = ",".join(f'"{a:X}' if a == b else f'"{a:X}-"{b:X}' for a, b in gaps)
            setup.append(f"\\HtmlSetmathfont{{{fallback.name}}}[Path={fallback.parent}/,range={{{slots}}}]")
        setup += [
            # hyperref's bookmarks choke on unicode-math symbols in headings
            # (\\section{... $\\heartsuit$}); a diagram needs no bookmarks.
            "\\AtBeginDocument{\\def\\pdfstringdef#1#2{\\gdef#1{}}}",
            "\\providecommand\\mathbbm[1]{\\mathbb{#1}}",
            "\\providecommand\\bm[1]{\\symbfit{#1}}",
        ]
        return "\n".join(before) + "\n", "\n".join(setup) + "\n"
