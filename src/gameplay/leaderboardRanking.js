/**
 * Leaderboard order: escapes above catches. Escapes rank by fastest time;
 * catches by most candy, then by longest survival.
 */
export function compareResults(a, b) {
  if (a.escaped !== b.escaped) return a.escaped ? -1 : 1;
  if (a.escaped) return a.timeSeconds - b.timeSeconds;
  return b.candiesCollected - a.candiesCollected || b.timeSeconds - a.timeSeconds;
}

export function rankResults(results) {
  return [...results].sort(compareResults);
}
