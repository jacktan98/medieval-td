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
// trim     = [sx, sy, sw, sh] — the tight bounding box of the artwork inside
//            the source PNG. The generated sprites carry 30-40% transparent
//            margin, which would otherwise shrink and off-centre the drawing.
//            Cropped at draw time so the art files stay as generated; if a
//            PNG is ever re-cut tight, set its trim to [0, 0, width, height].
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
    w: 44, h: 68,
    mount: [22, 10],
    muzzle: [10, -20],
    gunner: 'archer_t1',
    trim: [96, 153, 268, 407],
    gw: 20, gh: 30
  },
  {
    tier: 2,
    name: 'Archer Post',
    cost: 90,
    damage: 14,
    range: 134,
    cooldown: 0.65,
    w: 48, h: 76,
    mount: [24, 10],
    muzzle: [9, -19],
    gunner: 'archer_t2',
    trim: [61, 44, 321, 569],
    gw: 18, gh: 32
  },
  {
    tier: 3,
    name: 'Crossbow Tower',
    cost: 140,
    damage: 22,
    range: 152,
    cooldown: 0.55,
    w: 56, h: 88,
    mount: [28, 14],
    muzzle: [12, -24],
    gunner: 'crossbow_t3',
    trim: [7, 63, 405, 467],
    gw: 26, gh: 30
  }
];

// The four quadrants of the build menu, in N/E/S/W order. A family with no
// tiers yet still takes its quadrant, drawn locked — the layout is the same
// on day one as it will be when all four are in, so nothing moves under the
// player's thumb as families land.
export const families = [
  { id: 'archery',   name: 'Archery',   glyph: 'bow',      tiers: archery },
  { id: 'barracks',  name: 'Barracks',  glyph: 'swords',   tiers: null },
  { id: 'siege',     name: 'Siege',     glyph: 'catapult', tiers: null },
  { id: 'monastery', name: 'Monastery', glyph: 'cross',    tiers: null }
];

export const projectileSpeed = 360;
