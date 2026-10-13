import type { Note } from "./types";

// Catalogue of Patrick Lei's notes (draft). One entry per .tex in plei99/notes,
// excluding UMass/s2019/math612/_region_.tex, misc/sichuan/notes-v2.tex,
// Patrick's own talks (talks/, seminars/*/talk*, seminars/INT/my_talk*), the
// other speakers' notes for single seminar talks (seminars/INT/*.tex besides
// notes.tex), misc/stacks_defn, seminars/FGA/notes.tex (the FGA notes are
// built from their armwrestling-free edition) and misc/simons/vincent/airy.tex
// (a chapter of the Simons 2022 notes).
// `zh` holds the title, description, date and place on the Chinese index
// (/zh/). The order is the index's; it began as the homepage's old notes page,
// whose text the entries listed there reuse. `sort` (YYYY-MM) is the date as a
// sortable value.
//
// ---------------------------------------------------------------------------
// Controlled vocabularies (filter values)
// ---------------------------------------------------------------------------
// location:
//   - Columbia            Columbia University (PhD, 2020-25)
//   - UMass Amherst       UMass Amherst (2018-20)
//   - Boston College      Boston College
//   - Simons Center       Simons Center for Geometry and Physics, Stony Brook
//   - Sichuan University  Sichuan University (Meishan campus)
//   - Online              Zoom, YouTube, Bilibili
//   - Other               one-off venues (Cornell conference, AGNES)
//
// type:
//   - course              semester-long university course
//   - seminar             learning/reading seminar with many speakers
//   - workshop            summer school, research program, or conference with
//                         several lecturers
//   - lecture series      minicourse by one lecturer (or one pair), incl. online
//                         video courses
//   - talk                single talk or short series by one speaker, outside a
//                         seminar
//   - expository          standalone expository note, not tied to an event
//   (beamer decks additionally carry `slides: true`)
//
// subjects:
//   - algebraic geometry
//   - enumerative geometry  filed under algebraic geometry in the filters
//                           (site.ts `under`), which can show all of it, only
//                           the enumerative notes, or none of them
//   - representation theory
//   - mathematical physics
//   - integrable systems
//   - symplectic geometry
//   - differential geometry
//   - topology            algebraic topology, homotopy theory, knot homology,
//                         low-dimensional topology
//   - number theory
//   - commutative algebra
//   - analysis
// ---------------------------------------------------------------------------

