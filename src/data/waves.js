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
const enemyArrow = { ...arrow };

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
    // Per second, for this many seconds. 6 x 5 is 30 health — under a third of
    // a spearman and under a fifth of a swordsman, so a man left standing in it is
    // hurt but not finished by one flask.
    //
    // IT WAS 10 x 5 FOR ONE BUILD, and 5 x 4 and 6 x 3 before that. The owner
    // brought the rate back to 6 and kept the five seconds.
    //
    // The extra second is not free and is worth knowing about: the spill on the
    // ground lasts exactly as long as the poison does, so the patch he leaves is
    // dangerous for five seconds.
    dps: 6,
    seconds: 5
  }
};

// THE DARK PRIEST'S MISSILE, and the second piece of enemy ammunition in the game.
//
// Shaped like every other projectile — `kind`, `speed`, `arc`, `impact` — because
// projectiles.js reads them all the same way. Flat and fast like the monastery's
// own missiles rather than lobbed like a flask: it is the same magic, thrown by
// the other side.
// THE BOULDER GIANT'S BOULDER: hurled in a high lob at the ground a soldier stands
// on, and everyone within `splash` of where it comes down takes the blow — 80, at
// the owner's word (it was 100). Earth thrown up where it lands, as a catapult's rock does, and
// `boulder_hit` as it does (LANDING in src/projectiles.js).
export const BOULDER_SPLASH = 80;   // 100 -> 80, at the owner's word
const boulder = {
  kind: 'boulder',
  sprite: 'boulder',
  trim: [216, 226, 80, 60],
  faces: 0,
  grip: 0.5,
  speed: 190,
  lob: true,
  arc: 0.3,
  splash: BOULDER_SPLASH,
  impact: true,
  landSound: true
};

