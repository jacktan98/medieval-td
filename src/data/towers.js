// Archery and barracks families. Tier 1 is built on an empty plot; tapping an
// existing tower upgrades it. Costs are cumulative spend, not refundable.
//
// EVERY sprite in this file is drawn top-down. Buildings are seen from above at
// a slight angle, units straight down. That is what lets a gunner rotate freely
// to aim instead of mirroring — a figure seen from above has no wrong way up.
//
// w / h      = the size the building is drawn at. towerBox() in towers.js turns
//              this into a world-space box anchored 12px below the plot centre.
// sprite / spriteTrim
//            = building artwork, and the tight bounding box of the art inside
//              its source PNG. Cropping at draw time keeps the exported files
//              untouched. Tiers with no sprite fall back to a vector building.
// mountFrac  = where the gunner stands, as a fraction of the building box —
//              the centre of the platform. A fraction rather than pixels so it
//              stays correct when a tier's w/h change.
// muzzle     = [forward, sideways] from the gunner, along its aim. Rotated with
//              the sprite, so the arrow always leaves the bow.
// gunner*    = the gunner sprite, its trim, the body centre as a fraction of
//              that trim (the point it rotates about), the body's diameter as a
//              fraction of trim width, the direction the weapon points in the
//              source art in degrees, and the drawn body radius.

// Tier 1 artwork, reused for tiers 2 and 3 until they have their own. Sizes
// differ per tier, so everything positional here is a fraction, not a pixel.
const watchtower = {
  sprite: 'archery_t1',
  spriteTrim: [210, 42, 579, 916],
  mountFrac: [0.449, 0.314]
};

const archer = {
  gunner: 'archer_t1',
  gunnerTrim: [344, 322, 286, 273],
  gunnerPivot: [0.436, 0.732],
  gunnerBodyFrac: 0.413,
  // The bow's belly, 104 source px ahead of the body centre. Measured from the
  // art rather than eyeballed; the hat and quiver sit at -90 and -45 and will
  // skew any naive centroid of the brown pixels.
  gunnerAim: 180,
  muzzle: [11, 0]
};

export const archery = [
  {
    ...watchtower, ...archer,
    tier: 1,
    name: 'Watchtower',
    cost: 70,
    damage: 9,
    range: 118,
    cooldown: 0.75,
    colour: '#9C7248',
    shape: 'tower',
    w: 52, h: 82,
    gunnerR: 6
  },
  {
    ...watchtower, ...archer,
    tier: 2,
    name: 'Archer Post',
    cost: 90,
    damage: 14,
    range: 134,
    cooldown: 0.65,
    colour: '#7A5230',
    shape: 'tower',
    w: 58, h: 92,
    gunnerR: 7
  },
  {
    ...watchtower, ...archer,
    tier: 3,
    name: 'Crossbow Tower',
    cost: 140,
    damage: 22,
    range: 152,
    cooldown: 0.55,
    colour: '#B8B2A4',
    shape: 'tower',
    w: 64, h: 101,
    gunnerR: 8
  }
];

// Barracks. These do not shoot — range is how far from the tower the rally
// point may sit, not a weapon range. soldier.count stays at 3 across all tiers
// on purpose: how many enemies you can hold at once is the dominant balance
// lever, so upgrades make the same wall tougher rather than changing the shape
// of the defence.

// Soldier artwork, same top-down treatment as the archer. Tier 1 art stands in
// for tiers 2 and 3 — a knight is a bigger spearman for now, which beats
// reverting to a plain circle halfway up the upgrade path.
const spearman = {
  sprite: 'soldier_t1',
  spriteTrim: [300, 354, 343, 247],
  pivot: [0.640, 0.791],
  bodyFrac: 0.341,
  spriteAim: -153
};

export const barracks = [
  {
    tier: 1,
    name: 'Militia Camp',
    cost: 70,
    range: 110,
    colour: '#6E7A6A',
    shape: 'camp',
    sprite: 'barracks_t1',
    spriteTrim: [136, 152, 728, 680],
    w: 62, h: 58,
    soldier: { ...spearman, count: 3, hp: 70, damage: 3, cd: 1.00, speed: 60, respawn: 10, regen: 3, r: 7, colour: '#7C93B8' }
  },
  {
    tier: 2,
    name: 'Guard Post',
    cost: 100,
    range: 120,
    colour: '#5E6B5C',
    shape: 'camp',
    sprite: 'barracks_t1',
    spriteTrim: [136, 152, 728, 680],
    w: 68, h: 64,
    soldier: { ...spearman, count: 3, hp: 95, damage: 4, cd: 0.95, speed: 64, respawn: 9, regen: 3.5, r: 7, colour: '#6E86B4' }
  },
  {
    tier: 3,
    name: "Knight's Hall",
    cost: 150,
    range: 130,
    colour: '#8A8478',
    shape: 'camp',
    sprite: 'barracks_t1',
    spriteTrim: [136, 152, 728, 680],
    w: 74, h: 69,
    soldier: { ...spearman, count: 3, hp: 125, damage: 5, cd: 0.90, speed: 68, respawn: 8, regen: 4, r: 8, colour: '#5C79AE' }
  }
];

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
