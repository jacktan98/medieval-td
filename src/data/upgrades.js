// THE UPGRADES: what stars buy, family by family. See src/upgrades.js for what is
// bought and what it costs, and the upgrades screen in render.js for the boxes.
//
// The owner's list, word for word in `text`, with a name over each for the panel:
// four rungs per family, bought bottom to top — the first before the second, and
// so on — "so that the players have incentive to earn stars". The first three cost
// two stars each and the fourth three, so a whole family is nine and all four are
// thirty-six, out of the forty-five a campaign of fifteen stages can pay.
//
// WHAT EACH ONE DOES is a field the game reads rather than a sentence it parses:
//
//   rangeTimes    the tower's reach, times this        (towers.js, rangeOf)
//   damageTimes   the tower's blow, times this         (towers.js, damageK)
//   reloadTimes   the tower's rate, times this         (towers.js, reloadK)
//   splashTimes   the blast's reach, times this        (towers.js, shoot)
//   crit          { chance, times }: now and then a shot hits half again as hard
//   bigBlast      { chance, times }: now and then a blast reaches half again as far
//   slow          { chance, seconds, times }: now and then a shot slows its man
//   hpTimes       a soldier's health, times this       (units.js, updateUnits)
//   respawnLess   seconds off a soldier's respawn      (units.js, the death block)
//   blowTimes     a soldier's blow, times this         (units.js, soldierBlow)
//   deathSave     the chance a killing blow leaves him on 1 health instead
//
// "BASE" in the owner's sentences is read as the tower's own number before an
// ability or an aura: each of these multiplies alongside what the tower has been
// taught and what the map is doing, rather than replacing either.
export const UPGRADE_COSTS = [2, 2, 2, 3];

export const UPGRADES = {
  archery: [
    { name: 'Eagle Eye', text: 'Increase base range of archery towers by 5%.', rangeTimes: 1.05 },
    { name: 'Barbed Heads', text: 'Increase base attack damage of archery towers by 5%.', damageTimes: 1.05 },
    { name: 'Quick Draw', text: 'Increase base attack speed of archery towers by 5%.', reloadTimes: 1.05 },
    { name: 'Lucky Shot', text: 'Grants a 5% chance that a projectile deals 50% extra damage.',
      crit: { chance: 0.05, times: 1.5 } }
  ],
  barracks: [
    { name: 'Hardy Recruits', text: 'Increase health of barracks units by 5%.', hpTimes: 1.05 },
    { name: 'Quick Muster', text: 'Reduce respawn time of barracks units by 2 seconds.', respawnLess: 2 },
    // 10%, AND IT WAS +1: the owner changed it. On a Militia Camp's 3 that is 3.3,
    // a little under the old 4; on an Assassin Guild's 15 it is 16.5, a little over.
    { name: 'Whetstones', text: 'Increase base attack damage of barracks units by 10%.', blowTimes: 1.10 },
    { name: 'Last Stand', text: 'Grants a 5% chance that a unit survives a killing blow with 1 health left.',
      deathSave: 0.05 }
  ],
  siege: [
    { name: 'Counterweights', text: 'Increase base range of artillery towers by 5%.', rangeTimes: 1.05 },
    { name: 'Heavy Loads', text: 'Increase base attack damage of artillery towers by 5%.', damageTimes: 1.05 },
    { name: 'Wide Blast', text: 'Increase the area of artillery blasts by 10%.', splashTimes: 1.10 },
    { name: 'Great Blast', text: 'Grants a 5% chance that a projectile\'s blast reaches 50% further.',
      bigBlast: { chance: 0.05, times: 1.5 } }
  ],
  monastery: [
    { name: 'Far Sight', text: 'Increase base range of monastery towers by 5%.', rangeTimes: 1.05 },
    { name: 'Holy Fervour', text: 'Increase base attack damage of monastery towers by 5%.', damageTimes: 1.05 },
    { name: 'Swift Prayers', text: 'Increase base attack speed of monastery towers by 5%.', reloadTimes: 1.05 },
    // HOW HARD THE SLOW HOLDS is the owner's to set and was not given: 0.7 is the
    // figure left doing 70% of what he did, a third of the way to the Blocker's
    // own half-speed guard. Two seconds is the owner's.
    { name: 'Binding Light', text: 'Grants a 5% chance that a projectile slows its target for 2 seconds.',
      slow: { chance: 0.05, seconds: 2, times: 0.7 } }
  ]
};

// The four families in the order the screen shows them, left to right — the build
// menu's own order.
export const UPGRADE_FAMILIES = ['archery', 'barracks', 'siege', 'monastery'];
