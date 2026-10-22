import { expect, test } from "bun:test";
import { runInNewContext } from "node:vm";
import { diagramFont } from "../client/fonts";
import { inlineScript } from "../lib/inline";

test("font variants are limited to the three published diagram files", () => {
  for (const font of ["pagella", "garamond", "lato"] as const) {
    expect(diagramFont(font)).toBe(font);
  }
  for (
    const value of [
      "../../other-project/payload",
      "https://attacker.invalid/x",
      "__proto__",
      "constructor",
    ]
  ) {
    expect(diagramFont(value)).toBe("pagella");
  }
  expect(diagramFont(undefined, "rounded")).toBe("lato");
  expect(diagramFont(undefined, "serif")).toBe("pagella");
});

test("invalid saved fonts and malformed cookies leave preferences usable", async () => {
  const code = await inlineScript("preferences", { THEME_PAIRS: {} });
  const dataset: Record<string, string> = {};
  const window: { applyTheme?: () => void } = {};
  runInNewContext(code, {
    window,
    document: {
      cookie: "cjk=%E0%A4; theme=%",
      documentElement: { dataset },
    },
    localStorage: {
      getItem: (key: string) =>
        key === "latin" ? "../../other-project/payload" : null,
    },
    matchMedia: () => ({ matches: false }),
  });
  expect(dataset.latin).toBeUndefined();
  expect(dataset.cjk).toBeUndefined();
  expect(typeof window.applyTheme).toBe("function");
  expect(() => window.applyTheme!()).not.toThrow();
});

test("inline theme data cannot close its HTML script element", async () => {
  const theme = "</script><script>alert(1)</script>";
  const code = await inlineScript("preferences", {
    THEME_PAIRS: { [theme]: [0, "dark"] },
  });
  expect(code.toLowerCase()).not.toContain("</script");
  const dataset: Record<string, string> = {};
  runInNewContext(code, {
    window: {},
    document: { cookie: "", documentElement: { dataset } },
    localStorage: { getItem: (key: string) => key === "theme" ? theme : null },
    matchMedia: () => ({ matches: false }),
  });
  expect(dataset.theme).toBe(theme);
});
