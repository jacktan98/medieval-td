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
  // fight rather than into it. `lob` is what commits it to a patch of ground;
  // `arc` is the height of the throw as a fraction of its length, so a short lob
  // is a low one. Two fields rather than one since the Cannon Outpost arrived —
  // see `cannonball` in data/towers.js.
  lob: true,
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

// THE DARK PRIEST'S MISSILE, and the second piece of enemy ammunition in the game.
//
// Shaped like every other projectile — `kind`, `speed`, `arc`, `impact` — because
// projectiles.js reads them all the same way. Flat and fast like the monastery's
// own missiles rather than lobbed like a flask: it is the same magic, thrown by
// the other side.
export const darkMissile = {
  // `dark` rather than `arcane`, though it points at the monastery's own noise —
  // see FIRING in src/audio.js. A kind is what a sound is looked up by AND what a
  // kill is credited to, so sharing one with the monastery would be sharing both;
  // this way "the priest's shot sounds like a staff" is one row that can change
  // without anything else moving.
  kind: 'dark',
  sprite: 'dark_missile',
  trim: [218, 246, 76, 20],
  // Nose-first, like an arrow and unlike a bottle: it is a dart of magic and it
  // points where it is going.
  faces: 1,
  grip: 0.5,
  speed: 330,
  // IT ANNOUNCES ITSELF LEAVING and arrives quietly, which is what every missile
  // in this game does — the monastery's four included. At the owner's ask it is
  // the monastery's own Arcane_shot: "Dark priest attacks use the same arcane
  // shot sound effect."
  fireSound: true,
  impact: null
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
    // A knife and no armour: the baseline both new axes are measured from.
    damageType: 'physical',
    armour: { physical: 'none', magic: 'none' },
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

  // THE SAME MAN, TOUGHER. "Just like a regular thug but tougher" is the whole
  // brief and the def keeps to it: every field below that is not health, damage
  // or armour is the Thug's own number, unchanged, so what makes him different is
  // exactly the three things that were asked for and nothing else drifted in.
  //
  // 200 health against 80, 20 damage against 10, and LOW plate where the Thug
  // wears none. The plate is the part that matters more than it looks: at low he
  // takes three quarters of a physical blow, so a tier 1 bow needs 27 arrows
  // rather than the 8 a Thug needs — and a monk's staff, which is magic and meets
  // no ward at all, needs the same 10 either way. He is the first enemy in the
  // game whose answer is "shoot him with the other thing", at a rank cheap enough
  // to appear early.
  //
  // HIS BOX IS THE THUG'S BOX, 96 wide against 96 and 119 tall against 116, so he
  // costs the encyclopedia nothing and stands in a lane exactly as his smaller
  // cousin does. `r` stays 8 for the same reason: the body did not change size,
  // the man wearing it got harder to kill.
  tough_inf: {
    name: 'Tough Thug',
    sprite: 'tough',
    spriteTrim: [208, 197, 96, 119],
    pivot: [0.542, 0.903],
    // His shadow is at source (260.0, 304.5) in BOTH drawings, to the pixel — the
    // rule every figure in this game keeps, and what nails his feet to the spot
    // while only the arm moves. Measured, not copied: two measurements that agree
    // are the check.
    attack: { sprite: 'tough_attack', trim: [158, 197, 146, 119], pivot: [0.699, 0.903] },
    spriteFaces: -1,
    dead: 'dead_tough',
    deadTrim: [175, 217, 162, 78],
    deadPivot: [0.213, 0.888],
    hp: 200,
    damageType: 'physical',
    armour: { physical: 'low', magic: 'none' },
    speed: 70,      // the Thug's, unchanged — see the note above
    // Between the Thug's 15 and the Giant's 40, nearer the Thug: he is worth
    // about two and a half of one to kill and pays about one and a half.
    bounty: 25,
    leak: 1,
    damage: 20,
    atkCd: 1.0,
    r: 8,
    colour: '#A87C4E'
  },

  // THE SHIELD, and he is the first enemy whose armour is a THING HE DOES rather
  // than a row on his card.
  //
  // Every other creature in this game wears one set of plate from the moment it
  // spawns to the moment it dies. This one wears three, and which he is wearing
  // is the whole of him:
  //
  //   WALKING          med physical, no ward     his card's number
  //   GUARDING         high physical, HIGH WARD  a projectile hit him
  //   FIGHTING         low physical, no ward     a soldier has hold of him
  //
  // THE FIRST HIT PUTS THE SHIELD UP and every hit after it holds the shield
  // there: five seconds, refreshed by anything that lands, so a tower shooting
  // him steadily keeps him behind it indefinitely. Guarding he is very nearly
  // arrow-proof — a quarter of a physical blow and a quarter of a magic one — and
  // the ward is the half that is new, because it means the monastery cannot
  // simply walk around him the way it walks around a Giant.
  //
  // AND HE IS SOFT THE MOMENT HE SWINGS. A man cannot hold a shield up and hit
  // somebody with it, so being pinned drops him to LOW and takes his ward away
  // entirely — below the med he walks in. That is the counter-play and it is the
  // reason he is worth building: shoot him and he turtles, send a soldier and he
  // opens up, and the answer is to do both in that order. He is the first enemy
  // who makes the barracks the SETUP for the archery rather than the alternative
  // to it.
  //
  // WHY THE SLOW-WALK IS A GIFT AS WELL AS A COST. Guarding he shuffles at half
  // pace, so shooting a Blocker trades damage you will not land for time you will
  // — he arrives later for having been shot at. Without it the interaction is a
  // pure punish for firing, which is a mechanic that teaches players to stop
  // playing.
  //
  // FIGHTING BEATS GUARDING when both are true, which is the precedence the
  // owner asked for — "vulnerable when attacking but still tough" — and it is
  // also the only ordering that leaves him beatable. See enemyStance in
  // render.js for the drawing and wornBy in data/armour.js for the plate; the two
  // read the same three states from one place, so what he looks like and what he
  // takes cannot disagree.
  blocker_inf: {
    name: 'Blocker Thug',
    sprite: 'blocker',
    spriteTrim: [211, 197, 90, 118],
    pivot: [0.606, 0.922],
    // HIS SHADOW MOVES 2.5 SOURCE PX between walking and the other two poses —
    // (265.5, 305.8) standing against (265.5, 303.3) swinging and guarding. Every
    // other figure in the game holds its shadow to the pixel across poses, and
    // this one does not quite.
    //
    // Kept as measured rather than levelled, on the rule the whole project runs
    // on: each drawing carries its own answer. It is half a game pixel, so he
    // settles very slightly as he raises the shield, which reads as weight
    // rather than as a fault. Worth knowing about before the next re-export, not
    // worth papering over.
    attack: { sprite: 'blocker_attack', trim: [180, 197, 121, 118], pivot: [0.707, 0.900] },
    // THE THIRD POSE, and the only one in the game that is neither a Default nor
    // an Attack. It is a STANCE — a man standing behind a shield — so it carries
    // a `default`-shaped entry with no attack beside it: he does not swing while
    // he is guarding, because being swung at is not what put the shield up.
    guard: {
      sprite: 'blocker_guard',
      // RE-EXPORTED NARROWER: 101 source px wide against 132, so the shield is
      // tucked in rather than held out. Same height and the same shadow to the
      // pixel, so only the width moved — he is 20.7 game px across guarding where
      // he was 27.1, against the 18.5 he walks in.
      trim: [200, 197, 101, 118],
      pivot: [0.649, 0.900],
      // What he wears while it is up. HIGH ON BOTH AXES, which nothing else in
      // the game wears — the Giant's med plate is the previous ceiling.
      armour: { physical: 'high', magic: 'high' },
      // Refreshed by every hit that lands, so this is "five seconds since the
      // last arrow" rather than "five seconds since the first".
      seconds: 5,
      // Half pace while it is up. A multiplier rather than a speed, so it stays
      // half of whatever he is retuned to — the same shape as a monk's slow, and
      // it multiplies with one rather than replacing it.
      slow: 0.5
    },
    // What he wears with a spear in him. BELOW the med he walks in, which is the
    // point: the shield is off his arm and in the way.
    fightArmour: { physical: 'low', magic: 'none' },
    spriteFaces: -1,
    dead: 'dead_blocker',
    deadTrim: [175, 217, 161, 78],
    deadPivot: [0.211, 0.875],
    hp: 250,
    damageType: 'physical',
    // His card's armour, and the one he is actually wearing for most of a walk
    // down an undefended stretch of road.
    armour: { physical: 'med', magic: 'none' },
    // Slower than a Thug and quicker than a Giant: he is carrying a shield, and
    // guarding halves this again.
    speed: 60,
    // Dearer than the Tough Thug and cheaper than a Giant. He is harder to kill
    // than either on paper and easier than both if you answer him properly, so
    // he pays for the answer rather than for the health bar.
    bounty: 30,
    leak: 1,
    // The Thug's own blow. He is a wall, not a threat — everything he is worth
    // is in what he takes rather than in what he lands.
    damage: 10,
    atkCd: 1.0,
    r: 8,
    colour: '#8E8478'
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
    hp: 120,
    damageType: 'physical',
    armour: { physical: 'none', magic: 'none' },
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
      // 200, AND HE STOPS THERE. It was 260 with a separate `stopAt` of 130 —
      // he opened fire early and then walked in to a distance a squad could
      // reach — because an enemy who plants himself beyond every answer on the
      // board can stand there shooting until the clock runs out, and a wave only
      // ends when the field is clear.
      //
      // THE OWNER HAS TAKEN THAT RISK DELIBERATELY: "I am okay with him shooting
      // there forever. Players will find a way to eliminate him so that the game
      // continues." So there is no `stopAt` any more — he halts at his own reach —
      // and 200 is the number that makes the answer exist: a tier 1 archery tower
      // reaches 190 and a Crossbow Tower 220, so a bow placed anywhere near the
      // road can trade with him, and a Musketeer Post's Deadeye now reaches the
      // whole map whatever he does.
      range: 200,
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
    hp: 800,
    // MEDIUM PLATE, AND 200 FEWER HEALTH TO PAY FOR IT. Against a bow he is
    // 800 / 0.5 = 1600 effective where he used to be a flat 1000, and against a
    // monk's blast he is exactly the 800 on the tin — which is the whole point
    // of him now. He is not a wall, he is a wall that a staff walks through.
    damageType: 'physical',
    armour: { physical: 'med', magic: 'none' },
    // AND HIS CLUB BREAKS A RANK OF PLATE, which is new and is the first time
    // anything walking in has pierced anything. It is aimed squarely at the
    // barracks: he is the enemy a squad is bought to hold, and holding him was a
    // question of armour rank until now — a Paladin in high plate took 25% of a
    // swing and simply did not die to it.
    //
    // At x1 he strikes whatever is holding him as though it wore one rank less, so
    // the answer to him stops being "wear enough" and goes back to "bring enough".
    // Measured end to end through units.js, which is a different call site from
    // every other pierce in the game — see the last section of tools/armour.mjs:
    //
    //   a Pikeman    wears none, the break is worth nothing      30 of 30
    //   a Swordsman  low, broken to none                         30 of 30
    //   a Paladin    med, broken to low                          23 of 30
    //
    // The Paladin is the only rung where the number moves at all, and it moves a
    // long way: without the break the same club lands 15 on him.
    pierce: 1,
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
    // PLAGUE DOCTOR, and the name caught up with the code rather than the other
    // way round: every note in this project has called him the plague doctor
    // since the day he was drawn, because that is what the drawing is — a man in
    // a beaked mask with a basket of flasks. Only this line still said Thug.
    //
    // The gameplay key stays `plague_inf`, on the same rule light_inf follows:
    // what a creature is called and what it does are different questions, and
    // every wave table in this file reads the second one. Renaming the key would
    // touch three level tables to change nothing.
    //
    // The ART FILES still say Plague_Thug, deliberately — see the note over the
    // enemy sprites in src/assets.js: the code bends to the artist's filenames,
    // because renaming an upload only means renaming it again after the next one.
    name: 'Plague Doctor',
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
    // THE MIRROR OF THE GIANT, and the reason the two of them are worth having
    // on one road: his flask is MAGIC and his plate is magic too, so the
    // monastery that answers the giant bounces off him and the bow that bounces
    // off the giant kills him.
    damageType: 'magic',
    armour: { physical: 'none', magic: 'med' },
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
  },

  // THE HEALER, and the first creature on either side that puts health back on
  // somebody. Everything before him could only take it away.
  //
  // He is a caster rather than a fighter, and both halves of that are in the
  // numbers: HIGH magic wards and none at all against steel, so an arrow goes
  // through him whole and a monk's staff barely scratches him. That is the exact
  // inverse of the Giant, and it is deliberate — the two enemies that most reward
  // being focused down want DIFFERENT towers pointed at them.
  //
  // WHAT HE ACTUALLY DOES, in the owner's words: "Dark Priest is in Heal image
  // when casting Heal to an enemy unit. It holds this pose (stands still) for 2
  // seconds and then after that, the enemy receives health regeneration... He then
  // continues healing others or walk/attack. He heals every time there is an enemy
  // nearby (Range 100) that is injured."
  //
  // TWO SECONDS OF STANDING STILL IS THE COST, and it is the whole of his
  // counter-play. A priest mid-cast is not walking, not shooting, and is standing
  // in one place for two seconds with a distinctive pose on, which is a long time
  // in this game and the window a tower is given to kill him before the heal
  // lands. Nothing is refunded if he dies during it.
  //
  // HE WILL CAST ON THE SAME MAN AGAIN, and that is the owner's explicit call. It
  // was the other way round for one build: he passed over anyone already wearing
  // the mark, on the argument that a healer who could re-cast forever would stand
  // still forever, because enemies have no regeneration and a creature hurt once
  // stays hurt.
  //
  // AT 10 A SECOND THAT ARGUMENT LARGELY DISSOLVES, which is worth writing down
  // because the rule came out and the number went up in the same breath. 50 health
  // a cast is most of a Thug and a fifth of a Blocker: the man he is working on
  // actually reaches full health and stops being a reason to stand still, so he
  // moves on by himself. Only something with a very deep bar keeps him in place,
  // and then he is doing his job.
  //
  // AND A WAVE CAN NOW STALL, deliberately. The plague doctor standoff rests on a
  // pinned enemy losing the fight he is in, and a mended one no longer does: 10 a
  // second is three times a spearman 3.16 and only an assassin 18.75 is over it.
  // The owner has taken that knowingly: "I am fine if the game stalls
  // theoretically. Players will find ways to prevent this from happening, selling
  // towers and placing at right plots or move rally points."
  //
  // IT IS NOT A LOCK, and that is what makes the call safe rather than brave. The
  // wave loop measures: when the field has not cleared in the time an unimpeded
  // walk would have taken plus STALL_GRACE, it hands over to the next wave anyway.
  // See stallClock in src/waves.js. The clock that exists for a thrower nothing can
  // reach covers a man nothing can out-damage without a line being changed, and
  // tools/plague.mjs runs that end to end rather than trusting this paragraph.
  dark_priest: {
    name: 'Dark Priest',
    sprite: 'priest',
    spriteTrim: [216, 178, 80, 156],
    pivot: [0.563, 0.926],
    // ALL FOUR OF HIS LIVING POSES SHARE ONE SHADOW, source (261.0, 322.5) to the
    // pixel — the walk, the missile, the club and the cast. He swaps between them
    // more than any other figure in the game, so this is the figure where a pivot
    // out by two would be most obvious.
    attack: { sprite: 'priest_cast', trim: [182, 205, 122, 129], pivot: [0.648, 0.911] },
    // The close pair, on the archer's and the doctor's terms: shown while a
    // soldier has hold of him. One standing pose serves both stances, like the
    // doctor's, so there is no `melee.default` — see enemyStance in render.js.
    melee: {
      attack: { sprite: 'priest_swing', trim: [115, 218, 181, 116], pivot: [0.807, 0.901] }
    },
    // AND THE FIFTH DRAWING, which is neither a Default nor an Attack — the same
    // shape as the Blocker's shield stance and for the same reason. Casting is
    // something he does to a friend, not to you, so it replaces the STANDING half
    // of his pair and leaves his swing alone.
    heal: {
      sprite: 'priest_heal',
      trim: [190, 184, 111, 150],
      pivot: [0.640, 0.923],
      // How far he can reach somebody to mend them. The same 100 as his missile,
      // so what he can hurt and what he can help are one circle — a player who has
      // learned his reach has learned both.
      range: 100,
      // Seconds held in the pose before anything lands.
      cast: 2,
      // HEALTH A SECOND, and for how many. The owner's numbers: "healing is 10
      // health per second for 5 seconds", so 50 a cast.
      //
      // A RATE RATHER THAN A TOTAL, because that is what the status carries and
      // what he said. It was `hp: 10, seconds: 5` meaning 10 in TOTAL, which is a
      // fifth of this and reads identically at a glance; the field name is what
      // stops the two being confused after the fact.
      hps: 10,
      seconds: 5,
      // AND HOW LONG BEFORE ANYBODY WORKS ON THE SAME MAN AGAIN. The owner's rule:
      // "only go back to healing the same unit after 30 seconds. It goes to heal
      // other units first or attack soldiers etc."
      //
      // It is what makes him a healer of a CROWD rather than of one creature. 50
      // health a cast is enough that parking on a single giant was a real
      // behaviour — he would top the same bar up every two seconds and never look
      // at anything else, which is both dull to watch and the wrong threat: what
      // should worry a player is a wave that keeps getting back up, not one thug
      // who will not go down.
      //
      // ON THE MAN RATHER THAN IN THE PRIEST'S HEAD — `mendCd` in src/enemies.js —
      // so two priests cannot tag-team one giant by casting inside each other's
      // gaps. It held per-priest for one build, which read more literally and let
      // exactly that happen.
      //
      // THIRTY IS LONG. A cast is two seconds and the mark runs five, so this is
      // six casts' worth of looking elsewhere — a priest will have gone through
      // every other wounded man in reach, and probably thrown a few missiles,
      // before this one comes round again. That is the point.
      again: 30
    },
    spriteFaces: -1,
    dead: 'dead_priest',
    deadTrim: [169, 214, 174, 84],
    deadPivot: [0.187, 0.804],
    hp: 200,
    // MAGIC, and he is the second creature on the road that does it — the plague
    // doctor being the first. What that costs the player is a barracks: a
    // spearman wears no magic plate at all, so the missile lands whole on him.
    damageType: 'magic',
    armour: { physical: 'none', magic: 'high' },
    // Slower than a thug and quicker than a giant. He is a man in robes who stops
    // to work rather than one marching.
    speed: 58,
    bounty: 35,
    leak: 1,
    damage: 20,
    atkCd: 1.0,
    ranged: {
      // The shortest reach of the three throwers — 100 against the doctor's 130
      // and the archer's 200 — so every tower in the game outranges him and a
      // squad's own ASSIST of 70 very nearly reaches him. He is meant to be got
      // at, which is the trade for what he does while he is alive.
      range: 100,
      cd: 2.0,
      damage: 20,
      ammo: darkMissile
    },
    r: 8,
    colour: '#6B5C7A'
  },

  // ============================================================================
  // THE CAPTAIN, and he is the first boss.
  //
  // The owner's description: "something a Blocker Thug + Archer Thug + Paladin
  // morphed together." That is exactly what he is built from — his shield is the
  // Blocker's `guard` stance, his bow is the Archer's `ranged` block, and his
  // second stage is the Paladin's magic blade — so almost nothing here is a new
  // mechanic. What IS new is that he has a SECOND STAGE and a DEATH THAT TAKES
  // TIME, and both of those needed machinery that did not exist.
  //
  // ELEVEN DRAWINGS, TEN OF THEM LIVING, against the Dark Priest's five. Every one
  // of the ten shares source (263, 333) to the pixel — the artist drew one shadow
  // and let the poses cover different parts of it — so he never hops, however
  // often he swaps. Six of the eleven show the ellipse edge to edge and five of
  // those six measure to exactly that point; the others hide its tips behind a leg
  // or a bow, which is why every pivot below is derived from the one measurement
  // rather than read off its own drawing. See assets/bosses/README.md.
  //
  // THE NUMBERS THE OWNER GAVE: 5,000 health, 50 damage with sword and bow alike,
  // medium armour on both axes, high behind the shield, low once enraged, 1.2x
  // speed and 1.2x swing rate in stage 2, a heal worth half his bar, and 50 splash
  // on the enchanted blade. The ones he did not give are marked THE CHOICE below —
  // there are five of them and every one is a balance decision rather than a
  // detail.
  captain_thug: {
    name: 'Captain Thug',
    // WHAT MAKES HIM A BOSS, as a flag rather than as a name test. Read by the
    // wave loop, the info panel and the admin dashboard, none of which should be
    // asking "is this the captain" — they are asking "is this a boss", and the
    // second question survives the next one being drawn.
    boss: true,
    sprite: 'captain',
    spriteTrim: [150, 164, 212, 185],
    pivot: [0.533, 0.914],
    // The bow, loosed. This is `attack` — the swing half of his ordinary pair —
    // because on the road shooting is what he does at range, exactly as the
    // Archer Thug's `attack` is his bow rather than his club.
    attack: { sprite: 'captain_shoot', trim: [179, 182, 183, 167], pivot: [0.459, 0.904] },
    // AND THE HALF-SECOND BEFORE IT. Nothing else in this game has a wind-up
    // drawing: every other figure goes from standing to struck in one frame.
    //
    // It is a STANCE and not an attack, on the same rule the shield and the cast
    // follow — he is not doing anything to anybody yet, he is nocking an arrow —
    // so it replaces the STANDING half of his pair and leaves the swing alone.
    // `seconds` is the owner's 0.5.
    reload: {
      sprite: 'captain_reload',
      trim: [151, 182, 211, 167],
      pivot: [0.531, 0.904],
      // A SIXTH OF A SECOND, three times quicker than the half-second it shipped
      // with, at the owner's word. Written as the division so the change is legible
      // rather than as 0.167, which reads like a measurement of something.
      seconds: 0.5 / 3
    },
    // The sword, close in. The Blocker's arrangement: a soldier with hold of him
    // gets the blade, and the bow is not used at arm's length.
    melee: {
      attack: { sprite: 'captain_swing', trim: [89, 183, 273, 166], pivot: [0.637, 0.904] }
    },
    // THE SHIELD, and it is the Blocker Thug's stance in every particular: five
    // seconds, refreshed by every projectile that lands, half pace while it is up,
    // high plate on both axes.
    //
    // WITH ONE RULE OF HIS OWN, which is the owner's: "if there are no soldiers
    // nearby". A Blocker guards whatever else is happening; the Captain drops the
    // shield the moment a man comes into bow range, because he would rather shoot.
    // That is `sheathe` below rather than a number here — see updateEnemies.
    guard: {
      sprite: 'captain_guard',
      trim: [119, 183, 243, 166],
      pivot: [0.593, 0.904],
      armour: { physical: 'high', magic: 'high' },
      seconds: 5,
      slow: 0.5
    },
    // HE PUTS IT AWAY TO SHOOT. A soldier inside this reach takes the shield down
    // and keeps it down, which is the owner's "he puts his shield behind his back
    // and stops defending".
    //
    // The same number as his bow, so what he can shoot and what makes him stop
    // guarding are one circle. Written as its own field rather than read off
    // `ranged.range` because they are two different questions about him, and a
    // future Captain who guarded until something got closer than he could shoot
    // would be a one-line change instead of a rewrite.
    //
    // It FOLLOWED the bow down from 200 to 150 rather than being left behind, which
    // is the failure this field's independence invites: a Captain who put his
    // shield away at 200 and could not shoot until 150 would spend 50px of every
    // approach unarmed and unarmoured for no reason a player could see.
    sheathe: 150,
    // AND IT STAYS STOWED FOR TWO SECONDS ONCE HE STARTS SHOOTING, at the owner's
    // word — "when attacking by ranged, Captain Thug cannot use defend for 2
    // seconds. Otherwise, he keeps flipping between images when shooting arrows
    // while projectiles hit him."
    //
    // The radius rule above takes a raised shield DOWN when a soldier is near; this
    // stops it going up in the first place. That difference is the whole of the
    // fix. Under fire he was raising it on the frame an arrow landed and having it
    // taken away on the next, so what the player saw was a boss strobing between
    // two drawings rather than a boss doing either thing — a one-frame flash that
    // a rule about radius could never remove, because the shield really had gone
    // up.
    //
    // Two seconds against a two-second shooting cycle, so a Captain who is working
    // on a squad never puts it up at all, and one who has finished has it back by
    // the time he could want it.
    stow: 2,
    // WHAT HE SAYS WHEN HE IS TAPPED, and he is the first creature on the road with
    // a line of his own — everything else answers with the common thug's. One word
    // on the def, read by selectionCue in src/audio.js, which is the same opt-in a
    // tower tier uses to override its family's voice.
    voice: 'captainPicked',
    spriteFaces: -1,
    // HIS BODY IS HIS OWN ELEVENTH DRAWING, dropped by the finale below rather
    // than by the death sweep — see `dropCorpse` in src/enemies.js. The fields are
    // the ordinary ones so that corpses.js needs to know nothing about bosses.
    dead: 'captain_dead',
    deadTrim: [65, 241, 307, 108],
    deadPivot: [0.645, 0.852],
    // 8,000, the owner's number, up from 5,000. He is ten Giants of health, and the
    // fight is meant to be the length of a wave rather than an interruption to one.
    hp: 8000,
    damageType: 'physical',
    armour: { physical: 'med', magic: 'med' },
    // THE CHOICE — SPEED. Not given. 50 makes him the slowest thing in the game,
    // just under the Giant's 52, which is what a man in that much plate should be
    // and what gives the towers time to work on a 5,000 bar. Stage 2 multiplies
    // it by the owner's 1.2, so enraged he moves at 60 — between a Blocker and an
    // Archer, and faster than the Giant he used to be slower than.
    speed: 50,
    // THE CHOICE — BOUNTY. Not given. 250 against a Giant's 40, which is roughly
    // what his health is worth at the rate the rest of the roster pays: he is 6.25
    // giants of health and this is 6.25 giants of gold. It matters more than a
    // normal bounty does, because killing him is a whole wave's work and the
    // player should be able to rebuild afterwards.
    bounty: 250,
    // THE CHOICE — WHAT HE COSTS IF HE GETS THROUGH. Not given. 5 of 20 lives,
    // against the Giant's 2 and everything else's 1. A quarter of the game for
    // letting the boss walk past, which is meant to be the worst thing that can
    // happen without being the end of the run — at 20 it would be a loss on its
    // own, and a boss you cannot survive misjudging is a boss you reload rather
    // than fight.
    leak: 5,
    // Sword and bow both, and the two are one number on purpose: where he is
    // standing decides how the blow ARRIVES and not how hard.
    //
    // 80, the owner's number. A spearman wears low physical plate, so it arrives as
    // 60 and takes him in three swings; a paladin's medium turns it to 40 — which
    // makes the paladin the answer to stage 1 and, deliberately, no answer at all
    // to stage 2, where the same 80 comes back as magic and his physical plate is
    // worth nothing against it.
    damage: 80,
    atkCd: 1.0,
    ranged: {
      // 150, the owner's number, down from the 200 I had picked off the Archer
      // Thug. It matters more now that he STANDS at it: every archery tower in the
      // game outranges 150 — a tier 1 bow reaches 190 — so wherever he plants
      // himself there is a tower that can be built to answer him, which is the
      // thing that makes standing off a fight rather than a stalemate.
      range: 150,
      cd: 2.0,
      // The same 80 the sword does. One number for both, so his reach decides how a
      // blow arrives and never how much it is worth.
      damage: 80,
      ammo: enemyArrow,
      // AND HE PLANTS HIMSELF, exactly as the Archer Thug does — the owner's call:
      // "he shoots arrow like an archer thug where he stays put until the soldiers
      // is cleared from this range".
      //
      // I had him firing on the move for one build, on the reasoning that a boss
      // standing at his own reach could hold a wave open until the stall clock
      // fired, and that a wait is not a fight. The owner has ruled the other way
      // and it is the same ruling the Archer already carries — "players will find a
      // way to eliminate him" — so the same answer applies to both and there is one
      // behaviour to learn rather than two.
      //
      // WHAT IT COSTS, stated plainly: a Captain who halts where no tower reaches
      // is killed by nothing and advances never, and the wave hands over on the
      // stall clock instead of on a clear field. 150 is what makes that unlikely —
      // see `range` above — but it is the trade, and it is deliberate.
      //
      // There is no `onTheMove` flag any more. It existed for this one creature and
      // nothing else in the game used it.
      // HOW LONG THE LOOSING POSE HOLDS, and it moves with the reload so the two
      // beats stay equal: a sixth of a second each, three times quicker than they
      // shipped. Timed rather than decayed, unlike every other figure's Attack
      // drawing, so no lunge is dragged along with it.
      //
      // THE COOLDOWN IS UNCHANGED at 2 seconds, and that is worth knowing because
      // it is what the two beats sit inside. He now nocks and looses in a third of
      // a second and then stands with the bow down for the rest of it. If the whole
      // RHYTHM is meant to be quicker rather than just the animation, `cd` is the
      // number to move and it is one line.
      hold: 0.5 / 3
    },
    // ========================================================================
    // STAGE 2, at a quarter health, ONCE.
    //
    // Three beats, in order: he stops and channels for two seconds, he mends
    // himself for three and comes back with half his bar, and then he is a
    // different creature for the rest of the fight.
    //
    // The whole of it is here rather than spread through enemies.js so that the
    // second boss needs no new code — a def with a `rage` block gets a second
    // stage, and one without does not.
    rage: {
      // The owner's "health hits below than 25% for the first time". Once only,
      // and what enforces that is the stage itself: he leaves stage 1 and there is
      // no way back, so there is no separate flag to get out of step.
      at: 0.25,
      // BEAT ONE. He throws away the shield, the bow and the bow bag, and stands
      // still. Two seconds, and he can be hit for every one of them — this is the
      // window, and the drawing is the tell.
      pause: {
        sprite: 'captain_pause',
        trim: [112, 124, 343, 232],
        pivot: [0.44, 0.901],
        seconds: 2
      },
      // BEAT TWO. Three seconds of mending, worth half his maximum.
      //
      // HIGH PLATE WHILE HE DOES IT, at the owner's word, which is what stops the
      // heal being a free two-thousand-five-hundred: everything shooting him is
      // suddenly doing a quarter damage, so a player who has saved an ability for
      // this moment gets much less out of it than one who spends it in the pause.
      // Those are the two halves of the same five seconds and they are deliberately
      // opposite.
      //
      // A FLAT SHARE OF MAXIMUM, not a rate: `share` of `maxHp`, granted when the
      // three seconds finish rather than trickled. He is not wearing the Dark
      // Priest's healing status — this is his own, it cannot be refreshed by
      // anything, and it lands or it does not.
      mend: {
        sprite: 'captain_mend',
        trim: [169, 121, 187, 239],
        pivot: [0.503, 0.887],
        seconds: 3,
        share: 0.5,
        armour: { physical: 'high', magic: 'high' }
      },
      // BEAT THREE, and everything under here is what he is afterwards.
      sprite: 'captain_raged',
      trim: [164, 164, 148, 185],
      pivot: [0.669, 0.914],
      attack: { sprite: 'captain_rage_swing', trim: [78, 183, 234, 166], pivot: [0.791, 0.904] },
      // LOW ON BOTH AXES, down from medium. He has thrown the shield away and it
      // shows in what he takes: the same tower that was doing half damage to him
      // now does three quarters.
      armour: { physical: 'low', magic: 'low' },
      // Walk and swing, both, at the owner's 1.2x. One multiplier for the two so
      // they cannot drift apart — he is faster, not faster at one thing.
      times: 1.2,
      // THE BLADE IS ENCHANTED, so it is MAGIC now. That is the sharpest part of
      // the whole change and it is aimed straight at the player's line: a spearman
      // wears no magic plate at all, and a paladin's medium physical — the thing
      // that made him a wall against this boss for the whole of stage 1 — is worth
      // nothing against it.
      damageType: 'magic',
      // AND IT CATCHES EVERYONE AROUND HIM. The same damage to the man he is
      // fighting and to every man near him, with no falloff, which is how every
      // other splash in this game reads.
      //
      // THE SPLASH IS HIS BLOW, not a number of its own — `sweep` in units.js
      // reads `def.damage` — so it followed the sword from 50 to 100 with him.
      // The owner's "AOE damage of 50" was written when his attack WAS 50, and
      // "magic attack when stage 2 follows to 100" reads as the whole blade moving
      // together. If the splash was meant to stay behind at 50 it wants its own
      // field here and one line in sweep(); say so and it is a two-minute change.
      //
      // THE CHOICE — HOW WIDE. Not given. 60px, which is twice the 30 a soldier
      // blocks at and just under the 70 a squad assists within: it catches the men
      // who came to help and not the ones who stayed at their posts. A squad that
      // piles onto him now loses everybody at once, which is the decision the
      // second stage exists to force.
      splash: 60
    },
    // ========================================================================
    // AND HE DOES NOT DIE ON THE FRAME HE RUNS OUT OF HEALTH.
    //
    // Four seconds: two of standing there having lost, holding his dropped sword,
    // and two on the ground. The owner's rule — "after this 2 seconds, then only
    // the game can end" — is why this is not just an animation: he stays on the
    // board for the whole of it, so a wave cannot clear and a run cannot be won
    // until it has played out.
    //
    // Nothing may touch him during it. He does not walk, shoot, swing or take
    // damage, no tower may aim at him, and any soldier holding him is let go on
    // the frame it starts. See the finale block in updateEnemies.
    finale: {
      // He is beaten but standing. His own drawing, and the last living pose.
      fall: {
        sprite: 'captain_fall',
        trim: [65, 183, 247, 166],
        pivot: [0.802, 0.904],
        seconds: 2
      },
      // Then he is on the ground, in the drawing that also becomes his corpse.
      // Two seconds here, and then the body is handed to corpses.js and he leaves
      // the enemy list — so what the player sees does not change at the handover,
      // only what the rest of the game thinks is on the board.
      rest: 2
    },
    // As big a body as the Giant's, and for the same reason: the hitbox is meant
    // to match the figure you can see. He draws 43 x 38 game px against the
    // Giant's 37 x 37.
    r: 15,
    colour: '#B08A4A'
  }
};

