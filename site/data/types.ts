// The shape of the site's data. Every interface string exists in both
// languages, and every filter value is one of the vocabularies below, so a
// missing translation or a mistyped value fails `bun check`.

export type Lang = "en" | "zh";
export type Localized<T = string> = Record<Lang, T>;

// ---- The catalogue (notes.ts) ----------------------------------------------

export type Location =
  | "Columbia"
  | "UMass Amherst"
  | "Boston College"
  | "Simons Center"
  | "Sichuan University"
  | "Online"
  | "Other";

export type NoteType =
  | "course"
  | "seminar"
  | "workshop"
  | "lecture series"
  | "talk"
  | "expository";

export type Subject =
  | "algebraic geometry"
  | "enumerative geometry"
  | "representation theory"
  | "mathematical physics"
  | "integrable systems"
  | "symplectic geometry"
  | "differential geometry"
  | "topology"
  | "number theory"
  | "commutative algebra"
  | "analysis";

/** The facets the index filters by. */
export type Facets = {
  location: Location;
  type: NoteType;
  subjects: Subject[];
};
export type FacetKey = keyof Facets;
export type FacetValue = Location | NoteType | Subject;

/** What the Chinese index shows instead of the English text. */
export type NoteZh = {
  title?: string;
  description?: string;
  date?: string;
  place?: string;
};

export type Note = Facets & {
  slug: string;
  /** The .tex file, from the repository root. */
  source: string;
  title: string;
  description?: string;
  /** As shown: "Spring 2024". */
  date: string;
  /** The date as a sortable YYYY-MM. */
  sort: string;
  place: string;
  lecturers?: string[];
  /** Set on notes not written in English. */
  lang?: "zh";
  /** The slug of the note this translates; listed under it on the index. */
  translation_of?: string;
  translator?: string;
  /**
   * For a machine translation picked from several: the judges' scores and
   * comments (.json, from the repository root), shown in a dialog on its page.
   */
  judging?: string;
  /** The slug of the note this is part of. */
  parent?: string;
  /** A beamer deck. */
  slides?: true;
  zh?: NoteZh;
};

// ---- The site (site.ts, ui.ts) ---------------------------------------------

export type Site = {
  name: string;
  homepage: string;
  repo: string;
  latin_fonts: {
    group: string;
    sans?: true;
    fonts: { id: string; name: string }[];
  }[];
  /** Who each type of note credits on its page; `credits` with several. */
  types: Record<NoteType, { credit: string; credits?: string }>;
  /** In the order shown. `under` files a value under a broader one. */
  facets: {
    key: FacetKey;
    label: FacetLabel;
    under?: Partial<Record<FacetValue, FacetValue>>;
  }[];
  /** The facets and their values on the Chinese index. */
  zh_names: Record<FacetLabel | FacetValue, string>;
};

export type FacetLabel = "Where" | "What" | "Subject";

export type UiKey =
  | "lang"
  | "title"
  | "lede"
  | "skip"
  | "theme"
  | "latin_font"
  | "cjk_font"
  | "cjk_serif"
  | "cjk_sans"
  | "cjk_rounded"
  | "cjk_kai"
  | "all_notes"
  | "homepage"
  | "source"
  | "filter"
  | "search"
  | "search_placeholder"
  | "any"
  | "count_all"
  | "count_some"
  | "show_all"
  | "none"
  | "show_all_notes"
  | "all"
  | "only"
  | "without"
  | "summary_only"
  | "summary_without"
  | "pdf"
  | "translation"
  | "switch"
  | "how"
  | "how_failed"
  | "close";
export type Ui = Localized<Record<UiKey, string>>;

// ---- Themes (themes.ts, the homepage's) -----------------------------------

export type ThemeRole = "paper" | "text" | "muted" | "ink" | "link" | "rule";
export type Theme =
  & { id: string; name: string; dark: boolean; stage?: string }
  & Record<ThemeRole, string>;
export type ThemeFamily = { family: string; themes: Theme[] };
