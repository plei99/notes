export const latinFonts = ["pagella", "garamond", "lato"] as const;
export const cjkFonts = ["serif", "sans", "rounded", "wenkai"] as const;
export type LatinFont = typeof latinFonts[number];

// Saved preferences share an origin with other sites. They select a known
// font, never an arbitrary path to fetch and insert as a diagram.
export function diagramFont(latin?: string, cjk?: string): LatinFont {
  if (latinFonts.includes(latin as LatinFont)) return latin as LatinFont;
  return cjk === "sans" || cjk === "rounded" ? "lato" : "pagella";
}
