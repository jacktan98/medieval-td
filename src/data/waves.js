// Enemies are drawn standing and only mirror, same rule as every other figure:
// sprite/trim/pivot are read the same way as the soldiers in data/towers.js and
// scaled by the same SCALE, so an enemy is sized against a spearman by the art
// rather than by a number picked here. `r` stays the collision radius and is
// deliberately smaller than the drawn sprite — it is the body, not the outline.
export const enemyTypes = {
  light_inf: {
    sprite: 'enemy_t1a',
    spriteTrim: [208, 199, 96, 114],   // source px, re-paste from tools/trim.mjs
    pivot: [0.594, 0.908],   // the centre of his ground shadow
    spriteFaces: -1,
    // The dead pose, left on the road for two seconds.
    //
    // BOTH numbers are measured from the corpse's own drawing now. deadTrim
    // comes from tools/trim.mjs and deadPivot is the centre of the corpse's own
    // grey shadow, from tools/shadow.mjs.
    //
    // It used to be derived instead — the LIVING figure's feet, located inside
    // the dead trim by arithmetic — because a corpse had no shadow and nothing
    // about its outline said where it lay. That coupled the two exports: redraw
    // either one and the number had to be recomputed from both. Now each drawing
    // carries its own answer, and a body lies where its shadow is.
    dead: 'dead_enemy_t1a',
    deadTrim: [193, 211, 126, 90],
    deadPivot: [0.163, 0.753],
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

  // The heavy. Its artwork is called T1b, not T2, and that rename is the
  // artist's: this is a bigger militiaman rather than the next rank up, so the
  // tier 2 enemy slot is still empty and whatever fills it later gets T2. The
  // gameplay name here did not change, because what it DOES did not.
  //
  // Drawn getting on for twice the militia — 38x33 game px against 20x23 — and
  // it plays the way it looks: slow, heavy, and not something a single tier 1
  // tower kills on the way past.
  //
  // It is the reason later waves are dangerous now that everything moves more
  // slowly. Two of them will walk through a lone militia squad; the answer is
  // either more blockers to spread the load or enough archery to focus one down
  // before it reaches the wall.
  //
  // This hp is where the level's invariant sits, and it is the ONLY knob used to
  // hold it. Militia hp is the wrong lever — at 110 every build died on wave 2,
  // because the opening is the tightest part of the curve and militia hp is what
  // it is made of. Heavies first appear in wave 4, so their hp raises the ceiling
  // without touching the floor, which is exactly what "harder later waves" means.
  //
  // 540 -> 620 when waves 1 and 2 were thinned and the opening delay went to 14s.
  // Making the start gentler hands the archers a tower they did not have before,
  // and a pure-archery build went back to winning.
  //
  // 620 -> 780 after the map redraw that moved two plot markers. The markers'
  // total reach barely changed — the union of all nine at tier 1 range actually
  // fell from 93.0% of the road to 89.1% — but the one that moved from (462,130)
  // to (557,185) went from covering 10.6% to 17.0%, and it is a plot the best
  // all-archery build takes. That was the whole margin: archery alone went from
  // losing on wave 7 to winning with 4 lives.
  //
  // 780 was chosen over the 700 that would also have worked, because 700 left
  // the game easier than it had been. It was not a knife edge: 780 and 860 gave
  // the same result, so the plateau was picked at its near end.
  //
  // 780 -> 755 after the last plot moved from (721,128) to (809,262), which is
  // the whole of that redraw — no other marker moved and the road is identical
  // to the pixel. At 780 NOTHING cleared the level any more, which is the first
  // time this knob has been needed in that direction.
  //
  // The surprise is that the plot got BETTER on paper and the level got harder.
  // Its own coverage went 13.3% -> 15.3% of the road and the part no other plot
  // reaches went 4.1% -> 8.5%. But the build it broke used that plot as a
  // BARRACKS, and a blocker is worth what the archers behind it can shoot: the
  // squad's stand moved from 85% along the road to 89%, which took it from 102px
  // off the nearest other tower to about 145px — the outer edge of tier 1 range.
  // Coverage measures where a tower can shoot. It says nothing about whether
  // anything can shoot the place a blocker stands.
  //
  // 755 is the middle of the band, not its near end, because this plateau is
  // bounded on BOTH sides: 740 lets archery win alone and 770 lets nothing win.
  // 745 to 765 all hold, so 755 has 10 of margin either way.
  //
  // Worth knowing before the next map change: that band is 20 wide where the
  // last one was 80, and every value inside it has the best build scraping home
  // with 2 lives where it used to have 7. The new plot is strong for archery and
  // weak for blocking, and those two together squeeze the gap between "archery
  // alone is enough" and "nothing is enough". If the next redraw breaks this
  // again, the honest fix is probably the wave curve rather than this number —
  // the whole difficulty now lands in wave 8.
  heavy_inf: {
    sprite: 'enemy_t1b',
    // Redrawn 1.16x bigger. Both anchors below were carried across rather than
    // re-eyeballed: the new art is the old art scaled 1.16 about (256, 310) and
    // shifted (-28, +17), which is the transform that best overlays the two
    // silhouettes (IoU 0.98). Put the old feet through it and they land here.
    spriteTrim: [163, 175, 186, 162],
    pivot: [0.737, 0.904],
    spriteFaces: -1,
    dead: 'dead_enemy_t1b',
    deadTrim: [125, 182, 241, 148],
    deadPivot: [0.135, 0.644],
    hp: 755,
    speed: 52,      // slower than the militia, so it arrives as a second wall
    bounty: 40,
    leak: 2,        // worth two lives: letting one through really hurts
    damage: 18,
    atkCd: 1.2,
    // 12 -> 14, moved with the art rather than left behind, so the hitbox still
    // matches the body you can see. Checked before changing it, not after: the
    // whole sim is identical either way — same wave, same lives, same gold in
    // every scenario — so this is a picture change and not a balance one.
    r: 14,
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
//
// Waves 1 and 2 are deliberately thin — 4 and 6 — and they are thin because the
// opening is the tightest part of the whole curve, not the easiest. 220 gold is
// three tier 1 towers, and you have not earned a bounty yet, so wave 1 is the
// only wave you meet with whatever you could afford before it started.
export const waves = [
  { rest: 9, groups: [{ type: 'light_inf', count: 4, gap: 1.60 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 6, gap: 1.40 }] },
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

// Seconds before the first enemy appears. It was 2, which is not enough time to
// place one tower, let alone decide where — the first wave was effectively being
// fought with an empty board. The dashboard's "Next wave" button works during
// this delay too, so anyone who knows where they want their towers can take the
// gold instead of the time.
export const openingDelay = 14;

// Calling a wave early pays this much gold per second of rest skipped. The
// whole point is that it is a real choice: 9 seconds of rest is 36 gold, which
// is half a tower, against facing the next wave with whatever is standing now.
export const earlyCallRate = 4;

// Total enemies in a wave, for the HUD and for tools/sim.mjs.
export const waveSize = w => w.groups.reduce((n, g) => n + g.count, 0);
