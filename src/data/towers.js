// Archery and barracks families. Tier 1 is built on an empty plot; tapping an
// existing tower upgrades it. Costs are cumulative spend, not refundable.
//
// THREE NAMES PER TIER, on purpose, because a tier is three things.
//
//   name    the flavour one — Watchtower, Guard Post, Knight's Hall. Nothing
//           draws it since the menu buttons lost their labels; the TOOLS print
//           it, so a sim row still says which building it means.
//   title   what the tier is called plainly: "Barracks Tier II", "Archery Tier
//           III". It heads that tier's entry in the encyclopedia. It reads
//           "Archery" rather than "Archers" because the family, the folder and
//           every file are called that now — the artist renamed the uploads and
//           the one place the old word survived on screen was here.
//   unit    the MAN the tier puts on the board, which is what the info box
//           shows — a Spearman, a Combat Archer, a Trebuchet Engineer.
//
// The last of those is a barracks' `soldier.name` generalised to the other two
// families: see the note above `archery`. Every tower shows a man in the info
// box, so every tower has to be able to name one.
//
// Every figure in this file is drawn standing upright and is never rotated.
// Aiming mirrors it left or right and nothing else: rotating a standing figure
// to point at a target lays it on its side, which is the whole reason the
// archers looked wrong to begin with. Arrows are the exception — a projectile
// has no upright, so it rotates to point where it is flying.
//
// ONE SCALE FOR EVERYTHING. Every asset is exported on the same square canvas,
// and the artist sized them against each other on it — a soldier is small next
// to a tower because that is how tall a soldier is. So a single factor converts
// source pixels to game pixels for all of them, and no sprite is ever sized on
// its own. Change SCALE to resize the whole game's art together.
//
// Derived from the export size rather than typed, so re-exporting the same
// artwork bigger or smaller changes ONE number and every drawn size stays put.
// The exports have been 1000x1000, then 200x200, and are 512x512 now.
//
// 512 is the size that makes the art sharp on a phone. The tallest sprite is
// drawn 97px and the canvas backing store goes to 3x device pixels, so it needs
// 291 source pixels; at 200px it had 185 and was upscaled 1.57x, which is why it
// looked soft on a phone and crisp on a laptop (a laptop asks for 1x). Every
// sprite now has pixels to spare. `node tools/trim.mjs` checks this per sprite.
// Exported because render.js needs it to place a death pose: an untrimmed corpse
// is drawn as the whole square, anchored by where the living figure's feet sit
// inside it, so the canvas size is part of that sum.
export const EXPORT_PX = 512;
export const SCALE = 105 / EXPORT_PX;

// THE ONE EXCEPTION TO THE RULE ABOVE, and it is deliberate.
//
// Blood is an effect, not a figure. The shared SCALE exists so that figures are
// sized against each other by the artwork — a soldier is small next to a tower
// because that is how tall a soldier is. A splash of blood has no such truth to
// respect: how big it should be is a question about how well it reads, not about
// anatomy.
//
// x2. That puts the spatter at about 14px beside a 23px militia and the pool at
// about 40px under a 27px body — big enough to read, small enough not to be the
// loudest thing on the board. Drawn at the shared SCALE instead it would be a
// 7x7 speck.
//
// THIS NUMBER IS HALF OF WHAT IT WAS, AND THE BLOOD IS THE SAME SIZE ON SCREEN.
// It was x4 against art that filled 17-56px of its canvas; the art was redrawn
// at twice that, so the multiplier came down by the same factor to hold the
// drawn size still. That is the whole point of keeping the size in one constant:
// the artist changes how many pixels the drawing has, and one number here decides
// how big it appears, so the two can move independently.
//
// It also bought back most of the sharpness. The upscale at 3x device pixels went
// from 2.46x to 1.23x — visibly softer than a sprite drawn 1:1, but close enough
// that a red blob will not read as blurry. Do not raise this to chase the last of
// it: bigger blood was explicitly not wanted.
export const BLOOD_SCALE = SCALE * 2;

const drawnW = trim => Math.round(trim[2] * SCALE);
const drawnH = trim => Math.round(trim[3] * SCALE);

// spriteTrim = the tight bounding box of the art inside its square export.
// mountFrac  = where the gunner stands as a fraction of the building box: the
//              middle of the platform.
// muzzle     = [sideways, vertical] from the gunner. The sideways part flips
//              with the sprite, so the arrow always leaves the bow.
// spriteFaces= which way the artwork is drawn, -1 for left.
// gunnerPivot= the body centre as a fraction of the gunner's trim — the point
//              it mirrors about, not the middle of a box a bow pulls off-centre.

// Measured from the PNGs' alpha by tools/trim.mjs — do not hand-edit. These are
// absolute source pixels, so they are the one thing that MUST be re-pasted after
// a re-export at a different size; everything else below is a fraction of the
// trim and carries over untouched.
// THE FOUR TOWERS ARE ON A 1024 CANVAS; EVERY FIGURE IS STILL ON 512.
//
// That is not a mistake and it needs no special case in the code. A trim is
// absolute source pixels into whatever image it names, and SCALE turns source
// pixels into game px, so a drawing on a bigger canvas simply draws bigger —
// which is what the redraw was for. The check that the two canvases still agree
// with each other is external: the plot marker is on 1024 too, and at this same
// SCALE it comes out within 2.5% of the markers painted into the 1920-wide map.
// The map is authored at the game's own scale, so that agreement is the proof.
//
// It does mean a tower's trim can no longer be eyeballed against a figure's.
// 490 wide here and 144 wide for the archer are not the same units.
const TOWER_TRIM = [267, 211, 490, 602];
const TOWER2_TRIM = [298, 140, 428, 744];
const TOWER3_TRIM = [331, 140, 362, 744];
// THE FOURTH RUNG OF THE ARCHERY LADDER, and the first tier 4 in the game. A
// stone turret with battlements, a banner down its front and a rack of muskets on
// the deck. Narrower than any of the three below it — 360 source px against 490,
// 428 and 362 — because it is a tower rather than a platform on splayed legs.
const TOWER4_TRIM = [332, 205, 360, 614];
// THE SECOND FOURTH RUNG, and the first time a ladder has forked. The Crossbow
// Sentry is the same turret drawn again with a rack of quarrels on the deck
// instead of muskets — same 360px width, four source px taller, and the artist's
// deck and battlement land on exactly the same coordinates shifted 4px down.
// That is not a coincidence to lean on: it is measured out of the SVG below and
// re-measured on every upload, like every other number here.
const SENTRY_TRIM = [332, 201, 360, 622];
// EVERY FIGHTING MAN IS TWO DRAWINGS, so every one of them has two trims.
//
// The two are NOT unioned into one box the way the catapult's three frames are,
// and the difference is worth stating because it looks like an inconsistency.
// A building is anchored by `groundFrac`, a fraction of ONE trim, so its frames
// must share that trim or the building hops on its plot. A figure is anchored by
// a pivot on its own shadow — and `tools/shadow.mjs` reports that the shadow is
// drawn at the SAME source pixel in both poses of all six men, to within 0.7px
// on the archers and exactly on the soldiers. So each pose carries its own trim
// and its own pivot, and the two register by construction.
//
// That matters beyond tidiness: the union boxes would have been up to 39px wider
// than the Default, and a soldier's collision radius is derived from his trim.
// Unioning would have widened the hitbox of every man in the game to fit a spear
// he only holds out for a quarter of a second.
const ARCHER_TRIM = [175, 196, 162, 120];
const ARCHER_ATK_TRIM = [195, 196, 142, 120];
const ARCHER2_TRIM = [175, 195, 162, 122];
const ARCHER2_ATK_TRIM = [195, 195, 142, 122];
const ARCHER3_TRIM = [175, 195, 162, 122];
const ARCHER3_ATK_TRIM = [195, 195, 142, 122];
// The musketeer, and he is the widest man in the game for his height: 152x124
// against an archer's 162x120, nearly all of it musket. The Attack pose is 7px
// wider and starts 7px further left, which is the puff of smoke at the barrel —
// the two drawings are otherwise the same figure in the same place.
const MUSKET_TRIM = [180, 194, 152, 124];
const MUSKET_ATK_TRIM = [173, 194, 159, 124];
// The quarrel, and the flattest sprite in the game: 94 x 12 source, drawn 19x2.
const QUARREL_TRIM = [209, 250, 94, 12];
// The crossbowman, and he is the opposite shape to the musketeer: 124x118 where
// the musket makes its man 152 across. A crossbow is held ACROSS the body rather
// than run out in front of it, so he is nearly as compact as an unarmed figure.
//
// The Default pose is 13px wider on the left, and that is the loaded quarrel
// sticking out past the prod. Attack is the same man with the bow empty — see
// the note on `archer` for why those two names read backwards until you look at
// the drawings.
const XBOW_TRIM = [194, 197, 124, 118];
const XBOW_ATK_TRIM = [207, 197, 111, 118];
const CAMP_TRIM = [207, 249, 610, 526];
const CAMP2_TRIM = [200, 197, 624, 630];
const CAMP3_TRIM = [200, 201, 624, 621];
const SPEAR_TRIM = [172, 198, 168, 116];
const SPEAR_ATK_TRIM = [133, 198, 196, 116];
const SPEAR2_TRIM = [174, 196, 163, 120];
const SPEAR2_ATK_TRIM = [155, 196, 181, 120];
const SPEAR3_TRIM = [201, 196, 110, 120];
const SPEAR3_ATK_TRIM = [166, 196, 145, 120];
// THE FOURTH RUNG OF THE BARRACKS LADDER, and the second tier 4 in the game. A
// square stone keep with a pitched roof and a banner, on the same 1024 canvas as
// the other three buildings. 520x650 against the log hut's 624x621 — TALLER AND
// NARROWER, which is what a keep is next to a hall, and it is the first barracks
// building that is not wider than it is high.
const CAMP4_TRIM = [252, 187, 520, 650];
// The Assassin Guild is the SAME BOX, and that is measured rather than assumed:
// tools/trim.mjs gives it [252, 187, 520, 650] and its ground shadow spans the
// same 253..770 by 676..835 the keep's does, to the pixel. The artist redrew the
// keep with a brown banner and daggers on the deck, so the two barracks tier 4s
// share a footprint the way the two archery ones do — see `guild` below, which
// reuses camp4 outright.
// The paladin: full plate, a kite shield and a longsword. Narrow and TALL —
// 123x140 against the swordsman's 110x120 and the spearman's 168x116 — because he
// rests with the sword UPRIGHT over his shoulder, which makes him the tallest of
// the four men a barracks musters.
//
// His two poses differ more than anyone's, and in both directions: the sword comes
// down and levels out, so the box goes from 123x140 to 178x116 — 45px wider and
// 24 shorter. That is why each pose carries its own trim and its own pivot rather
// than sharing one box; see the note above the archers for the rule.
// The assassin, and he is the narrowest man in the game standing still: 82
// source px against a paladin's 123, because he holds a short blade against his
// body rather than a longsword out from it. The Attack pose is 151 — nearly
// double — which is the lunge, and it is the biggest gap between a man's two
// poses anywhere in the set.
const ASSASSIN_TRIM = [215, 198, 82, 116];
const ASSASSIN_ATK_TRIM = [174, 198, 151, 116];
const PAL_TRIM = [193, 188, 123, 140];
const PAL_ATK_TRIM = [135, 212, 178, 116];

// THE MONASTERY, on the same 1024 canvas as the other three buildings and the
// same 512 as every figure.
//
// REDRAWN, ALL THREE TIERS, and the family is a different building now: the old
// one was a walled cell that grew a roof, and these are open timber decks on
// legs with a rail round them — the archery tower's shape, in the monastery's
// materials. The artist deleted the old folder and uploaded the new set, so every
// number below is measured from scratch and none of it carries across.
//
// Tiers 2 and 3 no longer share a trim. They are within 7px of each other and
// stand on the same frame — tier 3 is tier 2's platform rebuilt in stone — but
// the stonework is a different width, so each carries its own rect and its own
// anchors. Tier 1 is the same deck with no roof and a cross on a post.
const MON_TRIM = [241, 228, 542, 568];
const MON2_TRIM = [274, 165, 476, 694];
const MON3_TRIM = [277, 165, 469, 694];
// Tier 4, the High Altar. NARROWER AND TALLER than the three below it —
// 360 x 804 against tier 3's 469 x 694 — and both halves of that are the drawing
// rather than a scale change: the belfry sits on a storey of stonework instead
// of on legs, so the building climbs rather than spreads. 165 game px makes it
// the tallest thing in the game, past the monastery's own 142 and the barracks'
// 133.
const MON4_TRIM = [332, 110, 360, 804];
// Tier 4's second rung, the Judgement Temple, and it is the ALTAR'S BELFRY six
// game px shorter: 360 x 776 against 360 x 804, the same width to the pixel and
// 28 source px less height. The artist drew one building twice — a plain spire
// where the altar has a cross, and a banner hung across the near rail — so the
// two share a footprint and differ in what stands inside them.
const MON4B_TRIM = [332, 124, 360, 776];

// THE MONK, and there are two of him on a Judgement Temple. He is the smallest
// figure in the game: 76 x 116 source against a priest's 80 x 154, because he
// kneels rather than stands and carries no staff.
//
// HIS ATTACK POSE IS 4px WIDER and exactly as tall — 80 x 116 against 76 x 116 —
// which is his elbows coming out as he gathers the blast. Same height, same
// baseline, so the two poses swap with nothing but his arms moving.
const MONK_TRIM = [218, 198, 76, 116];
const MONK_ATK_TRIM = [214, 198, 80, 116];

// The three churchmen. All six drawings share ONE pair of boxes, which is the
// same finding the elite archer gave: the artist re-robed one figure rather than
// redrawing him, so the Priest, the Bishop and the Cardinal stand in the same
// place and hold the same staff. The Cardinal's Attack is the one exception and
// it is 2px wider on the left — his staff head is bigger.
//
// HE IS THE TALLEST FIGURE IN THE GAME and it is the staff that does it: 154
// source px against an archer's 120, because in the Default pose he holds it
// upright beside him. In the Attack pose it comes down across his body and the
// box goes the other way — 135 tall and 108 wide, against the Default's 80.
const PRIEST_TRIM = [216, 179, 80, 154];
const PRIEST_ATK_TRIM = [190, 198, 108, 135];
const BISHOP_TRIM = [216, 179, 80, 154];
const BISHOP_ATK_TRIM = [190, 198, 108, 135];
const CARDINAL_TRIM = [216, 179, 80, 154];
const CARDINAL_ATK_TRIM = [188, 196, 108, 137];

// THE POPE, and he is the first churchman who is not the same figure re-robed:
// his boxes are his own in both poses. Shorter than the other three in the
// Default — 156 against their 154 is a wash, but he is 84 wide against 80 — and
// noticeably wider in the Attack, 115 against 108, because the staff he swings is
// bigger and so is the head on it.
const POPE_TRIM = [214, 178, 84, 156];
const POPE_ATK_TRIM = [183, 198, 115, 136];

// The arcane missile, one drawing per tier and the first three the same shape.
const MISSILE_TRIM = [210, 246, 92, 20];
// The pope's, and the one that is not: 125 x 24 against the other three's 92 x
// 20, which is 26 game px in the air against 19. The artist asked for a bigger
// missile at the top of the ladder and this is the whole of it — same colours,
// same shape, a third longer.
const MISSILE4_TRIM = [193, 244, 125, 24];
// The monk's, and the smallest of the four: 59 x 24 source, 12 x 5 once drawn,
// against the three shared 92 x 20 darts and the pope's 125 x 24. A blunt head
// with a tail rather than a dart, which is what the artist drew for a blast thrown
// from the hands instead of loosed off a staff.
const MONK_SHOT_TRIM = [238, 253, 59, 24];

// The musket ball. The smallest sprite in the game by a wide margin — an arrow is
// 100x20 and this is 20x14, which is 4x3 once drawn.
const BULLET_TRIM = [246, 249, 20, 14];

// THE ONE TRIM IN THIS FILE THAT IS NOT A SINGLE FILE'S MEASURED BOX, and it
// has to be. The catapult is three drawings, not one, and the box below is the
// UNION of all three:
//
//   Default  [267, 350, 466, 324]
//   Reload   [291, 350, 442, 324]
//   Fire     [291, 328, 442, 346]     <- the arm is up, so it reaches higher
//
// All three are on the same 1024 canvas, so drawing the SAME source rect from
// each of them registers them pixel-for-pixel: the wheels, the frame and the
// shadow land on exactly the same screen pixels in all three frames and only
// the parts the artist actually moved appear to move. Give each frame its own
// tight trim instead and the machine jumps sideways and upwards every time the
// animation advances, because a tight box around a different drawing is a
// different box — Fire alone is 24px narrower and 22px taller than Default.
//
// So `node tools/trim.mjs` will NOT print this rect for any one of the three
// files, and that is correct rather than drift. tools/trim.mjs checks the union
// property directly instead: every frame's own trim must sit inside this box.
const CATAPULT_TRIM = [267, 328, 466, 346];

// The same union, worked out the same way, for the two machines above it. All
// six frames are on the 1024 canvas like tier 1's three.
//
//   Mangonel   Default [263,344,498,336]  Reload [289,323,472,357]  Fire [285,228,476,452]
//   Trebuchet  Default [161,334,664,399]  Reload [201,292,612,441]  Fire [201,107,563,626]
//
// The Fire frame drives the height in both, and by a lot: a trebuchet's arm at
// the top of its swing reaches 227 source px above where the machine rests, so
// the union is 626 tall against the resting frame's 399. That is not slack — the
// box has to hold the tallest frame or the machine jumps down the screen every
// time it looses.
const MANGONEL_TRIM = [263, 228, 498, 452];
const TREBUCHET_TRIM = [161, 107, 664, 626];

// The crewman, on his own 512 canvas. He is NOT drawn on the board — he is part
// of all three catapult drawings already, which is the whole reason the machine
// animates. This file exists so the info box has a face to put in its portrait
// slot, the same way a barracks shows its spearman rather than its tent.
const CREW_TRIM = [208, 196, 94, 116];
const CREW2_TRIM = [208, 196, 96, 120];
const CREW3_TRIM = [201, 196, 110, 120];
const CREW4_TRIM = [145, 196, 222, 120];
// The other tier 4's gunner. Much narrower than the ballista engineer beside him
// — 100 source px against 222 — because that engineer is holding a spare bolt
// that runs a long way out to his left, and this one is standing behind his ball.
const CREW4B_TRIM = [206, 189, 100, 134];

// --- the ballista turret's two pieces ---------------------------------------------
//
// TWO TRIMS BECAUSE TIER 4 IS TWO DRAWINGS. Everything below it is one picture
// per beat with the machine, the crew and the ground all in it; this tier is a
// stone turret that never moves and a machine that sits on top and turns.
//
// The turret. 516 x 618 source, the tallest building in the game after the
// trebuchet's swing.
const BALLISTA_TOWER_TRIM = [254, 203, 516, 618];

// The machine, and it is a UNION exactly as the catapult's is — the three frames
// share an origin and a height and differ only in width, so the widest decides:
//
//   Default [361,398,340,228]   Reload [361,398,302,228]   Fire [361,398,309,228]
//
// Nothing moves vertically between them at all, which is the artist drawing one
// machine in three states rather than three machines.
const BALLISTA_TRIM = [361, 398, 340, 228];

// The bolt in the air. Drawn DIAGONALLY across its export, which no other
// projectile in the game is — see `bolt` below for what that costs.
const BOLT_TRIM = [172, 174, 168, 164];

// --- the cannon outpost's two pieces ------------------------------------------
//
// The turret, and it is the BALLISTA'S TURRET: the two PNGs trim to the same
// [254, 203, 516, 618] and differ in 23,960 pixels, all of them inside one
// 134x241 box, and all of them the banner — the ballista's blue recoloured
// purple with a cannon on it where the bolt was. So this tier stands on the same
// stone, and the constant says so rather than repeating the numbers.
const CANNON_TOWER_TRIM = BALLISTA_TOWER_TRIM;

// The machine, and a UNION like the ballista's and the catapult's:
//
//   Default [343,431,338,162]   Reload [343,431,338,162]   Fire [339,431,342,162]
//
// The first two are the same rect to the pixel — the gunner moves the ball and
// nothing crosses the edge of the box — and Fire reaches 4px further LEFT, which
// is the smoke curling off the muzzle. Nothing moves vertically at all, same as
// every other machine in the family.
const CANNON_TRIM = [339, 431, 342, 162];

// The ball in the air, and the smallest projectile artillery throws: 48x48
// against the rocks' 60x48, 72x72 and 88x88. Round, so there is nothing to
// anchor by and nothing to turn — see `cannonball` below.
const BALL_TRIM = [232, 232, 48, 48];

// The rock gets bigger with the machine that throws it: 12 x 10 game px, then
// 15 x 15, then 18 x 18. Nothing about the FLIGHT changes — same speed, same arc,
// same lead — because those are what the Fire pose's length was chosen against
// and a heavier-looking rock that also flew slower would put the longest throw
// back over the 1.5s the arm stays up. The size is the tell; the damage number
// beside it is the fact.
const ROCK_TRIM = [226, 232, 60, 48];
const ROCK2_TRIM = [220, 220, 72, 72];
const ROCK3_TRIM = [212, 212, 88, 88];

// AMMUNITION. What a tower throws, kept beside the tower rather than as one
// global speed, because the two projectiles in the game now travel at very
// different rates and that difference is a gameplay fact rather than a detail:
// an arrow arrives more or less when it is fired and a rock is still in the air
// long enough for its target to have moved on.
//
// `faces` is which way the artwork points, and 0 means it does not point at all.
// An arrow is drawn lying left and rotates to its heading, because an arrow has
// a nose. A rock is a rock: rotating it to a heading says nothing, so it is
// drawn upright and never turned.
export const arrow = {
  kind: 'arrow',
  sprite: 'arrow_t1',
  trim: [203, 246, 100, 20],
  faces: -1,
  // Anchored at the HEAD, so the point lands on the target rather than the
  // shaft ending there.
  grip: 0.08,
  speed: 360,
  // No `arc`, so an arrow HOMES: it flies at its target and follows it, and a
  // dead target ends it. See rock below for the other kind.
  //
  // WHERE ITS NOISE IS. An arrow announces itself by being loosed and lands
  // more or less silently; a rock is the other way round. Two flags rather than
  // one, because "does this make a sound" turned out to be two questions.
  fireSound: true,
  landSound: false
};

