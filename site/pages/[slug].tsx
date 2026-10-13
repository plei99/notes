import Base from "../components/Base";
import Note from "../components/Note";
import { built, notes, toc } from "../lib/site";

type Params = { slug: string };

// One page per note in the catalogue, at /<slug>/, from the HTML fragments
// build/build.py wrote into generated/<slug>/. A note that has not been built
// (or failed to build) gets no page, and the index links only its PDF.
export default async function Page({ params }: { params: Params }) {
  const note = notes.find((n) => n.slug === params.slug)!;
  const lang = note.lang ?? "en";
  return (
    <Base
      page={{
        lang,
        title: note.title,
        description: note.description,
        url: `/${note.slug}/`,
        kind: "note",
      }}
    >
      <Note note={note} lang={lang} toc={await toc(note.slug)} />
    </Base>
  );
}

// Bake renders one page per built note at build time.
export async function getStaticPaths(): Promise<
  { paths: { params: Params }[] }
> {
  const have = await built(notes);
  return {
    paths: notes.filter((n) => have.has(n.slug)).map((n) => ({
      params: { slug: n.slug },
    })),
  };
}
