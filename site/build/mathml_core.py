"""Bring MathJax's MathML down to MathML Core, which is what browsers render natively.

MathJax writes full MathML 3. Chromium and WebKit implement MathML Core, which
drops several things the notes rely on:
  - mathvariant (bold, fraktur, double-struck, script, ...) on anything but a
    single-letter mi: the letters become Unicode mathematical alphanumerics,
    which every math font carries, and are then styled by the font picker;
  - mtable's columnalign / columnspacing / rowspacing: they become per-cell
    text-align and padding, so align* still lines up on its &s;
  - mlabeledtr (numbered equations): the number is pulled out of the table;
  - menclose (\\boxed, \\cancel): becomes an mrow with a class styled in CSS;
  - accents (\\hat, \\widehat, \\tilde, ...) need accent="true" on the mover;
  - mpadded's relative widths and heights (\\xrightarrow) are MathML 3 only.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET

NS = "http://www.w3.org/1998/Math/MathML"
ET.register_namespace("", NS)
Q = lambda tag: f"{{{NS}}}{tag}"  # noqa: E731
TOKENS = {"mi", "mn", "mo", "mtext", "ms"}

# ---- Unicode mathematical alphanumerics --------------------------------------

LATIN = {  # variant: (A, a) code points of the mathematical alphanumerics block
    "bold": (0x1D400, 0x1D41A),
    "italic": (0x1D434, 0x1D44E),
    "bold-italic": (0x1D468, 0x1D482),
    "script": (0x1D49C, 0x1D4B6),
    "bold-script": (0x1D4D0, 0x1D4EA),
    "fraktur": (0x1D504, 0x1D51E),
    "double-struck": (0x1D538, 0x1D552),
    "bold-fraktur": (0x1D56C, 0x1D586),
    "sans-serif": (0x1D5A0, 0x1D5BA),
    "bold-sans-serif": (0x1D5D4, 0x1D5EE),
    "sans-serif-italic": (0x1D608, 0x1D622),
    "sans-serif-bold-italic": (0x1D63C, 0x1D656),
    "monospace": (0x1D670, 0x1D68A),
}
# Letters that were already in Letterlike Symbols, so the block has holes there.
HOLES = {
    "italic": {"h": "ℎ"},
    "script": {"B": "ℬ", "E": "ℰ", "F": "ℱ", "H": "ℋ", "I": "ℐ", "L": "ℒ", "M": "ℳ", "R": "ℛ", "e": "ℯ", "g": "ℊ", "o": "ℴ"},
    "fraktur": {"C": "ℭ", "H": "ℌ", "I": "ℑ", "R": "ℜ", "Z": "ℨ"},
    "double-struck": {"C": "ℂ", "H": "ℍ", "N": "ℕ", "P": "ℙ", "Q": "ℚ", "R": "ℝ", "Z": "ℤ"},
}
DIGITS = {"bold": 0x1D7CE, "double-struck": 0x1D7D8, "sans-serif": 0x1D7E2, "bold-sans-serif": 0x1D7EC, "monospace": 0x1D7F6}
GREEK = {"bold": 0x1D6A8, "italic": 0x1D6E2, "bold-italic": 0x1D71C, "bold-sans-serif": 0x1D756, "sans-serif-bold-italic": 0x1D790}
GREEK_LOWER_EXTRA = "∂ϵϑϰϕϱϖ"  # follow ω in each Greek alphabet of the block
# MathJax's private TeX variants, read from data-mjx-variant.
TEX_VARIANTS = {
    "-tex-calligraphic": "script",
    "-tex-bold-calligraphic": "bold-script",
    "-tex-mathit": "italic",
    "-tex-oldstyle": None,
    "-tex-bold-oldstyle": "bold",
}


def styled(text: str, variant: str) -> str | None:
    """text in the given variant, or None if some character has no styled form."""
    out = []
    for c in text:
        o = ord(c)
        if variant in HOLES and c in HOLES[variant]:
            out.append(HOLES[variant][c])
        elif variant in LATIN and "A" <= c <= "Z":
            out.append(chr(LATIN[variant][0] + o - 65))
        elif variant in LATIN and "a" <= c <= "z":
            out.append(chr(LATIN[variant][1] + o - 97))
        elif variant in DIGITS and "0" <= c <= "9":
            out.append(chr(DIGITS[variant] + o - 48))
        elif variant in GREEK and 0x391 <= o <= 0x3A9:
            out.append(chr(GREEK[variant] + o - 0x391))
        elif variant in GREEK and 0x3B1 <= o <= 0x3C9:
            out.append(chr(GREEK[variant] + 26 + o - 0x3B1))
        elif variant in GREEK and c in GREEK_LOWER_EXTRA:
            out.append(chr(GREEK[variant] + 51 + GREEK_LOWER_EXTRA.index(c)))
        elif c in "  ":
            out.append(c)
        else:
            return None
    return "".join(out)


TEXT_STYLE = {
    "bold": "font-weight:bold",
    "italic": "font-style:italic",
    "bold-italic": "font-weight:bold;font-style:italic",
    "monospace": "font-family:var(--mono)",
}
# \\mathsf and \\textsf are set in Optima, as in the PDFs, by the class sf
# (styles.css), not in the math font's sans-serif letters.
SANS = {
    "sans-serif": "",
    "bold-sans-serif": "font-weight:bold",
    "sans-serif-italic": "font-style:italic",
    "sans-serif-bold-italic": "font-weight:bold;font-style:italic",
}


def fix_token(el: ET.Element, inherited: str | None) -> None:
    tag = el.tag.split("}")[1]
    tex_variant = el.attrib.pop("data-mjx-variant", None)
    variant = el.attrib.get("mathvariant") or inherited
    if tex_variant in TEX_VARIANTS:
        variant = TEX_VARIANTS[tex_variant] or variant
    if not variant or variant == "normal" or not el.text:
        return
    if variant in SANS:
        el.attrib.pop("mathvariant", None)
        el.set("class", "sf")
        if SANS[variant]:
            el.set("style", SANS[variant])
        if tag == "mi":
            el.set("mathvariant", "normal")
        return
    if tag == "mtext":
        el.attrib.pop("mathvariant", None)
        if variant in TEXT_STYLE:
            el.set("style", TEXT_STYLE[variant])
        return
    if tag == "mi" and variant == "italic" and len(el.text) == 1:
        el.attrib.pop("mathvariant", None)  # single-letter mi is italic already
        return
    new = styled(el.text, variant)
    if new is not None:
        el.text = new
        el.attrib.pop("mathvariant", None)
        if tag == "mi" and len(new) > 1:
            el.set("mathvariant", "normal")  # several styled letters: no auto-italic


# ---- Tables ------------------------------------------------------------------


def _list(value: str | None) -> list[str]:
    return value.split() if value else []


def _at(values: list[str], i: int, default: str) -> str:
    if not values:
        return default
    return values[i] if i < len(values) else values[-1]


def _half(length: str) -> str:
    m = re.fullmatch(r"(-?[\d.]+)([a-z%]*)", length)
    if not m:
        return "0"
    value = float(m.group(1)) / 2
    return f"{value:g}{m.group(2) or 'em'}" if value else "0"


def fix_table(table: ET.Element) -> None:
    aligns = _list(table.attrib.pop("columnalign", None))
    spacing = _list(table.attrib.pop("columnspacing", None))
    rowspacing = _list(table.attrib.pop("rowspacing", None))
    for attr in ("rowalign", "columnlines", "rowlines", "frame", "framespacing", "side", "minlabelspacing", "width", "equalrows", "equalcolumns", "align"):
        table.attrib.pop(attr, None)
    rows = [r for r in table if r.tag in (Q("mtr"), Q("mlabeledtr"))]
    for r_i, row in enumerate(rows):
        labeled = row.tag == Q("mlabeledtr")
        cells = [c for c in row if c.tag == Q("mtd")]
        if labeled and cells:
            label, cells = cells[0], cells[1:]
            row.remove(label)
            label.set("class", "eqno")
            row.append(label)
            row.tag = Q("mtr")
        row_aligns = _list(row.attrib.pop("columnalign", None))
        top = _half(_at(rowspacing, r_i - 1, "1ex")) if r_i else "0"
        bottom = _half(_at(rowspacing, r_i, "1ex")) if r_i < len(rows) - 1 else "0"
        for c_i, cell in enumerate(cells):
            align = cell.attrib.pop("columnalign", None) or _at(row_aligns, c_i, _at(aligns, c_i, "center"))
            left = _half(_at(spacing, c_i - 1, "0.8em")) if c_i else "0"
            right = _half(_at(spacing, c_i, "0.8em")) if c_i < len(cells) - 1 else "0"
            style = f"text-align:{align};padding:{top} {right} {bottom} {left}"
            cell.set("style", style)


# ---- menclose ------------------------------------------------------------------


# Accents. MathJax writes \\hat x as <mover><mi>x</mi><mo>^</mo></mover>: without
# accent="true" MathML Core sets the ^ as a limit, small and raised, and fonts
# keep their accents (and the wide ones) under the spacing and combining
# forms, not ASCII. Only the combining hat stretches in browsers, so \\widehat
# gets it; the rest keep their spacing forms, centred.
ACCENTS = {"^": "\u02c6", "\u02c6": "\u02c6", "~": "\u02dc", "\u02dc": "\u02dc", "\u00af": "\u00af",
           "\u02c7": "\u02c7", "\u02d8": "\u02d8", "\u02d9": "\u02d9", "\u00a8": "\u00a8",
           "\u00b4": "\u00b4", "`": "`", "\u02da": "\u02da", "\u2015": "\u2015", "\u20d7": "\u20d7"}
WIDE_HAT = "\u0302"


def fix_accent(el: ET.Element) -> None:
    if len(el) != 2 or el[1].tag != Q("mo"):
        return
    over = el[1]
    char = (over.text or "").strip()
    vector = char == "\u2192" and over.get("stretchy") == "false"  # \\vec
    if char not in ACCENTS and not vector and over.get("accent") != "true":
        return
    el.set("accent", "true")
    if char in ("^", "\u02c6") and over.get("stretchy") != "false":
        over.text = WIDE_HAT
    elif char in ACCENTS:
        over.text = ACCENTS[char]


# mpadded. MathJax pads with MathML 3's relative values (width="+0.833em": that
# much wider than the content; height="-.2em": that much less), which MathML
# Core reads as absolute lengths or ignores: \\xrightarrow's label then runs
# into the next term and sits on the arrow. A relative width becomes spaces
# either side; relative heights and depths are dropped.
def _em(value: str | None) -> float | None:
    m = re.fullmatch(r"([+-]?\d*\.?\d+)em", (value or "").strip())
    return float(m.group(1)) if m else None


def fix_mpadded(el: ET.Element) -> None:
    for attr in ("height", "depth"):
        if (el.get(attr) or "")[:1] in "+-" and el.get(attr):
            del el.attrib[attr]
    width = el.get("width") or ""
    extra, left = _em(width), _em(el.get("lspace")) or 0.0
    if width[:1] not in "+-" or extra is None:
        return
    del el.attrib["width"]
    el.attrib.pop("lspace", None)
    if left > 0:
        el.insert(0, ET.Element(Q("mspace"), width=f"{left:g}em"))
    if extra - left > 0:
        el.append(ET.Element(Q("mspace"), width=f"{extra - left:g}em"))


def fix_xarrow(el: ET.Element) -> None:
    """MathJax sets \\xrightarrow's arrow alone in an mstyle, where a browser
    takes it for a prefix or postfix operator, without a relation's spacing."""
    base = el[0] if len(el) else None
    if base is not None and base.tag == Q("mstyle") and len(base) == 1 and base[0].tag == Q("mo"):
        base[0].set("form", "infix")