// A BALL OF LEAD, and the smallest thing on the board: 20x14 source px, drawn
// 4x3. It is the arrow's shape of projectile — steered, nose-first, silent on
// arrival — and everything that differs is a consequence of the musket rather
// than a choice.
//
// FAST, and it is the fastest thing in the game — 560 against an arrow's 360.
// That is the whole character of the weapon: a bow arcs a shaft across the board
// and you watch it go, a musket cracks and the thing is already there. It also
// has to be, because this tower shoots across the whole map — at 360 a shot at
// something 450px away would spend a second and a quarter in the air, which on a
// 2.4s reload means the tower is holding a shot in flight half the time it is
// working.
//
// IT WAS 520 AND THE SENTENCE ABOVE WAS NOT TRUE. The ballista's bolt and
// Deadeye's ball both landed at 520 afterwards, so "the fastest thing in the
// game" described a three-way tie for as long as anybody read it — and nothing
// checked it, because it was a claim in a comment. The owner asked for the musket
// to be fastest; it is, by 40, and tools/families.mjs holds the whole order now
// so the next projectile to arrive cannot quietly tie it again.
//
// Speed is not a balance dial the way damage is. It changes how long a shot is in
// the air, and for a steered shot how often the man it was aimed at dies before it
// arrives — a shade better, on the one tower whose character it is.
//
// `grip` 0.12, a shade behind the arrow's 0.08: the ball is drawn with a rounded
// nose on the left and a flat base on the right, so its point is not quite the
// edge of the trim the way an arrowhead is.
export const bullet = {
  kind: 'bullet',
  sprite: 'bullet',
  trim: BULLET_TRIM,
  faces: -1,
  grip: 0.12,
  speed: 560,
  // Loud leaving the barrel and silent arriving, the same split as the arrow and
  // the arcane missile. A musket IS its report.
  fireSound: true,
  landSound: false
};

// THE SENTRY'S QUARREL, and it is an arrow's kind of projectile with an arrow's
// shape of drawing: flat, nose to the left, steered, silent on arrival.
//
// SO WHY NOT JUST FIRE `arrow`? Because the kind is what the kill line is keyed
// on — enemies.js reads `killedBy` off the ammunition — and the owner asked for a
// crossbowman's kill to have a voice of its own. Sharing the arrow would have
// meant sharing the cry, and a separate ammo entry is how every other weapon in
// the game says "this one sounds like itself". It also carries its own shot
// noise, which is the other half of the same answer.
//
// 94x12 source against an arrow's 100x20: a quarrel is shorter and much thinner
// than a longbow shaft, which is what the drawing already says.
//
// `grip` 0.07 rather than the arrow's 0.08 — the iron head is a blunt wedge in
// the leftmost 7% of the trim, so the point sits a shade nearer the edge.
//
// SPEED 440, between the arrow's 360 and the ball's 520. A crossbow shoots
// flatter and harder than a bow and nothing like as fast as powder, and at 330
// reach the longest flight is 0.75s — inside the 1.5s the Attack pose is shown
// for, which is the constraint that actually binds. See `cooldown` on the tier.
export const quarrel = {
  kind: 'quarrel',
  sprite: 'quarrel',
  trim: QUARREL_TRIM,
  faces: -1,
  grip: 0.07,
  speed: 440,
  // Loud leaving the bow, silent arriving — the same split as the arrow, the
  // ball and the arcane missile. A crossbow announces itself by loosing.
  fireSound: true,
  landSound: false
};

// THE FIRST THING A SOLDIER HAS EVER THROWN.
//
// Every projectile above this line leaves a BUILDING. This one leaves a man's
// hand — the assassin's, when his guild has bought Knife Throw — and it needed
// nothing new in projectiles.js to do it: a shot with no `side` looks for
// enemies, which is what a tower's arrows already say, so the whole difference
// between an archer's tower and an assassin's wrist is who pushed the shot onto
// the list. See loose() in src/units.js, which is the soldiers' half of the
// function enemies.js has had all along.
//
// 39x15 source, the smallest thing that flies: 8px long on the board against an
// arrow's 20. It is a knife rather than a missile and it should read as one.
//
// `grip` 0.08, measured the same way the arrow's was — the column where the
// point first reaches half the blade's height, which is 3px into a 39px trim.
// The tip is drawn at the LEFT like every other shaft in the game, so `faces` is
// -1 and nothing about the rotation is special.
//
// SPEED 300, the slowest steered shot there is, below the arrow's 360. A thrown
// blade is an arm rather than a bow, and at 200 reach the longest flight is 0.67s
// — comfortably inside the 0.8s between throws, so a second knife never leaves
// before the first arrives.
//
// SILENT LEAVING, LOUD ARRIVING, which is the flask's split rather than the
// arrow's and is what the owner asked for: the moment worth hearing is the blade
// going in, not the wrist that flicked it. The clip is wired into LANDING in
// projectiles.js off `kind`, like the rock's and the flask's.
export const knife = {
  kind: 'knife',
  sprite: 'assassin_knife',
  trim: [235, 250, 39, 15],
  faces: -1,
  grip: 0.08,
  speed: 300,
  fireSound: false,
  landSound: true
};

// THE SAME KNIFE, THROWN BY A MAN NOBODY HAD SEEN. What Sneak Attack puts in the
// air instead of the blade above.
//
// SPREAD FROM `knife`, which is the heavy bolt's pattern and it is doing the same
// job: everything about how this flies is inherited and only the picture, its box
// and its anchor are restated. In particular `kind` is inherited on purpose — a
// man killed by this is killed by an assassin and gets the assassin's cry, and it
// makes the same noise arriving, because it IS his knife and there is one
// recording of a knife going in.
//
// 37x15 against the plain blade's 39x15, and the two are not the same drawing
// scaled: the artist has drawn a second knife, 2px shorter and starting 2px
// further into the canvas.
//
// `grip` 0.084 IS THE PLAIN KNIFE'S 0.08 RE-EXPRESSED, not a second measurement.
// The point that sits on the flight path has to be the same point of the same
// weapon or the two would leave a hand from different places — so it is worked
// out from where the blade begins in each file: the plain knife's first ink is at
// source x 235 and this one's at 237, so 235 + 0.08 x 39 + 2 = 240.1 is the same
// spot on this blade, which against a trim starting at 237 and 37 wide is 0.084.
// The difference is a third of a source pixel and the arithmetic is written down
// so the next re-export can redo it rather than guess.
export const sneakKnife = {
  ...knife,
  sprite: 'assassin_knife_sneak',
  trim: [237, 250, 37, 15],
  grip: 0.084
};

// A LOB, and the only projectile in the game that is not steered.
//
// `arc` is what makes it one: the rock is thrown at a PATCH OF GROUND on a fixed
// flight, rises to `arc` of the throw's length at the top and comes down where
// it was aimed, whatever the man it was aimed at does in the meantime. An arrow
// chases; a rock is committed the moment it leaves the sling.
//
// That is why the crew AIMS AHEAD. Being unsteered against a target walking at
// 70px/s for the better part of a second would mean landing behind the column
// every single time — so the shot is aimed at where the target WILL be when it
// arrives, worked out exactly from the road rather than guessed from a heading
// (see leadPoint in src/enemies.js). It can still miss, and the interesting
// cases are the honest ones: a man who gets blocked, or killed, or reaches a
// bend, is a man the rock now lands slightly behind.
//
// 0.28 puts the top of the arc at about 56px on a 200px throw — high enough to
// read as thrown rather than slid, low enough to stay under the dashboard.
//
// `speed` is the HORIZONTAL rate, and it sets the flight time: 300 crosses the
// tier 3 reach of 360 in 1.20s, which has to stay inside the 1.5s the Fire pose
// holds for. A rock still in the air when the arm has already come back down
// looks like two different machines.
//
// IT WENT UP WITH THE REACH, 240 -> 300, and it had to: at 240 the longest throw
// took exactly 1.50s against a 1.50s pose, which tools/siege.mjs failed on the
// first run after the range change. Still comfortably slower than an arrow's
// 360, which is the rule that matters — you watch a rock travel.
//
// `arc` came DOWN as the reach went up, 0.28 -> 0.22, for a different reason:
// the peak is a fraction of the throw, so a 360px lob at 0.28 would rise 100px
// and a rock thrown upward from a high plot would disappear behind the
// dashboard. At 0.22 the longest throw peaks at 79px and the shortest useful one
// (130, the edge of the dead zone) still rises 29px, which reads.
export const rock = {
  kind: 'rock',
  sprite: 'rock_t1',
  trim: ROCK_TRIM,
  faces: 0,
  // Centred, because it is a lump with no nose to put on the target.
  grip: 0.5,
  speed: 300,
  // THROWN, not steered, and `lob` is the flag that says so — see the note on
  // `cannonball` for why that stopped being the same question as `arc`.
  lob: true,
  // How high it goes, as a fraction of how far it is going.
  arc: 0.22,
  // SILENT IN THE AIR, and loud when it arrives. Nothing plays when the arm
  // comes over: the release is not the moment the player is looking at, and a
  // creak nobody can place among ten towers is noise. The landing is the event —
  // it is where the damage happens and where the eye already is.
  fireSound: false,
  landSound: true,
  // And it throws up earth where it comes down. A third flag beside the two
  // sound ones, and a third flag for the same reason they are two: "what does
  // arriving look like" turned out to be a separate question from "what does it
  // sound like", and an arrow answers all three differently. See src/impacts.js.
  impact: true
};

// THE BALLISTA'S BOLT, and it is artillery's first STEERED shot.
//
// Everything above it lobs: a rock is committed to a patch of ground, arcs, and
// lands where it was aimed whatever the man it was aimed at does. A bolt is a
// bolt — it goes where it is pointed, fast and flat — so it homes like an arrow
// and dies with its target. That single difference is most of what makes tier 4
// feel like a different weapon rather than a fourth catapult, and it is also why
// this tier has no dead zone: there is no minimum range on a thing that does not
// have to be thrown up in the air to reach you.
//
// `speed` 520, a shade under the musket ball and the second fastest thing in the
// game. The reach is 260, so the longest flight is exactly half a second — well
// inside the 0.9s its Fire pose holds for. See `beats` on the tier.
//
// It was LEVEL with the ball and described as tied for fastest. The ball went to
// 560 on the owner's ask and this stayed put, because 520 is the number that
// half-second flight was derived from, and the Post — not this turret — is the
// tower whose whole character is speed. See `bullet`.
//
// DRAWN DIAGONALLY, which no other projectile is, and it needs two fields
// nothing else uses:
//
//   `drawn` is the angle the artwork's own nose points at, in the drawing.
//   Every other projectile is drawn lying flat — an arrow points left, so
//   `faces: -1` says "turn it half a turn and then to the heading". This one
//   points down and to the left at 3/4 pi, and there is no flag for that.
//
//   `hold` is which point of the drawing sits on the flight path, as a fraction
//   of the trim in BOTH axes. `grip` is the same idea for flat art and assumes
//   the middle vertically, which is where the shaft of a horizontal arrow is;
//   the head of a diagonal bolt is in a corner.
//
// Both are measured: the head is the dark blob at source (188.1, 320.4) in a
// trim that starts at (172, 174) and runs 168 x 164.
export const bolt = {
  kind: 'bolt',
  sprite: 'bolt',
  trim: BOLT_TRIM,
  faces: -1,
  drawn: (3 * Math.PI) / 4,
  hold: [0.096, 0.893],
  grip: 0.096,
  // HOW FAR FORWARD OF THE MUZZLE IT APPEARS, in drawn pixels, and it is the
  // bolt's own length: 207.4 source px from the iron head to the end of the
  // shaft, which is 42.5 drawn.
  //
  // Every other projectile in the game is small enough that this question never
  // came up — an arrow is 20px long and a rock is a lump. A bolt is 42px, which
  // is more than half the ballista's own width, so a shot anchored by its HEAD at
  // the mouth of the bow lies back across the whole machine and reads as coming
  // out of the middle of it. Placed one length forward, the head leads and the
  // TAIL sits at the mouth, which is the picture the owner drew.
  //
  // It is clamped against the range to the target in shoot(), so a thug standing
  // at the tower's feet is not shot at from behind him.
  clear: 42.5,
  speed: 520,
  // Loud leaving the rail, silent arriving — the arrow's split rather than the
  // rock's. A ballista IS the noise it makes going off; what it does on arrival
  // is put a bolt through somebody, which the kill line already answers.
  fireSound: true,
  landSound: false
};

// The same rock, drawn bigger, for the two machines above. ONLY the picture
// changes — speed, arc, lead, sound and impact all come from `rock` — because
// the flight is what the Fire pose's 1.5s was chosen against, and a heavier
// rock that also flew slower would put the longest throw back over it. What a
// bigger rock does is in the damage number beside it.
export const rock2 = { ...rock, sprite: 'rock_t2', trim: ROCK2_TRIM };
export const rock3 = { ...rock, sprite: 'rock_t3', trim: ROCK3_TRIM };

// THE CANNON OUTPOST'S BALL, and it is the first projectile in the game that is
// LOUD LEAVING AND LOUD ARRIVING — or rather, loud leaving and violent arriving,
// which turned out to be two different questions with two different answers.
//
// Three flags, three answers, and this is the ammunition that shows why they were
// ever separated. An arrow says yes/no/no: it announces itself by being loosed
// and lands quietly on one man. A rock says no/yes/yes: it is silent in the air
// and IS its arrival, in the ear and on the ground. This says yes/no/YES — the
// report is the event you hear, because powder is what a cannon is, and the crater
// is the event you SEE, because 70 damage into an 85px blast has to look like it
// went off. A single "is this loud" flag could not have expressed that, and the
// owner asked for exactly it: the shot on the release, the artillery impact on the
// landing, and nothing in between.
//
// LOBBED, NOT STEERED, and that is what makes it artillery rather than a very
// slow musket. `arc` commits the ball to a patch of GROUND, which is the whole
// point of a splash weapon: it lands where it was aimed whatever the man it was
// aimed at does, and everyone standing there takes it. A homing ball that died
// with its target would put a blast tower's damage into one enemy and nobody else.
//
// `arc` 0.10 against the rocks' 0.22, so it flies visibly FLATTER than the
// machines below it. Powder throws hard and low where a counterweight throws high
// and slow, and the two arcs on screen at once is most of what says these are
// different weapons before you read a single number.
//
// `speed` 480, the third fastest thing in the game: behind the musket ball's 560
// and the ballista bolt's 520, ahead of everything else including the crossbow's
// 440. Powder throws hard, and this is the heaviest charge on the board.
//
// It shipped at 420 and the owner asked for it to arrive sooner. The longest
// flight comes down from 0.86s to 360 / 480 = 0.75s against the 1.5s the Fire
// pose holds — the smoke is still at the muzzle when the ball lands, which is the
// constraint tools/siege.mjs measures for every tier, and the margin grew rather
// than shrank.
//
// UNDER THE MUSKET'S, deliberately: the ball from the Post is the fastest thing in
// the game and nothing may tie it. That is the owner's rule and tools/families.mjs
// is where the whole order is held, rather than in this sentence.
//
// `faces` 0 and `grip` 0.5, both copied from the rock and both for the rock's
// reason: a ball is a ball. There is no nose to put on the target and rotating a
// circle to a heading says nothing, so it is drawn upright and never turned.
export const cannonball = {
  kind: 'cannonball',
  sprite: 'cannonball',
  trim: BALL_TRIM,
  faces: 0,
  grip: 0.5,
  speed: 480,
  // THROWN, and FLAT, and those turned out to be two different facts about a
  // shot rather than one.
  //
  // `arc` used to answer both, because until this tower every lobbed thing in the
  // game rose: `if (ammo.arc)` meant "commit this to a patch of ground and lead
  // it", and the same number set how high it went. A cannon is the first weapon
  // that has to be one and not the other — it is committed to the ground like a
  // catapult and it flies like a musket — so the question is split. `lob` is
  // whether it is thrown; `arc` is how high.
  //
  // WHY IT IS STILL LOBBED at zero height, which is the half that is easy to get
  // wrong. Dropping `lob` as well would make this a STEERED shot, and a steered
  // shot follows one man and dies with him: kill him in the 0.86s the ball is in
  // the air and it vanishes mid-flight, taking an 85px blast with it. A blast
  // weapon has to be committed to the GROUND or its whole point can be cancelled
  // by the shot working. It also keeps the lead, which is what puts the ball
  // where a marching column will be rather than where its front man was.
  lob: true,
  // FLAT. The owner's ask, and it reads right: this is powder, not a
  // counterweight — the ball goes where it is pointed, fast, in a straight line
  // from the muzzle to the ground it was aimed at. The three machines below still
  // arc at 0.22, so a cannon and a trebuchet firing at once are visibly two
  // different weapons before you read a single number.
  //
  // render.js draws no ground shadow under a shot with no lift: the shadow exists
  // to say how HIGH a thing is, and drawn under a ball that never left the ground
  // it would just be a second ball.
  arc: 0,
  fireSound: true,
  landSound: false,
  impact: true
};

// THE ARCANE MISSILE, and the hardest single blow in the game.
//
// It is STEERED like an arrow — no `arc` — so it chases the man it was aimed at
// and dies with him, and what it does on arrival is take an enormous bite out of
// one enemy. Nothing else about it lands on anybody standing nearby: this is a
// SINGLE-TARGET weapon, deliberately, because splash is artillery's answer and a
// family needs a question of its own.
//
// IT USED TO SLOW ITS TARGET INSTEAD, and the slow is gone rather than reduced —
// no field on the ammunition, no clock on the enemy, no ring on the ground. Half
// a mechanic left behind is worse than none: it is a number nothing reads and a
// branch nobody tests. The family kept the picture, the flight and the voice; it
// swapped what arriving MEANS.
//
// `speed` 130 against an arrow's 360, which is the slowest thing in the air in
// this game — slower even than a lobbed rock's 300 horizontal — and it is meant
// to be watched. At tier 1's reach of 175 the longest flight is 1.35s, so a
// missile fired at a marching thug arrives about 85px behind where it was aimed
// and follows him there. That lag was the support tower's character and it is the
// sniper's too: you watch the shot travel, and by the time it lands you already
// know whether it was worth firing.
export const missile = {
  kind: 'arcane',
  sprite: 'missile_t1',
  trim: MISSILE_TRIM,
  // Drawn lying to the LEFT, like the arrow, and rotated to its heading. The
  // bulb is the head: the art runs from a rounded 20px cap on the left to a fine
  // point 70px to the right of it, which reads as a comet rather than a dart.
  faces: -1,
  // Just inside the bulb, so the glowing end sits on the man rather than the
  // tail passing through him. The arrow's 0.08 is its point; this is 0.15
  // because the head of this drawing has width.
  grip: 0.15,
  speed: 330,
  // It announces itself leaving the staff and arrives quietly, the same way an
  // arrow does — see the two flags on `arrow`.
  fireSound: true,
  landSound: false
};

// The same missile, drawn from each tier's own file. ONLY the picture changes:
// how hard it hits is on the tier, not on the ammunition, exactly as an archery
// tower's damage is. The speed and the grip are what the flight was chosen
// against, and a tier 3 missile that also flew faster would stop being the thing
// you watch.
export const missile2 = { ...missile, sprite: 'missile_t2' };
export const missile3 = { ...missile, sprite: 'missile_t3' };

// THE POPE'S, and the one missile in the family that is not simply the same
// drawing from another file.
//
// `trim` of its own, because it is a third longer than the other three — see
// MISSILE4_TRIM. `grip` 0.10 rather than 0.15 for the same reason and it is the
// same POINT: the anchor sits just inside the bulb, and this bulb is a smaller
// share of a longer drawing. Both land the glowing head on the man rather than
// dragging the tail through him.
//
// `kind` of its own, and it buys exactly two rows in two tables. FIRING in
// src/towers.js sends it to the monastery's own `arcane_shot` — the artist asked
// for the same noise, slightly louder, which is what `fireGain` is — and the kill
// cue in src/enemies.js sends it to the pope's own line rather than to the
// arrow's, which is where the other three tiers still go. Sharing `kind` with
// them would have meant a flag on the ammunition instead, and "what does this
// sound like" already has exactly one answer per kind.
//
// The SPEED is the family's 330, untouched. A tier 4 missile that also flew
// faster would stop being the thing you watch — the same argument that keeps
// tiers 2 and 3 at the tier 1 speed.
export const missile4 = {
  ...missile,
  kind: 'pope',
  sprite: 'missile_t4',
  trim: MISSILE4_TRIM,
  grip: 0.10,
  // A quarter louder than an abbey's. Not a fourth recording: it is the same clip
  // played harder, which is what "same sound effect but slightly louder" means and
  // is the only way to say it that leaves the other three tiers alone. See `level`
  // in play() in src/audio.js.
  fireGain: 1.25
};

// Every tier has its own drawing now, in both families — nothing is shared.
// They are all within a few px of each other in size, because scale is fixed by
// the export: a tier reads as an upgrade from what the building is MADE of and
// from the stars over its roof, never from being bigger. Timber becomes stone.
const watchtower = {
  sprite: 'archery_t1',
  spriteTrim: TOWER_TRIM,
  w: drawnW(TOWER_TRIM), h: drawnH(TOWER_TRIM),
  // The MIDDLE of the deck, source pixel (506.5, 438.6) inside the 1024 canvas.
  //
  // NOT the middle of the trim: the ladder and the flagpole hang off opposite
  // sides and drag the box centre away from the deck. The deck is found from the
  // four corner posts instead, and the mount is where the parallelogram's
  // diagonals cross. Anchor the archer to the art, never to the bounding box the
  // exporter happened to produce.
  //
  // The corners are the tops of the four legs, read out of the SVG: (356, 460),
  // (466, 382), (651.5, 418) and (554, 505). Those four have not moved across
  // two redraws — it is the rails between them that keep changing height, and a
  // rail is not what fixes the deck.
  mountFrac: [0.489, 0.378],
  // Where the building meets the ground: the centre of its shadow ellipse,
  // source (507.3, 735.6). See towerBox in src/towers.js for why this and not
  // the bounding box, and run tools/shadow.mjs to re-measure it.
  //
  // The tool fits the ellipse rather than reading its extremes, because the log
  // and the ladder lie across this one and hide its left and right tips at
  // different heights. Reading the tips put it 9px low.
  groundFrac: [0.490, 0.871],
  // The post on the deck's NEAREST corner — source x 547..560, from y 399 down
  // past the planks — crosses the archer's legs, so it is re-drawn over him.
  // One rect, tight to the post.
  //
  // The far corner's post is the trap here, exactly as it is on tier 2: it sits
  // at x 459..473, well inside the archer's span, and it is BEHIND him. A rect
  // generous enough to take both would paint a brown bar across his chest.
  frontTrims: [[547, 397, 15, 60]],
  // The near-left railing, as a polygon in the same source pixels. It runs
  // diagonally along the deck's near-left edge, from the left corner down to the
  // near corner, so a rect around it takes the deck behind it too. Traced from
  // the rail outline in the SVG and padded 5px for the black stroke the PNG
  // draws around a shape the SVG stores without one.
  //
  // There is only one now. The near-RIGHT edge has no rail on either tier — that
  // is the side the ladder comes up — and the previous drawing's second polygon
  // was tracing the deck's edge board, which is below the archer's feet and
  // never covers him.
  //
  // The rail was lowered in the redraw to give the archer more room, and it
  // shows in the numbers: it crosses him from x 438 to about x 484 and only
  // across his shins. Past that it passes below his feet entirely.
  frontPolys: [
    [[352, 419], [560, 462], [558, 480], [350, 438]]
  ],
  shape: 'tower'
};

