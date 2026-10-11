"""Find the "diagram units" of a LaTeX document and rewrite the source around them.

A diagram is anything a browser cannot draw from TeX: tikz-cd, TikZ, Young
tableaux, Dynkin diagrams, spectral sequences. Each one is rendered by real
LaTeX into an SVG. The unit that gets rendered is the smallest self-contained
piece of source around the diagram: the whole display (or inline formula) when
the diagram sits inside mathematics, so that `X = \\{ <diagram> \\mid ... \\}`
keeps its surroundings, and otherwise the environment or command itself.

Two rewrites of the source come out of this:
  - the web source, where every unit is replaced by \\HtmlDiagram{n}{display},
    which tex4ht turns into a placeholder element;
  - the diagram source, where every unit is wrapped in a `preview` environment
    tagged with its number, so one LaTeX run yields one page per unit.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

MATH_ENVS = {
    f"{name}{star}"
    for name in ("equation", "align", "gather", "multline", "flalign", "alignat", "eqnarray", "displaymath", "math")
    for star in ("", "*")
}
DIAGRAM_ENVS = {"tikzcd", "tikzpicture", "ytableau", "dynkinDiagram", "sseqpage"}
# Command name -> number of mandatory arguments (optional [..] groups are always consumed).
DIAGRAM_COMMANDS = {"ydiagram": 1, "dynkin": 2, "printpage": 0, "tikz": None}
VERBATIM_ENVS = {"verbatim", "verbatim*", "lstlisting", "comment", "minted", "Verbatim"}
# Arguments that LaTeX writes to auxiliary files; a preview inside them would break.
MOVING_ARGUMENT_COMMANDS = {"caption", "section", "subsection", "subsubsection", "chapter", "title", "part", "paragraph"}

CONTROL = re.compile(r"\\([A-Za-z@]+\*?|.)", re.S)


def mask_comments(src: str) -> str:
    """Blank out comments and verbatim bodies, keeping every offset in place."""
    out = list(src)
    i, n = 0, len(src)
    while i < n:
        c = src[i]
        if c == "\\":
            m = re.compile(r"\\begin\{(" + "|".join(map(re.escape, VERBATIM_ENVS)) + r")\}").match(src, i)
            if m:
                end = src.find(f"\\end{{{m.group(1)}}}", m.end())
                end = n if end < 0 else end
                for k in range(m.end(), end):
                    if src[k] != "\n":
                        out[k] = " "
                i = end + 1
                continue
            i += 2
            continue
        if c == "%":
            j = src.find("\n", i)
            j = n if j < 0 else j
            for k in range(i, j):
                out[k] = " "
            i = j
            continue
        i += 1
    return "".join(out)


def skip_space(s: str, i: int) -> int:
    while i < len(s) and s[i] in " \t\n":
        i += 1
    return i


def group_end(s: str, i: int, open_: str = "{", close: str = "}") -> int:
    """Given s[i] == open_, return the index just past its matching close."""
    depth = 0
    j = i
    while j < len(s):
        c = s[j]
        if c == "\\":
            j += 2
            continue
        if c == open_:
            depth += 1
        elif c == close:
            depth -= 1
            if depth == 0:
                return j + 1
        j += 1
    return len(s)


def env_end(s: str, name: str, start: int) -> int:
    """Index just past the \\end{name} matching the \\begin{name} at start."""
    depth = 0
    pat = re.compile(r"\\(begin|end)\{" + re.escape(name) + r"\}")
    for m in pat.finditer(s, start):
        depth += 1 if m.group(1) == "begin" else -1
        if depth == 0:
            return m.end()
    return len(s)


@dataclass
class Span:
    start: int
    end: int
    display: bool = True


def math_spans(s: str) -> list[Span]:
    """Outermost mathematics regions of a comment-masked source."""
    spans: list[Span] = []
    i, n = 0, len(s)
    while i < n:
        c = s[i]
        if c == "$":
            display = s.startswith("$$", i)
            opener = 2 if display else 1
            j, depth = i + opener, 0
            while j < n:
                if s[j] == "\\":
                    j += 2
                    continue
                if s[j] == "{":
                    depth += 1
                elif s[j] == "}":
                    depth -= 1
                elif s[j] == "$" and depth <= 0:
                    break
                j += 1
            end = min(n, j + opener)
            spans.append(Span(i, end, display))
            i = end
            continue
        if c != "\\":
            i += 1
            continue
        m = CONTROL.match(s, i)
        tok = m.group(1)
        if tok in ("(", "["):
            closer = "\\)" if tok == "(" else "\\]"
            j, depth = m.end(), 0
            while j < n:
                if s.startswith(closer, j) and depth <= 0:
                    break
                if s[j] == "\\":
                    j += 2
                    continue
                if s[j] == "{":
                    depth += 1
                elif s[j] == "}":
                    depth -= 1
                j += 1
            end = min(n, j + 2)
            spans.append(Span(i, end, tok == "["))
            i = end
            continue
        if tok == "begin":
            em = re.compile(r"\\begin\{([^}]*)\}").match(s, i)
            if em and em.group(1) in MATH_ENVS:
                end = env_end(s, em.group(1), i)
                spans.append(Span(i, end, em.group(1) not in ("math",)))
                i = end
                continue
        i = m.end()
    return spans


def moving_argument_spans(s: str) -> list[Span]:
    spans = []
    for m in re.finditer(r"\\(" + "|".join(MOVING_ARGUMENT_COMMANDS) + r")\*?\s*(\[[^\]]*\])?\s*\{", s):
        spans.append(Span(m.end() - 1, group_end(s, m.end() - 1)))
    return spans


def command_end(s: str, name: str, i: int) -> int:
    """End of a diagram command starting at i (just after its name)."""
    end = i  # just past the last consumed group, so trailing space stays outside
    j = skip_space(s, i)
    while j < len(s) and s[j] == "[":
        end = group_end(s, j, "[", "]")
        j = skip_space(s, end)
    nargs = DIAGRAM_COMMANDS[name]
    if nargs is None:  # \tikz[opts]{...} or \tikz ... ;
        if j < len(s) and s[j] == "{":
            return group_end(s, j)
        k = s.find(";", j)
        return len(s) if k < 0 else k + 1
    for _ in range(nargs):
        j = skip_space(s, j)
        end = group_end(s, j) if j < len(s) and s[j] == "{" else j + 1  # \dynkin A4 takes single tokens
        j = end
    return end


def standalone(s: str, start: int, end: int) -> bool:
    """Whether a non-math unit sits on lines of its own (so it displays as a block)."""
    line_start = s.rfind("\n", 0, start) + 1
    before = s[line_start:start].strip()
    line_end = s.find("\n", end)
    after = s[end : len(s) if line_end < 0 else line_end].strip()
    return before in ("", "\\centering", "\\[") and after in ("", "\\]", "\\\\")


def find_units(src: str) -> list[Span]:
    """Diagram units of a document body, in source order, non-overlapping."""
    s = mask_comments(src)
    maths = math_spans(s)
    moving = moving_argument_spans(s)
    candidates: list[Span] = []
    trigger = re.compile(
        r"\\begin\{(" + "|".join(DIAGRAM_ENVS) + r")\}|\\(" + "|".join(DIAGRAM_COMMANDS) + r")(?![A-Za-z@])"
    )
    for m in trigger.finditer(s):
        if m.group(1):
            start, end = m.start(), env_end(s, m.group(1), m.start())
        else:
            start, end = m.start(), command_end(s, m.group(2), m.end())
        if any(a.start <= start < a.end for a in moving):
            continue
        outer = next((sp for sp in maths if sp.start <= start < sp.end), None)
        if outer:
            candidates.append(Span(outer.start, outer.end, outer.display))
        else:
            candidates.append(Span(start, end, standalone(s, start, end)))
    candidates.sort(key=lambda sp: (sp.start, -sp.end))
    units: list[Span] = []
    for sp in candidates:
        if units and sp.start < units[-1].end:  # inside (or the same as) the previous unit
            continue
        units.append(sp)
    return units


PLACEHOLDER_DEF = r"""
% --- added by site/build: diagram placeholders for the HTML conversion ---
\providecommand\HtmlDiagram[2]{\ifdefined\HCode\HCode{<span class="dg" data-n="#1" data-d="#2"></span>}\fi}
"""

PREVIEW_DEF = r"""
% --- added by site/build: one tightly cropped page per diagram unit ---
\usepackage[active,tightpage]{preview}
\setlength\PreviewBorder{0pt}
\providecommand\HtmlDiagramId[1]{\special{dvisvgm:raw <!--unit:#1-->}}
"""


def rewrite(src: str) -> tuple[str, str, list[Span]]:
    """Return (web source, diagram source, units) for a full LaTeX document."""
    begin = src.find("\\begin{document}")
    if begin < 0:
        raise ValueError("no \\begin{document}")
    preamble, body = src[:begin], src[begin:]
    units = find_units(body)

    web, diag, last = [], [], 0
    for n, u in enumerate(units, 1):
        web.append(body[last : u.start])
        diag.append(body[last : u.start])
        chunk = body[u.start : u.end]
        labels = "".join(re.findall(r"\\label\{[^}]*\}", mask_comments(chunk)))
        web.append(f"\\HtmlDiagram{{{n}}}{{{int(u.display)}}}{labels}")
        diag.append(f"\\begin{{preview}}\\HtmlDiagramId{{{n}}}{chunk}\\end{{preview}}")
        last = u.end
    web.append(body[last:])
    diag.append(body[last:])

    web_src = preamble + PLACEHOLDER_DEF + "".join(web)
    diag_src = "\\def\\pgfsysdriver{pgfsys-dvisvgm.def}\n" + preamble + PREVIEW_DEF + "".join(diag)
    return web_src, diag_src, units
