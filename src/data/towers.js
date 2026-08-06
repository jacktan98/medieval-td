// Archery family. Tier 1 is built on an empty plot; tapping an existing
// tower upgrades it. Costs are cumulative spend, not refundable.
//
// w / h    = the size the tower building is drawn at. towerBox() in towers.js
//            turns this into a world-space box anchored 12px below the plot
//            centre; mount and muzzle are measured from that box's top-left.
// mount    = where the gunner's FEET stand, offset from the box's top-left.
// muzzle   = where the projectile leaves the gunner, offset from the gunner's
//            own feet. y is negative because it is measured upward. Mirrored
//            on x when the tower aims left.
// gunner   = sprite key in assets.js
// sprite / spriteTrim
//          = artwork for the BUILDING, drawn to fill w x h. Tiers without one
//            fall back to the vector building in render.js, so a family can be
//            wired up one tier at a time as art arrives.
// gunnerTrim
//          = [sx, sy, sw, sh] — the tight bounding box of the GUNNER artwork
//            inside its source PNG. Source art carries 20-40% transparent
//            margin, which would otherwise shrink and off-centre the drawing.
//            Cropped at draw time so the art files stay as exported; if a PNG
//            is ever re-cut tight, set its trim to [0, 0, width, height].
// gw / gh  = size the gunner sprite is drawn at, standing on the mount point.
//            Keep gw/gh at the trim box's aspect ratio or the art squashes.

export const archery = [
  {
    tier: 1,
    name: 'Watchtower',
    cost: 70,
    damage: 9,
    range: 118,
    cooldown: 0.75,
    colour: '#9C7248',
    shape: 'tower',
    w: 44, h: 68,
    mount: [22, 10],
    muzzle: [10, -20],
    gunner: 'archer_t1',
    gunnerTrim: [96, 153, 268, 407],
    gw: 20, gh: 30
  },
  {
    tier: 2,
    name: 'Archer Post',
    cost: 90,
    damage: 14,
    range: 134,
    cooldown: 0.65,
    colour: '#7A5230',
    shape: 'tower',
    w: 48, h: 76,
    mount: [24, 11],
    muzzle: [9, -19],
    gunner: 'archer_t2',
    gunnerTrim: [61, 44, 321, 569],
    gw: 18, gh: 32
  },
  {
    tier: 3,
    name: 'Crossbow Tower',
    cost: 140,
    damage: 22,
    range: 152,
    cooldown: 0.55,
    colour: '#B8B2A4',
    shape: 'tower',
    w: 56, h: 88,
    mount: [28, 13],
    muzzle: [12, -24],
    gunner: 'crossbow_t3',
    gunnerTrim: [7, 63, 405, 467],
    gw: 26, gh: 30
  }
];

// Barracks. These do not shoot — range is how far from the tower the rally
// point may sit, not a weapon range. soldier.count stays at 3 across all tiers
// on purpose: how many enemies you can hold at once is the dominant balance
// lever, so upgrades make the same wall tougher rather than changing the shape
// of the defence.

// Soldier artwork. Drawn top-down, unlike the archers — it is a figure seen
// from above, so it rotates freely to face its target with no mirroring.
//
// spriteAim  = the direction the spear points in the source art, in degrees.
//              Rendering rotates by (facing - spriteAim), so the spear ends up
//              pointing where the soldier is looking.
// pivot      = the body centre as a fraction of the trim box. Rotation happens
//              about the body, not about the middle of a box that a long spear
//              has pulled off-centre.
// bodyFrac   = the body's diameter as a fraction of the trim width. The drawn
//              size is derived from this and the soldier's radius, so the
//              sprite's body always matches the radius the formation and the
//              road-fit check use.
//
// Tier 1 art, reused for tiers 2 and 3 until they have their own — a knight is
// simply a bigger spearman for now, which beats reverting to a plain circle
// halfway up the upgrade path.
const spearman = {
  sprite: 'soldier_t1',
  spriteTrim: [263, 350, 412, 297],
  pivot: [0.560, 0.791],
  bodyFrac: 0.342,
  spriteAim: -150
};

export const barracks = [
  {
    tier: 1,
    name: 'Militia Camp',
    cost: 70,
    range: 110,
    colour: '#6E7A6A',
    shape: 'camp',
    // 742x819 of art inside a 1000x1000 export. The banner and pole are part
    // of that box, so h covers them and the tent itself reads about 54 wide.
    sprite: 'barracks_t1',
    spriteTrim: [97, 72, 742, 819],
    w: 54, h: 60,
    soldier: { ...spearman, count: 3, hp: 70, damage: 3, cd: 1.00, speed: 60, respawn: 10, regen: 3, r: 7, colour: '#7C93B8' }
  },
  {
    tier: 2,
    name: 'Guard Post',
    cost: 100,
    range: 120,
    colour: '#5E6B5C',
    shape: 'camp',
    w: 58, h: 54,
    soldier: { ...spearman, count: 3, hp: 95, damage: 4, cd: 0.95, speed: 64, respawn: 9, regen: 3.5, r: 7, colour: '#6E86B4' }
  },
  {
    tier: 3,
    name: "Knight's Hall",
    cost: 150,
    range: 130,
    colour: '#8A8478',
    shape: 'camp',
    w: 64, h: 62,
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