// Tier 2: the same tower with a roof on it, and parts of the building are nearer
// the camera than the archer under it, so they have to be drawn OVER him. See
// frontTrims below.
const watchtower2 = {
  sprite: 'archery_t2',
  spriteTrim: TOWER2_TRIM,
  w: drawnW(TOWER2_TRIM), h: drawnH(TOWER2_TRIM),
  // The MIDDLE of the deck, source pixel (541.2, 505.2) in the 1024 canvas,
  // found the same way as tier 1's: leg tops at (391, 526), (501, 449),
  // (687, 485), (589, 572), mount where the diagonals cross.
  //
  // The whole drawing shifted about (-1, -2) between exports and the deck came
  // with it, which is the reassuring answer: the tower was redrawn, not
  // rebuilt. Re-measured anyway rather than nudged, because a fraction of a box
  // that changed shape is a different point.
  mountFrac: [0.568, 0.491],
  // Shadow centre, source (545.3, 802.5). Note it is NOT 0.5 across: the
  // flagpole leans out one side of the drawing, so centring the box put the
  // tower 7px left of where it should stand.
  groundFrac: [0.578, 0.890],
  // The near corner post, source x 583..596, running the whole height of the
  // tower from the roof at y=374 down through the deck to y=563. It is between
  // the archer and the camera for his entire height, so this rect is taller
  // than tier 1's — it has to cover him from over his helmet to under his feet.
  //
  // Tight to the post on purpose: the deck planks are behind it at the same x,
  // and two columns of deck painted over the archer is two columns too many.
  frontTrims: [[583, 392, 15, 130]],
  // The near-left railing — see the note on tier 1's. Same single rail, same
  // 5px pad, lowered by the same redraw.
  frontPolys: [
    [[387, 487], [594, 530], [592, 548], [385, 506]]
  ],
  shape: 'tower'
};

// Tier 3: a stone keep with a roofed timber deck on top. Tiers 1 and 2 are
// timber towers on splayed legs; this one is masonry, so it is 14px narrower and
// the same height. Nothing is shared with tier 2 any more.
const watchtower3 = {
  sprite: 'archery_t3',
  spriteTrim: TOWER3_TRIM,
  w: drawnW(TOWER3_TRIM), h: drawnH(TOWER3_TRIM),
  // The MIDDLE of the deck, source (509.5, 502.0), and it is found differently
  // from the two tiers below because the building is built differently. There
  // are no leg tops to take: the deck is the top FACE of the stone keep, one
  // path in the SVG with corners (467.3, 445.1), (659.9, 474.7), (555.9, 564.9)
  // and (350.6, 517.6), and the four roof posts stand ON it rather than holding
  // it up. The check that it is the right face is that the posts land on those
  // corners — the left post's foot is (350.6, 517.6) to the pixel.
  //
  // That face is not a parallelogram: its diagonals cross 10.9px apart at their
  // midpoints, so tiers 1 and 2's "where the diagonals cross" is not defined on
  // it and lands 7px off. This is the polygon's AREA CENTROID, which is the same
  // point on a true parallelogram and the right one here.
  mountFrac: [0.493, 0.487],
  // Shadow centre, source (512.3, 802.4). The SVG's shadow path spans
  // 335.6..689.9 by 724.4..881.5, centre (512.75, 802.95) — the fit is 0.7px off
  // it without being shown the SVG, the same check tier 1 passes.
  groundFrac: [0.501, 0.890],
  // The near corner post: a single 13x191 timber from (549.4, 373.0) to
  // (562.8, 563.8), padded 2px for the black stroke the PNG draws around it.
  // Taller than either tier below, but for the opposite reason to tier 2's —
  // tier 2's post runs DOWN past the deck through the tower, and this one runs
  // UP from a deck that is already at the top of a stone keep.
  //
  // The far post at x 466..479 is the usual trap: it is inside the archer's span
  // and behind him, so the rect stays tight to the near one.
  frontTrims: [[547, 370, 18, 197]],
  // NO frontPolys, and that is measured rather than forgotten. There IS a
  // near-left timber — (358.4, 492.2) (556.1, 534.7) (554.3, 543.4)
  // (356.5, 500.9) — and it looks like the rail tiers 1 and 2 need a polygon
  // for. It is not one: the archer stands at y=502 and that beam runs at
  // y=525..534 under him, never rising above y=510 anywhere across his 141px
  // span. It is the deck's near edge board. The rails have been lowered in every
  // redraw and on this tower they have gone under the floor.
  shape: 'tower'
};

// TIER 4, AND THE FIRST OF THEM IN THE GAME. A stone turret, twice as tall as it
// is wide, with a banner down the front face and a rack of muskets on the deck.
//
// It is the shortest building on this ladder by drawn height — 126px against tier
// 2 and 3's 153 — and much the narrowest at 74px. That is the drawing rather than
// an accident of trimming: tiers 1 to 3 are platforms on splayed legs and spread
// out at the bottom, and this one is a column.
const post = {
  sprite: 'archery_t4',
  spriteTrim: TOWER4_TRIM,
  w: drawnW(TOWER4_TRIM), h: drawnH(TOWER4_TRIM),
  // The MIDDLE of the deck, source pixel (508.8, 300.5) in the 1024 canvas.
  //
  // The deck here is the TOP FACE of the turret — one #969696 path with corners
  // (466.5, 243.5), (659.1, 273.2), (555.2, 363.4) and (349.8, 316.0) — so it is
  // found the way tier 3's is rather than from four leg tops. Not a parallelogram
  // either: the two long edges differ by 13px in run, so this is the polygon's
  // AREA CENTROID.
  //
  // The check that it is the right face is the blue cloth: the artist drapes a
  // banner over the deck and down the front wall, and the draped part is a second
  // path inset within these four corners, centred (506.2, 300.3) — 2.6px from the
  // face's own centroid. The man stands on the cloth.
  mountFrac: [0.491, 0.156],
  // Shadow centre, source (511.4, 737.4) from the ellipse fit. The SVG stores that
  // shadow as a single #37422f path spanning 335..689 by 659..816, whose own centre
  // is (512.0, 737.5) — within a pixel, measured two independent ways.
  //
  // Almost exactly 0.5 across, which is the first building in the game to be: this
  // drawing has no flagpole leaning out of it and no stair running off it.
  groundFrac: [0.498, 0.867],
  // THE NEAR MERLON, and it is the only piece of this tower in front of the man.
  //
  // The battlement has four blocks, one at each corner of the deck. Three are
  // behind him or beside him; the one at the deck's NEAREST corner stands between
  // him and the camera, and its top is 7px above the floor he is standing on — so
  // it covers his boots and the bottom of the musket's stock, which is what a man
  // behind a parapet looks like.
  //
  // A RECT CANNOT DO THIS, and shipping one was a visible bug: the merlon sits ON
  // the banner draped over the deck, so [518, 291, 65, 74] — the tight box round the
  // stone — also took a wedge of blue cloth beside it and painted that over the
  // musketeer's breeches and his shadow. It was reported from a screenshot the day
  // it shipped, and it is the same lesson the monastery's old roof taught: a box
  // around a shape drawn in perspective takes whatever else is in the box.
  //
  // So it is a POLYGON, traced from the merlon's three faces in the SVG — the top
  // (545.8, 293.4) (580.8, 299.8) (555.4, 319.4) (520.4, 312.3), and the two side
  // faces hanging from it to (580.8, 340.9), (555.2, 363.4) and (520.3, 355.3).
  // Their union is the six corners below, padded 2px for the black stroke the PNG
  // draws around shapes the SVG stores without one. 2 rather than 3: the pad on the
  // upper-left edge is over cloth, so every pixel of it is blue.
  //
  // The left-corner merlon at x 350..412 is the usual trap in reverse: it IS
  // nearer the camera than the deck's centre, but it is 20px clear of his widest
  // pose, so anything drawn round it would paint stone over nothing.
  frontPolys: [
    [[546, 291], [583, 298], [583, 342], [555, 366], [518, 357], [518, 311]]
  ],
  shape: 'tower'
};

// THE SECOND TIER 4 ON THIS LADDER, and the first fork in any family. The same
// stone turret as the Musketeer Post with a rack of QUARRELS standing on the deck
// where that one has muskets, and a crossbow mounted on the front wall.
//
// EVERY NUMBER BELOW IS THE MUSKETEER POST'S SHIFTED FOUR PIXELS DOWN, and that
// is a measurement rather than a shortcut. The artist drew this on the same
// template: the deck polygon comes out at (466.5, 247.6) (659.1, 277.2)
// (555.2, 367.4) (349.8, 320.1) against the post's (466.5, 243.5) (659.1, 273.2)
// (555.2, 363.4) (349.8, 316.0) — identical in x, exactly +4 in y. The trim
// moved with it: [332, 201, 360, 622] against [332, 205, 360, 614], so the
// FRACTIONS below differ even though the source pixels only slid.
//
// If a redraw ever breaks that, tools/shadow.mjs and tools/roof.mjs say so —
// neither of them knows the two towers are related.
const sentry = {
  sprite: 'archery_t4b',
  spriteTrim: SENTRY_TRIM,
  w: drawnW(SENTRY_TRIM), h: drawnH(SENTRY_TRIM),
  // The AREA CENTROID of the deck's top face, source (508.8, 304.5) — the same
  // #969696 quadrilateral the post has, and found the same way, because the two
  // long edges differ by 13px in run and it is not a parallelogram.
  mountFrac: [0.491, 0.166],
  // Shadow centre, source (511.5, 741.5), from the ellipse fit in
  // tools/shadow.mjs. The SVG stores that shadow as a single #37422f path
  // spanning 335..689 by 663..821, whose own bounding centre is (512.0, 741.9) —
  // within half a pixel, measured two independent ways. All but dead centre
  // across, like the post: this drawing has nothing leaning out of it either.
  groundFrac: [0.499, 0.869],
  // THE NEAR MERLON, the one block of stone standing between the crossbowman and
  // the camera, and the owner flagged it as the thing to be careful of.
  //
  // A RECT CANNOT DO THIS. The merlon sits ON the banner draped over the deck, so
  // a tight box around the stone also takes a wedge of blue cloth beside it and
  // paints that over his legs. That shipped as a visible bug on the Musketeer
  // Post once and this is the same trap, so it is a POLYGON, traced from the
  // merlon's three faces in the SVG: the top (545.8, 297.5) (580.8, 303.9)
  // (555.4, 323.4) (520.4, 316.4), and the two side faces hanging from it to
  // (580.8, 345.0), (555.2, 367.4) and (520.3, 359.4). Padded 2px for the black
  // stroke the PNG draws around shapes the SVG stores without one.
  //
  // The other three merlons are behind him or beside him; the left one at
  // x 350..412 IS nearer the camera than the deck centre but stands 20px clear
  // of his widest pose, so anything drawn round it would paint stone over grass.
  frontPolys: [
    [[546, 295], [583, 302], [583, 346], [555, 370], [518, 361], [518, 315]]
  ],
  shape: 'tower'
};

// WHICH POSE IS WHICH, because the names read backwards until you look at the
// drawings. Default is the archer with an arrow NOCKED, the head of it sticking
// out past the bow. Attack is the bow EMPTY, string snapped back — the instant
// after the arrow has gone. That is the right way round: the arrow becomes a
// projectile on the board at that moment, and a man who still had one on his
// bow while it flew would be holding two.
//
// So the sequence a player sees is: stand ready with an arrow on the string,
// loose it, empty bow for as long as the recoil lasts, then nocked again.
const archer = {
  ammo: arrow,
  gunner: 'archer_t1',
  gunnerTrim: ARCHER_TRIM,
  // THE CENTRE OF HIS GROUND SHADOW, source (263.5, 304.5). Not his feet, not
  // the middle of his box: the artist draws a grey ellipse under every figure,
  // and that ellipse is where the figure stands. `node tools/shadow.mjs` reads
  // it straight out of the PNG.
  //
  // This used to be guesswork dressed up as measurement — "the middle of his
  // torso, at the rows where the bow arc separates from the body" — and it was
  // wrong twice, once by 13px. The shadow removes the judgement call entirely:
  // the artist decides where he stands by drawing it, and the code reads it.
  //
  // A gunner also mirrors about this point, so it has to be the body's middle or
  // he jumps sideways when he turns. The shadow's centre is exactly that.
  gunnerPivot: [0.546, 0.904],
  // The empty bow. Its own trim and its own pivot, both measured — the shadow is
  // at source (263.0, 303.8), half a pixel from the Default's, which is what
  // lets the two poses swap without the man stepping sideways.
  attack: { sprite: 'archer_t1_attack', trim: ARCHER_ATK_TRIM, pivot: [0.479, 0.898] },
  spriteFaces: -1,
  // Where the arrow leaves the bow, as an offset from the anchor above. The bow
  // is the arc in front of him and it bulges forward, so its grip — the point an
  // arrow rests on — is the arc's frontmost pixel at its vertical middle, taken
  // 5px inside the outline because the wood, not the black edge, is the face the
  // arrow lies against. The colour runs say the outline is x 195..199 and the
  // wood x 200..205 on all three tiers, so the grip is source (200, 254.5) —
  // 63.5 in front of the anchor and 50 above.
  //
  // MEASURED ON THE ATTACK POSE, which is the one drawing with nothing in front
  // of the bow to be mistaken for it. On the Default the nocked arrowhead
  // reaches 24px further forward and is the leftmost thing in the picture.
  //
  // Kept as fractions of the trim, not source pixels. Written as pixels it was
  // 14.2 and 22.6 against a 200px export, and a 512px re-export left those
  // numbers looking fine while silently moving the arrow's origin to a third of
  // the way up the archer's shin.
  muzzle: [Math.round(0.392 * ARCHER_TRIM[2] * SCALE), -Math.round(0.417 * ARCHER_TRIM[3] * SCALE)]
};

// Tier 2's archer: helmet instead of a hat, and a slightly different box. Every
// anchor here is a fraction of a trim, and this trim is not tier 1's, so the
// fractions differ even where the drawing does not.
//
// Nothing here is derived from tier 1 any more. Both are measured from their own
// shadow and their own bow, and they agree to within a pixel — which is the
// check that the measurement is real rather than a number carried across.
const archer2 = {
  ammo: arrow,
  gunner: 'archer_t2',
  gunnerTrim: ARCHER2_TRIM,
  // The centre of his ground shadow, source (263.5, 305.5) — a pixel below tier
  // 1's, in a box that starts a pixel higher.
  gunnerPivot: [0.546, 0.906],
  attack: { sprite: 'archer_t2_attack', trim: ARCHER2_ATK_TRIM, pivot: [0.479, 0.900] },
  spriteFaces: -1,
  // Same bow, same wooden face, grip at source (200, 256): 63.5 in front of the
  // anchor and 49.5 above. Different fractions from tier 1 because the box
  // differs, and they round to exactly tier 1's [13, -10] — two measurements
  // describing one bow.
  muzzle: [Math.round(0.392 * ARCHER2_TRIM[2] * SCALE), -Math.round(0.406 * ARCHER2_TRIM[3] * SCALE)]
};

// Tier 3's archer: plate armour, and a bow of steel rather than wood — the only
// thing that distinguishes his numbers from tier 2's is that nothing does. He
// is drawn in the same box, standing on the same shadow, holding the same bow
// in the same place, so all three fractions below are tier 2's exactly.
//
// That is a finding, not a shortcut: the previous export had him a box of his
// own and 8px higher in it, and carrying tier 2's numbers across would have been
// wrong then. They are re-measured every upload for that reason, and this time
// they came back equal.
const archer3 = {
  ammo: arrow,
  gunner: 'archer_t3',
  gunnerTrim: ARCHER3_TRIM,
  // The centre of his ground shadow, source (263.5, 305.5).
  gunnerPivot: [0.546, 0.906],
  attack: { sprite: 'archer_t3_attack', trim: ARCHER3_ATK_TRIM, pivot: [0.479, 0.900] },
  spriteFaces: -1,
  // The steel bow's face is grey where the other two are wood, and it is at the
  // same x: source (200, 256). The height rounds to 10 now — it was 11 on the
  // old drawing, where this archer carried the bow higher relative to his feet.
  muzzle: [Math.round(0.392 * ARCHER3_TRIM[2] * SCALE), -Math.round(0.406 * ARCHER3_TRIM[3] * SCALE)]
};

// THE MUSKETEER, and he is the only man on this ladder who does not draw a bow.
//
// Default is the musket LEVELLED, ready and unfired; Attack is the same figure
// with a puff of smoke at the muzzle. The right way round, and the same convention
// as the archer's two poses: the moment the ball becomes a projectile on the board
// is the moment the smoke appears, and it hangs there for as long as the recoil
// lasts.
const musketeer = {
  ammo: bullet,
  gunner: 'musketeer',
  gunnerTrim: MUSKET_TRIM,
  // THE CENTRE OF HIS GROUND SHADOW, source (292.0, 307.3), read out of the PNG by
  // tools/shadow.mjs like every other figure's anchor. Both poses measure to the
  // SAME source pixel — not within a pixel, exactly the same one — so the swap when
  // he fires cannot move him.
  //
  // Well right of centre in his box, and that is the musket: the barrel runs a
  // long way out in front of him and the box has to hold it, so his body — the
  // thing he mirrors about when he turns to shoot the other way — sits at 0.73 of
  // the width rather than near the middle.
  gunnerPivot: [0.737, 0.913],
  attack: { sprite: 'musketeer_attack', trim: MUSKET_ATK_TRIM, pivot: [0.748, 0.913] },
  spriteFaces: -1,
  // Where the ball leaves the barrel, as an offset from the anchor above.
  //
  // MEASURED ON THE ATTACK POSE, which is the drawing that says where the muzzle
  // is: the smoke starts at source x 178 and the barrel's black outline is at 182,
  // so the metal face is at 186 and the barrel's middle is y 242. That is 106px in
  // front of the anchor and 65 above it — the same "5px inside the outline, at the
  // weapon's vertical middle" rule the archer's bow grip is taken with.
  //
  // Kept as fractions of the DEFAULT trim, exactly as the archer's and the
  // priest's are, so a re-export at another size moves the origin with the art
  // rather than leaving it a third of the way down his boot.
  muzzle: [Math.round(0.697 * MUSKET_TRIM[2] * SCALE), -Math.round(0.527 * MUSKET_TRIM[3] * SCALE)]
};

// THE CROSSBOWMAN, the second man on this ladder who does not draw a bow, and the
// one the ladder now forks into if you do not want the musket.
//
// Default is the crossbow LOADED — the quarrel lies along the stock with its head
// out past the prod, which is what makes the Default box 13px wider on the left
// than the Attack one. Attack is the same figure with the bow EMPTY. Exactly the
// archer's convention and exactly the musketeer's: the pose changes at the moment
// the shot becomes a projectile on the board, and a man still holding a quarrel
// while one flew would be holding two.
const crossbowman = {
  ammo: quarrel,
  gunner: 'crossbowman',
  gunnerTrim: XBOW_TRIM,
  // THE CENTRE OF HIS GROUND SHADOW, source (275.0, 304.5), read out of the PNG
  // by tools/shadow.mjs like every other figure's anchor. The Attack pose
  // measures to (274.5, 305.0) — half a pixel away in each axis, well inside the
  // 6px the tool allows — so the swap when he looses cannot move him.
  gunnerPivot: [0.653, 0.911],
  attack: { sprite: 'crossbowman_attack', trim: XBOW_ATK_TRIM, pivot: [0.608, 0.915] },
  spriteFaces: -1,
  // Where the quarrel leaves the bow, as an offset from the anchor above.
  //
  // MEASURED ON THE ATTACK POSE for the same reason the musketeer's is: that is
  // the drawing that shows the weapon with nothing on it. Its leftmost opaque
  // column is source x 207 and the metal is 5px inside the black outline, so the
  // prod's face is x 212; the column there runs y 262..276, whose middle is 269.
  // That is 63px in front of the anchor and 35 above it.
  //
  // Kept as fractions of the DEFAULT trim, exactly as the archer's, the priest's
  // and the musketeer's are, so a re-export at another size moves the origin with
  // the art rather than leaving it somewhere in his boot.
  muzzle: [Math.round(0.508 * XBOW_TRIM[2] * SCALE), -Math.round(0.301 * XBOW_TRIM[3] * SCALE)]
};

// Range up across the board and cooldown down with it. The reach is what makes
// a tower feel useful in the first three waves, when there is only one or two of
// them on the map; the slower draw is what stops that reach turning archery into
// the only family worth building. Both were moved together and the pair was
// re-checked against tools/sim.mjs, not tuned one at a time.
//
// 150/170/190 -> 190/210/230 when reach became an ELLIPSE (see src/ground.js).
// This is not a buff. The number is now the reach ACROSS; the reach up and down
// is 62% of it, so a tier 1 tower covers 190 x 118 where it covered 150 x 150 —
// 8% MORE area, chosen to land the per-plot road coverage back on roughly what
// it was rather than to make archery stronger. It measured out at almost exactly
// even: the seven usable plots covered 93.5% of the road as circles at 150 and
// cover 95.7% as ellipses at 190.
//
// What did change is the SHAPE of what a plot is worth, and that is a real
// gameplay difference rather than a cosmetic one. A tower now reaches much
// further along a road running past it and much less far up a road running away
// from it, so a plot beside a straight is worth more than it was and a plot
// above a bend is worth less. Plot 0 went from being in none of the winning
// builds to being in three of the four.
// `unit` IS THE MAN, and it is a different question from `title`.
//
// A barracks has always had both: the building is a "Barracks Tier I" and the
// man it sends out is a "Spearman", and the two names sit in two places. The
// other two families only had the building's, so the info box — which shows the
// MAN — was captioning an archer "Archery Tier I" and a catapult crewman
// "Artillery Tier I". Now every tier names its occupant, the box reads the
// occupant's name for all three families, and `title` is left to do the one job
// it is good at: heading that tier's entry in the encyclopedia.
//
// The names carry the tier the way the barracks' always have — Novice, Combat,
// Elite; Catapult, Mangonel, Trebuchet — so nothing is lost by dropping the
// roman numeral from the box.
// WHAT A TOWER MAY BE TOLD TO SHOOT AT, in the order the button cycles them.
//
// Archery and the monastery carry `targeting`; the flag is on the tier rather
// than on the family, which is what let the second family opt in without this
// list moving or a line of it being written twice.
// A catapult deliberately does not have it: its whole character is that it
// commits a rock to a patch of ground a second before it lands, and a machine
// that could be re-pointed at whatever you liked would be an archery tower with
// a bigger number.
//
// The order is the argument. `exit` is what every tower did before this button
// existed and is what most towers should keep doing — it is the only mode that
// is directly about not losing lives. The other two are answers to a specific
// problem on the board: something too fat to kill in transit, or something
// standing off out of a soldier's reach. A player who never presses the button
// gets the game they had.
export const AIM_MODES = [
  { id: 'exit',   glyph: 'aim_exit',   label: 'Nearest the exit' },
  { id: 'tough',  glyph: 'aim_tough',  label: 'Most health' },
  { id: 'ranged', glyph: 'aim_ranged', label: 'Throwers first' }
];

