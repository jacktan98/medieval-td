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
// The paladin: full plate, a kite shield and a longsword. Narrow and TALL —
// 123x140 against the swordsman's 110x120 and the spearman's 168x116 — because he
// rests with the sword UPRIGHT over his shoulder, which makes him the tallest of
// the four men a barracks musters.
//
// His two poses differ more than anyone's, and in both directions: the sword comes
// down and levels out, so the box goes from 123x140 to 178x116 — 45px wider and
// 24 shorter. That is why each pose carries its own trim and its own pivot rather
// than sharing one box; see the note above the archers for the rule.
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

// The arcane missile, one drawing per tier and all three the same shape.
const MISSILE_TRIM = [210, 246, 92, 20];

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
// FAST, and it is the fastest thing in the game at 520 against an arrow's 360.
// That is the whole character of the weapon: a bow arcs a shaft across the board
// and you watch it go, a musket cracks and the thing is already there. It also
// has to be, because this tower shoots across the whole map — at 360 a shot at
// something 450px away would spend a second and a quarter in the air, which on a
// 2.4s reload means the tower is holding a shot in flight half the time it is
// working.
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
  speed: 520,
  // Loud leaving the barrel and silent arriving, the same split as the arrow and
  // the arcane missile. A musket IS its report.
  fireSound: true,
  landSound: false
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

// The same rock, drawn bigger, for the two machines above. ONLY the picture
// changes — speed, arc, lead, sound and impact all come from `rock` — because
// the flight is what the Fire pose's 1.5s was chosen against, and a heavier
// rock that also flew slower would put the longest throw back over it. What a
// bigger rock does is in the damage number beside it.
export const rock2 = { ...rock, sprite: 'rock_t2', trim: ROCK2_TRIM };
export const rock3 = { ...rock, sprite: 'rock_t3', trim: ROCK3_TRIM };

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
  { ...watchtower,  ...archer,  tier: 1, name: 'Watchtower',     title: 'Archery Tier I',   unit: 'Novice Archer', cost: 70,  damage: 10, range: 190, cooldown: 1.00, colour: '#9C7248', targeting: true },
  { ...watchtower2, ...archer2, tier: 2, name: 'Archer Post',    title: 'Archery Tier II',  unit: 'Combat Archer', cost: 90,  damage: 15, range: 210, cooldown: 0.90, colour: '#7A5230', targeting: true },
  { ...watchtower3, ...archer3, tier: 3, name: 'Crossbow Tower', title: 'Archery Tier III', unit: 'Elite Archer',  cost: 140, damage: 25, range: 230, cooldown: 0.80, colour: '#B8B2A4', targeting: true },
  // `title` IS THE TOWER'S NAME ON THIS RUNG, not "Archery Tier IV", and it is the
  // first tier where those differ. The field heads the tier's entry in the
  // encyclopedia, and a tier 4 is a named building rather than a rung — the artist
  // asked for the card to read Musketeer Post, which is also what the upgrade
  // button's own icon says. Tiers 1 to 3 keep the plain form: they are the ladder,
  // and the column they sit in is what names the family.
  { ...post, ...musketeer, tier: 4, name: 'Musketeer Post', title: 'Musketeer Post', unit: 'Musketeer',
    cost: 200, damage: 60, range: 480, cooldown: 2.40, colour: '#A8A29A', targeting: true,
    // The upgrade button's picture when this is what the button buys. Every other
    // tier uses the generic arrow; this one has an icon of its own, so the tap
    // that turns a Crossbow Tower into a Musketeer Post shows what it is buying.
    // See towerItems in src/menu.js — a tier with no `glyph` still gets the arrow.
    glyph: 'musket',
    // WHOSE VOICE ANSWERS, and it is not the archers'. Two lines were recorded for
    // this tower specifically, so a Musketeer Post speaks for itself when it is
    // built and when its standing order changes. See familyCue in src/audio.js:
    // a tier with no `voice` falls through to its family's.
    voice: 'musketeer' }
];

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
    soldier: { ...paladin,   name: 'Paladin',   count: 3, hp: 300, damage: 7, cd: 0.80, speed: 74, respawn: 5, regen: 7, colour: '#4A6BA0' }
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
    cost: 170, damage: 36, splash: 98, range: 360, minRange: DEAD, cooldown: CYCLE, colour: '#8A7A56' }
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
// archery's 10 / 15 / 25 and artillery's 18 / 24 / 36.
//
// TEN PER CENT MORE OUTPUT THAN ARCHERY, and the ten per cent is the point.
//
// The cooldowns were 2.00 / 1.80 / 1.60, which put the two families at EXACTLY
// the same damage per second — 10.0, 16.7 and 31.3 for both, to a tenth. That
// was pleasing and it was wrong, and the artist said why in one line: a
// monastery costs more and reaches less, so it cannot also do the same work.
// Two towers where one is strictly worse is not a choice.
//
// So the reload came down a tenth and nothing else moved. 11.0, 18.3 and 34.5
// against archery's 10.0, 16.7 and 31.3 — the premium a shorter reach and a
// bigger bill have to buy.
//
// EVERYTHING ELSE THAT SEPARATES THEM IS SHAPE:
//
//   a monastery lands its output in half as many pieces, twice as big
//   an archery tower reaches 30px further at every tier, and costs 10 to 20 less
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
// `cost` 80 / 110 / 160 against archery's 70 / 90 / 140 — ten to twenty more at
// every rung, and the other half of what the faster reload is paying for.
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
export const monastery = [
  { ...shrine, ...priest,   tier: 1, name: 'Wayside Shrine', title: 'Monastery Tier I',   unit: 'Priest',
    cost: 80,  damage: 20, range: 150, cooldown: 1.82, colour: '#8C7A5C', targeting: true },
  { ...chapel, ...bishop,   tier: 2, name: 'Chapel',         title: 'Monastery Tier II',  unit: 'Bishop',
    cost: 110, damage: 30, range: 165, cooldown: 1.64, colour: '#7E6E52', targeting: true },
  { ...abbey,  ...cardinal, tier: 3, name: 'Abbey',          title: 'Monastery Tier III', unit: 'Cardinal',
    cost: 160, damage: 50, range: 180, cooldown: 1.45, colour: '#9A948A', targeting: true }
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
