// Archery and barracks families. Tier 1 is built on an empty plot; tapping an
// existing tower upgrades it. Costs are cumulative spend, not refundable.
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
// THE THREE TOWERS ARE ON A 1024 CANVAS; EVERY FIGURE IS STILL ON 512.
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
const TOWER2_TRIM = [300, 142, 424, 740];
const ARCHER_TRIM = [184, 163, 144, 137];
const ARCHER2_TRIM = [184, 197, 144, 118];
const CAMP_TRIM = [207, 228, 610, 568];
const SPEAR_TRIM = [151, 167, 172, 130];
const SPEAR2_TRIM = [156, 198, 166, 117];

// All three tiers are the SAME SIZE — scale is fixed by the export, so a tier
// reads as an upgrade from the artwork and the stars over its roof, never from
// being bigger. Tier 3 has no drawing yet and borrows tier 2's rather than tier
// 1's: an upgrade must never make the building look like less than it did.
const watchtower = {
  sprite: 'archery_t1',
  spriteTrim: TOWER_TRIM,
  w: drawnW(TOWER_TRIM), h: drawnH(TOWER_TRIM),
  // The MIDDLE of the deck, source pixel (507, 441) inside the 1024 canvas.
  //
  // NOT the middle of the trim: the ladder and the flagpole hang off opposite
  // sides and drag the box centre away from the deck. The deck is found from the
  // four corner posts instead, and the mount is where the parallelogram's
  // diagonals cross. Anchor the archer to the art, never to the bounding box the
  // exporter happened to produce.
  //
  // The corners are the tops of the four legs, read out of the SVG: (356, 460),
  // (466, 382), (688-ish is tier 2's — here 651, 418) and (554, 505). The two
  // diagonals cross 7px apart rather than exactly, because a leg has width and
  // the rail caps differ; the mount is the midpoint of those two crossings,
  // which is 1.4 game px of slack on a 1024 canvas.
  mountFrac: [0.489, 0.383],
  // Where the building meets the ground: the centre of its grey shadow ellipse,
  // source (510.5, 730). See towerBox in src/towers.js for why this and not the
  // bounding box. Measured as the widest row of pixels of the shadow's exact
  // colour (150,150,150) — the widest row is the ellipse's own centre line, and
  // unlike the bounding box it survives the legs standing on top of it.
  groundFrac: [0.497, 0.862],
  // Tier 1 needs a front layer now, where the old drawing did not. The redraw
  // gave it full corner rails instead of the stub it used to have, and the post
  // on the deck's NEAREST corner — source x 547..561, running from y 397 down to
  // the planks — crosses the archer's legs. One rect, tight to the post.
  //
  // The far corner's post is the trap here, exactly as it is on tier 2: it sits
  // at x 457..474, well inside the archer's span, and it is BEHIND him. A rect
  // generous enough to take both would paint a brown bar across his chest.
  frontTrims: [[547, 397, 15, 60]],
  shape: 'tower'
};

// Tier 2: the same tower with a roof on it, and parts of the building are nearer
// the camera than the archer under it, so they have to be drawn OVER him. See
// frontTrims below.
const watchtower2 = {
  sprite: 'archery_t2',
  spriteTrim: TOWER2_TRIM,
  w: drawnW(TOWER2_TRIM), h: drawnH(TOWER2_TRIM),
  // The MIDDLE of the deck, source pixel (543, 510) in the 1024 canvas, found
  // the same way as tier 1's: leg tops at (392, 529), (502, 451), (688, 487),
  // (590, 574), mount where the diagonals cross.
  //
  // As a fraction this barely moved across the redraw — 0.587, 0.503 before —
  // which is the reassuring answer: the deck sits in the same place inside the
  // drawing, the drawing just got bigger.
  mountFrac: [0.574, 0.498],
  // Shadow centre, source (546.5, 793). Note it is NOT 0.5 across: the flagpole
  // leans out one side of the drawing, so centring the box put the tower 7px
  // left of where it should stand.
  groundFrac: [0.581, 0.880],
  // The parts of the tower that stand between the archer and the camera, as
  // rects in source pixels, re-drawn after him. Measured off the artwork; see
  // assets/towers/README.md for how, and re-measure after a redraw.
  //
  //   [47, 23, 372, 127]  everything down to y=149: the roof, and the post heads
  //                       still hidden behind it at that height.
  //   [200, 150, 67, 20]  the roof's front tip, which hangs below that cut. It
  //                       stops at x=266 on purpose — one pixel further and it
  //                       catches the FAR post, which is behind the archer and
  //                       would land a brown patch on his helmet.
  //   [244, 150, 23, 120] the near post, the one on the deck's nearest corner,
  //                       tight to its outline so nothing but post is inside.
  frontTrims: [[583, 392, 15, 124]],
  shape: 'tower'
};

