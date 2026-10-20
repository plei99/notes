// A machine translation's "How it was made" (components/Judging.tsx): how the
// translation was picked, unit by unit, from several models' translations
// that the same models judged blind, with the scores, the judges' comments and
// the terminology. judging.json sits beside the page (scripts/finish.ts); it
// is fetched on the first opening. Colours are the theme's roles, so the
// charts follow the theme as it changes.
import { byId, query } from "./dom.js";

type Data = {
  models: { id: string; name: string; letter: string }[];
  /** `model` is the judge's own translation. */
  judges: { id: string; name: string; via: string; model: number }[];
  units: { id: string; title: string }[];
  criteria: { id: string; about: string }[];
  /** The model each unit was taken from. */
  chosen: number[];
  /** [judge, unit, model, ...one score per criterion, rank, comment] */
  rows: (number | string | null)[][];
  /** Each judge's summary of each unit, by unit and then judge. */
  summaries: string[][];
  /** English, use, do not use, and B (BananaSpace's) or C (chosen here). */
  terms: string[][];
};

type Score = {
  judge: number;
  unit: number;
  model: number;
  scores: (number | null)[];
  rank: number | null;
  comment: string;
};

const dialog = byId("judging", HTMLDialogElement);
const opener = query(".judging-open", HTMLButtonElement);
const body = query(".judging-body", HTMLDivElement, dialog);
const failed = query(".how-failed", HTMLParagraphElement, dialog);
let loaded: Promise<void> | undefined;

type Child = Node | string;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  ...children: Child[]
) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...children);
  return e;
}

const SVG = "http://www.w3.org/2000/svg";
function svgEl(tag: string, attrs: Record<string, string | number>) {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

function mean(xs: (number | null | undefined)[]) {
  const ys = xs.filter((x): x is number => typeof x === "number");
  return ys.length ? ys.reduce((s, x) => s + x, 0) / ys.length : null;
}

const WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];
const words = (n: number) => WORDS[n] ?? String(n);
const capital = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const criterion = (id: string) => (id === "latex" ? "LaTeX" : capital(id));
const fmt = (x: number | null) => (x === null ? "–" : x.toFixed(1));
const signed = (x: number) => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(1);

