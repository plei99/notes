"""TeX-side help for MathJax: the preamble's macros, and rewrites of commands it lacks.

MathJax understands \\newcommand-style macros but not every package the notes
load. Macros are scraped from each preamble (and notes.sty where a note uses
it); shims.json covers package commands with a fixed expansion; and the
rewrites below handle the few commands whose expansion depends on what follows
them, which a MathJax macro cannot express.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

HERE = Path(__file__).parent
REPO = HERE.parent.parent
SHIMS = json.loads((HERE / "shims.json").read_text())


def strip_comments(s: str) -> str:
    return re.sub(r"(?<!\\)%.*", "", s)


def braced(s: str, i: int) -> tuple[str, int]:
    """Content and end of the balanced {...} group at s[i]."""
    if s[i] != "{":
        raise ValueError("expected {")
    depth = 0
    j = i
    while j < len(s):
        c = s[j]
        if c == "\\":
            j += 2
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return s[i + 1 : j], j + 1
        j += 1
    raise ValueError("unbalanced braces")


def scrape_macros(preamble: str) -> dict:
    """\\newcommand, \\DeclareMathOperator and \\DeclarePairedDelimiter definitions."""
    pre = strip_comments(preamble)
    if re.search(r"\\usepackage\{[./]*notes\}", pre):
        pre = strip_comments((REPO / "notes.sty").read_text()) + pre
    macros: dict = {}
    kinds = r"newcommand|renewcommand|providecommand|DeclareMathOperator|DeclarePairedDelimiter"
    for m in re.finditer(rf"\\({kinds})(\*?)", pre):
        kind, star = m.group(1), m.group(2)
        rest = pre[m.end() :].lstrip()
        try:
            if rest.startswith("{"):
                name, j = braced(rest, 0)
            else:
                name = re.match(r"\\[A-Za-z@]+|\\.", rest).group(0)
                j = len(name)
            name = name.strip().lstrip("\\")
            rest = rest[j:].lstrip()
            if kind == "DeclareMathOperator":
                body, _ = braced(rest, 0)
                macros[name] = ("\\operatorname*{%s}" if star else "\\operatorname{%s}") % body
            elif kind == "DeclarePairedDelimiter":
                left, j = braced(rest, 0)
                right, _ = braced(rest[j:].lstrip(), 0)
                # The starred form sizes automatically; the plain one is a fixed
                # size in LaTeX, but \left...\right reads closer than a guess.
                macros[name] = [f"\\left{left.strip()} #1 \\right{right.strip()}", 1]
            else:
                nargs = 0
                a = re.match(r"\[(\d)\]\s*", rest)
                if a:
                    nargs, rest = int(a.group(1)), rest[a.end() :]
                if rest.startswith("["):  # optional-argument default: not expressible as a MathJax macro
                    opt = re.match(r"\[([^\]]*)\]\s*", rest)
                    rest = rest[opt.end() :]
                    body, _ = braced(rest, 0)
                    macros[name] = [body, nargs, opt.group(1)]
                    continue
                body, _ = braced(rest, 0)
                if "\\ensuremath" in body:
                    body = re.sub(r"\\ensuremath\s*", "", body)
                macros[name] = [body, nargs] if nargs else body
        except (ValueError, AttributeError):
            continue
    # \accentset{\mbox{\Huge\bfseries .}}{#1}, a heavy dot accent, is \dot here.
    for k, v in macros.items():
        if not isinstance(v, str) and re.search(r"\\accentset\{\\mbox\{\\Huge", v[0]):
            macros[k] = ["\\dot{#1}", 1]
    # Package commands used inside a definition need the same rewrites as formulas.
    for k, v in macros.items():
        if isinstance(v, str):
            macros[k] = rewrite_math(v)
        else:
            v[0] = rewrite_math(v[0])
    return {**SHIMS, **macros}


# ---- Rewrites ----------------------------------------------------------------

OPENERS = [("\\{", "\\}"), ("\\|", "\\|"), ("\\langle", "\\rangle"), ("(", ")"), ("[", "]"), ("|", "|"), ("<", ">")]
TEXDELIM = {"<": "\\langle", ">": "\\rangle"}


def _match_close(tex: str, start: int, opener: str, closer: str) -> int:
    """Index of the closer balancing an opener whose content starts at `start`."""
    depth, brace, m = 0, 0, start
    while m < len(tex):
        if tex[m] == "{":
            brace += 1
        elif tex[m] == "}":
            brace -= 1
        elif brace == 0:
            if opener != closer and tex.startswith(opener, m):
                depth += 1
                m += len(opener)
                continue
            if tex.startswith(closer, m):
                if depth == 0:
                    return m
                depth -= 1
                m += len(closer)
                continue
        m += 2 if tex[m] == "\\" else 1
    return -1


def rewrite_ab(tex: str) -> str:
    """physics2's \\ab picks its delimiters from the next token: \\ab\\{x\\} -> \\left\\{x\\right\\}."""
    out, i = [], 0
    while (j := tex.find("\\ab", i)) != -1:
        k = j + 3
        if k < len(tex) and (tex[k].isalpha() or tex[k] == "@"):
            out.append(tex[i:k])
            i = k
            continue
        while k < len(tex) and tex[k] == " ":
            k += 1
        if tex.startswith("{", k):  # \ab{x}: a plain group, no delimiters
            group, end = braced(tex, k)
            out.append(f"{tex[i:j]}{{{rewrite_ab(group)}}}")
            i = end
            continue
        pair = next(((o, c) for o, c in OPENERS if tex.startswith(o, k)), None)
        if not pair:
            out.append(tex[i:k])
            i = k
            continue
        opener, closer = pair
        m = _match_close(tex, k + len(opener), opener, closer)
        if m < 0:
            out.append(tex[i:k])
            i = k
            continue
        inner = rewrite_ab(tex[k + len(opener) : m])
        left, right = TEXDELIM.get(opener, opener), TEXDELIM.get(closer, closer)
        out.append(f"{tex[i:j]}\\left{left} {inner} \\right{right} ")
        i = m + len(closer)
    out.append(tex[i:])
    return "".join(out)


