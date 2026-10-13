// Apply saved preferences before first paint. Inlined into every page's head.
//
// Each preference is read from localStorage, or from the cookie of the same
// name (theme.ts writes both). With nothing saved the stylesheet uses its
// defaults. The theme follows the system setting: a saved theme is stored with
// the setting it was chosen under ("theme-system"), and once the setting
// differs a theme of the wrong brightness gives way to its counterpart. The
// saved choice itself is kept, so switching back restores it. theme.ts calls
// applyTheme again when the setting changes while a page is open.

/** Each theme's brightness (1 for dark) and its counterpart's id. */
declare const THEME_PAIRS: Record<string, [0 | 1, string]>;

function pref(key: string) {
  try {
    const value = localStorage.getItem(key);
    if (value) return value;
  } catch {
    // Storage blocked: fall through to the cookie.
  }
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + key + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[1]!) : "";
}

const root = document.documentElement;
for (const key of ["latin", "cjk"]) {
  const value = pref(key);
  if (value) root.dataset[key] = value;
}

const system = matchMedia("(prefers-color-scheme: dark)");
window.applyTheme = () => {
  let theme = pref("theme");
  const now = system.matches ? "dark" : "light";
  const pair = THEME_PAIRS[theme];
  if (
    pair && (pref("theme-system") || now) !== now &&
    !!pair[0] !== system.matches
  ) {
    theme = pair[1];
  }
  if (theme) root.dataset.theme = theme;
  else delete root.dataset.theme;
};
window.applyTheme();