# Operator names. MathJax follows \\dim, \\sin, ... with an invisible function
# application (U+2061) and spaces them itself; a browser gives it no width,
# so `\\dim B` would read dimB. TeX puts a thin space there, but none before
# an opening bracket: \\sin(x).
OPENING = set("([{⟨⌊⌈|‖")


def fix_function_application(el: ET.Element) -> None:
    children = list(el)
    for i, child in enumerate(children):
        if child.tag != Q("mo") or (child.text or "") != "\u2061":
            continue
        following = children[i + 1] if i + 1 < len(children) else None
        while following is not None and following.tag == Q("mrow") and len(following):
            following = following[0]
        if following is not None and following.tag == Q("mo") and (following.text or "").strip()[:1] in OPENING:
            continue
        child.set("rspace", "0.1667em")


def fix_menclose(el: ET.Element) -> None:
    notation = el.attrib.pop("notation", "box")
    el.tag = Q("mrow")
    el.set("class", " ".join("enclose-" + n for n in notation.split()))


# ---- The tree ----------------------------------------------------------------


def walk(el: ET.Element, inherited: str | None = None) -> None:
    for attr in [a for a in el.attrib if a.startswith("data-mjx-") and a != "data-mjx-variant"]:
        del el.attrib[attr]
    tag = el.tag.split("}")[1]
    if tag in TOKENS:
        fix_token(el, inherited)
        return
    if el.text and not el.text.strip():
        el.text = None
    variant = el.attrib.pop("mathvariant", None) if tag in ("mstyle", "mrow") else None
    if tag == "mtable":
        fix_table(el)
    elif tag == "menclose":
        fix_menclose(el)
    elif tag == "mover":
        fix_accent(el)
        fix_xarrow(el)
    elif tag in ("munder", "munderover"):
        fix_xarrow(el)
    elif tag == "mpadded":
        fix_mpadded(el)
    elif tag == "mspace":
        el.attrib.pop("linebreak", None)
    fix_function_application(el)
    for i, child in enumerate(list(el)):
        if child.tail and not child.tail.strip():
            child.tail = None
        if child.tag == Q("maction"):  # keep only the first alternative
            first = child[0] if len(child) else ET.Element(Q("mrow"))
            el.remove(child)
            el.insert(i, first)
            child = first
        walk(child, variant or inherited)


def single_label(root: ET.Element) -> tuple[ET.Element, str | None, str | None]:
    """A display that is one numbered row: unwrap it and return (root, number, anchor)."""
    kids = list(root)
    if len(kids) != 1 or kids[0].tag != Q("mtable"):
        return root, None, None
    rows = list(kids[0])
    if len(rows) != 1 or rows[0].tag != Q("mlabeledtr"):
        return root, None, None
    cells = [c for c in rows[0] if c.tag == Q("mtd")]
    if len(cells) != 2:
        return root, None, None
    label, content = cells
    number = "".join(label.itertext()).strip()
    anchor = label.get("id")
    root.remove(kids[0])
    row = ET.SubElement(root, Q("mrow"))
    row.extend(list(content))
    return root, number, anchor


def to_core(mml: str) -> tuple[str, str | None, str | None]:
    """(MathML Core string, equation number or None, anchor id or None)."""
    root = ET.fromstring(mml)
    root, number, anchor = single_label(root)
    walk(root)
    out = ET.tostring(root, encoding="unicode")
    out = out.replace(f' xmlns="{NS}"', "", 1)
    return out, number, anchor
