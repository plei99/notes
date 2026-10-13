// Filters on the index. Without JavaScript the form stays hidden and every note
// is listed.
//
// Each facet is a menu of checkboxes. Options within a facet widen the list
// (Columbia or UMass); facets narrow it (Columbia and courses). Each option's
// count is how many notes it would leave given the other facets, so a dead end
// shows as 0 before it is chosen. A value filed under another (enumerative
// geometry under algebraic geometry) is a choice inside that option: all of it,
// only those notes, or none of them. The state lives in the query string, so a
// filtered list can be linked to.
import { query } from "./dom.js";

type Mode = "all" | "only" | "none";
type Sub = { child: string; mode: Mode; group: HTMLElement };

const form = query(".filters", HTMLFormElement);
const entries = [...document.querySelectorAll<HTMLLIElement>(".entry")];
const facets = [
  ...form.querySelectorAll<HTMLDetailsElement>(".facet[data-facet]"),
];
const search = query("#q", HTMLInputElement, form);
const shown = query(".shown", HTMLSpanElement, form);
const clears = [...document.querySelectorAll<HTMLButtonElement>(".clear")];
const empty = query(".empty", HTMLParagraphElement);

const PARAM: Record<string, string> = {
  location: "location",
  type: "type",
  subjects: "subject",
};
const chosen: Record<string, Set<string>> = Object.fromEntries(
  facets.map((f) => [f.dataset.facet!, new Set<string>()]),
);

// parent value -> the value filed under it and which of its notes to show
const subs: Record<string, Sub> = Object.fromEntries(
  [...form.querySelectorAll<HTMLElement>(".suboptions")].map((group) => [
    group.dataset.parent!,
    { child: group.dataset.child!, mode: "all", group },
  ]),
);

function words() {
  return search.value.toLowerCase().split(/\s+/).filter(Boolean);
}

function has(
  entry: HTMLElement,
  key: string,
  value: string,
  mode: Mode = subs[value]?.mode ?? "all",
) {
  const values = (entry.dataset[key] ?? "").split(" ");
  if (!values.includes(value)) return false;
  if (mode === "all") return true;
  return values.includes(subs[value]!.child) === (mode === "only");
}

function matches(entry: HTMLElement, except?: string) {
  for (const [key, set] of Object.entries(chosen)) {
    if (key === except || set.size === 0) continue;
    if (![...set].some((v) => has(entry, key, v))) return false;
  }
  const text = entry.dataset.text ?? "";
  return words().every((w) => text.includes(w));
}

function count(pool: HTMLElement[], key: string, value: string, mode?: Mode) {
  return pool.filter((e) => has(e, key, value, mode)).length;
}

/** The option row an input sits in, and its parts. */
function row(input: HTMLInputElement) {
  const label = input.parentElement!;
  return {
    label,
    count: query(".count", HTMLSpanElement, label),
    name: query(".option-name", HTMLSpanElement, label),
  };
}

function render() {
  let total = 0;
  for (const entry of entries) {
    const on = matches(entry);
    entry.hidden = !on;
    if (on) total++;
  }
  for (const facet of facets) {
    const key = facet.dataset.facet!;
    const pool = entries.filter((e) => matches(e, key));
    const picked: string[] = [];
    for (
      const box of facet.querySelectorAll<HTMLInputElement>(
        "input[type=checkbox]",
      )
    ) {
      const value = box.value;
      const on = chosen[key]!.has(value);
      const n = count(pool, key, value);
      const parts = row(box);
      box.checked = on;
      parts.count.textContent = String(n);
      parts.label.classList.toggle("is-empty", n === 0 && !on);
      if (!on) continue;
      const sub = subs[value];
      picked.push(
        sub && sub.mode !== "all"
          ? query(`[value=${sub.mode}]`, HTMLInputElement, sub.group).dataset
            .summary!
          : parts.name.textContent ?? "",
      );
    }
    for (const sub of Object.values(subs)) {
      if (!facet.contains(sub.group)) continue;
      const parent = sub.group.dataset.parent!;
      for (const radio of sub.group.querySelectorAll("input")) {
        const n = count(pool, key, parent, radio.value as Mode);
        const parts = row(radio);
        radio.checked = chosen[key]!.has(parent) && sub.mode === radio.value;
        parts.count.textContent = String(n);
        parts.label.classList.toggle("is-empty", n === 0 && !radio.checked);
      }
    }
    const summary = query(".facet-value", HTMLSpanElement, facet);
    summary.textContent = picked.join(
      document.documentElement.lang === "zh-CN" ? "、" : ", ",
    ) || form.dataset.any!;
    summary.title = picked.join(", ");
    facet.classList.toggle("is-active", picked.length > 0);
  }
  const filtering = Object.values(chosen).some((s) => s.size) ||
    words().length > 0;
  shown.textContent =
    (filtering ? form.dataset.countSome! : form.dataset.countAll!)
      .replace("{shown}", String(total))
      .replace("{n}", String(entries.length));
  for (const button of clears) button.hidden = !filtering;
  empty.hidden = total > 0;
  save();
}

function save() {
  const params = new URLSearchParams();
  for (const [key, set] of Object.entries(chosen)) {
    if (set.size) params.set(PARAM[key]!, [...set].join(","));
  }
  for (const [parent, sub] of Object.entries(subs)) {
    if (sub.mode !== "all" && chosen.subjects?.has(parent)) {
      params.set(sub.child, sub.mode);
    }
  }
  if (search.value.trim()) params.set("q", search.value.trim());
  const query = params.toString();
  history.replaceState(null, "", query ? `?${query}` : location.pathname);
}

function load() {
  const params = new URLSearchParams(location.search);
  for (const [key, param] of Object.entries(PARAM)) {
    for (const v of (params.get(param) || "").split(",").filter(Boolean)) {
      chosen[key]?.add(v);
    }
  }
  for (const sub of Object.values(subs)) {
    const mode = params.get(sub.child);
    if (mode === "only" || mode === "none") sub.mode = mode;
  }
  search.value = params.get("q") || "";
}

form.addEventListener("change", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const facet = input.closest<HTMLElement>(".facet");
  if (!facet) return;
  const set = chosen[facet.dataset.facet!]!;
  if (input.type === "checkbox") {
    if (input.checked) set.add(input.value);
    else {
      set.delete(input.value);
      if (subs[input.value]) subs[input.value]!.mode = "all";
    }
  } else if (input.type === "radio") {
    const parent = input.closest<HTMLElement>(".suboptions")!.dataset.parent!;
    subs[parent]!.mode = input.value as Mode;
    set.add(parent);
  }
  render();
});

// One menu open at a time; a click elsewhere or Escape closes it.
for (const facet of facets) {
  facet.addEventListener("toggle", () => {
    if (!facet.open) return;
    for (const other of facets) if (other !== facet) other.open = false;
  });
}

document.addEventListener("click", (event) => {
  for (const facet of facets) {
    if (facet.open && !facet.contains(event.target as Node)) {
      facet.open = false;
    }
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const open = facets.find((f) => f.open);
  if (!open) return;
  open.open = false;
  query("summary", HTMLElement, open).focus();
});

search.addEventListener("input", render);
form.addEventListener("submit", (event) => event.preventDefault());

for (const button of clears) {
  button.addEventListener("click", () => {
    for (const set of Object.values(chosen)) set.clear();
    for (const sub of Object.values(subs)) sub.mode = "all";
    search.value = "";
    render();
  });
}

load();
render();
form.hidden = false;
