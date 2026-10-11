// Filters on the index. Without JavaScript the form stays hidden and every note
// is listed.
//
// Options within a facet widen the list (Columbia or UMass); facets narrow it
// (Columbia and courses). Each option's count is how many notes it would leave
// given the other facets, so a dead end shows as 0 before it is chosen. The
// state lives in the query string, so a filtered list can be linked to.

const form = document.querySelector(".filters");
const entries = [...document.querySelectorAll(".entry")];
const facets = [...form.querySelectorAll(".facet[data-facet]")];
const search = form.querySelector("#q");
const shown = form.querySelector(".shown");
const clears = [...document.querySelectorAll(".clear")];
const empty = document.querySelector(".empty");

const PARAM = { location: "location", type: "type", subjects: "subject" };
const chosen = Object.fromEntries(facets.map((f) => [f.dataset.facet, new Set()]));

function words() {
  return search.value.toLowerCase().split(/\s+/).filter(Boolean);
}

function matches(entry, except) {
  for (const [key, set] of Object.entries(chosen)) {
    if (key === except || set.size === 0) continue;
    if (!entry.dataset[key].split(" ").some((v) => set.has(v))) return false;
  }
  return words().every((w) => entry.dataset.text.includes(w));
}

function render() {
  let count = 0;
  for (const entry of entries) {
    const on = matches(entry);
    entry.hidden = !on;
    if (on) count++;
  }
  for (const facet of facets) {
    const key = facet.dataset.facet;
    const pool = entries.filter((e) => matches(e, key));
    for (const button of facet.querySelectorAll(".option")) {
      const value = button.dataset.value;
      const n = pool.filter((e) => e.dataset[key].split(" ").includes(value)).length;
      button.querySelector(".count").textContent = n;
      button.setAttribute("aria-pressed", chosen[key].has(value));
      button.classList.toggle("is-empty", n === 0 && !chosen[key].has(value));
    }
  }
  const filtering = Object.values(chosen).some((s) => s.size) || words().length;
  shown.textContent = filtering
    ? `${count} of ${entries.length} notes`
    : `${entries.length} notes`;
  for (const button of clears) button.hidden = !filtering;
  empty.hidden = count > 0;
  save();
}

function save() {
  const params = new URLSearchParams();
  for (const [key, set] of Object.entries(chosen)) {
    if (set.size) params.set(PARAM[key], [...set].join(","));
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
  search.value = params.get("q") || "";
}

form.addEventListener("click", (event) => {
  const button = event.target.closest(".option");
  if (!button) return;
  const set = chosen[button.closest(".facet").dataset.facet];
  const value = button.dataset.value;
  if (set.has(value)) set.delete(value);
  else set.add(value);
  render();
});

search.addEventListener("input", render);
form.addEventListener("submit", (event) => event.preventDefault());

for (const button of clears) {
  button.addEventListener("click", () => {
    for (const set of Object.values(chosen)) set.clear();
    search.value = "";
    render();
  });
}

load();
render();
form.hidden = false;
