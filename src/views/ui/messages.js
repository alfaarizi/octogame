import { formatRoundTime } from '../../utils.js';

/** Every piece of text the game shows during play, in one place. */
export const MESSAGES = Object.freeze({
  defaultPlayerName: 'Mystery guest',

  roundIntro: (evidenceRequired) => `Pick up the camera and flashlight with E. Photograph ${evidenceRequired} anomalies. J opens your case file.`,
  evidenceRemaining: (count) => `${count} more to go`,
  exitOpen: 'The main gate is open. RUN!',
  batteryCollected: '+ Battery',
  batteryLow: 'Battery low',
  flashlightDepleted: 'Your flashlight died…',
  flashlightDead: 'Your flashlight is dead',
  ghostWoke: 'Something woke up…',
  ghostBanished: 'Banished… for now',

  escapedTitle: 'You escaped!',
  caughtTitle: 'Caught!',
  escapedDetail: ({ playerName, timeSeconds }, rank) =>
    `${playerName} escaped with the photographs in ${formatRoundTime(timeSeconds)}. That's #${rank} on the board.`,
  caughtDetail: ({ playerName, evidenceCollected }, evidenceRequired) =>
    `${playerName} found ${evidenceCollected} of ${evidenceRequired} anomalies before the ghost got them.`,

  leaderboardEmpty: 'No scores yet. Be the first to go in.',
  leaderboardEscaped: ({ timeSeconds }) => `escaped in ${formatRoundTime(timeSeconds)}`,
  leaderboardCaught: ({ evidenceCollected }, evidenceRequired) => `caught · ${evidenceCollected}/${evidenceRequired} photos`,
});
