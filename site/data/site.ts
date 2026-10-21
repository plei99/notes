import type { Site } from "./types";

export const site: Site = {
  name: "Patrick Lei",
  homepage: "https://plei99.github.io/",
  repo: "https://github.com/plei99/notes",
  converter: "https://github.com/plei99/latexml-oxide",

  // The same font pairings as the homepage (data/site.ts there); `id` is the
  // data-latin value that styles.css and the homepage's fonts.css agree on.
  latin_fonts: [
    {
      group: "Serif",
      fonts: [
        { id: "pagella", name: "Pagella" },
        { id: "garamond", name: "Garamond" },
      ],
    },
    {
      group: "Sans",
      sans: true,
      fonts: [
        { id: "lato", name: "Lato" },
      ],
    },
  ],

  // Who each type of note credits, on its page. `credits` is used instead of
  // `credit` when a note has more than one lecturer.
  types: {
    course: { credit: "Lectures by" },
    seminar: { credit: "Talks by" },
    workshop: { credit: "Lectures by" },
    "lecture series": { credit: "Lectures by" },
    talk: { credit: "Talk by", credits: "Talks by" },
    expository: { credit: "By" },
  },

  // The facets the index filters by, in the order they are shown. `under` files
  // a value under another: its notes count as the broader one too, and choosing
  // the broader one offers all of it, only those notes, or none of them.
  facets: [
    { key: "location", label: "Where" },
    { key: "type", label: "What" },
    {
      key: "subjects",
      label: "Subject",
      under: { "enumerative geometry": "algebraic geometry" },
    },
  ],

  // The filter values in Chinese, by their English names in notes.ts.
  zh_names: {
    Where: "地点",
    What: "类型",
    Subject: "学科",
    Columbia: "哥伦比亚大学",
    "UMass Amherst": "马萨诸塞大学",
    "Boston College": "波士顿学院",
    "Simons Center": "Simons 中心",
    "Sichuan University": "四川大学",
    SCMS: "上海数学中心",
    Online: "线上",
    Other: "其他",
    course: "课程",
    seminar: "讨论班",
    workshop: "暑期学校与会议",
    "lecture series": "系列讲座",
    talk: "报告",
    expository: "讲义",
    "algebraic geometry": "代数几何",
    "enumerative geometry": "计数几何",
    "representation theory": "表示论",
    "mathematical physics": "数学物理",
    "integrable systems": "可积系统",
    "symplectic geometry": "辛几何",
    "differential geometry": "微分几何",
    topology: "拓扑",
    "number theory": "数论",
    "commutative algebra": "交换代数",
    analysis: "分析",
  },
};
