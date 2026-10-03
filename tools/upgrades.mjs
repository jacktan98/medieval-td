// THE STAR UPGRADES: what they cost, the order they are bought in, and that each
// one does what its sentence says. See src/data/upgrades.js and src/upgrades.js.
//
// What has to hold:
//   - four families, four rungs each, at 2 / 2 / 2 / 3 stars;
//   - a rung is bought only after the one below it, and only with stars to spare;
//   - Reset gives every star back;
//   - range, damage, attack speed and blast area move by the owner's percentages;
//   - the fourth rungs' chances fire when the dice say so and not otherwise;
//   - a barracks man's health, respawn and blow move, and Last Stand saves him;
//   - with nothing bought, nothing in the game is any different — which is what
//     every other tool in this folder relies on without knowing it.
import { UPGRADES, UPGRADE_COSTS, UPGRADE_FAMILIES } from '../src/data/upgrades.js';
import { starsEarned, starsLeft, rungState, canBuy, buy, resetUpgrades, boughtIn, setBoughtForTest,
         upgradeFx } from '../src/upgrades.js';
import { setStars } from '../src/score.js';
import { levels } from '../src/level.js';
import { STAGES } from '../src/data/overview.js';
import { updateTowers, rangeOf, cooldownOf, damageK } from '../src/towers.js';
import { updateShots } from '../src/projectiles.js';
import { slowOf, wearing, apply as applyStatus } from '../src/status.js';
import { slowOn } from '../src/data/status.js';
import { makeUnits, updateUnits, soldierBlow } from '../src/units.js';
import { archery, barracks, siege, monastery } from '../src/data/towers.js';
import { boxAt, upBox, tapUpgrades, UP_BUY, UP_RESET, UP_DONE, openUpgrades } from '../src/upgradepage.js';

