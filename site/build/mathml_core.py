"""Bring MathJax's MathML down to MathML Core, which is what browsers render natively.

MathJax writes full MathML 3. Chromium and WebKit implement MathML Core, which
drops several things the notes rely on:
  - mathvariant (bold, fraktur, double-struck, script, ...) on anything but a
    single-letter mi: the letters become Unicode mathematical alphanumerics,
    which every math font carries, and are then styled by the font picker;
  - mtable's columnalign / columnspacing / rowspacing: they become per-cell
    text-align and padding, so align* still lines up on its &s;
  - mlabeledtr (numbered equations): the number is pulled out of the table;
  - menclose (\\boxed, \\cancel): becomes an mrow with a class styled in CSS.
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
    "sans-serif": "font-family:sans-serif",
}


def fix_token(el: ET.Element, inherited: str | None) -> None:
    tag = el.tag.split("}")[1]
    tex_variant = el.attrib.pop("data-mjx-variant", None)
    variant = el.attrib.get("mathvariant") or inherited
    if tex_variant in TEX_VARIANTS:
        variant = TEX_VARIANTS[tex_variant] or variant
    if not variant or variant == "normal" or not el.text:
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
    elif tag == "mspace":
        el.attrib.pop("linebreak", None)
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
