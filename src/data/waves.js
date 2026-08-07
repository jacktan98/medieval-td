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
    speed: 94,      // logical px per second
    //
    // 72 -> 88 -> 94, each time because the artist moved the plots and archery
    // got more road to shoot at. The nine markers now cover 83.6% of the 1832px
    // road at tier 1 range, up from 81%, and at 88 a pure-archery build won
    // outright — the one thing this level is not supposed to allow.
    //
    // 94 is not a guess. tools/sim.mjs was run over every six-tower build on
    // the usable plots, all 64 family assignments of each, and 94 is where the
    // best archery-only build first loses (wave 4) while the best mixed build
    // still wins with 9 lives. Below it archery alone wins; by 98 the mix is
    // down to 4 lives and the level is a coin toss. Re-run that search after
    // any redraw rather than nudging this number.
    bounty: 14,
    leak: 1,        // lives lost if it reaches the keep
    damage: 9,      // per swing, once a barracks soldier has stopped it
    atkCd: 1.0,
    r: 8,
    colour: '#B98B5E'
  }
};

// gap = seconds between spawns within the wave
// rest = seconds after the wave clears before the next one starts
export const waves = [
  { type: 'light_inf', count: 6,  gap: 1.10, rest: 8 },
  { type: 'light_inf', count: 8,  gap: 1.00, rest: 8 },
  { type: 'light_inf', count: 10, gap: 0.90, rest: 8 },
  { type: 'light_inf', count: 12, gap: 0.80, rest: 8 },
  { type: 'light_inf', count: 14, gap: 0.70, rest: 8 },
  { type: 'light_inf', count: 18, gap: 0.60, rest: 8 },
  { type: 'light_inf', count: 24, gap: 0.50, rest: 8 },
  { type: 'light_inf', count: 30, gap: 0.40, rest: 0 }
];

export const waveClearBonus = 40;
