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
const CAMP_TRIM = [207, 249, 610, 526];
const CAMP2_TRIM = [200, 197, 624, 630];
const CAMP3_TRIM = [200, 201, 624, 621];
const SPEAR_TRIM = [172, 198, 168, 116];
const SPEAR_ATK_TRIM = [133, 198, 196, 116];
const SPEAR2_TRIM = [174, 196, 163, 120];
const SPEAR2_ATK_TRIM = [155, 196, 181, 120];
const SPEAR3_TRIM = [201, 196, 110, 120];
const SPEAR3_ATK_TRIM = [166, 196, 145, 120];

// THE MONASTERY, on the same 1024 canvas as the other three buildings and the
// same 512 as every figure.
//
// Tiers 2 and 3 trim to exactly the same rect, and that is the drawing rather
// than a copied number: the abbey is the chapel rebuilt in stone inside the same
// timber frame, so its roof, its posts and its stair are at the same source
// pixels and only the walls change. Both shadow paths are byte-identical in the
// two SVGs as well. Tier 1 is a different building — an open deck with no roof —
// and trims to a box of its own.
const MON_TRIM = [262, 197, 500, 630];
const MON2_TRIM = [296, 128, 431, 768];
const MON3_TRIM = [296, 128, 431, 768];

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

// THE ARCANE MISSILE, and the first projectile in the game whose job is not
// damage.
//
// It is STEERED like an arrow — no `arc` — so it chases the man it was aimed at
// and dies with him. What it does on arrival is take a bite out of his health and
// then SLOW HIM DOWN, and the second half is the whole family: a monastery does
// not kill things, it holds them under everybody else's towers for longer.
//
// `speed` 130 against an arrow's 360, which is the slowest thing in the air in
// this game — slower even than a lobbed rock's 300 horizontal — and it is meant
// to be watched. At tier 1's reach of 175 the longest flight is 1.35s, so a
// missile fired at a marching thug arrives about 85px behind where it was aimed
// and follows him there. That lag is the tower's character: a monastery is
// always working on where the enemy WAS, which is why it is a support weapon and
// not a sniper.
//
// It is STEERED and it also has a SPLASH, which no other projectile in the game
// combines — an arrow chases one man and hits him alone, a rock is committed to a
// patch of ground. This one chases a man and then catches whoever is standing
// round him when it arrives. That pairing is the family: it is aimed at somebody,
// and what it does lands on everybody.
//
// `slow` is { factor, seconds }: the enemy walks at `factor` of its own speed
// for that long. It REFRESHES rather than stacks, and the STRONGER factor wins
// while both are running — see hit() in projectiles.js. Stacking would let three
// shrines multiply into a stop, and "how long since the last missile" is a thing
// the player can see where "how many are on him" is not.
//
// 0.50 / 0.42 / 0.35, and the duration is a hair over the reload at every tier —
// 2.2s against 1.45, 2.6 against 1.25, 3.0 against 1.05 — so a monastery working
// on the same stretch of road keeps it slowed continuously rather than in
// pulses. That overlap is the whole reason the two numbers move together when
// the family is retuned.
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
  speed: 130,
  slow: { factor: 0.50, seconds: 2.2 },
  // It announces itself leaving the staff and arrives quietly, the same way an
  // arrow does — see the two flags on `arrow`.
  fireSound: true,
  landSound: false
};

