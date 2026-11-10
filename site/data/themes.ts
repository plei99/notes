import type { Theme } from "./types";

// The two themes, light and dark: the homepage's, one palette in two keys, the
// same Kelvin family as my terminal and editor. A faintly cool near-white (or a
// deep blue-black), blue for what can be followed and red for marks, so a link
// and a mark never share a colour. The dark key is pastel and the light key
// bold. Body text is at least 15:1 against the paper and muted text at least
// 6:1. This file is the single source: themes.css is generated from it and so
// is the picker in the masthead. The homepage has the same two, so a choice
// made on one site shows on the other.
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
    paper: "#f9fbfe",
    text: "#0e1826",
    muted: "#535b67",
    ink: "#d2132b",
    link: "#0655e6",
    rule: "#cbd0d8",
    stage: "#eef1f6",
  },
  {
    id: "dark",
    name: { en: "Dark", zh: "深色" },
    dark: true,
    paper: "#0b121b",
    text: "#e7ecf4",
    muted: "#a9b3c0",
    ink: "#ef7d83",
    link: "#77a6ff",
    rule: "#28313d",
    stage: "#161d27",
  },
];
