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
  // HOW WIDE THE SPILL CATCHES, and the number is measured against the shape of
  // a squad rather than against the picture of a puddle.
  //
  // Counted rather than reasoned about, on the frame each flask lands, across
  // five plots and three lanes — 130-odd landings per row:
  //
  //   splash 22   1.35 men per flask     splash 40   1.96
  //   splash 30   1.73                   splash 48   2.07
  //   splash 34   1.84                   splash 55   2.06
  //
  // It was 22, and at 22 more than half of all flasks hit exactly one man. The
  // arithmetic said they should ALWAYS hit one — the wedge in units.js stands
  // its men 40 to 42px apart and 22 reaches none of them — and the arithmetic
  // was wrong, because a squad in a fight is not standing in its wedge. That is
  // worth remembering the next time a radius looks obviously too small on paper.
  //
  // 40 is just before the knee: it catches two men most of the time and all
  // three about a quarter of the time, and everything past 44 buys almost
  // nothing. Still well under a catapult's 55 to 75 — this is a bottle, not a
  // boulder — and deliberately close to the formation's own spacing, so
  // spreading a squad out by moving its rally is a real answer to him.
  //
  // It is an ELLIPSE like every other reach in the game, through the same
  // inRange, so it covers a patch of ground rather than a circle on the screen.
  splash: 40,
  impact: 'spill',
  landSound: true,
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
    // He rests with his club shouldered and swings it out level to strike, so
    // his Attack box is much wider and a little shorter than this one. The man
    // is the same size in both; only the club moves.
    //
    // REDRAWN SHORTER. The first version of this pose held the club straight up
    // and made his box 212 source px tall against a body of about 160, which had
    // two visible consequences and both are gone: `artHeight` reads this rect,
    // so his health bar hung above the CLUB rather than his head, and the
    // encyclopedia had to shrink every figure on the page by 4% to keep him
    // inside a card. At 180 tall he is 37 x 37 game px and neither applies — the
    // bar sits just over his head like everyone else's, and the book's figure
    // scale went back to the number it was asked for.
    spriteTrim: [151, 182, 179, 180],
    pivot: [0.726, 0.918],
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
  // THE BASKET IS BOTTOMLESS AND HE NEVER STOPS WALKING, and the second half is
  // what makes the first half safe. He has been through two designs to get here
  // and both are worth knowing about, because both looked right on paper:
  //
  //   A FINITE BASKET. Five flasks and then he walks in. Simple, and it made his
  //   hp an eleven-win cliff — not because he was hard to kill but because every
  //   second he stood still was a second the wave could not end.
  //
  //   HALT ONLY BEHIND A SCREEN. He stops while another enemy is further down
  //   the road than he is. Elegant, provably could not deadlock, and it still
  //   spent his whole character on a rule whose real job was to stop him being
  //   a soft-lock.
  //
  // Neither survives. He walks the road like everything else and throws as he
  // comes, so there is nothing to stall and no guard to need: the flasks start
  // landing while he is a long way off and keep landing all the way in.
  //
  // AND HE THROWS WHILE HE IS BEING HELD. Pinning him with a soldier stops him
  // moving and starts a melee he is bad at, but it does not switch the basket
  // off — the man holding him is standing in the spill. Blocking him is a way to
  // stop him ARRIVING, not a way to make him harmless, which is the difference
  // between this enemy and every other one on the road.
  //
  // He is deliberately weak in every other respect: slower than a thug, a third
  // of the melee damage, and dead to about three tier 1 volleys. Everything he
  // is worth is in the throwing.
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
    // HIS HP BARELY MATTERS, AND THAT IS THE INTERESTING PART. Over 12 seeds,
    // both maps and every scenario tools/sim.mjs checks, one doctor a wave from
    // wave 5, against a 96/120 and 6.0 lives baseline with no doctor at all:
    //
    //   hp 140   89/120 mixes   4.9 lives      hp 320   87/120   4.8
    //   hp 200   86/120         5.0            hp 400   85/120   4.8
    //   hp 260   80/120         4.6
    //
    // Flat, and not even monotonic — 260 dips and 320 comes back, which is the
    // signature of seed noise rather than of a lever. He costs the level about
    // seven wins and a life whatever he is made of.
    //
    // It was NOT flat when he had a finite basket and halted for as long as he
    // had flasks: then 140 gave 93 wins and 180 gave 82, an eleven-win cliff for
    // 40hp. What the cliff measured was how long he stood on the road, not how
    // hard he was to kill — a wave only ends when the field is clear, so an
    // enemy that will not advance is worth far more than one that will. Bounding
    // the halt with "is anybody still ahead of me" took that lever away, and
    // what is left is a body like any other.
    //
    // So this number is free, and it is set for how he should FEEL: 200 is two
    // and a half thugs, which is enough that he has to be focused rather than
    // brushed aside, and nothing like a Giant Thug. Move it as you like — no
    // pure build won a single seed anywhere in the range above.
    hp: 200,
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
      // into him, and inside a tier 1 archery tower's 190 so a bow placed to
      // cover the road can always answer.
      range: 130,
      cd: 2.2
    }
  }
};
// A WAVE TABLE BELONGS TO A LEVEL, and there are two of them now.
//
// Maps 1 and 2 share the eight below; map 3 has ten of its own further down.
// Each level names which one it runs, so the tables live here beside the enemy
// stats the difficulty is actually held with rather than being scattered across
// three level files.
//
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

