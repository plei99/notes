// Fails when the site uses a CJK character that the notes' subsetted Chinese
// fonts do not contain. See build/subset-cjk.py. The notes themselves are
// checked as built, in generated/, when they are there.

const CJK = /[⺀-⿟　-〿぀-ヿ㐀-䶿一-鿿豈-﫿＀-￯]/gu;
// CJK punctuation is always in the subset, so it is not tracked in the list.
const PUNCTUATION = /[　-〿！-／：-＠［-｀｛-･]/u;

const covered = new Set(
  (await Bun.file("public/fonts/cjk-coverage.txt").text()).trim(),
);
const missing = new Set<string>();

const SOURCES = [
  "{data,pages,components,client,lib}/**/*.{ts,tsx}",
  "generated/*/_*.html",
];
for (const path of SOURCES.flatMap((p) => [...new Bun.Glob(p).scanSync()])) {
  const text = await Bun.file(path).text();
  for (const ch of text.match(CJK) ?? []) {
    if (!covered.has(ch) && !PUNCTUATION.test(ch)) missing.add(ch);
  }
}
if (missing.size) {
  console.error(
    `${missing.size} CJK character(s) are not in the subsetted font: ${
      [...missing].join("")
    }\nRerun build/subset-cjk.py (see its docstring).`,
  );
  process.exit(1);
}
console.log(`CJK font covers all ${covered.size} characters in use.`);
