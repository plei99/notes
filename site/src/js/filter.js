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

const form = document.querySelector(".filters");
const entries = [...document.querySelectorAll(".entry")];
const facets = [...form.querySelectorAll(".facet[data-facet]")];
const search = form.querySelector("#q");
const shown = form.querySelector(".shown");
const clears = [...document.querySelectorAll(".clear")];
const empty = document.querySelector(".empty");

const PARAM = { location: "location", type: "type", subjects: "subject" };
const chosen = Object.fromEntries(facets.map((f) => [f.dataset.facet, new Set()]));

// parent value -> { child, mode: "all" | "only" | "none" }
const subs = Object.fromEntries(
  [...form.querySelectorAll(".suboptions")].map((group) => [
    group.dataset.parent,
    { child: group.dataset.child, mode: "all", group },
  ]),
);

function words() {
  return search.value.toLowerCase().split(/\s+/).filter(Boolean);
}

function has(entry, key, value, mode = subs[value]?.mode ?? "all") {
  const values = entry.dataset[key].split(" ");
  if (!values.includes(value)) return false;
  if (mode === "all") return true;
  return values.includes(subs[value].child) === (mode === "only");
}

function matches(entry, except) {
  for (const [key, set] of Object.entries(chosen)) {
    if (key === except || set.size === 0) continue;
    if (![...set].some((v) => has(entry, key, v))) return false;
  }
  return words().every((w) => entry.dataset.text.includes(w));
}

function count(pool, key, value, mode) {
  return pool.filter((e) => has(e, key, value, mode)).length;
}

function render() {
  let total = 0;
  for (const entry of entries) {
    const on = matches(entry);
    entry.hidden = !on;
    if (on) total++;
  }
  for (const facet of facets) {
    const key = facet.dataset.facet;
    const pool = entries.filter((e) => matches(e, key));
    const picked = [];
    for (const box of facet.querySelectorAll("input[type=checkbox]")) {
      const value = box.value;
      const on = chosen[key].has(value);
      const n = count(pool, key, value);
      box.checked = on;
      box.parentElement.querySelector(".count").textContent = n;
      box.parentElement.classList.toggle("is-empty", n === 0 && !on);
      if (!on) continue;
      const name = box.parentElement.querySelector(".option-name").textContent;
      const sub = subs[value];
      picked.push(
        sub && sub.mode !== "all"
          ? sub.group.querySelector(`[value=${sub.mode}]`).dataset.summary
          : name,
      );
    }
    for (const sub of Object.values(subs)) {
      if (!facet.contains(sub.group)) continue;
      const parent = sub.group.dataset.parent;
      for (const radio of sub.group.querySelectorAll("input")) {
        const n = count(pool, key, parent, radio.value);
        radio.checked = chosen[key].has(parent) && sub.mode === radio.value;
        radio.parentElement.querySelector(".count").textContent = n;
        radio.parentElement.classList.toggle("is-empty", n === 0 && !radio.checked);
      }
    }
    const summary = facet.querySelector(".facet-value");
    summary.textContent = picked.join(document.documentElement.lang === "zh-CN" ? "、" : ", ") || form.dataset.any;
    summary.title = picked.join(", ");
    facet.classList.toggle("is-active", picked.length > 0);
  }
  const filtering = Object.values(chosen).some((s) => s.size) || words().length;
  shown.textContent = (filtering ? form.dataset.countSome : form.dataset.countAll)
    .replace("{shown}", total)
    .replace("{n}", entries.length);
  for (const button of clears) button.hidden = !filtering;
  empty.hidden = total > 0;
  save();
}

function save() {
  const params = new URLSearchParams();
  for (const [key, set] of Object.entries(chosen)) {
    if (set.size) params.set(PARAM[key], [...set].join(","));
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
  const facet = input.closest(".facet");
  if (!facet) return;
  const set = chosen[facet.dataset.facet];
  if (input.type === "checkbox") {
    if (input.checked) set.add(input.value);
    else {
      set.delete(input.value);
      if (subs[input.value]) subs[input.value].mode = "all";
    }
  } else if (input.type === "radio") {
    const parent = input.closest(".suboptions").dataset.parent;
    subs[parent].mode = input.value;
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
    if (facet.open && !facet.contains(event.target)) facet.open = false;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const open = facets.find((f) => f.open);
  if (!open) return;
  open.open = false;
  open.querySelector("summary").focus();
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
