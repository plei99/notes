import {
  conjoin,
  type Lang,
  type Note as NoteData,
  notes,
  pdf,
  site,
  ui,
  url,
} from "../lib/site";
import Judging from "./Judging";

/** A note's page: its header, the contents and the text from build/build.py. */
export default async function Note(
  { note, lang, toc }: { note: NoteData; lang: Lang; toc: string },
) {
  const t = ui[lang];
  const type = site.types[note.type];
  const parent = note.parent && notes.find((p) => p.slug === note.parent);
  const original = note.translation_of &&
    notes.find((p) => p.slug === note.translation_of);
  const translations = notes.filter((n) => n.translation_of === note.slug);
  const file = await pdf(note.source);
  const lecturers = note.lecturers ?? [];

  return (
    <article
      className="note"
      lang={note.lang === "zh" ? "zh-CN" : note.lang}
    >
      <header className="note-head">
        <p className="crumbs" lang={t.lang}>
          <a href={url(lang === "zh" ? "/zh/" : "/")}>{t.all_notes}</a>
          {parent && (
            <>
              {" "}
              <span aria-hidden="true">/</span>{" "}
              <a href={url(`/${parent.slug}/`)}>{parent.title}</a>
            </>
          )}
        </p>
        <h1>{note.title}</h1>
        <p className="note-meta" lang="en">
          {lecturers.length > 0 &&
            `${
              lecturers.length > 1 && type.credits ? type.credits : type.credit
            } ${conjoin(lecturers)}, `}
          {note.place}, {note.date}.
          {original && !note.judging && (
            <>
              {" "}Translated by {note.translator} from{" "}
              <a href={url(`/${original.slug}/`)}>the English notes</a>.
            </>
          )}
          {original && note.judging && (
            <>
              {" "}An experimental machine translation of{" "}
              <a href={url(`/${original.slug}/`)}>the English notes</a>.{" "}
              <button
                type="button"
                className="judging-open"
                aria-haspopup="dialog"
              >
                How it was made
              </button>
            </>
          )}
        </p>
        <p className="note-links" lang="en">
          {file && <a href={file}>PDF</a>}
          <a href={`${site.repo}/blob/main/${note.source}`}>TeX source</a>
          {translations.map((tr) => (
            <a key={tr.slug} href={url(`/${tr.slug}/`)} hrefLang="zh-Hans">
              中文 ({tr.translator})
            </a>
          ))}
        </p>
      </header>

      <div className="note-grid">
        {toc && (
          <nav className="toc" aria-label="Contents">
            <details
              open
              dangerouslySetInnerHTML={{
                __html: `<summary>Contents</summary>${toc}`,
              }}
            />
          </nav>
        )}
        {
          /* The text itself, often megabytes of MathML, is too large for React
            to render well; scripts/finish.ts puts it in. */
        }
        <div className="note-body" data-fragment={note.slug} />
      </div>
      {note.judging && <Judging />}
    </article>
  );
}
