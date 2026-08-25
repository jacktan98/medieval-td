import { arrow } from './towers.js';

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
// THE ARROW AN ENEMY LOOSES, and it is the tower's arrow to the pixel.
//
// Spread from `arrow` in data/towers.js rather than written out, because it IS
// that drawing: the artist renamed the file from Archery_Arrows_T1 to
// Archer_Arrows for exactly this reason — one arrow, loosed by both armies. What
// differs is not the shaft but who it is pointed at, and that is `side` on the
// shot rather than anything here.
//
// It keeps `kind: 'arrow'` with everything else, which costs nothing and is
// checked: `killedBy` is only read for an ENEMY's death, and no enemy can be
// killed by this — it is aimed at soldiers and nothing else. The kind is what
// makes it silent on arrival, the same as the tower's.
export const enemyArrow = { ...arrow };

// WHAT THE GLASS ITSELF DOES, to the one man it was aimed at. Written once here
// because three places need it to agree: the ammunition's damage, the card the
// encyclopedia prints, and the doctor's own club — which the owner set to the
// same number so that what he does no longer depends on where he is standing.
export const FLASK_HIT = 20;

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
    // Per second, for this many seconds. 5 x 4 is 20 health — a fifth of a
    // spearman and an eighth of a swordsman.
    //
    // IT WAS 6 x 3, WHICH IS 18, and the total is the number that was asked to
    // move rather than either factor. 5 x 4 is the pair that hits 20 exactly
    // while keeping the shape: a trickle a man can walk out of, rather than a
    // hit. 10 x 2 reaches 20 too and would make it a blow, and 6.67 x 3 reaches
    // it while printing 20.000000000000004 on the enemy's card.
    //
    // The extra second is not free and is worth knowing about: the spill on the
    // ground lasts exactly as long as the poison does, so the patch he leaves is
    // now dangerous a third longer as well as adding up to more.
    dps: 5,
    seconds: 4
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
    bounty: 15,
    leak: 1,        // lives lost if it reaches the keep
    damage: 10,     // per swing, once a barracks soldier has stopped it
    // 9 -> 10, and it lands on the family it is aimed at: a militiaman's swing
    // is the thing that kills blockers, and blockers are what maps 2 and 3 are
    // held by. One point on a 1.0s clock is a tenth more pressure on every squad
    // in the game, which is a bigger change than it looks beside a 100hp
    // spearman.
    atkCd: 1.0,
    r: 8,
    colour: '#B98B5E'
  },

  // THE ARCHER, and he is the first enemy who is dangerous at a distance the
  // player's own line cannot answer with position alone.
  //
  // A plague doctor throws 130px, which is inside a tier 1 bow's 190 — put a
  // tower on the road and you can always shoot back. This one looses 260, which
  // is a Ballista Turret's whole reach, so there are stretches of every map where
  // he is hitting your men and nothing you own is hitting him. What answers him
  // is a tower placed for HIM rather than for the road, or a squad sent out to
  // pin him, and that is the decision he exists to force.
  //
  // TWO STANCES, and he is the reason the pose model grew one. Every other figure
  // in this game has a Default it stands in and an Attack it strikes in; he has a
  // pair of each — bow drawn and loosing at a distance, bow held as a club and
  // swinging it close. See `melee` below, and drawEnemy in render.js for which is
  // shown when.
  archer_inf: {
    name: 'Archer Thug',
    // THE RANGED PAIR IS HIS DEFAULT, because it is what he does on the road and
    // what he should be portrayed as: an archer. The encyclopedia, the info box
    // and the wave preview all read `sprite` and `spriteTrim`, and a card showing
    // him clubbing somebody would name the wrong enemy.
    sprite: 'archer_ready',
    spriteTrim: [175, 196, 162, 120],
    pivot: [0.546, 0.904],
    attack: { sprite: 'archer_loose', trim: [195, 196, 142, 120], pivot: [0.479, 0.898] },
    // AND THE CLOSE PAIR, shown only while a soldier is holding him. Both halves
    // are here rather than one: unlike the doctor, this figure stands differently
    // when the bow is a club, so his Default changes with his Attack.
    melee: {
      default: { sprite: 'archer', trim: [207, 164, 130, 152], pivot: [0.392, 0.924] },
      attack: { sprite: 'archer_attack', trim: [175, 200, 162, 116], pivot: [0.512, 0.901] }
    },
    spriteFaces: -1,
    dead: 'dead_archer',
    deadTrim: [149, 218, 214, 76],
    deadPivot: [0.161, 0.875],
    // LIGHTER THAN THE DOCTOR, at 110 against 150, and for the same reason the
    // doctor is lighter than a giant: everything he is worth is in the shooting,
    // and a body that also had to be chewed through would make him the thing a
    // wave is built around rather than the thing that makes a wave awkward.
    hp: 110,
    // Between the militia's 70 and the doctor's 60. He is not a wall and not a
    // straggler; he walks with the wave and starts working before it arrives.
    speed: 65,
    // Above a militiaman's 15 and below the doctor's 30. He is harder to reach
    // than the first and easier than the second, and the bounty is what a player
    // is paid for building the tower that can.
    bounty: 25,
    leak: 1,
    // HIS CLUB HITS FOR WHAT HIS ARROW HITS FOR, at the owner's word: 15 either
    // way. The first version had him weak at arm's length on the reasoning that a
    // bow is a bad club, and the owner's rule is the plainer one — an archer thug
    // does 15, and where he is standing decides only whether it arrives as an
    // arrow or as a swing.
    //
    // It makes him a real threat to a blocker rather than a nuisance: 15 on a
    // 1.1s clock is 13.6 a second into the man holding him, against a militiaman's
    // 10 a second. Pinning him is now a decision rather than a free answer.
    damage: 15,
    atkCd: 1.1,
    // The card prints 15 and both numbers ARE 15, so this is the one figure it
    // could print. Kept explicit rather than deleted: `damage` and the arrow are
    // two different fields that happen to agree, and the day one of them moves the
    // card should keep saying what the arrow does.
    listedDamage: 15,
    r: 8,
    colour: '#7A6A46',
    ranged: {
      // TWICE THE DOCTOR'S 130, at the owner's word, and it is the whole enemy.
      range: 260,
      // BUT HE WALKS IN TO 130 BEFORE HE STOPS, and the two numbers being
      // different is deliberate rather than an oversight.
      //
      // `range` is how far he can hit; `stopAt` is how close he insists on being
      // before he plants himself. If they were both 260 he would stand where no
      // squad could reach him — a barracks leashes its men to their own tower —
      // and on any plot where no tower covered that patch of road he would stand
      // there shooting forever. A wave only ends when the field is clear, so that
      // is not a hard enemy, it is a hung game.
      //
      // At 130 he closes to the doctor's distance before halting, which keeps him
      // answerable by the family he is aimed at: a soldier can walk out and pin
      // him. He simply opens fire long before he gets there, which is what
      // "shoots twice as far" buys.
      stopAt: 130,
      cd: 2.0,
      // 15 a shot at 2 seconds is 7.5 a second on one man, against the doctor's
      // 6 — and unlike the poison it is damage rather than a debuff, so it stacks
      // with everything else on the road and a regenerating squad does not shrug
      // it off.
      damage: 15,
      ammo: enemyArrow
    }
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
    // 1500 -> 1000, and 18 -> 30 damage in the same pass. That pair is the
    // single biggest change this file has taken, and it is worth being explicit
    // that the two halves pull in OPPOSITE directions: a third less health makes
    // him easier to kill, and two-thirds more damage makes him far worse to
    // leave alive. He has gone from a wall you grind down to a thing that kills
    // the man holding him.
    //
    // A tier 1 spearman has 100 health and 30 damage a swing on a 1.2s clock
    // kills him in four — under five seconds, against a respawn of eight. One
    // giant now beats one squad outright, where before it was the other way
    // round given long enough. What answers him is a tower rather than a wall,
    // which is the shape the change asks for.
    hp: 1000,
    speed: 52,      // slower than the militia, so it arrives as a second wall
    bounty: 40,
    leak: 2,        // worth two lives: letting one through really hurts
    damage: 30,
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
  // then he STOPS and lobs flasks at him from outside anything a squad reaches by
  // standing still — ENGAGE is 30 and ASSIST is 70, and he stands off at 130. The
  // counter is to shoot him: he is the reason archery towers can be told what to
  // aim at, and the monastery has the same button now.
  //
  // NOTHING ABOUT HIM IS RATIONED, and that is the current shape. The basket
  // never empties, he throws walking, standing and pinned, and he does not
  // advance for as long as there are men in front of him. It took four goes:
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
  //   A PATIENCE. Fourteen seconds of standing still, spent once, and then he
  //   walked into the line whatever was in it. It worked, and it read as a man
  //   losing his nerve on a timer — the one thing he does that the player can see
  //   was governed by a number nobody could see.
  //
  // In between those he simply walked and threw as he came, which could not stall
  // and was not this enemy: a thrower who closes to melee is a thug with a longer
  // reach, and the man he is supposed to be dangerous to walked out and pinned
  // him.
  //
  // NOW THE BOUND IS THE OTHER ARMY, which is where it belonged. A soldier with
  // nothing else to do walks out to a thrower who will not come to him — one man,
  // the rest hold the line, see the closing pass in units.js — and being pinned is
  // a fight the doctor loses, because enemies do not heal. So a wave still always
  // ends, and what ends the standoff is something you can watch happen.
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
    // THE THROW is his `attack`, because throwing is what he does on the road —
    // the same rule the archer follows, where the ranged pair is the default pair.
    // It is the drawing that used to be called Attack; the artist renamed the file
    // to Ranged_Attack when he drew the second one.
    attack: { sprite: 'plague_throw', trim: [191, 189, 130, 134], pivot: [0.385, 0.916] },
    // AND THE CLOSE ONE, shown while a soldier is holding him. No `default` here,
    // unlike the archer's: the artist drew one standing pose that serves both, so
    // the doctor pinned in a melee stands exactly as he stands throwing and only
    // his swing is its own drawing.
    melee: {
      attack: { sprite: 'plague_attack', trim: [174, 189, 147, 134], pivot: [0.456, 0.916] }
    },
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
    // 200 -> 150. He was the second-toughest thing on the road and he is the one
    // enemy whose whole job is to be difficult to reach, which is a fair amount
    // of both. The standoff is what makes him dangerous, not his health.
    hp: 150,
    // WHAT HE IS A COUNTER TO, because it is the opposite of what it looks like.
    //
    // He was added to punish a line of soldiers, and he does — from range, over
    // the fight, poisoning men who cannot reach him. But ADDING MORE OF HIM TO A
    // WAVE MAKES A WALL OF BARRACKS STRONGER, not weaker, and so does making him
    // better at what he is for. Map 3's pure-barracks build goes from 4 wins in
    // 20 seeds to 8 when he learns to stand off.
    //
    // Two reasons, and the second is the one that keeps being underestimated.
    //
    // HE NEVER ARRIVES. He stops to throw, a blocker pins him where he stands,
    // and he pays a 30 bounty — the largest in the game — to the family that can
    // hold him all day. He punishes a THIN line, where his poison outpaces the
    // regen of the two or three men actually holding the road, and he feeds a
    // deep one.
    //
    // AND HE STRINGS THE WAVE OUT. A wave ends when the field is clear, so every
    // second he spends not advancing is a second the line behind him gets to
    // regenerate and re-muster. That is arrival rate — the one lever that beats a
    // wall of blockers — being given back, and it is worth more than his poison
    // takes. Raising the poison from 6 to 8 dps changes the pure-barracks rate
    // not at all: 16 health a second into a squad regenerating 12 is not the
    // difference between winning and losing.
    //
    // So he is not the lever for "barracks are too strong on this map", and
    // making him nastier moves it the wrong way. That lever is arrival rate; see
    // the grid over wavesLong.
    speed: 60,
    bounty: 30,
    leak: 1,
    // HIS MELEE MATCHES HIS FLASK, at the owner's word: 20 either way, where it
    // used to be 5 against the flask's 20. He is no longer harmless once he is
    // caught — a squad that pins him is now trading real damage for the poison it
    // is stopping, which is the trade the owner wants that decision to be.
    //
    // AND THE SWING HITS ONE MAN. The flask is the thing with a splash; a club is
    // a club. That falls out of where the two live rather than from a flag — the
    // melee is `u.foe.def.damage` applied to the one soldier holding him in
    // units.js, and the splash belongs to the ammunition — but it is the owner's
    // condition, so it is written down.
    damage: 20,
    atkCd: 1.2,
    // WHAT THE BOOK AND THE INFO BOX PRINT FOR HIM: the blow, which is now the
    // same number whichever way it arrives — 20 from the club, 20 from the glass.
    //
    // IT LEAVES THE POISON OUT, and that is a choice worth naming. The man he
    // throws at actually takes 40: the flask itself and then the spill it leaves
    // under him. But the spill is what everyone standing in the patch takes and
    // the card is one number, so it prints the blow — the same reading as every
    // other enemy's card, where the figure is what one hit does.
    //
    // It used to print the poison instead, back when the flask did no damage of
    // its own and 6 beside a doctor who took 18 off a spearman was the more
    // misleading of the two. Both halves are 20 now and the choice is easier.
    listedDamage: FLASK_HIT,
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
      cd: 2.2,
      // WHAT LEAVES HIS HAND, and it moved here from the throwing code when the
      // archer arrived: `loose` in src/enemies.js reads the ammunition off the
      // enemy now, so a second thrower needed no branch.
      ammo: flask,
      // AND THE GLASS ITSELF HURTS NOW, at the owner's word: 20 on the man it was
      // aimed at, and only him, on top of the 20 the spill does over four seconds
      // to everyone standing in it. It was 0 — the flask was pure poison — and
      // the doctor's card has always read 20, so this is the throw finally doing
      // what the card says at the moment it lands as well as over the seconds
      // after. See land() in src/projectiles.js, where the aimed man is the one
      // the blow is applied to and the patch is everybody's.
      damage: FLASK_HIT,
      // NO `standoff` ANY MORE, and its absence is a design decision rather than
      // a tidy-up. It was a patience: 14 seconds of not advancing, spent once,
      // after which he walked into the line whatever was standing in it. The
      // basket was unlimited and the TIME was rationed, because a wave ends when
      // the field is clear and an enemy who will not advance can hang a game.
      //
      // Now nothing about him is rationed. He stands off for as long as there are
      // men in front of him, and what ends it is the other army: a soldier with
      // nothing better to do walks out to a thrower who will not come to him, and
      // once he is pinned he is in a fight he loses, because enemies do not heal.
      // The bound moved from a number he carries to a rule about the two sides —
      // src/enemies.js has the argument in full, and src/units.js has the pass.
      //
      // WHAT THIS COSTS THE PLAYER is the standoff being answerable by the family
      // it was written to punish, which is the point of the change: pinning him
      // is now something you do rather than something you wait for. It still
      // costs a man off the road for as long as the walk takes, and he still
      // throws the whole way there and from inside the melee afterwards.
      //
      // THE OLD LENGTH MEASURED AS NOTHING, which is worth keeping in view before
      // anyone reintroduces a timer. Pure barracks on map 3 over twenty seeds:
      // 7/20 at a 6-second standoff, 10/20 at 10, 8/20 at 14 — flat inside the
      // noise, and map 2 said the same (6, 8, 8). What costs the defence-breaking
      // is standing off AT ALL, not how long for.
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
      { type: 'archer_inf', count: 1, gap: 1.80 },
      { type: 'plague_inf', count: 1, gap: 2.00 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 18, gap: 0.80 },
      { type: 'heavy_inf', count: 3, gap: 1.80 },
      { type: 'archer_inf', count: 1, gap: 1.80 },
      { type: 'plague_inf', count: 1, gap: 2.00 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 24, gap: 0.70 },
      { type: 'heavy_inf', count: 4, gap: 1.60 },
      { type: 'archer_inf', count: 2, gap: 1.70 },
      { type: 'plague_inf', count: 1, gap: 2.00 }
    ] },
  { rest: 0, groups: [
      { type: 'light_inf', count: 34, gap: 0.60 },
      { type: 'heavy_inf', count: 6, gap: 1.40 },
      { type: 'archer_inf', count: 2, gap: 1.60 },
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
//
// THIS MAP'S INVARIANT DOES NOT HOLD EITHER, and the true figure is worse than
// the one it was left at. Pure barracks clears the junction on 1 seed in 20 as
// the table shipped, and on 8 in 20 now that the plague doctor stands off rather
// than walking into the line — the same doubling map 3 shows, for the same
// reason, and see the grid over wavesLong for the mechanism. The grid above is
// still the right search; what it is missing is that every one of its `BROKE`
// judgements came from five seeds. `node tools/sweep.mjs 2` runs twenty now.
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
      { type: 'archer_inf', count: 1, gap: 1.80 },
      { type: 'plague_inf', count: 1, gap: 2.00 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 16, gap: 0.80 },
      { type: 'heavy_inf', count: 2, gap: 1.80 },
      { type: 'archer_inf', count: 1, gap: 1.80 },
      { type: 'plague_inf', count: 1, gap: 2.00 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 22, gap: 0.70 },
      { type: 'heavy_inf', count: 3, gap: 1.60 },
      { type: 'archer_inf', count: 2, gap: 1.70 },
      { type: 'plague_inf', count: 1, gap: 2.00 }
    ] },
  { rest: 0, groups: [
      { type: 'light_inf', count: 31, gap: 0.60 },
      { type: 'heavy_inf', count: 5, gap: 1.40 },
      { type: 'archer_inf', count: 2, gap: 1.60 },
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
// 172 enemies over ten waves against map 1's 142 over eight. What is different
// about the late waves is not how many arrive but HOW FAST — every gap from
// wave 5 on is 0.65 of what it reads like elsewhere, and that is the number
// holding the level invariant up. See the grid further down before touching it.
//
// Every number here was found by exhaustively searching all 1024 ways of
// assigning two families to the ten plots — the same yardstick the other maps
// are held to, where the measure is what share of ALL builds clear the level.
//
// The search, which picked this table:
//
//   gentle open, heavies 1,1,2,2,3,4, 260 gold    277/1024 = 27%
//   the same at 220 gold                          219/1024 = 21%
//   heavies 1,1,2,3,4,5, more militia, 260        179/1024 = 17%
//   the same at 220 gold                          115/1024 = 11%
//   the one that shipped (heavies 1,2,3,4,5,6), 260 43/1024 =  4%
//
// (Same heavies today. What the redraw moved was the GAPS — see further down.)
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
// ---------------------------------------------------------------------------
// THEN THE MAP WAS REDRAWN, AND THE SHARE WAS THE SMALLER PROBLEM.
//
// The artist moved eight of the ten plot markers and adjusted both roads. The
// roads came out the same length, so the pace is unchanged — but several
// markers ended up much nearer the tarmac, and a tower that stands closer
// covers more road. Nothing in the code changed; the board got easier.
//
// The share went from 107/1024 = 10% to 189 = 18%, and the old artwork still
// measures 107 under current code, so the redraw was the whole cause. But
// chasing that number back is not what this table is for now. THE REDRAW BROKE
// THE INVARIANT: a pure-barracks build clears the map on its own.
//
// It had been broken for a while before anyone could see it, because
// tools/sweep.mjs was reading `stuck` as `lost` — and pure barracks is the
// build that stalls, so it was the build that verdict flattered. See the
// pure-build re-check at the end of sweep.mjs. Ten plots, all now within reach
// of two roads, is thirty renewable blockers covering the whole board.
//
// EVERY LEVER, MEASURED. Share is builds-that-win of 1024; `pure B` is how many
// of five seeds a pure-barracks build clears with the clock taken off.
//
//                                        share   pure B
//   old artwork, old table                 10%     0/5   <- what it was
//   new artwork, old table                 18%     3/5
//   +1 heavy in the last four waves        10%     2/5
//   +1 heavy in every wave from 4           5%     -
//   start gold 260 -> 220                  12%     -
//   militia x1.5 from wave 5                -      1/5
//   militia x1.8 from wave 5                -      0/5
//   more plague doctors                     -      3/5   <- WORSE
//   gaps x0.70 from wave 5                  4%     1/5
//   gaps x0.65 from wave 5                  3%     0/5   <- this
//   gaps x0.65 + gold 300                  11%     2/5
//   gaps x0.65 + gold 360                  14%     1/5
//
// FOUR THINGS THAT GRID SAYS, and none of them was the expected answer:
//
// Heavies do not fix it. They were the right lever for the SHARE and they are
// the wrong one for the wall — 1500hp arriving one at a time is what a line of
// blockers is for.
//
// MORE PLAGUE DOCTORS MAKES IT WORSE, which is the most useful thing here. A
// doctor stops to throw and a blocker pins him, so he never reaches the keep:
// he pays his bounty and applies no pressure. Against a wall of blockers he is
// free money. He is a counter to a THIN line, not a deep one.
//
// Gold cannot buy the share back, because gold buys towers and a pure-barracks
// build spends it on more blockers. Both gold rows re-break the invariant.
//
// What works is ARRIVAL RATE. Thirty blockers hold anything that arrives one at
// a time and nothing that arrives faster than they can re-engage, and the edge
// is sharp: 0.70 breaks, 0.65 holds. So the gaps from wave 5 on are multiplied
// by 0.65 — same enemies, same counts, arriving closer together.
//
// IT COSTS THE SHARE AND THERE IS NO WAY ROUND IT. 34/1024 = 3% against map 1's
// 5%, and every attempt to buy it back above re-broke the wall. What overwhelms
// thirty blockers overwhelms everyone. That is the real cost of ten plots that
// all reach the road, and it is a level-design fact rather than a tuning one:
// the honest choices on this board are a hard map or a broken one.
//
// ---------------------------------------------------------------------------
// AND THEN THE GRID ABOVE TURNED OUT TO BE MEASURED WITH A RULER THAT IS TOO
// SHORT. Every `pure B` figure in it is out of FIVE seeds, and five is not
// enough to tell 5% from 40% on this map. Re-measured over twenty:
//
//                                        pure B (of 20)
//   this table, as it shipped                4/20   <- called 0/5 at the time
//   the same, with the doctor standing off   8/20   <- this
//   gaps x0.90 on top                        3/20
//   gaps x0.80 on top                        2/20
//   flask poison 6 -> 8 dps                  8/20
//   standoff 14s -> 6s                       7/20
//   shorter rests                            9/20
//
// SO IT NEVER HELD. "gaps x0.65 -> 0/5" was five seeds of luck, and the level
// has been a coin-flip for a pure-barracks build since the redraw. The `stuck`
// bug hid this once and a small sample hid it again; tools/sweep.mjs now runs
// twenty seeds and prints the rate rather than a verdict alone.
//
// The doctor's standoff doubles it, and the reason is not his poison. An enemy
// that stops 130px short is an enemy NOT standing in a blocker's face during the
// crunch, and the wave behind him arrives more strung out — which is arrival rate,
// this map's one real lever, being handed back. Note what the grid says about the
// alternatives: poison does nothing to a wall (16hp/s into a squad regenerating 12
// is not the difference between winning and losing), and a shorter standoff barely
// helps, because the cost is in standing off at all.
//
// The rows above were measured when the standoff was a 14-second budget. It is
// now open-ended and ended by a soldier walking out to him instead, which cuts the
// stall to about the length of that walk — so the "standing off at all" cost is
// still there and the strung-out wave behind it is smaller than these rows say.
//
// WHAT WOULD FIX IT is more of the same lever — gaps x0.80 on top of the 0.65
// already there takes it to 2/20 and map 2 to 1/20 — and that is a real
// difficulty change to two maps, made while the owner is play-testing one of
// them. It is not applied here. This note is the measurement; the decision is
// the owner's.
//
// The shape is otherwise still right — 6+4 loses, 5+5 through 1+9 win, best mix
// on 15 lives — so it is a hard map with one family able to cheat it, rather
// than a broken one.
//
// ONE NUMBER BARELY MOVES and it is worth knowing about before retuning this:
// the BEST mix finishes on 17 to 19 lives of 20 at every setting above, where
// map 1's best finishes on 10. Harder waves cut the share of builds that win
// while hardly touching the ceiling. That is this map's shape rather than a
// failure to tune it — ten plots across two roads, four of which cover both,
// is a far wider spread between a build that thinks about both roads and one
// that does not than nine plots on one road can produce. Waves hard enough to
// bring the ceiling down to map 1's would leave almost nothing winnable.
//
// The redraw did not change that either. It moved the share from 10% to 18%,
// tightening the gaps moved it to 3%, and through all of it the best mix has
// finished on 17 to 19 lives. Fifteen points of win rate, two lives of ceiling.
// If this map ever needs to feel less punishing, the ceiling is not where the
// room is — the room is in how many builds reach it.
//
// Waves 1-4 are militia only and teach the map, which takes a wave longer here
// than elsewhere: the lesson is not "enemies walk down a road", it is "there are
// two roads and you cannot cover both yet".
export const wavesLong = [
  { rest: 9, groups: [{ type: 'light_inf', count: 4, gap: 1.60 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 6, gap: 1.40 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 9, gap: 1.20 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 11, gap: 1.05 }] },
  // WAVE 5 IS WHERE THE BACK RANK ARRIVES, on this map as on the other two: the
  // first heavy, the first archer and the first doctor together. It used to be
  // the heavy alone here and the doctor two waves later, on the rule that two new
  // things in one wave is one of them unnoticed — the owner has since asked for
  // both throwers from wave 5 everywhere, which is a deliberate step up on the
  // map they can already finish without losing a life.
  { rest: 9, groups: [
      { type: 'light_inf', count: 10, gap: 0.65 },
      { type: 'heavy_inf', count: 1, gap: 1.23 },
      { type: 'archer_inf', count: 1, gap: 1.30 },
      { type: 'plague_inf', count: 1, gap: 1.30 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 12, gap: 0.62 },
      { type: 'heavy_inf', count: 2, gap: 1.23 },
      { type: 'archer_inf', count: 1, gap: 1.30 },
      { type: 'plague_inf', count: 1, gap: 1.30 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 16, gap: 0.55 },
      { type: 'heavy_inf', count: 3, gap: 1.23 },
      { type: 'archer_inf', count: 2, gap: 1.30 },
      { type: 'plague_inf', count: 1, gap: 1.30 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 20, gap: 0.51 },
      { type: 'heavy_inf', count: 4, gap: 1.23 },
      { type: 'archer_inf', count: 2, gap: 1.30 },
      { type: 'plague_inf', count: 1, gap: 1.30 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 26, gap: 0.45 },
      { type: 'heavy_inf', count: 5, gap: 1.23 },
      { type: 'archer_inf', count: 3, gap: 1.30 },
      { type: 'plague_inf', count: 1, gap: 1.30 }
    ] },
  { rest: 0, groups: [
      { type: 'light_inf', count: 32, gap: 0.40 },
      { type: 'heavy_inf', count: 6, gap: 1.23 },
      { type: 'archer_inf', count: 3, gap: 1.30 },
      { type: 'plague_inf', count: 2, gap: 1.30 }
    ] }
];

// --- THE EXTENDED TABLES -------------------------------------------------------
//
// A second length for every map: the shipped table with TWO MORE WAVES on the
// end, and more of the two throwers throughout. The tables above are what the
// title screen now calls Normal; this is Extended.
//
// DERIVED RATHER THAN WRITTEN OUT, and that is a decision worth defending. Three
// hand-written tables of ten and twelve waves would be sixty rows of numbers that
// have to be kept in step with the sixty above them by hand — and every balance
// note in this file is about the SHAPE of a ramp rather than about one row of it.
// One rule that continues the ramp keeps a single source of truth: retune wave 7
// of map 2 and its extended twin follows.
//
// What the rule is:
//
//   FROM WAVE 5 ON, one more archer and one more doctor than the normal table
//   sends. That is the owner's "more archer thugs and plague thugs", and it lands
//   where both of them already exist rather than introducing either earlier.
//
//   TWO MORE WAVES, continuing the militia and heavy ramp at the rate the last
//   two normal waves set rather than at a rate invented here. Map 1's last two
//   are 24 and 34 militia, so the ramp is x1.42 a wave, and the extended pair
//   carries on from 34. Heavies use their own ratio the same way. Anything that
//   ramps by 1 a wave — the throwers — steps by 1.
//
//   AND THE OLD LAST WAVE GETS ITS REST BACK. `rest: 0` on the final wave is what
//   says "nothing follows"; a wave that now has two behind it needs the breather
//   every other wave has, or the two extra waves arrive on top of it.
//
// `node tools/preview.mjs` prints every extended table beside its normal one, so
// the result of this rule is inspectable rather than something to trust.
// HOW THE TWO EXTRA WAVES GROW, and these are hand-picked rather than read off
// the ramp the table already has. Continuing the shipped ratio was the first
// version and it is far too steep: map 1 goes 24 -> 34 militia and 4 -> 6
// heavies in its last step, so one more wave at that rate is 48 militia and 9
// heavies, and the wave after it 68 and 14. Fourteen giants is 14,000 health
// walking down one road — not a harder wave, a wall.
//
// So the extra waves step by a rate a player can meet: a fifth more militia, one
// more heavy, one more archer each wave, and one more doctor across the two. The
// last normal wave of every map is already its cliff; these two are meant to be
// the far side of it, not a different game.
const MORE_LIGHT = 1.18;

function step(group, n) {
  const grow = {
    light_inf: c => Math.round(c * MORE_LIGHT),
    heavy_inf: c => c + 1,
    archer_inf: c => c + 1,
    // Every other wave, so the count that matters most for how long a wave
    // takes to clear does not double across two waves.
    plague_inf: c => c + (n === 1 ? 1 : 0)
  }[group.type];
  return { ...group, count: Math.max(1, grow ? grow(group.count) : group.count) };
}

export function extendedOf(table) {
  const out = table.map((w, i) => ({
    ...w,
    groups: w.groups.map(g => {
      const more = i >= 4 && (g.type === 'archer_inf' || g.type === 'plague_inf');
      return more ? { ...g, count: g.count + 1 } : { ...g };
    })
  }));

  // The old last wave is no longer last.
  out[out.length - 1] = { ...out[out.length - 1], rest: 9 };

  let last = out[out.length - 1];
  for (let n = 0; n < 2; n++) {
    last = { rest: n === 0 ? 9 : 0, groups: last.groups.map(g => step(g, n)) };
    out.push(last);
  }
  return out;
}

// THE TWO LENGTHS A MAP CAN BE PLAYED AT, in the order the title screen offers
// them. `id` is what the save file records, so renaming one loses its records —
// see slot() in src/score.js, where Normal deliberately keeps the key it has
// always had and only Extended carries a suffix.
export const MODES = [
  { id: 'normal', name: 'Normal', label: 'the map as it was tuned' },
  { id: 'extended', name: 'Extended', label: 'two more waves, and more of the throwers' }
];

export const wavesExtended = extendedOf(waves);
export const wavesForkExtended = extendedOf(wavesFork);
export const wavesLongExtended = extendedOf(wavesLong);

// WHICH TABLE A MAP IS PLAYED WITH, in one place. A level carries both — see
// `waves` and `wavesExtended` on each level file — and this is what turns the
// title screen's choice into the array the game steps through. A mode id nothing
// recognises falls back to the shipped table rather than to nothing at all: an
// unknown setting should be a map you can play, not a black screen.
export const tableFor = (level, modeId) =>
  (modeId === 'extended' && level.wavesExtended) || level.waves;

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
