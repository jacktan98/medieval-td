// Statuses: what is being done to a figure, and whether it shows.
// Node only.
//
//   node tools/status.mjs
//
// A status is the first mechanic in this game that belongs to BOTH armies — a
// cannon burns a thug, a plague doctor poisons a spearman — and it is the first
// that does its damage LATER. Both of those make it easy to get quietly wrong,
// and the failures do not look like failures:
//
// THE MARK IS THE WHOLE POINT AND THE EASIEST HALF TO LOSE. The rules can be
// perfect and the icon invisible, and the result is a health bar that will not
// come back up for reasons the player cannot see. That already happened once here
// on colour alone: the poisoned droplet is rgb(92,127,73) and the grass is about
// rgb(90,110,70), so the first version drew a mark nobody could find. The flame
// was fine, which is exactly the trap — one status works, so the mechanism looks
// right.
//
// A STATUS THAT NEVER ENDS IS A BUG WITH NO ERROR. The clock counts down and the
// entry is spliced out; miss the splice and the man burns forever, quietly, with
// a mark that stays and a health bar that keeps sliding.
//
// AND IT MUST NOT SURVIVE A DEATH. A soldier musters again as a new man. One who
// walks back out of the door still on fire is a bug that reads as the fire being
// broken rather than as the respawn being.

import { apply, tick, clear, wearing, harmed } from '../src/status.js';
import { STATUS, STATUS_ORDER, STATUS_H } from '../src/data/status.js';
import { ui } from '../src/data/ui.js';
import { paths as ASSET_URLS } from '../src/assets.js';
import { updateUnits, makeUnits } from '../src/units.js';
import { updateEnemies } from '../src/enemies.js';
import { updateShots } from '../src/projectiles.js';
import { siege, barracks } from '../src/data/towers.js';
import { enemyTypes, flask } from '../src/data/waves.js';
import { abilityById } from '../src/data/abilities.js';
import { existsSync } from 'fs';

