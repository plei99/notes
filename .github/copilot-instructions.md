# AI Assistant Instructions for Mathematics Notes Repository

## Repository Overview
This is a personal mathematics notes repository containing LaTeX documents live-TeXed from graduate-level lectures in algebraic geometry, representation theory, topology, and related fields. Notes are organized by institution (BC, Columbia, UMass) and category (seminars, talks, docs, misc).

## LaTeX Document Structure

### Standard Preamble Pattern
All documents follow a consistent structure with custom macros. When creating or editing files:

1. **Document class**: Use `\documentclass{amsart}` for course notes, or `\documentclass{memoir}` for longer seminar notes
2. **Font setup**: Standard is Palatino (`mathpazo`) with Euler VM for math, Inconsolata for mono
3. **Required packages**: amsmath, amssymb, amsthm, mathtools, tikz, tikz-cd, hyperref, cleveref
4. **Theorem environments**: Use shared numbering `[thm]` for all theorem-style environments

### Custom Math Shortcuts (defined in every document)
Always use these consistent shortcuts when writing math:
- Blackboard bold: `\A` (𝔸), `\P` (ℙ), `\C` (ℂ), `\Z` (ℤ), `\Q` (ℚ), `\R` (ℝ), `\G` (𝔾), `\N` (ℕ), `\T` (𝕋)
- Calligraphic: `\mc{M}` for `\mathcal{M}`, use `\ol{}` for overline (e.g., `\ol{M}` for M̄)
- Fraktur: `\mf{g}` for `\mathfrak{g}`, pre-defined `\g`, `\h`, `\n`, `\b` for common Lie algebras
- Operators: `\on{PGL}` for `\operatorname{PGL}`, use `\DeclareMathOperator` for recurring operators
- Greek: `\ep` for ε, `\btau` for bold τ
- Delimiters: `\ab{...}` for automatic sizing with various bracket types (defined via `\DeclarePairedDelimiter`)

### Diagrams and Figures
- **Commutative diagrams**: Use `tikz-cd` package, not xymatrix
- **Complex figures**: TikZ diagrams are extensively used (see moduli.tex lines 285-350 for examples)
- **Labels**: Reference figures with `\Cref{fig:label}` (cleveref package)

## Build System

### Using Nix (recommended)
```bash
nix develop  # Enter development shell with full TeXLive
latexmk -pdf <file>.tex  # Build PDF
```

### Manual Build
The flake provides `texlive.combined.scheme-full`, so all packages are available. Files may have auxiliary files (.aux, .fls, .fdb_latexmk, .toc) committed for workflow reasons.

## File Organization Patterns

### Directory Structure
- **BC/**, **Columbia/**, **UMass/**: Course notes organized by institution and semester (f2020, s2021, etc.)
- **seminars/**: Learning seminars with extended notes (GRT, INT, FGA, etc.)
- **talks/**: Shorter documents for conference/seminar talks  
- **misc/**: Special topics (simons25, TC, stacks_defn)
- **docs/**: Reference documents (int, quantum, toric)

### Shared Resources
- `math.bib`: Central bibliography for all documents
- `essay.sty`: Lightweight style package (rarely used; most files inline their preambles)
- `macaulay2.sty`: Syntax highlighting for computational algebra code (usually commented out)

## Common Editing Patterns

### Adding New Lecture Content
When extending existing notes:
1. Maintain the established section hierarchy and theorem numbering
2. Use `\label{sec:...}` for sections, `\label{thm:...}`, `\label{fig:...}` for cross-references
3. Keep TikZ diagrams inline in the main .tex file (see moduli.tex for extensive examples)
4. Add bibliography entries to root-level `math.bib`, reference with `\cite{key}`

### Theorem Environments
Standard available environments (all share `[thm]` counter):
- **Statements**: `thm`, `prop`, `lem`, `cor`, `conj`, `quest`, `claim`
- **Definitions**: `defn`, `defns`, `con`, `exm`, `exms`, `notn`, `addm`, `exer`
- **Remarks**: `rmk`, `rmks`, `warn`, `sch`
- **Unnumbered**: Add `*` suffix (e.g., `thm*`, `defn*`, `rmk*`)

### Cross-File Dependencies
Most .tex files are self-contained with inlined preambles. There are no `\input` or `\include` chains. The central `math.bib` is the only shared dependency beyond style files.

## Mathematical Conventions

### Algebraic Geometry Specific
- Moduli spaces: `\Mbar_{g,n}` or `\ol{M}_{g,n}` for Deligne-Mumford compactification
- Stacks: Use `\sslash` for stacky quotients (e.g., `X \sslash G`)
- Schemes: `\Spec`, `\Proj` (defined as operators)
- Sheaves: Script O is `\mc{O}`, not `\mathcal{O}`

### Live-TeXing Context
These notes capture lectures in real-time, so:
- Occasional TODOs or exercises left incomplete are normal
- Some proofs may be sketched with "details left as exercise"
- Figures sometimes added after lecture (see `\label{fig:...}` references)
- Personal understanding annotations in remarks are common

## What NOT to Change
- Don't restructure the directory organization by institution/semester
- Don't consolidate preambles into shared style files (intentionally duplicated for independence)
- Don't "fix" commented-out auxiliary files in version control (part of workflow)
- Don't modernize to LuaTeX/XeTeX (repo uses pdfLaTeX conventions)