// THE ORDER A WAVE MARCHES IN, and it is a rule rather than a preference.
//
// A wave's groups are spawned ONE AFTER ANOTHER — see groupAt in src/waves.js —
// so the order groups are listed in IS the order the enemies arrive in, and a
// wave of militia-then-giants plays completely differently from giants-then-
// militia. It was implicit in how each table happened to be typed out, which was
// fine while the tables were the only thing that could build a wave.
//
// The admin dashboard can now put any creature in any wave, so something has to
// decide where a newly placed one falls in the queue. This is that something.
//
// THUGS LEAD, THEN THE GIANT, THEN THE SHOOTERS, which is what every shipped
// table already does: bodies first to soak and to screen, the heavy behind them,
// and the ranged pair last so they arrive with a fight already in progress to
// stand behind. The three thug variants sit together at the front because that is
// what they are — the same creature at three weights.
//
// IT REPRODUCES EVERY SHIPPED TABLE EXACTLY. Restricted to the four types the
// tables actually use it reads light -> heavy -> archer -> plague, which is the
// order all three maps were typed in and balanced at, so an untouched dashboard
// hands the game back its own wave tables unchanged. tools/admin.mjs checks that
// against the real tables rather than taking this paragraph's word for it, and it
// also checks that every enemy in the game appears here exactly once — a creature
// missing from this list would be one the dashboard could not place.
export const MARCH_ORDER = [
  'light_inf', 'tough_inf', 'blocker_inf', 'heavy_inf', 'archer_inf', 'plague_inf',
  // The healer comes in LAST, behind everything he is there to mend. A priest at
  // the head of a column would spend the wave walking with nobody hurt in front of
  // him; behind it he arrives to a fight already going and men already wounded.
  'dark_priest',
  // AND THE BOSS BEHIND EVEN HIM, because groups spawn one after another and this
  // list is therefore the order they arrive in. A boss at the front of a wave is a
  // boss the player meets with a full line and full towers; a boss at the back
  // arrives to a line that has already been chewed on, which is the fight worth
  // having. It also puts him behind his own healer rather than in front of one.
  'captain_thug'
];

