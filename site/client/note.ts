// On a note page: the contents start open where they sit beside the text, and
// closed where they would push the text below the fold.
const toc = document.querySelector<HTMLDetailsElement>(".toc details");
const wide = matchMedia("(min-width: 64rem)");

function fit() {
  if (toc) toc.open = wide.matches;
}

fit();
wide.addEventListener("change", fit);

// A formula, diagram or table wider than the column scrolls sideways in its own
// box (these are the boxes styles.css gives overflow-x: auto). None holds
// anything that takes focus, and not every browser makes such a box focusable
// by itself, so a keyboard could not reach what is scrolled out of view
// (WCAG 2.1.1). Each box that overflows takes focus, and gives it back when the
// column is wide enough again.
const scrollers = document.querySelectorAll<HTMLElement>(
  `.note-body :is(.eq, .diagram--display, table.ltx_equation, .ltx_eqn_scroll,
    .ltx_inline-block table.ltx_eqn_table, .ltx_td table.ltx_eqn_table,
    table.ltx_tabular.ltx_centering, .ltx_listing)`,
);

function reachable() {
  for (const box of scrollers) {
    const overflows = box.scrollWidth > box.clientWidth + 1;
    if (overflows && !box.hasAttribute("tabindex")) {
      box.tabIndex = 0;
      box.dataset.scrollFocus = "";
    } else if (!overflows && box.dataset.scrollFocus !== undefined) {
      box.removeAttribute("tabindex");
      delete box.dataset.scrollFocus;
    }
  }
}

let pending = 0;
const body = document.querySelector(".note-body");
if (body && scrollers.length) {
  // Widths change with the window, the zoom and the fonts as they load.
  new ResizeObserver(() => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(reachable);
  }).observe(body);
  document.fonts.ready.then(reachable);
}

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
