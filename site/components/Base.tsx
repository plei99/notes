import type { ReactNode } from "react";
import { inlineScript } from "../lib/inline";
import {
  absolute,
  allThemes,
  type Lang,
  rev,
  site,
  themePairs,
  themes,
  ui,
  url,
} from "../lib/site";
import How from "./How";

export type PageInfo = {
  lang: Lang;
  title: string;
  /** This page's path, such as "/zh/". */
  url: string;
  /** The index's other language. */
  altUrl?: string;
  description?: string;
  /** Picks the page's script: the filters or the note's diagrams. */
  kind: "index" | "note";
};

/** The page: head metadata, masthead, footer and the colophon's dialog. */
export default async function Base(
  { page, children }: { page: PageInfo; children?: ReactNode },
) {
  const { lang, title, altUrl, kind } = page;
  const t = ui[lang];
  const description = page.description || t.lede;
  const fullTitle = `${title}${
    title !== t.title ? ` · ${t.title}` : ""
  } · ${site.name}`;
  const home = `${site.homepage}${lang === "zh" ? "zh/" : ""}`;

  return (
    <>
      {
        /* Bake's React shell owns <html>; scripts/finish.ts copies this
          attribute onto it. */
      }
      <template data-shell data-lang={t.lang} />
      <meta charSet="utf-8" />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={absolute(page.url)} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {altUrl && (
        <link
          rel="alternate"
          hrefLang={lang === "zh" ? "en" : "zh-Hans"}
          href={absolute(altUrl)}
        />
      )}
      <meta property="og:url" content={absolute(page.url)} />
      <meta name="color-scheme" content="light dark" />
      {
        /* Fonts are the homepage's own files, so they stay in step with its
          picker and, on the shared origin, come from the same browser cache. */
      }
      <link
        rel="preload"
        href={`${site.homepage}fonts/tex-gyre-pagella-regular.woff2`}
        as="font"
        type="font/woff2"
        crossOrigin=""
      />
      <link
        rel="stylesheet"
        href={`${site.homepage}fonts/fonts.css`}
        precedence="site"
      />
      <link
        rel="stylesheet"
        href={`${url("/themes.css")}?v=${rev}`}
        precedence="site"
      />
      <link
        rel="stylesheet"
        href={`${url("/styles.css")}?v=${rev}`}
        precedence="site"
      />
      {
        /* Saved preferences, applied before first paint. They are the
          homepage's: the same localStorage keys and Path=/ cookies on the same
          origin, so a theme or font chosen there shows here, and the other way
          round (client/theme.ts). */
      }
      <script
        dangerouslySetInnerHTML={{
          __html: await inlineScript("preferences", {
            THEME_PAIRS: themePairs,
          }),
        }}
      />
      <script type="module" src={`${url("/js/theme.js")}?v=${rev}`} />
      <script
        type="module"
        src={`${
          url(kind === "note" ? "/js/note.js" : "/js/filter.js")
        }?v=${rev}`}
      />
      <script type="module" src={`${url("/js/how.js")}?v=${rev}`} />

      <a className="skip-link" href="#main">{t.skip}</a>

      <div className="page">
        <header className="masthead">
          <p className="name">
            <a href={home}>{site.name}</a>
          </p>
          <div className="controls">
            <label className="scheme" hidden>
              <span className="visually-hidden">{t.theme}</span>
              <select
                data-default-light={allThemes.find((x) => !x.dark)!.id}
                data-default-dark={allThemes.find((x) => x.dark)!.id}
              >
                {themes.map((family) =>
                  family.themes.length > 1
                    ? (
                      <optgroup key={family.family} label={family.family}>
                        {family.themes.map((theme) => (
                          <option key={theme.id} value={theme.id}>
                            {theme.name}
                          </option>
                        ))}
                      </optgroup>
                    )
                    : (
                      <option
                        key={family.themes[0]!.id}
                        value={family.themes[0]!.id}
                      >
                        {family.themes[0]!.name}
                      </option>
                    )
                )}
              </select>
            </label>
            <label className="latin" hidden>
              <span className="visually-hidden">{t.latin_font}</span>
              <select>
                {site.latin_fonts.map((group) => (
                  <optgroup
                    key={group.group}
                    label={group.group}
                    data-sans={group.sans ? "" : undefined}
                  >
                    {group.fonts.map((font) => (
                      <option key={font.id} value={font.id}>{font.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            {/* Chinese pages can also choose the Chinese face, as on the homepage. */}
            {lang === "zh" && (
              <label className="cjk" hidden>
                <span className="visually-hidden">{t.cjk_font}</span>
                <select>
                  <option value="serif">{t.cjk_serif}</option>
                  <option value="sans" data-sans="">{t.cjk_sans}</option>
                  <option value="rounded" data-sans="">{t.cjk_rounded}</option>
                  <option value="wenkai">{t.cjk_kai}</option>
                </select>
              </label>
            )}
            {/* The index has both languages; the link names the one it switches to. */}
            {altUrl && (
              <a
                className="langswitch"
                lang={lang === "zh" ? "en" : "zh-CN"}
                hrefLang={lang === "zh" ? "en" : "zh-Hans"}
                href={url(altUrl)}
              >
                {t.switch}
              </a>
            )}
          </div>
        </header>

        <main id="main" tabIndex={-1}>
          {children}
        </main>

        <footer className="colophon">
          <p>
            <a href={url(lang === "zh" ? "/zh/" : "/")}>{t.all_notes}</a>{" "}
            <a href={home}>{t.homepage}</a>
          </p>
          <p>
            © 2026 {site.name}{" "}
            <button type="button" className="how-open" aria-haspopup="dialog">
              {t.how}
            </button>{" "}
            <a href={site.repo}>{t.source}</a>
          </p>
        </footer>
      </div>
      <How lang={lang} />
    </>
  );
}
