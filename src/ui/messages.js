import { formatRoundTime } from './formatRoundTime.js';

/** Every piece of text the game shows during play, in one place. */
export const Messages = Object.freeze({
  defaultPlayerName: 'Mystery guest',

  roundIntro: (candiesRequired) => `Find ${candiesRequired} candies. Click to switch your flashlight on and off.`,
  candiesRemaining: (count) => `${count} more to go`,
  exitOpen: 'The front door is open. RUN!',
  batteryCollected: '+ Battery',
  batteryLow: 'Battery low',
  flashlightDepleted: 'Your flashlight died…',
  flashlightDead: 'Your flashlight is dead',
  ghostWoke: 'Something woke up…',
  ghostBanished: 'Banished… for now',

  escapedTitle: 'You escaped!',
  caughtTitle: 'Caught!',
  escapedDetail: ({ playerName, timeSeconds }, rank) =>
    `${playerName} got out with the candy in ${formatRoundTime(timeSeconds)}. That's #${rank} on the board.`,
  caughtDetail: ({ playerName, candiesCollected }, candiesRequired) =>
    `${playerName} found ${candiesCollected} of ${candiesRequired} candies before the ghost got them.`,

  leaderboardEmpty: 'No scores yet. Be the first to go in.',
  leaderboardEscaped: ({ timeSeconds }) => `escaped in ${formatRoundTime(timeSeconds)}`,
  leaderboardCaught: ({ candiesCollected }, candiesRequired) => `caught · ${candiesCollected}/${candiesRequired} 🍬`,
});
