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
    // NOT AS GENEROUS AS IT WANTED TO BE, and the limit is the invariant rather
    // than taste. At 0.8 / 1.2 the best five-siege-plus-one build cleared map 1
    // two seeds in five, and at 0.85 / 1.15 pure barracks cleared map 2 — which
    // would teach a Normal player that one family is a strategy and then take it
    // away the moment they pressed Hard.
    //
    // 0.85 / 1.10 is the most generous pair that holds it on all three maps over
    // 12 seeds and every scenario in tools/sim.mjs, and it is a real easing:
    // map 1's mixes go from 68% of runs cleared to 93%.
    //
    // Do not tune this at 5 seeds. The search that proposed these numbers broke
    // at 0.9 / 1.05 and held at the strictly more generous 0.9 / 1.10, which is
    // backwards and was the tell that a single-seed flip means nothing here.
    count: 0.85,
    gold: 1.1
  },
  {
    id: 'hard',
    name: 'Hard',
    // A TENTH MORE ENEMIES AND THE SAME PURSE. Hard is one lever, not two: the
    // extra bodies already pay their own bounties, so cutting the gold as well
    // compounds rather than adds, and it compounds hardest on the map that is
    // already hardest.
    //
    // Over 12 seeds and every scenario in tools/sim.mjs, as a share of mixed
    // builds that clear the map:
    //
    //                    map 1   map 3      (map 2 has no table of its own yet)
    //   as tuned          68%     30%
    //   count 1.10        48%     17%   <- this
    //   count 1.15/0.95   22%      2%
    //   count 1.20/0.90    7%      2%
    //
    // 1.15 and 1.20 are not Hard, they are unwinnable-except-by-one-build, and
    // the reason is in the third column: MAP 3 IS FAR MORE SENSITIVE TO COUNT
    // than map 1. Ten plots across two roads means a build either covers both
    // roads or loses, and more enemies pushes a marginal build over that line
    // much faster than it does on a single road. One multiplier for every map is
    // the price of a difficulty the player picks once; 1.10 is the value at
    // which the price is still fair on the map it costs the most.
    count: 1.1,
    gold: 1
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
