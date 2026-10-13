import Base from "../../components/Base";
import Index from "../../components/Index";
import { ui } from "../../lib/site";

export default function Page() {
  return (
    <Base
      page={{
        lang: "zh",
        title: ui.zh.title,
        url: "/zh/",
        altUrl: "/",
        kind: "index",
      }}
    >
      <Index lang="zh" />
    </Base>
  );
}
