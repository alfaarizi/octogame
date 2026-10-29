import { filesOf, parseLevel } from './parseLevel.js';

/** @typedef {import('./parseLevel.js').Level} Level */

/**
 * Reads a level from its JSON files: `buildingUrl` (a building.json), and the palette and floor files it names,
 * which sit next to it.
 * @param {URL} buildingUrl
 * @param {(url: URL) => Promise<unknown>} readJson - How to read one file: fetch in the browser, the disk in tests.
 * @returns {Promise<Level>}
 * @throws {import('./validate.js').LevelFormatError} If anything in the files is missing or malformed.
 */
export async function loadLevel(buildingUrl, readJson) {
  const building = await readJson(buildingUrl);
  const files = filesOf(building);
  const [palette, ...floors] = await Promise.all([files.palette, ...files.floors].map((file) => readJson(new URL(file, buildingUrl))));
  return parseLevel({ building, palette, floors });
}