// MAP 2'S EIGHT. It ran the table above until the `march` multiplier came out.
//
// `march` was a per-level factor on every enemy's speed, and map 2 carried 0.62:
// its road is 1060px against map 1's 1768, so the same wave got 60% as long
// under fire, and slowing the column was how the second map was made as hard as
// the first while both shared one table. Waves are per-level now, so the map can
// be balanced by what it sends instead of by how fast a Thug walks — and a Thug
// walks at 70px/s everywhere, which is what it should always have been.
//
// The shortfall is real and has to be paid for here instead. Searched
// exhaustively over all 5376 ways of putting six towers of two families on nine
// plots, as the share that clears the map, against map 1's 24 of 448 = 5%:
//
//   heavies                 militia x0.9      x0.8            x0.7
//   map 1's, 1,2,3,4,6         62 =  1%      106 =  2%    116 =  2%  BROKE
//   one step down, 1,1,2,3,5  294 =  5%      448 =  8%    589 = 11%  BROKE
//   two steps down, 1,1,2,3,4  354 =  7%      574 = 11%    830 = 15%  BROKE
//
// THIS TABLE IS THE 294. Only four of the nine hold the invariant at all, and
// of those four this is the one nearest map 1's 5% — 1% and 2% are a harder map
// than map 1, and 7% an easier one.
//
// AND THE SHIPPED TABLE RE-MEASURED AFTERWARDS: 212/5376 = 4%. The grid rows are
// a search over MULTIPLIED tables — militia x0.9 of map 1's, rounded by the
// search — and the counts below are the hand-written version of that row, which
// is not the same integers. The grid is what picked the row; 4% is what the map
// actually is, and it is still the nearest of the four to map 1's 5%.
//
// Map 3's note below draws the same distinction and it is worth stating once
// for both: a grid row is a candidate, not a measurement of what shipped.
//
// TWO THINGS THE GRID SAYS, and the second is the one to remember:
//
// Cutting militia does not work. Every single x0.8 and x0.7 column breaks the
// invariant whatever the heavies do, because thinning the screen is what lets a
// pure-barracks build hold the junction alone — the blockers stop being
// overwhelmed and the map stops needing anything else.
//
// What a short road cannot absorb is HEAVIES. They are slow, so map 1 gives them
// 34 seconds under fire and this map 20, and one step off the ramp is worth more
// than a fifth off every militia group: 62 to 294 wins against 62 to 106.
//
// Map 3 needed the same correction for the same reason. Two maps in a row have
// said it now: on a short road, tune the heavies.
export const wavesFork = [
  { rest: 9, groups: [{ type: 'light_inf', count: 4, gap: 1.60 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 5, gap: 1.40 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 11, gap: 1.10 }] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 9, gap: 1.00 },
      { type: 'heavy_inf', count: 1, gap: 2.00 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 13, gap: 0.90 },
      { type: 'heavy_inf', count: 1, gap: 2.00 },
      { type: 'plague_inf', count: 1, gap: 2.00 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 16, gap: 0.80 },
      { type: 'heavy_inf', count: 2, gap: 1.80 },
      { type: 'plague_inf', count: 1, gap: 2.00 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 22, gap: 0.70 },
      { type: 'heavy_inf', count: 3, gap: 1.60 },
      { type: 'plague_inf', count: 1, gap: 2.00 }
    ] },
  { rest: 0, groups: [
      { type: 'light_inf', count: 31, gap: 0.60 },
      { type: 'heavy_inf', count: 5, gap: 1.40 },
      { type: 'plague_inf', count: 1, gap: 2.00 }
    ] }
];

