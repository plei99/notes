// The colophon's "How the notes were converted to HTML": a dialog with a
// Mermaid flowchart (_includes/how.vto). Mermaid is large and few readers open
// the dialog, so it is fetched on the first opening. The chart is drawn each
// time the dialog opens, in the theme's colours and the page's font as they
// are then; the theme cannot change while the dialog is open.
const MERMAID = "https://cdn.jsdelivr.net/npm/mermaid@11.17.2/dist/mermaid.esm.min.mjs";

const dialog = document.getElementById("how");
const opener = document.querySelector(".how-open");
const chart = dialog.querySelector(".how-chart");
const failed = dialog.querySelector(".how-failed");
const source = dialog.querySelector(".how-source").textContent;
let mermaid;
let drawn = 0;

// A theme role as #rrggbb. Mermaid computes its shades from these and reads
// only plain colours, while a role may be color-mix(), so each is painted
// onto a pixel and read back.
const pixel = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
const probe = document.createElement("span");

function role(name) {
  probe.style.color = `var(--${name})`;
  dialog.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  pixel.clearRect(0, 0, 1, 1);
  pixel.fillStyle = color;
  pixel.fillRect(0, 0, 1, 1);
  const [r, g, b] = pixel.getImageData(0, 0, 1, 1).data;
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

async function draw() {
  mermaid ??= import(MERMAID).then((m) => m.default);
  const m = await mermaid;
  const text = role("text");
  const paper = role("paper");
  m.initialize({
    startOnLoad: false,
    theme: "base",
    fontFamily: getComputedStyle(document.body).fontFamily,
    flowchart: {
      curve: "basis",
      padding: 12,
      wrappingWidth: 300,
      subGraphTitleMargin: { top: 6, bottom: 10 },
    },
    themeVariables: {
      darkMode: getComputedStyle(document.documentElement).colorScheme === "dark",
      background: paper,
      fontSize: "15px",
      primaryColor: paper,
      primaryTextColor: text,
      primaryBorderColor: text,
      lineColor: role("muted"),
      textColor: text,
      clusterBkg: role("stage"),
      clusterBorder: role("rule"),
      titleColor: role("muted"),
      edgeLabelBackground: paper,
    },
  });
  const { svg } = await m.render(`how-svg-${++drawn}`, source);
  chart.innerHTML = svg;
}

opener.addEventListener("click", () => {
  dialog.showModal();
  failed.hidden = true;
  draw().catch(() => {
    failed.hidden = false;
  });
});

// A click on the backdrop closes the dialog, where closedby="any" is not
// supported yet. The backdrop's clicks land on the dialog itself, as do those
// on its padding, so the point decides.
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  const inside = event.clientX >= box.left && event.clientX <= box.right &&
    event.clientY >= box.top && event.clientY <= box.bottom;
  if (!inside) dialog.close();
});