const darkMissile = {
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

// THE CROW HARBINGER'S BOLT: a smoky blot of arcane, drawn head-first to the LEFT
// with its wisps trailing right, so it faces -1. Credited and heard as the Dark
// Priest's missile is (`kind: 'dark'`) until he has sounds of his own.
const arcaneBolt = {
  kind: 'dark',
  sprite: 'harbinger_bolt',
  trim: [207, 229, 98, 54],
  faces: -1,
  grip: 0.5,
  speed: 330,
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
    // 72 -> 88 -> 94 -> 70 -> 60. The first three were forced upward each time the
    // artist moved the plots and archery got more road to shoot at. Everything since
    // has gone the other way: two deliberate slow-downs of the whole game, and the
    // difficulty that speed used to provide now comes from the heavies below and
    // from the later waves being bigger.
    //
    // AT 60 HE WALKS AT EXACTLY A SOLDIER'S PACE, which every rung of the barracks
    // now shares. That costs the squad nothing, because a barracks does not CHASE:
    // it puts men on the road and takes hold of what walks into them, and a held
    // enemy is stopped dead. Measured in a real wave, an engaged Thug moves 4px
    // while a soldier has him against 568px when he is free.
    speed: 60,      // logical px per second
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
    speed: 60,      // the Thug's, unchanged — see the note above
    // Between the Thug's 15 and the Giant's 40, nearer the Thug: he is worth
    // about two and a half of one to kill and pays about one and a half.
    bounty: 25,
    leak: 1,
    damage: 20,
    atkCd: 1.0,
    r: 8,
    colour: '#A87C4E'
  },

  // THE ASSASSIN'S MIRROR, and the first enemy in the game that towers cannot see.
  //
  // The owner's brief: "a thug that strikes a lot harder and can turn invisible
  // when not facing a soldier. This invisibility is like assassins invisibility
  // where no projectiles can hit it but any AOE damage can still hurt him if he is
  // nearby the blast. Only then when a soldier faces him, he now can be targeted
  // like a normal enemy."
  //
  // WHAT THAT IS, MECHANICALLY, is one field — `unseen` — and the whole of the
  // rule lives in unseen() in src/units.js, beside the assassin's own `hidden`. He
  // is revealed exactly while `e.foe` is set, which is the soldier who has hold of
  // him: no new state, and the thing that reveals him is the thing that stops him.
  //
  // THE BOARD HAS ONE ANSWER TO HIM AND IT IS THE BARRACKS. Archery, siege and the
  // monastery all fire projectiles and all come through pickTarget, so none of
  // them can pick him at all. Send a soldier and he is an ordinary thug; send
  // nobody and the only thing that touches him is a splash he happened to be
  // standing in. That is a sharper version of the question the Blocker asks —
  // "shoot him and he turtles, send a soldier and he opens up" — and it is the
  // first enemy whose answer is a barracks FULL STOP rather than a barracks first.
  //
  // WHICH MAKES ONE THING LOAD-BEARING: every board must be able to build one.
  // All twelve can today — the tutorial caps at tier 2 and a Militia Camp is tier
  // 1 — but a board that capped the ladder below a barracks and sent Shadow Thugs
  // would be unwinnable, and nothing would say so: the waves would spawn, the
  // towers would build, and the road would simply never be defended.
  // tools/unseen.mjs asks that of every level file rather than of this paragraph.
  //
  // AND A SPLASH STILL FINDS HIM, which is the owner's second sentence and the
  // half that keeps him beatable without a squad. A rock or a cannonball is thrown
  // at a patch of GROUND and hurts whoever is standing in it — see the victims
  // loop in land() in src/projectiles.js, which has no aiming step to skip him at.
  // Artillery is the one family that can kill him blind, and it cannot aim at him
  // to do it.
  //
  // 250 HEALTH is the Blocker's exactly, and 30 damage is three times his. The
  // bounty sits at 35 with the Dark Priest — above the Blocker's 30 for the same
  // health and above the Tough Thug's 25 for half again his damage, below the
  // Giant's 40 because he is still a man-sized body.
  //
  // TWO RANKS OF BREAK, and on this board that is not a discount, it is a flat
  // rate. The heaviest physical plate any soldier in the game wears is the
  // Paladin's med, which is rank 2 — so his break takes EVERY soldier to none and
  // his 30 lands as 30 on all five of them. The Giant's one rank moves the Paladin
  // alone; nothing else on the road is flat against the whole ladder.
  //
  // THE BOSS IS THE ONLY OTHER THING WITH TWO, which is the right company to be
  // keeping and worth knowing before this is tuned: being unanswerable by armour
  // was a boss's privilege, and this is an ordinary enemy who can arrive at wave
  // three. tools/unseen.mjs measures all five rungs end to end through units.js
  // rather than taking this paragraph's word for it — and the first version of the
  // paragraph said "the only creature in the game", which the check disproved.
  //
  // HE HAS THREE DRAWINGS OF HIS OWN: a masked thug with a sword held overhead at
  // rest, thrust out in front of him swinging, and a corpse. The owner's "use the
  // default image for description panel and encyclopedia" is what every card in the
  // game already does — the Default pose is the portrait — and the art landed the
  // same day.
  //
  // HE IS THE TALLEST ORDINARY ENEMY ON THE ROAD, at 159 source px against the
  // Thug's 116, and all of the difference is the raised blade. His BODY is the
  // Thug's: a 59px round blob either way, which is why `r` stays 8. A health bar
  // hangs off the tallest drawing a figure has, so his sits above the sword and
  // stays there when he lowers it — see artHeight in src/render.js.
  //
  // HIS SHADOW IS AT SOURCE (265.0, 324.0) IN BOTH POSES, to the pixel, so the arm
  // swings and nothing else moves. That is the rule every figure in this game
  // keeps, and it is measured rather than assumed — the x of all three pivots below
  // was reproduced from the artwork by the same method that reproduces the Thug's
  // shipped numbers exactly. tools/shadow.mjs is the check.
  //
  // WHAT TELLS HIM APART ON THE BOARD IS STILL THE CLOAK: half alpha whenever
  // nothing has hold of him, which is the assassin's own UNSEEN. `colour` is his
  // own, for the vector fallback and anywhere the UI keys on it.
  //
  // AND HIS VOICE IS THE COMMON ONE, at "sound is just like a normal enemy sound
  // (thug/tough thug)" — which costs nothing to arrange, because an enemy with no
  // `voice` field already falls through to the thug's line. See selectionCue in
  // src/audio.js. His death cry is decided by what killed him, as every creature's
  // is, so that needed nothing either.
  shadow_inf: {
    name: 'Shadow Thug',
    sprite: 'shadow',
    spriteTrim: [191, 174, 118, 159],   // source px, re-paste from tools/trim.mjs
    pivot: [0.627, 0.943],              // the centre of his ground shadow
    attack: { sprite: 'shadow_attack', trim: [118, 217, 191, 116], pivot: [0.770, 0.922] },
    spriteFaces: -1,
    dead: 'dead_shadow',
    deadTrim: [155, 212, 202, 88],
    deadPivot: [0.171, 0.790],
    hp: 250,
    damageType: 'physical',
    // NONE, at the owner's word, and it is the right shape for him rather than a
    // saving. He is hard to HIT, not hard to hurt — so the moment a soldier pins
    // him he takes everything at full price, which is what makes sending one worth
    // it. Armour on top of the cloak would have made him both.
    armour: { physical: 'none', magic: 'none' },
    pierce: 2,
    // INVISIBLE UNTIL SOMEBODY HAS HOLD OF HIM. One field, read by unseen() in
    // src/units.js — and deliberately NOT named `hidden`, which is the assassin's
    // and pairs with a per-frame `exposed` an enemy does not have.
    unseen: true,
    speed: 50,      // a Blocker's pace, not a Thug's
    bounty: 35,
    // TWO LIVES, raised from one at the owner's word. He is the third creature on
    // the road worth two, beside the Giant and the Rally Thug, and the reason is
    // the same as the reason nothing can shoot him: a board that fails to stop one
    // has not misjudged a health bar, it has failed to bring the only thing that
    // could have stopped him at all.
    leak: 2,
    damage: 30,
    atkCd: 1.0,     // the Thug's, unchanged
    r: 8,
    colour: '#4A4453'
  },

  // THE STANDARD-BEARER, and the first enemy that makes the ones around it harder
  // to kill.
  //
  // The owner's brief: "a thug that strikes hard and boost health of nearby
  // enemies by 20%... when an enemy unit is within range of rally thug aura (100 px
  // radius), their health is boosted by 20% as long as they are still within range.
  // Once they are out of the range, health returns back to normal."
  //
  // EVERY OTHER ENEMY IN THIS GAME IS WORTH WHAT ITS OWN CARD SAYS. The Dark Priest
  // comes closest — he puts health back — but he puts back health that was already
  // taken, at a rate, on one man at a time, and the bar he fills is the same bar.
  // This one raises the BAR, on everything standing near him, for as long as it
  // stands there. It is the first time a tower's arithmetic — how many shots to
  // kill this — depends on where the target happens to be walking.
  //
  // A FIFTH, AND IT IS A LOAN RATHER THAN A GIFT. The 20% is taken back when the
  // enemy leaves the aura, and the owner's example is the whole rule:
  //
  //     Thug health 80 -> in range, 96 -> shot down to 10 -> out of range, 1
  //
  // So health spent inside the aura is not refunded outside it, and a thug walked
  // through a rally and then shot is a thug on one point of health. That is the
  // counter-play, and it is why the loan is worth taking rather than simply being
  // a 20% tax on every tower: kill them AFTER they leave him and the boost has cost
  // them nearly everything. See rallyAura in src/enemies.js for the arithmetic and
  // the floor of 1.
  //
  // ONCE IN A LIFETIME, at the owner's ask — "enemies can only have their health
  // boosted once. Once out of range, they can no longer be boosted." Two Rally
  // Thugs do not stack, and walking back into an aura does nothing. Without that
  // rule a column shuffling in and out of range would be topped up all the way down
  // the road and the loan would never come due.
  //
  // 350 HEALTH IN MED PLATE ON BOTH AXES, which is the sturdiest card in the game
  // outside the boss: half of every physical blow and half of every magic one. He
  // is not the biggest bag of health — the Giant's 800 is — but he is the only
  // thing on the road with no soft side, so "shoot him with the other thing" does
  // not work on him.
  //
  // AND ONE RANK OF BREAK, the Giant's, which moves the Paladin alone. He is a
  // hard hitter rather than the flat-rate one: see the Shadow Thug above, who
  // breaks two.
  //
  // TWO LIVES, like the Giant, at the owner's word. Letting one through costs what
  // letting a Giant through costs, and that is the right price for the creature
  // that was making everything behind it harder to stop.
  //
  // HE WEARS HIS OWN THREE DRAWINGS — a helmeted thug with a sword and a banner on
  // his back — and the common thug voice, at "sound is just like a normal enemy
  // sound". His shadow is at source (252.0, 321.5) in both living poses, to the
  // pixel.
  rally_inf: {
    name: 'Rally Thug',
    sprite: 'rally',
    spriteTrim: [174, 182, 164, 148],   // source px, re-paste from tools/trim.mjs
    pivot: [0.476, 0.943],              // the centre of his ground shadow
    attack: { sprite: 'rally_attack', trim: [121, 182, 217, 148], pivot: [0.604, 0.943] },
    spriteFaces: -1,
    dead: 'dead_rally',
    deadTrim: [147, 215, 217, 82],
    deadPivot: [0.161, 0.841],
    hp: 600,        // raised from 350 at the owner's word
    damageType: 'physical',
    armour: { physical: 'med', magic: 'med' },
    pierce: 1,
    // THE AURA. `range` is a radius in game px and `times` a multiplier on the
    // ATTACK of everything physical standing inside it — the owner's "for those
    // enemies that deals physical damage is boosted by 50% on their attack damage".
    //
    // IT USED TO BE HEALTH, at `share: 0.2`, and swapping the two changed what the
    // creature is for. A fifth more health made a wave take longer to kill; half
    // again on its blows makes it kill FASTER, which is a threat to the squad rather
    // than to the clock. The player answers it by killing the Rally Thug rather than
    // by out-damaging what he lends.
    //
    // PHYSICAL ONLY, so the Plague Doctor's flask and the Dark Priest's bolt are
    // untouched — they are the two magic attacks on the road. Every other creature
    // in the game strikes physically, including the boss.
    //
    // AND HE IS BOOSTED LIKE ANYTHING ELSE. He strikes physically, so two of them
    // standing together sharpen each other — the owner's "rally thugs can boost each
    // other too but only 1 boost at a time". He cannot boost himself, which needs no
    // rule: a figure is not standing near itself.
    //
    // NO COMPOUNDING, which is also what "only 1 boost at a time" means. "Boosts
    // cannot compound and only can boost 50% even though there are 2 rally thugs
    // nearby" — so the multiplier is read off whichever source is in range rather
    // than multiplied across all of them, and a figure wears one mark however many
    // auras it stands in, itself included.
    //
    // 150px, RAISED FROM 100 at the owner's word. It is half again as far and more
    // than twice the ground: an aura is a circle, so 150 covers 2.25x the area 100
    // did, and on a road it is the LENGTH that counts — 300px of column against 200.
    //
    // Read by rallyAura in src/enemies.js. A def with no `rally` block simply has
    // no aura, so this is the only creature the pass does any work for.
    rally: { range: 150, times: 1.5 },
    speed: 45,      // the slowest thing on the road but the boss
    // 60 AND THREE LIVES, both raised at the owner's word (from 45 and 2) along
    // with his health. He is worth more to kill than his own health says, because
    // what he is worth is everything standing near him — and no other creature
    // costs as many lives to let through.
    bounty: 60,
    leak: 3,
    damage: 30,
    atkCd: 1.0,     // the Thug's, unchanged
    r: 8,
    colour: '#6B5A3A'
  },

  // THE ONE THAT CANNOT BE FOUGHT. Every other creature on this road walks into a
  // soldier and starts something that takes seconds to settle; this one walks into
  // a soldier and the fight is already over.
  //
  // The owner's brief: "a thug that sacrifices himself by bombing himself when in
  // contact with a soldier. Deals a lot of damage but kills himself in the process."
  //
  // 120 OVER 100px, AND THAT IS FOUR TIMES THE HARDEST BLOW IN THE GAME. The Giant
  // hits for 50 and the Rally Thug for 30; the boss himself hits for 60. This lands
  // 120 on everybody inside a 100px circle at once, through one rank of plate, and
  // a tier 1 spearman has 100 health. So a Bomb Thug that reaches a line does not
  // hurt it, it deletes it — and against the tier 4s, who are the only men in the
  // game who survive one, it still takes more than half of a paladin.
  //
  // HIS COUNTER IS THE OTHER HALF OF THE BOARD. 120 health and no armour at all,
  // which is the Archer Thug's card exactly and the softest thing on the road after
  // the plain Thug: two ballista bolts, three arrows from a tier 3 bow. He is not a
  // problem you solve with a better wall, because no wall survives him; he is a
  // problem you solve by not letting him arrive, which is what the archery and the
  // artillery are for. That is the whole design of the creature and it is why the
  // two numbers are so far apart.
  //
  // 150 -> 120 at the owner's word, and it widens that gap rather than changing the
  // shape: he now carries exactly as much health as the blow he strikes with.
  //
  // AND KILLING HIM DOES NOT MAKE HIM SAFE, which is the part that makes him worth
  // more than an arithmetic problem. The bomb is not triggered when he falls — it
  // lies where he fell and goes off 2 seconds later for the same 120 — so shooting
  // one down on top of your own line kills your line anyway. See src/bombs.js.
  //
  // `splash` IS THE SAME FIELD A CATAPULT USES, which is what puts the blast icon
  // on his card and in his panel without a line of UI code: see shownSplash in
  // src/select.js. It is read for the blast itself in src/bombs.js rather than by
  // the Captain's `sweep`, and the note at the top of that file says why.
  //
  // NO ATTACK DRAWING AND NO `attack` BLOCK. He is the only creature in the game
  // without one, and it is not a gap in the upload: he has no attack pose because
  // he has no attack, only an ending. enemyStance in src/render.js falls through to
  // the Default for a def with no `attack`, which is exactly right — he is walking
  // right up until the frame he is not there.
  //
  // `atkCd` IS STILL 1.0 AND IT NEVER RUNS OUT TWICE. `acd` starts a creature's
  // life at zero and is only ticked by the man holding it, so the blast lands on
  // the first frame of contact — the number below is what the clock would be reset
  // to for a second blow, and there is no second blow. It is here because every
  // creature's counter-attack reads it, and a field that must exist and cannot
  // matter is better written down than left to be undefined.
  //
  // HIS BODY IS THE THUG'S. 92 source px wide against 96 and the same 116 tall, so
  // `r` stays 8 and he stands in a lane exactly as the rest of them do — the bomb
  // he carries is held in front of him and adds nothing to his footprint.
  bomb_inf: {
    name: 'Bomb Thug',
    sprite: 'bomb',
    spriteTrim: [210, 198, 92, 116],   // source px, re-paste from tools/trim.mjs
    pivot: [0.620, 0.905],             // the centre of his ground shadow
    spriteFaces: -1,
    // THE BODY, WITHOUT THE BOMB. Enemies_Bomb_Thug_Self.png rather than the Dead
    // drawing beside it, because the bomb in that drawing is not a corpse — it is
    // still live, and it is drawn by src/bombs.js on its own clock. The Dead file
    // is the two of them together and the game never loads it; it is the reference
    // the offset between them was measured off.
    //
    // It is in assets/enemies/ with his other four rather than in assets/dead/
    // with every other corpse in the game. See the note over `bomb_dead` in
    // src/assets.js for why that is the rule rather than an oversight.
    dead: 'bomb_dead',
    deadTrim: [161, 217, 108, 77],
    deadPivot: [0.315, 0.851],
    hp: 120,
    damageType: 'physical',
    armour: { physical: 'none', magic: 'none' },
    pierce: 1,
    // A HUNDRED PIXELS OF IT. The Cannon Outpost's blast is 85 and the Trebuchet's
    // is the widest thing the player owns; his is wider than either.
    splash: 100,
    // THE THUG'S PACE, and it is the number that decides whether the creature is
    // fair. He has to cross the same road everything else crosses to be shot at
    // for the same length of time — a Bomb Thug who ran would be a Bomb Thug who
    // arrives, and arriving is the whole of his damage.
    speed: 60,
    // FIVE MORE THAN THE ARCHER THUG, whose health and armour he now shares exactly.
    // It was the Plague Doctor's 30 read off a shared 150 health, and the health
    // moved; the number stays, and what it is worth is no longer a matter of how
    // hard he is to kill but of what it costs to fail. An Archer Thug that gets
    // through takes a life. This one that gets through takes a squad.
    //
    // AND IT IS ONLY EVER PAID FOR ONE OF HIS TWO ENDINGS: a Bomb Thug who reaches
    // a soldier was not killed by anybody and pays nothing, on the same rule that
    // gives a leaked enemy no body. See the `blown` branch in src/enemies.js.
    bounty: 30,
    leak: 1,
    damage: 120,
    atkCd: 1.0,
    r: 8,
    colour: '#4B3410',
    // WHAT MAKES HIM ONE. Read in two places and nowhere else: the counter-attack
    // in src/units.js, which calls detonate instead of swinging, and the death path
    // in src/enemies.js, which leaves a live bomb behind the body.
    bomb: true
  },

  // THE DARK CROW, and the first thing on the road that is not ON the road.
  //
  // The owner's brief: "A crow that flies to the exit fast. Does not attack
  // anybody... Only archery and monastery towers/units and assassins with knife
  // throw can attack crows."
  //
  // WHAT THAT IS, MECHANICALLY, is the `flying` block below and one question asked
  // of every weapon in the game: does what it throws reach the air? `air` on the
  // AMMUNITION is the answer — see the arrow in data/towers.js — so a tower, a
  // garrison man and an assassin's knife all say it the same way, by what leaves
  // their hand. Arrows, quarrels, musket balls, knives and the monastery's missiles
  // carry it; a rock, a bolt and a cannonball do not, and nor does anything a
  // soldier holds, because no soldier can take hold of a bird. pickTarget asks it
  // of the aim and the splash loop in src/projectiles.js asks it of the landing, so
  // a catapult neither aims at a crow nor catches one in its blast.
  //
  // THE BARRACKS HAS NO ANSWER TO HIM, and that is the point of him: he is the
  // Shadow Thug turned inside out. That one is only a barracks' to kill; this one
  // is only the bows' and the altars'. A board built all walls and machines lets
  // every crow through.
  //
  // HE DOES NOT FIGHT. `damage: 0` and no `atkCd`, because nothing ever holds him
  // to swing at — and a zero rather than a missing field so that every table that
  // adds damage up across the roster stays a sum of numbers. The card and the
  // panel leave the attack out for a zero; see selectionInfo in src/select.js.
  //
  // 60 HEALTH, NO PHYSICAL PLATE AND HIGH MAGIC, at the owner's word — down from
  // 100 and none on both. So of the two families that can reach him, it is the
  // BOWS that bring him down: an arrow meets nothing and a tier 1 bow needs six of
  // them, while the monastery's missiles meet his high ward and do a fraction of
  // their number. The altars can still hurt him; they are not the answer to him.
  //
  // SPEED 80, the owner's number, down from a first guess of 100: still the
  // fastest thing on the road — the Thug walks at 60 — and a third again faster
  // than him. His wings are heard on every stroke; see flapped() in src/enemies.js.
  crow: {
    name: 'Dark Crow',
    // THE DEFAULT IS THE PORTRAIT AND THE FIRST WINGBEAT, both. The book and the
    // panel draw this trim; on the board it is one of the three frames below.
    sprite: 'crow',
    spriteTrim: [217, 180, 78, 152],   // source px, re-paste from tools/trim.mjs
    // THE CENTRE OF HIS SHADOW, on the ground under him, and that is where he IS:
    // the owner's "shadow will be the centre point of the crow in 3d like world".
    // Every reach, every lane position and every tap box in the game measures from
    // this point, exactly as it does for a man standing on the road — the bird is
    // drawn above it.
    pivot: [0.519, 0.942],
    spriteFaces: -1,
    // THE BODY, lying on its own shadow. Faded out like every other corpse.
    dead: 'dead_crow',
    deadTrim: [216, 241, 80, 30],
    deadPivot: [0.456, 0.833],
    hp: 60,
    damageType: 'physical',
    armour: { physical: 'none', magic: 'high' },
    speed: 80,
    bounty: 20,
    leak: 1,
    damage: 0,
    r: 8,
    colour: '#655A48',
    // HIS OWN CRY WHEN HE DIES, in place of the kill line the weapon would have
    // played: a key into CUE in src/audio.js. Category B, at the owner's word —
    // on the background bus, so every crow shot down is heard.
    cry: 'crowDies',
    // HE FLIES. Read by pickTarget, the splash, the soldiers' block, the renderer
    // and the death path, and by nothing else.
    //
    //   frames   the wingbeat: Default, Flying 1, Flying 2 and back through 1, so
    //            the wings go up, level, down, level and never jump from down to up.
    //            All three drawings put the shadow on the same pixel, so the pivot
    //            only differs because the trims do — the ground under him does not
    //            move while the wings do.
    //   lift     how far the BIRD is above that shadow in each frame, in source px:
    //            the middle of his body, which is where an arrow goes in. The wings
    //            carry the body down as they beat, which is why the three differ.
    //   stride   game px flown per frame of the wingbeat. Driven by distance rather
    //            than time, so a crow that is slowed flaps slower.
    //   shadow   where the shadow sits in the Default drawing, in source px. The
    //            Falling drawing has none — a falling bird's shadow is not a
    //            property of the bird — so it is cut from here and laid on the
    //            ground under him while he drops. See drawCorpse.
    //   fall     seconds from the shot to the ground.
    //   fallen   the Falling drawing: its trim, and its middle as the anchor,
    //            because the renderer moves that point from the air to the ground.
    //   rest     how far the body's middle sits above its shadow in the Dead
    //            drawing, in source px — where the drop ends, so the Falling bird
    //            lands exactly where the Dead one lies.
    flying: {
      frames: [
        { sprite: 'crow',       trim: [217, 180, 78, 152], pivot: [0.519, 0.942], lift: 113 },
        { sprite: 'crow_flap1', trim: [217, 199, 78, 133], pivot: [0.519, 0.934], lift: 104 },
        { sprite: 'crow_flap2', trim: [217, 212, 78, 120], pivot: [0.519, 0.927], lift: 86 }
      ],
      // 13, slowed from 9 when each stroke had a flap of its own to fit. The
      // wings are one recording for the whole flock now — see flapped() in
      // src/enemies.js — so this is a matter of look: a wingbeat is 0.65s at his
      // 80, and 9 would put it back to 0.45s.
      stride: 13,
      shadow: [236, 316, 43, 16],
      fall: 0.5,
      fallen: { sprite: 'crow_falling', trim: [217, 230, 78, 52], pivot: [0.5, 0.5] },
      rest: 10
    }
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
  // render.js for the drawing and wornBy in data/armor.js for the plate; the two
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
    speed: 50,
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
    // Level with the militia at 60 and ahead of the doctor's 50. He is not a wall
    // and not a straggler; he walks with the wave and starts working before it
    // arrives.
    speed: 60,
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
    name: 'Club Giant',
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
    // AND THEN 30 -> 25 WITH A SWEEP AND BACK TO 40 WITHOUT ONE, later and
    // separately — see `damage` below. What follows is the pass BEFORE those, kept
    // because it is where his shape came from:
    //
    // 1500 -> 1000, and 18 -> 30 damage in the same pass. That pair is the
    // single biggest change this file has taken, and it is worth being explicit
    // that the two halves pull in OPPOSITE directions: a third less health makes
    // him easier to kill, and two-thirds more damage makes him far worse to
    // leave alive. He has gone from a wall you grind down to a thing that kills
    // the man holding him.
    //
    // A tier 1 spearman has 100 health, and 40 a swing on a 1.2s clock kills him in
    // THREE — 3.6 seconds against a respawn of eight, where 30 took four swings and
    // 4.8s. One giant beats one squad outright and does it a second faster than the
    // version this note was written for. What answers him is a tower rather than a
    // wall, which is the shape the change asks for.
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
    // every other pierce in the game — see the last section of tools/armor.mjs:
    //
    //   a Pikeman    wears none, the break is worth nothing      40 of 40
    //   a Swordsman  low, broken to none                         40 of 40
    //   a Paladin    med, broken to low                          30 of 40
    //
    // The Paladin is the only rung where the number moves at all, and it moves a
    // long way: without the break the same club lands 20 on him. tools/armor.mjs
    // measures all four through units.js rather than reading them off here, so this
    // table is a record of a run and not a claim — it re-printed itself when the
    // club came down from 30.
    pierce: 1,
    speed: 50,      // level with the blockers, so the two arrive as one wall
    bounty: 40,
    leak: 2,        // worth two lives: letting one through really hurts
    // 40 TO ONE MAN, and the club does not sweep. The owner's word: "remove aoe
    // damage for giants and increase attack damage to 40."
    //
    // THE SWEEP WAS TRIED AND TAKEN OUT AGAIN, one build apart, and the measurement
    // is kept because it is the expensive part and it will not need doing twice. He
    // briefly did 25 to everyone within a radius — `sweep` in src/units.js, which
    // reads `def.damage` for the men around a blow as well as the man it landed on,
    // and is the Captain's blade and nothing else again now.
    //
    // HOW WIDE, measured rather than picked, because the arithmetic lies here: a
    // squad's wedge stands its men 40 to 42px apart, which says a 40px sweep should
    // reach nobody, and a squad in a fight is not standing in its wedge. Counted on
    // the frame each swing landed, three barracks on stage 4, two tiers, ~2800
    // swings — militia / knights:
    //
    //   splash 22   1.25 / 1.35        splash 48   2.20 / 2.33
    //   splash 30   1.42 / 1.55        splash 55   2.40 / 2.50
    //   splash 40   1.88 / 2.03        splash 60   2.47 / 2.58
    //
    // 40 was the knee and 40 was what shipped. If a sweeping enemy is ever wanted
    // again, that table is the answer and this is the field: `splash` on the def,
    // and units.js already applies it.
    //
    // WHAT HE IS INSTEAD is the hardest single blow of anything that walks in. 40 is
    // above the 30 he did before the sweep and well above the 25 he did during it,
    // so the trade went back the other way twice over: one man, much harder.
    damage: 40,
    atkCd: 1.2,
    // 12 -> 14, moved with the art rather than left behind, so the hitbox still
    // matches the body you can see. Checked before changing it, not after: the
    // whole sim is identical either way — same wave, same lives, same gold in
    // every scenario — so this is a picture change and not a balance one.
    r: 14,
    colour: '#8A6A4A'
  },

  // THE BOULDER GIANT, at the owner's word: "roughly similar concept to plague thug
  // but heavily emphasises on AOE physical damage and has high health."
  //
  // THE DOCTOR'S SHAPE WITH A GIANT'S WEIGHT. He walks the road at the Club Giant's
  // pace until a soldier is within 150, then stands and hurls boulders out of the
  // basket on his back — each one 30 physical to every man within 80 of where it
  // comes down, breaking one rank of plate. Held face to face, he brings a boulder
  // down on the man's head instead: 30 to that one man, no splash. Either way, as
  // the boulder hits home, `boulder_hit` (BOULDER_HIT in src/audio.js).
  //
  // HIS DRAWINGS, all four stood on his shadow at source (240, 324): the standing
  // one (also his card and his encyclopedia picture), the throw (his `attack`, as
  // the doctor's, because throwing is what he does on the road) and the blow (his
  // `melee` attack). Dead, at (159, 302).
  boulder_giant: {
    name: 'Boulder Giant',
    sprite: 'boulder_giant',
    spriteTrim: [178, 175, 156, 162],
    pivot: [0.397, 0.920],
    attack: { sprite: 'boulder_giant_throw', trim: [188, 175, 146, 162], pivot: [0.356, 0.920] },
    melee: {
      attack: { sprite: 'boulder_giant_attack', trim: [144, 175, 190, 162], pivot: [0.505, 0.920] }
    },
    spriteFaces: -1,
    dead: 'dead_boulder_giant',
    deadTrim: [114, 196, 284, 121],
    deadPivot: [0.158, 0.876],
    hp: 800,
    damageType: 'physical',
    // LOW PLATE AGAINST STEEL, none against magic: a big target, but not the Club
    // Giant's wall.
    armour: { physical: 'low', magic: 'none' },
    // ONE RANK BROKEN, thrown or swung — the owner's number, down from two.
    pierce: 1,
    speed: 50,      // the Club Giant's pace
    bounty: 40,
    leak: 2,
    // THE BLOW ON A MAN'S HEAD, face to face: 30 to him alone.
    damage: 30,
    atkCd: 1.2,
    meleeSound: 'boulder',
    r: 14,
    colour: '#6A6A6A',
    ranged: {
      range: 150,
      cd: 2.5,
      ammo: boulder,
      damage: 30
    }
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
    // brushed aside, and nothing like a Club Giant. Move it as you like — no
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
    speed: 50,
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
  // because the rule came out and the number went up in the same breath — and it is
  // 20 now, 100 a cast. That is a whole Thug and two fifths of a Blocker: the man he is working on
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
      // health per second for 5 seconds", so 50 a cast — and then doubled, at his
      // word: "increase healing to 20 health per second so now healing is 100".
      //
      // A RATE RATHER THAN A TOTAL, because that is what the status carries and
      // what he said. It was `hp: 10, seconds: 5` meaning 10 in TOTAL, which is a
      // fifth of this and reads identically at a glance; the field name is what
      // stops the two being confused after the fact.
      hps: 20,
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
    speed: 50,
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
    // STANDING WATCH, sword lowered — only ever at stage 15's camp wall, before he
    // walks out (see `captain` in src/villagers.js). Measured by tools/trim.mjs and
    // pinned to the same ground point as every other pose of his, source (263, 333).
    idle: { sprite: 'captain_idle', trim: [105, 183, 257, 166], pivot: [0.615, 0.904] },
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
      // NO DURATION OF ITS OWN. It is whatever is left of the shot cycle once the
      // loosing pose has had its share — `cd` minus `hold`, worked out in
      // updateEnemies — and that is the whole of how the owner's second rule is
      // kept: "animation should only alter between ranged reload and ranged attack
      // when shooting arrows. Default image should also not be used unless enemies
      // are not in range and he starts walking."
      //
      // A duration here could not keep it. Two fixed beats inside a longer cycle
      // leave a gap, and a gap is the Default drawing: at a 0.667s cycle with two
      // sixths of a second of poses, he stood in his walking pose for the other
      // half of every shot while a squad was in front of him. Deriving it means the
      // two poses fill the cycle exactly, whatever the rate of fire is retuned to,
      // and the gap cannot come back.
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
    // It FOLLOWS THE BOW, every time it moves, rather than being left behind — that
    // is the failure this field's independence invites: a Captain who put his
    // shield away further out than he could shoot would spend the difference on
    // every approach unarmed and unarmoured, for no reason a player could see.
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
    // Two seconds against a third-of-a-second shooting cycle, so a Captain who is
    // working on a squad never puts it up at all, and one who has finished has it
    // back well before he could want it. It was comfortably longer than the cycle
    // when the cycle was 2s and it is six times longer now.
    stow: 2,
    // WHAT HE SAYS WHEN HE IS TAPPED, and he is the first creature on the road with
    // a line of his own — everything else answers with the common thug's. One word
    // on the def, read by selectionCue in src/audio.js, which is the same opt-in a
    // tower tier uses to override its family's voice.
    // HIS OWN LINES, by moment, as the clips they play — a boss's voice belongs to the
    // boss, so a second one is silent where he has nothing recorded rather than
    // speaking with this one's voice. Read by src/enemies.js and src/units.js.
    lines: {
      enters: ['captain_enters'], pause: ['captain_pause'], healed: ['captain_healed'],
      fall: ['captain_dying'], rest: ['boss_fallen'], kills: ['captain_kills']
    },
    voice: 'captainPicked',
    spriteFaces: -1,
    // HIS BODY IS HIS OWN ELEVENTH DRAWING, dropped by the finale below rather
    // than by the death sweep — see `dropCorpse` in src/enemies.js. The fields are
    // the ordinary ones so that corpses.js needs to know nothing about bosses.
    dead: 'captain_dead',
    deadTrim: [65, 241, 307, 108],
    deadPivot: [0.645, 0.852],
    // 8,000, the owner's number, which is exactly 10 Giants. The fight is meant to
    // be the length of a wave rather than an interruption to one.
    //
    // IT HAS BEEN 5,000, 9,000 AND 10,000, and this is the owner playing it rather
    // than a rule being applied — the number that matters is how long he survives
    // the board the player has actually built by wave 11, which is not a thing any
    // arithmetic here can tell him.
    hp: 8000,
    damageType: 'physical',
    armour: { physical: 'med', magic: 'med' },
    // THE CHOICE — SPEED. Not given. 50 makes him the slowest thing in the game,
    // just under the Giant's 52, which is what a man in that much plate should be
    // and what gives the towers time to work on a bar this size. Stage 2 multiplies
    // it by the owner's 1.2, so enraged he moves at 60 — between a Blocker and an
    // Archer, and faster than the Giant he used to be slower than.
    speed: 40,
    // NO BOUNTY AND NO LEAK, at the owner's word, and the second of those is the
    // reason for the first: "Captain thug has no bounty and no live lost as if he
    // passes the exit, the game loses immediately."
    //
    // A leak COUNT would be a lie whatever number went in it. He does not take
    // lives, he takes the run — see `ends` below — so 20 would be right only on a
    // map that starts with 20 and wrong the moment one does not, and anything less
    // would say he is survivable when he is not.
    //
    // And the bounty goes with it because the two are one idea: he is not a
    // creature you trade against. There is no build to rebuild with afterwards if
    // he gets through, and the reward for stopping him is the run continuing.
    //
    // Both are read straight off the def by the death sweep and the leak, and both
    // are worth 0 there — the sweep pays `state.gold += 0` and the card prints
    // nothing rather than a coin with a zero in it. See rewardRow in render.js.
    bounty: 0,
    leak: 0,
    // HE ENDS THE RUN INSTEAD. One flag rather than a life count big enough to do
    // it by arithmetic, because those are two different claims: a leak of 20 says
    // "he costs twenty lives", which happens to lose a game that started with
    // twenty and does not lose one that started with more. This says what is meant.
    //
    // Read in the leak sweep in src/enemies.js, which takes the lives to nothing
    // rather than subtracting — so the ordinary "lives reached zero" path ends the
    // game and there is no second way to lose for the summary to disagree about.
    ends: true,
    // Sword and bow both, and the two are one number on purpose: where he is
    // standing decides how the blow ARRIVES and not how hard.
    //
    // 80, the owner's number, and it is both his kinds of damage: physical in
    // stage 1 and magic in stage 2, the same either way.
    //
    // WHAT ACTUALLY LANDS IS NOW A DIFFERENT QUESTION, because he breaks armour —
    // see `pierce` below. A spearman's low plate is broken through entirely and
    // takes the whole 80; a paladin's medium physical, which used to halve it,
    // meets a sword that breaks two ranks and takes all 80 as well. The armour on
    // the player's line stopped being an answer to him at the moment he was given
    // a pierce, which is the point of giving him one.
    damage: 80,
    // HIS SWORD BREAKS TWO RANKS OF PHYSICAL PLATE, the owner's number for stage 1
    // melee. `pierceOf` reads it and `rankAgainst` subtracts it before looking up
    // what gets through, so two ranks is 50 percentage points of the blow — see the
    // note on TAKES in data/armor.js for why a rank is always worth exactly a
    // quarter.
    //
    // It is the largest pierce in the game. A Cannon Outpost breaks two and it is
    // the only thing on the player's side that does; nothing on the road has ever
    // broken any. Against the barracks it is close to total: low plate is one rank
    // and medium is two, so every man the player can muster meets his sword as
    // though bare.
    pierce: 2,
    // ONE STRIKE A SECOND, the owner's rate, which is the tempo everything else on
    // the road swings at. What makes him a boss in a melee is the size of the blow
    // rather than the rhythm of it.
    //
    // Stage 2 divides this by the 1.2 in `rage.times`, so an enraged Captain lands
    // one every 0.83s — six strikes in five seconds, at 90 magic each, on a line
    // whose plate does nothing about it.
    atkCd: 1.0,
    ranged: {
      // 150, and it has been 200, 150, 90 and back. It sits between the Dark
      // Priest's 100 and the Archer Thug's 200, which is the right place for a
      // creature made partly of both.
      //
      // It matters because he STANDS at it. Every archery tower in the game
      // outranges 150 — a tier 1 bow reaches 190 — so wherever he plants himself
      // there is something that can be built to answer him, and standing off is a
      // fight rather than a stalemate.
      range: 150,
      // TWO SHOTS EVERY SECOND, the owner's rate. Half a second each.
      //
      // AND THIS IS THE ONLY NUMBER THAT SETS THE RHYTHM. The loosing pose takes
      // `hold` of it and the nocking pose takes the rest, so retuning this moves
      // both animations with it and can never open a gap between them for the
      // Default to show through. At half a second he nocks for a third and looses
      // for a sixth, which is the right way round for a bow: a draw and a snap.
      cd: 1 / 2,
      // The same 80 the sword does. One number for both, so his reach decides how a
      // blow arrives and never how much it is worth.
      damage: 80,
      // AND THE ARROW BREAKS TWO RANKS AS WELL, the owner's number, so his reach
      // decides nothing about what a blow is worth: 80 through two broken ranks
      // arrives the same at 150 as it does at arm's length.
      //
      // Still its own field rather than the def's even though the two now agree.
      // They are two different weapons and the shape that says so is what let the
      // arrow be 1 while the sword was 2; folding them back together would mean
      // the next time they differ is a change to `loose` rather than a number
      // here. See `loose` in src/enemies.js, where every other thrower in the game
      // falls through to the def's, none of them carrying one.
      pierce: 2,
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
      // HOW LONG THE LOOSING POSE HOLDS. A sixth of a second — a snap, where the
      // nocking that precedes it is the long half of the cycle, which is the right
      // way round for a bow. Timed rather than decayed, unlike every other figure's
      // Attack drawing, so no lunge is dragged along with it.
      //
      // It is a SHARE of `cd` rather than a beat beside it: whatever is left after
      // this is the reload, so the two always add to exactly one shot.
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
        // FOUR SECONDS, and they are two beats of two rather than one long hold.
        seconds: 4,
        // THE SECOND HALF, and it is the whole reason the pause grew. The owner drew
        // the moment twice more so it could animate: "his body remains unmoved but
        // his weapons fade off over 2 seconds."
        //
        // TWO LAYERS AT ONE ANCHOR. Both are drawn at the figure's own ground point
        // with their own pivots, which is what puts them back together as the single
        // `sprite` above — the weapons share that drawing's x extent and its
        // horizontal anchor to the pixel, and the body is the rest of it. Nothing
        // here has to know they were ever one picture.
        //
        // `seconds` is how long the fade runs and also when it STARTS: the drop
        // begins when this much of the beat is left, so the first two seconds are
        // the combined pose and the last two are the fade. Written that way round
        // — off the tail rather than off the head — because the fade has to finish
        // exactly as the beat does, and a start time measured from the front would
        // drift if the beat were ever retuned.
        drop: {
          seconds: 2,
          self:    { sprite: 'captain_pause_self',
                     trim: [185, 124, 127, 225], pivot: [0.614, 0.929] },
          weapons: { sprite: 'captain_pause_weapons',
                     trim: [112, 272, 343, 84], pivot: [0.440, 0.726] }
        }
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
        seconds: 4,
        // THREE FIFTHS OF HIS BAR, the owner's number, up from a half. A SHARE
        // rather than a number of points, so it follows his health through every
        // retune — at 8,000 that is 4,800 back over four seconds, 1,200 a second,
        // which is more than most single towers do. The four seconds behind high
        // plate are the most expensive thing on the board to fail to interrupt.
        share: 0.6,
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
      // AND HIS BLADE BREAKS TWO RANKS OF MAGIC WARD, at the owner's number.
      //
      // A pierce is always of its OWN kind — see pierceOf in data/armor.js — so
      // this is magic where stage 1's is physical, and it follows the blade turning
      // magic rather than being a second thing to remember. It also lands on a line
      // that has almost nothing to break: a spearman wears no magic ward at all and
      // a paladin's is low, so what this really answers is the monastery's aura and
      // anything else that might one day ward the player's men against magic.
      pierce: 2,
      // WHAT HE IS CALLED ONCE HE GETS UP. The encyclopedia shows both halves of him
      // — see the stage badge on his card — and "Captain Thug" over the enraged
      // drawing would say the two are the same creature at different health, which
      // is the one thing the second stage is not.
      name: 'Enraged Captain Thug',
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
        // THREE SECONDS, up from two, at the owner's word — "to allow more time for
        // players to see the animation of him dying". The whole ending is five
        // seconds now: three beaten and standing, two on the ground, and the run
        // cannot be won for any of them.
        seconds: 3
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
  },

  // THE CROW HARBINGER, the second boss, at the owner's word. A sorcerer with a crow on
  // his shoulder: he walks and casts at soldiers like any ranged creature, and has two
  // powers that turn on his health — POINT TOWER above half (his crow flies to a tower
  // and blinds it) and CALL CROWS below it (a flock comes down the road). He dies the
  // way the Captain does: his falling pose, then his body. See crowWork in
  // src/enemies.js.
  //
  // ONE GROUND POINT FOR EVERY STANDING POSE, source (242, 335) — the centre of the
  // shadow ellipse, the same in all seven of them — and every pivot below is that
  // point over its own trim. His fall and his body are drawn lying further left on the
  // canvas, so theirs is the shadow under the fallen body, (186.5, 319): pinned to the
  // spot he stood on, he collapses where he was.
  crow_harbinger: {
    name: 'Crow Harbinger',
    boss: true,
    // WITH HIS CROW, which is how he walks on and how he is drawn everywhere else.
    sprite: 'harbinger',
    spriteTrim: [186, 164, 133, 184],
    pivot: [0.421, 0.929],
    attack: { sprite: 'harbinger_cast', trim: [175, 164, 144, 184], pivot: [0.465, 0.929] },
    // AND WITHOUT IT, while it is away at a tower: the same pair, the shoulder bare.
    crowless: {
      sprite: 'harbinger_bare', trim: [186, 164, 107, 184], pivot: [0.523, 0.929],
      attack: { sprite: 'harbinger_cast_bare', trim: [175, 164, 118, 184], pivot: [0.568, 0.929] }
    },
    // He casts toward the left, as drawn.
    spriteFaces: -1,
    // CENTRED ON HIS SHADOW in the encyclopedia and the info box medallion, at the
    // owner's word, rather than on his box — his crow reaches out to one side.
    centreOnShadow: true,
    dead: 'harbinger_dead',
    deadTrim: [137, 217, 168, 110],
    deadPivot: [0.295, 0.882],

    // THE OWNER'S NUMBERS: 8000 health, 120 magic damage that breaks 2 ranks of magic
    // armour, a 200 reach, high plate both ways — and 30 a second, slower than the
    // Captain's 40, at the owner's second word.
    hp: 8000,
    damageType: 'magic',
    armour: { physical: 'high', magic: 'high' },
    speed: 30,
    bounty: 0,
    leak: 0,
    // Reaching the end loses the battle, as the Captain does.
    ends: true,
    // Held by a soldier, he casts at him point blank on the same numbers. 120, at the
    // owner's word (it was 80).
    damage: 120,
    pierce: 2,
    atkCd: 1,
    ranged: {
      range: 200,
      // ONE BOLT A SECOND, at the owner's word.
      cd: 1,
      damage: 120,
      pierce: 2,
      ammo: arcaneBolt
    },

    // POINT TOWER, above half his health and every 20 seconds: he points at the
    // nearest archery, monastery or artillery tower within his reach, and his crow
    // leaves his shoulder `launch` seconds into the `seconds`-long pose. It flies to
    // the tower's top in `flight` seconds, circles it for `blind` seconds — the tower
    // cannot fire — and flies back to him. `self` and `crow` are the pose in its two
    // layers, the crow's on the same canvas, so it leaves from exactly where it sat.
    point: {
      sprite: 'harbinger_point', trim: [180, 164, 148, 184], pivot: [0.419, 0.929],
      self: { sprite: 'harbinger_point_self', trim: [180, 164, 113, 184], pivot: [0.549, 0.929] },
      crow: { sprite: 'harbinger_crow', trim: [247, 197, 81, 87] },
      // 2 seconds of pointing, at the owner's word (it was 1).
      seconds: 2,
      launch: 0.4,
      above: 0.5,
      cooldown: 20,
      range: 200,
      families: ['archery', 'monastery', 'siege'],
      // HOW FAST HIS CROW FLIES to the tower and back, px a second — slower, at the
      // owner's word: it was a fixed 0.8s whatever the distance, which across the board
      // from stage 16's balcony was a streak. At least `flightMin` seconds.
      fly: 100, flightMin: 1,
      // And the tower is blind for `blind` seconds FROM THE MOMENT THE CROW BEGINS TO
      // CIRCLE IT, not from when it set off (see crowWork).
      blind: 10
    },
    // CALL CROWS, below half and every 20 seconds: he stands channelling for `seconds`
    // in the wind he raises, MENDING `heal` of his maximum health every second of it,
    // and `count` crows come in from the road's mouths — a random one each, on a board
    // with more than one — `gap` seconds apart. 3 seconds and 0.4 apart, at the owner's
    // second word (they were 2 and 0.2); the mending is his too.
    call: {
      sprite: 'harbinger_call', trim: [172, 164, 156, 184], pivot: [0.449, 0.929],
      seconds: 3,
      heal: 0.1,
      below: 0.5,
      cooldown: 20,
      count: 20,
      // AND THE FLOCK GROWS, at the owner's word: on the road, each call brings `grow`
      // more crows than the one before — 20, 22, 24 and on — "to ensure that he is to
      // be defeated quickly or else over time crows will overwhelm the player". Not
      // from stage 16's balcony, where he calls on the board's timetable instead.
      grow: 2,
      gap: 0.4,
      type: 'crow'
    },
    // AND HIS DEATH, the Captain's: three seconds of his falling pose, then two of his
    // body, and only then may the battle end.
    finale: {
      // HIS HAT AND CROW FALL OFF AS HE GOES DOWN and fade away before he lies dead, at
      // the owner's word. The Captain's thrown shield and bow, done the same way: the
      // drawing taken apart into himself and the hat and crow, which hop off him for
      // the first moment (WEAPON_POP in src/data/bossfx.js) and fade out over the last
      // `drop.seconds` of the beat. Between the two it is the whole drawing.
      fall: {
        sprite: 'harbinger_fall', trim: [124, 166, 264, 180], pivot: [0.237, 0.822], seconds: 3,
        drop: {
          seconds: 2,
          self:    { sprite: 'harbinger_fall_self', trim: [124, 166, 114, 161], pivot: [0.548, 0.919] },
          weapons: { sprite: 'harbinger_fall_drop', trim: [245, 285, 143, 61], pivot: [-0.409, 0.475] }
        }
      },
      rest: 2
    },
    // HIS VOICE, at the owner's word, by moment as the captain's is: walking on, Point
    // Tower and Call Crows as each pose comes up, beaten and standing, every fifth man
    // he kills — and the captain's fall, renamed Boss_fall_dead so either boss can use
    // it, as he hits the ground.
    lines: {
      enters: ['harbinger_enters'], point: ['harbinger_point'], call: ['harbinger_call'],
      fall: ['harbinger_dying'], rest: ['boss_fallen'], kills: ['harbinger_kills']
    },
    // AND THE NOISE OF HIS ABILITIES, under the voice: the wind with the call, and his
    // crow's as it reaches the tower and starts to circle it.
    sounds: { call: ['harbinger_wind'], circle: ['dark_crow_caw'] },
    r: 14,
    colour: '#4A3A52'
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
  // It used to be argued creature by creature here — the Shadow Thug last of the thug
  // variants so the squad is committed when he arrives, the Bomb Thug in front of
  // the Rally Thug so the banner is up for his blast, the crow flying in behind the
  // column and overtaking it, the priest behind everything he mends. The owner has
  // since set the order himself, and it is the order the admin panel lists them in:
  // "thug, tough thug, blocker thug, dark crow, shadow thug, club giant, bomb thug,
  // archer thug, plague doctor, dark priest, rally thug, captain thug".
  //
  // THE PANEL LISTS A WAVE IN THE ORDER IT MARCHES, so for the panel to read this way
  // the tables had to march this way too: waves 4 to 8 of stages 10 to 14 were
  // re-sorted into it — the same creatures, counts and gaps — which puts the Rally
  // Thug at the back of his waves, behind the priests, and the Giants ahead of the
  // Bomb Thugs. tools/admin.mjs checks every table is in this order but the Bend's
  // boss finale, which leads with the boss on purpose.
  'light_inf', 'tough_inf', 'blocker_inf', 'crow', 'shadow_inf', 'heavy_inf',
  // The Boulder Giant beside the Club Giant, the two giants together.
  'boulder_giant',
  'bomb_inf', 'archer_inf', 'plague_inf', 'dark_priest', 'rally_inf',
  // AND THE BOSS LAST OF ALL, because groups spawn one after another and this
  // list is therefore the order they arrive in. A boss at the front of a wave is a
  // boss the player meets with a full line and full towers; a boss at the back
  // arrives to a line that has already been chewed on, which is the fight worth
  // having. It also puts him behind his own healer rather than in front of one.
  'captain_thug',
  // And the second boss behind the first, for the same reason.
  'crow_harbinger'
];

// AND THE ORDER THE ENCYCLOPEDIA LISTS THEM IN, which is a different question from
// both of the orders above and now has to be asked separately.
//
// It used to be neither — the book read `Object.values(enemyTypes)` and got the
// order this file happens to define them in, which was fine while defining them in
// reading order cost nothing. It stopped being free: a creature's place in THIS
// file is next to the creature it is a variant of, so the notes read, and the
// Shadow Thug and the Rally Thug both belong beside the Tough Thug in the source
// and at the END of the book, after the support units, because that is the order
// the player meets them in.
//
// THE OWNER'S ORDER, exactly: thugs by weight, then the two shooters, then the two
// support units, then the newest at the end. tools/book.mjs checks this lists every
// non-boss enemy exactly once, so a creature added and forgotten here is a card
// that silently never appears.
//
// NEWEST LAST, which is why the tail of this list is not sorted by anything: the
// Shadow Thug, the Rally Thug, the Bomb Thug and the Dark Crow arrived in that order
// and sit in that order, behind the roster the book opened with. The player meets them in
// that order too, because each one was written into the late boards.
//
// THE DARK CROW AND THE RALLY THUG CHANGED PLACES, at the owner's word.
export const BOOK_ORDER = [
  'light_inf', 'tough_inf', 'archer_inf', 'blocker_inf', 'heavy_inf',
  'plague_inf', 'dark_priest', 'shadow_inf', 'crow', 'bomb_inf',
  // THE BOULDER GIANT AND THE RALLY THUG CHANGED PLACES, at the owner's word.
  'boulder_giant', 'rally_inf'
];

// WHAT THE "NEW ENEMY" CARD SAYS about each creature, the first time the player
// meets it (see src/newfoe.js). Two short sentences at most: what he does, then
// what to do about it. The numbers are on the card beside this, drawn from the def,
// so none are repeated here unless the sentence is about one.
//
// tools/newfoe.mjs fails if a creature in enemyTypes has no line here.
export const FOE_NOTES = {
  light_inf: 'A common bandit with a club. Weak on his own, but they rarely come alone.',
  tough_inf: 'A bigger, meaner thug in light armor. He takes a good deal more to bring down.',
  archer_inf: 'Shoots your soldiers from a distance and fights hand to hand when caught. ' +
    'Soldiers will not leave their post to chase him, so let your towers deal with him.',
  blocker_inf: 'Raises his shield when hit from afar, shrugging off most damage for five seconds ' +
    'while he walks at half speed. Fighting a soldier, his armor is much lighter.',
  heavy_inf: 'A huge brute in heavy armor whose club breaks through a rank of your soldiers\' ' +
    'armor. Letting him through costs two lives.',
  plague_inf: 'Throws poison flasks at your soldiers. Everyone in the spill is poisoned for ' +
    'five seconds. His attacks are magic, so armor does little against them.',
  dark_priest: 'Hurls dark magic and heals the enemies around him. Heavily warded against magic, ' +
    'so archers and soldiers are the best answer.',
  shadow_inf: 'Invisible to your towers until a soldier stops him, and his blade cuts through ' +
    'two ranks of armor. Keep soldiers on the road to catch him.',
  crow: 'Flies over your soldiers and attacks nobody. Only archer and monastery towers can hit it, ' +
    'and it is warded against magic, so archers do best.',
  bomb_inf: 'Runs at your soldiers and blows himself up, hurting everyone nearby. Shoot him down ' +
    'early and his bomb still goes off two seconds later, so keep soldiers clear of it.',
  rally_inf: 'His war banner makes every nearby enemy that fights with weapons hit half again ' +
    'as hard. Kill him first. Letting him through costs three lives.',
  boulder_giant: 'Hurls boulders that crush every soldier in the blast, and swings one in close. ' +
    'Spread your soldiers out. Letting him through costs two lives.',
  captain_thug: 'The bandit captain, with shield, bow and sword. Wounded badly, he throws down ' +
    'his shield and fights on with a magic blade. If he reaches the end, the battle is lost.',
  crow_harbinger: 'A sorcerer whose crow blinds one of your towers for 10 seconds. Badly hurt, he ' +
    'calls 20 crows down the road and heals while he calls, and 2 more crows with every call after. ' +
    'Bring him down fast, and keep archers and monasteries ready.'
};

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
// MAPS 1, 2 AND 3'S TABLES ARE FURTHER DOWN, under THE FIRST THREE MAPS' TABLES.
// They were derived for a while from tuned Extended tables, and are written out
// again now Extended is gone. The literal arrays that first sat here are gone, and
// so is the ramp they described.
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
// walks at one speed everywhere, which is what it should always have been.
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
// judgements came from five seeds. `node tools/sweep.mjs m2` runs twenty now.
// MAP 2'S TABLE is written out with map 1's — see THE FIRST THREE MAPS' TABLES.

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
// MAP 3'S TABLE is TEN waves where the others are eight, which is the one part of
// the old shape that is a property of the map rather than of the ramp: two roads
// to defend and more board to cover.

// --- THE FIRST THREE MAPS' TABLES ----------------------------------------------
//
// ONE LENGTH, at the owner's word. These maps had a second, Extended length, two
// or three waves longer, and these tables were cut from it — see the history
// above. Extended was there to test the numbers on the first three boards, the
// owner does not mean to build it for the rest, and it went: the Length setting,
// its tables and the derivation with them. What is left is written out here as
// the game played it on the day Extended came out, wave for wave.
//
// The Captain Thug's boss wave rode on the end of the Bend's Extended table and
// went with it. He stays defined — the book and the dashboard still know him — for
// a board that has not been drawn yet.
//
// THESE ARE THE HARD COUNTS, not base counts, and that distinction cost a
// release. They were tuned by playing at Hard, so Hard multiplies by 1 and plays
// them exactly — see DIFFICULTIES in data/difficulty.js. Normal takes 0.85 of
// them.
//
// The line that stood here once claimed Hard still multiplied by 1.10 AND that the
// tested table played exactly, which cannot both be true. It was the second half
// that was meant and the first half that was running: a wave dialled to 22 in the
// panel arrived as 25. Anything written here about a difficulty is a claim about
// scaleWaves, and the two have to be read together or not at all.

export const waves = [
  { rest: 9, groups: [{ type: 'light_inf', count: 4, gap: 1.60 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 6, gap: 1.40 }] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 8, gap: 1.10 },
      { type: 'tough_inf', count: 2, gap: 1.60 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 10, gap: 1.00 },
      { type: 'tough_inf', count: 4, gap: 1.60 }
    ] },
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
  { rest: 0, groups: [
      { type: 'light_inf', count: 22, gap: 0.60 },
      { type: 'tough_inf', count: 6, gap: 1.40 },
      { type: 'blocker_inf', count: 4, gap: 1.40 },
      { type: 'heavy_inf', count: 4, gap: 1.60 },
      { type: 'archer_inf', count: 8, gap: 1.60 },
      { type: 'plague_inf', count: 2, gap: 2.00 }
    ] }
];

