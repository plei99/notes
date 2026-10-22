import createDOMPurify from "dompurify";

const purifier = createDOMPurify(window);
// TeX drawings use <use> to reference glyph paths. Keep only references inside
// this SVG; external SVG documents and image/link URLs are not diagram data.
purifier.addHook("uponSanitizeAttribute", (_node, attribute) => {
  if (
    ["href", "xlink:href"].includes(attribute.attrName) &&
    !attribute.attrValue.startsWith("#")
  ) attribute.keepAttr = false;
});

export function replaceDiagram(target: HTMLElement, source: string) {
  const fragment = purifier.sanitize(source, {
    USE_PROFILES: { svg: true },
    ADD_TAGS: ["use"],
    FORBID_TAGS: ["foreignobject", "style", "a", "image"],
    RETURN_DOM_FRAGMENT: true,
  });
  const drawing = fragment.firstElementChild;
  if (
    fragment.children.length !== 1 || drawing?.localName !== "svg" ||
    drawing.namespaceURI !== "http://www.w3.org/2000/svg"
  ) return;
  target.replaceChildren(fragment);
}
