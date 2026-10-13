import Base from "../components/Base";
import Index from "../components/Index";
import { ui } from "../lib/site";

export default function Page() {
  return (
    <Base
      page={{
        lang: "en",
        title: ui.en.title,
        url: "/",
        altUrl: "/zh/",
        kind: "index",
      }}
    >
      <Index lang="en" />
    </Base>
  );
}
