// Enemies are drawn standing and only mirror, same rule as every other figure:
// sprite/trim/pivot are read the same way as the soldiers in data/towers.js and
// scaled by the same SCALE, so an enemy is sized against a spearman by the art
// rather than by a number picked here. `r` stays the collision radius and is
// deliberately smaller than the drawn sprite — it is the body, not the outline.

// The flask, and the only ammunition in the game that belongs to an enemy.
//
// FIRST IN THE FILE because the plague doctor's card quotes its poison, and a
// def cannot read a constant declared under it.
//
// Shaped exactly like the tower ammunition in data/towers.js — `kind`, `speed`,
// `arc`, `impact` — because projectiles.js reads all of them the same way. What
// is different is `poison` instead of a damage number, and that difference is
// the whole design: a flask does nothing on impact. It leaves a patch of ground
// that trickles health out of everyone who was standing in it.
export const flask = {
  kind: 'flask',
  sprite: 'flask',
  trim: [236, 232, 41, 48],
  // A bottle has no nose to put on the target, so it is never turned and it
  // flies by its middle — the same two answers a rock gives, for the same
  // reason. Rotating it to its heading would be all the spin and none of the
  // meaning.
  faces: 0,
  grip: 0.5,
  // Slower than a rock's 300 and half an arrow's, because he is a man lobbing a
  // bottle underarm over a fight rather than a machine throwing one. It is also
  // the reaction time the player is being sold: you can see a flask coming and
  // there is time to decide it matters.
  speed: 150,
  // Lobbed, like a rock, and for the same reason: he is throwing it over the
  // fight rather than into it. The number is the height of the arc as a fraction
  // of the throw, so a short lob is a low one.
  arc: 0.22,
  // How wide the spill catches. The drawing is 31 game px across, so 22 is a
  // patch a little wider than the picture of it — enough to catch two men of a
  // wedge that is 40px wide, never the whole squad.
  splash: 22,
  impact: 'spill',
  poison: {
    // Per second, for this many seconds. 6 x 3 is 18 health, which is a sixth of
    // a spearman and a tenth of a swordsman: one flask is a nuisance and the
    // basket is a problem, which is the shape this enemy should have.
    dps: 6,
    seconds: 3
  }
};