const archer = {
  gunner: 'archer_t1',
  gunnerTrim: ARCHER_TRIM,
  // Anchored at the FEET (0.982 down) on the BODY's axis (0.451 across).
  //
  // That across figure was 0.360 and it was wrong. This art is seen from above,
  // so the point the man stands on is the middle of his torso — measured at the
  // rows where the bow arc separates from the body, source x 215..285, centre
  // 249. At 0.360 the anchor sat 13px to the LEFT of that, which drew the whole
  // figure 13px right of wherever he was mounted. Centring the mount on the deck
  // did not centre the man, and "standing too far right" was the symptom.
  //
  // A gunner also mirrors about this point, so an anchor off the body's middle
  // swings him sideways when he turns: 34px at 0.360, 14px now.
  gunnerPivot: [0.451, 0.982],
  spriteFaces: -1,
  // Where the arrow leaves the bow, measured from the feet as a fraction of the
  // archer's trim: 34% of the way across in front, and 41% of the height above.
  // Taken from the centroid of the frontmost 22% of the art — the bow has to be
  // isolated like that because a naive centroid of the whole figure is dominated
  // by the hat and the quiver.
  //
  // The across figure was 0.249 while the anchor was at 0.360. Both moved by the
  // same 13px when the anchor did, so the arrow still leaves the same absolute
  // point of the drawing — source x 200 — which is the invariant that matters.
  //
  // Kept as fractions, not source pixels. Written as pixels it was 14.2 and 22.6
  // against a 200px export, and a 512px re-export left those numbers looking
  // fine while silently moving the arrow's origin to a third of the way up the
  // archer's shin.
  muzzle: [Math.round(0.341 * ARCHER_TRIM[2] * SCALE), -Math.round(0.411 * ARCHER_TRIM[3] * SCALE)]
};

// Tier 2's archer: helmet instead of a hat, so he is 19 source px shorter, and
// the artist drew him 15px further down the same canvas. Both of those move the
// numbers below even though the man is unchanged from the waist down — every
// anchor here is a fraction of a trim, and this trim is a different box.
//
// Derived, not re-eyeballed. The base of the figure is pixel-for-pixel where
// tier 1's is (same centroid, same 201..275 span, 15 rows lower), so the feet
// are tier 1's feet plus 15 and the bow is tier 1's bow plus 15. Everything
// below is that one shift, divided by the new box.
const archer2 = {
  gunner: 'archer_t2',
  gunnerTrim: ARCHER2_TRIM,
  // Same absolute point as tier 1's feet, 15px down: source (249, 312.5). Same
  // body-centre correction as tier 1 — see the note there.
  gunnerPivot: [0.451, 0.979],
  spriteFaces: -1,
  // Same bow, so the same 0.341 across — but 0.477 of a shorter box, not 0.411
  // of a taller one, which is the same 56px above the feet. The muzzle comes out
  // at exactly tier 1's [10, -12]: two different fractions describing one point.
  muzzle: [Math.round(0.341 * ARCHER2_TRIM[2] * SCALE), -Math.round(0.477 * ARCHER2_TRIM[3] * SCALE)]
};

// Range up across the board and cooldown down with it. The reach is what makes
// a tower feel useful in the first three waves, when there is only one or two of
// them on the map; the slower draw is what stops that reach turning archery into
// the only family worth building. Both were moved together and the pair was
// re-checked against tools/sim.mjs, not tuned one at a time.
export const archery = [
  { ...watchtower,  ...archer,  tier: 1, name: 'Watchtower',     cost: 70,  damage: 9,  range: 150, cooldown: 1.00, colour: '#9C7248' },
  { ...watchtower2, ...archer2, tier: 2, name: 'Archer Post',    cost: 90,  damage: 15, range: 170, cooldown: 0.90, colour: '#7A5230' },
  { ...watchtower2, ...archer2, tier: 3, name: 'Crossbow Tower', cost: 140, damage: 24, range: 190, cooldown: 0.80, colour: '#B8B2A4' }
];

// Barracks. These do not shoot — `range` is how far from the tower the rally
// point may sit, not a weapon range. The player moves that rally point, so the
// number is a real upgrade rather than bookkeeping: 130 -> 165 -> 200 turns a
// squad that can only cover the nearest bend into one that can be sent to
// whichever stretch of road is leaking.
//
// soldier.count stays at 3 across all tiers on purpose: how many enemies you can
// hold at once is the dominant balance lever, so upgrades make the same wall
// tougher rather than wider.
const camp = {
  sprite: 'barracks_t1',
  spriteTrim: CAMP_TRIM,
  w: drawnW(CAMP_TRIM), h: drawnH(CAMP_TRIM),
  // Shadow centre, source (518.5, 628). This is the one that was visibly wrong:
  // the stakes planted in front of the tent reach 68 source px below the shadow,
  // and the old bounding-box rule pinned THEM to the ground, standing the tent
  // 22px too high on its plot.
  groundFrac: [0.511, 0.704],
  shape: 'camp'
};

