import { query } from "./dom.js";
const root = document.documentElement;
const picker = query(".scheme", HTMLLabelElement);
const select = query("select", HTMLSelectElement, picker);
const system = matchMedia("(prefers-color-scheme: dark)");
const YEAR = 60 * 60 * 24 * 365;
function store(key, value) {
  try {
    if (value)
      localStorage.setItem(key, value);
    else
      localStorage.removeItem(key);
  } catch {}
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${key}=${encodeURIComponent(value || "")}; Max-Age=${value ? YEAR : 0}; Path=/; SameSite=Lax${secure}`;
}
function recorded() {
  try {
    if (localStorage.getItem("theme-system"))
      return true;
  } catch {}
  return /(?:^|; )theme-system=[^;]/.test(document.cookie);
}
function mode() {
  return system.matches ? "dark" : "light";
}
function save(value) {
  store("theme", value);
  store("theme-system", value && mode());
  try {
    localStorage.removeItem("scheme");
  } catch {}
}
function showCurrent() {
  select.value = root.dataset.theme || (system.matches ? select.dataset.defaultDark : select.dataset.defaultLight) || "";
}
select.addEventListener("change", () => {
  root.dataset.theme = select.value;
  save(select.value);
});
showCurrent();
if (select.selectedIndex < 0) {
  delete root.dataset.theme;
  save("");
  showCurrent();
} else if (root.dataset.theme && !recorded()) {
  store("theme-system", mode());
}
system.addEventListener("change", () => {
  window.applyTheme();
  showCurrent();
});
picker.hidden = false;
const SANS_LATIN = ["lato"];
const SANS_CJK = ["sans", "rounded"];
const pickers = {};
function effective(attr) {
  const chosen = root.dataset[attr];
  if (chosen)
    return chosen;
  if (attr === "latin") {
    return SANS_CJK.includes(root.dataset.cjk ?? "") ? "lato" : "pagella";
  }
  return SANS_LATIN.includes(root.dataset.latin ?? "") ? "sans" : "serif";
}
function showEffective() {
  for (const [attr, select] of Object.entries(pickers)) {
    select.value = effective(attr);
  }
}
function fontPicker(selector, attr) {
  const picker = document.querySelector(selector);
  if (!picker)
    return;
  const select = query("select", HTMLSelectElement, picker);
  pickers[attr] = select;
  const saved = root.dataset[attr];
  if (saved) {
    select.value = saved;
    if (select.selectedIndex < 0) {
      delete root.dataset[attr];
      store(attr, "");
    }
  }
  select.addEventListener("change", () => {
    root.dataset[attr] = select.value;
    store(attr, select.value);
    showEffective();
  });
  picker.hidden = false;
}
fontPicker(".latin", "latin");
fontPicker(".cjk", "cjk");
showEffective();
