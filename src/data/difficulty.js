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
// WHERE THE TABLES SIT. They used to be the middle: every wave table in
// data/waves.js was tuned before this file existed, so 1.0 on both knobs was the
// game as it had been all along and neither setting was that — Normal sat below
// it, Hard above.
//
// THAT IS NO LONGER TRUE, and the reason is that the owner played the game. The
// three Extended tables in data/waves.js are hand-tuned counts from real runs at
// HARD Extended, dialled in through the admin dashboard, and the short tables are
// derived from them. The tables are the Hard end of the scale now, not the middle
// of it, so Hard multiplies by ONE: the numbers in the file are the numbers that
// were tested, and the setting they were tested at plays them untouched.
//
// Hard was 1.10 for as long as the tables were the middle, and leaving it there
// once they became the Hard end was a real bug rather than a stale comment. It
// sent 329 enemies through a Bend Extended run that had been tuned to 280 — the
// tenth on top of numbers that already had the tenth in them.

export const DIFFICULTIES = [
  {
    id: 'normal',
    name: 'Normal',
    // FOUR FIFTHS OF THE TABLE, the owner's number, set after Hard dropped to 1.0.
    //
    // It restores the SPREAD. Normal was 0.85 against tables that were the middle
    // of the scale, with Hard a tenth above them; the tables are the Hard end now,
    // so 0.85 against them was a much smaller easing than the one that was tuned —
    // 15% rather than 23%. 0.80 puts the gap back to a fifth, and a little wider
    // than the old one.
    //
    // WHAT THIS SETS ASIDE, said plainly because it was measured and is now being
    // overridden: 0.8 was tried before and rejected, on the invariant rather than
    // on taste. The best five-siege-plus-one build cleared map 1 two seeds in five
    // at 0.8, and the rule the whole difficulty is built around is that no single
    // tower family should be a strategy on Normal that Hard then takes away.
    //
    // That reading is not a verdict on this number. It was taken against the OLD
    // wave tables, before the owner hand-tuned all three Extended games by playing
    // them, and those tables send a different game — different creatures, in a
    // different order, on a roster of seven rather than four. Whether one family
    // still walks map 1 at 0.80 is an open question that only tools/sim.mjs can
    // answer, and it has not been run against these tables at any setting.
    //
    // Do not tune this at 5 seeds when it is run. The search that proposed 0.85
    // broke at 0.9 / 1.05 and held at the strictly more generous 0.9 / 1.10, which
    // is backwards and was the tell that a single-seed flip means nothing here.
    count: 0.8,
    gold: 1.1
  },
  {
    id: 'hard',
    name: 'Hard',
    // THE TABLE, EXACTLY, AND THE SAME PURSE. Hard multiplies nothing, because
    // the tables it plays were tuned AT Hard: see the note at the top of this
    // file. A multiplier here would be a second helping of a difficulty that is
    // already baked into the counts, and for a while it was one.
    //
    // WHAT 1.10 USED TO BUY, over 12 seeds and every scenario in tools/sim.mjs,
    // as a share of mixed builds that clear the map, back when the tables were
    // the middle:
    //
    //                    map 1   map 3      (map 2 had no table of its own yet)
    //   as tuned          68%     30%
    //   count 1.10        48%     17%   <- Hard, then
    //   count 1.15/0.95   22%      2%
    //   count 1.20/0.90    7%      2%
    //
    // That reading is not gone, it has moved: the hand-tuned tables ARE something
    // near the second row now, arrived at by playing rather than by multiplying.
    // The third and fourth rows are still the warning they always were, and the
    // reason is in the map 3 column: MAP 3 IS FAR MORE SENSITIVE TO COUNT than
    // map 1. Ten plots across two roads means a build either covers both roads or
    // loses, and more enemies pushes a marginal build over that line much faster
    // than it does on a single road. If Hard ever wants a multiplier again, that
    // column is what it costs — and the honest way to make Hard harder now is to
    // raise the counts in the table, on the map that should carry it.
    count: 1,
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
    // ROUNDED TO NEAREST, and it must stay that way. "Any decimal place is
    // rounded up" is the rule for the dashboard's steppers — a number a person is
    // dialling in, one at a time, where landing on the value you aimed at matters
    // more than the half-unit you gained. Applying it here instead was a mistake
    // that the owner felt before anyone measured it: ceil adds up to a whole
    // enemy PER GROUP, a late wave has seven groups, and the result reads exactly
    // as "there is one extra of everything". On Normal it also meant a group of
    // six came back as six — a difficulty that eased nothing at the counts small
    // enough to notice.
    //
    // Nearest costs nothing in fidelity where fidelity is owed: Hard multiplies
    // by 1, so its numbers are integers already and no rounding rule can touch
    // them.
    //
    // The floor of 1 stays: the wave that introduces a single heavy is the wave
    // that teaches it, and Normal should meet it later or with more help, never
    // miss it.
    groups: w.groups.map(g => ({ ...g, count: Math.max(1, Math.round(g.count * difficulty.count)) }))
  }));
}

// THE PURSE THE GAME OPENS WITH, given a base and a difficulty.
//
// It takes the NUMBER rather than the level, and that is not a tidy-up: the base
// is no longer always `level.startGold`, because the admin dashboard can replace
// it. Passing the level would have made this function reach for a field the caller
// had already decided not to use — see `adminGold` in src/admin.js, and the same
// argument the wave table's two layers are built on: the dashboard edits the
// level's own number, and the difficulty then scales whatever it finds.
export const startingGold = (startGold, difficulty) =>
  Math.round(startGold * difficulty.gold);
