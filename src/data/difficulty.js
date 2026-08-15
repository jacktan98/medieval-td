// How hard the game is, as a choice the player makes on the title screen.
//
// TWO KNOBS, AND ONLY TWO: how many enemies a wave sends, and how much gold you
// start with. Everything else — the enemy stats, the tower stats, the wave
// order, the map — is the same game at both settings. That is the point: a
// difficulty should change how much pressure you are under, not which build
// works, and a setting that quietly retuned enemy health would make every
// balance note in data/waves.js true at one setting and false at the other.
//
// The count multiplier is the real lever and the gold is the fine adjustment.
// They are not independent: fewer enemies also means fewer bounties, so cutting
// the count takes gold away as well as pressure, and the purse gives some of it
// back. That is why Normal moves both in the same direction rather than only
// thinning the waves.
//
// WHERE THE MIDDLE IS. Every wave table in data/waves.js was tuned before this
// file existed, so the tables ARE the middle — 1.0 on both knobs is exactly the
// game as it has been all along, and neither setting below is that. Normal is
// easier than what the maps were tuned to and Hard is harder, so the tuning
// notes over each table still describe the point the two settings straddle.

export const DIFFICULTIES = [
  {
    id: 'normal',
    name: 'Normal',
    // A fifth fewer enemies, and a fifth more gold to meet them with. The gold
    // does two jobs: it replaces the bounties the missing enemies would have
    // paid, and it buys the fourth tower earlier, which is what actually makes
    // an opening feel survivable.
    count: 0.8,
    gold: 1.2
  },
  {
    id: 'hard',
    name: 'Hard',
    // A fifth more enemies on a slightly thinner purse. Not symmetrical with
    // Normal on purpose: the extra bodies already pay their own bounties, so
    // taking a fifth of the gold away as well would be two cuts rather than one.
    count: 1.2,
    gold: 0.9
  }
];

export const DEFAULT_DIFFICULTY = 0;

// A level's waves at the chosen setting.
//
// Built ONCE, when a game starts, and kept on the state — not recomputed per
// frame and not read through the level. Scaling in the update loop would make
// `waveSize` a multiplication that has to agree with the spawn loop's own
// rounding, and those two disagreeing is a wave that never finishes spawning.
//
// A group never drops below one. A count of 1 scaled to 0.8 rounds to 1 rather
// than to nothing: the wave that introduces a single heavy is the wave that
// teaches it, and Normal should meet it later or with more help, never miss it.
export function scaleWaves(waves, difficulty) {
  return waves.map(w => ({
    ...w,
    groups: w.groups.map(g => ({ ...g, count: Math.max(1, Math.round(g.count * difficulty.count)) }))
  }));
}

export const startingGold = (level, difficulty) =>
  Math.round(level.startGold * difficulty.gold);