// TIER 4 IS A FIRST GUESS, and it is written down as one. The artist asked for a
// tower that covers the whole map, hits hard and reloads slowly, at 200 gold, and
// said to sweep it later — so these four numbers are reasoned rather than
// measured, and `node tools/sweep.mjs` has not seen them.
//
// `range` 480, and the number is the board rather than a feel. "Covers the whole
// map" is a measurable claim: the board is 960x540 and reach is an ellipse at
// SQUASH 0.62, so 480 spans 960 across and 595 down — the full width and more than
// the full height, from a plot near the middle. 460 was the first guess and it came
// up 40px short across, which tools/families.mjs failed on. Nothing else comes
// near it: the longest reach in the game before this was a trebuchet's 360.
//
// `damage` 60, the biggest single blow in the game — ten clear of the Abbey's 50,
// which is what makes the ball worth waiting for. It was 50 for one build, level
// with the Abbey; the artist raised it, and the reload is what pays for it.
//
// `cooldown` 2.40, and it is the number holding the tower down. 60 every 2.4s is
// 25.0 damage a second, which is LESS than an Elite Archer's 31.3 and less than a
// Cardinal's 34.5 — this is deliberately not an upgrade in output. What it buys is
// UPTIME: a bow covers about a fifth of a map's road and spends the rest of the
// wave idle, and this covers all of it, so 25.0 a second everywhere can beat 31.3
// a second somewhere. That is the trade to check when the sweep runs, and the
// reload is the dial to turn if it wins too easily.
//
// `cost` 200, which is 500 gold of cumulative spend on one plot — more than any
// two other towers together. It also has to be worth pressing over a second bow
// somewhere else, which is the comparison the sweep will actually make.
//
// It keeps `targeting`, and it is the tier that most wants it: a tower that can
// see the whole board is a tower whose choice of target is the only thing left to
// decide, and 60 damage into an 80-health militiaman is most of a reload wasted.
export const archery = [
  { ...watchtower,  ...archer,  tier: 1, name: 'Watchtower',     title: 'Archery Tier I',   unit: 'Novice Archer', cost: 60,  damage: 8,  range: 190, cooldown: 1.00, colour: '#9C7248', targeting: true },
  { ...watchtower2, ...archer2, tier: 2, name: 'Archer Post',    title: 'Archery Tier II',  unit: 'Combat Archer', cost: 90,  damage: 14, range: 210, cooldown: 0.90, colour: '#7A5230', targeting: true },
  { ...watchtower3, ...archer3, tier: 3, name: 'Crossbow Tower', title: 'Archery Tier III', unit: 'Elite Archer',  cost: 140, damage: 26, range: 230, cooldown: 0.80, colour: '#B8B2A4', targeting: true },
  // `title` IS THE TOWER'S NAME ON THIS RUNG, not "Archery Tier IV", and it is the
  // first tier where those differ. The field heads the tier's entry in the
  // encyclopedia, and a tier 4 is a named building rather than a rung — the artist
  // asked for the card to read Musketeer Post, which is also what the upgrade
  // button's own icon says. Tiers 1 to 3 keep the plain form: they are the ladder,
  // and the column they sit in is what names the family.
  { ...post, ...musketeer, tier: 4, name: 'Musketeer Post', title: 'Musketeer Post', unit: 'Musketeer',
    cost: 200, damage: 65, range: 480, cooldown: 2.40, colour: '#A8A29A', targeting: true,
    // The upgrade button's picture when this is what the button buys. Every other
    // tier uses the generic arrow; this one has an icon of its own, so the tap
    // that turns a Crossbow Tower into a Musketeer Post shows what it is buying.
    // See towerItems in src/menu.js — a tier with no `glyph` still gets the arrow.
    glyph: 'musket',
    // WHOSE VOICE ANSWERS, and it is not the archers'. Two lines were recorded for
    // this tower specifically, so a Musketeer Post speaks for itself when it is
    // built and when its standing order changes. See familyCue in src/audio.js:
    // a tier with no `voice` falls through to its family's.
    voice: 'musketeer',
    // WHAT THIS POST CAN BE TAUGHT, once it is standing and there is nothing left
    // to upgrade it into. Ids into src/data/abilities.js, where the rules and the
    // numbers are — see the note at the top of that file for why a tier carries
    // only the list.
    abilities: ['burst', 'deadeye'] },
  // THE OTHER TIER 4, and the ladder's first fork. A Crossbow Tower can become
  // either of these two, which is why `tier` rather than array index is what
  // decides what follows what — see upgradesFrom below.
  //
  // THE TOWER IT IS: a steady bow with real reach, against the Musketeer Post's
  // one enormous shot from clear across the map. 30 a bolt every 0.80s is 37.5 a
  // second where the post is 27.1, and that is the trade — the post reaches 480
  // and this reaches 300.
  //
  // THE OWNER'S SECOND PASS, and it is a real trim. The first was 35 at 0.75 over
  // 330: 46.7 a second, behind only the High Altar's 51.7 and reaching half
  // the board while it did it. 37.5 still clears the Crossbow Tower under it
  // (32.5) and the two tier 4s that are not the Altar, without making the fork a
  // foregone conclusion — and it costs the same 200 as a Musketeer Post now, so
  // the two are a genuine choice at one price rather than a cheap one and a dear
  // one. Both paths up this ladder come to 490.
  //
  // The reload MATCHES the Crossbow Tower's 0.80 rather than beating it, so what
  // the upgrade buys is the blow and the reach. The two of them are still the
  // quickest things in the game.
  { ...sentry, ...crossbowman, tier: 4, name: 'Crossbow Sentry', title: 'Crossbow Sentry',
    unit: 'Crossbowman', cost: 200, damage: 30, range: 260, cooldown: 0.80,
    colour: '#A8A29A', targeting: true,
    // Its own picture on the upgrade button, like the Musketeer Post's — with two
    // of them on the ring, a generic arrow on both would be a coin toss.
    glyph: 'sentry',
    // Its own three lines, on the same terms as every other tier 4: it answers
    // when it is built and when its standing order changes rather than borrowing
    // an archer's. See familyCue in src/audio.js.
    voice: 'crossbowman',
    // A steel bow and a windlass. The first is deliberately the same ability the
    // Ballista Turret has, down to the name and the 1.5x — see the note on the
    // ids in data/abilities.js.
    abilities: ['sentry_tension', 'swift'] }
];

// WHAT A TOWER CAN BECOME NEXT, and the reason it is a function rather than an
// array index.
//
// `tiers[def.tier]` was the whole rule while every ladder was a straight line: an
// array of four, index 0 holding tier 1, so the thing after tier 3 is at index 3.
// Archery forks now — a Crossbow Tower buys either a Musketeer Post or a Crossbow
// Sentry — and an index cannot express two answers.
//
// So the question is asked of the TIER NUMBER instead, which is the thing that
// was really meant all along, and every straight ladder answers it with exactly
// one entry as before. The array's order stops carrying meaning it was never
// declared to carry.
//
// A FORK IS ONLY EVER AT THE TOP, and tools/families.mjs holds that: refundOf in
// menu.js prices a tier by summing the rungs below it, which needs one rung per
// tier down there. If a family is ever given a choice at tier 2, that sum is the
// thing that breaks first.
export const upgradesFrom = (fam, def) => fam.tiers.filter(d => d.tier === def.tier + 1);

// Barracks. These do not shoot — `range` is how far from the tower the rally
// point may sit, not a weapon range. The player moves that rally point, so the
// number is a real upgrade rather than bookkeeping.
//
// 130/165/200 -> 165/180/195: a much longer leash at tier 1 and a much smaller
// one per upgrade. Two things forced it, and they compound.
//
// The tier 2 barracks is the biggest building in the game and the plot markers
// were redrawn bigger to hold it, which slid every plot further from the road.
// Then reach became elliptical, and a barracks needs to reach the road, which is
// mostly the direction the ellipse is SHORT in. The minimum range that touches
// the road at all went from 51..142 across the nine plots to 82..151 — at the
// old 130, the tier 1 squad at plots 0 and 6 could barely leave the building,
// and at plot 2 it could not reach the road at all.
//
// 165 clears the worst usable plot (6, which needs 126) by 39. Taking the
// upgrade steps down from 35 to 15 is what keeps that from being a straight
// buff: tier 3's leash is 195 where it used to be 200, so the barracks now
// starts most of the way to its ceiling instead of climbing to it. A first
// barracks is immediately useful; upgrading one is about the men, not the map.
//
// None of this shows up in tools/sim.mjs, which never moves a rally point — the
// number is the size of a choice the player makes, and the sim does not make it.
//
// soldier.count stays at 3 across all tiers on purpose: how many enemies you can
// hold at once is the dominant balance lever, so upgrades make the same wall
// tougher rather than wider.
//
// soldier.damage went 4/5/6 -> 3/4/5 when the men learned to gang up on an enemy
// a squadmate is already blocking (see updateUnits). Three men hitting one enemy
// is three times the damage, and at the old numbers that alone took the best
// all-barracks build from losing on wave 3 to winning with 9 lives out of 20 —
// which breaks the one rule the level has. The assist is what was asked for and
// it stayed; its price was one point off each tier's damage.
//
// soldier.hp is 100/125/175. It went 105/145/195 -> 95/130/175 -> here, and the
// second move is the artist's own trim on the first: the spearman got 5 back and
// the pikeman lost 5 more. The measurements below are for the 95/130/175 pass and
// still describe the shape of the dial; the numbers themselves have moved a few
// points since.
//
// The first cut is the interesting one, and it was the fix for something this
// project had already measured and left standing. A blocker-held map gets easier the more
// blocker-seconds it has, and map 3 gained an eleventh plot: pure barracks was
// clearing it 11 times in 20, and map 2's was clearing 7. A tenth off puts both
// back where the rule says they belong.
//
// The whole table, twenty seeds, with `stuck` given thirteen times the clock so
// the slowest build in the game reaches a real verdict:
//
//                        map 1 mix   map 1 pure   map 2 mix   map 2 pure   map 3 mix   map 3 pure
//   105/145/195            19/20        0/20        13/20        7/20        11/20       11/20
//   95/130/175  <- this    15/20        0/20        12/20        1/20        10/20        4/20
//   90/125/168             16/20        0/20         8/20        0/20         1/20        0/20
//   84/116/156             13/20        0/20         7/20        0/20         3/20        0/20
//
// A TENTH IS THE WHOLE BAND. At a seventh off, map 3's best mixed build collapses
// from 10 wins in 20 to 1 — the men stop being able to hold two roads at all, and
// the map goes from hard to impossible in one step. Do not take more off this
// number without re-running that column; it is the steepest cliff in the game.
//
// AND THE ENEMIES' SWING IS THE OTHER HALF OF IT. These men were given back a few
// points in the same pass that took the thug's swing from 9 to 10 and the giant's
// from 18 to 30, and the second of those is far larger than anything on this line:
// 30 damage on a 1.2s clock kills a tier 1 spearman in four swings. A blocker's
// health and what hits it are one number in two files — see heavy_inf in
// data/waves.js — and neither can be read without the other.
const camp = {
  sprite: 'barracks_t1',
  spriteTrim: CAMP_TRIM,
  w: drawnW(CAMP_TRIM), h: drawnH(CAMP_TRIM),
  // Shadow centre, source (521.1, 605.4). This is the one that was visibly
  // wrong under the old bounding-box rule: the stakes planted in front of the
  // tent reach 68 source px below the shadow, and the box pinned THEM to the
  // ground, standing the whole tent 22px too high on its plot.
  groundFrac: [0.515, 0.678],
  // WHERE THE MUSTER RINGS SIT, as a fraction of the trim's height: the topmost
  // ink in the band the ring stack covers, over the column the building stands
  // on. Measured by `node tools/roof.mjs`.
  //
  // It is not the top of the box, and the tent is why: the pennant flies from a
  // pole standing to one side, so the box top is 20 game px above the tent's own
  // ridge and rings hung off it float in empty sky with the tent well below.
  // 0.177 is the canvas itself.
  roofFrac: 0.177,
  shape: 'camp'
};

// Tier 2's barracks: a log hut where tier 1 is a tent, and the biggest building
// in the game — 128x129 game px against the tent's 125x108 and the tier 2
// watchtower's 88x153. It is the reason the artist redrew the plot marker
// bigger, so re-check tools/hud-clear.mjs whenever either of them changes.
//
// Tier 3 borrows this rather than the tent, for the same reason tier 3 archery
// borrows the tier 2 tower: an upgrade must never look like less than the tier
// below it.
const camp2 = {
  sprite: 'barracks_t2',
  spriteTrim: CAMP2_TRIM,
  w: drawnW(CAMP2_TRIM), h: drawnH(CAMP2_TRIM),
  // Shadow centre, source (503.8, 696.8).
  groundFrac: [0.487, 0.793],
  // The roof ridge over the shadow's column — `node tools/roof.mjs`.
  roofFrac: 0.067,
  shape: 'camp'
};

// Tier 3's barracks: the tent and the log hut become a stone hall. 128x127
// against tier 2's 128x129 — the same building in stone, so the plot marker that
// was redrawn to hold tier 2 still holds this, and the HUD ceiling has not moved.
const camp3 = {
  sprite: 'barracks_t3',
  spriteTrim: CAMP3_TRIM,
  w: drawnW(CAMP3_TRIM), h: drawnH(CAMP3_TRIM),
  // Shadow centre, source (504.2, 701.8). PNG-only like the other two huts —
  // there is no SVG to check it against, and none is needed: nothing in a
  // barracks has to be drawn in front of anything, because it has no gunner.
  groundFrac: [0.487, 0.806],
  // The roof ridge over the shadow's column — `node tools/roof.mjs`.
  roofFrac: 0.069,
  shape: 'camp'
};

// The soldier's collision radius is DERIVED from the drawn art, not chosen, so
// the formation and tools/formation.mjs always agree with what you can see.
//
// bodyFrac is a fraction of the trim, and the trim changes with every re-export,
// so what is actually being held constant is the SOURCE WIDTH of the body: 59px
// on all three men, which is also exactly how wide the artist draws each one's
// ground shadow. Divide that by the new trim and the radius comes out at 6 for
// all three tiers — the same 6 they have always had, so the formation, the
// blocking and every balance number resting on them are untouched by the redraw.
// That is worth re-checking rather than assuming each time: the radius is
// derived from the drawing, so a redraw can move it without anyone deciding to.
const SPEAR_W = drawnW(SPEAR_TRIM);
const SPEAR_BODY = 0.351;   // 59 / 168

const spearman = {
  sprite: 'soldier_t1',
  spriteTrim: SPEAR_TRIM,
  // The centre of his ground shadow, source (293.0, 303.0) — the same convention
  // as the archer's gunnerPivot, so "where a figure is" means one thing.
  pivot: [0.720, 0.905],
  // Spear thrust forward. His shadow is at source (293.0, 303.0) in this drawing
  // too — not close, IDENTICAL, on all three soldiers — so the two poses swap
  // with the man's feet nailed to the spot and only the spear moving.
  attack: { sprite: 'soldier_t1_attack', trim: SPEAR_ATK_TRIM, pivot: [0.816, 0.905] },
  bodyFrac: SPEAR_BODY,
  spriteFaces: -1,
  // A spearman leaves a body too, then musters again from the barracks once his
  // respawn timer runs out. The body is scenery and nothing else — a dead
  // soldier stops blocking the instant he falls, so the enemy he was holding
  // walks straight over him.
  //
  // deadPivot is the centre of the corpse's OWN ground shadow, measured by
  // tools/shadow.mjs — not derived from the living figure any more; see the note
  // in data/waves.js for what that used to cost.
  dead: 'dead_soldier_t1',
  deadTrim: [135, 215, 241, 82],
  // The centre of the corpse's own shadow, source (163.5, 284.0).
  deadPivot: [0.118, 0.841],
  r: Math.round(SPEAR_W * SPEAR_BODY / 2),
  lunge: 6            // px thrust when the spear goes in
};

// Tier 2's pikeman: helmet instead of a hat, and a box of his own. Same body,
// different box, so every fraction below had to be re-derived even though
// nothing about the man changed.
//
// Tiers 2 and 3 no longer share a drawing — tier 3 has its own knight below.
const SPEAR2_W = drawnW(SPEAR2_TRIM);
const SPEAR2_BODY = 0.362;   // 59 / 163

const spearman2 = {
  sprite: 'soldier_t2',
  spriteTrim: SPEAR2_TRIM,
  // The centre of his ground shadow, source (301.0, 305.3).
  pivot: [0.779, 0.911],
  // Pike thrust. Same shadow, source (301.0, 305.3), to the pixel.
  attack: { sprite: 'soldier_t2_attack', trim: SPEAR2_ATK_TRIM, pivot: [0.807, 0.911] },
  bodyFrac: SPEAR2_BODY,
  spriteFaces: -1,
  dead: 'dead_soldier_t2',
  deadTrim: [138, 217, 237, 77],
  // The centre of this corpse's own shadow, source (166.5, 286.0).
  deadPivot: [0.120, 0.896],
  r: Math.round(SPEAR2_W * SPEAR2_BODY / 2),
  lunge: 6
};

// Tier 3's soldier: a knight in plate with a sword, and the narrowest box of the
// three because a sword held across the chest reaches nowhere near as far as a
// spear does. 110 wide against 168 and 163 — which is exactly why bodyFrac has
// to be re-measured rather than carried across. The same fraction on a box that
// lost a third of its width would make a wider man, not a narrower box.
//
// He is also the man the two poses differ most for: the sword goes from held
// across the chest to swung out in front, and the box grows from 110 to 145.
const SPEAR3_W = drawnW(SPEAR3_TRIM);
const SPEAR3_BODY = 0.536;   // 59 / 110

const spearman3 = {
  sprite: 'soldier_t3',
  spriteTrim: SPEAR3_TRIM,
  // The centre of his ground shadow, source (275.0, 305.3).
  pivot: [0.673, 0.911],
  // Sword swung. Same shadow, source (275.0, 305.3), to the pixel.
  attack: { sprite: 'soldier_t3_attack', trim: SPEAR3_ATK_TRIM, pivot: [0.752, 0.911] },
  bodyFrac: SPEAR3_BODY,
  spriteFaces: -1,
  dead: 'dead_soldier_t3',
  deadTrim: [159, 211, 193, 90],
  // The centre of this corpse's own shadow, source (187.5, 280.3).
  deadPivot: [0.148, 0.770],
  r: Math.round(SPEAR3_W * SPEAR3_BODY / 2),
  lunge: 6
};

// Tier 4's barracks: a square stone keep with a pitched roof and a banner. 107x133
// against tier 3's 128x127 — 21px NARROWER and 6 taller, and it is the first
// building on this ladder that grew upwards rather than outwards. That matters for
// one reason only: the plot marker was redrawn to hold a 128-wide hut, so a
// narrower building still sits inside it, and the HUD ceiling has not moved.
const camp4 = {
  sprite: 'barracks_t4',
  spriteTrim: CAMP4_TRIM,
  w: drawnW(CAMP4_TRIM), h: drawnH(CAMP4_TRIM),
  // Shadow centre, source (515.9, 722.2), by the ellipse fit in tools/shadow.mjs.
  // PNG-only like the other three, and for the same reason: nothing in a barracks
  // has to be drawn in front of anything, because it has no gunner standing on it.
  groundFrac: [0.508, 0.823],
  // The battlement over the shadow's column — `node tools/roof.mjs`. Near enough
  // to zero because a keep is the one barracks building with nothing sticking up
  // to one side: its box top IS its merlons.
  roofFrac: 0.002,
  shape: 'camp'
};

// Tier 4's soldier: a paladin in full plate with a longsword and a shield. The body is
// 59 source px wide, exactly as it is on the other three — the artist draws every
// man's ground shadow at that width — so the radius comes out at 6 again and the
// formation, the blocking and every number resting on them are untouched.
const PAL_W = drawnW(PAL_TRIM);
const PAL_BODY = 0.480;   // 59 / 123

const paladin = {
  sprite: 'paladin',
  spriteTrim: PAL_TRIM,
  // The centre of his ground shadow, source (277.0, 317.3).
  pivot: [0.683, 0.923],
  // Sword levelled. Same shadow, source (277.0, 317.0) — a third of a pixel from the
  // resting pose's, so the two swap with his feet nailed to the spot and only the
  // sword moving.
  attack: { sprite: 'paladin_attack', trim: PAL_ATK_TRIM, pivot: [0.798, 0.905] },
  bodyFrac: PAL_BODY,
  spriteFaces: -1,
  dead: 'dead_paladin',
  deadTrim: [153, 214, 206, 84],
  // The centre of this corpse's own shadow, source (186.0, 287.5).
  deadPivot: [0.160, 0.875],
  r: Math.round(PAL_W * PAL_BODY / 2),
  lunge: 6,
  // WHAT HIS BLOW SOUNDS LIKE, and he is the only man with an answer of his own.
  // The other three share the three generic `Attack_n` takes; a longsword swung by
  // a man in plate is a different noise, and it is what tells you which of your
  // squads is the one currently fighting. See blowCue in src/audio.js.
  blow: 'paladin'
};

// THE OTHER TIER 4 BUILDING, and it is camp4 with a different picture on it.
//
// Every number is shared rather than re-derived, because the two are the same
// drawing: same trim, same ground shadow to the pixel, same flat battlemented
// top. Spreading camp4 says that outright — if the artist ever redraws one of
// them differently, tools/shadow.mjs and tools/roof.mjs fail rather than the
// building quietly standing 4px off its plot.
const guild = { ...camp4, sprite: 'barracks_t4b' };

// THE ASSASSIN, and he is a different KIND of barracks man rather than a better
// one. Every rung below him trades health and damage upward together; he goes
// the other way on health and a long way up on damage.
//
// HIS SHADOW IS 59 SOURCE PX like every other man in the game — the artist draws
// them all at that width — so his collision radius comes out at 6 again and the
// formation, the blocking and everything resting on those are untouched. The
// fraction differs from the paladin's only because his standing box is narrower.
const ASS_W = drawnW(ASSASSIN_TRIM);
const ASS_BODY = 0.720;   // 59 / 82

const assassin = {
  sprite: 'assassin',
  spriteTrim: ASSASSIN_TRIM,
  // The centre of his ground shadow, source (259.0, 302.8).
  pivot: [0.537, 0.903],
  // Blade out. The SAME shadow pixel, exactly — not within a pixel, the same one
  // — so the lunge that nearly doubles his box cannot move his feet.
  attack: { sprite: 'assassin_attack', trim: ASSASSIN_ATK_TRIM, pivot: [0.563, 0.903] },
  bodyFrac: ASS_BODY,
  spriteFaces: -1,
  dead: 'dead_assassin',
  deadTrim: [164, 218, 185, 77],
  // The centre of this corpse's own shadow, source (197.0, 286.2).
  deadPivot: [0.178, 0.886],
  r: Math.round(ASS_W * ASS_BODY / 2),
  lunge: 6,
  // WHAT HIS BLOW SOUNDS LIKE, and it is also what his KILL is credited to:
  // units.js stamps `killedBy` with this word, and enemies.js reads it to pick
  // the cry. One field, both sounds — see blowCue and CUE in src/audio.js.
  blow: 'assassin',
  // AND HE IS NOT THERE UNTIL HE IS. The one field that makes this man a
  // different unit rather than a re-statted paladin — see hidden() in
  // src/units.js for what it costs an enemy to walk past him.
  hidden: true
};

