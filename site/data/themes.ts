import type { Theme } from "./types";

// The two themes, light and dark: the homepage's, one palette in two keys.
// Warm paper (or warm near-black), teal for what can be followed and
// terracotta for marks, so a link and a mark never share a colour. Body text is
// at least 13:1 against the paper and muted text at least 5:1. This file is
// the single source: themes.css is generated from it and so is the picker in
// the masthead. The homepage has the same two, so a choice made on one site
// shows on the other.
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
    paper: "#f6f1e7",
    text: "#2a2622",
    muted: "#6b6257",
    ink: "#b5462b",
    link: "#18666f",
    rule: "#cfc4b2",
    stage: "#ece5d7",
  },
  {
    id: "dark",
    name: { en: "Dark", zh: "深色" },
    dark: true,
    paper: "#1a1714",
    text: "#ede6da",
    muted: "#b1a797",
    ink: "#e8876a",
    link: "#82b8c7",
    rule: "#433b33",
    stage: "#2b251f",
  },
];
