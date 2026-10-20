import { rev, url } from "../lib/site";

/**
 * A machine translation's "How it was made": a dialog with how the translation
 * was picked from several, the judges' scores and comments, and the
 * terminology. client/judging.ts fetches judging.json from beside the page
 * when it first opens (scripts/finish.ts puts it there) and draws the rest.
 */
export default function Judging() {
  return (
    <dialog
      className="how judging"
      id="judging"
      aria-labelledby="judging-title"
      lang="en"
      {...{ closedby: "any" }}
    >
      <header className="how-head">
        <h2 id="judging-title">How this translation was made</h2>
        <form method="dialog">
          <button className="how-close" aria-label="Close">×</button>
        </form>
      </header>
      <div className="judging-body" />
      <p className="how-failed" hidden>The scores could not be loaded.</p>
      <script type="module" src={`${url("/js/judging.js")}?v=${rev}`} />
    </dialog>
  );
}