export const barracks = [
  {
    ...camp, tier: 1, name: 'Militia Camp', title: 'Barracks Tier I', cost: 70, range: 165, colour: '#6E7A6A',
    soldier: { ...spearman,  name: 'Spearman',  count: 3, hp: 100, damage: 3, cd: 0.95, speed: 62, respawn: 8, regen: 4, colour: '#7C93B8' }
  },
  {
    ...camp2, tier: 2, name: 'Guard Post', title: 'Barracks Tier II', cost: 100, range: 180, colour: '#5E6B5C',
    soldier: { ...spearman2, name: 'Pikeman',   count: 3, hp: 125, damage: 4, cd: 0.90, speed: 66, respawn: 7, regen: 5, colour: '#6E86B4' }
  },
  {
    ...camp3, tier: 3, name: "Knight's Hall", title: 'Barracks Tier III', cost: 150, range: 195, colour: '#8A8478',
    soldier: { ...spearman3, name: 'Swordsman', count: 3, hp: 175, damage: 5, cd: 0.85, speed: 70, respawn: 6, regen: 6, colour: '#5C79AE' }
  },
  // TIER 4 IS A FIRST GUESS, exactly as the Musketeer Post's numbers are, and it is
  // written down as one: the artist asked for a blocker at 210 gold with 300 health
  // and 7 damage, and said to sweep it afterwards. `node tools/sweep.mjs` has not
  // seen it.
  //
  // The three numbers the artist did not give follow the ladder they are on, which
  // is the honest way to guess: `cd` 0.80 continues 0.95 / 0.90 / 0.85, `speed` 74
  // continues 62 / 66 / 70, `respawn` 5 continues 8 / 7 / 6, `regen` 7 continues
  // 4 / 5 / 6 and `range` 210 continues 165 / 180 / 195. Nothing here is a new idea;
  // it is the same tower one rung further up.
  //
  // WHAT THE TIER IS FOR, in the artist's words, is a blocker rather than an
  // attacker, and the numbers say it: 300 health each is a squad of 900, up 71% on
  // the knights' 525, while 7 damage at 0.80 is 26.3 a second against their 17.6 —
  // up 49%, which is the smaller of the two jumps. Per gold spent it is barely
  // ahead of tier 3 (1.70 squad health per gold against 1.64), and that is
  // deliberate: what 530 gold on one plot buys is a wall in ONE PLACE, and the
  // thing it cannot do is be somewhere else.
  //
  // The dial if it turns out too strong is `count`, not health. Three men is what
  // every rung of this ladder musters and what tools/formation.mjs and the muster
  // rings are drawn for; a squad of two 300s would be a different tower, not a
  // weaker one, so try the health and the respawn first.
  {
    ...camp4, tier: 4, name: 'Paladin Keep', title: 'Paladin Keep', cost: 210, range: 210, colour: '#9A9488',
    // The upgrade button's picture when this is what the button buys, on the same
    // one-word opt-in the Musketeer Post uses — see the note on its `glyph`.
    glyph: 'keep',
    // And its own voice, for the same reason: a tier 4 is a named building rather
    // than a rung, so it answers for itself when it is built and when it is given
    // a rally point instead of borrowing a barracks line.
    voice: 'paladin',
    // WHAT THIS KEEP CAN BE TAUGHT. Ids into src/data/abilities.js, which is where
    // the rules and the numbers live — a tier says which ones it offers and
    // nothing else, so an ability can be retuned without this file being touched.
    //
    // They are on the tier rather than on the soldier even though it is the men
    // who use them, and that is deliberate: gold buys a thing on a plot, and the
    // squad is replaced every time one of them falls. A paladin who died would
    // otherwise muster again having forgotten what you paid for.
    abilities: ['light', 'slash'],
    soldier: { ...paladin,   name: 'Paladin',   count: 3, hp: 275, damage: 7, cd: 0.80, speed: 74, respawn: 5, regen: 7, colour: '#4A6BA0' }
  },
  // THE OTHER FOURTH RUNG, and the barracks' first fork. A Knight's Hall buys
  // either of these two — see upgradesFrom in this file for why the choice is
  // asked by tier number rather than by array index.
  //
  // THE SAME 210 AS THE KEEP, deliberately. Both paths up this ladder come to
  // 530, so the fork is a question about what you want rather than what you can
  // afford — the same shape the archery fork has at 200 each.
  //
  // WHAT THE TRADE IS: 150 health against a paladin's 275, and 20 a blow against
  // his 7. A squad of three is 450 health where the Keep musters 825, and 75
  // damage a second where the Keep does 26. That is the biggest output any tower
  // in the game puts on the board and much the thinnest wall at tier 4 — a first
  // pass on the owner's own figures, meant to be played rather than defended.
  //
  // He is quicker than the paladin, which continues the ladder's own 62/66/70
  // and suits a man in cloth; his respawn and regen are the tier's, so what
  // marks him out is the health, the blow and the fact that nothing can see him.
  {
    ...guild, tier: 4, name: 'Assassin Guild', title: 'Assassin Guild', cost: 210, range: 210, colour: '#8A7B5E',
    // Its own picture on the upgrade button. With two of them on the ring neither
    // can wear the generic arrow — the same reason the archery pair name theirs.
    glyph: 'assassin',
    // And its own three lines, on the same terms as every other tier 4: it
    // answers when it is built and when it is given a rally point rather than
    // borrowing a barracks line. See familyCue in src/audio.js.
    voice: 'assassin',
    // ITS TWO, and they are the first abilities in the game that change what a
    // SOLDIER does rather than what a building does — a knife at 200px, and a
    // heavier blow on the strike that comes out of nowhere. Both are read in
    // src/units.js, which is where the men are, rather than in src/towers.js.
    abilities: ['knife', 'sneak'],
    soldier: { ...assassin, name: 'Assassin', count: 3, hp: 150, damage: 20, cd: 0.8, speed: 78, respawn: 5, regen: 7, colour: '#6B5B43' }
  }
];

// --- artillery ----------------------------------------------------------------
//
// The first building in the game that MOVES. Archery and barracks are one
// drawing each that sits there while a separate figure does the work; a catapult
// has no separate figure — its crewman is drawn into all three frames — so the
// machine itself has to animate or nothing about it moves at all.
//
// THREE BEATS A SHOT, and they are no longer the same length: the crew stands
// with the rock (Default, 0.75s), loads it (Reload, 0.75s), and the arm comes
// over (Fire, 1.5s). Indexed by beat, so `BEATS[2]` is how long the Fire pose
// holds.
//
// The Fire beat is double the other two ON PURPOSE, and it is the number the
// projectile depends on: a rock is a lob with a real flight time, and the arm
// has to stay up until it lands or the machine looks like it threw nothing. The
// longest throw in the game — tier 3's reach of 290 at 240px/s — is 1.21s, which
// leaves about a quarter second in hand. SHORTEN THIS AND ROCKS LAND AFTER THE
// ARM HAS COME BACK DOWN; tools/siege.mjs checks the margin.
//
// The two setup beats came down from a second each to keep the whole cycle at
// three seconds, so the cooldown did not move and the balance below still holds.
// The cooldown is derived from these rather than chosen beside them, which is
// the right way round: the reload you can see and the reload the rules use are
// the same clock, so the machine can never fire on a frame it is not drawn
// firing.
export const BEATS = [0.75, 0.75, 1.5];

// The dead zone every artillery tier carries. Exported because tools/siege.mjs
// measures the road each plot keeps outside it.
export const DEAD = 130;
const CYCLE = BEATS.reduce((a, b) => a + b, 0);

const catapult = {
  sprite: 'artillery_t1',
  // Beat order, and the index IS the beat. Default is first because it is also
  // the resting pose: a catapult with nothing to shoot at sits on frames[0].
  frames: ['artillery_t1', 'artillery_t1_reload', 'artillery_t1_fire'],
  spriteTrim: CATAPULT_TRIM,
  w: drawnW(CATAPULT_TRIM), h: drawnH(CATAPULT_TRIM),
  // Shadow centre, source (538.0, 593.1) in the 1024 canvas — measured by
  // tools/shadow.mjs off the Default frame, the same dark green every other
  // building stands on.
  //
  // Measured on all three frames and they agree: Default and Reload land on the
  // same tenth of a pixel and Fire is 2.1 source px higher, which is half a game
  // pixel and comes from the raised arm covering a different part of the ellipse.
  // The resting pose is the one that decides.
  groundFrac: [0.582, 0.766],
  // Where the rock leaves: the sling bucket at the top of the RAISED arm, source
  // (434.0, 363.5), which only exists in the Fire frame. It is the same dark
  // brown the crewman's shadow is painted in, so it is measured rather than
  // eyeballed — a single blob 47x36 px, and the only one that colour above the
  // deck line.
  //
  // `mountFrac` rather than a `muzzle` offset because there is no gunner to
  // measure from: on an archery tower the mount is where the man stands and the
  // muzzle is his bow, and here the machine IS the man. So the mount is the
  // release point and the muzzle offset is zero.
  mountFrac: [0.358, 0.103],
  muzzle: [0, 0],
  // WHICH WAY THE MACHINE IS DRAWN THROWING: up and to the RIGHT. So a target on
  // the right is the UNMIRRORED case and only a target on the left flips it.
  //
  // MEASURED, because it was got backwards once by looking at the wrong thing.
  // The arm's resting position is on the LEFT of the frame, which reads as "this
  // machine throws left" and is exactly wrong — where the arm sits says nothing,
  // where it SWINGS is the answer. The sling is the only blob of 54,36,7 above
  // the deck line in each frame, and between Default and Fire its centre goes
  // (373.5, 482.0) -> (434.0, 363.5): 60.5px to the RIGHT and 118.5px up. The arm
  // comes over toward the frame, and the rock leaves going that way.
  //
  // It is the one building in the game that mirrors, and the only one that
  // should — a catapult visibly POINTS, so a machine hurling away from the enemy
  // reads as broken in a way a symmetrical tent or tower never could. The cost is
  // real and was the reason it did not mirror at first: an isometric drawing
  // reversed is lit from the wrong side and its ground plane recedes the wrong
  // way. Pointing the right way wins that trade, and nothing else in the game
  // needs to make it.
  //
  // NOT `spriteFaces`, which is a different question with a different answer —
  // that one is which way a FIGURE standing on a deck is drawn, and every archery
  // tier carries it for its archer. A building that flips says so here.
  buildingFaces: 1,
  ammo: rock,
  // The face for the info box. Never drawn on the board.
  portrait: 'crew_t1',
  portraitTrim: CREW_TRIM,
  // The centre of his own ground shadow, measured by tools/shadow.mjs — the
  // same anchor every other figure in the game carries, and it is here for the
  // same reason theirs are: a figure stands on its shadow.
  //
  // He never stands on the BOARD, so this is not a placement number; it is what
  // the encyclopedia lines him up on. The book anchors every man on his shadow
  // rather than centring his bounding box, and without this he was the one
  // figure on the page floating by his box while the row beside him stood on a
  // line.
  portraitPivot: [0.628, 0.909],
  shape: 'siege'
};

// TIER 2, A MANGONEL, and tier 3 a TREBUCHET. Three drawings each, the same
// three-beat loop, and every rule above holds unchanged — which is the point of
// having written it down there: only the measurements below are new.
//
// THEY ALL THROW RIGHT, and that was checked rather than assumed, because the
// direction is invisible in a still and was got backwards once on tier 1. The
// test is where the PAYLOAD goes between the resting frame and the Fire frame:
//
//   Catapult   sling  (373.5, 482.0) -> (434.0, 363.5)    +60.5 px
//   Mangonel   cup    (395,   365)   -> (474.5, 258.4)    +79.5 px
//   Trebuchet  pouch  (240,   480)   -> (600.9, 136.9)   +360.9 px
//
// All three positive, so all three keep `buildingFaces: 1` and mirror only for a
// target on the LEFT. The trebuchet's swing is enormous by comparison — its
// sling whips past the frame and out the other side — which is exactly why its
// union trim is 626 source px tall against the catapult's 346.
const mangonel = {
  ...catapult,
  sprite: 'artillery_t2',
  frames: ['artillery_t2', 'artillery_t2_reload', 'artillery_t2_fire'],
  spriteTrim: MANGONEL_TRIM,
  w: drawnW(MANGONEL_TRIM), h: drawnH(MANGONEL_TRIM),
  // Shadow centre, source (560.9, 598.6). All three frames measure to the same
  // tenth of a pixel — the raised arm never crosses this machine's shadow, where
  // tier 1's covers a sliver of it and comes out 2px high on the Fire frame.
  groundFrac: [0.598, 0.820],
  // The cup at the top of the raised arm, source (474.5, 258.4) — the centroid
  // of the ink in the top 12% of the Fire frame, which at this tier is the cup
  // and nothing else.
  mountFrac: [0.425, 0.067],
  ammo: rock2,
  portrait: 'crew_t2',
  portraitTrim: CREW2_TRIM,
  portraitPivot: [0.635, 0.904]
};

const trebuchet = {
  ...catapult,
  sprite: 'artillery_t3',
  frames: ['artillery_t3', 'artillery_t3_reload', 'artillery_t3_fire'],
  spriteTrim: TREBUCHET_TRIM,
  w: drawnW(TREBUCHET_TRIM), h: drawnH(TREBUCHET_TRIM),
  // Shadow centre, source (563.9, 652.4).
  groundFrac: [0.607, 0.871],
  // The sling POUCH at release, source (600.9, 136.9). The top band of this
  // frame contains the arm tip on the left AND the pouch on the right — a sling
  // reaches both ways at the top of a swing — so the measurement is taken from
  // the right-hand blob only. A centroid of the whole band lands between the
  // two, on empty air.
  mountFrac: [0.663, 0.048],
  ammo: rock3,
  portrait: 'crew_t3',
  portraitTrim: CREW3_TRIM,
  // Further right and lower in his box than the two below him, and that is the
  // drawing rather than a bad reading: this engineer stands beside a boulder
  // that fills the left of his frame, so his own feet are well right of the box
  // centre. Measured like every other figure's, off his shadow.
  portraitPivot: [0.723, 0.944]
};

// TIER 4, THE BALLISTA TURRET, and it is put together differently from every
// other building in the game: a stone turret that never moves, with a machine
// standing on top of it that animates and TURNS.
//
// WHY IT IS TWO PIECES. Tiers 1 to 3 are one drawing per beat and the whole
// picture mirrors when the crew swing the machine round — which is fine for a
// catapult standing in a field and impossible for one standing on a turret,
// because a mirrored turret is lit from the wrong side and its stonework recedes
// the wrong way. So the stone is drawn once and left alone, and only the machine
// on the deck is flipped. `machine` below is that second piece; `mountFrac` is
// where it stands on the roof.
//
// WHERE IT STANDS, AND WHAT IT MIRRORS ABOUT, and the two questions turned out
// to be one. The ballista is drawn with its post near the left end of its box
// and its engineer 175 source px to the right of it, so flipping the drawing
// ABOUT THE POST swings the whole machine that far across the roof: whichever
// way it turned it sat too far to one side, which is what the owner saw and
// sent back.
//
// It mirrors about the MIDDLE of its own drawing instead. The footprint is then
// the same both ways — the post and the engineer swap ends of it — so "where
// does the machine stand" becomes "where does that footprint sit", and the
// answer is: over the middle of the deck.
//
// The deck's top face is one #969696 path in the artist's SVG with corners
// (449.8, 242.5), (766.7, 291.2), (595.7, 439.6) and (257.4, 364.7). With the
// box centred on it, source (440, 379) is where all FOUR ground points — the
// post and the engineer, each in both directions — sit furthest inside that
// quad: between 24.7 and 44.9 source px of clearance, against the 16.2 that the
// best post-mirrored placement could manage.
//
// THE NEAR MERLON GOES IN FRONT, for the same reason the Musketeer Post's does:
// the battlement block at the deck's nearest corner stands between the machine
// and the camera, so the machine's foot and the bottom of its arc pass BEHIND
// it. A rect around that block would take a wedge of deck with it, so it is a
// polygon traced from the three faces the SVG stores it as — top (579, 375.4),
// (619.8, 382.6), (595.7, 400.3), (556.7, 392.8) and the two side faces hanging
// to (619.8, 418.7), (595.7, 439.6) and (557.5, 431.1) — padded 2px for the
// black stroke the PNG draws and the SVG does not.
const ballista = {
  sprite: 'artillery_t4_base',
  spriteTrim: BALLISTA_TOWER_TRIM,
  w: drawnW(BALLISTA_TOWER_TRIM), h: drawnH(BALLISTA_TOWER_TRIM),
  // The shadow ellipse under the turret, source (518.7, 739.5). The SVG stores
  // it as a single #37422f path — an ellipse centred (518.7, 739.5) with radii
  // 177 x 78.6 — and the PNG's visible arc fits the same centre. Its TOP is
  // hidden behind the tower, which is exactly the case a bounding box gets
  // wrong: the visible blob's middle is 18px low.
  groundFrac: [0.512, 0.867],
  frontPolys: [
    [[577, 373], [622, 381], [622, 420], [596, 442], [555, 433], [554, 391]]
  ],
  // THE DECK'S TOP FACE, as fractions of this trim, and it is the quad the note
  // above quotes: one #969696 path with corners (449.8, 242.5), (766.7, 291.2),
  // (595.7, 439.6) and (257.4, 364.7).
  //
  // Data rather than prose for the same reason `feet` is. A machine standing on a
  // roof has exactly one thing that can go wrong and it is invisible in this file:
  // some part of it ends up over the edge, in one of the two directions, and
  // nothing says so until somebody looks at the screen. That is precisely how the
  // Cannon Outpost shipped with its muzzle 24px past the far parapet.
  //
  // tools/siege.mjs walks every foot and the muzzle, both ways round, against
  // this.
  deck: [[0.380, 0.064], [0.994, 0.143], [0.662, 0.383], [0.007, 0.262]],
  // THE MACHINE ON TOP. Its own trim, its own drawn size, and its own ground
  // point — the centre of the little shadow under the ballista's post, source
  // (452.5, 609) inside a trim that starts at (361, 398) and runs 340 x 228.
  // All three frames put that shadow on the same pixel, which is what lets the
  // machine animate without walking about on the roof.
  //
  // `faces: -1` because it is drawn shooting up and to the LEFT: the loaded bolt
  // in the Default frame has its head at source (490, 445), pointing away up the
  // rail. So a target on the left is the unmirrored case, which is the opposite
  // of the catapults below — they throw right.
  machine: {
    frames: ['artillery_t4', 'artillery_t4_reload', 'artillery_t4_fire'],
    trim: BALLISTA_TRIM,
    w: drawnW(BALLISTA_TRIM), h: drawnH(BALLISTA_TRIM),
    pivot: [0.269, 0.920],
    faces: -1,
    // WHERE THE BOLT LEAVES, as a fraction of the machine's own trim: the TIP OF
    // THE BOW, which is the point the owner drew an arrow from. It is a point of
    // the DRAWING, so it mirrors with the drawing and cannot end up on the wrong
    // end of it.
    //
    // Source (412, 566) — THE MOUTH: the point where the rail crosses the bow,
    // at the arc's lower edge, which is the spot the owner drew every bolt
    // leaving from. It is where the BACK of the bolt sits at the moment of
    // firing; the drawing runs forward from there along whatever line the shot
    // is taking, which is what `clear` on the ammunition is for.
    //
    // Three earlier versions were wrong and all in the same direction: an offset
    // from the post to the LOADED BOLT (drawn well behind the bow, so the shot
    // came out of the back), a point just above the arc (over the top of it),
    // and the arc's outer tip (past the mouth, and still with the shaft lying
    // back across the machine).
    nose: [0.150, 0.737],
    // WHAT TOUCHES THE DECK, as fractions of the same trim: the post's shadow at
    // source (452.5, 607.8) and the engineer's at (628.0, 521.3), each the centre
    // of a fitted ellipse rather than of the visible blob — the machine stands on
    // both of them, so both are half occluded and both centroids read low.
    //
    // THE FIRST ONE IS `pivot`, to the digit, and it has to be: the point the
    // machine is placed by is one of the points it stands on. Repeated here rather
    // than referenced so the pair reads as a pair, and tools/siege.mjs checks the
    // two agree so a re-measured pivot cannot leave a stale foot behind it.
    //
    // Data rather than a sentence, because `mirror` below is DERIVED from these
    // and a derivation written in prose cannot be checked. tools/siege.mjs
    // measures how far the pair walks when the drawing flips.
    feet: [[0.269, 0.920], [0.785, 0.541]],
    // The line the drawing flips about, as a fraction of the same trim — see
    // `axis` in src/towers.js.
    //
    // THE MIDDLE OF THE DRAWING, and it is very nearly the middle of the FEET,
    // which is the rule it was standing in for: the two feet sit at 0.269 and
    // 0.785, so their midpoint is 0.527 against this 0.5. Flipping walks the pair
    // 3.8 drawn px across the roof, which is nothing, and the number is left where
    // the owner approved it. The Cannon Outpost is where the two rules come apart
    // — see the note above `cannon`.
    mirror: 0.5
  },
  mountFrac: [0.360, 0.285],
  ammo: bolt,
  // A FASTER CYCLE THAN THE CATAPULTS, and it is the tier's whole character
  // beside the damage. 0.45 / 0.45 / 0.9 against 0.75 / 0.75 / 1.5 — the same
  // shape at 60% of the length, so the machine reads as the same three beats
  // played quicker rather than as a different animation.
  //
  // The Fire beat still has to outlast the shot: 0.9s of pose against a longest
  // flight of 260 / 520 = 0.50s. tools/siege.mjs checks that margin for every
  // tier and this one has the most of any of them.
  beats: [0.45, 0.45, 0.9],
  portrait: 'crew_t4',
  portraitTrim: CREW4_TRIM,
  // The centre of his own ground shadow, source (293.7, 308.5), measured by
  // tools/shadow.mjs like every other figure's. He is well right of his box's
  // middle because the spare bolt he is holding runs out to the left of him.
  portraitPivot: [0.671, 0.912],
  shape: 'siege'
};

