// Pass your own `random` (a function returning 0–1) where accepted, to make results predictable in tests.

/** A random number within `range` ({ min, max }). */
export const randomInRange = ({ min, max }, random = Math.random) => min + random() * (max - min);

/** A random value in [-amount, amount]. */
export const randomSpread = (amount) => (Math.random() * 2 - 1) * amount;

export const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

export const chance = (probability) => Math.random() < probability;

/** One option's `value`, picked with probability proportional to its `weight`. */
export function weightedRandomItem(options) {
  let roll = Math.random() * options.reduce((total, option) => total + option.weight, 0);
  for (const option of options) {
    roll -= option.weight;
    if (roll < 0) return option.value;
  }
  return options[options.length - 1].value;
}

/** A shuffled copy of `items` (Fisher–Yates). */
export function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
