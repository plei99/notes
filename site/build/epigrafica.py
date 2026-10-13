"""Make the web font that stands in for Optima where it is not installed.

\\mathsf is set in Optima, as in the PDFs of the notes. Optima is Linotype's and
may not be served, but every Mac and iPhone has it, so the stylesheet names it
first; elsewhere Epigrafica (A. Tsolomitis, after MgOpen Cosmetica; GPL), an
Optima-like face in TeX Live, takes its place. TeX Live has it only as Type 1,
so this converts it to WOFF2 once:

    build/.venv/bin/python build/epigrafica.py   # writes public/fonts/
"""

from __future__ import annotations

import subprocess
from pathlib import Path

from fontTools.agl import toUnicode
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.t1Lib import T1Font

SITE = Path(__file__).resolve().parent.parent
OUT = SITE / "public" / "fonts"
FACES = {"Epigrafica-Ortha": ("epigrafica-regular", "Regular"), "Epigrafica-Entona": ("epigrafica-bold", "Bold")}


def convert(pfb: Path, stem: str, style: str) -> Path:
    t1 = T1Font(str(pfb))
    t1.parse()
    glyphs = t1.getGlyphSet()
    order = [".notdef"] + sorted(n for n in glyphs.keys() if n != ".notdef")
    charstrings, widths, cmap = {}, {}, {}
    for name in order:
        glyph = glyphs[name]
        recording = RecordingPen()
        glyph.draw(recording)  # a Type 1 charstring learns its width by drawing
        pen = T2CharStringPen(glyph.width, glyphs)
        recording.replay(pen)
        charstrings[name] = pen.getCharString()
        widths[name] = round(glyph.width)
        text = toUnicode(name)
        if len(text) == 1 and name != ".notdef":
            cmap.setdefault(ord(text), name)
    info = t1.font["FontInfo"]
    bbox = t1.font["FontBBox"]
    family = "Epigrafica"
    fb = FontBuilder(1000, isTTF=False)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupCFF(f"Epigrafica-{style}", {"FullName": f"{family} {style}"}, charstrings, {})
    fb.setupHorizontalMetrics({n: (widths[n], 0) for n in order})
    fb.setupHorizontalHeader(ascent=round(bbox[3]), descent=round(bbox[1]))
    fb.setupNameTable({"familyName": family, "styleName": style,
                       "copyright": info.get("Notice", ""), "licenseDescription": "GNU General Public License"})
    fb.setupOS2(sTypoAscender=round(bbox[3]), sTypoDescender=round(bbox[1]), usWinAscent=round(bbox[3]),
                usWinDescent=-round(bbox[1]), usWeightClass=700 if style == "Bold" else 400)
    fb.setupPost()
    fb.font.flavor = "woff2"
    out = OUT / f"{stem}.woff2"
    fb.save(out)
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for face, (stem, style) in FACES.items():
        pfb = Path(subprocess.run(["kpsewhich", f"{face}.pfb"], capture_output=True, text=True).stdout.strip())
        print(convert(pfb, stem, style), flush=True)


if __name__ == "__main__":
    main()