// The soldier's collision radius is DERIVED from the drawn art, not chosen, so
// the formation and tools/formation.mjs always agree with what you can see.
const SPEAR_W = drawnW(SPEAR_TRIM);
const SPEAR_BODY = 0.341;

const spearman = {
  sprite: 'soldier_t1',
  spriteTrim: SPEAR_TRIM,
  // Feet on the anchor, standing axis of the legs across — the same convention
  // as the archer's gunnerPivot, so "where a figure is" means one thing.
  pivot: [0.657, 0.980],
  bodyFrac: SPEAR_BODY,
  spriteFaces: -1,
  // A spearman leaves a body too, then musters again from the barracks once his
  // respawn timer runs out. The body is scenery and nothing else — a dead
  // soldier stops blocking the instant he falls, so the enemy he was holding
  // walks straight over him.
  //
  // deadPivot is the LIVING figure's feet located inside the dead trim, not
  // anything measured off the corpse; see the note in data/waves.js.
  dead: 'dead_soldier_t1',
  deadTrim: [150, 206, 212, 100],
  deadPivot: [0.538, 0.884],
  r: Math.round(SPEAR_W * SPEAR_BODY / 2),
  lunge: 6            // px thrust when the spear goes in
};

// Tier 2's spearman: helmet instead of a hat, and the artist drew him 17px right
// and 19px down the same canvas. Same body, different box, so every fraction
// below had to be re-derived even though nothing about the man changed.
//
// The 17/19 is measured, not eyeballed: it is the shift that best overlays the
// two silhouettes (IoU 0.80). It is the BODY that agrees at that shift, not the
// spear — the spear is drawn a little differently, which is also why the trim
// did not simply move with the figure. The body is the right thing to match: a
// man stands where his body is.
const SPEAR2_W = drawnW(SPEAR2_TRIM);
// The same 59 source px of torso as tier 1, over a 166-wide box instead of 172.
// Both come out at r = 6, so the collision radius — and the formation, and the
// balance that rests on it — is unchanged by the new artwork.
const SPEAR2_BODY = 0.354;

const spearman2 = {
  sprite: 'soldier_t2',
  spriteTrim: SPEAR2_TRIM,
  // Tier 1's feet plus (17, 19): source (281.0, 313.4).
  pivot: [0.753, 0.986],
  bodyFrac: SPEAR2_BODY,
  spriteFaces: -1,
  dead: 'dead_soldier_t2',
  deadTrim: [169, 198, 201, 116],
  // The living figure's feet located inside the dead trim, same as every other
  // deadPivot. It lands at the very bottom edge of the corpse art, because this
  // pose was drawn about 13 source px higher against its own box than tier 1's
  // was — so the body sits ~3 game px further above the death spot than tier
  // 1's does. That is the artist's placement showing through, not a bad sum, and
  // 3px is small enough to leave alone. corpse-test.html is where to judge it.
  deadPivot: [0.557, 0.995],
  r: Math.round(SPEAR2_W * SPEAR2_BODY / 2),
  lunge: 6
};

export const barracks = [
  {
    ...camp, tier: 1, name: 'Militia Camp', cost: 70, range: 130, colour: '#6E7A6A',
    soldier: { ...spearman, count: 3, hp: 105, damage: 4, cd: 0.95, speed: 62, respawn: 8, regen: 4, colour: '#7C93B8' }
  },
  {
    ...camp, tier: 2, name: 'Guard Post', cost: 100, range: 165, colour: '#5E6B5C',
    soldier: { ...spearman2, count: 3, hp: 145, damage: 5, cd: 0.90, speed: 66, respawn: 7, regen: 5, colour: '#6E86B4' }
  },
  {
    ...camp, tier: 3, name: "Knight's Hall", cost: 150, range: 200, colour: '#8A8478',
    soldier: { ...spearman2, count: 3, hp: 195, damage: 6, cd: 0.85, speed: 70, respawn: 6, regen: 6, colour: '#5C79AE' }
  }
];

// Arrow. The only sprite that rotates: it points where it is flying. Drawn
// pointing left in the source, same as the figures.
export const arrow = {
  sprite: 'arrow_t1',
  trim: [203, 246, 100, 20],
  faces: -1
};

// The four quadrants of the build menu, in N/E/S/W order. A family with no
// tiers yet still takes its quadrant, drawn locked — the layout is the same
// on day one as it will be when all four are in, so nothing moves under the
// player's thumb as families land.
export const families = [
  { id: 'archery',   name: 'Archery',   glyph: 'bow',      tiers: archery },
  { id: 'barracks',  name: 'Barracks',  glyph: 'swords',   tiers: barracks },
  { id: 'siege',     name: 'Siege',     glyph: 'catapult', tiers: null },
  { id: 'monastery', name: 'Monastery', glyph: 'cross',    tiers: null }
];

export const projectileSpeed = 360;