export const wavesFork = [
  { rest: 9, groups: [{ type: 'light_inf', count: 4, gap: 1.60 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 6, gap: 1.40 }] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 8, gap: 1.10 },
      { type: 'tough_inf', count: 2, gap: 1.60 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 10, gap: 1.00 },
      { type: 'tough_inf', count: 4, gap: 1.60 }
    ] },
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
  { rest: 0, groups: [
      { type: 'light_inf', count: 24, gap: 0.60 },
      { type: 'tough_inf', count: 4, gap: 1.60 },
      { type: 'blocker_inf', count: 4, gap: 1.60 },
      { type: 'heavy_inf', count: 4, gap: 1.40 },
      { type: 'archer_inf', count: 6, gap: 1.60 },
      { type: 'plague_inf', count: 2, gap: 2.00 },
      { type: 'dark_priest', count: 2, gap: 1.60 }
    ] }
];

export const wavesLong = [
  { rest: 9, groups: [{ type: 'light_inf', count: 4, gap: 1.60 }] },
  { rest: 9, groups: [{ type: 'light_inf', count: 6, gap: 1.40 }] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 8, gap: 1.20 },
      { type: 'tough_inf', count: 1, gap: 1.60 }
    ] },
  { rest: 9, groups: [
      { type: 'light_inf', count: 10, gap: 1.10 },
      { type: 'tough_inf', count: 2, gap: 1.60 }
    ] },
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
  { rest: 0, groups: [
      { type: 'light_inf', count: 18, gap: 0.50 },
      { type: 'tough_inf', count: 6, gap: 1.00 },
      { type: 'blocker_inf', count: 6, gap: 1.40 },
      { type: 'heavy_inf', count: 6, gap: 1.20 },
      { type: 'archer_inf', count: 6, gap: 1.00 },
      { type: 'plague_inf', count: 2, gap: 0.60 },
      { type: 'dark_priest', count: 4, gap: 0.60 }
    ] }
];

