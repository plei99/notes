import { type Lang, ui } from "../lib/site";

// The flowchart in Mermaid's syntax, in each language. client/how.ts draws it.
const chart: Record<Lang, string> = {
  en: `
flowchart TD
  tex["<b>LaTeX source</b><br>the .tex file, its macros and bibliography"]
  subgraph py ["build.py (Python), once per note"]
    find["<b>Find the diagrams</b><br>tikz-cd, TikZ, Young tableaux, …"]
    svg["<b>LaTeX + dvisvgm</b><br>each diagram drawn as an SVG,<br>once per font pairing"]
    t4ht["<b>tex4ht</b><br>sections, theorems, references,<br>footnotes, bibliography"]
    skel["HTML with each formula<br>still in TeX"]
    mj["<b>MathJax</b>, run by Bun<br>TeX → MathML,<br>with the note's own macros"]
    core["<b>mathml_core.py</b><br>MathML → MathML Core,<br>which browsers draw natively"]
    tidy["<b>Assemble and tidy</b><br>formulas and diagrams put back,<br>contents built, images copied"]
  end
  subgraph site ["Bun Bake + React, for the whole site"]
    react["<b>React components</b><br>layout, the index from notes.ts,<br>one page per note"]
    finish["<b>finish.ts</b><br>note text put in, themes.css,<br>scripts compiled, images copied"]
  end
  pub["<b>GitHub Pages</b><br>published from the gh-pages branch"]
  you["<b>Your browser</b><br>sets the math as text in your chosen font"]
  tex --> find
  find -- "diagrams" --> svg
  find -- "everything else,<br>diagrams as placeholders" --> t4ht
  t4ht --> skel
  skel -- "each formula" --> mj --> core --> tidy
  skel -- "the rest" --> tidy
  svg --> tidy
  tidy -- "contents" --> react
  tidy -- "note text, images, diagrams" --> finish
  react -- "static HTML" --> finish
  finish --> pub
  pub --> you
`,
  zh: `
flowchart TD
  tex["<b>LaTeX 源文件</b><br>.tex 文件及其宏定义与参考文献"]
  subgraph py ["build.py（Python），逐份笔记运行"]
    find["<b>找出图表</b><br>tikz-cd、TikZ、杨表等"]
    svg["<b>LaTeX + dvisvgm</b><br>每个图表画成 SVG，<br>每种字体搭配各一份"]
    t4ht["<b>tex4ht</b><br>章节、定理、交叉引用、<br>脚注、参考文献"]
    skel["HTML，公式仍为 TeX"]
    mj["<b>MathJax</b>，由 Bun 运行<br>TeX → MathML，<br>使用笔记自己的宏"]
    core["<b>mathml_core.py</b><br>MathML → MathML Core，<br>浏览器可直接绘制"]
    tidy["<b>组装与整理</b><br>放回公式和图表，<br>生成目录，复制图片"]
  end
  subgraph site ["Bun Bake + React，整个网站"]
    react["<b>React 组件</b><br>页面布局、来自 notes.ts 的索引、<br>每份笔记一页"]
    finish["<b>finish.ts</b><br>放入笔记正文、生成 themes.css、<br>编译脚本、复制图片"]
  end
  pub["<b>GitHub Pages</b><br>由 gh-pages 分支发布"]
  you["<b>你的浏览器</b><br>以你选择的字体将数学排成文字"]
  tex --> find
  find -- "图表" --> svg
  find -- "其余内容，<br>图表以占位符代替" --> t4ht
  t4ht --> skel
  skel -- "每个公式" --> mj --> core --> tidy
  skel -- "其余部分" --> tidy
  svg --> tidy
  tidy -- "目录" --> react
  tidy -- "笔记正文、图片、图表" --> finish
  react -- "静态 HTML" --> finish
  finish --> pub
  pub --> you
`,
};

/**
 * The colophon's "How the notes were converted to HTML": a dialog with a
 * flowchart of build/build.py and the site build. client/how.ts draws it when
 * the dialog opens, in the theme's colours and the page's font.
 */
export default function How({ lang }: { lang: Lang }) {
  const t = ui[lang];
  return (
    <dialog
      className="how"
      id="how"
      aria-labelledby="how-title"
      {...{ closedby: "any" }}
    >
      <header className="how-head">
        <h2 id="how-title">{t.how}</h2>
        <form method="dialog">
          <button className="how-close" aria-label={t.close}>×</button>
        </form>
      </header>
      <div className="how-chart" role="img" aria-label={t.how} />
      <p className="how-failed" hidden>{t.how_failed}</p>
      <script
        type="text/plain"
        className="how-source"
        dangerouslySetInnerHTML={{ __html: chart[lang] }}
      />
    </dialog>
  );
}
