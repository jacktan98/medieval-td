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
const TOWER_TRIM = [59, 24, 355, 459];
const ARCHER_TRIM = [184, 163, 144, 137];
const CAMP_TRIM = [50, 86, 393, 340];
const SPEAR_TRIM = [151, 167, 172, 130];

// Tier 1 artwork, reused for tiers 2 and 3 until they have their own. All three
// tiers are the SAME SIZE — scale is fixed by the export, so a tier reads as an
// upgrade from the stars over its roof, not from being bigger.
const watchtower = {
  sprite: 'archery_t1',
  spriteTrim: TOWER_TRIM,
  w: drawnW(TOWER_TRIM), h: drawnH(TOWER_TRIM),
  // Where the archer's feet go, as a fraction of the trim. NOT the middle of the
  // box: the ladder hangs off one side and drags the box centre away from the
  // deck, and the mount sits on the deck floor rather than the parapet rail.
  //
  // Re-derived, not re-measured, when the artist recoloured the tower's ground
  // patch. That edit shrank the trim from 375x464 to 355x459 while leaving the
  // building itself untouched — the deck is still the same absolute pixels,
  // row 113, x 124..391. A fraction of a box that changed size is a different
  // point, so the old [0.536, 0.281] was converted back to absolute (260.0,
  // 154.4) and divided by the new box. Anchor the archer to the art, not to the
  // bounding box the exporter happened to produce.
  mountFrac: [0.566, 0.284],
  shape: 'tower'
};

const archer = {
  gunner: 'archer_t1',
  gunnerTrim: ARCHER_TRIM,
  // Anchored at the FEET (0.982 down) on the standing axis of the legs (0.360
  // across), so the archer stands on the deck instead of hovering over it, and
  // mirrors about its own legs rather than the middle of a box the bow pulls
  // off-centre.
  gunnerPivot: [0.360, 0.982],
  spriteFaces: -1,
  // Where the arrow leaves the bow, measured from the feet as a fraction of the
  // archer's trim: a quarter of the way across in front, and 41% of the height
  // above. Taken from the centroid of the frontmost 22% of the art — the bow has
  // to be isolated like that because a naive centroid of the whole figure is
  // dominated by the hat and the quiver.
  //
  // Kept as fractions, not source pixels. Written as pixels it was 14.2 and 22.6
  // against a 200px export, and a 512px re-export left those numbers looking
  // fine while silently moving the arrow's origin to a third of the way up the
  // archer's shin.
  muzzle: [Math.round(0.249 * ARCHER_TRIM[2] * SCALE), -Math.round(0.411 * ARCHER_TRIM[3] * SCALE)]
};

// Range up across the board and cooldown down with it. The reach is what makes
// a tower feel useful in the first three waves, when there is only one or two of
// them on the map; the slower draw is what stops that reach turning archery into
// the only family worth building. Both were moved together and the pair was
// re-checked against tools/sim.mjs, not tuned one at a time.
export const archery = [
  { ...watchtower, ...archer, tier: 1, name: 'Watchtower',     cost: 70,  damage: 9,  range: 150, cooldown: 1.00, colour: '#9C7248' },
  { ...watchtower, ...archer, tier: 2, name: 'Archer Post',    cost: 90,  damage: 15, range: 170, cooldown: 0.90, colour: '#7A5230' },
  { ...watchtower, ...archer, tier: 3, name: 'Crossbow Tower', cost: 140, damage: 24, range: 190, cooldown: 0.80, colour: '#B8B2A4' }
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

export const barracks = [
  {
    ...camp, tier: 1, name: 'Militia Camp', cost: 70, range: 130, colour: '#6E7A6A',
    soldier: { ...spearman, count: 3, hp: 105, damage: 4, cd: 0.95, speed: 62, respawn: 8, regen: 4, colour: '#7C93B8' }
  },
  {
    ...camp, tier: 2, name: 'Guard Post', cost: 100, range: 165, colour: '#5E6B5C',
    soldier: { ...spearman, count: 3, hp: 145, damage: 5, cd: 0.90, speed: 66, respawn: 7, regen: 5, colour: '#6E86B4' }
  },
  {
    ...camp, tier: 3, name: "Knight's Hall", cost: 150, range: 200, colour: '#8A8478',
    soldier: { ...spearman, count: 3, hp: 195, damage: 6, cd: 0.85, speed: 70, respawn: 6, regen: 6, colour: '#5C79AE' }
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