// HOW FAST THEY COME when nobody has said, which is what a creature placed into a
// wave that never had one needs.
//
// Derived from the tables rather than typed: the MEDIAN gap that type is already
// sent at across every wave on every map. So a militiaman placed by hand arrives
// at the rate militia are actually sent at, and the number moves on its own if the
// tables are ever retuned.
//
// The fallback is for a creature no shipped table sends — the Tough Thug and the
// Blocker Thug today. 1.6s is the slowest rate anything in this game arrives at
// and the rate wave 1 opens with, which is the right way to be wrong: a hand
// placed group that turns out too thin is a wave you nudge, and one that turns out
// too thick is a map you lose while working out why.
const UNSENT = 1.6;
export const defaultGap = type => {
  const seen = [];
  for (const table of [waves, wavesFork, wavesLong])
    for (const w of table)
      for (const g of w.groups) if (g.type === type) seen.push(g.gap);
  if (!seen.length) return UNSENT;
  seen.sort((a, b) => a - b);
  return seen[seen.length >> 1];
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
// MAPS 1 AND 2'S SHORT TABLES AND MAP 3'S ARE ALL DERIVED NOW, from the tuned
// Extended tables at the foot of this file. The literal arrays that used to sit
// here are gone, and so is the ramp they described — see `shortOf` down there for
// the relationship and why it points that way round.
//
// WHAT THEY USED TO SAY, kept because it is the balance history of this game and
// none of it is written down anywhere else:
//
//   Waves 1-3 were militia only and taught the level. The first heavy landed in
//   wave 4 as a single one, alone, so it was unmistakable. From there heavies came
//   in growing packs behind a militia screen, and wave 8 — 34 militia and 6
//   heavies back to back — was the cliff the whole curve was built toward.
//
//   Waves 1 and 2 were deliberately thin, 4 and 6, because the opening is the
//   tightest part of the curve rather than the easiest: 220 gold is three tier 1
//   towers and you have not earned a bounty yet, so wave 1 is the only wave you
//   meet with whatever you could afford before it started. The owner's own tables
//   open on exactly the same 4 and 6, which is the strongest thing that can be
//   said for that paragraph.
//
//   Map 2 ran its own eight rather than sharing map 1's, because its road is
//   1060px against map 1's 1768 and the `march` multiplier that used to pay for
//   the difference came out. Map 3 ran ten, bigger as well as more numerous,
//   because it has two roads to defend and more time to do it in.
//
// All three of those shapes survive in the tables that replaced them: the owner
// kept the thin opening, kept militia-only for the first two waves, and put the
// first Giant in wave 5 rather than wave 4 — later, not earlier, on every map.

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
// MAP 2'S SHORT TABLE, derived like map 1's — see `shortOf`.

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
// MAP 3'S SHORT TABLE, derived like the other two — see `shortOf`. It is TEN
// waves where they are eight, which is the one part of the old shape that is a
// property of the map rather than of the ramp: two roads to defend and more
// board to cover, so the long game is twelve there and the short one ten.

// --- THE EXTENDED TABLES -------------------------------------------------------
//
// A second length for every map, and it is now three tables the owner typed out
// rather than a rule applied to the three above.
//
// IT WAS A RULE, and the rule was defensible while it lasted: sixty rows of
// hand-written numbers have to be kept in step with the sixty above them, and
// every balance note in this file is about the SHAPE of a ramp rather than one row
// of it, so one derivation that continued the ramp kept a single source of truth.
// `extendedOf` added one archer and one doctor from wave 5 on, then grew two more
// waves off the last one — a fifth more militia, one more heavy, one more archer
// each, and one more doctor across the two.
//
// WHAT ENDED IT is that the long game stopped being a variant of the short one.
// The owner has played all three maps at Hard Extended and tuned every wave by
// hand, and the result is not a ramp continued: the Extended tables introduce
// creatures in a different ORDER from their Normal twins, and one of them takes a
// creature back OUT of a late wave. Two Rivers meets a Dark Priest on wave 6 and
// its Normal table never sends one; its wave 9 sends no Tough Thugs while waves 8
// and 10 both do. No function produces that from the table above it.
//
// So the derivation is gone rather than left unused beside the tables that
// replaced it — an exported rule nothing calls is a rule that goes stale in
// silence, which is the argument the note that used to sit here made about three
// unused constants at this very spot. The constants are the live thing now.
//
// `node tools/preview.mjs` prints every extended table beside its normal one, so
// what the two lengths actually send is inspectable rather than something to read
// off this comment.

// THE TWO LENGTHS A MAP CAN BE PLAYED AT, in the order the title screen offers
// them. `id` is what the save file records, so renaming one loses its records —
// see slot() in src/score.js, where Normal deliberately keeps the key it has
// always had and only Extended carries a suffix.
export const MODES = [
  { id: 'normal', name: 'Normal', label: 'the map as it was tuned' },
  { id: 'extended', name: 'Extended', label: 'two more waves, and more of the throwers' }
];

// THE THREE EXTENDED TABLES, TYPED OUT, and they are the owner's own numbers.
//
// They were DERIVED until now — extendedOf below took a map's Normal table, added
// one to the throwers from wave 5 on, and appended two more waves by stepping the
// last one twice. That was a rule for making a longer game out of a tuned one, and
// it did its job while the long game was a variant.
//
// It is not a variant any more. The owner has played all three maps at Hard
// Extended and hand-tuned every wave of every one of them, mostly through the
// admin dashboard, and a derivation cannot express what came back: the Extended
// game now introduces creatures in a different order from the Normal one — Two
// Rivers meets a Dark Priest on wave 6 and a Blocker on wave 7, where its Normal
// table has neither at all — and wave 9 of it sends no Tough Thugs while waves 8
// and 10 both do. No rule produces that. A person playing it does.
//
// SO extendedOf IS GONE, and with it the note that used to sit here explaining why
// three constants at this spot had no business existing. They have business now:
// three level files import them, which is exactly the thing the old note said was
// missing.
//
// THESE ARE THE HARD COUNTS, not base counts, and that distinction cost a
// release. They were tuned by playing at Hard, so Hard multiplies by 1 and plays
// them exactly — see DIFFICULTIES in data/difficulty.js. Normal takes 0.85 of
// them.
//
// The line that stood here claimed Hard still multiplied by 1.10 AND that "Hard
// Extended plays exactly what was tested", which cannot both be true. It was the
// second half that was meant and the first half that was running: a wave dialled
// to 22 in the panel arrived as 25. Anything written here about a difficulty is a
// claim about scaleWaves, and the two have to be read together or not at all.
//
// GROUPS ARE IN MARCH_ORDER, which is not decoration: groups spawn one after
// another, so the order they are listed in is the order they arrive in, and it is
// also the order the dashboard rebuilds them in. Written any other way, an
// untouched dashboard would hand the game a different wave from the one in this
// file — tools/admin.mjs checks all 32 of them.

export const wavesExtended = [
  { rest: 9, groups: [{ type: 'light_inf', count: 4, gap: 1.60 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 6, gap: 1.40 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 8, gap: 1.10 }, { type: 'tough_inf', count: 2, gap: 1.60 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 10, gap: 1.00 }, { type: 'tough_inf', count: 4, gap: 1.60 }] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 12, gap: 0.90 },
      { type: 'tough_inf', count: 4, gap: 1.60 },
      { type: 'heavy_inf', count: 2, gap: 2.00 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 14, gap: 0.80 },
      { type: 'tough_inf', count: 4, gap: 1.60 },
      { type: 'blocker_inf', count: 2, gap: 1.60 },
      { type: 'heavy_inf', count: 2, gap: 1.80 },
      { type: 'archer_inf', count: 2, gap: 1.80 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 18, gap: 0.70 },
      { type: 'tough_inf', count: 4, gap: 1.60 },
      { type: 'blocker_inf', count: 2, gap: 1.60 },
      { type: 'heavy_inf', count: 4, gap: 1.80 },
      { type: 'archer_inf', count: 6, gap: 1.70 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 22, gap: 0.60 },
      { type: 'tough_inf', count: 6, gap: 1.40 },
      { type: 'blocker_inf', count: 4, gap: 1.40 },
      { type: 'heavy_inf', count: 4, gap: 1.60 },
      { type: 'archer_inf', count: 8, gap: 1.60 },
      { type: 'plague_inf', count: 2, gap: 2.00 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 26, gap: 0.50 },
      { type: 'tough_inf', count: 6, gap: 1.00 },
      { type: 'blocker_inf', count: 4, gap: 1.20 },
      { type: 'heavy_inf', count: 6, gap: 1.20 },
      { type: 'archer_inf', count: 8, gap: 1.40 },
      { type: 'plague_inf', count: 2, gap: 1.40 },
      { type: 'dark_priest', count: 2, gap: 1.40 }
    ] },
  { rest: 0, groups: [
      { type: 'light_inf', count: 20, gap: 0.50 },
      { type: 'tough_inf', count: 12, gap: 0.50 },
      { type: 'blocker_inf', count: 12, gap: 0.80 },
      { type: 'heavy_inf', count: 8, gap: 0.80 },
      { type: 'archer_inf', count: 10, gap: 0.60 },
      { type: 'plague_inf', count: 4, gap: 0.60 },
      { type: 'dark_priest', count: 4, gap: 0.60 }
    ] }
];