const DT = 1 / 60;
let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(56)} ${detail}`);
  if (!cond) bad++;
};

const board = () => ({ towers: [], enemies: [], units: [], shots: [], hits: [],
  splats: [], impacts: [], corpses: [], gold: 0, lives: 20 });

const man = (over = {}) => ({
  def: { r: 8, regen: 4, respawn: 5, hp: 100, name: 'a man' },
  hp: 100, maxHp: 100, x: 400, y: 300, rx: 400, ry: 300,
  respawn: 0, statuses: [], hold: 0, healing: 0, foe: null, ...over
});

// --- every status is a thing you can see --------------------------------------

console.log('Every status has a picture\n');

{
  const ids = Object.keys(STATUS);
  ok(ids.length > 0, 'there are statuses at all', ids.join(', '));

  // THE FOUR-LINK CHAIN, and a break anywhere in it is an invisible mark:
  //
  //   STATUS[id].icon  ->  a `ui` entry (a trim and a size)  ->  an assets.js
  //   path  ->  a file that is actually there
  //
  // Checked end to end because every link has broken in this project at least
  // once, always silently: drawUi returns false for missing art and the caller
  // carries on. See the same shape of check for tier glyphs in tools/trim.mjs.
  const broken = ids.filter(id => {
    const key = STATUS[id].icon;
    return !key || !ui[key] || !ASSET_URLS[key] ||
           !existsSync(decodeURIComponent(ASSET_URLS[key]));
  });
  ok(broken.length === 0, 'and each resolves to a file that exists',
    broken.join(', ') || ids.map(id => STATUS[id].icon).join(', '));

  ok(ids.every(id => STATUS[id].name), 'and each has a name to print',
    ids.map(id => STATUS[id].name).join(', '));

  // STATUS_ORDER decides what the player sees when a figure wears two at once,
  // and a status missing from it would simply never be drawn — the renderer
  // filters through it rather than through the list on the figure.
  ok(STATUS_ORDER.length === ids.length && ids.every(id => STATUS_ORDER.includes(id)),
    'and every one of them is in the drawing order',
    STATUS_ORDER.join(' -> '));

  // THE MARK STAYS SHARP AT ITS DRAWN SIZE, which is the constraint that sets
  // STATUS_H. tools/trim.mjs measures this for every icon in the game; it is
  // repeated here because this is the file somebody adding a status will run, and
  // a new mark drawn on a smaller canvas would go soft with nothing else to say
  // so. 3 is MAX_DPR in src/main.js.
  const soft = ids.filter(id => STATUS_H * 3 > ui[STATUS[id].icon].trim[3]);
  ok(soft.length === 0, `and is sharp at ${STATUS_H}px on a 3x screen`,
    soft.join(', ') || ids.map(id => `${STATUS[id].name} ${ui[STATUS[id].icon].trim[3]}px`).join(', '));
}

// --- the clock -----------------------------------------------------------------

console.log('\nWearing one, and stopping\n');

{
  const v = man();
  apply(v, 'poisoned', 5, 4, 'flask');
  ok(wearing(v, 'poisoned'), 'a status goes on', `${v.statuses.length} worn`);
  ok(harmed(v), 'and one that hurts says so');

  let took = 0;
  for (let i = 0; i < 4 / DT + 1; i++) took += tick(v, DT);
  ok(Math.abs(took - 20) < 0.2, 'a full dose takes exactly its toll', `${took.toFixed(1)} of 20`);
  ok(!wearing(v, 'poisoned') && v.statuses.length === 0,
    'and then it is gone, mark and all', `${v.statuses.length} worn`);
  ok(!harmed(v), 'and nothing is being done to him any more');
}

{
  // REFRESHES RATHER THAN STACKS, which is the rule the flask always had and now
  // every status shares. Three doses on one man is one clock at one rate, not
  // three — stacking reads as a bug the first time three doctors delete a squad.
  const v = man();
  apply(v, 'poisoned', 5, 4, 'flask');
  for (let i = 0; i < 60; i++) tick(v, DT);   // a second in
  apply(v, 'poisoned', 5, 4, 'flask');
  const only = v.statuses.filter(s => s.id === 'poisoned');
  ok(only.length === 1, 'a second dose is one status, not two', `${only.length}`);
  ok(Math.abs(only[0].left - 4) < 1e-9, 'and it restarts the clock',
    `${only[0].left.toFixed(2)}s of 4`);
}

{
  // AND A FIERCER SOURCE OVERWRITES A WEAKER ONE, rather than being ignored for as
  // long as the weak one happens to have left on it. Nothing in the game does this
  // today — one flask, one burn — but "refresh" has to mean the new dose, or the
  // day a second burn arrives it will silently be the first one's rate.
  const v = man();
  apply(v, 'burnt', 10, 5, 'cannonball');
  apply(v, 'burnt', 25, 5, 'something worse');
  ok(v.statuses[0].dps === 25, 'a fiercer dose overwrites a weaker one',
    `${v.statuses[0].dps}/s`);
}

{
  // TWO AT ONCE, which nothing in the game does yet either — a burning man walking
  // through a spill would — and the list has to hold both rather than replacing.
  const v = man();
  apply(v, 'burnt', 10, 5, 'cannonball');
  apply(v, 'poisoned', 5, 4, 'flask');
  ok(v.statuses.length === 2, 'a figure can wear two different statuses at once',
    v.statuses.map(s => s.id).join(' + '));
  const took = tick(v, 1);
  ok(Math.abs(took - 15) < 1e-9, 'and both of them hurt him', `${took} in one second`);
}

{
  const v = man();
  apply(v, 'burnt', 10, 5, 'cannonball');
  clear(v);
  ok(v.statuses.length === 0, 'and everything comes off when he dies', `${v.statuses.length} worn`);
}

{
  // A TYPO IS NOTHING RATHER THAN A GHOST. `apply` refuses an id the table has
  // never heard of, so a misspelt status cannot end up on a figure, ticking, with
  // no picture and no name and nothing to find it by.
  const v = man();
  apply(v, 'stunned', 10, 5, 'nothing');
  ok(v.statuses.length === 0, 'a status nobody has defined never goes on',
    `${v.statuses.length} worn`);
}

// --- who credits the kill ------------------------------------------------------

console.log('\nWho gets the credit\n');

{
  // A BURN THAT FINISHES SOMEBODY IS STILL THE CANNON'S KILL. `killedBy` is what
  // src/enemies.js reads to pick the kill cry, and a status that cleared it would
  // send a burnt thug to the generic melee line — the cannon would go quiet on
  // exactly the kills its ability earned.
  const v = man({ hp: 5 });
  v.killedBy = 'melee';
  apply(v, 'burnt', 10, 5, 'cannonball');
  tick(v, DT);
  ok(v.killedBy === 'cannonball', 'a burn credits whatever set the fire', v.killedBy);
}

{
  // AND A STATUS THAT DOES NO DAMAGE CREDITS NOBODY. A stun should not steal the
  // kill from the blow that actually lands, so only a status that HURTS writes the
  // field. Checked with a zero rate, which is the shape a stun will have.
  const v = man();
  v.killedBy = 'arrow';
  apply(v, 'burnt', 0, 5, 'cannonball');
  tick(v, DT);
  ok(v.killedBy === 'arrow', 'and one that does no damage credits nobody', v.killedBy);
}

// --- both armies, through the real update loops --------------------------------

console.log('\nBoth armies wear them, through the real loops\n');

{
  // AN ENEMY BURNS. Not a hand-rolled tick — updateEnemies, which is the loop the
  // game runs, on a figure shaped the way spawn() shapes one.
  const s = board();
  const e = { def: { ...enemyTypes.light_inf, speed: 0 }, x: 400, y: 300, hp: 1000,
              maxHp: 1000, face: 1, route: 0, s: 0, lane: 1, acd: 0, thrust: 0,
              leaked: false, statuses: [] };
  s.enemies.push(e);
  const burn = abilityById('fiery').ammo.burn;
  apply(e, 'burnt', burn.dps, burn.seconds, 'cannonball');

  const before = e.hp;
  for (let i = 0; i < burn.seconds / DT + 1; i++) updateEnemies(s, DT);
  const took = before - e.hp;
  ok(Math.abs(took - burn.dps * burn.seconds) < 0.5,
    'a burning enemy loses exactly what the ability promises',
    `${took.toFixed(1)} of ${burn.dps * burn.seconds}`);
  ok(!wearing(e, 'burnt'), 'and stops burning when the five seconds are up');
}

{
  // A SOLDIER IS POISONED, and the regen is SUPPRESSED rather than raced. That is
  // the whole reason the flask's numbers are small enough to look harmless: a
  // spearman regrows 4 a second, so a 5-a-second poison he could heal through
  // would be a 1-a-second poison.
  const s = board();
  const t = { plot: { x: 400, y: 300 }, fam: { id: 'barracks', tiers: barracks },
              def: barracks[0], x: 400, y: 300, rally: null, abilities: [] };
  s.towers.push(t);
  makeUnits(s, t);
  const u = s.units[0];
  u.hp = u.maxHp;
  apply(u, 'poisoned', flask.poison.dps, flask.poison.seconds, 'flask');

  const before = u.hp;
  for (let i = 0; i < flask.poison.seconds / DT + 1; i++) updateUnits(s, DT);
  const took = before - u.hp;
  const want = flask.poison.dps * flask.poison.seconds;
  ok(Math.abs(took - want) < 1, 'a poisoned soldier loses the whole dose',
    `${took.toFixed(1)} of ${want}, against ${u.def.regen}/s of regen`);
  ok(!wearing(u, 'poisoned'), 'and the plague wears off');

  // AND THE REGEN COMES BACK, which is the other half of "suppressed" and the half
  // that would go unnoticed: a man who never healed again would look like a man
  // who had simply been hurt.
  const low = u.hp;
  for (let i = 0; i < 60; i++) updateUnits(s, DT);
  ok(u.hp > low, 'and then he starts healing again',
    `${low.toFixed(1)} -> ${u.hp.toFixed(1)}`);
}

{
  // AND NOTHING SURVIVES A DEATH. A soldier who musters again is a new man; one who
  // walks back out still poisoned would die again to a flask thrown at somebody who
  // is not there any more.
  const s = board();
  const t = { plot: { x: 400, y: 300 }, fam: { id: 'barracks', tiers: barracks },
              def: barracks[0], x: 400, y: 300, rally: null, abilities: [] };
  s.towers.push(t);
  makeUnits(s, t);
  const u = s.units[0];
  apply(u, 'poisoned', 500, 10, 'flask');     // enough to kill him this second
  for (let i = 0; i < 60; i++) updateUnits(s, DT);
  ok(u.respawn > 0, 'a poison strong enough kills him', `respawn ${u.respawn.toFixed(1)}s`);
  ok(u.statuses.length === 0, 'and he musters again wearing nothing',
    `${u.statuses.length} worn`);
}

// --- what the cannon actually applies ------------------------------------------

console.log('\nFiery Shot is the thing that sets the fire\n');

{
  const fiery = abilityById('fiery');
  const gun = siege.find(d => d.name === 'Cannon Outpost');

  ok(fiery.ammo.burn && fiery.ammo.burn.dps > 0 && fiery.ammo.burn.seconds > 0,
    'the fiery ball carries a burn',
    `${fiery.ammo.burn.dps}/s for ${fiery.ammo.burn.seconds}s`);
  ok(fiery.ammo.kind === gun.ammo.kind,
    'and it is still a cannonball, so the kill line is the cannon\'s',
    fiery.ammo.kind);
  ok(!gun.ammo.burn, 'while an ordinary ball sets nothing alight');
  ok(Array.isArray(fiery.ammo.impact) && fiery.ammo.impact.length === 2,
    'and it throws up its own pair of fiery impacts at random',
    (fiery.ammo.impact || []).join(', '));
  ok(fiery.ammo.fireGain > 1, 'and leaves louder than an ordinary ball',
    `x${fiery.ammo.fireGain}`);

  // THE BURN LANDS ON EVERYTHING THE BLAST CAUGHT, not on the one man it was
  // aimed at — which is most of what the ability is worth on a packed rank. Run
  // through the real landing rather than asserted, since that is where the
  // splash loop and the status meet.
  const s = board();
  const marks = [0, 30, 60].map(dx => ({
    def: { ...enemyTypes.light_inf, speed: 0 }, x: 400 + dx, y: 300, hp: 1e6, maxHp: 1e6,
    face: 1, route: 0, s: 0, lane: 1, acd: 0, thrust: 0, leaked: false, statuses: []
  }));
  s.enemies.push(...marks);
  s.shots.push({
    x: 400, y: 300, angle: 0, fromX: 200, target: marks[0],
    damage: gun.damage, splash: gun.splash, ammo: fiery.ammo, speed: fiery.ammo.speed,
    from: { x: 200, y: 300 }, to: { x: 400, y: 300 }, flight: 0.1, t: 0, lift: 0
  });
  for (let i = 0; i < 30 && s.shots.length; i++) updateShots(s, DT);
  const lit = marks.filter(m => wearing(m, 'burnt')).length;
  ok(lit === marks.length, 'and one ball sets fire to everything in the blast',
    `${lit} of ${marks.length} within ${gun.splash}px`);
}

console.log(bad
  ? `\n${bad} thing(s) about statuses are not true.`
  : '\nStatuses go on, hurt, show and come off.');
process.exit(bad ? 1 : 0);