export const notes: Note[] = [
  {
    slug: "log-glsm",
    source: "misc/sichuan/notes.tex",
    title: "Log GLSM and related topics",
    description:
      'These are notes from the summer school "Log GLSM and advances in enumerative geometry" at Sichuan University, Meishan campus in July 2026.',
    date: "Summer 2026",
    sort: "2026-07",
    place: "Sichuan University",
    location: "Sichuan University",
    type: "workshop",
    subjects: ["enumerative geometry", "algebraic geometry"],
    zh: {
      title: "Log GLSM 及相关主题",
      description:
        "2026 年 7 月四川大学眉山校区暑期学校“Log GLSM and advances in enumerative geometry”的笔记。",
      date: "2026 年夏",
      place: "四川大学",
    },
  },
  {
    slug: "log-glsm-zh-claude",
    source: "misc/sichuan/notes-cn.tex",
    title: "对数 GLSM 及相关专题",
    description:
      "Chinese translation of the notes from the Log GLSM summer school at Sichuan University, translated by Claude.",
    date: "Summer 2026",
    sort: "2026-07",
    place: "Sichuan University",
    location: "Sichuan University",
    type: "workshop",
    subjects: ["enumerative geometry", "algebraic geometry"],
    lang: "zh",
    translation_of: "log-glsm",
    translator: "Claude",
  },
  {
    slug: "log-glsm-zh-codex",
    source: "misc/sichuan/notes-zh.tex",
    title: "对数 GLSM 及相关主题",
    description:
      "Chinese translation of the notes from the Log GLSM summer school at Sichuan University, translated by Codex.",
    date: "Summer 2026",
    sort: "2026-07",
    place: "Sichuan University",
    location: "Sichuan University",
    type: "workshop",
    subjects: ["enumerative geometry", "algebraic geometry"],
    lang: "zh",
    translation_of: "log-glsm",
    translator: "Codex",
  },
  {
    slug: "higher-genus-gw",
    source: "misc/simons25/hg.tex",
    title: "Higher genus GW theory",
    description:
      "What does it take to prove enumerative mirror symmetry for the quintic 3-fold in higher genus? Find out more about recent breakthroughs here.",
    date: "Jan 2025",
    sort: "2025-01",
    place: "Simons Center",
    location: "Simons Center",
    type: "workshop",
    subjects: [
      "enumerative geometry",
      "mathematical physics",
      "algebraic geometry",
    ],
    zh: {
      title: "高亏格 GW 理论",
      description:
        "要证明五次三维簇在高亏格下的计数镜像对称，需要些什么？这里介绍近年来的突破。",
      date: "2025 年 1 月",
      place: "Simons 中心",
    },
  },
  {
    slug: "blowup-formula",
    source: "seminars/blowup/BIR.tex",
    title: "Blowup formula in GW theory",
    description:
      "How do GW invariants change under birational transformations? Learn about Iritani's work on the subject here.",
    date: "Spring 2024",
    sort: "2024-01",
    place: "Columbia",
    location: "Columbia",
    type: "seminar",
    subjects: ["enumerative geometry", "algebraic geometry"],
    zh: {
      title: "GW 理论中的爆破公式",
      description:
        "GW 不变量在双有理变换下如何变化？这里介绍 Iritani 在这方面的工作。",
      date: "2024 年春",
      place: "哥伦比亚大学",
    },
  },
  {
    slug: "simons-workshop-2023",
    source: "misc/simons2/notes.tex",
    title: "Simons Summer Math Workshop 2023",
    lecturers: [
      "Brett Parker",
      "Bernd Siebert",
      "Danilo Lewanski",
      "Dimitri Zvonkine",
    ],
    description:
      "Covers log GW theory in both the algebraic and symplectic settings, topological recursion and the spin GW/Hurwitz correspondence, and Givental-Teleman reconstruction of semisimple CohFTs.",
    date: "Summer 2023",
    sort: "2023-07",
    place: "Simons Center",
    location: "Simons Center",
    type: "workshop",
    subjects: [
      "enumerative geometry",
      "symplectic geometry",
      "mathematical physics",
    ],
    zh: {
      title: "2023 年 Simons 暑期数学研讨班",
      description:
        "内容包括代数与辛两种框架下的 log GW 理论、拓扑递归与 spin GW/Hurwitz 对应，以及半单 CohFT 的 Givental-Teleman 重构。",
      date: "2023 年夏",
      place: "Simons 中心",
    },
  },
  {
    slug: "integrability-enumerative-quantization",
    source: "misc/simons/notes.tex",
    title: "Integrability, enumerative geometry, quantization",
    lecturers: [
      "Alexei Oblomkov",
      "Andrei Okounkov",
      "Paolo Rossi",
      "Alexandr Buryak",
      "Vincent Bouchard",
    ],
    description:
      "Covers enumerative geometry (GW/Hurwitz, GW/DT, quantum K-theory) and (quantum) integrable systems (KdV, W-constraints, etc).",
    date: "Summer 2022",
    sort: "2022-08",
    place: "Simons Center",
    location: "Simons Center",
    type: "workshop",
    subjects: [
      "enumerative geometry",
      "integrable systems",
      "mathematical physics",
    ],
    zh: {
      title: "可积性、计数几何与量子化",
      description:
        "内容包括计数几何（GW/Hurwitz、GW/DT、量子 K-理论）和（量子）可积系统（KdV、W-约束等）。",
      date: "2022 年夏",
      place: "Simons 中心",
    },
  },
  {
    slug: "resolution-of-singularities",
    source: "misc/agnes/temkin.tex",
    title: "New techniques in resolution of singularities",
    lecturers: ["Michael Temkin"],
    description:
      'Notes from Michael Temkin\'s AGNES talk. Covers the classical, logarithmic, and weighted ("dream") resolution algorithms and the general principles they share.',
    date: "Nov 2025",
    sort: "2025-11",
    place: "AGNES",
    location: "Other",
    type: "talk",
    subjects: ["algebraic geometry"],
    zh: {
      title: "奇点解消的新技术",
      description:
        "Michael Temkin 在 AGNES 的报告笔记，介绍经典、对数与加权（“梦想”）奇点解消算法，以及它们共同的一般原理。",
      date: "2025 年 11 月",
      place: "AGNES",
    },
  },
  {
    slug: "derived-categories-cornell",
    source: "misc/derivedfrg/notes.tex",
    title: "A note about derived categories",
    lecturers: ["Rachel Webb", "Tudor Pădurariu"],
    description:
      "Notes from the introductory talks at the Derived Categories and Moduli Spaces conference at Cornell. Covers reconstructing schemes from their derived categories and the Fourier-Mukai transform.",
    date: "Apr 2022",
    sort: "2022-04",
    place: "Cornell",
    location: "Other",
    type: "talk",
    subjects: ["algebraic geometry"],
    zh: {
      title: "关于导出范畴的笔记",
      description:
        "康奈尔大学“导出范畴与模空间”会议入门报告的笔记，内容包括由导出范畴重构概形以及 Fourier-Mukai 变换。",
      date: "2022 年 4 月",
      place: "康奈尔大学",
    },
  },
  {
    slug: "b-model",
    source: "misc/bmodel/bmodel.tex",
    title: "The B-model",
    lecturers: ["Si Li"],
    description:
      "We know that in genus zero this is period integrals, but what really is the B-model?",
    date: "Feb 2026",
    sort: "2026-02",
    place: "Bilibili",
    location: "Online",
    type: "lecture series",
    subjects: ["mathematical physics", "enumerative geometry"],
    zh: {
      title: "B-模型",
      description: "我们知道在亏格零时它就是周期积分，但 B-模型到底是什么？",
      date: "2026 年 2 月",
      place: "哔哩哔哩",
    },
  },
  {
    slug: "topological-cyclic-homology",
    source: "misc/TC/TC.tex",
    title: "Topological cyclic homology",
    lecturers: ["Thomas Nikolaus", "Achim Krause"],
    description:
      "Don't ask me why these notes exist as I am neither an arithmetic geometer nor a homotopy theorist.",
    date: "Spring 2025",
    sort: "2025-02",
    place: "YouTube",
    location: "Online",
    type: "lecture series",
    subjects: ["topology", "number theory"],
    zh: {
      title: "拓扑循环同调",
      description:
        "别问我为什么会有这份笔记，毕竟我既不是算术几何学家，也不是同伦论学家。",
      date: "2025 年春",
      place: "YouTube",
    },
  },
  {
    slug: "good-moduli-spaces",
    source: "BC/moduli/moduli.tex",
    title: "Good moduli spaces, positivity, and rationality",
    lecturers: ["Maksym Fedorchuk"],
    description:
      'When does an Artin stack admit a "reasonable" moduli space and when does this moduli space have nice properties (for example being (quasi-)projective, rational, etc)?',
    date: "Spring 2026",
    sort: "2026-01",
    place: "Boston College",
    location: "Boston College",
    type: "course",
    subjects: ["algebraic geometry"],
    zh: {
      title: "好模空间、正性与有理性",
      description:
        "Artin 叠何时有一个“合理”的模空间？这个模空间何时具有好的性质（例如（拟）射影、有理等）？",
      date: "2026 年春",
      place: "波士顿学院",
    },
  },
  {
    slug: "grt-universal-centralizers",
    source: "BC/grt/grt-topics.tex",
    title: "Geometric rep theory and universal centralizers",
    lecturers: ["Xin Jin"],
    description:
      "Covers the geometry of complex semisimple Lie groups (Springer theory, wonderful/toroidal compactifications) before moving on to universal centralizers (and their geometry, mirror symmetry, etc).",
    date: "Spring 2026",
    sort: "2026-01",
    place: "Boston College",
    location: "Boston College",
    type: "course",
    subjects: [
      "representation theory",
      "symplectic geometry",
      "integrable systems",
    ],
    zh: {
      title: "几何表示论与万有中心化子",
      description:
        "先讲复半单李群的几何（Springer 理论、wonderful 与 toroidal 紧化），再讲万有中心化子（及其几何、镜像对称等）。",
      date: "2026 年春",
      place: "波士顿学院",
    },
  },
  {
    slug: "moduli-hyperkahler",
    source: "Columbia/f2021/HK/notes.tex",
    title: "Moduli spaces and hyperkähler manifolds",
    lecturers: ["Giulia Saccà"],
    description:
      "Covers hyperkähler manifolds, their geometry, some constructions, and moduli spaces of sheaves on K3 surfaces.",
    date: "Fall 2021",
    sort: "2021-09",
    place: "Columbia",
    location: "Columbia",
    type: "course",
    subjects: ["algebraic geometry", "differential geometry"],
    zh: {
      title: "模空间与超凯勒流形",
      description:
        "内容包括超凯勒流形及其几何、若干构造，以及 K3 曲面上层的模空间。",
      date: "2021 年秋",
      place: "哥伦比亚大学",
    },
  },
  {
    slug: "minimal-model-program",
    source: "seminars/MMP/notes.tex",
    title: "Minimal Model Program",
    lecturers: ["Joaquín Moraga"],
    description:
      "Ever wondered how to classify algebraic varieties up to birational equivalence? The MMP is the answer! Covers the basics of the MMP and the MMP in dimension 3.",
    date: "Spring 2021",
    sort: "2021-01",
    place: "Zoom",
    location: "Online",
    type: "seminar",
    subjects: ["algebraic geometry"],
    zh: {
      title: "极小模型纲领",
      description:
        "想知道如何在双有理等价的意义下分类代数簇吗？MMP 就是答案！内容包括 MMP 的基础和三维情形的 MMP。",
      date: "2021 年春",
      place: "Zoom",
    },
  },
  {
    slug: "class-field-theory",
    source: "Columbia/s2021/NT/notes.tex",
    title: "Class field theory",
    lecturers: ["Chao Li"],
    description:
      "Covers local and global class field theory, including the proofs of the main theorems and some applications.",
    date: "Spring 2021",
    sort: "2021-01",
    place: "Columbia",
    location: "Columbia",
    type: "course",
    subjects: ["number theory"],
    zh: {
      title: "类域论",
      description: "内容包括局部与整体类域论、主要定理的证明以及一些应用。",
      date: "2021 年春",
      place: "哥伦比亚大学",
    },
  },
  {
    slug: "algebraic-topology-2",
    source: "Columbia/s2021/AT/notes.tex",
    title: "Algebraic topology II",
    lecturers: ["Francesco Lin"],
    description:
      "Covers spectral sequences and applications to homotopy groups of spheres, characteristic classes, K-theory, and the Atiyah-Singer index theorem.",
    date: "Spring 2021",
    sort: "2021-01",
    place: "Columbia",
    location: "Columbia",
    type: "course",
    subjects: ["topology", "differential geometry"],
    zh: {
      title: "代数拓扑 II",
      description:
        "内容包括谱序列及其在球面同伦群上的应用、示性类、K-理论和 Atiyah-Singer 指标定理。",
      date: "2021 年春",
      place: "哥伦比亚大学",
    },
  },
  {
    slug: "count-of-instantons",
    source: "Columbia/f2023/instantons/notes.tex",
    title: "The Count of Instantons",
    lecturers: ["Nikita Nekrasov"],
    description:
      "On the mathematics (representation theory, geometry, probability theory) and physics (gauge theory) of instanton counting. Notes partially taken by Davis Lazowski.",
    date: "2023-24",
    sort: "2023-09",
    place: "Columbia",
    location: "Columbia",
    type: "lecture series",
    subjects: [
      "mathematical physics",
      "representation theory",
      "integrable systems",
    ],
    zh: {
      title: "瞬子计数",
      description:
        "关于瞬子计数的数学（表示论、几何、概率论）与物理（规范场论）。部分笔记由 Davis Lazowski 记录。",
      date: "2023–24 学年",
      place: "哥伦比亚大学",
    },
  },
  {
    slug: "commutative-algebra",
    source: "Columbia/f2020/CA/notes.tex",
    title: "Commutative algebra",
    lecturers: ["Eric Urban"],
    description:
      "Covers the first part of Matsumura's Commutative Algebra with a focus on dimension theory.",
    date: "Fall 2020",
    sort: "2020-09",
    place: "Columbia",
    location: "Columbia",
    type: "course",
    subjects: ["commutative algebra", "algebraic geometry"],
    zh: {
      title: "交换代数",
      description: "内容为 Matsumura《交换代数》的第一部分，侧重维数理论。",
      date: "2020 年秋",
      place: "哥伦比亚大学",
    },
  },
  {
    slug: "informal-enumerative-geometry",
    source: "seminars/IEG/notes.tex",
    title: "Informal enumerative geometry seminar",
    description:
      "Covers a variety of topics in enumerative geometry, including GW theory, DT theory, and quantum K-theory and its relationship to geometric representation theory.",
    date: "Spring 2022",
    sort: "2022-02",
    place: "Columbia",
    location: "Columbia",
    type: "seminar",
    subjects: [
      "enumerative geometry",
      "representation theory",
      "algebraic geometry",
    ],
    zh: {
      title: "计数几何非正式讨论班",
      description:
        "涵盖计数几何中的多个主题，包括 GW 理论、DT 理论、量子 K-理论及其与几何表示论的关系。",
      date: "2022 年春",
      place: "哥伦比亚大学",
    },
  },
  {
    slug: "hyperbolicity",
    source: "seminars/HYP/notes.tex",
    title: "Hyperbolicity",
    description:
      "When is a variety hyperbolic? How many rational points does it have? How many rational curves lie on it? Find out here!",
    date: "Spring 2022",
    sort: "2022-02",
    place: "Columbia",
    location: "Columbia",
    type: "seminar",
    subjects: ["algebraic geometry", "number theory"],
    zh: {
      title: "双曲性",
      description:
        "一个簇何时是双曲的？它有多少有理点？上面有多少条有理曲线？答案在这里！",
      date: "2022 年春",
      place: "哥伦比亚大学",
    },
  },
  {
    slug: "d-modules-localization",
    source: "seminars/GRT/notes.tex",
    title: "D-modules and localization",
    lecturers: ["Fan Zhou", "Kevin Chang"],
    description:
      "What is a D-module and how do they appear in representation theory? Learn about the Beilinson-Bernstein localization theorem and the Kazhdan-Lusztig conjectures.",
    date: "Spring 2022",
    sort: "2022-02",
    place: "Columbia",
    location: "Columbia",
    type: "seminar",
    subjects: ["representation theory", "algebraic geometry"],
    zh: {
      title: "D-模与局部化",
      description:
        "什么是 D-模？它们如何出现在表示论中？这里介绍 Beilinson-Bernstein 局部化定理和 Kazhdan-Lusztig 猜想。",
      date: "2022 年春",
      place: "哥伦比亚大学",
    },
  },
  {
    slug: "hodge-theory",
    source: "seminars/HT/notes.tex",
    title: "Hodge theory",
    lecturers: ["Kevin Chang", "Caleb Ji"],
    description:
      "Covers the proof of the existence of mixed Hodge structures for smooth varieties and some applications.",
    date: "Fall 2021",
    sort: "2021-10",
    place: "Columbia",
    location: "Columbia",
    type: "seminar",
    subjects: ["algebraic geometry"],
    zh: {
      title: "Hodge 理论",
      description: "内容包括光滑簇上混合 Hodge 结构存在性的证明及一些应用。",
      date: "2021 年秋",
      place: "哥伦比亚大学",
    },
  },
  {
    slug: "deformation-theory",
    source: "seminars/DEF/notes.tex",
    title: "Deformation theory",
    description:
      "Covers how to deform schemes and sheaves, plus the moduli of stable curves and of coherent sheaves.",
    date: "Fall 2021",
    sort: "2021-09",
    place: "Columbia",
    location: "Columbia",
    type: "seminar",
    subjects: ["algebraic geometry"],
    zh: {
      title: "形变理论",
      description: "内容包括概形与层的形变，以及稳定曲线和凝聚层的模空间。",
      date: "2021 年秋",
      place: "哥伦比亚大学",
    },
  },
  {
    slug: "daha-knot-homology",
    source: "seminars/DAHA/notes.tex",
    title: "DAHA and knot homology",
    description:
      "What on earth is a double affine Hecke algebra? How does it relate to more familiar mathematics? Find out here!",
    date: "Fall 2021",
    sort: "2021-09",
    place: "Columbia",
    location: "Columbia",
    type: "seminar",
    subjects: ["representation theory", "topology", "enumerative geometry"],
    zh: {
      title: "DAHA 与纽结同调",
      description:
        "双仿射 Hecke 代数到底是什么？它和我们更熟悉的数学有什么联系？答案在这里！",
      date: "2021 年秋",
      place: "哥伦比亚大学",
    },
  },
  {
    slug: "category-o",
    source: "seminars/CO/notes.tex",
    title: "Category O",
    lecturers: ["Kevin Chang", "Fan Zhou", "Che Shen", "Patrick Lei"],
    description:
      "Covers the basic theory of category O for semisimple Lie algebras, including the Kazhdan-Lusztig conjectures.",
    date: "Fall 2021",
    sort: "2021-09",
    place: "Columbia",
    location: "Columbia",
    type: "seminar",
    subjects: ["representation theory"],
    zh: {
      title: "范畴 O",
      description:
        "内容为半单李代数的范畴 O 的基本理论，包括 Kazhdan-Lusztig 猜想。",
      date: "2021 年秋",
      place: "哥伦比亚大学",
    },
  },
  {
    slug: "intersection-theory",
    source: "seminars/INT/notes.tex",
    title: "Intersection theory",
    description:
      "Ever wondered what a Chow ring is? Or how to compute intersection numbers on moduli spaces? Find out here!",
    date: "Spring 2021",
    sort: "2021-01",
    place: "Columbia",
    location: "Columbia",
    type: "seminar",
    subjects: ["algebraic geometry", "enumerative geometry"],
    zh: {
      title: "相交理论",
      description:
        "想知道什么是周环吗？想知道怎样计算模空间上的相交数吗？答案在这里！",
      date: "2021 年春",
      place: "哥伦比亚大学",
    },
  },
  {
    slug: "schemes",
    source: "Columbia/s2021/AG/notes.tex",
    title: "Schemes",
    lecturers: ["Giulia Saccà"],
    description:
      "Covers schemes, sheaves, and cohomology, mostly following Hartshorne.",
    date: "Spring 2021",
    sort: "2021-01",
    place: "Columbia",
    location: "Columbia",
    type: "course",
    subjects: ["algebraic geometry"],
    zh: {
      title: "概形",
      description: "内容包括概形、层和上同调，基本按照 Hartshorne 的教材。",
      date: "2021 年春",
      place: "哥伦比亚大学",
    },
  },
  {
    slug: "lie-groups-2",
    source: "Columbia/s2021/RT/notes.tex",
    title: "Lie groups and representations II",
    lecturers: ["Andrei Okounkov"],
    description:
      "Covers invariant theory, Lie algebra cohomology, the cohomology of flag varieties, root systems, and Kac-Moody Lie algebras.",
    date: "Spring 2021",
    sort: "2021-01",
    place: "Columbia",
    location: "Columbia",
    type: "course",
    subjects: ["representation theory"],
    zh: {
      title: "李群与表示 II",
      description:
        "内容包括不变量理论、李代数上同调、旗簇的上同调、根系和 Kac-Moody 李代数。",
      date: "2021 年春",
      place: "哥伦比亚大学",
    },
  },
  {
    slug: "geometric-invariant-theory",
    source: "seminars/GIT/notes.tex",
    title: "Geometric invariant theory",
    description:
      "Covers the basics of reductive GIT and applications to moduli spaces of curves.",
    date: "Fall 2020",
    sort: "2020-09",
    place: "Columbia",
    location: "Columbia",
    type: "seminar",
    subjects: ["algebraic geometry", "symplectic geometry"],
    zh: {
      title: "几何不变量理论",
      description: "内容包括约化群 GIT 的基础及其在曲线模空间上的应用。",
      date: "2020 年秋",
      place: "哥伦比亚大学",
    },
  },
  {
    slug: "fga-explained",
    source: "seminars/FGA/no-armwestling/notes.tex",
    title: "FGA explained",
    lecturers: ["Caleb Ji"],
    description: "Ever wondered what Grothendieck meant in FGA? Find out here!",
    date: "Fall 2020",
    sort: "2020-10",
    place: "Columbia",
    location: "Columbia",
    type: "seminar",
    subjects: ["algebraic geometry"],
    zh: {
      title: "FGA 详解",
      description: "想知道 Grothendieck 在 FGA 里说的是什么吗？答案在这里！",
      date: "2020 年秋",
      place: "哥伦比亚大学",
    },
  },
  {
    slug: "lie-groups-1",
    source: "Columbia/f2020/RT/notes.tex",
    title: "Lie groups and representations I",
    lecturers: ["Andrei Okounkov"],
    description:
      "Covers the representation theory and classification of semisimple Lie groups.",
    date: "Fall 2020",
    sort: "2020-09",
    place: "Columbia",
    location: "Columbia",
    type: "course",
    subjects: ["representation theory"],
    zh: {
      title: "李群与表示 I",
      description: "内容包括半单李群的表示论与分类。",
      date: "2020 年秋",
      place: "哥伦比亚大学",
    },
  },
  {
    slug: "algebraic-topology-1",
    source: "Columbia/f2020/AT/notes.tex",
    title: "Algebraic topology I",
    lecturers: ["Mohammed Abouzaid"],
    description:
      "Covers homotopy groups, homology, cohomology, and Poincaré duality.",
    date: "Fall 2020",
    sort: "2020-09",
    place: "Columbia",
    location: "Columbia",
    type: "course",
    subjects: ["topology"],
    zh: {
      title: "代数拓扑 I",
      description: "内容包括同伦群、同调、上同调和 Poincaré 对偶。",
      date: "2020 年秋",
      place: "哥伦比亚大学",
    },
  },
  {
    slug: "singular-spaces",
    source: "UMass/s2020/math797d/notes.tex",
    title: "Singular spaces",
    lecturers: ["Paul Gunnells"],
    description:
      "What is a singularity? How can we measure how bad it is and study its geometry? Find out here!",
    date: "Spring 2020",
    sort: "2020-01",
    place: "UMass",
    location: "UMass Amherst",
    type: "course",
    subjects: ["topology", "algebraic geometry"],
    zh: {
      title: "奇异空间",
      description:
        "什么是奇点？怎样衡量它有多坏、又怎样研究它的几何？答案在这里！",
      date: "2020 年春",
      place: "马萨诸塞大学",
    },
  },
  {
    slug: "symplectic-topology",
    source: "UMass/s2020/math705/notes.tex",
    title: "Symplectic topology",
    lecturers: ["R. İnanç Baykur"],
    description:
      "Covers the basics of symplectic manifolds and some results in the topology of symplectic 4-manifolds.",
    date: "Spring 2020",
    sort: "2020-01",
    place: "UMass",
    location: "UMass Amherst",
    type: "course",
    subjects: ["symplectic geometry", "topology"],
    zh: {
      title: "辛拓扑",
      description: "内容包括辛流形的基础以及辛四维流形拓扑中的一些结果。",
      date: "2020 年春",
      place: "马萨诸塞大学",
    },
  },
  {
    slug: "lie-algebras",
    source: "UMass/f2019/math718/notes.tex",
    title: "Lie Algebras",
    lecturers: ["Eric Sommers"],
    description:
      "Covers the basic theory of Lie algebras and the classification and representation theory of semisimple Lie algebras.",
    date: "Fall 2019",
    sort: "2019-09",
    place: "UMass",
    location: "UMass Amherst",
    type: "course",
    subjects: ["representation theory"],
    zh: {
      title: "李代数",
      description: "内容包括李代数的基本理论，以及半单李代数的分类与表示论。",
      date: "2019 年秋",
      place: "马萨诸塞大学",
    },
  },
  {
    slug: "manifolds",
    source: "UMass/f2019/math703/notes.tex",
    title: "Manifolds",
    lecturers: ["Michael Sullivan"],
    description:
      "Covers the basic theory of smooth manifolds, differential forms, and de Rham cohomology.",
    date: "Fall 2019",
    sort: "2019-09",
    place: "UMass",
    location: "UMass Amherst",
    type: "course",
    subjects: ["differential geometry"],
    zh: {
      title: "流形",
      description: "内容包括光滑流形的基本理论、微分形式和 de Rham 上同调。",
      date: "2019 年秋",
      place: "马萨诸塞大学",
    },
  },
  {
    slug: "varieties",
    source: "UMass/s2019/math797w/notes.tex",
    title: "Varieties",
    lecturers: ["Jenia Tevelev"],
    description:
      "Covers the basic theory of algebraic varieties, including dimension, tangent spaces, and divisors.",
    date: "Spring 2019",
    sort: "2019-01",
    place: "UMass",
    location: "UMass Amherst",
    type: "course",
    subjects: ["algebraic geometry"],
    zh: {
      title: "代数簇",
      description: "内容包括代数簇的基本理论，如维数、切空间和除子。",
      date: "2019 年春",
      place: "马萨诸塞大学",
    },
  },
  {
    slug: "algebra-2",
    source: "UMass/s2019/math612/notes.tex",
    title: "Algebra II",
    lecturers: ["Paul Gunnells"],
    description: "Covers Galois theory and some basic commutative algebra.",
    date: "Spring 2019",
    sort: "2019-01",
    place: "UMass",
    location: "UMass Amherst",
    type: "course",
    subjects: ["commutative algebra"],
    zh: {
      title: "代数 II",
      description: "内容包括 Galois 理论和一些基础的交换代数。",
      date: "2019 年春",
      place: "马萨诸塞大学",
    },
  },
  {
    slug: "analysis-2",
    source: "UMass/s2019/math624/notes.tex",
    title: "Analysis II",
    lecturers: ["Robin Young"],
    description:
      "Covers Hilbert and Banach spaces, convergence and compactness in infinite dimensions, and Fourier theory.",
    date: "Spring 2019",
    sort: "2019-01",
    place: "UMass",
    location: "UMass Amherst",
    type: "course",
    subjects: ["analysis"],
    zh: {
      title: "分析 II",
      description:
        "内容包括 Hilbert 空间与 Banach 空间、无穷维中的收敛性与紧性，以及 Fourier 理论。",
      date: "2019 年春",
      place: "马萨诸塞大学",
    },
  },
  {
    slug: "representation-theory",
    source: "UMass/f2018/math797rt/notes.tex",
    title: "Representation theory",
    lecturers: ["Ivan Mirković"],
    description:
      "Covers the representation theory of finite groups, Springer theory in type A, and the representation theory and classification of SLn.",
    date: "Fall 2018",
    sort: "2018-09",
    place: "UMass",
    location: "UMass Amherst",
    type: "course",
    subjects: ["representation theory"],
    zh: {
      title: "表示论",
      description:
        "内容包括有限群的表示论、A 型的 Springer 理论，以及 SLn 的表示论与分类。",
      date: "2018 年秋",
      place: "马萨诸塞大学",
    },
  },
  {
    slug: "analysis-1",
    source: "UMass/f2018/math623/notes.tex",
    title: "Analysis I",
    lecturers: ["Robin Young"],
    description:
      "Covers measure theory, the Lebesgue integral, differentiation, and abstract measure theory.",
    date: "Fall 2018",
    sort: "2018-09",
    place: "UMass",
    location: "UMass Amherst",
    type: "course",
    subjects: ["analysis"],
    zh: {
      title: "分析 I",
      description: "内容包括测度论、Lebesgue 积分、微分和抽象测度论。",
      date: "2018 年秋",
      place: "马萨诸塞大学",
    },
  },
  {
    slug: "complex-analysis",
    source: "UMass/s2018/math621/notes.tex",
    title: "Complex analysis",
    lecturers: ["Paul Hacking"],
    description:
      "Covers the basic theory of holomorphic functions, elliptic functions, and the Riemann mapping theorem.",
    date: "Spring 2018",
    sort: "2018-01",
    place: "UMass",
    location: "UMass Amherst",
    type: "course",
    subjects: ["analysis"],
    zh: {
      title: "复分析",
      description: "内容包括全纯函数的基本理论、椭圆函数和 Riemann 映射定理。",
      date: "2018 年春",
      place: "马萨诸塞大学",
    },
  },
];