export const wavesForkExtended = [
  { rest: 9, groups: [{ type: 'light_inf', count: 4, gap: 1.60 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 6, gap: 1.40 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 8, gap: 1.10 }, { type: 'tough_inf', count: 2, gap: 1.60 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 10, gap: 1.00 }, { type: 'tough_inf', count: 4, gap: 1.60 }] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 12, gap: 0.90 },
      { type: 'heavy_inf', count: 2, gap: 2.00 },
      { type: 'dark_priest', count: 2, gap: 1.60 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 14, gap: 0.80 },
      { type: 'blocker_inf', count: 2, gap: 1.60 },
      { type: 'heavy_inf', count: 2, gap: 1.80 },
      { type: 'archer_inf', count: 2, gap: 1.80 },
      { type: 'plague_inf', count: 2, gap: 2.00 },
      { type: 'dark_priest', count: 2, gap: 1.60 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 18, gap: 0.70 },
      { type: 'tough_inf', count: 4, gap: 1.60 },
      { type: 'blocker_inf', count: 2, gap: 1.60 },
      { type: 'heavy_inf', count: 2, gap: 1.60 },
      { type: 'archer_inf', count: 4, gap: 1.60 },
      { type: 'plague_inf', count: 4, gap: 2.00 },
      { type: 'dark_priest', count: 2, gap: 1.60 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 24, gap: 0.60 },
      { type: 'tough_inf', count: 4, gap: 1.60 },
      { type: 'blocker_inf', count: 4, gap: 1.60 },
      { type: 'heavy_inf', count: 4, gap: 1.40 },
      { type: 'archer_inf', count: 6, gap: 1.60 },
      { type: 'plague_inf', count: 2, gap: 2.00 },
      { type: 'dark_priest', count: 2, gap: 1.60 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 30, gap: 0.50 },
      { type: 'tough_inf', count: 6, gap: 1.40 },
      { type: 'blocker_inf', count: 4, gap: 1.40 },
      { type: 'heavy_inf', count: 6, gap: 1.20 },
      { type: 'archer_inf', count: 6, gap: 1.40 },
      { type: 'plague_inf', count: 2, gap: 1.40 },
      { type: 'dark_priest', count: 4, gap: 1.40 }
    ] },
  { rest: 0, groups: [
      { type: 'light_inf', count: 34, gap: 0.40 },
      { type: 'tough_inf', count: 8, gap: 1.00 },
      { type: 'blocker_inf', count: 8, gap: 1.00 },
      { type: 'heavy_inf', count: 6, gap: 1.00 },
      { type: 'archer_inf', count: 6, gap: 1.00 },
      { type: 'plague_inf', count: 4, gap: 1.00 },
      { type: 'dark_priest', count: 4, gap: 1.00 }
    ] }
];

