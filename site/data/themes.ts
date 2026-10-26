import type { Theme } from "./types";

// The two themes, light and dark: Modus Operandi and Modus Vivendi from
// Protesilaos Stavrou's Modus themes, built for at least 7:1 contrast. This
// file is the single source: themes.css is generated from it and so is the
// picker in the masthead. The homepage has the same two, so a choice made on
// one site shows on the other.
//
// Each theme gives the page's colour roles:
//   paper  background             ink    marked points and cycles in the figure
//   text   text and outlines      link   words that can be followed
//   muted  dates, ledes           rule   hairlines
//   stage  raised surfaces, such as the globe's backdrop (optional; when absent
//          it is the paper colour nudged toward the text colour)
// `dark: true` sets color-scheme, so scrollbars and form controls follow.
// `link` colours link text and `ink` the focus outline and the filter's tick,
// so both clear 4.5:1 on the paper as well (WCAG 1.4.3, 1.4.11).
//
// Visitors who have not chosen get light or dark by system setting.
export const themes: Theme[] = [
  {
    id: "light",
    name: { en: "Light", zh: "浅色" },
    dark: false,
    paper: "#ffffff",
    text: "#000000",
    muted: "#595959",
    ink: "#3548cf",
    link: "#3548cf",
    rule: "#c4c4c4",
    stage: "#f2f2f2",
  },
  {
    id: "dark",
    name: { en: "Dark", zh: "深色" },
    dark: true,
    paper: "#000000",
    text: "#ffffff",
    muted: "#989898",
    ink: "#2fafff",
    link: "#79a8ff",
    rule: "#535353",
    stage: "#1e1e1e",
  },
];