// The same missile, drawn from each tier's own file and carrying that tier's
// slow. ONLY the picture and the two slow numbers change: the speed and the grip
// are what the flight was chosen against, and a tier 3 missile that also flew
// faster would stop being the thing you watch.
export const missile2 = {
  ...missile,
  sprite: 'missile_t2',
  slow: { factor: 0.42, seconds: 2.6 }
};
export const missile3 = {
  ...missile,
  sprite: 'missile_t3',
  slow: { factor: 0.35, seconds: 3.0 }
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
// Only archery carries `targeting` for now, and the flag is on the tier rather
// than on the family so a future machine can opt in without this list moving.
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

export const archery = [
  { ...watchtower,  ...archer,  tier: 1, name: 'Watchtower',     title: 'Archery Tier I',   unit: 'Novice Archer', cost: 70,  damage: 9,  range: 190, cooldown: 1.00, colour: '#9C7248', targeting: true },
  { ...watchtower2, ...archer2, tier: 2, name: 'Archer Post',    title: 'Archery Tier II',  unit: 'Combat Archer', cost: 90,  damage: 15, range: 210, cooldown: 0.90, colour: '#7A5230', targeting: true },
  { ...watchtower3, ...archer3, tier: 3, name: 'Crossbow Tower', title: 'Archery Tier III', unit: 'Elite Archer',  cost: 140, damage: 24, range: 230, cooldown: 0.80, colour: '#B8B2A4', targeting: true }
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
const camp = {
  sprite: 'barracks_t1',
  spriteTrim: CAMP_TRIM,
  w: drawnW(CAMP_TRIM), h: drawnH(CAMP_TRIM),
  // Shadow centre, source (521.1, 605.4). This is the one that was visibly
  // wrong under the old bounding-box rule: the stakes planted in front of the
  // tent reach 68 source px below the shadow, and the box pinned THEM to the
  // ground, standing the whole tent 22px too high on its plot.
  groundFrac: [0.515, 0.678],
  // WHERE THE PENNANT ENDS, as a fraction of the trim — the bottom of the cloth,
  // measured by `node tools/flag.mjs`. The muster rings hang under it, so this is
  // a position in the artwork rather than a corner of a box: the tent flies its
  // flag from a pole standing beside it and both huts fly theirs off the ridge,
  // and one shared offset would be right for at most one of the three.
  flagFrac: [0.911, 0.116],
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
  flagFrac: [0.917, 0.097],
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
  flagFrac: [0.917, 0.098],
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

export const barracks = [
  {
    ...camp, tier: 1, name: 'Militia Camp', title: 'Barracks Tier I', cost: 70, range: 165, colour: '#6E7A6A',
    soldier: { ...spearman,  name: 'Spearman',  count: 3, hp: 105, damage: 3, cd: 0.95, speed: 62, respawn: 8, regen: 4, colour: '#7C93B8' }
  },
  {
    ...camp2, tier: 2, name: 'Guard Post', title: 'Barracks Tier II', cost: 100, range: 180, colour: '#5E6B5C',
    soldier: { ...spearman2, name: 'Pikeman',   count: 3, hp: 145, damage: 4, cd: 0.90, speed: 66, respawn: 7, regen: 5, colour: '#6E86B4' }
  },
  {
    ...camp3, tier: 3, name: "Knight's Hall", title: 'Barracks Tier III', cost: 150, range: 195, colour: '#8A8478',
    soldier: { ...spearman3, name: 'Swordsman', count: 3, hp: 195, damage: 5, cd: 0.85, speed: 70, respawn: 6, regen: 6, colour: '#5C79AE' }
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
    cost: 90,  damage: 19, splash: 75, range: 300, minRange: DEAD, cooldown: CYCLE, colour: '#7A6A4A' },
  { ...mangonel,  tier: 2, name: 'Mangonel',  title: 'Artillery Tier II',  unit: 'Mangonel Engineer',
    cost: 115, damage: 27, splash: 86, range: 330, minRange: DEAD, cooldown: CYCLE, colour: '#6E6042' },
  { ...trebuchet, tier: 3, name: 'Trebuchet', title: 'Artillery Tier III', unit: 'Trebuchet Engineer',
    cost: 170, damage: 37, splash: 98, range: 360, minRange: DEAD, cooldown: CYCLE, colour: '#8A7A56' }
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
// A monastery is SLOW AT EVERY LEVEL, deliberately and three times over: it
// reloads slower than a bow, its missile is the slowest thing in the air, and
// what the missile does is take speed off everything it lands among. The damage
// is real but it is not the point — 5, 8 and 12 against archery's 9, 15 and 24,
// so a shrine kills a militiaman in seven shots and a giant never.
//
// WHY IT IS WORTH BUILDING ANYWAY. Every other tower's output is capped by how
// long an enemy stays in reach, and that is the one number a monastery moves.
// A thug held at 0.48 of its speed spends twice as long under every bow, every
// catapult and every spear on the board — so a monastery is worth exactly as much
// as the towers around it, which is a different question from "how much damage
// does it do" and the reason the family exists.
const shrine = {
  sprite: 'monastery_t1',
  spriteTrim: MON_TRIM,
  w: drawnW(MON_TRIM), h: drawnH(MON_TRIM),
  // The MIDDLE of the deck, source pixel (512.6, 421.1) in the 1024 canvas.
  //
  // Found the way tier 3 archery's is rather than the way tiers 1 and 2 are: the
  // deck is one <path> in the SVG with corners (470, 364), (663, 394), (559, 484)
  // and (354, 437), and it is NOT a parallelogram — its two diagonals cross
  // 10.4px apart at their midpoints, so "where the diagonals cross" is not
  // defined on it. This is the polygon's AREA CENTROID, which is the same point
  // on a true parallelogram and the right one here.
  mountFrac: [0.501, 0.356],
  // Where the building meets the ground: the centre of its shadow ellipse,
  // source (473.9, 727.0). The SVG stores that shadow as a single #37422f path
  // spanning 265..683 by 637..817, whose centre is (473.85, 726.98); the ellipse
  // fit in tools/shadow.mjs reads (473.3, 726.5) out of the PNG without being
  // shown the SVG, which is the check.
  //
  // NOT 0.5 across, and by a long way. The flagpole and its pennant hang off the
  // right of this drawing and the stair runs off the left, so the box centre is
  // 39 source px right of where the building actually stands.
  groundFrac: [0.424, 0.841],
  // The post on the deck's NEAREST corner — source x 552..565, from the deck rail
  // at y 385 down to the floor at 484 — which crosses the priest whenever he is
  // mirrored to face right. Padded 2px for the black stroke the PNG draws around
  // a shape the SVG stores without one.
  //
  // The far post at x 464..478 is the usual trap: it is inside the priest's span
  // and BEHIND him, so the rect stays tight to the near one.
  frontTrims: [[550, 383, 18, 104]],
  // NO frontPolys, and that is measured rather than forgotten. The near-left rail
  // is source (362,410) (560,453) (558,461) (360,419) — a real rail in the right
  // place — and it passes UNDER him: across his span it runs y 433 to 450, and
  // his shadow is at 433. It is the deck's near edge board, exactly as tier 3
  // archery's is.
  shape: 'tower'
};

// Tier 2: a roof goes on, and the legs get stone footings. Same frame, so the
// deck is in nearly the same place — but re-measured rather than carried across,
// because the whole drawing sits in a different box.
const chapel = {
  sprite: 'monastery_t2',
  spriteTrim: MON2_TRIM,
  w: drawnW(MON2_TRIM), h: drawnH(MON2_TRIM),
  // The deck's area centroid, source (547.4, 491.0), from the face with corners
  // (505, 434), (698, 464), (594, 554) and (388, 506).
  mountFrac: [0.583, 0.473],
  // Shadow centre, source (512.0, 795.0) — the SVG path spans 38.54..208.61 by
  // 259.48..332.60 under a 2.5x scale and a (203.06, 54.91) offset, and the PNG
  // fit reads (511.4, 794.5).
  groundFrac: [0.501, 0.868],
  // The near corner post, source x 587..600 from the roof plate at y 362 down to
  // the deck at 551. Taller than tier 1's for the same reason tier 2 archery's
  // is: there is a roof above the deck now, and the post runs the whole way up to
  // carry it.
  frontTrims: [[585, 360, 18, 194]],
  shape: 'tower'
};

// Tier 3: the timber box becomes a stone one. IDENTICAL ENVELOPE to tier 2 —
// same trim, same shadow path to the byte — because the artist rebuilt the walls
// inside the same frame and left the roof, the posts and the stair where they
// were. Every number is still measured from tier 3's own file; they simply come
// back the same, which is the finding rather than a shortcut.
const abbey = {
  sprite: 'monastery_t3',
  spriteTrim: MON3_TRIM,
  w: drawnW(MON3_TRIM), h: drawnH(MON3_TRIM),
  // The deck, now the top course of the stonework: (505, 435), (697, 464),
  // (593, 555), (388, 507), centroid (546.6, 492.0). One pixel from tier 2's,
  // which is what "the same frame" looks like in numbers.
  mountFrac: [0.581, 0.474],
  groundFrac: [0.501, 0.868],
  // The same near post at the same source pixels, x 587..600, y 362..551.
  frontTrims: [[585, 360, 18, 194]],
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
// `cooldown` 1.45 / 1.25 / 1.05 against archery's 1.00 / 0.90 / 0.80. Slower than
// a bow at every tier, which is the artist's first instruction — "the attack rate
// is slow" — and it started at 2.40 / 2.10 / 1.80, which was slower still and was
// too slow to matter. See the measurements below.
//
// `damage` 5 / 8 / 12, a little over half archery's at every tier and explicitly
// not the priority. What an upgrade actually buys here is the SLOW: 0.50 for 2.2
// seconds becomes 0.35 for 3.0, which is the difference between an enemy that is
// dawdling and one that is wading. Compare artillery, where an upgrade buys
// blast, and archery, where it buys rate.
//
// `range` 175 / 195 / 215, a notch under archery's 190 / 210 / 230 and elliptical
// like every reach in the game. It is shorter on purpose: this tower wants to sit
// where the road is about to pass a killing ground, not where it can see the most
// of it, and giving it archery's reach would make "build a monastery first"
// correct on every plot.
//
// `cost` 80 / 105 / 155 against archery's 70 / 90 / 140. Ten to fifteen gold more
// at every rung, which is what stops a shrine being the cheapest way to hold wave
// 1 — it is worse at that than either of the two towers it costs the same as, and
// it should be.
//
// `splash` 55 / 65 / 75, AND IT IS WHAT MAKES THE FAMILY WORK AT ALL. It was not
// in the first version and the first version was worthless — measured, not
// guessed: swapping one archery tower for a monastery in the best mixed build
// took map 1 from 8 wins in 8 to 0 in 8, and map 2 from 7 to 0.
//
// The reason is arithmetic rather than tuning. A single-target slow that lands
// every second or two catches ONE enemy, and the waves this game sends are 14,
// 18, 24, 34 militia deep — so a shrine spent its whole life making one man in
// thirty walk slower while the plot it stood on stopped shooting. "It will slow
// down enemies" is plural, and a tower that can only ever slow one of them is not
// doing the thing it was asked to do.
//
// So the missile leaves a PATCH, exactly as a rock does, and everything standing
// in it takes the damage and the slow together. Nothing new was needed for it:
// land() in projectiles.js already walks the victims of any shot with a `splash`,
// and the slow rides along with the hit. It stays under a catapult's 75 / 86 / 98
// at every tier, which is the line that keeps the two families apart: artillery is
// a blast that happens to cover ground, and this is a chill that happens to sting.
//
// WHERE IT ALL LANDS, at TWENTY SEEDS. The build is the map's best mix with one
// archery tower swapped for a monastery — the comparison worth having, because a
// shrine and a watchtower want the same plot — and a siege swap beside it for
// scale. Map 3 swaps two of eleven rather than one of six.
//
//                                      wins      median lives
//   map 1  3 archery + 3 barracks      19/20      4
//            one swapped for a shrine   7/20      3
//            one swapped for a siege   19/20      4
//   map 2  3 archery + 3 barracks      13/20      2
//            one swapped for a shrine  12/20      6
//            one swapped for a siege   20/20     13
//   map 3  5 archery + 6 barracks      11/20      1
//            two swapped for shrines    9/20      2
//            two swapped for siege     11/20      2
//
// READ THAT HONESTLY. On maps 2 and 3 a monastery is about a wash — it wins as
// often as the bow it replaced and holds MORE lives when it wins, which is what a
// slow is supposed to buy. On map 1 it is a mistake, and that is the map with six
// plots, the densest waves per yard of road, and no second road to cover. A
// family that is right on two maps and wrong on the third is the same shape
// artillery already has, in the other direction.
//
// Eight seeds said 3/8 and 6/8 for the same two numbers, which is why they are
// not the numbers quoted. A build sitting on the win/loss boundary needs twenty.
//
// NO `targeting`. An archery tower can be told what to shoot at because it kills
// things and the player has an opinion about which thing; a monastery's answer is
// almost always "whatever is nearest the exit", which is what a tower with no
// button already does. It is the obvious thing to add if the family turns out to
// want it — the flag is per TIER, so it costs one word per row.
export const monastery = [
  { ...shrine, ...priest,   tier: 1, name: 'Wayside Shrine', title: 'Monastery Tier I',   unit: 'Priest',
    cost: 80,  damage: 5,  splash: 55, range: 175, cooldown: 1.45, colour: '#8C7A5C' },
  { ...chapel, ...bishop,   tier: 2, name: 'Chapel',         title: 'Monastery Tier II',  unit: 'Bishop',
    cost: 105, damage: 8,  splash: 65, range: 195, cooldown: 1.25, colour: '#7E6E52' },
  { ...abbey,  ...cardinal, tier: 3, name: 'Abbey',          title: 'Monastery Tier III', unit: 'Cardinal',
    cost: 155, damage: 12, splash: 75, range: 215, cooldown: 1.05, colour: '#9A948A' }
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
