import { readFile } from 'node:fs/promises';
import { loadLevel } from '../src/models/level/loadLevel.js';

/** Reads a file from disk, standing in for the browser's fetch. */
export const readTextFile = (url) => readFile(url, 'utf8');

/** The office, loaded from data/ the same way the game loads it. */
export const OFFICE = await loadLevel(new URL('../data/office/building.json', import.meta.url), readTextFile);