// GROUPS ARE IN MARCH_ORDER, which is not decoration: groups spawn one after
// another, so the order they are listed in is the order they arrive in, and it is
// also the order the dashboard rebuilds them in. Written any other way, an
// untouched dashboard would hand the game a different wave from the one in this
// file — tools/admin.mjs checks all 32 of them.

// STAGE 1'S FIVE WAVES, and the whole of what a tutorial sends.
//
// TWO KINDS OF ENEMY IN THE ENTIRE LEVEL: a thug, and a thug that takes longer to
// kill. That is the syllabus — something arrives, you shoot it, some things need
// more shooting. Every other enemy in the game is a rule on top of that one, and a
// rule on top of nothing is not a lesson.
//
// THE OWNER'S OWN FIVE, written down exactly as given: 2 thugs, 4, 6, then two
// tough thugs on their own, then six and two together.
//
// WAVE 4 IS SMALLER THAN WAVE 3 IN EVERY MEASURE THERE IS: two bodies against six,
// and 400 health against 480. It is still the harder wave, and that is the lesson.
// A tough thug has two and a half times a thug's health AND low physical armour, so
// it is the first thing on the road that an arrow does not simply delete — a player
// who has spent three waves learning "one tower, one thug" meets the exception with
// nothing else on screen to confuse it. Wave 5 then puts both kinds on the road at
// once, which is the exam.
//
// So nothing here may assert that the waves grow. They do not, and the wave that
// breaks the rule is the point of the table — see the tutorial section of
// tools/campaign.mjs, which pins these five to the owner's own list instead.
//
// A LONG REST between them — 12 seconds against the 9 every other table uses. The
// gap after a wave is when a player looks at their gold and decides something, and
// on the first board that decision takes longer than it ever will again.
export const tutorialWaves = [
  { rest: 12, groups: [{ type: 'light_inf', count: 2, gap: 1.8 }] },
  { rest: 12, groups: [{ type: 'light_inf', count: 4, gap: 1.7 }] },
  { rest: 12, groups: [{ type: 'light_inf', count: 6, gap: 1.6 }] },
  { rest: 12, groups: [{ type: 'tough_inf', count: 2, gap: 1.8 }] },
  { rest: 12, groups: [{ type: 'light_inf', count: 6, gap: 1.4 }, { type: 'tough_inf', count: 2, gap: 1.8 }] }
];