// THE LADDER'S SECOND TIER 4, THE CANNON OUTPOST, and it is put together exactly
// the way the Ballista Turret is: the same stone turret, standing still, with a
// different machine on top that animates and turns. Every rule in the long note
// above holds here unchanged — which is the point of having written it there.
//
// THE SAME STONE, LITERALLY. The two turret PNGs differ in 23,960 pixels inside
// one 134x241 box and every one of them is the banner: the ballista's blue,
// recoloured purple, with a cannon on it where the bolt was. So `groundFrac` and
// `frontPolys` are the ballista's constants rather than the ballista's numbers
// re-typed — if the artist ever moves that shadow, one edit moves both towers and
// tools/shadow.mjs measures both files either way.
//
// WHERE IT STANDS, AND WHAT IT MIRRORS ABOUT, and the cannon answers the second
// question DIFFERENTLY from the ballista — which is the one place this tier is
// not a copy.
//
// The ballista mirrors about the middle of its own drawing, because its two feet
// straddle that middle: the post's shadow is at source 452.5 and the engineer's
// at 627.7, so their midpoint is 540.9 against a box middle of 531. Ten pixels
// apart, and "the middle of the drawing" was near enough.
//
// The cannon's feet are nowhere near its box middle. Its carriage stands at 513
// and its gunner at 629 — midpoint 571 — while the box middle is 510, because the
// BARREL runs 170px off to the left of everything that touches the deck. Mirrored
// about 510 the whole footprint swings 122 source px across the roof, which is
// precisely the failure the ballista's own note describes and the owner sent back
// once already.
//
// So the rule is the one the ballista's note MEANT rather than the number it
// used: the machine mirrors about the midpoint of the points that touch the
// ground. Then the carriage and the gunner simply swap ends of one footprint and
// the machine stands in the same place both ways.
//
// The two are measured rather than argued: at the mount below, all four ground
// points — carriage and gunner, each in both directions — sit 66.5 source px
// inside the deck quad. Mirroring about the box middle instead gives 52.0, and
// the two positions no longer coincide.
//
// The deck quad is the ballista's, being the same deck: one #969696 path with
// corners (449.8, 242.5), (766.7, 291.2), (595.7, 439.6) and (257.4, 364.7).
const cannon = {
  sprite: 'artillery_t4b_base',
  spriteTrim: CANNON_TOWER_TRIM,
  w: drawnW(CANNON_TOWER_TRIM), h: drawnH(CANNON_TOWER_TRIM),
  // The ballista's, and the same ellipse in the same file: source (518.7, 739.5),
  // stored in the SVG as a #37422f path with radii 177 x 78.6.
  groundFrac: ballista.groundFrac,
  // The near merlon, likewise — the same battlement block on the same deck, so
  // this machine's foot and the bottom of its barrel pass behind it exactly as the
  // ballista's do.
  frontPolys: ballista.frontPolys,
  // And the deck itself, for the same reason and by the same constant: it is one
  // stone turret drawn twice with a different banner on it.
  deck: ballista.deck,
  machine: {
    frames: ['artillery_t4b', 'artillery_t4b_reload', 'artillery_t4b_fire'],
    trim: CANNON_TRIM,
    w: drawnW(CANNON_TRIM), h: drawnH(CANNON_TRIM),
    // The centre of the shadow under the CARRIAGE, source (513.0, 569.3), and it
    // is a fitted ellipse rather than the blob's centroid: the carriage sits on
    // the middle of its own shadow, so what is visible is a crescent whose
    // centroid is 4px low and 9px left. The ellipse spans x 436..590 and its
    // per-column mid-height reads 569.5 at every unoccluded column, which is what
    // says the fit is the drawing's own centre rather than a guess at it.
    //
    // All three frames put it on the same pixel, so the machine animates without
    // walking about on the roof.
    pivot: [0.509, 0.853],
    // Drawn shooting up and to the LEFT, like the ballista: the muzzle is at the
    // left end of the barrel and the gunner stands behind it on the right. So a
    // target on the left is the unmirrored case.
    faces: -1,
    // THE MOUTH OF THE BARREL, source (355.0, 552.5) — the centre of the bore,
    // which is the dark ellipse at the tip and the point the artist drew the smoke
    // curling out of in the Fire frame. A ball is round and has no length, so
    // there is no `clear` here: the bolt above needs one because it is 42 drawn px
    // of shaft that would otherwise lie back across the machine, and this is a
    // 10px circle that sits in the mouth it came out of.
    nose: [0.047, 0.750],
    // WHAT TOUCHES THE DECK: the carriage's shadow at source (513.0, 569.3) and
    // the gunner's at (629.0, 555.4), both fitted ellipses for the reason the
    // ballista's are — each is half hidden under the thing standing on it, and
    // the carriage's visible crescent has a centroid 4px low and 9px left of the
    // ellipse it belongs to. The first is `pivot` above, to the digit.
    feet: [[0.509, 0.853], [0.848, 0.768]],
    // The line the drawing flips about, and it is THE GUN'S OWN FOOT — the same
    // 0.509 as `pivot` above, so the carriage does not move at all when the
    // machine turns and the gunner swaps sides around it.
    //
    // TWO PRINCIPLED ANSWERS, AND THIS TOWER TAKES THE OTHER ONE. The ballista
    // flips about the MIDPOINT of its feet: its footprint is identical both ways,
    // its post and its engineer trade ends, and neither is more the machine than
    // the other. That was the rule this tier shipped with too, at 0.678, and the
    // owner sent it back — because a cannon is not a symmetrical pair. The
    // carriage IS the weapon and the gunner is standing next to it, so what the
    // player watches turn is the gun, and a gun that slides 116px sideways every
    // time it changes target reads as the tower shuffling about.
    //
    // What it cost, measured against the deck quad: facing left the muzzle sat
    // 8.2px inside the parapet and the drawing's own edge 1.8px — "too near one
    // of the blocks" — and facing right the muzzle was 24.4px OUTSIDE it
    // entirely. Pinned to the carriage at the deck's middle, the two come out
    // 15.0 and 39.8px inside, and the carriage is dead centre both ways.
    //
    // So `mirror` is per-machine and not a constant: pin the pair when the two
    // feet are equals, pin the weapon when one of them is the point. tools/
    // siege.mjs names which of the two each machine chose, and checks that every
    // foot and the muzzle stay on the deck either way — which is the thing that
    // actually has to be true.
    mirror: 0.509
  },
  // THE MIDDLE OF THE PLATFORM, source (517.4, 334.5) — the centroid of the deck
  // quad's four corners, and the owner's own words for where the cannon's shadow
  // should sit. With `mirror` pinned to the carriage above, that is where it sits
  // in BOTH directions rather than on average.
  //
  // Not the diagonals' crossing, which is the other honest reading of "the middle"
  // of a quad drawn in perspective: it lands 7px lower and left, and that is
  // enough to bring the left-facing muzzle from 15.0px inside the parapet to 7.0,
  // with the drawing's own edge at 0.6. Same idea, no margin.
  //
  // It replaces (485, 347), which was solved for something else — the mount that
  // put the worst of FOUR ground points furthest inside the quad, back when the
  // machine flipped about the pair and the carriage therefore had two homes.
  mountFrac: [0.511, 0.213],
  ammo: cannonball,
  // THE CATAPULTS' CYCLE, NOT THE BALLISTA'S, and it is the owner's ask: this
  // tower reloads as slowly as the trebuchet it upgrades from. 0.75 / 0.75 / 1.5,
  // the family's own beats, where the ballista plays the same shape at 60% length.
  //
  // Which means `cooldown` comes out at the family's 3.00 rather than 1.80 — and
  // it is derived from these rather than chosen beside them, as it is for every
  // artillery tier, so the machine can never fire on a frame it is not drawn
  // firing.
  //
  // The Fire beat outlasts the shot with room to spare: 1.5s of pose against a
  // longest flight of 360 / 420 = 0.86s. tools/siege.mjs checks that margin for
  // every tier.
  //
  // WRITTEN OUT THOUGH `beatsOf` WOULD FALL BACK TO IT ANYWAY. It is the same
  // array, not a copy, so it cannot drift — and being explicit is worth a line
  // here for one reason: the tier directly above this one overrides it. A reader
  // comparing the two fourth rungs should see the answer beside the question
  // rather than have to know which way the default falls.
  beats: BEATS,
  portrait: 'cannoneer',
  portraitTrim: CREW4B_TRIM,
  // The centre of his own ground shadow, source (254.0, 312.5), measured by
  // tools/shadow.mjs like every other figure's. All but dead centre of his box,
  // where the ballista engineer beside him is well right of his: this man stands
  // behind his ball and that one is holding a bolt out to one side.
  portraitPivot: [0.480, 0.922],
  shape: 'siege'
};

// THREE TIERS, ALL DRAWN WITH TIER 1'S MACHINE. That is temporary and the code
// knows it: render.js marks a tower with stars whenever more than one tier in
// its family shares a sprite key, so the stars appear here and nowhere else, and
// they will disappear on their own the day tiers 2 and 3 get their own frames.
// Nothing has to be remembered or removed.
//
// The numbers, and why they are these:
//
// `cooldown` is not a choice — it is the three animation beats added up. Every
// other number here is chosen around that three-second cycle.
//
// `splash` is what makes this a tower rather than a slow archer, and without it
// the damage question has no good answer. At the same DPS as archery a
// three-second single-target machine is strictly worse than a one-second one:
// same damage over time, three times the lag, and overkill on every 80hp thug.
// Pushing single-target damage up until it competes just makes a sniper that
// one-shots militia, which is a worse game. Area damage is what a catapult is
// FOR, and it gives the family its own job: archery kills one thing reliably,
// barracks stops things moving, artillery punishes a crowd.
//
// SET `splash: 0` TO GET A PURE SINGLE-TARGET CATAPULT. Nothing else has to
// change; projectiles.js falls back to hitting only what it hit.
//
// `range` IS THE LONGEST IN THE GAME AT EVERY TIER by a distance — 300/330/360
// against archery's 190/210/230 — which is the point of the family. A catapult
// sits at the back and reaches. Remember the reach is an ellipse: 300 across is
// only 186 up and down.
//
// AND IT HAS A HOLE IN IT. `minRange` is a dead zone: anything within 130 of the
// machine is too close to drop a rock on and walks past untouched. That is the
// price of the reach, and it is what stops artillery being archery-but-better —
// the two families now want different PLOTS rather than the same plot at
// different prices. A bow wants to be beside the road; a machine wants to be
// back from it, with the road it defends out in the annulus.
//
// 130 is measured rather than picked. Sampled along every lane of every route on
// both maps, it costs each plot between 0 and 15% of the road it could otherwise
// reach, and takes no plot below what it covered before the range went up. At 90
// it costs 0-3%, which is not a mechanic, it is a rounding error; at 130 the
// dead ground beside a machine is something you can see and have to plan around.
// tools/siege.mjs prints the per-plot table and fails if any plot is smothered.
//
// THE SAME 130 AT EVERY TIER, deliberately. A bigger engine really would have a
// longer minimum, and modelling that would make an upgrade take something away —
// the annulus would shift outward and a Trebuchet would stop covering road its
// Catapult did. An upgrade should cost gold and nothing else.
//
// AN UPGRADE BUYS BLAST, NOT RATE. The cycle stays at three seconds through all
// three tiers, because it is an animation and the artist has drawn one. So what
// a tier buys is a bigger rock in a wider patch over more ground — damage
// 19 -> 27 -> 37 and splash 75 -> 86 -> 98 — which is also what a bigger engine
// looks like. Compare archery, where the upgrade is mostly a faster draw.
//
// DAMAGE HAS COME DOWN FOUR TIMES, 40 -> 30 -> 26 -> 22 -> 19, and the first two
// cuts paid for reach. It is the same trade each time and it is worth stating
// plainly: ground covered is worth more than damage per rock, because a tower
// that watches more road gets more rocks off per wave whatever each one does.
//
// THE THIRD CUT IS DIFFERENT — it bought nothing, it was a straight nerf, asked
// for from play. The measurement agrees with the feel: at 26/38/52 an
// artillery-heavy build (three catapults, three barracks) cleared map 1 12 times
// out of 12 with a median of 10 lives, which is BETTER than the same build in
// archery — 9 of 12 and 10 lives. A third family that is more reliable than the
// family the level was tuned around is a third family that has taken the level
// over.
//
// x0.85, measured over 12 seeds on both maps rather than 5, because the numbers
// this had to separate were a life or two apart and 5 seeds could not see them:
//
//                      map 1                map 2
//   3 siege + 3 barracks     x1.00  12/12  10     9/12   5
//                            x0.85  12/12   8     6/12   2   <- here
//                            x0.75  11/12   7     6/12   2
//                            x0.65   9/12   3     0/12  -1
//
// x0.85 takes the edge off stacking artillery — it is a live build on map 1 and a
// risky one on map 2, where before it was safe on both — while a build with ONE
// catapult in it is untouched at 12/12 and 10 lives. That is the shape to want:
// a catapult is still worth taking, and three of them are no longer a plan that
// plays itself. x0.65 goes too far and kills the heavy build on map 2 outright.
//
// THE FOURTH CUT, x0.85 again on top of that, and asked for from play the same
// way. 22/32/44 -> 19/27/37. The band it lands in is narrow at the bottom and
// the floor is on map 2, so the numbers are worth keeping:
//
//   3 siege + 3 barracks    map 1            map 2
//                   x1.00   12/12  10 lives   9/12   5
//                   x0.92    9/12   5         8/12   5
//                   x0.85    7/12   1         9/12   2   <- here
//                   x0.78   10/12   3         2/12   0   <- map 2 falls away
//                   x0.70    8/12   2         0/12  -1
//
// x0.78 is the cliff and it is a cliff on ONE map only, which is the thing to
// notice: map 1's siege-heavy build wanders between 7 and 12 wins across the
// whole range because it is noise-dominated, while map 2's drops off a shelf
// between 0.85 and 0.78 and never comes back. Anything below 0.85 is not a
// nerf to artillery, it is the removal of artillery from map 2.
//
// The build that matters is untouched: ONE catapult in a mix still clears both
// maps 12/12 and 11/12 with 8 to 11 lives. Stacking three of them is now a
// gamble on either map rather than a plan that plays itself, which is the shape
// to want from a third family.
//
// Both loss rules stay 0/12 at every value tried, as they have through every
// pass: the level's rule is held by the blocking mechanic, not by this number.
//
// The sum, honestly, WITH the hole subtracted: the original reach was a disc of
// 210, about 85,900 square px at SQUASH. The annulus from 130 to 300 is 142,400
// — 1.66x the ground, not the 2.04x the outer radius alone would suggest. The
// splash went up 36% on top of that.
//
// `cost` 90/115/170 against archery's 70/90/140. The opening is the tightest
// part of the curve (220 gold, no bounties yet) and at 70 a catapult would
// compete with the first archery tower on price alone while being much worse at
// holding wave 1.
//
// THE SWEEP, over damage x splash as multiples of the numbers below, all three
// tiers scaled together, map 1, five seeds a cell:
//
//   - `splash: 0` IS A CLIFF, and it is the measurement the family rests on.
//     A three-siege mix loses with no splash at every damage tried short of
//     absurd. Area damage is the family, not the flavour.
//   - THE LOSS RULES CAN BE BROKEN by big enough numbers — five catapults behind
//     one blocker start winning somewhere above x1.5 — and that headroom shrank
//     when the reach went up. It was unbounded at the original 210. Nothing is
//     near it, but RE-RUN `node tools/sim.mjs` AFTER ANY CHANGE HERE rather than
//     trusting a band.
//
// Where it lands, five seeds a row: a catapult is a real alternative to the
// archery tower it competes with for a plot on both maps, and a strict upgrade
// on neither. `node tools/sim.mjs` prints the rows.
// `unit` is the crewman, named for the machine he works — see the note above
// `archery` for why the man's name and the tier's title are two fields. There is
// one of him rather than a squad, which is what the book prints: a barracks
// entry reads "3 x Spearman" and this one reads "1 x Catapult Engineer".
export const siege = [
  { ...catapult,  tier: 1, name: 'Catapult',  title: 'Artillery Tier I',   unit: 'Catapult Engineer',
    cost: 90,  damage: 18, splash: 75, range: 300, minRange: DEAD, cooldown: CYCLE, colour: '#7A6A4A' },
  { ...mangonel,  tier: 2, name: 'Mangonel',  title: 'Artillery Tier II',  unit: 'Mangonel Engineer',
    cost: 120, damage: 24, splash: 86, range: 330, minRange: DEAD, cooldown: CYCLE, colour: '#6E6042' },
  { ...trebuchet, tier: 3, name: 'Trebuchet', title: 'Artillery Tier III', unit: 'Trebuchet Engineer',
    cost: 170, damage: 36, splash: 98, range: 360, minRange: DEAD, cooldown: CYCLE, colour: '#8A7A56' },
  // TIER 4, and it is the opposite tower to the three below it in every way that
  // matters. They are siege engines that lob: enormous reach, a hole in the
  // middle they cannot defend, a wide splash and a slow, heavy rhythm. This one
  // is a wall-mounted crossbow.
  //
  // `range` 260, the SHORTEST in the family and 100 less than the trebuchet it
  // upgrades from. That is the price of everything else here, and it is a real
  // one: a trebuchet covers most of a map and this covers a corner of it.
  //
  // `minRange` 0, and it is the first artillery tower with no dead zone. A bolt
  // is aimed rather than thrown, so there is no arc to clear and nothing to
  // explain — the 130px hole every other machine carries around itself is gone,
  // which makes tier 4 the one artillery tower that can defend its own plot.
  //
  // `damage` 55 a bolt — it shipped at 60 and the owner cut it — which leaves it
  // just under the Musketeer Post's ball and the Cannon Outpost's shot, and
  // `splash` 70, a shade over two thirds of the trebuchet's 98. It catches a
  // queue; it does not clear a wave.
  //
  // IT WAS 55 AND WENT UP ON A PLAYED VERDICT, which is what the sweep below was
  // for: the blast was the one dial the numbers said was nearly free — 0 to 98
  // moved map 1's three-machine mix by two wins in twenty and did nothing at all
  // on map 2 — so the owner's eye was the thing to trust, and he asked for more of
  // it. 70 is worth about a win in twenty at the measured end and reads as a
  // noticeably wider burst at the played one.
  //
  // 74 IS THE CEILING and it is a design one rather than a balance one: the
  // catapult's blast is 75, and the claim in tools/families.mjs that this is the
  // smallest in the family fails the moment it is not. Anything above that is a
  // different tower — see the note on the family's shape at the top of `siege`.
  //
  // THE CANNON OUTPOST IS WHY THAT CEILING NOW MATTERS TWICE OVER. The ladder
  // forks here, and the two fourth rungs are meant to be the quick narrow one and
  // the slow wide one: this turret is the smallest blast in the family and the
  // cannon's 85 is the second largest. Raise this one and the fork stops being a
  // choice.
  //
  // `cooldown` 1.80 rather than the family's 3.00, because its animation is
  // faster (see `beats`) and the cooldown IS the animation added up here, as it
  // is for every artillery tier. 55 every 1.8s is 30.6 damage a second against a
  // trebuchet's 12.0 — two and a half times the output into a third of the area
  // from two-thirds of the reach, and the most damage a second in the family.
  //
  // `cost` 230, which is 610 gold of cumulative spend on one plot: the most
  // expensive ladder in the game, ahead of the Musketeer Post's 500 and the
  // Paladin Keep's 530.
  //
  // THE SWEEP, run after this landed, one dial at a time over 20 seeds with
  // everything else at the numbers above. It is the reason they are still the
  // numbers above.
  //
  //   damage    30 / 45 / 60 / 75 / 90   ->  17 / 17 / 18 / 20 / 20 wins
  //   reload   0.9 / 1.35 / 1.8 / 2.5 / 3.2s -> 20 / 20 / 18 / 18 / 17
  //   cost     180 / 205 / 230 / 260 / 300 -> 20 / 19 / 18 / 18 / 17
  //   range    200 / 230 / 260 / 300 / 360 -> 18 / 19 / 18 / 19 / 19
  //   blast      0 / 30 / 55 / 80 / 98   ->  18 / 18 / 18 / 20 / 20
  //
  // The blast row is the one the owner overruled — it ships at 70 now rather than
  // the 55 those five rows were measured around, on the reading given above.
  //
  // on map 1's three-machine mix. Three of those slopes are real and the tower
  // sits mid-slope on each: it is worth building and it does not decide the map.
  // Halving the reload is the one move that runs away with it — 20 wins in 20 and
  // thirteen lives left rather than six — which is what says 1.80 is the fast end
  // of the safe range rather than a number picked for feel.
  //
  // Range and blast barely register, and that is the tower's own argument rather
  // than a flat dial: what it kills, it kills whole, so a wider blast or another
  // 40px of reach has little left to do. Both are pinned by the DESIGN instead —
  // less reach than the trebuchet, less blast than the trebuchet — and
  // tools/families.mjs is where those are enforced.
  //
  // The invariant holds at the top of the ladder as well as at tier 3: six of
  // these and nothing else clears no map, 0 in 20, same as six trebuchets. The
  // mix goes 17 wins to 18 for 690 gold of upgrades. See the tier 4 pair in
  // tools/sim.mjs' scenarios for maps 1 and 2 — and the note there on why map 3
  // has no artillery reading at all.
  { ...ballista, tier: 4, name: 'Ballista Turret', title: 'Ballista Turret', unit: 'Ballista Engineer',
    cost: 230, damage: 55, splash: 70, range: 260, minRange: 0, cooldown: 1.80, colour: '#A8A29A',
    // The upgrade button's own picture on a Trebuchet, the third tier 4 to bring
    // one — see the note on the Musketeer Post's `glyph`.
    glyph: 'ballista',
    // Three lines of its own, on the same terms as the Post's and the Keep's: a
    // named tower at the top of a ladder answers for itself rather than
    // borrowing the family's. See familyCue in src/audio.js.
    voice: 'ballista',
    // WHAT THIS TURRET CAN BE TAUGHT. Ids into src/data/abilities.js, where the
    // rules and the pictures live. Far Shot is the first ability in the game that
    // is neither a rhythm nor a reaction — it is bought and the tower is simply
    // better afterwards — and Heavy Bolt is the first to double a number rather
    // than replace it.
    abilities: ['ballista_tension', 'heavybolt'] },
  // AND THE LADDER'S OTHER FOURTH RUNG, and it is the tier that puts artillery
  // back where the family started rather than away from it.
  //
  // THE TWO TIER 4s ARE THE FAMILY'S OWN ARGUMENT, SPLIT IN TWO. Everything below
  // them lobs: enormous reach, a hole in the middle it cannot defend, a wide
  // blast, a slow heavy rhythm. The Ballista Turret walked away from all four of
  // those — it is a wall-mounted crossbow that shoots fast and flat and near. This
  // one keeps them and makes them hurt.
  //
  //                 damage  reload  dps    range  dead zone  blast
  //   Trebuchet        36    3.00   12.0    360      130       98
  //   Ballista Turret  55    1.80   30.6    260        0       70
  //   Cannon Outpost   70    3.00   23.3    360        0       85
  //
  // Read down the two tier 4 rows and the fork is the whole design: the same 230
  // gold buys either the quick narrow one or the slow wide one, and neither is
  // better. The ballista puts out half again the damage a second and answers a
  // leaker in 1.8s where this takes 3.0; this one reaches 100px further, bursts
  // 15px wider, and lands 70 in one blow where the ballista needs two — which is
  // the difference between killing a thug outright and softening him.
  //
  // `damage` 70, and the honest way to say what that is: the hardest blow in the
  // game that lands on MORE THAN ONE MAN, ahead of the Musketeer Post's 65 and the
  // ballista's 55 — and second overall to the High Altar's 75, which is a
  // missile that hits exactly one enemy and dies with him. 70 into an 85px ellipse
  // against 75 into one throat is the whole trade the family table is about.
  //
  // Chosen by the owner and worth what it costs: 70 into a blast is a
  // wave-clearing number where 70 into one man would be a sniper, so the two dials
  // have to be read together, and the blast is what keeps this a catapult rather
  // than a very rude archery tower.
  //
  // `range` 360, the trebuchet's own reach and the longest in the family, and
  // `minRange` 0 — the second tower here with no dead zone, and the first with the
  // full reach AND no hole. That combination is the one thing about this tier that
  // is strictly better than the tier below it, and it is deliberate: 610 gold of
  // cumulative spend should stop the tower being unable to defend its own plot.
  // Everything else it buys, it pays for in rate of fire.
  //
  // `splash` 85, and it is pinned from both sides by DESIGN rather than by a
  // sweep. Under the trebuchet's 98, because a tier 4 that also out-blasts the
  // machine it upgrades from leaves tier 3 with nothing that is its own — the same
  // rule that holds the ballista's reach under the trebuchet's. Over the
  // ballista's 70, because that turret's claim to being the smallest blast in the
  // family is what makes this one the widest of the pair, and a fork whose two
  // halves blast the same is not a fork. See tools/families.mjs, which enforces
  // both ends.
  //
  // `cooldown` 3.00, which is the owner's ask and is also not a choice: the
  // cooldown IS the animation added up for every artillery tier, and this machine
  // plays the family's own beats. See `beats` on `cannon`.
  //
  // `cost` 230, the same as the Ballista Turret beside it. Both forks in the game
  // already price their pair identically — archery's at 200, the barracks' at 210
  // — and for the reason the archery note gives: two tier 4s at one price are a
  // genuine choice, and a cheap one beside a dear one is a recommendation.
  //
  // NO SWEEP BEHIND THESE NUMBERS YET, and that is worth saying plainly rather
  // than leaving to be discovered. Every other tier in this file carries a table
  // of measured win rates; these are reasoned from the family's own shape and the
  // owner's brief, and they ship to be PLAYED first. `node tools/sim.mjs` will
  // give them the same treatment the ballista got when he asks for it — the dials
  // most likely to be wrong are `damage` and `splash`, which are the two the
  // ballista's own sweep found the game least sensitive to.
  //
  // No abilities yet, exactly as the Assassin Guild shipped without them. The
  // field is simply absent, which the menu already reads as "nothing to teach".
  { ...cannon, tier: 4, name: 'Cannon Outpost', title: 'Cannon Outpost', unit: 'Cannoneer',
    cost: 230, damage: 70, splash: 85, range: 360, minRange: 0, cooldown: CYCLE, colour: '#A8A29A',
    // Its own picture on the upgrade button. With two of them on the ring neither
    // can wear the generic arrow — the same reason both barracks and both archery
    // fourth rungs name theirs.
    glyph: 'cannon',
    // And its own three lines, on the same terms as every other tier 4: a named
    // tower at the top of a ladder answers for itself when it is built and when
    // its standing order changes, rather than borrowing the family's. See
    // familyCue in src/audio.js.
    voice: 'cannoneer',
    // WHAT THIS OUTPOST CAN BE TAUGHT. A faster drill, and a ball that keeps
    // burning after it lands — the first ability in the game that leaves a STATUS
    // on what it hits rather than doing all its work on the frame it arrives.
    abilities: ['cannon_swift', 'fiery'] }
];

