import {
  built,
  conjoin,
  type FacetValue,
  fill,
  key,
  type Lang,
  type Note,
  notes,
  pdf,
  type Site,
  site,
  ui,
  url,
} from "../lib/site";

type Facet = Site["facets"][number];

// Translations are listed under the notes they translate, not on their own.
const listed = notes.filter((n) => !n.translation_of);

const values = (note: Note, facet: Facet): FacetValue[] =>
  ([] as FacetValue[]).concat(note[facet.key]);

// A note's values in a facet, with each value filed `under` another followed by
// that one: enumerative geometry is algebraic geometry too.
const facetValues = (note: Note, facet: Facet) => [
  ...new Set(
    values(note, facet).flatMap((v) => {
      const broader = facet.under?.[v];
      return broader ? [broader, v] : [v];
    }),
  ),
];

// Each facet's options, most common first; values filed under another are
// offered inside it rather than on their own.
const facetOptions = Object.fromEntries(
  site.facets.map((f) => {
    const counts = new Map<FacetValue, number>();
    for (const note of listed) {
      for (const v of facetValues(note, f)) {
        if (!f.under?.[v]) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
    }
    return [
      f.key,
      [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    ];
  }),
);

/**
 * The index, in English or Chinese: `lang` picks the strings (data/ui.ts), the
 * names of the filter values, and each note's own `zh` title, description,
 * date and place.
 */
export default async function Index({ lang }: { lang: Lang }) {
  const t = ui[lang];
  const nm = (value: FacetValue | Facet["label"]) =>
    lang === "zh" ? site.zh_names[value] : value;
  const local = (note: Note) =>
    lang === "zh" && note.zh ? { ...note, ...note.zh } : note;
  const people = (list: string[]) =>
    lang === "zh" ? list.join("、") : conjoin(list);
  const pages = await built(notes);
  const pdfs = Object.fromEntries(
    await Promise.all(notes.map(async (n) => [n.slug, await pdf(n.source)])),
  );

  return (
    <>
      <header className="index-head">
        <h1>{t.title}</h1>
        <p className="lede">{t.lede}</p>
      </header>

      <form
        className="filters"
        role="search"
        aria-label={t.filter}
        hidden
        data-any={t.any}
        data-count-all={t.count_all}
        data-count-some={t.count_some}
      >
        <div className="filter-bar">
          {site.facets.map((facet) => (
            <details
              className="facet"
              data-facet={facet.key}
              key={facet.key}
            >
              <summary>
                <span className="facet-label">{nm(facet.label)}</span>{" "}
                <span className="facet-value">{t.any}</span>
              </summary>
              <div className="menu">
                {facetOptions[facet.key]!.map(([value, count]) => (
                  <Option
                    key={value}
                    facet={facet}
                    value={value}
                    count={count}
                    lang={lang}
                    nm={nm}
                  />
                ))}
              </div>
            </details>
          ))}
          <label className="visually-hidden" htmlFor="q">{t.search}</label>
          <input
            id="q"
            type="search"
            name="q"
            placeholder={t.search_placeholder}
            autoComplete="off"
          />
        </div>
        <p className="filter-status" aria-live="polite">
          <span className="shown">
            {fill(t.count_all, { n: listed.length })}
          </span>{" "}
          <button type="button" className="clear" hidden>{t.show_all}</button>
        </p>
      </form>

      <ol className="entries">
        {listed.map((original) => {
          const note = local(original);
          const file = pdfs[note.slug];
          const translations = notes.filter((n) =>
            n.translation_of === note.slug
          );
          const data = Object.fromEntries(
            site.facets.map((f) => [
              `data-${f.key}`,
              facetValues(original, f).map(key).join(" "),
            ]),
          );
          const text = [
            note.title,
            note.description,
            (note.lecturers ?? []).join(" "),
            note.place,
            original.title,
            original.place,
          ].join(" ").toLowerCase();
          return (
            <li className="entry" key={note.slug} {...data} data-text={text}>
              <p className="entry-when">{note.date}</p>
              <div>
                <h2 className="entry-title">
                  {pages.has(note.slug)
                    ? <a href={url(`/${note.slug}/`)}>{note.title}</a>
                    : file
                    ? <a href={file}>{note.title}</a>
                    : note.title}
                </h2>
                <p className="entry-where">
                  {note.lecturers?.length
                    ? people(note.lecturers) + (lang === "zh" ? "，" : ", ")
                    : ""}
                  {note.place}
                </p>
                {note.description && (
                  <p className="entry-body">{note.description}</p>
                )}
                {(file || translations.length > 0) && (
                  <p className="entry-links">
                    {file && <a href={file}>{t.pdf}</a>}
                    {translations.map((tr) => (
                      <a
                        key={tr.slug}
                        href={url(`/${tr.slug}/`)}
                        lang="zh-Hans"
                        hrefLang="zh-Hans"
                      >
                        {fill(t.translation, {
                          translator: tr.translator ?? "",
                        })}
                      </a>
                    ))}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="empty" hidden>
        {t.none}{" "}
        <button type="button" className="clear">{t.show_all_notes}</button>
      </p>
    </>
  );
}

/** A filter option, with the choices for a value filed under it. */
function Option({ facet, value, count, lang, nm }: {
  facet: Facet;
  value: FacetValue;
  count: number;
  lang: Lang;
  nm: (value: FacetValue) => string;
}) {
  const t = ui[lang];
  const children = (Object.keys(facet.under ?? {}) as FacetValue[]).filter((
    c,
  ) => facet.under![c] === value);
  return (
    <>
      <label className="option">
        <input type="checkbox" value={key(value)} />
        <span className="option-name">{nm(value)}</span>
        <span className="count">{count}</span>
      </label>
      {children.map((child) => {
        const name = `${key(value)}-${key(child)}`;
        return (
          <div
            key={child}
            className="suboptions"
            role="radiogroup"
            aria-label={`${nm(child)} / ${nm(value)}`}
            data-parent={key(value)}
            data-child={key(child)}
          >
            <label className="option">
              <input type="radio" name={name} value="all" />
              <span className="option-name">{t.all}</span>
              <span className="count" />
            </label>
            <label className="option">
              <input
                type="radio"
                name={name}
                value="only"
                data-summary={fill(t.summary_only, { child: nm(child) })}
              />
              <span className="option-name">
                {fill(t.only, { child: nm(child) })}
              </span>
              <span className="count" />
            </label>
            <label className="option">
              <input
                type="radio"
                name={name}
                value="none"
                data-summary={fill(t.summary_without, { value: nm(value) })}
              />
              <span className="option-name">
                {fill(t.without, { child: nm(child) })}
              </span>
              <span className="count" />
            </label>
          </div>
        );
      })}
    </>
  );
}