// STAGE 2'S SIX, and the owner's own list rather than a guess at one.
//
// The first version of this table was eight waves written here on the reasoning
// that a board after a tutorial wants a full game; the owner then wrote the six
// down. What they say, and it is worth reading as a design rather than as data:
//
//   1    five thugs, which is the tutorial's last wave as an opening
//   2    tough thugs return
//   3    ONE archer, alone, which is how a new enemy should arrive
//   4    all three together, and twice as many of everything
//   5    NO THUGS AT ALL — four toughs and ten archers, which is a different
//        problem rather than a bigger one: nothing cheap to soak the shooting
//   6    sixteen, six and sixteen
//
// THE TIER CAP IS 3 ON THIS BOARD, so none of this is met with a tier 4 tower.
// That is what makes wave 5 the wave it is.
export const stage2Waves = [
  { rest: 10, groups: [{ type: 'light_inf', count: 5, gap: 1.6 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 5, gap: 1.5 }, { type: 'tough_inf', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'tough_inf', count: 2, gap: 1.7 },
                       { type: 'archer_inf', count: 1, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 12, gap: 1.2 }, { type: 'tough_inf', count: 4, gap: 1.6 },
                       { type: 'archer_inf', count: 4, gap: 1.7 }] },
  // THE LAST TWO COME IN TIGHTER, at the owner's ask, and it is the gaps that were
  // asked for rather than the counts: same enemies, less road between them. Every
  // gap in these two waves is multiplied by 0.7 and rounded to the nearest TENTH,
  // which is not a stylistic choice: the admin panel's rate stepper clamps to
  // 0.1..10 and rounds to a tenth, so a shipped 1.05 is a number the panel can
  // never be returned to — the first tap pulls it to 1.1 and the "was" marker never
  // clears again. tools/admin.mjs checks every shipped rate against the setter.
  //
  // WHY THE GAP IS THE LEVER AT ALL. A wave is not its headcount, it is its arrival
  // rate — ten men 1.6s apart is a queue a single tower can work through one at a
  // time, and the same ten 1.1s apart is a column that overlaps its own reload. The
  // counts are what the owner wrote down and they are unchanged; what changed is
  // how much of the wave is standing on the board at once.
  //
  // AND IT IS THE SAME ON NORMAL, because `gap` is not one of the numbers
  // difficulty scales — see data/difficulty.js, which moves counts and gold and
  // nothing else. The table IS the Hard board (Hard multiplies by 1) and Normal
  // meets the same rate with 20% fewer bodies in it.
  { rest: 10, groups: [{ type: 'tough_inf', count: 4, gap: 1.1 }, { type: 'archer_inf', count: 10, gap: 1.0 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 16, gap: 0.7 }, { type: 'tough_inf', count: 6, gap: 1.0 },
                       { type: 'archer_inf', count: 16, gap: 0.9 }] }
];

// STAGE 3'S SEVEN, the owner's own list again.
//
// WHAT IT ADDS is the BLOCKER, and wave 3 introduces exactly one of him — the
// same way stage 2 introduced exactly one archer. By wave 6 there are four of
// them in front of sixteen archers, which is the shape of the whole board: the
// blockers hold your squads still and the archers shoot them while they stand.
//
// AND THE THUGS RUN OUT. Waves 1 to 4 open with ten of them; waves 5, 6 and 7
// have none at all — toughs, blockers and archers only. That is the second time
// this campaign has taken the cheap bodies away (stage 2's wave 5 did it first)
// and it is the same lesson twice on purpose: what is coming matters more than
// how much of it there is.
//
// WAVE 7 IS THE ONE THAT DOUBLES THE BLOCKERS. Six waves ended on four of them;
// this ends on TEN, in front of twenty archers, which is a different fight rather
// than a longer one. Four blockers can pin the squads on one arm of the
// roundabout; ten can pin both, and everything behind them walks.
//
// AND THE LAST THREE COME IN TIGHTER, at the owner's ask — the gaps, not the
// counts. Waves 5 and 6 are their old gaps multiplied by 0.7 and rounded to the
// nearest tenth — see stage 2's note on why a tenth; wave 7 carries the step on
// below them, ending on an archer every 0.7s. `gap` is not a number
// difficulty scales, so Normal meets the same arrival rate with 20% fewer bodies
// in it — see the note on stage 2's last two.
export const stage3Waves = [
  { rest: 10, groups: [{ type: 'light_inf', count: 8, gap: 1.4 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'tough_inf', count: 2, gap: 1.7 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'tough_inf', count: 4, gap: 1.6 },
                       { type: 'blocker_inf', count: 1, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.2 }, { type: 'tough_inf', count: 4, gap: 1.6 },
                       { type: 'blocker_inf', count: 2, gap: 1.8 }, { type: 'archer_inf', count: 4, gap: 1.6 }] },
  { rest: 10, groups: [{ type: 'tough_inf', count: 6, gap: 1.1 }, { type: 'blocker_inf', count: 4, gap: 1.2 },
                       { type: 'archer_inf', count: 8, gap: 1.0 }] },
  { rest: 10, groups: [{ type: 'tough_inf', count: 10, gap: 0.9 }, { type: 'blocker_inf', count: 4, gap: 1.1 },
                       { type: 'archer_inf', count: 16, gap: 0.8 }] },
  { rest: 10, groups: [{ type: 'tough_inf', count: 10, gap: 0.8 }, { type: 'blocker_inf', count: 10, gap: 1.0 },
                       { type: 'archer_inf', count: 20, gap: 0.7 }] }
];

