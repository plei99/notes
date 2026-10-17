export function byId(id, type) {
  const element = document.getElementById(id);
  if (!(element instanceof type)) {
    throw new Error(`#${id} is missing or not a ${type.name}`);
  }
  return element;
}
export function query(selector, type, root = document) {
  const element = root.querySelector(selector);
  if (!(element instanceof type)) {
    throw new Error(`${selector} is missing or not a ${type.name}`);
  }
  return element;
}
