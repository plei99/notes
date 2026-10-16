// On a note page: the contents start open where they sit beside the text, and
// closed where they would push the text below the fold.
const toc = document.querySelector<HTMLDetailsElement>(".toc details");
const wide = matchMedia("(min-width: 64rem)");

function fit() {
  if (toc) toc.open = wide.matches;
}

fit();
wide.addEventListener("change", fit);

// Diagrams are drawings, made once per font pairing (build/fontvariants.py).
// The page carries the default pairing's; when the reader's pairing differs,
// its drawings are fetched from diagrams/<pairing>.json beside the page and
// swapped in, and again whenever the font picker changes. The effective
// pairing follows theme.ts: no Latin choice and a sans Chinese face mean Lato.
type Drawings = Record<string, string> | null;

const root = document.documentElement;
const diagrams = document.querySelectorAll<HTMLElement>(".diagram[data-n]");
const fetched: Record<string, Promise<Drawings>> = {};
let shown = "pagella";

function pairing() {
  if (root.dataset.latin) return root.dataset.latin;
  return ["sans", "rounded"].includes(root.dataset.cjk ?? "")
    ? "lato"
    : "pagella";
}

async function redraw() {
  const want = pairing();
  if (want === shown || diagrams.length === 0) return;
  fetched[want] ??= fetch(`diagrams/${want}.json`)
    .then((r) => (r.ok ? r.json() as Promise<Drawings> : null))
    .catch(() => null);
  const drawings = await fetched[want];
  if (!drawings || pairing() !== want) return;
  for (const span of diagrams) {
    const svg = drawings[span.dataset.n!];
    if (svg) span.innerHTML = svg;
  }
  shown = want;
}

redraw();
new MutationObserver(redraw).observe(root, {
  attributes: true,
  attributeFilter: ["data-latin", "data-cjk"],
});