// STAGE 4'S SEVEN, the owner's own list again — REWRITTEN when the giant changed.
// The first version of this table was written against a giant who hit one man for
// 30; the owner re-cut the whole board around the new one rather than leaving the
// counts where they were.
//
// THE GIANT HAS CHANGED TWICE SINCE and this table has not, which is correct rather
// than stale: he swept for 25 when these counts were written and he hits one man for
// 40 now, and the owner gave these seven waves against the sweeping version and has
// not asked for them back. The re-cut was about WHICH ENEMIES, and that reading
// survives him getting heavier — see `heavy_inf` above for the two moves.
//
// WHAT CHANGED, and it is the same change seven times: THE GIANT IS THE BOARD. He
// arrives in wave 3 rather than 4 and one board earlier than the pattern the last
// three stages set, and from there he never leaves — 1, 2, 4, 4, 8. Everything that
// used to fill the space around him came out to make room: the tough thugs stop
// after wave 5, the blockers appear in only two waves, and wave 7 is eight giants
// and twenty archers and nothing else at all.
//
// THE HEADCOUNT BARELY MOVED AND THE BOARD GOT MUCH HEAVIER, which is the whole
// shape of the re-cut, and got heavier again when the club went to 40. 118 enemies
// before and 111 now, and inside that:
//
//   giants        11 -> 19      nearly double
//   tough thugs   20 -> 10      halved
//   blockers      13 ->  8
//   thugs         38 -> 38      unchanged
//   archers       36 -> 36      unchanged
//
// So seven fewer bodies carry eight more giants. What came out is the middle of the
// army — the toughs and the blockers whose job was to screen — and what is left is a
// board that asks for towers rather than for a wall, because a wall is what a 40
// club goes through in three swings.
//
// The blocker's job changes with it. He used to hold your squads still so the
// archers could shoot them; in front of a giant he holds them still in front of the
// hardest single blow that walks onto this board, which is a different and worse
// problem.
//
// THE GAPS ARE THIS BOARD'S OWN, unchanged from the first cut. The giants stay slow
// — 2.0 down to 1.6 — because a giant arriving on another giant's heels is a wall
// rather than a wave, and that is truer of the 40 club than it was of either
// version before it. Every rate is a tenth so the admin panel can reach all of them; see the note
// on stage 2's last two.
export const stage4Waves = [
  { rest: 10, groups: [{ type: 'light_inf', count: 8, gap: 1.4 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'tough_inf', count: 2, gap: 1.7 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'tough_inf', count: 4, gap: 1.6 },
                       { type: 'heavy_inf', count: 1, gap: 2.0 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.2 }, { type: 'blocker_inf', count: 2, gap: 1.8 },
                       { type: 'heavy_inf', count: 2, gap: 2.0 }] },
  { rest: 10, groups: [{ type: 'tough_inf', count: 4, gap: 1.5 }, { type: 'heavy_inf', count: 4, gap: 2.0 },
                       { type: 'archer_inf', count: 6, gap: 1.4 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 6, gap: 1.5 }, { type: 'heavy_inf', count: 4, gap: 1.8 },
                       { type: 'archer_inf', count: 10, gap: 1.2 }] },
  { rest: 10, groups: [{ type: 'heavy_inf', count: 8, gap: 1.6 }, { type: 'archer_inf', count: 20, gap: 1.0 }] }
];

// STAGE 5'S EIGHT, the owner's own list again, and the first table in the campaign
// that is another board's table with more on the end.
//
// WAVES 1 TO 6 ARE STAGE 4'S, to the man. That is the owner's list rather than a
// shortcut taken here, and it reads as a deliberate one: the Workshop teaches this
// exact sequence and the Castle opens by asking whether it was learned, on a board
// with two roads instead of three and 240 gold instead of 220. What is new is what
// comes after the point where stage 4 stopped.
//
// AND WHAT COMES AFTER IS THE BLOCKER AND THE GIANT TOGETHER. Waves 7 and 8 are
// blockers, giants and archers and nothing else — no thugs, no toughs, nothing cheap
// anywhere. Eight blockers then ten; six giants then eight; sixteen archers then
// twenty. Every number goes up and the KINDS stay the same, which is a different
// shape of ending from stage 4's: that board finishes on one big wave, this one
// finishes on the same wave twice, harder.
//
// The blockers are the point of it. A blocker holds a squad still and a giant hits
// one man for 40 — the hardest single blow that walks onto any board — so ten of the
// first in front of eight of the second is a fight the barracks cannot win by
// standing in it.
//
// THE GAPS ARE STAGE 4'S for the first six, unchanged, because the waves are. Seven
// and eight carry the step on: the giants come down from 1.8 to 1.6 and the archers
// from 1.1 to 1.0. Every rate is a tenth so the admin panel can reach all of them.
export const stage5Waves = [
  { rest: 10, groups: [{ type: 'light_inf', count: 8, gap: 1.4 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'tough_inf', count: 2, gap: 1.7 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'tough_inf', count: 4, gap: 1.6 },
                       { type: 'heavy_inf', count: 1, gap: 2.0 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.2 }, { type: 'blocker_inf', count: 2, gap: 1.8 },
                       { type: 'heavy_inf', count: 2, gap: 2.6 }] },
  // FIVE IS WHERE THE TWO BOARDS PART. The Workshop's fifth drops the rank of thugs
  // and sends four tough, four giants and six archers; this one keeps the ten thugs
  // in front and halves the giants behind them. Same wave, different question — a
  // screen of bodies to chew through with two archers shooting over it, rather than
  // four giants arriving on their own.
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.2 }, { type: 'tough_inf', count: 4, gap: 1.5 },
                       { type: 'heavy_inf', count: 2, gap: 2.6 }, { type: 'archer_inf', count: 6, gap: 1.4 }] },
  // AND THE GIANTS COME IN ONES FROM HERE, at the owner's ask: "Wave 4 to 5: increase
  // gap stepper a bit for giants. Wave 6 to 8: increase gap stepper a lot."
  //
  // A bit is 2.0 to 2.6 and a lot is 1.8 to 3.6, which is the difference between a
  // rank of giants and a procession of them. Four at 1.8s are all on the board inside
  // six seconds and a board that cannot kill one cannot kill four; at 3.6 the last
  // arrives eleven seconds after the first, which is long enough for the towers that
  // killed the first to have reloaded. The counts come down with the gaps — three
  // giants in the sixth where there were four, five in the last where there were six.
  { rest: 10, groups: [{ type: 'blocker_inf', count: 6, gap: 1.5 }, { type: 'heavy_inf', count: 3, gap: 3.6 },
                       { type: 'archer_inf', count: 10, gap: 1.2 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 8, gap: 1.4 }, { type: 'heavy_inf', count: 4, gap: 3.6 },
                       { type: 'archer_inf', count: 16, gap: 1.1 }] },
  // AND THE LAST IS THE SEVENTH WITH ONE MORE GIANT IN IT. It was ten blockers, eight
  // giants and twenty archers; the board ends on a step up rather than on a wave half
  // again as big as the one before it.
  { rest: 10, groups: [{ type: 'blocker_inf', count: 8, gap: 1.3 }, { type: 'heavy_inf', count: 5, gap: 3.6 },
                       { type: 'archer_inf', count: 16, gap: 1.0 }] }
];

// STAGE 6, DAWNFORD BRIDGE, and it is stage 5's table as that board first shipped —
// before its giants were spaced out and thinned. The owner gave it wave for wave, and
// the two are worth keeping as separate tables rather than one shared one: the Castle
// eased because of what its two roads and its free crossbowmen do to a wave, and none
// of that is true here. The same numbers on a different board are a different game.
// THE PLAGUE DOCTOR ARRIVES HERE NOW, at the owner's rewrite, and that is the
// whole character of this pass. Dawnford Bridge shipped as the one late board with
// NO support unit at all — eight waves of bodies, giants and archers and nothing
// mending or poisoning — and it now carries a doctor from wave 4 to the end, 1, 2,
// 2, 4, 6.
//
// AND THE ARCHERS CAME DOWN TO PAY FOR HIM: 6, 10, 16, 20 across waves 5 to 8
// becomes 4, 8, 10, 12. That is 18 fewer archers over the board. The owner has
// swapped volume for a kind of pressure the bridge did not have — an archer stands
// off and shoots, a doctor stands off and poisons the ground your squad is holding,
// and the second is the harder thing to answer on a board whose road forks.
//
// Every other count is untouched: the first three waves are the same, and the
// blockers and giants keep the ladder they had.
export const stage6Waves = [
  { rest: 10, groups: [{ type: 'light_inf', count: 8, gap: 1.4 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'tough_inf', count: 2, gap: 1.7 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'tough_inf', count: 4, gap: 1.6 },
                       { type: 'heavy_inf', count: 1, gap: 2.0 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.2 }, { type: 'blocker_inf', count: 2, gap: 1.8 },
                       { type: 'heavy_inf', count: 2, gap: 2.0 }, { type: 'plague_inf', count: 1, gap: 2.0 }] },
  { rest: 10, groups: [{ type: 'tough_inf', count: 4, gap: 1.5 }, { type: 'heavy_inf', count: 4, gap: 2.0 },
                       { type: 'archer_inf', count: 4, gap: 1.4 }, { type: 'plague_inf', count: 2, gap: 2.0 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 6, gap: 1.5 }, { type: 'heavy_inf', count: 4, gap: 1.8 },
                       { type: 'archer_inf', count: 8, gap: 1.2 }, { type: 'plague_inf', count: 2, gap: 2.0 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 8, gap: 1.4 }, { type: 'heavy_inf', count: 6, gap: 1.8 },
                       { type: 'archer_inf', count: 10, gap: 1.1 }, { type: 'plague_inf', count: 4, gap: 1.9 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 10, gap: 1.3 }, { type: 'heavy_inf', count: 8, gap: 1.6 },
                       { type: 'archer_inf', count: 12, gap: 1.0 }, { type: 'plague_inf', count: 6, gap: 1.8 }] }
];

// STAGE 7: Dawnford Fountain, and the first table with a HEALER in it as standard.
//
// The first two maps' tables send a dark priest only in their later waves, and the
// Bend never does. Here he arrives on
// wave 4 and there are six of him on the last, at the owner's ask, which changes
// what a wave IS on this board: damage that does not kill inside his reach is damage
// undone. Two towers that each chip a giant are worth less than one that finishes
// it, and that is the lesson this table teaches.
//
// HIS GAP IS 1.8 WHERE HIS DEFAULT IS 0.8, and that is the one number here not taken
// from the owner's list. Six healers at the default arrive as a four-second block
// and mend each other; spread over nine they arrive along the column they are there
// to mend, which is the fight the artwork describes. See MARCH_ORDER for why he
// walks in last whatever his gap.
//
// The rest follows the shape of stage 6, which the owner has played and signed off:
// thugs thin and quick, giants slow and few, archers the thing that makes a late
// wave loud. Every gap is a multiple of 0.1 because the admin panel's rate stepper
// rounds to a tenth, and a shipped number it cannot return to is a number the owner
// can never put back.
//
// THE DOCTOR JOINED THE PRIEST, at the owner's rewrite, and the fountain now fields
// both support enemies exactly as the church does. It shipped with priests alone —
// 2, 2, 4, 6, 6 — and the priests came DOWN to make room: 1, 2, 2, 4, 6 of each
// from wave 4 on, so the support count per wave is unchanged and half of it now
// poisons instead of mending.
//
// WHICH IS A HARDER WAVE AT THE SAME HEADCOUNT, and worth knowing before it is
// tuned again. A priest undoes damage a tower has already done; a doctor takes
// health off the SQUAD holding the road. On a board whose two halves never meet,
// the squad is what the player has bought to hold the half their towers cannot
// reach — see `routeMix` in data/level09.js.
//
// The archers paid for it, the same trade stage 6 made: 8, 10, 14, 20 becomes
// 4, 10, 10, 12.
export const stage7Waves = [
  { rest: 10, groups: [{ type: 'light_inf', count: 8, gap: 1.4 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'tough_inf', count: 2, gap: 1.7 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'tough_inf', count: 4, gap: 1.6 },
                       { type: 'heavy_inf', count: 1, gap: 2.0 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.2 }, { type: 'blocker_inf', count: 4, gap: 1.7 },
                       { type: 'heavy_inf', count: 1, gap: 2.0 }, { type: 'plague_inf', count: 1, gap: 2.0 },
                       { type: 'dark_priest', count: 1, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'tough_inf', count: 8, gap: 1.5 }, { type: 'blocker_inf', count: 4, gap: 1.6 },
                       { type: 'heavy_inf', count: 2, gap: 2.0 }, { type: 'archer_inf', count: 4, gap: 1.3 },
                       { type: 'plague_inf', count: 2, gap: 2.0 }, { type: 'dark_priest', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 4, gap: 1.6 }, { type: 'heavy_inf', count: 4, gap: 1.9 },
                       { type: 'archer_inf', count: 10, gap: 1.2 }, { type: 'plague_inf', count: 2, gap: 2.0 },
                       { type: 'dark_priest', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 10, gap: 1.4 }, { type: 'heavy_inf', count: 4, gap: 1.8 },
                       { type: 'archer_inf', count: 10, gap: 1.1 }, { type: 'plague_inf', count: 4, gap: 1.9 },
                       { type: 'dark_priest', count: 4, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 12, gap: 1.3 }, { type: 'heavy_inf', count: 6, gap: 1.7 },
                       { type: 'archer_inf', count: 12, gap: 1.0 }, { type: 'plague_inf', count: 6, gap: 1.8 },
                       { type: 'dark_priest', count: 6, gap: 1.8 }] }
];

