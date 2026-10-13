#!/usr/bin/env python3
"""Subset the Chinese fonts to the CJK characters the notes site uses.

The homepage serves the Chinese faces (Source Han Serif and Sans, Resource Han
Rounded, LXGW WenKai), but subset to the characters on the homepage, and the
Chinese index and the translated notes use hundreds more. So the notes site
serves its own subsets of the same fonts, named "Notes <family>", and its
stylesheet names them after the homepage's: a character the homepage's subset
has comes from there (and from the browser cache, on the shared origin), and
only the rest from these. A page whose Chinese is all on the homepage, such as
an English page with its 中文 links, fetches nothing more.

Run this after building the notes (it reads generated/) whenever Chinese text
with new characters is added; `bun run check` fails until it is:

    build/.venv/bin/python build/subset-cjk.py NotoSerifSC-Regular.otf \\
        NotoSerifSC-Bold.otf NotoSansSC-Regular.otf NotoSansSC-Bold.otf \\
        ResourceHanRoundedCN-Regular.ttf ResourceHanRoundedCN-Bold.ttf \\
        LXGWWenKai-Regular.ttf

The source files are the homepage's (its scripts/subset-cjk.py says where they
come from). The output name comes from the input name. The script also writes
public/fonts/cjk-coverage.txt, which scripts/check-cjk-coverage.ts compares
against the site.
"""

import glob
import re
import sys
from pathlib import Path

from fontTools import subset

SITE = Path(__file__).resolve().parent.parent
FONTS = SITE / "public" / "fonts"
CJK = re.compile(r"[⺀-⿟　-〿぀-ヿ㐀-䶿一-鿿豈-﫿＀-￯]")
# Always included, so ordinary punctuation never depends on the content.
PUNCTUATION = "U+3000-303F,U+FF01-FF0F,U+FF1A-FF20,U+FF3B-FF40,U+FF5B-FF65"
# Where the site's text is: the code and data, and the notes as built.
SOURCES = [
    *(f"{folder}/**/*.{ext}" for folder in ("data", "pages", "components", "client", "lib") for ext in ("ts", "tsx")),
    "generated/*/_*.html",
]


def site_characters() -> set[str]:
    chars: set[str] = set()
    for pattern in SOURCES:
        for path in glob.glob(str(SITE / pattern), recursive=True):
            chars |= set(CJK.findall(Path(path).read_text(encoding="utf8")))
    return chars


def main(sources: list[str]) -> None:
    chars = site_characters()
    unicodes = subset.parse_unicodes(PUNCTUATION) + [ord(c) for c in chars]
    for source in sources:
        weight = "bold" if "Bold" in source else "regular"
        family = (
            "lxgw-wenkai" if "WenKai" in source
            else "resource-han-rounded-sc" if "ResourceHanRounded" in source
            else "source-han-sans-sc" if "NotoSans" in source
            else "source-han-serif-sc"
        )
        options = subset.Options()
        options.flavor = "woff2"
        options.layout_features = ["*"]
        options.name_IDs = ["*"]
        options.notdef_outline = True
        font = subset.load_font(source, options)
        subsetter = subset.Subsetter(options)
        subsetter.populate(unicodes=unicodes)
        subsetter.subset(font)
        out = FONTS / f"notes-{family}-{weight}.woff2"
        subset.save_font(font, str(out), options)
        print(f"{out.name}: {out.stat().st_size // 1024} KB, {len(chars)} characters")
    (FONTS / "cjk-coverage.txt").write_text("".join(sorted(chars)) + "\n", encoding="utf8")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