export const wavesLongExtended = [
  { rest: 9, groups: [{ type: 'light_inf', count: 4, gap: 1.60 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 6, gap: 1.40 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 8, gap: 1.20 }, { type: 'tough_inf', count: 1, gap: 1.60 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 10, gap: 1.10 }, { type: 'tough_inf', count: 2, gap: 1.60 }] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 12, gap: 1.00 },
      { type: 'tough_inf', count: 2, gap: 1.60 },
      { type: 'heavy_inf', count: 1, gap: 1.20 },
      { type: 'archer_inf', count: 2, gap: 1.20 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 14, gap: 0.90 },
      { type: 'tough_inf', count: 2, gap: 1.60 },
      { type: 'heavy_inf', count: 2, gap: 1.20 },
      { type: 'dark_priest', count: 2, gap: 0.80 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 16, gap: 0.80 },
      { type: 'tough_inf', count: 2, gap: 1.40 },
      { type: 'blocker_inf', count: 2, gap: 1.60 },
      { type: 'heavy_inf', count: 2, gap: 1.20 },
      { type: 'archer_inf', count: 4, gap: 1.20 },
      { type: 'plague_inf', count: 2, gap: 1.20 },
      { type: 'dark_priest', count: 2, gap: 0.80 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 16, gap: 0.70 },
      { type: 'tough_inf', count: 4, gap: 1.40 },
      { type: 'blocker_inf', count: 4, gap: 1.60 },
      { type: 'heavy_inf', count: 4, gap: 1.20 },
      { type: 'archer_inf', count: 4, gap: 1.20 },
      { type: 'plague_inf', count: 2, gap: 1.20 },
      { type: 'dark_priest', count: 2, gap: 0.80 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 16, gap: 0.60 },
      { type: 'blocker_inf', count: 6, gap: 1.60 },
      { type: 'heavy_inf', count: 6, gap: 1.20 },
      { type: 'archer_inf', count: 6, gap: 1.20 },
      { type: 'plague_inf', count: 2, gap: 0.80 },
      { type: 'dark_priest', count: 2, gap: 0.80 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 18, gap: 0.50 },
      { type: 'tough_inf', count: 6, gap: 1.00 },
      { type: 'blocker_inf', count: 6, gap: 1.40 },
      { type: 'heavy_inf', count: 6, gap: 1.20 },
      { type: 'archer_inf', count: 6, gap: 1.00 },
      { type: 'plague_inf', count: 2, gap: 0.60 },
      { type: 'dark_priest', count: 4, gap: 0.60 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 20, gap: 0.40 },
      { type: 'tough_inf', count: 8, gap: 0.80 },
      { type: 'blocker_inf', count: 6, gap: 1.20 },
      { type: 'heavy_inf', count: 8, gap: 1.20 },
      { type: 'archer_inf', count: 8, gap: 0.80 },
      { type: 'plague_inf', count: 4, gap: 0.60 },
      { type: 'dark_priest', count: 4, gap: 0.40 }
    ] },
  { rest: 0, groups: [
      { type: 'light_inf', count: 24, gap: 0.30 },
      { type: 'tough_inf', count: 10, gap: 0.60 },
      { type: 'blocker_inf', count: 8, gap: 0.80 },
      { type: 'heavy_inf', count: 8, gap: 1.00 },
      { type: 'archer_inf', count: 10, gap: 0.60 },
      { type: 'plague_inf', count: 4, gap: 0.40 },
      { type: 'dark_priest', count: 4, gap: 0.20 }
    ] }
];

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

