/** Looks up an element that index.html must contain, failing loudly if it's missing. */
export function requireElement(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`index.html is missing the #${id} element`);
  return element;
}
