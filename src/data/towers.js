// Archery family. Tier 1 is built on an empty plot; tapping an existing
// tower upgrades it. Costs are cumulative spend, not refundable.
//
// mount  = where the gunner's pivot sits, offset from the tower sprite's
//          top-left corner.
// muzzle = where the projectile leaves the gunner, offset from the gunner's
//          own pivot, measured at aim = 0 (facing right).

export const archery = [
  {
    tier: 1,
    name: 'Watchtower',
    cost: 70,
    damage: 9,
    range: 118,
    cooldown: 0.75,
    w: 88, h: 136,
    mount: [44, 44],
    muzzle: [24, 8]
  },
  {
    tier: 2,
    name: 'Archer Post',
    cost: 90,
    damage: 14,
    range: 134,
    cooldown: 0.65,
    w: 96, h: 152,
    mount: [48, 56],
    muzzle: [26, 10]
  },
  {
    tier: 3,
    name: 'Crossbow Tower',
    cost: 140,
    damage: 22,
    range: 152,
    cooldown: 0.55,
    w: 112, h: 176,
    mount: [56, 40],
    muzzle: [38, 12]
  }
];

export const projectileSpeed = 360;
