const toc = document.querySelector(".toc details");
const wide = matchMedia("(min-width: 64rem)");
function fit() {
  if (toc)
    toc.open = wide.matches;
}
fit();
wide.addEventListener("change", fit);
const root = document.documentElement;
const diagrams = document.querySelectorAll(".diagram[data-n]");
const fetched = {};
let shown = "pagella";
function pairing() {
  if (root.dataset.latin)
    return root.dataset.latin;
  return ["sans", "rounded"].includes(root.dataset.cjk ?? "") ? "lato" : "pagella";
}
async function redraw() {
  const want = pairing();
  if (want === shown || diagrams.length === 0)
    return;
  fetched[want] ??= fetch(`diagrams/${want}.json`).then((r) => r.ok ? r.json() : null).catch(() => null);
  const drawings = await fetched[want];
  if (!drawings || pairing() !== want)
    return;
  for (const span of diagrams) {
    const svg = drawings[span.dataset.n];
    if (svg)
      span.innerHTML = svg;
  }
  shown = want;
}
redraw();
new MutationObserver(redraw).observe(root, {
  attributes: true,
  attributeFilter: ["data-latin", "data-cjk"]
});
