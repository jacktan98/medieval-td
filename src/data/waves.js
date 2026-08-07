// Enemies are drawn standing and only mirror, same rule as every other figure:
// sprite/trim/pivot are read the same way as the soldiers in data/towers.js and
// scaled by the same SCALE, so an enemy is sized against a spearman by the art
// rather than by a number picked here. `r` stays the collision radius and is
// deliberately smaller than the drawn sprite — it is the body, not the outline.
export const enemyTypes = {
  light_inf: {
    sprite: 'enemy_t1',
    spriteTrim: [80, 75, 40, 46],
    pivot: [0.377, 0.978],   // feet on the anchor, standing axis from the legs
    spriteFaces: -1,
    hp: 80,
    // Speed is the lever that makes blockers necessary. Fast enemies spend less
    // time inside a tower's range, so archery alone cannot kill them in transit
    // — but a soldier stops them dead, and blocking ignores speed entirely.
    speed: 88,      // logical px per second
    //
    // Raised from 72 when the level was retraced from the artwork. The new road
    // is longer (1832 vs 1566) AND better covered by the plots the artist
    // painted (81% of it within tier 1 range, against 75% before), and the two
    // together made a pure-archery build win outright — the one thing this
    // level is not supposed to allow. Above about 96 the mixed builds stop
    // winning too, so the usable window is 88-96 and this sits at the gentle end.
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