def _groups(s: str) -> list[str]:
    """The top-level {..} groups of s, e.g. '{a}{b}' -> ['a', 'b']."""
    out, i = [], 0
    while i < len(s):
        if s[i] == "{":
            g, i = braced(s, i)
            out.append(g)
        else:
            i += 1
    return out


def _top_level_split(s: str, sep: str = ",") -> list[str]:
    parts, depth, cur = [], 0, []
    for c in s:
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
        if c == sep and depth == 0:
            parts.append("".join(cur))
            cur = []
        else:
            cur.append(c)
    parts.append("".join(cur))
    return parts


def _replace_command(tex: str, name: str, handler) -> str:
    """Replace \\name[opt]{arg} using handler(opt, arg) -> str."""
    pat = re.compile(r"\\" + name + r"(?![A-Za-z@])\s*")
    out, i = [], 0
    while (m := pat.search(tex, i)) :
        k, opt = m.end(), None
        if tex.startswith("[", k):
            e = tex.find("]", k)
            opt, k = tex[k + 1 : e], e + 1
        k = len(tex[:k]) + (len(tex[k:]) - len(tex[k:].lstrip()))
        if k >= len(tex) or tex[k] != "{":
            out.append(tex[i : m.end()])
            i = m.end()
            continue
        arg, end = braced(tex, k)
        out.append(tex[i : m.start()] + handler(opt, arg))
        i = end
    out.append(tex[i:])
    return "".join(out)


def _stack(_opt, arg):  # stackengine's \Centerstack{{a}{b}} / \Vectorstack
    rows = _groups(arg) or [arg]
    # stackengine stacks text unless \stackMath is on; rows of words are text.
    textual = re.compile(r"\\\(|\$|(?<![\\A-Za-z])[A-Za-z]{3,}\s+[A-Za-z]{2,}")
    rows = [f"\\text{{{r}}}" if textual.search(r) else r for r in rows]
    return "\\begin{matrix}" + "\\\\".join(rows) + "\\end{matrix}"


def _diagmat(env):  # physics2's \diagmat[opts]{a, b, c}
    def handler(_opt, arg):
        entries = [e.strip() for e in _top_level_split(arg)]
        n = len(entries)
        rows = ["&" * i + e + "&" * (n - 1 - i) for i, e in enumerate(entries)]
        return f"\\begin{{{env}}}" + "\\\\".join(rows) + f"\\end{{{env}}}"

    return handler


def _leftindex(tex: str) -> str:
    """leftindex's \\leftindex[sub]^{sup}{body} -> mathtools' \\prescript{sup}{sub}{body}."""
    pat = re.compile(r"\\leftindex(?![A-Za-z])\s*")
    while (m := pat.search(tex)) :
        k, sub, sup = m.end(), "", ""
        if tex.startswith("[", k):
            e = tex.find("]", k)
            sub, k = tex[k + 1 : e], e + 1
        if tex.startswith("^", k):
            k += 1
            if tex.startswith("{", k):
                sup, k = braced(tex, k)
            else:
                sup, k = tex[k], k + 1
        k = k + (len(tex[k:]) - len(tex[k:].lstrip()))
        if tex.startswith("{", k):
            body, k = braced(tex, k)
        else:
            tok = re.match(r"\\[A-Za-z]+|.", tex[k:]).group(0)
            body, k = tok, k + len(tok)
        tex = tex[: m.start()] + f"\\prescript{{{sup}}}{{{sub}}}{{{body}}}" + tex[k:]
    return tex


def rewrite_math(tex: str) -> str:
    """Apply every rewrite to one formula's TeX source."""
    tex = rewrite_ab(tex)
    # physics' \dd takes the next token as its argument (\dd x); the notes also use
    # it as an operator (\dd^{-1}, \dd \overline{z}), which MathJax rejects.
    tex = re.sub(r"\\dd(?![A-Za-z@])\s*(?=[\^_\\]|$)", r"\\mathrm{d}", tex)
    for name in ("Centerstack", "Vectorstack", "Longstack", "Shortstack"):
        if "\\" + name in tex:
            tex = _replace_command(tex, name, _stack)
    for name, env in (("pdiagmat", "pmatrix"), ("bdiagmat", "bmatrix"), ("diagmat", "matrix")):
        if "\\" + name in tex:
            tex = _replace_command(tex, name, _diagmat(env))
    if "\\leftindex" in tex:
        tex = _leftindex(tex)
    # A row that starts with [ is not \\[<dimension>] spacing: \\{}[h, e] = ...
    tex = re.sub(r"\\\\(?=\s*\[(?!\s*-?[\d.]+\s*(pt|em|ex|mm|cm|in|mu|bp)\s*\]))", r"\\\\{}", tex)
    return tex