let bad = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(60)} ${detail}`);
  if (!ok) bad++;
};
const near = (a, b) => Math.abs(a - b) < 1e-9;

console.log('\nThe ladders\n');

check(UPGRADE_FAMILIES.join() === 'archery,barracks,siege,monastery', 'four families, in the build menu\'s order');
check(UPGRADE_FAMILIES.every(f => UPGRADES[f].length === 4), 'four rungs each');
check(UPGRADE_COSTS.join() === '2,2,2,3', 'at two, two, two and three stars', UPGRADE_COSTS.join(' / '));
const EFFECTS = ['rangeTimes', 'damageTimes', 'reloadTimes', 'splashTimes', 'crit', 'stun', 'slow',
  'hpTimes', 'respawnLess', 'blowTimes', 'deathSave'];
const blank = UPGRADE_FAMILIES.flatMap(f => UPGRADES[f].filter(u => !u.name || !u.text || !EFFECTS.some(k => u[k])));
check(!blank.length, 'every rung has a name, a sentence and an effect', blank.map(u => u.name).join(', ') || '16 of them');

console.log('\nThe budget\n');

{
  setBoughtForTest({});
  check(starsEarned() === 0 && starsLeft() === 0, 'nothing earned, nothing to spend', `${starsEarned()}`);
  check(!canBuy('archery', 0), 'so nothing can be bought');

  // Three stars on each of the first three stages: nine.
  const ids = STAGES.filter(s => s.level !== null).slice(0, 3).map(s => levels[s.level].id);
  for (const id of ids) setStars(id, 'normal', 'normal', 3);
  // And a better Hard run on the first does not count twice — a stage is worth
  // its best, across every setting.
  setStars(ids[0], 'hard', 'normal', 3);
  check(starsEarned() === 9, 'a stage is worth its best, across every setting', `${starsEarned()} from three stages`);

  check(rungState('archery', 0) === 'next' && rungState('archery', 1) === 'locked', 'the bottom rung is the one on offer');
  check(!buy('archery', 1) && boughtIn('archery') === 0, 'the second cannot be bought before the first');
  check(buy('archery', 0) && boughtIn('archery') === 1 && starsLeft() === 7, 'buying the first spends its two stars', `${starsLeft()} left`);
  check(rungState('archery', 0) === 'bought' && rungState('archery', 1) === 'next', 'and puts the second on offer');
  buy('archery', 1); buy('archery', 2);
  check(starsLeft() === 3 && canBuy('archery', 3), 'three stars left buys the three-star fourth', `${starsLeft()} left`);
  buy('barracks', 0);
  check(starsLeft() === 1 && !canBuy('archery', 3), 'and one star left does not', `${starsLeft()} left`);
  resetUpgrades();
  check(starsLeft() === 9 && UPGRADE_FAMILIES.every(f => boughtIn(f) === 0), 'Reset gives every star back', `${starsLeft()} left`);
}

console.log('\nThe screen\n');

{
  const state = {};
  openUpgrades(state);
  const b = upBox(0, 0);
  check(JSON.stringify(boxAt(b.cx, b.cy)) === '{"fam":"archery","i":0}', 'the bottom-left box is Archery\'s first rung');
  const top = upBox(3, 3);
  check(JSON.stringify(boxAt(top.cx, top.cy)) === '{"fam":"monastery","i":3}', 'the top-right box is Monastery\'s fourth');
  check(upBox(0, 1).cy < upBox(0, 0).cy, 'and a ladder climbs: the second rung is above the first');

  check(tapUpgrades(state, b.cx, b.cy) === 'tap' && boughtIn('archery') === 0, 'a tap on a box reads it and spends nothing');
  check(tapUpgrades(state, UP_BUY.x + 5, UP_BUY.y + 5) === 'bought' && boughtIn('archery') === 1,
    'the panel\'s Buy button buys it', `${starsLeft()} left`);
  const t0 = 1000;
  tapUpgrades(state, UP_RESET.x + 5, UP_RESET.y + 5, t0);
  check(boughtIn('archery') === 1, 'one press of Reset changes nothing');
  tapUpgrades(state, UP_RESET.x + 5, UP_RESET.y + 5, t0 + 500);
  check(boughtIn('archery') === 0, 'a second inside the window resets');
  tapUpgrades(state, UP_DONE.x + 5, UP_DONE.y + 5);
  check(state.upgrades === false, 'and Done closes the screen');
}

// --- in play ---------------------------------------------------------------------

const plot = levels[0].plots[0];
const tower = (famId, def) => ({
  plot, fam: { id: famId }, def, x: plot.x, y: plot.y,
  aim: 0, cd: 0, recoil: 0, beat: 0, beatT: 0, face: 0, aimMode: 0, spent: def.cost, rally: null,
  abilities: [], shots: 0, special: null, burst: 0, burstT: 0, hit: [], locked: null, hold: 0
});
const dummy = (t, away = 50) => ({
  def: { r: 10, hp: 1e9, speed: 0, atkCd: 1, damage: 0 },
  x: t.x + away, y: t.y, hp: 1e9, maxHp: 1e9, route: 0, lane: 1, s: 300,
  foe: null, acd: 1, thrust: 0, halted: false, leaked: false
});
// Every shot a tower looses in `seconds` at one man in front of it, with the dice
// fixed at `roll`.
function shots(t, seconds, roll, away = 50) {
  const real = Math.random;
  Math.random = () => roll;
  const state = { towers: [t], enemies: [dummy(t, away)], units: [], shots: [], hits: [], corpses: [], splats: [], impacts: [] };
  const out = [];
  try {
    for (let i = 0; i * (1 / 60) < seconds; i++) {
      updateTowers(state, 1 / 60);
      out.push(...state.shots);
      state.shots.length = 0;
    }
  } finally { Math.random = real; }
  return out;
}

console.log('\nThe towers\n');

for (const [fam, def] of [['archery', archery[0]], ['siege', siege[0]], ['monastery', monastery[0]]]) {
  setBoughtForTest({});
  const t = tower(fam, def);
  const plain = { range: rangeOf(t), cd: cooldownOf(t), k: damageK(t) };
  setBoughtForTest({ [fam]: 2 });
  check(rangeOf(t) === Math.round(def.range * 1.05), `${fam}: the first rung adds 5% to the reach`, `${plain.range} → ${rangeOf(t)}`);
  check(near(damageK(t), 1.05), `${fam}: the second adds 5% to the blow`, `x${damageK(t)}`);
  if (fam !== 'siege') {
    setBoughtForTest({ [fam]: 3 });
    check(near(cooldownOf(t), def.cooldown / 1.05), `${fam}: the third shoots 5% faster`, `${plain.cd.toFixed(3)}s → ${cooldownOf(t).toFixed(3)}s`);
  }
}

{
  // Sharpshooter: half again as hard on a winning roll, and not otherwise.
  const t = () => tower('archery', archery[0]);
  setBoughtForTest({ archery: 2 });
  const usual = shots(t(), 2, 0)[0].damage;
  setBoughtForTest({ archery: 4 });
  const lucky = shots(t(), 2, 0)[0].damage;
  const miss = shots(t(), 2, 0.99)[0].damage;
  check(lucky === Math.round(usual * 1.5) && miss === usual, 'archery: Sharpshooter hits half again as hard, now and then',
    `${usual} usually, ${lucky} on a 10% roll`);
}

{
  setBoughtForTest({});
  const plain = shots(tower('siege', siege[0]), 4, 0.99, 180)[0].splash;
  setBoughtForTest({ siege: 3 });
  const wide = shots(tower('siege', siege[0]), 4, 0.99, 180)[0].splash;
  check(near(wide, plain * 1.1), 'artillery: Wide Blast reaches 10% further', `${plain} → ${wide.toFixed(1)}`);
  setBoughtForTest({ siege: 4 });
  const real = Math.random;
  const t = tower('siege', siege[0]);
  const state = { towers: [t], enemies: [dummy(t, 180)], units: [], shots: [], hits: [], corpses: [], splats: [], impacts: [] };
  Math.random = () => 0;
  let shot = null;
  try {
    for (let i = 0; i < 4 * 60 && !shot; i++) { updateTowers(state, 1 / 60); shot = state.shots[0] || null; }
  } finally { Math.random = real; }
  check(shot && shot.stun && shot.stun.seconds === 0.5, 'artillery: Concussion arms a shot to stun for half a second, now and then',
    shot && shot.stun ? `${shot.stun.seconds}s` : 'no stun');
  const quiet = shots(tower('siege', siege[0]), 4, 0.99, 180)[0];
  check(!quiet.stun, 'and not on a losing roll');
  // Land it, and the man under it stands still. A rock is thrown at a point on the
  // road (`to`) rather than at the man, so he is stood where it comes down.
  const man = state.enemies[0];
  if (shot && shot.to) { man.x = shot.to.x; man.y = shot.to.y; }
  for (let i = 0; i < 5 * 60 && state.shots.length; i++) updateShots(state, 1 / 60);
  check(wearing(man, 'stunned') && slowOf(man) === 0, 'and what it lands on stops dead', `slowed to x${slowOf(man)}`);
  const boss = { def: { boss: true }, statuses: [] };
  applyStatus(boss, 'stunned', slowOn(boss, 0), 0.5, 'rock');
  check(slowOf(boss) === 0.5, 'while a boss is only held to half speed', `x${slowOf(boss)}`);
}

{
  const chances = [UPGRADES.archery[3].crit.chance, UPGRADES.barracks[3].deathSave,
    UPGRADES.siege[3].stun.chance, UPGRADES.monastery[3].slow.chance];
  check(chances.every(c => c === 0.10), 'every fourth rung is a 10% chance', chances.join(' / '));
}

{
  setBoughtForTest({ monastery: 4 });
  const held = shots(tower('monastery', monastery[0]), 3, 0)[0];
  const free = shots(tower('monastery', monastery[0]), 3, 0.99)[0];
  check(held.slow && held.slow.seconds === 2 && !free.slow, 'monastery: Binding Light slows for two seconds, now and then',
    held.slow ? `x${held.slow.times} for ${held.slow.seconds}s` : 'no slow');
}

console.log('\nThe barracks\n');

{
  const t = tower('barracks', barracks[0]);
  const state = { towers: [t], enemies: [], units: [], shots: [], hits: [], corpses: [], splats: [], impacts: [] };
  setBoughtForTest({});
  makeUnits(state, t);
  updateUnits(state, 1 / 60);
  const man = state.units[0];
  const plainHp = man.maxHp, plainBlow = soldierBlow(man);

  setBoughtForTest({ barracks: 1 });
  updateUnits(state, 1 / 60);
  check(near(man.maxHp, plainHp * 1.05), 'Hardy Recruits: 5% more health', `${plainHp} → ${man.maxHp}`);

  setBoughtForTest({ barracks: 3 });
  check(near(soldierBlow(man), plainBlow * 1.1), 'Honed Blades: 10% more on every blow', `${plainBlow} → ${soldierBlow(man).toFixed(2)}`);

  const real = Math.random;
  try {
    // The dice say he dies.
    Math.random = () => 0.99;
    man.hp = -5;
    updateUnits(state, 1 / 60);
    check(near(man.respawn, Math.max(1, barracks[0].soldier.respawn - 2)), 'Quick Muster: back two seconds sooner',
      `${barracks[0].soldier.respawn}s → ${man.respawn.toFixed(2)}s`);

    // And with Last Stand, the dice say he does not.
    setBoughtForTest({ barracks: 4 });
    const second = state.units[1];
    Math.random = () => 0;
    second.hp = -5;
    updateUnits(state, 1 / 60);
    check(second.hp >= 1 && !(second.respawn > 0), 'Last Stand: a killing blow leaves him on 1 health, now and then', `${second.hp.toFixed(1)} health`);
    Math.random = () => 0.99;
    second.hp = -5;
    updateUnits(state, 1 / 60);
    check(second.respawn > 0, 'and not on a losing roll');
  } finally { Math.random = real; }
}

console.log('\nWith nothing bought\n');

{
  setBoughtForTest({});
  const fx = UPGRADE_FAMILIES.map(upgradeFx);
  check(fx.every(f => f.rangeTimes === 1 && f.damageTimes === 1 && f.reloadTimes === 1 && f.splashTimes === 1 &&
    f.hpTimes === 1 && !f.respawnLess && f.blowTimes === 1 && !f.deathSave && !f.crit && !f.stun && !f.slow),
    'every family is exactly as it was');
}

console.log(bad ? `\n${bad} failed.` : '\nThe upgrades do what they say.');
process.exit(bad ? 1 : 0);
