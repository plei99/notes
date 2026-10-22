import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { noteBody, securePage } from "../lib/security";

test("the policy authorizes exact inline bytes and pins entry script integrity", () => {
  const code = '\nwindow.example = "allowed";\n';
  const inlineHash = `sha256-${
    createHash("sha256").update(code).digest("base64")
  }`;
  const entryHash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  const html = securePage(
    `<html><head><script>${code}</script><script type="module" src="/notes/js/note.js?v=1"></script></head><body></body></html>`,
    new Map([["/notes/js/note.js", entryHash]]),
  );
  let policy = "";
  const inlineScripts: string[] = [];
  let body = "";
  new HTMLRewriter()
    .on('meta[http-equiv="Content-Security-Policy"]', {
      element(el) {
        policy = el.getAttribute("content")!;
      },
    })
    .on("script", {
      element(el) {
        body = "";
        el.onEndTag(() => {
          inlineScripts.push(body);
        });
      },
      text(chunk) {
        body += chunk.text;
      },
    }).transform(html);
  expect(html).toStartWith(
    '<html><head><meta http-equiv="Content-Security-Policy"',
  );
  const scriptPolicy = policy.split(";").map((d) => d.trim()).find((d) =>
    d.startsWith("script-src ")
  )!;
  expect(scriptPolicy).toContain(`'${inlineHash}'`);
  for (const script of inlineScripts) {
    const hash = createHash("sha256").update(script).digest("base64");
    expect(scriptPolicy).toContain(`'sha256-${hash}'`);
  }
  expect(scriptPolicy).toContain("'strict-dynamic'");
  for (
    const unsafe of ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"]
  ) {
    expect(scriptPolicy).not.toContain(unsafe);
  }
  expect(policy).toContain("base-uri 'none'");
  expect(policy).toContain("script-src-attr 'none'");
  const loaded: { src: string; integrity: string; type: string }[] = [];
  const ready: (() => void)[] = [];
  for (const script of inlineScripts) {
    runInNewContext(script, {
      window: {},
      addEventListener(_name: string, listener: () => void) {
        ready.push(listener);
      },
      document: {
        createElement: () => ({}),
        head: { append: (entry: typeof loaded[number]) => loaded.push(entry) },
      },
    });
  }
  expect(loaded).toEqual([]);
  for (const listener of ready) listener();
  expect(loaded).toEqual([
    { src: "/notes/js/note.js?v=1", integrity: entryHash, type: "module" },
  ]);
});

test("the build refuses script entries outside the compiled client scripts", () => {
  for (
    const src of [
      "https://attacker.invalid/x.js",
      "/other-project/x.js",
      "data:text/javascript,alert(1)",
    ]
  ) {
    expect(() =>
      securePage(
        `<html><head><script type="module" src="${src}"></script></head></html>`,
        new Map(),
      )
    ).toThrow();
  }
});

test("note bodies cannot nominate scripts for the page policy to authorize", () => {
  const prose = "<p>Example: &lt;script&gt;</p><math><mi>x</mi></math>";
  expect(noteBody(prose, "example")).toBe(prose);
  for (
    const fragment of [
      "<script>alert(1)</script>",
      '<script type="module" src="/notes/js/note.js"></script>',
      "<svg><script>alert(1)</script></svg>",
    ]
  ) {
    expect(() => noteBody(fragment, "example")).toThrow();
  }
});