// --- THE SHORT TABLES, DERIVED FROM THE LONG ONES ------------------------------
//
// The short game is the long game without its last two waves. One line, and the
// direction it points is the whole of what this section is about.
//
// IT USED TO POINT THE OTHER WAY: three short tables were the tuned thing and
// `extendedOf` grew two waves off the end of each. That was right while the short
// game was the tuned one — and it stopped being right the moment the owner played
// and hand-tuned all three maps at the LONG length. The numbers that have been
// tested now live in the long tables, so the short ones are the derivation.
//
// THE RELATIONSHIP IS THE OWNER'S, not an invention of this file: he asked for
// "my hard difficulty extended waves numbers to update normal length", and the
// tables he supplied are exactly two waves longer than each map's short one. That
// is the same relationship the old rule asserted, read off real data instead of
// asserted by a function.
//
// WHAT IT FIXES is bigger than tidiness. The short tables were written before the
// Tough Thug, the Blocker Thug and the Dark Priest existed and had never been
// touched since — so the ONLY way to meet three of the game's seven enemies was to
// pick Extended on the title screen. A player choosing the shorter game got an
// older game.
//
// THE LAST WAVE'S REST GOES TO 0, which is not cosmetic: `rest` is the breather
// after a wave clears, and 0 is how a table says "nothing follows". Wave 8 of the
// long table has two waves behind it and rests 9; as the last wave of the short
// one it has none, and a 9 there would hold the win screen back for nine seconds
// of empty road.
const shortOf = table => table.slice(0, -2).map((w, i, kept) =>
  i === kept.length - 1 ? { ...w, rest: 0 } : w);

export const waves = shortOf(wavesExtended);
export const wavesFork = shortOf(wavesForkExtended);
export const wavesLong = shortOf(wavesLongExtended);

// Total enemies in a wave, for the HUD and for tools/sim.mjs.
export const waveSize = w => w.groups.reduce((n, g) => n + g.count, 0);
