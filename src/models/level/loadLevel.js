import { filesOf, parseLevel, tilesFileOf } from './parseLevel.js';
import { LevelFormatError } from './validate.js';

/** @typedef {import('./parseLevel.js').Level} Level */

/**
 * Reads a level from its files: `buildingUrl` (a building.json), the palette and floor files it names, and the
 * tiles file each floor names. Each file is found relative to the one that names it.
 * @param {URL} buildingUrl
 * @param {(url: URL) => Promise<string>} readText - How to read one file: fetch in the browser, the disk in tests.
 * @returns {Promise<Level>}
 * @throws {LevelFormatError} If anything in the files is missing or malformed.
 */
export async function loadLevel(buildingUrl, readText) {
  const readJson = async (url) => parseJson(await readText(url), fileNameOf(url));
  const building = await readJson(buildingUrl);
  const files = filesOf(building);
  const floorUrls = files.floors.map((file) => new URL(file, buildingUrl));
  const [palette, ...floorData] = await Promise.all([readJson(new URL(files.palette, buildingUrl)), ...floorUrls.map(readJson)]);
  const tiles = await Promise.all(
    floorData.map((data, index) => readText(new URL(tilesFileOf(data, files.floors[index]), floorUrls[index]))),
  );
  return parseLevel({ building, palette, floors: floorData.map((data, index) => ({ data, tiles: tiles[index] })) });
}

/** @param {URL} url */
const fileNameOf = (url) => url.pathname.split('/').pop();

/**
 * @param {string} contents
 * @param {string} file - For the error message.
 */
function parseJson(contents, file) {
  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new LevelFormatError(file, `isn't valid JSON (${error.message})`);
  }
}