// --- monastery -----------------------------------------------------------------
//
// THE FOURTH FAMILY, and the first one whose point is not damage.
//
// Structurally it is archery again — a timber deck on legs with a man standing on
// it, a roof from tier 2, stone from tier 3 — and every anchor below is measured
// the same way an archery tower's is, so nothing in the renderer had to learn
// anything new. What is different is what the man throws.
//
// A monastery hits HARDEST and reaches LEAST. 20, 30 and 50 damage a shot
// against archery's 10, 15 and 25 and a trebuchet's 36 — the biggest number in
// the game at every tier — delivered from the shortest reach in the game, on a
// reload that sits between the other two families.
//
// IT USED TO BE A SLOW RATHER THAN A BLOW. The first version took speed off
// whatever it hit and did almost no damage, and it is worth writing down what
// changed rather than quietly rewriting history: the artist played it and asked
// for the other thing. The slow is GONE rather than reduced — no field on the
// ammunition, no clock on the enemy, no ring on the ground — because half a
// mechanic left behind is a number nothing reads and a branch nobody tests.
//
// THE SECOND VERSION OVERSHOT, and that is worth keeping too. It fired every 4.5
// seconds for 190 damage, which is a sniper rather than a shooting tower, and it
// spent most of its life throwing 110 points of a blow away on an 80-health
// militiaman. The family it settled into is the one in the table below: the same
// output per second as an archery tower, in half as many pieces, twice as big,
// from 30px closer in.
const shrine = {
  sprite: 'monastery_t1',
  spriteTrim: MON_TRIM,
  w: drawnW(MON_TRIM), h: drawnH(MON_TRIM),
  // The MIDDLE of the deck, source pixel (495.9, 571.3) in the 1024 canvas.
  //
  // The deck is one #735a31 path in the SVG with corners (443.0, 500.1),
  // (683.9, 537.1), (553.9, 649.9) and (297.1, 590.7), and it is NOT a
  // parallelogram — the two long edges differ by 22px in run — so "where the
  // diagonals cross" is not defined on it. This is the polygon's AREA CENTROID,
  // which is the same point on a true parallelogram and the right one here.
  //
  // The same path, to the square pixel of area, is the deck on all three tiers:
  // 31945 on each. The artist is drawing one platform and building on top of it.
  mountFrac: [0.470, 0.604],
  // Where the building meets the ground: the centre of its shadow ellipse,
  // source (476.9, 681.1). The SVG stores it as a single #37422f path spanning
  // 244..704 by 582..780, centre (474.1, 681.0) — the PNG fit reads within 3px of
  // that without being shown the SVG, which is the check.
  //
  // NOT 0.5 across. The flag hangs off the right of this drawing and the stair
  // runs off the left and further, so the box centre is 35 source px right of
  // where the building actually stands.
  groundFrac: [0.435, 0.798],
  // NO front art on this tier, and it is measured rather than forgotten.
  //
  // The near-corner post is source x 546.6..560.7 and the priest's widest pose
  // reaches x 532.9 from a mount at 495.9 — 14px clear of it. Both near rails
  // (312.7..439.0 and 560.7..683.9) end outside his span too. He stands in the
  // middle of an open deck on this tier with nothing between him and the camera,
  // which is what the drawing shows.
  shape: 'tower'
};

// THE ROOF DOES NOT NEED DRAWING OVER THE PRIEST ANY MORE, and that is the one
// thing the redraw changed about the renderer's job.
//
// It did on the old art, and the reason is worth keeping: he is the tallest
// figure in the game — 154 source px, and it is the staff rather than the man —
// so on both roofed tiers the top of that staff rose past the near eave and stood
// in front of a roof it is physically under. That needed a POLYGON rather than a
// rect, because a roof is a slanted plane and any box round it takes the deck
// below as well, and painting the deck over the priest erases his legs.
//
// On these drawings the roof is higher and the deck is lower. The priest's mount
// is source y 634 on both roofed tiers and his drawing reaches 143px above it, to
// y 492; the lowest pixel of the roof — the near fascia board — is y 459. Thirty
// three pixels of clear air, so there is nothing to clip and the ROOF polygon is
// gone rather than kept "just in case". If a later upload lowers the eaves, the
// symptom is a staff growing through the tiles and the fix is to trace the plane
// and its two fascias again.

// Tier 2: a roof over the same deck, and the legs get stone footings.
const chapel = {
  sprite: 'monastery_t2',
  spriteTrim: MON2_TRIM,
  w: drawnW(MON2_TRIM), h: drawnH(MON2_TRIM),
  // The deck's area centroid, source (533.9, 634.3), from the same platform path
  // as tier 1's: (443.0, 563.1), (683.9, 600.1), (553.9, 712.9), (297.1, 653.7)
  // shifted into this box — 31945 square px of it, the same area to the pixel.
  mountFrac: [0.546, 0.676],
  // Shadow centre, source (517.8, 747.7). The SVG path spans 288..747 by 649..847,
  // centre (517.5, 747.9), and the PNG fit lands within half a pixel of it.
  groundFrac: [0.512, 0.840],
  // NO front art, for the same reasons tier 1 has none: the near post is at source
  // x 585..599 and the priest's widest pose reaches 570.9, and the near-left rail
  // (351..474) stops 11px short of the same pose's staff. See the note on the roof
  // above for the piece that used to be here and why it is not needed.
  shape: 'tower'
};

// Tier 3: the timber platform becomes a stone one, with the same roof on the same
// posts above it. Not the same trim as tier 2 — the stonework is 7px narrower than
// the timber it replaces — so every number here is measured from tier 3's own file
// and only the deck's shape comes back identical.
const abbey = {
  sprite: 'monastery_t3',
  spriteTrim: MON3_TRIM,
  w: drawnW(MON3_TRIM), h: drawnH(MON3_TRIM),
  // The deck, now the top course of the stonework: area centroid (530.0, 634.3).
  // The same 31945 square px, at the same height in the drawing as tier 2's, which
  // is what "the same platform in stone" looks like in numbers.
  mountFrac: [0.539, 0.676],
  // Shadow centre, source (513.0, 743.4) against the SVG's (513.7, 743.9).
  groundFrac: [0.503, 0.833],
  shape: 'tower'
};

// WHICH POSE IS WHICH, and unlike the archer's it reads the way it is written.
// Default is the priest at rest with his staff upright beside him; Attack is the
// staff swung down and out in front, which is the moment the missile leaves it.
// He holds that pose for as long as the recoil lasts, exactly as an archer holds
// an empty bow.
const priest = {
  ammo: missile,
  gunner: 'priest_t1',
  gunnerTrim: PRIEST_TRIM,
  // THE CENTRE OF HIS GROUND SHADOW, source (261.0, 321.5).
  //
  // MEASURED ACROSS TWO BLOBS, which is new and is the artwork's doing: the foot
  // of his staff is planted through the middle of the ellipse and splits it into
  // x 232..275 and x 277..290. Either half on its own has its centre in the wrong
  // place — the left one is 7.5px off — so tools/shadow.mjs learned to put a
  // split shadow back together rather than this carrying a number the tool would
  // then disagree with.
  gunnerPivot: [0.563, 0.925],
  // The staff swung out. His own trim and his own pivot, both measured: the
  // shadow is at source (261.0, 322.0), half a pixel from the Default's, which is
  // what lets the two poses swap without the man stepping sideways.
  attack: { sprite: 'priest_t1_attack', trim: PRIEST_ATK_TRIM, pivot: [0.657, 0.919] },
  spriteFaces: -1,
  // Where the missile leaves the staff: the flared head at the top of the swing,
  // source (201.9, 207.1), which is 59.1 in FRONT of the anchor and 114.4 above
  // it. Kept as fractions of the Default trim exactly as the archers' are, so a
  // re-export at another size carries over untouched.
  //
  // MEASURED ON THE ATTACK POSE, like the bow's grip and for the same reason: it
  // is the one drawing where the staff head is the extreme thing in the picture
  // rather than one of two candidates.
  muzzle: [Math.round(0.739 * PRIEST_TRIM[2] * SCALE), -Math.round(0.743 * PRIEST_TRIM[3] * SCALE)]
};

// Tier 2's bishop: a mitre and a heavier robe, in the same box, standing on the
// same shadow, holding the same staff in the same place. Every fraction here is
// tier 1's exactly, and that is a measurement rather than a copy — all six files
// were run through tools/shadow.mjs and the two tiers came back equal.
// Tier 4: the belfry again, one storey up and roofed. A stone box with an arched
// door, an open belfry on top of it with four posts and a shingled roof, and a
// cross on the point.
//
// TWO PIECES OF IT STAND IN FRONT OF THE MAN and that is the whole difficulty of
// this drawing — the artist said so in the message that brought it. See
// `frontPolys`.
const altar = {
  sprite: 'monastery_t4',
  spriteTrim: MON4_TRIM,
  w: drawnW(MON4_TRIM), h: drawnH(MON4_TRIM),
  // The belfry floor: the area centroid of the white quad the artist paints inside
  // the four posts, source (505.7, 575.6), whose corners are (494.2, 522.4),
  // (626.9, 545.4), (520.0, 631.9) and (381.8, 598.9).
  //
  // CHECKED AGAINST THE STONE UNDER IT, exactly as the Musketeer Post's deck is
  // checked against the banner draped over it: the floor is drawn on top of the
  // stone box's own top face, and that face's centroid is (508.4, 576.2) — 2.7px
  // away, measured on a different shape. Two shapes agreeing is what says the
  // mount is the floor rather than a quad that happens to be there.
  //
  // AND HIS HAT GOES BEHIND THE ROOF, which is a decision rather than an accident.
  // This belfry is short — 143 source px of clear height at its nearest corner,
  // against a pope who is 145.5 tall from his shadow to the head of his staff — so
  // a man standing at the middle of the floor is 56px further back than the eave,
  // and the roof crosses him just above the eyes. It shipped for a few hours with
  // him nudged forward to clear it; the owner asked for the middle, hat and all,
  // and the middle is also the number every other tower in the game uses. The
  // occlusion is the artist's own warning about this drawing coming true.
  mountFrac: [0.483, 0.579],
  // Shadow centre, source (512.0, 832.5) from the SVG's own ellipse, which spans
  // 335..689 by 754..911.
  //
  // FROM THE SVG RATHER THAN THE PNG, and this is the drawing that shows why the
  // tool fits an ellipse instead of taking a bounding box: the tower's base
  // covers the back of its own shadow, so the visible blob in the PNG is a crescent
  // whose box centre is at y 850.5 — 18px low. tools/shadow.mjs fits the arc and
  // comes back to the SVG's number.
  groundFrac: [0.500, 0.899],
  // THE ROOF AND THE NEAR POST, which are the two things between the pope and the
  // camera. The artist flagged both when he sent the drawing.
  //
  // THE ROOF first. He stands under it, and the front slope crosses his head: his
  // shoulders reach y 428 in source pixels and the eave hangs down to 489 at its
  // lowest. The polygon is a band from y 380 down to the eave, traced along it in
  // five steps — the eave is two near-straight runs meeting at (515, 489), and
  // every vertex sits within a pixel ABOVE the line rather than on it.
  //
  // Above it, not on it, for a reason that is one pixel wide and would have been a
  // visible bug: three pixels under the eave, at x 460..484, is the BACK post,
  // which is behind him. A band that overshot by a couple of pixels would paint
  // that post's outline across his mitre. Everything inside the polygon as drawn
  // is roof — verified by rasterising the artist's own SVG and counting who owns
  // each pixel, which reports shapes 62, 63, 64, 70, 71 and 72 and nothing else.
  //
  // THE NEAR POST second, at the floor's nearest corner. It is the only one of the
  // four in front of him — the left and right posts are 80px clear of his widest
  // pose, and the back one is behind him — and it crosses his right shoulder by
  // about 12 source px, which is 2 game px of stone over his robe.
  //
  // Its six corners are the union of the post's two faces and its cap, taken from
  // the SVG at (548.6, 455.2), (568.8, 458.7), (569.9, 627.3), (554.9, 640.2),
  // (535.1, 635.5), (534.7, 464.2), then pushed 2px outward from the shape's own
  // centre for the black stroke the PNG draws around shapes the SVG stores without
  // one. The pad ring reads solid black in the PNG at every point checked, which is
  // what says 2 is the right number rather than 1 or 3.
  frontPolys: [
    [[400, 380], [620, 380], [620, 458], [600, 467], [560, 477], [520, 488],
     [515, 489], [470, 479], [430, 470], [400, 464]],
    [[549, 453], [569, 457], [570, 629], [555, 642], [535, 637], [534, 462]]
  ],
  shape: 'tower'
};

// TIER 4'S OTHER RUNG, the Judgement Temple, and the first building in this game
// that carries TWO figures. Everything else on the board is one man on a deck, one
// machine on a stone, or a squad that walks off the plot; two men standing still,
// side by side, taking turns, is a shape nothing here had.
//
// THE SAME BELFRY AS THE ALTAR'S, six game px shorter. The artist drew one
// building twice — see MON4B_TRIM — so the two forks share a footprint and differ
// in what stands inside them and what hangs off the front.
const judgement = {
  sprite: 'monastery_t4b',
  spriteTrim: MON4B_TRIM,
  w: drawnW(MON4B_TRIM), h: drawnH(MON4B_TRIM),
  // The belfry floor again: the area centroid of the orange quad the artist paints
  // between the four posts, source (505.7, 561.5), whose corners are (494, 508),
  // (627, 531), (520, 618) and (382, 585).
  //
  // ITS X IS THE ALTAR'S X TO A TENTH OF A PIXEL — 505.7 in both — which is what
  // says these are the same belfry rather than two drawings that resemble each
  // other. The y differs by 14 because the floor sits higher in a shorter tower.
  //
  // This is the mount for anything that asks the tower for ONE standing point: the
  // encyclopedia's card, crownTop, the info box. The two monks stand either side
  // of it — see `pair`.
  mountFrac: [0.4825, 0.5638],
  // WHERE THE TWO OF THEM STAND, and the only field in this file that holds more
  // than one figure.
  //
  // ALONG THE FLOOR'S OWN LEFT-TO-RIGHT AXIS rather than along the screen's. The
  // belfry is drawn isometric, so its floor's side-to-side runs from the left
  // corner (382, 585) to the right corner (627, 531) — 251 source px at a slope,
  // not horizontally. Two men separated horizontally on a sloped floor would have
  // one of them standing in the air; separated along the axis, both have their
  // feet on the boards and the pair still reads as side by side to the camera.
  //
  // Source (458, 573) and (532, 582), which is 74 apart against a monk 76 wide:
  // shoulder to shoulder with their robes touching.
  //
  // THEIR HEADS CLEAR THE ROOF, and that is what decides the depth rather than
  // taste. A monk's crown is 105 source px above his anchor — measured off the
  // topmost ink of both his poses, which agree — and the padded eave above hangs
  // lowest at x 516, where it reaches y 478. So the deepest a man may stand and
  // still keep his head out of the shingles is eave(x) + 105: y 583 under the
  // lowest part of the roof, rising to y 555 out at the left tip.
  //
  // The first pair ran along the floor's own left-to-right axis, which is the line
  // two men standing on a sloped floor would naturally take — and it is the wrong
  // line here, because going right along it goes UP: it put the right monk's crown
  // 17.4px inside the eave. These two are near-level on the screen instead, both
  // deep enough to clear, and they still read as side by side because that is what
  // level means to the camera.
  //
  // AND THEY STAND AS DEEP AS THAT LINE ALLOWS, which is the owner's second ask
  // about this pair and the one that fights the first. They were at y 580 and 589,
  // about four fifths of the way from the floor's back edge to its front, and it
  // read as two men on the lip of the platform rather than on it. The floor's own
  // centre is y 561.5 — but a man standing there has his crown 3px inside the eave
  // on the left and 18px inside it on the right, which is the roof eating their
  // heads all over again. So they are at eave(x) + 105 + 3 instead: as near the
  // middle as the shingles permit, 7px further back than they were, and no further.
  //
  // The three pixels are the whole margin, and it is thinner than it sounds: the
  // eave polygon below is already padded 2px DOWN from the artist's own line, so
  // the real gap over each crown is nearer five. `node tools/pair.mjs` measures
  // both against that band and fails if either crown goes back under it.
  //
  // Both feet are on the boards: at x 458 the floor runs y 533..603 and at x 532 it
  // runs y 515..608, so neither man is over the rail. The floor centroid is still
  // `mountFrac` above, which is what everything asking for ONE point gets.
  pair: [[0.3500, 0.5787], [0.5556, 0.5896]],
  // THE BOARDS THEMSELVES, in the building's own source pixels, so that the two
  // sentences above stop being prose. Corners in draw order: back, right, front,
  // left — the same quad `mountFrac`'s centroid comes from.
  //
  // It is here because the owner has now asked twice about where these two stand,
  // in opposite directions — once for their heads to come out of the roof, which
  // pushed them forward, and once for them to come off the front lip, which pushes
  // them back — and there was no tool that could see either. `node tools/pair.mjs`
  // reads this and the eave together and holds the men in the one band that
  // satisfies both: on the boards, and as far back as the shingles allow.
  floorQuad: [[494, 508], [627, 531], [520, 618], [382, 585]],
  // HOW LONG BEFORE HIS SHOT A MAN IS DRAWN GATHERING, in seconds, at the owner's
  // ask: half a second of charging against a second and a half at rest.
  //
  // It is a window rather than a phase, and that is what keeps the whole animation
  // on one counter. `cd` counts down to the next blast, so "charging" is simply
  // `cd <= charge` — see drawPair in src/render.js. With a 1.00s cooldown and two
  // men taking turns, each of them sits at rest for 1.5s, gathers for 0.5s, and
  // looses; and the second monk's cycle begins 1.0s into the first monk's, which is
  // exactly what alternating on a 1s cadence means.
  charge: 0.5,
  // Shadow centre, source (512.0, 818.5), from the SVG's own ellipse which spans
  // 335..689 by 740..897. The same x as the altar's, 14px higher up, and measured
  // the same way and for the same reason — this building covers the back of its
  // own shadow too, so the visible blob in the PNG is a crescent and its box
  // centre is not its middle. `node tools/shadow.mjs` fits the arc.
  groundFrac: [0.500, 0.895],
  // THE ROOF AND THE NEAR POST, the same two things that stand between the altar's
  // pope and the camera, measured on this drawing rather than inherited.
  //
  // THE ROOF first, and on this building it is the LIMIT rather than the overlap:
  // a monk is 116 source px tall against a pope's 156, and the belfry's opening is
  // 116 source px deep at its narrowest, so where the two men may stand is decided
  // by the eave and nothing else. See `pair` above for the arithmetic. The roof
  // ends up clearing both crowns by three pixels and touching neither.
  //
  // THE NEAR POST is what overlaps them instead, and that is the realism the owner
  // asked for — see below. It does the job the roof was expected to do, and better,
  // because a man half behind a pillar reads as standing behind it while a man with
  // the top of his skull missing reads as a bug.
  //
  // The band runs from y 300 down to the eave, with every vertex a pixel ABOVE the
  // line rather than on it — the same one-pixel rule the altar's carries, and for
  // the same reason: three pixels under the eave is the BACK post, which is behind
  // the monks, and a band that overshot would paint its outline across a face.
  //
  // THE NEAR POST second, at the floor's nearest corner, source x 535..570 and y
  // 441..626. It is the only one of the four in front of them, and it crosses the
  // RIGHT-HAND monk rather than passing between the two — his robe spans x 492..568
  // and the post covers 535..570, so about half of it is stone. The left monk is
  // 55px clear of it. That asymmetry is the drawing's, not a mistake: it is what
  // a post at a corner does to two men standing behind it.
  //
  // Its corners are the union of the post's two faces and its cap, from the SVG at
  // (535, 450), (555, 454), (569, 445), (570, 613), (555, 626), (535, 621), pushed
  // 2px outward for the black stroke the PNG draws around shapes the SVG stores
  // without one — the same pad the altar's post uses.
  frontPolys: [
    // THE ROOF BAND, and it is SAMPLED FROM THE EAVE rather than traced by hand.
    // The hand-traced version ran along five straight guesses and sat as much as
    // 10 source px ABOVE the real edge — so it under-covered the roof, and worse,
    // it made the head-clearance check in tools/pair.mjs pass on a monk whose
    // crown was genuinely inside the shingles. The eave is a curve; five points
    // cannot hold it.
    //
    // So: the lowest edge of every roof shape in the artist's SVG, read every 18px
    // across the belfry and padded 2px down for the black stroke the PNG draws
    // around shapes the SVG stores without one. Top at y 300, well clear of
    // anything, because the band only has to be a band.
    [[336, 300], [678, 300], [660, 412], [642, 427],
     [624, 443], [606, 455], [588, 459], [570, 464],
     [552, 469], [534, 473], [516, 478], [498, 475],
     [480, 470], [462, 466], [444, 462], [426, 458],
     [408, 454], [390, 450], [372, 446], [354, 442],
     [336, 385]],
    [[533, 448], [557, 452], [571, 443], [572, 615], [557, 628], [533, 623]]
  ],
  shape: 'tower'
};