export const enemyTypes = {
  light_inf: {
    // What the info box calls him. The gameplay key stays light_inf: what he is
    // called and what he does are different questions, and the balance files
    // read the second one.
    name: 'Thug',
    sprite: 'thug',
    spriteTrim: [208, 198, 96, 116],   // source px, re-paste from tools/trim.mjs
    pivot: [0.635, 0.903],   // the centre of his ground shadow
    // Knife thrust. Every enemy has two drawings now, exactly like the soldiers
    // they fight — see the trim block in data/towers.js for why the two poses
    // keep their own trims instead of sharing a union, and assets/units/README.md
    // for what has to line up between them.
    //
    // His shadow is at source (269.0, 302.8) in BOTH drawings, to the pixel, so
    // the arm straightens and nothing else moves.
    attack: { sprite: 'thug_attack', trim: [175, 198, 129, 116], pivot: [0.729, 0.903] },
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
    dead: 'dead_thug',
    deadTrim: [180, 217, 152, 78],
    deadPivot: [0.207, 0.901],
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
  // 755 -> 880 when tower reach became an ELLIPSE instead of a circle and the
  // barracks learned to gang up on one enemy. Both landed at once and both are
  // in ground.js and units.js rather than here; this number is where the two
  // were paid for.
  //
  // It is worth reading as the counter-example to the paragraph above, because
  // it went the other way and by a lot. The last three entries were 20-to-80-wide
  // bands found by scraping a knife edge. This one is 755 to 940 — 185 wide —
  // and every value in it holds the invariant. What bought that back is that the
  // two changes pull in opposite directions on the thing the band measures: the
  // ellipse costs archery 38% of its covered area, which pushes "archery alone
  // wins" a long way out of reach, while the assist makes a mix noticeably
  // stronger. The gap between the two failure modes is the band, and widening it
  // is worth more than any single value inside it.
  //
  // 880 is the middle. At it the best mixes clear with 4 to 10 lives out of 20,
  // against the 2 the level had been scraping by on and the 7 before that — so
  // this is also the wave-8 cliff getting its shoulder back, which the note above
  // asked for. Do not read the wide band as permission to stop checking: it is
  // wide because of a mechanic, and a mechanic can be tuned away again.
  heavy_inf: {
    name: 'Giant Thug',
    sprite: 'giant',
    // HIS BOX IS THE ONE THAT GREW, and it is the club rather than the man. He
    // rests with a spiked club shouldered above his head — 212 source px from
    // the top of it down past his shadow, where the body alone is about 160 —
    // and swings it out level to strike, which is why the Attack box is 70px
    // wider and 50px shorter. The man is the same size in both.
    //
    // That matters to more than the drawing: `artHeight` in render.js and
    // select.js reads this rect, so the health bar hangs above the CLUB rather
    // than above his head. Left that way deliberately. It is the honest reading
    // of "how tall is this drawing", it is what the tap box should cover, and it
    // does not move when he swings because it is read off the def rather than
    // off the pose. He is the only figure in the game it applies to.
    spriteTrim: [182, 150, 148, 212],
    pivot: [0.669, 0.931],
    // Club swung. Shadow at source (281.0, 347.3) in both drawings, to the pixel.
    attack: { sprite: 'giant_attack', trim: [98, 200, 232, 162], pivot: [0.789, 0.909] },
    spriteFaces: -1,
    dead: 'dead_giant',
    deadTrim: [117, 195, 278, 122],
    deadPivot: [0.171, 0.783],
    hp: 1500,
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
  },

  // THE FIRST ENEMY THAT DOES NOT WALK INTO THE FIGHT.
  //
  // A plague doctor with a basket of flasks on his back. He follows the road
  // like everyone else until one of your soldiers comes within throwing range,
  // then he STOPS and lobs flasks at him from further than a soldier will ever
  // walk to meet him — ENGAGE is 30 and ASSIST is 70, and he stands off at 130.
  // A barracks cannot block what will not come to it, so the counter is to shoot
  // him: he is the reason archery towers can now be told what to aim at.
  //
  // THE BASKET IS FINITE, and that is load-bearing rather than flavour. A wave
  // only ends when the field is clear (see src/waves.js), so an enemy that
  // halted out of everyone's reach and never advanced would be a soft-lock — the
  // player would be left with a board they cannot finish and no gold coming in.
  // Five flasks and then he walks in and fights like a thug, badly. So the worst
  // case is always survivable, and killing him early is worth exactly the flasks
  // he had left.
  //
  // He is deliberately weak in every other respect: slower than a thug, a third
  // of the melee damage, and dead to about three tier 1 volleys. Everything he
  // is worth is in the basket.
  plague_inf: {
    name: 'Plague Thug',
    sprite: 'plague',
    // Both poses are drawn in the SAME box — the only figure in the game where
    // that is true. He raises one arm to throw and the arm stays inside the
    // silhouette his hat and his basket already make, so the trim does not move.
    // The pivot is measured from each drawing anyway rather than shared: two
    // measurements that agree are the check, and one number used twice is not.
    spriteTrim: [191, 189, 130, 134],
    pivot: [0.385, 0.916],
    attack: { sprite: 'plague_attack', trim: [191, 189, 130, 134], pivot: [0.385, 0.916] },
    spriteFaces: -1,
    dead: 'dead_plague',
    deadTrim: [116, 207, 280, 97],
    deadPivot: [0.118, 0.826],
    // 260 -> 140, and the swap was measured rather than felt. What he costs the
    // level is almost all in his BODY rather than in his poison: with the flask
    // set to 0 damage — the spill landing and doing literally nothing — the
    // mixes still fell from 96 wins in 120 to 75, and the average finish from 6
    // lives to 3. He is another thing on the road that has to be killed before
    // the wave can end, and he spends eleven seconds standing still while the
    // column piles up behind him.
    //
    // So hp is the knob, and there is a cliff in it. Over 12 seeds, both maps
    // and every scenario tools/sim.mjs checks, one doctor a wave from wave 5:
    //
    //   no doctor at all   96/120 mixes   6.0 lives
    //   hp 140             93/120         5.0
    //   hp 180             82/120         4.4
    //   hp 220             82/120         4.3
    //   hp 260             83/120         3.6
    //
    // 140 to 180 is a step of 11 wins for 40 hp, and 180 to 260 is worth almost
    // nothing — so the interesting boundary is between 140 and 180, and it is
    // very likely "can the archery you have kill him before the basket is
    // empty". 140 is the near side of it: he costs the level about a life, which
    // is the right price for a new enemy, and the invariant never broke at any
    // value here — no pure build won a single seed.
    hp: 140,
    speed: 60,
    bounty: 30,
    leak: 1,
    damage: 6,
    atkCd: 1.2,
    // WHAT THE BOOK AND THE INFO BOX PRINT FOR HIM, and it is not `damage`.
    //
    // 6 is his melee, and it is what units.js uses on the rare occasion somebody
    // catches him. It is also the least interesting thing about him: a card
    // reading "6" next to a doctor whose flask takes 18 off a spearman would be
    // the more misleading of the two numbers, not the safer one.
    //
    // Derived from the flask rather than typed, so retuning the poison retunes
    // the card. Everything else in the game leaves this out and falls through to
    // `damage` — see shownDamage() in select.js.
    listedDamage: flask.poison.dps * flask.poison.seconds,
    r: 9,
    colour: '#4A5A3A',
    // WHAT MAKES HIM RANGED. The presence of this block is also the flag the
    // archery targeting mode reads — "ranged" means "has one of these" rather
    // than a hand-kept list of type names that a fourth enemy would have to be
    // remembered into.
    ranged: {
      // Far enough outside a squad's ASSIST that no soldier will ever wander
      // into him, and inside a tier 1 archery tower's 165 so a bow placed to
      // cover the road can always answer.
      range: 130,
      cd: 2.2,
      // What he starts with and never gets back. See the note above.
      flasks: 5
    }
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
  // Wave 5 is where the plague doctor arrives, and he arrives ALONE and LAST —
  // behind the militia and behind the heavy, so the first one the player ever
  // sees walks up to a squad that is already fighting, stops short of it, and
  // starts throwing. That is the whole lesson, taught once, with nothing else
  // new on the board to confuse it.
  //
  // He is always the last group in a wave. It is not only for the introduction:
  // "at the back of the enemy line" is a position, and the spawn order is what
  // puts him there. Sent first he would arrive at an unblocked road, walk to the
  // end and leak without ever throwing anything.
  //
  // ONE PER WAVE, and it stays one. Ramping him the way the other two ramp — 1,
  // 1, 2, 3 — was tried and measured, and it cost the level 12 more of 120 mixed
  // wins than a flat one does (81 against 93). He is not a body you add more of;
  // his effect is that the road stops while he throws, and two of those on the
  // same road is the same delay twice rather than a harder wave. Make him
  // nastier by giving him more flasks, not by sending more of him.
  { rest: 9, groups: [
      { type: 'light_inf', count: 14, gap: 0.90 },
      { type: 'heavy_inf', count: 2, gap: 2.00 },
      { type: 'plague_inf', count: 1, gap: 2.00 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 18, gap: 0.80 },
      { type: 'heavy_inf', count: 3, gap: 1.80 },
      { type: 'plague_inf', count: 1, gap: 2.00 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 24, gap: 0.70 },
      { type: 'heavy_inf', count: 4, gap: 1.60 },
      { type: 'plague_inf', count: 1, gap: 2.00 }
    ] },
  { rest: 0, groups: [
      { type: 'light_inf', count: 34, gap: 0.60 },
      { type: 'heavy_inf', count: 6, gap: 1.40 },
      { type: 'plague_inf', count: 1, gap: 2.00 }
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