// MAP 3'S TEN, AND THEY ARE SMALLER THAN THE EIGHT ABOVE, NOT BIGGER.
//
// That is the opposite of where this table started, and the wrong version is
// worth recording because the reasoning behind it sounds right. Map 3's roads
// never meet, so a wave of twenty arrives as two tens — half the pressure in any
// one place — and it has ten plots to the others' nine. Both true, and the
// conclusion drawn from them, that the waves should be a third BIGGER, was
// exactly backwards. Every build died on wave 4.
//
// What the split actually costs is the DEFENCE, not the attack. Six towers on
// map 1 all shoot at the one road; ten towers here are five per road at best,
// and three of the ten plots sit between the roads and cover both while the
// other seven cover one. So the honest comparison is per road, and per road this
// map fields about half of what map 1 does.
//
// So the OPENING is gentler than map 1's and the ENDGAME is not. Waves 1-6 sit
// below the eight-wave table because the player is buying twice as much board
// with the same purse; waves 7-10 run 3, 4, 5 and 6 heavies, which is map 1's
// ramp arriving two waves later.
//
// 172 enemies over ten waves against map 1's 142 over eight. Every number here
// was found by exhaustively searching all 1024 ways of assigning two families to
// the ten plots — the same yardstick the other maps are held to, where the
// measure is what share of ALL builds clear the level.
//
// The search, which picked this table:
//
//   gentle open, heavies 1,1,2,2,3,4, 260 gold    277/1024 = 27%
//   the same at 220 gold                          219/1024 = 21%
//   heavies 1,1,2,3,4,5, more militia, 260        179/1024 = 17%
//   the same at 220 gold                          115/1024 = 11%
//   this table (heavies 1,2,3,4,5,6), 260 gold     43/1024 =  4%
//
// AND THE SHIPPED TABLE RE-MEASURED AFTERWARDS: 107/1024 = 10%, against map 1's
// 24/448 = 5%. The five rows above were run under sim.mjs's old flat 900-second
// stuck threshold and are comparable with each other; 900 is right for eight
// waves and cuts ten short, so it was counting map 3's slowest winners as
// neither wins nor losses. The threshold is per-wave now and 10% is the honest
// figure. Map 1's own number did not move — eight waves at 112 each is 896.
//
// Twice map 1's share rather than equal to it, and left there: the step from
// this table to the next one down was 27% to 4% under the old measure, so there
// is no setting in between to reach for, and of the two the more forgiving one
// is the right side to miss on for the map with the most going on.
//
// ONE NUMBER REFUSED TO MOVE and it is worth knowing about before retuning this:
// the BEST mix finishes on 18 or 19 lives of 20 at every setting above, where
// map 1's best finishes on 10. Harder waves cut the share of builds that win
// without touching the ceiling at all. That is this map's shape rather than a
// failure to tune it — ten plots across two roads, three of which cover both,
// is a far wider spread between a build that thinks about both roads and one
// that does not than nine plots on one road can produce. Waves hard enough to
// bring the ceiling down to map 1's would leave almost nothing winnable.
//
// Waves 1-4 are militia only and teach the map, which takes a wave longer here
// than elsewhere: the lesson is not "enemies walk down a road", it is "there are
// two roads and you cannot cover both yet".
export const wavesLong = [
  { rest: 9, groups: [{ type: 'light_inf', count: 4, gap: 1.60 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 6, gap: 1.40 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 9, gap: 1.20 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 11, gap: 1.05 }] },
  // The first heavy, alone and last, exactly as it arrives on the other maps.
  { rest: 9, groups: [
      { type: 'light_inf', count: 10, gap: 1.00 },
      { type: 'heavy_inf', count: 1, gap: 1.90 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 12, gap: 0.95 },
      { type: 'heavy_inf', count: 2, gap: 1.90 }
    ] },
  // And the first doctor, a wave after the first heavy rather than beside it —
  // two new things in one wave is one of them unnoticed.
  { rest: 9, groups: [
      { type: 'light_inf', count: 16, gap: 0.85 },
      { type: 'heavy_inf', count: 3, gap: 1.90 },
      { type: 'plague_inf', count: 1, gap: 2.00 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 20, gap: 0.78 },
      { type: 'heavy_inf', count: 4, gap: 1.90 },
      { type: 'plague_inf', count: 1, gap: 2.00 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 26, gap: 0.70 },
      { type: 'heavy_inf', count: 5, gap: 1.90 },
      { type: 'plague_inf', count: 1, gap: 2.00 }
    ] },
  { rest: 0, groups: [
      { type: 'light_inf', count: 32, gap: 0.62 },
      { type: 'heavy_inf', count: 6, gap: 1.90 },
      { type: 'plague_inf', count: 2, gap: 2.00 }
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