// STAGE 8: Dawnford Church, and the table that fields BOTH support enemies from the
// EARLIEST wave. The plague doctor has been a wave-8 arrival in the long game and
// the dark priest a wave-10 one; here they come together from wave 3 and there are
// six of each by the end, at the owner's ask.
//
// IT WAS "THE FIRST TABLE THAT FIELDS BOTH" and it is not any more. The owner's
// rewrite put a doctor alongside the priest on stage 7 as well, from ITS wave 4, so
// the fountain now fields the pair one board earlier in the campaign. What is still
// this board's own is wave 3: nothing else in the game asks a player to answer a
// healer and a poisoner that early.
//
// WHAT THAT DOES TO THE BOARD is worth knowing before tuning it further. The doctor
// throws a flask that poisons whoever it lands near and the priest mends whoever is
// hurt, so between them the damage a tower does is being subtracted at one end and
// the damage a SOLDIER takes is being added at the other. This is the board where
// four paladins stand in the road, and it is not a coincidence.
//
// THE COUNTS ARE THE OWNER'S EXACTLY. The gaps follow stage 7's shape, with the two
// support types spread rather than clumped for the same reason the priest was there:
// six healers arriving together mend each other. Every gap is a multiple of 0.1,
// because the admin panel's rate stepper rounds to a tenth and a shipped number it
// cannot return to is one the owner can never put back.
// THE GIANTS WENT UP ACROSS THE BOARD, at the owner's ask, and it is the only thing
// that changed in this table: one arrives a wave earlier than it used to, and every
// wave from there carries more of them — 1, 2, 3, 4, 6, 8 against the 0, 1, 2, 3, 4,
// 6 it shipped with. Nothing else moved.
//
// WHAT THAT IS IN HEALTH is worth writing down, because a giant is 800 and every
// other thing in this game is between 80 and 250. The last wave carries 6,400 points
// of giant where it carried 4,800, which is more health than the twelve blockers and
// twenty archers beside them put together.
//
// THE GAPS ARE UNCHANGED and that is deliberate rather than an oversight. The owner
// has asked twice before to spread giants out when a wave felt overwhelming; this ask
// is the other direction, so widening the gaps here would have been giving back half
// of what was asked for. They still arrive slower than anything else — 1.7 to 2.0
// against an archer's 1.0 — which is the shape the ladder already had.
export const stage8Waves = [
  { rest: 10, groups: [{ type: 'light_inf', count: 8, gap: 1.4 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'tough_inf', count: 2, gap: 1.7 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'tough_inf', count: 4, gap: 1.6 },
                       { type: 'blocker_inf', count: 2, gap: 1.7 }, { type: 'heavy_inf', count: 1, gap: 2.0 },
                       { type: 'plague_inf', count: 1, gap: 2.0 }, { type: 'dark_priest', count: 1, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 8, gap: 1.2 }, { type: 'blocker_inf', count: 4, gap: 1.7 },
                       { type: 'heavy_inf', count: 2, gap: 2.0 }, { type: 'plague_inf', count: 2, gap: 2.0 },
                       { type: 'dark_priest', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 6, gap: 1.2 }, { type: 'tough_inf', count: 6, gap: 1.5 },
                       { type: 'blocker_inf', count: 4, gap: 1.6 }, { type: 'heavy_inf', count: 3, gap: 2.0 },
                       { type: 'archer_inf', count: 8, gap: 1.3 }, { type: 'plague_inf', count: 2, gap: 2.0 },
                       { type: 'dark_priest', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 4, gap: 1.6 }, { type: 'heavy_inf', count: 4, gap: 1.9 },
                       { type: 'archer_inf', count: 10, gap: 1.2 }, { type: 'plague_inf', count: 4, gap: 1.9 },
                       { type: 'dark_priest', count: 4, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 10, gap: 1.4 }, { type: 'heavy_inf', count: 6, gap: 1.8 },
                       { type: 'archer_inf', count: 14, gap: 1.1 }, { type: 'plague_inf', count: 4, gap: 1.9 },
                       { type: 'dark_priest', count: 4, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 12, gap: 1.3 }, { type: 'heavy_inf', count: 8, gap: 1.7 },
                       { type: 'archer_inf', count: 20, gap: 1.0 }, { type: 'plague_inf', count: 6, gap: 1.8 },
                       { type: 'dark_priest', count: 6, gap: 1.8 }] }
];

// STAGE 9: Sandshroud Settlement, and the board the Shadow Thug walks onto.
//
// HE SHIPS HERE AND NOWHERE ELSE, which is what this table is for. He arrived in
// the game as a creature nothing sent — placeable from the dashboard, drawn in the
// encyclopedia, and absent from every wave on every board. The owner has put him on
// the desert, from wave 3 to the end: 1, 2, 2, 4, 6, 10.
//
// TEN OF HIM IN THE LAST WAVE IS THE NUMBER TO WATCH. No tower in the game can aim
// at a Shadow Thug — see `unseen` in data/towers.js and src/units.js — so a board
// sending ten of them is a board asking for a barracks that can hold ten, or a
// splash big enough to catch what the squad cannot. Sandshroud opens BOTH tier-4
// barracks rungs, which no earlier board does, and that is not a coincidence: see
// `allow` in data/level11.js. Ironforge opens both as well, and it is the board he
// walks onto next.
//
// HIS LADDER IS WIDER THAN A BLOCKER'S AND NARROWER THAN A GIANT'S — 1.8 down to
// 1.5 — and it is the only gap set here not carried over from the shipped table.
// The reasoning is what he is: a clump of men only a soldier can touch is the
// hardest thing in this game to answer, because the squad can hold three at a time
// and the towers cannot help. Spread, they arrive along the column the squad is
// already fighting; clumped, they walk past it.
//
// WHAT ELSE MOVED. The thugs are gone from wave 5 on, the giants come down to
// 1, 2, 2, 4, 4, and the archers from 8, 10, 14, 20 to 4, 8, 10, 12. The doctors
// and priests hold at 2 through the middle and end at 4 rather than 6. The board
// is less about volume than it was and more about the one creature towers cannot
// see, which is the trade the owner has made across all three of these tables.
//
// Every gap is a multiple of 0.1, because the admin panel's rate stepper rounds to
// a tenth and a shipped number it cannot return to is one the owner can never put
// back.
export const stage9Waves = [
  { rest: 10, groups: [{ type: 'light_inf', count: 8, gap: 1.4 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'tough_inf', count: 2, gap: 1.7 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'tough_inf', count: 4, gap: 1.6 },
                       { type: 'blocker_inf', count: 2, gap: 1.7 }, { type: 'shadow_inf', count: 1, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.2 }, { type: 'blocker_inf', count: 4, gap: 1.7 },
                       { type: 'shadow_inf', count: 2, gap: 1.8 }, { type: 'heavy_inf', count: 1, gap: 2.0 },
                       { type: 'plague_inf', count: 1, gap: 2.0 }, { type: 'dark_priest', count: 1, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'tough_inf', count: 8, gap: 1.5 }, { type: 'blocker_inf', count: 4, gap: 1.6 },
                       { type: 'shadow_inf', count: 2, gap: 1.8 }, { type: 'heavy_inf', count: 2, gap: 2.0 },
                       { type: 'archer_inf', count: 4, gap: 1.3 }, { type: 'plague_inf', count: 2, gap: 2.0 },
                       { type: 'dark_priest', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 4, gap: 1.6 }, { type: 'shadow_inf', count: 4, gap: 1.7 },
                       { type: 'heavy_inf', count: 2, gap: 1.9 }, { type: 'archer_inf', count: 8, gap: 1.2 },
                       { type: 'plague_inf', count: 2, gap: 1.9 }, { type: 'dark_priest', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 8, gap: 1.4 }, { type: 'shadow_inf', count: 6, gap: 1.6 },
                       { type: 'heavy_inf', count: 4, gap: 1.8 }, { type: 'archer_inf', count: 10, gap: 1.1 },
                       { type: 'plague_inf', count: 2, gap: 1.9 }, { type: 'dark_priest', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 10, gap: 1.3 }, { type: 'shadow_inf', count: 10, gap: 1.5 },
                       { type: 'heavy_inf', count: 4, gap: 1.7 }, { type: 'archer_inf', count: 12, gap: 1.0 },
                       { type: 'plague_inf', count: 4, gap: 1.8 }, { type: 'dark_priest', count: 4, gap: 1.8 }] }
];

// STAGES 10 TO 13, at the owner's word, creature for creature and count for count.
// Each wave marches in MARCH_ORDER — the order the admin panel lists them in — so
// the giants walk out ahead of the Bomb Thugs, which is the owner's "giants out
// first before bomb thugs". tools/admin.mjs checks every table keeps that order.
//
// WHAT EACH BOARD INTRODUCES, following the story (src/data/story.js): the Dark
// Crow at Ironforge Town, the Bomb Thug at Ironforge Factory, and the Boulder Giant
// at Serene Peak Lake. The Rally Thug has left all four; he waits for Dark Hollow.
//
// THE GAPS ARE THE LADDERS THE SHIPPED TABLES ALREADY USED, a type's gap
// tightening as the waves go on, so wave N of one board sends a type at the rate
// wave N of the next one does. The two newcomers with no ladder of their own: the
// crow from 1.2s down to 0.8 — a flock, light and quick, that should arrive as one
// — and the Boulder Giant on the Club Giant's 2.0 to 1.7, the two giants together.
//
// Every gap is a multiple of 0.1, because the admin panel's rate stepper rounds to a
// tenth and a shipped number it cannot return to is one the owner can never put back.

// STAGE 10: Ironforge Town, where the Dark Crow first flies.
export const stage10Waves = [
  { rest: 10, groups: [{ type: 'light_inf', count: 8, gap: 1.4 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'tough_inf', count: 2, gap: 1.7 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 },
                       { type: 'tough_inf', count: 2, gap: 1.6 },
                       { type: 'blocker_inf', count: 1, gap: 1.7 },
                       { type: 'crow', count: 4, gap: 1.2 },
                       { type: 'shadow_inf', count: 1, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.2 },
                       { type: 'blocker_inf', count: 4, gap: 1.7 },
                       { type: 'crow', count: 6, gap: 1.1 },
                       { type: 'shadow_inf', count: 1, gap: 1.8 },
                       { type: 'heavy_inf', count: 1, gap: 2.0 },
                       { type: 'plague_inf', count: 2, gap: 2.0 },
                       { type: 'dark_priest', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 4, gap: 1.6 },
                       { type: 'crow', count: 8, gap: 1.0 },
                       { type: 'shadow_inf', count: 2, gap: 1.8 },
                       { type: 'heavy_inf', count: 2, gap: 2.0 },
                       { type: 'archer_inf', count: 4, gap: 1.3 },
                       { type: 'plague_inf', count: 2, gap: 2.0 },
                       { type: 'dark_priest', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 6, gap: 1.6 },
                       { type: 'crow', count: 10, gap: 0.9 },
                       { type: 'shadow_inf', count: 2, gap: 1.7 },
                       { type: 'heavy_inf', count: 2, gap: 1.9 },
                       { type: 'archer_inf', count: 6, gap: 1.2 },
                       { type: 'plague_inf', count: 2, gap: 1.9 },
                       { type: 'dark_priest', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 8, gap: 1.4 },
                       { type: 'crow', count: 12, gap: 0.8 },
                       { type: 'shadow_inf', count: 4, gap: 1.6 },
                       { type: 'heavy_inf', count: 3, gap: 1.8 },
                       { type: 'archer_inf', count: 8, gap: 1.1 },
                       { type: 'plague_inf', count: 4, gap: 1.9 },
                       { type: 'dark_priest', count: 4, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 10, gap: 1.3 },
                       { type: 'crow', count: 14, gap: 0.8 },
                       { type: 'shadow_inf', count: 6, gap: 1.5 },
                       { type: 'heavy_inf', count: 4, gap: 1.7 },
                       { type: 'archer_inf', count: 10, gap: 1.0 },
                       { type: 'plague_inf', count: 4, gap: 1.8 },
                       { type: 'dark_priest', count: 4, gap: 1.8 }] }
];

// STAGE 11: Ironforge Factory, where the Bomb Thug first runs.
export const stage11Waves = [
  { rest: 10, groups: [{ type: 'light_inf', count: 8, gap: 1.4 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'crow', count: 4, gap: 1.2 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 },
                       { type: 'blocker_inf', count: 2, gap: 1.7 },
                       { type: 'crow', count: 6, gap: 1.2 },
                       { type: 'bomb_inf', count: 2, gap: 1.9 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.2 },
                       { type: 'crow', count: 8, gap: 1.1 },
                       { type: 'heavy_inf', count: 1, gap: 2.0 },
                       { type: 'bomb_inf', count: 4, gap: 1.9 },
                       { type: 'plague_inf', count: 2, gap: 2.0 },
                       { type: 'dark_priest', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'crow', count: 10, gap: 1.0 },
                       { type: 'heavy_inf', count: 2, gap: 2.0 },
                       { type: 'bomb_inf', count: 6, gap: 1.8 },
                       { type: 'archer_inf', count: 4, gap: 1.3 },
                       { type: 'plague_inf', count: 2, gap: 2.0 },
                       { type: 'dark_priest', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'crow', count: 12, gap: 0.9 },
                       { type: 'shadow_inf', count: 1, gap: 1.7 },
                       { type: 'heavy_inf', count: 2, gap: 1.9 },
                       { type: 'bomb_inf', count: 8, gap: 1.7 },
                       { type: 'archer_inf', count: 6, gap: 1.2 },
                       { type: 'plague_inf', count: 2, gap: 1.9 },
                       { type: 'dark_priest', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'crow', count: 14, gap: 0.8 },
                       { type: 'shadow_inf', count: 2, gap: 1.6 },
                       { type: 'heavy_inf', count: 3, gap: 1.8 },
                       { type: 'bomb_inf', count: 10, gap: 1.5 },
                       { type: 'archer_inf', count: 8, gap: 1.1 },
                       { type: 'plague_inf', count: 4, gap: 1.9 },
                       { type: 'dark_priest', count: 4, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'crow', count: 16, gap: 0.8 },
                       { type: 'shadow_inf', count: 3, gap: 1.5 },
                       { type: 'heavy_inf', count: 4, gap: 1.7 },
                       { type: 'bomb_inf', count: 10, gap: 1.4 },
                       { type: 'archer_inf', count: 8, gap: 1.0 },
                       { type: 'plague_inf', count: 4, gap: 1.8 },
                       { type: 'dark_priest', count: 4, gap: 1.8 }] }
];