// ---------------------------------------------------------------------------
// Entries to double-check
// ---------------------------------------------------------------------------
// - resolution-of-singularities (misc/agnes/temkin): AGNES on Nov 21, 2025. The
//   host institution is not in the tex, so location is `Other`. Set it to the
//   host if AGNES was at Boston College.
// - derived-categories-cornell (misc/derivedfrg): Cornell conference in Apr 2022
//   (tex date Apr 29, 2022). Location `Other`; you may want a `Cornell` value.
// - fga-explained: built from the armwrestling-free edition
//   (seminars/FGA/no-armwestling); seminars/FGA/notes.tex is not listed.
// - hodge-theory: the tex names only "Kevin" and "Caleb". Kevin is assumed to be
//   Kevin Chang, the co-organizer of the CO and GRT seminars.
// - category-o / d-modules-localization: surnames (Kevin Chang, Fan Zhou,
//   Che Shen) are taken from the homepage seminar pages, not from the tex.
// - minimal-model-program: the title page says "Lectures by Joaquín Moraga". It
//   was a learning seminar, so it is typed `seminar`, not `lecture series`.
// - simons-workshop-2023: month is approximate (2023-07). The notes cover weeks 2
//   and 3 of the workshop, and the first commit is Aug 18, 2023.
// - topological-cyclic-homology: watched YouTube lectures, so `sort` is
//   approximate (2025-02, the first commit).
