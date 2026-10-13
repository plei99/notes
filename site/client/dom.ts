// Lookups for elements the page's HTML always contains. A missing one means
// the page and its script disagree, so fail loudly with the selector.

type ElementType<T extends Element> = { new (): T; prototype: T };

export function byId<T extends HTMLElement>(
  id: string,
  type: ElementType<T>,
): T {
  const element = document.getElementById(id);
  if (!(element instanceof type)) {
    throw new Error(`#${id} is missing or not a ${type.name}`);
  }
  return element;
}

export function query<T extends Element>(
  selector: string,
  type: ElementType<T>,
  root: ParentNode = document,
): T {
  const element = root.querySelector(selector);
  if (!(element instanceof type)) {
    throw new Error(`${selector} is missing or not a ${type.name}`);
  }
  return element;
}