// THE MONK, and a Judgement Temple stands two of him. One def for both, because
// they are the same man twice — see `pair` above for where each of them stands.
//
// HE FIRES HIS OWN BLAST, and it is the fifth drawing in a family of four. It flies
// at the family's own 330 and makes the family's own Arcane_shot, at the owner's
// ask — what is his is the picture and the kill cry, and nothing else.
//
// It stood in as the cardinal's missile for one build, while the artist's file was
// still a working document rather than a sprite. Everything about that swap was
// one line, which is the whole point of an ammunition being a table row.
//
// A KIND OF HIS OWN all the same, and only for the KILL cry. `monk` points at the
// same firing cue `arcane` does — see FIRING in src/towers.js — so what leaves
// sounds like every other missile in the family, and what a man killed by it says
// is the monk's line. That is the pattern the pope's `kind` established, and it is
// the whole reason a kind exists separately from a sprite.
const monk = {
  ...priest,
  ammo: {
    ...missile3,
    kind: 'monk',
    sprite: 'monk_shot',
    trim: MONK_SHOT_TRIM,
    // `grip` 0.12 rather than the darts' 0.15, and it is the shape that moves it:
    // those are long thin bolts held near the point, and this is a blunt head with
    // a tail behind it, so the point that wants to sit on the flight line is the
    // middle of the head. Hand-set from watching the shot, like every other grip in
    // the game — it is the one number in a projectile a tool cannot give you.
    grip: 0.12
  },
  gunner: 'monk',
  gunnerTrim: MONK_TRIM,
  // The centre of his ground shadow, source (258.0, 303.0), by the tip rule every
  // figure's anchor is read with — `node tools/shadow.mjs`.
  gunnerPivot: [0.526, 0.905],
  // Arms out, gathering the blast. HIS ATTACK POSE IS A WIND-UP, which no other
  // figure in this game has: an archer's Attack is the arrow already leaving, so it
  // is shown after the shot, and a monk's is the shot being built, so it is shown
  // before. See `pair` handling in src/towers.js and drawPair in src/render.js.
  //
  // The box grows 4px on the LEFT only — 214 against 218, same width of drawing
  // pushed forward — so his shadow does not move between the two and the pivot
  // shifts with the box rather than the man.
  // The shadow is at source (258.0, 303.0) in this drawing too — not close, the
  // SAME pixel — so the two poses swap with his feet nailed down and only his arms
  // moving. That matters more on this tower than on any other: two monks stand on
  // one floor a second out of step, so a drift of even a pixel would have one of
  // them twitching sideways beside the other holding still.
  attack: { sprite: 'monk_attack', trim: MONK_ATK_TRIM, pivot: [0.550, 0.905] },
  // HIS HANDS, and they are found rather than guessed. The Attack drawing carries
  // one pale shape the resting drawing does not: a 68px blob of the artist's cream
  // at source (223.2, 258.4), out beyond the near edge of his robe, which is the
  // cupped hands he gathers the blast in. Every other cream blob — his face at
  // (258.1, 223.1), the opening of his robe at (262.5, 253.5) — appears in BOTH
  // poses at the same place, so the one that only exists while he is charging is
  // the one the shot comes out of.
  //
  // 34.8 in FRONT of his anchor and 44.6 above it, which is [7, -9] once drawn.
  // It was [3, -9] for one build, taken by eye off a blown-up sprite, and that put
  // the blast inside his chest rather than in his hands.
  //
  // Against a pope's [13, -23]: the difference is the man rather than the aim. He
  // is 116 source px tall to the pope's 156 and holds the blast at arm's length in
  // front of him instead of on the head of a staff swung overhead.
  muzzle: [Math.round(0.458 * MONK_TRIM[2] * SCALE), -Math.round(0.384 * MONK_TRIM[3] * SCALE)]
};

const bishop = {
  ...priest,
  ammo: missile2,
  gunner: 'priest_t2',
  gunnerTrim: BISHOP_TRIM,
  attack: { sprite: 'priest_t2_attack', trim: BISHOP_ATK_TRIM, pivot: [0.657, 0.919] },
  muzzle: [Math.round(0.739 * BISHOP_TRIM[2] * SCALE), -Math.round(0.743 * BISHOP_TRIM[3] * SCALE)]
};

// Tier 3's cardinal: the one of the three whose Attack drawing is its own. His
// staff head is bigger, so it reaches 4 source px further forward and his box is
// 2 wider and 2 taller — which is exactly why the muzzle is re-derived rather
// than shared. The same fraction on a different box is a different point.
const cardinal = {
  ...priest,
  ammo: missile3,
  gunner: 'priest_t3',
  gunnerTrim: CARDINAL_TRIM,
  // The shadow of this Attack pose is at source (261.0, 321.5) — the Default's to
  // the tenth of a pixel.
  attack: { sprite: 'priest_t3_attack', trim: CARDINAL_ATK_TRIM, pivot: [0.676, 0.916] },
  // Staff head at source (198.0, 207.3): 63.0 in front of the anchor and 114.2
  // above it.
  muzzle: [Math.round(0.788 * CARDINAL_TRIM[2] * SCALE), -Math.round(0.742 * CARDINAL_TRIM[3] * SCALE)]
};

// THE NUMBERS, and what each of them is for.
//
// THE THREE SHOOTING FAMILIES ARE ONE DESIGN, and it is the artist's, stated
// plainly enough to be worth writing down as a table rather than paraphrasing:
//
//                 rate      projectile   damage    range     other
//   Archery       HIGHEST   HIGHEST      decent    decent    —
//   Monastery     decent    decent       HIGHEST   LOWEST    —
//   Artillery     LOWEST    LOWEST       decent    HIGHEST   blast radius
//
// Every number below is chosen to make a column of that table true, and the
// table is checked by `node tools/families.mjs`, which fails if any of the nine
// claims stops holding. Do not tune one of these families without reading the
// other two rows: "decent" is not a free parameter, it means BETWEEN the other
// two, and there are only three of them.
//
// So, in order:
//
// `cooldown` 1.82 / 1.64 / 1.45. Slower than archery's 1.00 / 0.90 / 0.80 and
// faster than artillery's flat 3.0, which is the middle column of the table.
//
// `damage` 20 / 30 / 50, the highest in the game at every tier — against
// archery's 8 / 14 / 26 and artillery's 18 / 24 / 36.
//
// MORE OUTPUT THAN ARCHERY, AND BY LESS AND LESS AS THE LADDER CLIMBS.
//
// The cooldowns were 2.00 / 1.80 / 1.60, which put the two families at EXACTLY
// the same damage per second — 10.0, 16.7 and 31.3 for both, to a tenth. That
// was pleasing and it was wrong, and the artist said why in one line: a
// monastery costs more and reaches less, so it cannot also do the same work.
// Two towers where one is strictly worse is not a choice.
//
// So the reload came down a tenth and nothing else moved: 11.0, 18.3 and 34.5 a
// second against archery's 10.0, 16.7 and 31.3 — the premium a shorter reach and
// a bigger bill have to buy.
//
// ARCHERY'S SIDE OF IT HAS SINCE MOVED, on the owner's own pass: 8 / 14 / 26 at
// the same reloads is 8.0, 15.6 and 32.5, so the monastery's premium is +37% at
// tier 1, +17% at tier 2 and +6% at tier 3. That is a shape rather than a flat
// tenth, and it is a defensible one — a shrine is much better than a watchtower
// and an abbey is barely better than a crossbow tower, so the reason to take the
// monastery is strongest early, which is when its short reach hurts least.
// Watch tier 3: another point on the elite archer would put the two families
// level again, which is the exact thing the reload cut was made to prevent.
//
// EVERYTHING ELSE THAT SEPARATES THEM IS SHAPE:
//
//   a monastery lands its output in half as many pieces, twice as big
//   an archery tower reaches 30px further at every tier, and costs 20 less
//   at tier 1 and 20 more at tier 3
//
// A big lump is worth more against a giant, which has 1000 health and eats
// whatever you send, and worth less against a militiaman, who has 80 and wastes
// the rest. Reach is worth more on a bend and less on a straight. Neither
// dominates, and the player choosing between them on a plot is choosing between
// those facts rather than between two numbers.
//
// `range` 150 / 165 / 180, the lowest in the game — under archery's 190 / 210 /
// 230 at every tier, which is the table's fourth column. It was 175 / 195 / 215,
// then 160 / 175 / 190, and it has come down twice for the same reason: a weapon
// that hits this hard should have to be placed where the road actually is.
//
// WHAT THE SECOND TEN COST, measured as the share of the road a monastery on an
// average plot can reach, at tier 1 / 2 / 3:
//
//   map 1   13.9 / 16.5 / 19.2  ->  12.4 / 14.9 / 17.4
//   map 2   13.5 / 17.1 / 20.4  ->   9.9 / 14.8 / 18.0
//   map 3   15.1 / 18.0 / 20.5  ->  12.8 / 16.2 / 18.9
//
// Map 2 loses the most, and that is a fact about the map rather than about the
// number: its plots sit further back from the tarmac than either other map's, so
// the tier 1 ring is the first thing to stop touching it.
//
// WHAT IT COST IN WINS, twenty seeds, the sim's two-monastery scenario against
// the same map's best archery-and-barracks mix — 6/20 against 17 on map 1, 14/20
// against 19 on map 2, 3/20 against 9 on map 3. Before the cut the monastery rows
// read 9, 17 and 7. So it is a real nerf on all three maps and worth about three
// wins each, and the family is still nowhere near unusable on the two maps that
// suit it.
//
// Two things that grid does NOT include, both of which push the other way: the
// sim never presses the targeting button, so it plays every monastery on "nearest
// the exit" and none of what the standing order buys shows up here; and it never
// moves a rally point either, so the plots it puts blockers on are not the plots a
// player would.
//
// THE FLOOR IS 145, and it is not a matter of taste. The smallest range that
// touches the road at all is 143 on map 1's plot 2 and 142 on its plot 5, so a
// ladder starting under 145 would sell a tier 1 building that literally cannot
// shoot from two of that map's nine plots. Plot 2 is already past that line —
// it was at 160 too — and plot 5 joins it at 150 with about a percent of road in
// reach, which is the same thing in practice. Both are still fine to upgrade
// into. Do not take this ladder below 145 without moving those two markers.
//
// `speed` on the missile is 330, between the rock's 300 and the arrow's 360. It
// was 130, which was chosen when this was a support weapon you watched crawl;
// a 50-damage blow should arrive.
//
// NO SPLASH. Area is artillery's answer and the table says so — a missile that
// also caught everyone standing nearby would be a catapult with a bigger number.
//
// `cost` 80 / 110 / 160 against archery's 60 / 90 / 140 — twenty more at tier 1,
// twenty at tier 2 and twenty at tier 3, and the other half of what the faster
// reload is paying for. The gap at tier 1 doubled when the owner took a
// watchtower to 60, which is the same pass that took the novice archer to 8
// damage: the cheapest tower in the game got cheaper and weaker together.
//
// WHERE IT LANDS, twenty seeds, the map's best mix with one archery tower
// swapped for a monastery — the comparison worth having, because they want the
// same plot. Two of eleven on map 3. A catapult in the same slot is beside it
// for scale.
//
//                        no swap   monastery   catapult
//   map 1  3A + 3B        17/20       9/20       19/20
//   map 2  3A + 3B        19/20      17/20       14/20
//   map 3  4A + 7B         7/20      11/20        6/20
//
// The tenth of a reload changed this more than it looks. Before it, the same
// three rows read 13, 16 and 0 — the monastery could not pay for a plot on map 3
// at all, and now it is the best thing to put there. Map 1 is the one map where
// it is still a mistake: six plots, the densest waves in the game per yard of
// road, and no second road to cover. A family that is right on two maps and
// wrong on the third is the shape artillery already has, in the other direction.
//
// `targeting`, ON ALL THREE TIERS, which makes this the second family that can
// be told what to shoot at.
//
// It is the family with the strongest case for it after archery, and the case is
// the size of the blow rather than the reach: 50 damage into a militiaman with 80
// health throws most of a 1.45s reload away, and "most health" is exactly where
// that blow belongs. A bow wasting 10 on the same man has wasted a tenth as much.
//
// It also fits what the family has become. The button is a preference and never a
// filter — see pickTarget — so a monastery told to shoot throwers first and
// offered nothing but militia still shoots the militia, and a player who never
// presses it gets the tower they had.
//
// Artillery still deliberately does not have it: its whole character is that it
// commits a rock to a patch of ground a second before the rock lands, and a
// machine that could be re-pointed at whatever you liked would be an archery
// tower with a bigger number. Two of four families, not three.
// The pope. The first churchman with boxes of his own — see POPE_TRIM — and
// otherwise a priest at the top of his ladder: same staff swung the same way,
// same shadow rule, a bigger missile leaving it.
const pope = {
  ...priest,
  ammo: missile4,
  gunner: 'pope',
  gunnerTrim: POPE_TRIM,
  // THE CENTRE OF HIS GROUND SHADOW, source (257.0, 323.5), by the tip rule every
  // other figure's anchor is read with — `node tools/shadow.mjs`. His own number
  // rather than the priest's inherited one, because his box is his own: the three
  // below him share a trim and so can share a fraction, and he cannot.
  gunnerPivot: [0.512, 0.933],
  // Staff swung out. The shadow is at source (257.0, 323.5) in this drawing too —
  // not close, the SAME pixel — so the two poses swap with his feet nailed down
  // and only the staff moving.
  attack: { sprite: 'pope_attack', trim: POPE_ATK_TRIM, pivot: [0.643, 0.923] },
  // Where the missile leaves the staff: the flared head at the top of the swing,
  // source (193.3, 211.6), which is 63.7 in FRONT of the anchor and 111.9 above
  // it.
  //
  // MEASURED ON THE ATTACK POSE like every staff and bow in this file, and taken
  // at the same point on the head as the cardinal's — a third of the way across
  // his flare and a third down it, which is where the mouth is on both drawings.
  //
  // The numbers are worth reading beside his: 63.0 in front and 114.2 above. The
  // artist drew a bigger man holding a bigger staff and put its head within a
  // couple of pixels of where the last one was, so the missile leaves the same
  // place on the screen and only the thing leaving is different — both round to
  // an offset of [13, -23] once drawn.
  muzzle: [Math.round(0.758 * POPE_TRIM[2] * SCALE), -Math.round(0.717 * POPE_TRIM[3] * SCALE)]
};

export const monastery = [
  { ...shrine, ...priest,   tier: 1, name: 'Wayside Shrine', title: 'Monastery Tier I',   unit: 'Priest',
    cost: 80,  damage: 20, range: 150, cooldown: 1.82, colour: '#8C7A5C', targeting: true },
  { ...chapel, ...bishop,   tier: 2, name: 'Chapel',         title: 'Monastery Tier II',  unit: 'Bishop',
    cost: 110, damage: 30, range: 165, cooldown: 1.64, colour: '#7E6E52', targeting: true },
  { ...abbey,  ...cardinal, tier: 3, name: 'Abbey',          title: 'Monastery Tier III', unit: 'Cardinal',
    cost: 160, damage: 50, range: 180, cooldown: 1.45, colour: '#9A948A', targeting: true },
  // TIER 4, AND THE ONE TOP RUNG THAT IS NOT A TRADE.
  //
  // The other three tier 4 towers each give something up for what they gain — the
  // Musketeer Post pays for the whole board in output, the Paladin Keep gains more
  // wall than weapon, the Ballista Turret pays for its damage in reach and blast.
  // This one was asked for as "just a more powerful version of Monastery Tier 3:
  // more damage, more range, other than that no stark difference", and it is built
  // exactly that way. What it pays with is GOLD, and nothing else.
  //
  // `damage` 75, up from 50, and the biggest single blow in the game — past the
  // Musketeer Post's ball and the ballista's bolt at 60. That is the monastery's
  // own column of the table in tools/families.mjs rather than an exception to it:
  // this family hits hardest at every tier, and the top of it hits hardest of all.
  //
  // IT SHIPPED AT 80 FOR AN AFTERNOON. The owner asked for 75, and the measurement
  // is worth keeping beside the number: on map 1's monastery mix those five points
  // are two wins in twenty, 8 down to 6, because a militiaman has 80 health and 80
  // damage killed one outright where 75 leaves him standing. Map 2 does not notice
  // — 15 wins either way, a life better if anything. It is the sharpest five-point
  // step anywhere in this file, and it is sharp for a reason that will move the day
  // the militia's health does.
  //
  // `range` 210, up from 180. Still the shortest ladder in the game — an archery
  // tier 3 reaches 230 and a Post 480 — so a tower that hits this hard still has to
  // be placed where the road is, which is the argument the whole family rests on.
  // Two rungs' worth of the family's own 15px step, which is what "more range"
  // buys without the tower becoming something else.
  //
  // `cooldown` 1.45, THE SAME as the Abbey's, and the one number that deliberately
  // does not move. The ladder's reloads are 1.82 / 1.64 / 1.45 and a fourth step
  // would have been about 1.30; at 75 damage that is 57.7 a second rather than
  // 51.7, and the gap between "more powerful" and "the only tower worth building"
  // is exactly that sort of number. The tier buys the blow and the reach; the
  // rhythm is what still makes it a monastery.
  //
  // `cost` 220, which is 570 gold of cumulative spend on one plot — dearer than
  // the Musketeer Post's 500 and the Paladin Keep's 530, and under the Ballista
  // Turret's 610, which stays the most expensive ladder in the game. It shipped at
  // 240 and came down with the damage; the sim cannot tell the two prices apart on
  // either map, so this one is the owner's feel rather than a measured edge.
  //
  // THESE NUMBERS ARE A FIRST GUESS, on the owner's own terms: the sweep comes
  // after this lands, the same way the ballista's did. `tools/families.mjs` is the
  // check that the family still reads the way the design says, and tools/sim.mjs
  // is the check that no family clears a map alone at the top of its ladder.
  { ...altar, ...pope, tier: 4, name: 'High Altar', title: 'High Altar', unit: 'Pope',
    cost: 220, damage: 75, range: 210, cooldown: 1.45, colour: '#A8A096', targeting: true,
    // The upgrade button's own picture on an Abbey, and the fourth of four — every
    // family's top rung now shows what it buys rather than a plain arrow. See the
    // note on the Musketeer Post's `glyph`.
    glyph: 'altar',
    // And its own three lines, on the same terms as the other three tier 4s: a
    // named tower answers for itself when it is built and when it is told what to
    // shoot at, rather than borrowing the family's. See familyCue in src/audio.js.
    voice: 'pope',
    // WHAT THIS ALTAR CAN BE TAUGHT, and both of them leave the plot: they change
    // every other tower on the map rather than this one. Ids into
    // src/data/abilities.js, where the rules and the badges live.
    abilities: ['wrath', 'fortitude'] },

  // AND THE FOURTH FAMILY FORKS. The monastery was the last ladder with a single
  // top rung; this is its second, and every fork in this game now offers the same
  // shape of choice — the same gold, the same plot, two different answers.
  //
  // WHAT IT IS: two monks taking turns rather than one pope swinging a staff. The
  // cadence is the whole tower. Each monk works a 2 second cycle — a second at
  // rest, a second gathering the blast — and they are half a cycle apart, so one
  // of them is always charging and the tower looses every 1.00s. That is the
  // owner's own timing, and `cooldown` is the tower's half of it: the two monks
  // between them fire at 1.00s intervals, and which of them is drawn firing
  // alternates. See `pair` on the def above and stepWeapon in src/towers.js.
  //
  // 40 A BLAST, AND IT IS A NUMBER RATHER THAN A GUESS. The owner proposed 35 and
  // asked for it to be checked against the High Altar, so:
  //
  //   High Altar        75 every 1.45s   51.7 a second
  //   at 35             35 every 1.00s   35.0 a second
  //   at 40             40 every 1.00s   40.0 a second
  //
  // 35 makes this tower strictly worse than the altar at the same price and the
  // same reach — lower output AND slower against everything — which is not a fork,
  // it is a trap. 40 is the number that turns it into a choice, and the reason is
  // OVERKILL rather than the total:
  //
  //   a militia has 80 health.  The altar spends two 75s on it and wastes 70 of
  //   the second one: 2.90s a kill.  The temple spends two 40s and wastes NOTHING:
  //   2.00s a kill, 45% faster, on 22% less damage a second.
  //
  //   a heavy has 1000.  The altar takes 19.3s, the temple 25.0s.
  //
  // So the fork reads: the altar BREAKS BIG THINGS, the temple CLEARS SMALL ONES.
  // That falls out of the arithmetic rather than being bolted on, and 40 is the
  // exact number at which two blasts kill a militia with nothing spilled.
  //
  // FIRST GUESS ALL THE SAME, on the owner's own terms — the sweep comes after he
  // has played it, the way the ballista's and the cannon's did.
  { ...judgement, ...monk, tier: 4, name: 'Judgement Temple', title: 'Judgement Temple',
    unit: 'Monk', cost: 220, damage: 40, range: 210, cooldown: 1.00,
    colour: '#A8A096', targeting: true,
    // The upgrade button's own picture on an Abbey, beside the altar's — the
    // monastery is the last family to offer two, so this is the eighth and final
    // tier 4 glyph. See the note on the Musketeer Post's.
    glyph: 'temple',
    // Its own three lines, on the same terms as every other named tier 4.
    voice: 'monk' }
];

// The four quadrants of the build menu, in N/E/S/W order. All four have tiers
// now, so nothing in the ring is drawn locked — but the layout was laid out for
// four from the first day precisely so that nothing moved under the player's
// thumb when the monastery landed, and nothing did.
export const families = [
  { id: 'archery',   name: 'Archery',   glyph: 'bow',      tiers: archery },
  { id: 'barracks',  name: 'Barracks',  glyph: 'swords',   tiers: barracks },
  { id: 'siege',     name: 'Siege',     glyph: 'catapult', tiers: siege },
  { id: 'monastery', name: 'Monastery', glyph: 'cross',    tiers: monastery }
];