// STAGE 12: Ironforge Castle. The owner's list is the Factory's exactly, wave for
// wave; a second array all the same, so the first retune of either lands on one
// board rather than quietly on both.
export const stage12Waves = [
  { rest: 10, groups: [{ type: 'light_inf', count: 8, gap: 1.4 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'crow', count: 4, gap: 1.2 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 },
                       { type: 'blocker_inf', count: 2, gap: 1.7 },
                       { type: 'crow', count: 6, gap: 1.2 },
                       { type: 'bomb_inf', count: 2, gap: 1.9 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.2 },
                       { type: 'crow', count: 8, gap: 1.1 },
                       { type: 'heavy_inf', count: 1, gap: 2.0 },
                       { type: 'bomb_inf', count: 4, gap: 1.9 },
                       { type: 'plague_inf', count: 2, gap: 2.0 },
                       { type: 'dark_priest', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'crow', count: 10, gap: 1.0 },
                       { type: 'heavy_inf', count: 2, gap: 2.0 },
                       { type: 'bomb_inf', count: 6, gap: 1.8 },
                       { type: 'archer_inf', count: 4, gap: 1.3 },
                       { type: 'plague_inf', count: 2, gap: 2.0 },
                       { type: 'dark_priest', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'crow', count: 12, gap: 0.9 },
                       { type: 'shadow_inf', count: 1, gap: 1.7 },
                       { type: 'heavy_inf', count: 2, gap: 1.9 },
                       { type: 'bomb_inf', count: 8, gap: 1.7 },
                       { type: 'archer_inf', count: 6, gap: 1.2 },
                       { type: 'plague_inf', count: 2, gap: 1.9 },
                       { type: 'dark_priest', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'crow', count: 14, gap: 0.8 },
                       { type: 'shadow_inf', count: 2, gap: 1.6 },
                       { type: 'heavy_inf', count: 3, gap: 1.8 },
                       { type: 'bomb_inf', count: 10, gap: 1.5 },
                       { type: 'archer_inf', count: 8, gap: 1.1 },
                       { type: 'plague_inf', count: 4, gap: 1.9 },
                       { type: 'dark_priest', count: 4, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'crow', count: 16, gap: 0.8 },
                       { type: 'shadow_inf', count: 3, gap: 1.5 },
                       { type: 'heavy_inf', count: 4, gap: 1.7 },
                       { type: 'bomb_inf', count: 10, gap: 1.4 },
                       { type: 'archer_inf', count: 8, gap: 1.0 },
                       { type: 'plague_inf', count: 4, gap: 1.8 },
                       { type: 'dark_priest', count: 4, gap: 1.8 }] }
];

// STAGE 13: Serene Peak Lake, where the Boulder Giant first throws.
export const stage13Waves = [
  { rest: 10, groups: [{ type: 'light_inf', count: 8, gap: 1.4 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'tough_inf', count: 2, gap: 1.7 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 },
                       { type: 'blocker_inf', count: 2, gap: 1.7 },
                       { type: 'bomb_inf', count: 2, gap: 1.9 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.2 },
                       { type: 'heavy_inf', count: 1, gap: 2.0 },
                       { type: 'bomb_inf', count: 4, gap: 1.9 },
                       { type: 'plague_inf', count: 2, gap: 2.0 },
                       { type: 'dark_priest', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 4, gap: 1.6 },
                       { type: 'heavy_inf', count: 1, gap: 2.0 },
                       { type: 'boulder_giant', count: 1, gap: 2.0 },
                       { type: 'bomb_inf', count: 6, gap: 1.8 },
                       { type: 'archer_inf', count: 2, gap: 1.3 },
                       { type: 'plague_inf', count: 2, gap: 2.0 },
                       { type: 'dark_priest', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 4, gap: 1.6 },
                       { type: 'heavy_inf', count: 2, gap: 1.9 },
                       { type: 'boulder_giant', count: 2, gap: 1.9 },
                       { type: 'bomb_inf', count: 8, gap: 1.7 },
                       { type: 'archer_inf', count: 4, gap: 1.2 },
                       { type: 'plague_inf', count: 2, gap: 1.9 },
                       { type: 'dark_priest', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 4, gap: 1.4 },
                       { type: 'heavy_inf', count: 3, gap: 1.8 },
                       { type: 'boulder_giant', count: 3, gap: 1.8 },
                       { type: 'bomb_inf', count: 10, gap: 1.5 },
                       { type: 'archer_inf', count: 6, gap: 1.1 },
                       { type: 'plague_inf', count: 4, gap: 1.9 },
                       { type: 'dark_priest', count: 4, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'blocker_inf', count: 4, gap: 1.3 },
                       { type: 'heavy_inf', count: 4, gap: 1.7 },
                       { type: 'boulder_giant', count: 4, gap: 1.7 },
                       { type: 'bomb_inf', count: 12, gap: 1.4 },
                       { type: 'archer_inf', count: 8, gap: 1.0 },
                       { type: 'plague_inf', count: 4, gap: 1.8 },
                       { type: 'dark_priest', count: 4, gap: 1.8 }] }
];

// STAGE 14: Dark Hollow Woods, where the Rally Thug first raises his banner, from
// wave 4. Same house order and gap ladders as stages 10 to 13, so he marches at the
// back of each wave, behind the priests.
export const stage14Waves = [
  { rest: 10, groups: [{ type: 'light_inf', count: 8, gap: 1.4 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'crow', count: 4, gap: 1.2 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 },
                       { type: 'blocker_inf', count: 2, gap: 1.7 },
                       { type: 'crow', count: 6, gap: 1.2 },
                       { type: 'bomb_inf', count: 2, gap: 1.9 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.2 },
                       { type: 'crow', count: 8, gap: 1.1 },
                       { type: 'bomb_inf', count: 4, gap: 1.9 },
                       { type: 'plague_inf', count: 2, gap: 2.0 },
                       { type: 'dark_priest', count: 2, gap: 1.8 },
                       { type: 'rally_inf', count: 1, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'crow', count: 10, gap: 1.0 },
                       { type: 'heavy_inf', count: 1, gap: 2.0 },
                       { type: 'boulder_giant', count: 1, gap: 2.0 },
                       { type: 'bomb_inf', count: 6, gap: 1.8 },
                       { type: 'plague_inf', count: 2, gap: 2.0 },
                       { type: 'dark_priest', count: 2, gap: 1.8 },
                       { type: 'rally_inf', count: 1, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'crow', count: 12, gap: 0.9 },
                       { type: 'shadow_inf', count: 1, gap: 1.7 },
                       { type: 'heavy_inf', count: 1, gap: 1.9 },
                       { type: 'boulder_giant', count: 1, gap: 1.9 },
                       { type: 'bomb_inf', count: 8, gap: 1.7 },
                       { type: 'plague_inf', count: 2, gap: 1.9 },
                       { type: 'dark_priest', count: 2, gap: 1.8 },
                       { type: 'rally_inf', count: 1, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'crow', count: 14, gap: 0.8 },
                       { type: 'shadow_inf', count: 2, gap: 1.6 },
                       { type: 'heavy_inf', count: 2, gap: 1.8 },
                       { type: 'boulder_giant', count: 2, gap: 1.8 },
                       { type: 'bomb_inf', count: 10, gap: 1.5 },
                       { type: 'plague_inf', count: 4, gap: 1.9 },
                       { type: 'dark_priest', count: 4, gap: 1.8 },
                       { type: 'rally_inf', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'crow', count: 16, gap: 0.8 },
                       { type: 'shadow_inf', count: 2, gap: 1.5 },
                       { type: 'heavy_inf', count: 3, gap: 1.7 },
                       { type: 'boulder_giant', count: 3, gap: 1.7 },
                       { type: 'bomb_inf', count: 10, gap: 1.4 },
                       { type: 'plague_inf', count: 4, gap: 1.8 },
                       { type: 'dark_priest', count: 4, gap: 1.8 },
                       { type: 'rally_inf', count: 2, gap: 1.8 }] }
];

// STAGE 15: Dark Hollow Quarters. The owner's list is stage 14's exactly, wave for
// wave; a second array all the same, so the first retune of either lands on one
// board. THE CAPTAIN IS NOT IN IT: he stands at the camp wall all game and walks out
// once the last wave is dead — see `captain` under `quarters` in src/villagers.js.
export const stage15Waves = [
  { rest: 10, groups: [{ type: 'light_inf', count: 8, gap: 1.4 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'crow', count: 4, gap: 1.2 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 },
                       { type: 'blocker_inf', count: 2, gap: 1.7 },
                       { type: 'crow', count: 6, gap: 1.2 },
                       { type: 'bomb_inf', count: 2, gap: 1.9 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.2 },
                       { type: 'crow', count: 8, gap: 1.1 },
                       { type: 'bomb_inf', count: 4, gap: 1.9 },
                       { type: 'plague_inf', count: 2, gap: 2.0 },
                       { type: 'dark_priest', count: 2, gap: 1.8 },
                       { type: 'rally_inf', count: 1, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'crow', count: 10, gap: 1.0 },
                       { type: 'heavy_inf', count: 1, gap: 2.0 },
                       { type: 'boulder_giant', count: 1, gap: 2.0 },
                       { type: 'bomb_inf', count: 6, gap: 1.8 },
                       { type: 'plague_inf', count: 2, gap: 2.0 },
                       { type: 'dark_priest', count: 2, gap: 1.8 },
                       { type: 'rally_inf', count: 1, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'crow', count: 12, gap: 0.9 },
                       { type: 'shadow_inf', count: 1, gap: 1.7 },
                       { type: 'heavy_inf', count: 1, gap: 1.9 },
                       { type: 'boulder_giant', count: 1, gap: 1.9 },
                       { type: 'bomb_inf', count: 8, gap: 1.7 },
                       { type: 'plague_inf', count: 2, gap: 1.9 },
                       { type: 'dark_priest', count: 2, gap: 1.8 },
                       { type: 'rally_inf', count: 1, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'crow', count: 14, gap: 0.8 },
                       { type: 'shadow_inf', count: 2, gap: 1.6 },
                       { type: 'heavy_inf', count: 2, gap: 1.8 },
                       { type: 'boulder_giant', count: 2, gap: 1.8 },
                       { type: 'bomb_inf', count: 10, gap: 1.5 },
                       { type: 'plague_inf', count: 4, gap: 1.9 },
                       { type: 'dark_priest', count: 4, gap: 1.8 },
                       { type: 'rally_inf', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'crow', count: 16, gap: 0.8 },
                       { type: 'shadow_inf', count: 2, gap: 1.5 },
                       { type: 'heavy_inf', count: 3, gap: 1.7 },
                       { type: 'boulder_giant', count: 3, gap: 1.7 },
                       { type: 'bomb_inf', count: 10, gap: 1.4 },
                       { type: 'plague_inf', count: 4, gap: 1.8 },
                       { type: 'dark_priest', count: 4, gap: 1.8 },
                       { type: 'rally_inf', count: 2, gap: 1.8 }] }
];

// STAGE 16: Dark Hollow Citadel. "Similar to Stage 15", at the owner's word — so
// stage 15's list, wave for wave, as a second array of its own, so the first retune of
// either lands on one board. THE CROW HARBINGER IS NOT IN IT: he stands on the
// citadel's balcony all game, casting, and comes down to the road once the last wave
// is dead — see `balcony` under `citadel` in src/villagers.js.
export const stage16Waves = [
  { rest: 10, groups: [{ type: 'light_inf', count: 8, gap: 1.4 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 }, { type: 'crow', count: 4, gap: 1.2 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.3 },
                       { type: 'blocker_inf', count: 2, gap: 1.7 },
                       { type: 'crow', count: 6, gap: 1.2 },
                       { type: 'bomb_inf', count: 2, gap: 1.9 }] },
  { rest: 10, groups: [{ type: 'light_inf', count: 10, gap: 1.2 },
                       { type: 'crow', count: 8, gap: 1.1 },
                       { type: 'bomb_inf', count: 4, gap: 1.9 },
                       { type: 'plague_inf', count: 2, gap: 2.0 },
                       { type: 'dark_priest', count: 2, gap: 1.8 },
                       { type: 'rally_inf', count: 1, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'crow', count: 10, gap: 1.0 },
                       { type: 'heavy_inf', count: 1, gap: 2.0 },
                       { type: 'boulder_giant', count: 1, gap: 2.0 },
                       { type: 'bomb_inf', count: 6, gap: 1.8 },
                       { type: 'plague_inf', count: 2, gap: 2.0 },
                       { type: 'dark_priest', count: 2, gap: 1.8 },
                       { type: 'rally_inf', count: 1, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'crow', count: 12, gap: 0.9 },
                       { type: 'shadow_inf', count: 1, gap: 1.7 },
                       { type: 'heavy_inf', count: 1, gap: 1.9 },
                       { type: 'boulder_giant', count: 1, gap: 1.9 },
                       { type: 'bomb_inf', count: 8, gap: 1.7 },
                       { type: 'plague_inf', count: 2, gap: 1.9 },
                       { type: 'dark_priest', count: 2, gap: 1.8 },
                       { type: 'rally_inf', count: 1, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'crow', count: 14, gap: 0.8 },
                       { type: 'shadow_inf', count: 2, gap: 1.6 },
                       { type: 'heavy_inf', count: 2, gap: 1.8 },
                       { type: 'boulder_giant', count: 2, gap: 1.8 },
                       { type: 'bomb_inf', count: 10, gap: 1.5 },
                       { type: 'plague_inf', count: 4, gap: 1.9 },
                       { type: 'dark_priest', count: 4, gap: 1.8 },
                       { type: 'rally_inf', count: 2, gap: 1.8 }] },
  { rest: 10, groups: [{ type: 'crow', count: 16, gap: 0.8 },
                       { type: 'shadow_inf', count: 2, gap: 1.5 },
                       { type: 'heavy_inf', count: 3, gap: 1.7 },
                       { type: 'boulder_giant', count: 3, gap: 1.7 },
                       { type: 'bomb_inf', count: 10, gap: 1.4 },
                       { type: 'plague_inf', count: 4, gap: 1.8 },
                       { type: 'dark_priest', count: 4, gap: 1.8 },
                       { type: 'rally_inf', count: 2, gap: 1.8 }] }
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
