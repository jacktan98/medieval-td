// Enemies are drawn standing and only mirror, same rule as every other figure:
// sprite/trim/pivot are read the same way as the soldiers in data/towers.js and
// scaled by the same SCALE, so an enemy is sized against a spearman by the art
// rather than by a number picked here. `r` stays the collision radius and is
// deliberately smaller than the drawn sprite — it is the body, not the outline.
export const enemyTypes = {
  light_inf: {
    sprite: 'enemy_t1',
    spriteTrim: [208, 182, 96, 113],   // source px, re-paste from tools/trim.mjs
    pivot: [0.377, 0.978],   // feet on the anchor, standing axis from the legs
    spriteFaces: -1,
    hp: 80,
    // Speed is the lever that makes blockers necessary. Fast enemies spend less
    // time inside a tower's range, so archery alone cannot kill them in transit
    // — but a soldier stops them dead, and blocking ignores speed entirely.
    //
    // 72 -> 88 -> 94 -> 70. The first three were forced upward each time the
    // artist moved the plots and archery got more road to shoot at. 70 is a
    // deliberate slow-down of the whole game, taken together with a longer
    // archery cooldown; the difficulty that speed used to provide now comes
    // from the heavies below and from the later waves being bigger.
    speed: 70,      // logical px per second
    bounty: 14,
    leak: 1,        // lives lost if it reaches the keep
    damage: 9,      // per swing, once a barracks soldier has stopped it
    atkCd: 1.0,
    r: 8,
    colour: '#B98B5E'
  },

  // Tier 2. Drawn half again as big as the militia — 33x28 game px against
  // 20x23 — and it plays the way it looks: slow, heavy, and not something a
  // single tier 1 tower kills on the way past.
  //
  // It is the reason later waves are dangerous now that everything moves more
  // slowly. Two of them will walk through a lone militia squad; the answer is
  // either more blockers to spread the load or enough archery to focus one down
  // before it reaches the wall.
  //
  // 540hp is where the level's invariant sits. Raising the archers' range to 150
  // made a pure-archery build win comfortably again, and the obvious repair —
  // more hp on the militia — turned out to be the wrong lever: at 110 every
  // build died on WAVE 2, because the early game is the tightest part of the
  // curve and militia hp is what it is made of. Heavies first appear in wave 4,
  // so their hp raises the ceiling without touching the floor, which is exactly
  // what "harder later waves" means. At 500 archery alone still wins; by 620 the
  // mixes stop winning too.
  heavy_inf: {
    sprite: 'enemy_t2',
    spriteTrim: [169, 172, 161, 135],
    pivot: [0.541, 0.978],
    spriteFaces: -1,
    hp: 540,
    speed: 52,      // slower than the militia, so it arrives as a second wall
    bounty: 40,
    leak: 2,        // worth two lives: letting one through really hurts
    damage: 18,
    atkCd: 1.2,
    r: 12,
    colour: '#8A6A4A'
  }
};

// A wave is a list of groups spawned in order, so one wave can send militia and
// then heavies without needing a second wave slot. `gap` is the pause between
// spawns inside a group, and `rest` is the breather after the whole wave clears.
//
// Difficulty curve: waves 1-3 are militia only and teach the level. The first
// heavy lands in wave 4 as a single one, alone, so it is unmistakable. From
// there heavies come in growing packs behind a militia screen, and the last two
// waves are the real test — wave 8 is 34 militia and 6 heavies back to back.
export const waves = [
  { rest: 9, groups: [{ type: 'light_inf', count: 6, gap: 1.30 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 9, gap: 1.20 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 12, gap: 1.10 }] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 10, gap: 1.00 },
      { type: 'heavy_inf', count: 1, gap: 2.00 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 14, gap: 0.90 },
      { type: 'heavy_inf', count: 2, gap: 2.00 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 18, gap: 0.80 },
      { type: 'heavy_inf', count: 3, gap: 1.80 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 24, gap: 0.70 },
      { type: 'heavy_inf', count: 4, gap: 1.60 }
    ] },
  { rest: 0, groups: [
      { type: 'light_inf', count: 34, gap: 0.60 },
      { type: 'heavy_inf', count: 6, gap: 1.40 }
    ] }
];

export const waveClearBonus = 40;

// Calling a wave early pays this much gold per second of rest skipped. The
// whole point is that it is a real choice: 9 seconds of rest is 36 gold, which
// is half a tower, against facing the next wave with whatever is standing now.
export const earlyCallRate = 4;

// Total enemies in a wave, for the HUD and for tools/sim.mjs.
export const waveSize = w => w.groups.reduce((n, g) => n + g.count, 0);
