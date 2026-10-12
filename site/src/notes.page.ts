// One page per note in the catalogue, at /<slug>/, from the HTML fragments
// build/build.py wrote into src/n/<slug>/. A note that has not been built (or
// failed to build) gets no page, and the index links only its PDF.

export const layout = "layouts/note.vto";

interface Note {
  slug: string;
  title: string;
  description?: string;
  lang?: string;
}

function read(url: URL): string | undefined {
  try {
    return Deno.readTextFileSync(url);
  } catch {
    return undefined;
  }
}

export default function* ({ notes }: { notes: Note[] }) {
  for (const note of notes) {
    const dir = new URL(`./n/${note.slug}/`, import.meta.url);
    const content = read(new URL("_body.html", dir));
    if (content === undefined) continue;
    yield {
      url: `/${note.slug}/`,
      kind: "note",
      slug: note.slug,
      title: note.title,
      description: note.description?.trim(),
      lang: note.lang ?? "en",
      note,
      toc: read(new URL("_toc.html", dir)) ?? "",
      content,
    };
  }
}