function list(items: string[]) {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

// A cell's colour on a ramp from the paper to the link colour, over the range
// of the values in its table.
function ramp(values: (number | null)[]) {
  const vs = values.filter((v): v is number => v !== null);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  return (cell: HTMLElement, v: number | null) => {
    if (v === null) return;
    const p = Math.round(6 + 80 * (hi > lo ? (v - lo) / (hi - lo) : 0.5));
    cell.style.background =
      `color-mix(in oklab, var(--link) ${p}%, var(--paper))`;
    cell.style.color = p >= 50 ? "var(--paper)" : "var(--text)";
  };
}

function render(d: Data) {
  const C = d.criteria.length;
  const overall = d.criteria.findIndex((c) => c.id === "overall");
  const R: Score[] = d.rows.map((r) => ({
    judge: r[0] as number,
    unit: r[1] as number,
    model: r[2] as number,
    scores: r.slice(3, 3 + C) as (number | null)[],
    rank: r[3 + C] as number | null,
    comment: (r[4 + C] as string) ?? "",
  }));
  const M = d.models.map((_, i) => i);
  const J = d.judges.map((_, i) => i);
  const U = d.units.map((_, i) => i);
  const name = (m: number) => d.models[m]!.name;
  const label = (m: number) => `${name(m)} (${d.models[m]!.letter})`;
  const unitName = (u: number) =>
    u === 0
      ? "Abstract"
      : `${u}. ${d.units[u]!.title.replace(/ \([^()]*\)$/, "")}`;

  const unitMean = (m: number, u: number, noSelf = false) =>
    mean(
      R.filter((r) =>
        r.model === m && r.unit === u &&
        !(noSelf && d.judges[r.judge]!.model === m)
      ).map((r) => r.scores[overall]),
    );
  const modelMean = (m: number, noSelf = false) =>
    mean(U.map((u) => unitMean(m, u, noSelf)));
  const judgeMean = (j: number, m: number) =>
    mean(
      R.filter((r) => r.judge === j && r.model === m).map((r) =>
        r.scores[overall]
      ),
    );
  const ranked = [...M].sort((a, b) => modelMean(b)! - modelMean(a)!);
  const selfGap = (j: number) => {
    const m = d.judges[j]!.model;
    const self = judgeMean(j, m);
    const others = mean(J.filter((k) => k !== j).map((k) => judgeMean(k, m)));
    return self === null || others === null ? null : self - others;
  };

  // ---- Tooltip, for the dots and cells ----
  const tip = el("div", { className: "judging-tip" });
  tip.hidden = true;
  function showTip(x: number, y: number, lines: string[]) {
    tip.replaceChildren(
      el("b", {}, lines[0]!),
      ...lines.slice(1).filter(Boolean).map((l) => el("div", {}, l)),
    );
    tip.hidden = false;
    tip.style.left = `${Math.min(x + 14, innerWidth - tip.offsetWidth - 8)}px`;
    tip.style.top = `${Math.min(y + 14, innerHeight - tip.offsetHeight - 8)}px`;
  }
  function tipOn(target: Element, lines: () => string[]) {
    target.addEventListener("pointermove", (e) => {
      const p = e as PointerEvent;
      showTip(p.clientX, p.clientY, lines());
    });
    target.addEventListener("pointerleave", () => (tip.hidden = true));
    target.addEventListener("focus", () => {
      const b = target.getBoundingClientRect();
      showTip(b.right - 14, b.bottom - 14, lines());
    });
    target.addEventListener("blur", () => (tip.hidden = true));
  }

  // ---- How it was made ----
  const byModel = new Map<number, number[]>();
  d.chosen.forEach((m, u) => byModel.set(m, [...(byModel.get(m) ?? []), u]));
  const most = [...byModel].sort((a, b) => b[1].length - a[1].length)[0]![0];
  const where = (us: number[]) =>
    list(us.map((u) => (u === 0 ? "the abstract" : `section ${u}`)));
  const picks = [...byModel].filter(([m]) => m !== most).map(([m, us]) =>
    `${where(us)} from ${name(m)}`
  );
  picks.push(`the rest from ${name(most)}`);
  const via = new Map<string, string[]>();
  for (const j of d.judges) via.set(j.via, [...(via.get(j.via) ?? []), j.name]);

  const intro = el(
    "div",
    { className: "judging-intro" },
    el(
      "p",
      {},
      `This is an experimental machine translation. ${
        capital(words(d.models.length))
      } models each translated the whole of the English notes: ${
        list(M.map(name))
      }. The translations were split into ${
        words(U.length)
      } units, the abstract and the ${
        words(U.length - 1)
      } sections, and their models' names were replaced by the letters A–${
        String.fromCharCode(64 + d.models.length)
      }.`,
    ),
    el(
      "p",
      {},
      `The same ${words(d.judges.length)} models then judged them blind: ${
        list([...via].map(([v, js]) => `${list(js)} in ${v}`))
      }. Each judge scored all ${
        words(d.models.length)
      } translations of every unit against the English source, from 1 to 10 on each criterion below, and ranked them.`,
    ),
    el(
      "dl",
      { className: "judging-criteria" },
      ...d.criteria.flatMap((c) => [
        el(
          "dt",
          {},
          criterion(c.id),
        ),
        el("dd", {}, c.about),
      ]),
    ),
    el(
      "p",
      {},
      `Each unit of this translation is the one with the highest mean overall score: ${
        list(picks)
      }. Last, its terms were made consistent with those of `,
      el("a", { href: "https://bananaspace.org/" }, "BananaSpace"),
      " (香蕉空间), such as 叠 for stack; the table is at the end.",
    ),
  );

  // ---- Headline numbers ----
  const gaps = mean(J.map(selfGap))!;
  const kpis = el(
    "div",
    { className: "judging-kpis" },
    ...([
      [
        "Top translator",
        name(ranked[0]!),
        `mean overall ${fmt(modelMean(ranked[0]!))}`,
      ],
      [
        "Runner-up",
        name(ranked[1]!),
        `mean overall ${fmt(modelMean(ranked[1]!))}`,
      ],
      [
        "Last place",
        name(ranked.at(-1)!),
        `mean overall ${fmt(modelMean(ranked.at(-1)!))}`,
      ],
      [
        "Self-preference",
        signed(gaps),
        "points a judge gave itself above the other judges, on average",
      ],
    ] as const).map(([k, v, s]) =>
      el(
        "div",
        { className: "judging-kpi" },
        el("div", { className: "k" }, k),
        el("div", { className: "v" }, v),
        el("div", { className: "s" }, s),
      )
    ),
  );

  // ---- Overall score by translator ----
  const bars = svgEl("svg", { class: "judging-bars", role: "img" });
  bars.setAttribute("aria-label", "Mean overall score per translator");
  let noSelf = false;
  function drawBars() {
    bars.replaceChildren();
    const W = bars.getBoundingClientRect().width || 640;
    const L = 130, Rr = 44, rowH = 32, top = 6, H = top + rowH * M.length + 26;
    bars.setAttribute("viewBox", `0 0 ${W} ${H}`);
    bars.setAttribute("height", String(H));
    const dots = M.flatMap((m) => J.map((j) => judgeMean(j, m) ?? 10));
    const lo = Math.max(0, Math.floor(Math.min(...dots) - 0.5));
    const X = (v: number) => L + ((v - lo) / (10 - lo)) * (W - L - Rr);
    for (let t = lo; t <= 10; t++) {
      bars.append(
        svgEl("line", {
          class: "tick",
          x1: X(t),
          x2: X(t),
          y1: top,
          y2: H - 22,
        }),
      );
      const tx = svgEl("text", { x: X(t), y: H - 6, "text-anchor": "middle" });
      tx.textContent = String(t);
      bars.append(tx);
    }
    const order = [...M].sort((a, b) =>
      modelMean(b, noSelf)! - modelMean(a, noSelf)!
    );
    order.forEach((m, i) => {
      const cy = top + i * rowH + rowH / 2;
      const v = modelMean(m, noSelf)!;
      const lab = svgEl("text", {
        class: "ink",
        x: L - 10,
        y: cy + 4,
        "text-anchor": "end",
      });
      lab.textContent = name(m);
      const val = svgEl("text", {
        class: "ink value",
        x: W - 4,
        y: cy + 4,
        "text-anchor": "end",
      });
      val.textContent = fmt(v);
      bars.append(
        lab,
        svgEl("rect", {
          class: "bar",
          x: X(lo),
          y: cy - 7,
          width: Math.max(0, X(v) - X(lo)),
          height: 14,
          rx: 3,
        }),
        val,
      );
      for (const j of J) {
        const self = d.judges[j]!.model === m;
        const jm = judgeMean(j, m);
        if (jm === null || (noSelf && self)) continue;
        const dot = svgEl("circle", {
          class: self ? "dot self" : "dot",
          cx: X(jm),
          cy,
          r: self ? 5 : 4,
        });
        const hit = svgEl("circle", {
          class: "hit",
          cx: X(jm),
          cy,
          r: 11,
          tabindex: 0,
        });
        tipOn(
          hit,
          () => [
            fmt(jm),
            `${d.judges[j]!.name} scoring ${name(m)}`,
            self ? "its own translation" : "",
          ],
        );
        bars.append(dot, hit);
      }
    });
  }
  const toggle = el("div", { className: "judging-toggle", role: "group" });
  toggle.setAttribute("aria-label", "Which judges");
  for (
    const [text, value] of [["All judges", false], [
      "Excluding self-judgments",
      true,
    ]] as const
  ) {
    const b = el("button", { type: "button" }, text);
    b.setAttribute("aria-pressed", String(value === noSelf));
    b.addEventListener("click", () => {
      noSelf = value;
      for (const o of toggle.children) {
        o.setAttribute("aria-pressed", String(o === b));
      }
      drawBars();
    });
    toggle.append(b);
  }

  // ---- Section by section ----
  const detail = el("div", { className: "judging-detail" });
  detail.append(
    el(
      "p",
      { className: "judging-note" },
      "Click a cell to read every judge's scores and comments on it.",
    ),
  );
  const sec = el("table", { className: "judging-grid judging-sections" });
  const head = sec.createTHead().insertRow();
  head.append(el("th", { className: "row", scope: "col" }, "Section"));
  for (const m of ranked) head.append(el("th", { scope: "col" }, label(m)));
  const paintSec = ramp(U.flatMap((u) => M.map((m) => unitMean(m, u))));
  const tb = sec.createTBody();
  for (const u of U) {
    const tr = tb.insertRow();
    tr.append(
      el(
        "th",
        { className: "row", scope: "row", title: d.units[u]!.title },
        unitName(u),
      ),
    );
    for (const m of ranked) {
      const v = unitMean(m, u);
      const td = el("td", { tabIndex: 0 }, fmt(v));
      if (d.chosen[u] === m) td.classList.add("chosen");
      paintSec(td, v);
      tipOn(
        td,
        () => [
          fmt(v),
          `${name(m)} · ${unitName(u)}`,
          d.chosen[u] === m ? "used in this translation" : "",
        ],
      );
      const open = () => {
        for (const c of sec.querySelectorAll("td.selected")) {
          c.classList.remove("selected");
        }
        td.classList.add("selected");
        showDetail(m, u);
      };
      td.addEventListener("click", open);
      td.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
      tr.append(td);
    }
  }
  function showDetail(m: number, u: number) {
    detail.replaceChildren(el("h4", {}, `${label(m)}: ${unitName(u)}`));
    for (
      const r of R.filter((r) => r.model === m && r.unit === u).sort((a, b) =>
        a.judge - b.judge
      )
    ) {
      const self = d.judges[r.judge]!.model === m;
      const scores = d.criteria.map((c, i) =>
        `${c.id === "latex" ? "LaTeX" : c.id} ${r.scores[i] ?? "–"}`
      ).join(" · ") +
        (r.rank ? ` · ranked ${r.rank} of ${M.length}` : "");
      detail.append(
        el(
          "div",
          { className: "judging-comment" },
          el(
            "div",
            { className: "j" },
            d.judges[r.judge]!.name + (self ? " (self)" : ""),
          ),
          el(
            "div",
            {},
            el("div", { className: "s" }, scores),
            el("div", {}, r.comment),
          ),
        ),
      );
    }
    const summaries = d.summaries[u]!;
    detail.append(
      el(
        "details",
        { className: "judging-summaries" },
        el(
          "summary",
          {},
          `What each judge said about all ${M.length} translations of this unit`,
        ),
        el(
          "p",
          { className: "judging-note" },
          `Translations are named by letter: ${
            list(M.map((x) => `${d.models[x]!.letter} is ${name(x)}`))
          }.`,
        ),
        ...J.map((j) =>
          el(
            "div",
            { className: "judging-comment" },
            el("div", { className: "j" }, d.judges[j]!.name),
            el("div", {}, summaries[j] ?? ""),
          )
        ),
      ),
    );
  }

  // ---- Who judged whom ----
  const who = el("table", { className: "judging-grid" });
  const wh = who.createTHead().insertRow();
  wh.append(
    el("th", { className: "row", scope: "col" }, "Judge ↓ translator →"),
  );
  for (const m of ranked) wh.append(el("th", { scope: "col" }, name(m)));
  wh.append(
    el("th", { scope: "col" }, "Judge's mean"),
    el("th", { scope: "col" }, "Self minus others"),
  );
  const paintWho = ramp(J.flatMap((j) => M.map((m) => judgeMean(j, m))));
  const wb = who.createTBody();
  for (const j of J) {
    const tr = wb.insertRow();
    tr.append(el("th", { className: "row", scope: "row" }, d.judges[j]!.name));
    for (const m of ranked) {
      const v = judgeMean(j, m);
      const td = el("td", { tabIndex: 0 }, fmt(v));
      if (d.judges[j]!.model === m) td.classList.add("self");
      paintWho(td, v);
      tipOn(
        td,
        () => [
          fmt(v),
          `${d.judges[j]!.name} scoring ${name(m)}`,
          d.judges[j]!.model === m ? "its own translation" : "",
        ],
      );
      tr.append(td);
    }
    const gap = selfGap(j);
    tr.append(
      el(
        "td",
        { className: "plain" },
        fmt(mean(R.filter((r) => r.judge === j).map((r) => r.scores[overall]))),
      ),
      el("td", { className: "plain strong" }, gap === null ? "–" : signed(gap)),
    );
  }

  // ---- By criterion ----
  const crit = el("table", { className: "judging-grid" });
  const ch = crit.createTHead().insertRow();
  ch.append(el("th", { className: "row", scope: "col" }, "Translator"));
  for (const c of d.criteria) {
    ch.append(
      el(
        "th",
        { scope: "col" },
        criterion(c.id),
      ),
    );
  }
  ch.append(el("th", { scope: "col" }, "Mean rank"));
  const critMean = (m: number, i: number) =>
    mean(R.filter((r) => r.model === m).map((r) => r.scores[i]));
  const paintCrit = ramp(
    M.flatMap((m) => d.criteria.map((_, i) => critMean(m, i))),
  );
  const cb = crit.createTBody();
  for (const m of ranked) {
    const tr = cb.insertRow();
    tr.append(el("th", { className: "row", scope: "row" }, name(m)));
    d.criteria.forEach((c, i) => {
      const v = critMean(m, i);
      const td = el("td", { tabIndex: 0 }, fmt(v));
      paintCrit(td, v);
      tipOn(td, () => [fmt(v), `${name(m)} · ${c.id}`]);
      tr.append(td);
    });
    tr.append(
      el(
        "td",
        { className: "plain" },
        fmt(mean(R.filter((r) => r.model === m).map((r) => r.rank))),
      ),
    );
  }

  // ---- Terminology ----
  const terms = el("table", { className: "judging-terms" });
  const th = terms.createTHead().insertRow();
  for (const h of ["English", "Used", "Not used", "From"]) {
    th.append(el("th", { scope: "col" }, h));
  }
  const tbt = terms.createTBody();
  for (const [en, use, avoid, from] of d.terms) {
    const tr = tbt.insertRow();
    tr.append(
      el("td", { lang: "en" }, en!),
      el("td", { lang: "zh-CN" }, use!),
      el("td", { lang: "zh-CN" }, avoid!),
      el("td", {}, from === "B" ? "BananaSpace" : "chosen here"),
    );
  }

  const section = (title: string, note: string, ...content: Node[]) =>
    el(
      "section",
      { className: "judging-card" },
      el("h3", {}, title),
      el("p", { className: "judging-note" }, note),
      ...content,
    );

  body.replaceChildren(
    intro,
    kpis,
    section(
      "Overall score by translator",
      "The bar is the mean overall score, averaged over the judges for each unit and then over the units. Each dot is one judge's average, so the spread shows how far the judges agree; the hollow dot is a judge scoring its own translation.",
      toggle,
      bars,
    ),
    section(
      "Section by section",
      "Each cell is the mean overall score that all the judges gave one translation of one unit; the outlined cell in each row is the one used here.",
      el("div", { className: "judging-scroll" }, sec),
      detail,
    ),
    section(
      "Who judged whom",
      "Each cell is one judge's mean overall score for one translator over all the units; outlined cells are a judge scoring its own translation. The last column is how much more generous each judge was to itself than the other judges were to the same translation.",
      el("div", { className: "judging-scroll" }, who),
    ),
    section(
      "By criterion",
      "The mean score on each criterion over all judges and units, and the mean rank each translator was given (1 is best).",
      el("div", { className: "judging-scroll" }, crit),
    ),
    section(
      "Terminology",
      "The terms made consistent after the translation was put together. Those marked BananaSpace are its own; the others it does not cover, and were chosen here only so the whole translation agrees with itself.",
      el("div", { className: "judging-scroll" }, terms),
    ),
    tip,
  );
  drawBars();
  addEventListener("resize", () => {
    if (dialog.open) drawBars();
  });
}

opener.addEventListener("click", () => {
  dialog.showModal();
  failed.hidden = true;
  loaded ??= fetch("judging.json")
    .then((r) => {
      if (!r.ok) throw new Error(`judging.json: ${r.status}`);
      return r.json() as Promise<Data>;
    })
    .then(render)
    .catch((error: unknown) => {
      loaded = undefined;
      failed.hidden = false;
      throw error;
    });
});

// A click on the backdrop closes the dialog, where closedby="any" is not
// supported yet, as in how.ts.
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  const inside = event.clientX >= box.left && event.clientX <= box.right &&
    event.clientY >= box.top && event.clientY <= box.bottom;
  if (!inside) dialog.close();
});
