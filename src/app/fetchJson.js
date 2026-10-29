/**
 * Reads a JSON file over HTTP, the way the browser loads the level.
 * @param {URL} url
 * @returns {Promise<unknown>}
 */
export async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (HTTP ${response.status})`);
  return response.json();
}
