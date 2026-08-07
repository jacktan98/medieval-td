// Archery and barracks families. Tier 1 is built on an empty plot; tapping an
// existing tower upgrades it. Costs are cumulative spend, not refundable.
//
// Every figure in this file is drawn standing upright and is never rotated.
// Aiming mirrors it left or right and nothing else: rotating a standing figure
// to point at a target lays it on its side, which is the whole reason the
// archers looked wrong to begin with. Arrows are the exception — a projectile
// has no upright, so it rotates to point where it is flying.
//
// ONE SCALE FOR EVERYTHING. Every asset is exported on a 1000x1000 canvas, and
// the artist sized them against each other on that canvas — a soldier is small
// next to a tower because that is how tall a soldier is. So a single factor
// converts source pixels to game pixels for all of them, and no sprite is ever
// sized on its own. Change SCALE to resize the whole game's art together.
export const SCALE = 0.105;

const drawnW = trim => Math.round(trim[2] * SCALE);
const drawnH = trim => Math.round(trim[3] * SCALE);

// spriteTrim = the tight bounding box of the art inside its 1000x1000 export.
// mountFrac  = where the gunner stands as a fraction of the building box: the
//              middle of the platform.
// muzzle     = [sideways, vertical] from the gunner. The sideways part flips
//              with the sprite, so the arrow always leaves the bow.
// spriteFaces= which way the artwork is drawn, -1 for left.
// gunnerPivot= the body centre as a fraction of the gunner's trim — the point
//              it mirrors about, not the middle of a box a bow pulls off-centre.

const TOWER_TRIM = [210, 42, 579, 916];
const ARCHER_TRIM = [344, 322, 286, 273];
const CAMP_TRIM = [136, 152, 728, 680];
const SPEAR_TRIM = [300, 354, 343, 247];

// Tier 1 artwork, reused for tiers 2 and 3 until they have their own. All three
// tiers are the SAME SIZE — scale is fixed by the export, so a tier reads as an
// upgrade from the stars over its roof, not from being bigger.
const watchtower = {
  sprite: 'archery_t1',
  spriteTrim: TOWER_TRIM,
  w: drawnW(TOWER_TRIM), h: drawnH(TOWER_TRIM),
  mountFrac: [0.465, 0.284],
  shape: 'tower'
};

const archer = {
  gunner: 'archer_t1',
  gunnerTrim: ARCHER_TRIM,
  gunnerPivot: [0.436, 0.732],
  // The bow's belly sits 104 source px out from the body — measured, not
  // eyeballed, because the hat and quiver drown out the bow in a naive centroid.
  spriteFaces: -1,
  muzzle: [Math.round(104 * SCALE), 0]
};

export const archery = [
  { ...watchtower, ...archer, tier: 1, name: 'Watchtower',     cost: 70,  damage: 9,  range: 118, cooldown: 0.75, colour: '#9C7248' },
  { ...watchtower, ...archer, tier: 2, name: 'Archer Post',    cost: 90,  damage: 15, range: 134, cooldown: 0.65, colour: '#7A5230' },
  { ...watchtower, ...archer, tier: 3, name: 'Crossbow Tower', cost: 140, damage: 24, range: 152, cooldown: 0.55, colour: '#B8B2A4' }
];

// Barracks. These do not shoot — range is how far from the tower the rally
// point may sit, not a weapon range. soldier.count stays at 3 across all tiers
// on purpose: how many enemies you can hold at once is the dominant balance
// lever, so upgrades make the same wall tougher rather than wider.
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
  pivot: [0.640, 0.791],
  bodyFrac: SPEAR_BODY,
  spriteFaces: -1,
  r: Math.round(SPEAR_W * SPEAR_BODY / 2),
  lunge: 6            // px thrust when the spear goes in
};

export const barracks = [
  {
    ...camp, tier: 1, name: 'Militia Camp', cost: 70, range: 110, colour: '#6E7A6A',
    soldier: { ...spearman, count: 3, hp: 105, damage: 4, cd: 0.95, speed: 62, respawn: 8, regen: 4, colour: '#7C93B8' }
  },
  {
    ...camp, tier: 2, name: 'Guard Post', cost: 100, range: 120, colour: '#5E6B5C',
    soldier: { ...spearman, count: 3, hp: 145, damage: 5, cd: 0.90, speed: 66, respawn: 7, regen: 5, colour: '#6E86B4' }
  },
  {
    ...camp, tier: 3, name: "Knight's Hall", cost: 150, range: 130, colour: '#8A8478',
    soldier: { ...spearman, count: 3, hp: 195, damage: 6, cd: 0.85, speed: 70, respawn: 6, regen: 6, colour: '#5C79AE' }
  }
];

// Arrow. The only sprite that rotates: it points where it is flying. Drawn
// pointing left in the source, same as the figures.
export const arrow = {
  sprite: 'arrow_t1',
  trim: [400, 464, 200, 41],
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
