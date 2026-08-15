// What the plague doctor does, checked against the three things that would be
// invisible everywhere else. Node only.
//
//   node tools/plague.mjs
//
// tools/sim.mjs cannot see any of this. It only reports whether a build cleared
// the level, so a doctor who threw at nobody, or who caught one man where he
// should catch three, or who stood on the road until the clock ran out, all look
// the same from there: a slightly different number of lives.
//
// THE LAST TWO CHECKS ARE THE IMPORTANT ONES, and they are the reason he is
// allowed to stand still at all. His flasks never run out and a wave only ends
// when the field is clear, so an enemy with no bound on standing still is a game
// that can hang. The bound is `standoff` — seconds of not advancing, spent once
// — and checks 5 and 6 are what say it works: 5 puts three of him in front of a
// squad and waits for the board to empty, and 6 does the same against soldiers
// his poison can never kill, which is the case that soft-locks if the budget is
// ever removed or made conditional.
//
// He has had two earlier designs that stopped him walking — a finite basket and
// a rule about screens — and both looked right on paper. Both bounded the
// FLASKS. Neither bounded the time.

import { spawn, updateEnemies } from '../src/enemies.js';
import { updateShots } from '../src/projectiles.js';
import { makeUnits, updateUnits } from '../src/units.js';
import { updateImpacts } from '../src/impacts.js';
import { families } from '../src/data/towers.js';
import { enemyTypes, flask } from '../src/data/waves.js';
import { level } from '../src/level.js';
import { at as pointOn, laneOf } from '../src/route.js';

const DT = 1 / 60;
const barracks = families.find(f => f.id === 'barracks');

let bad = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label.padEnd(52)} ${detail}`);
  if (!ok) bad++;
};

function board() {
  const state = {
    towers: [], enemies: [], units: [], shots: [], hits: [],
    corpses: [], splats: [], impacts: [], gold: 0, lives: 20
  };
  return state;
}

// A barracks with its squad already marched out and settled on the road.
function withSquad(state, plotIndex = 3) {
  const plot = level.plots[plotIndex];
  const t = { plot, fam: barracks, def: barracks.tiers[0], x: plot.x, y: plot.y, rally: null };
  state.towers.push(t);
  makeUnits(state, t);
  for (let i = 0; i < 6 / DT; i++) updateUnits(state, DT);
  return t;
}

// Walk the world forward. Everything the real loop runs that a flask touches.
function step(state, secs) {
  for (let i = 0; i < secs / DT; i++) {
    updateUnits(state, DT);
    updateEnemies(state, DT);
    updateShots(state, DT);
    updateImpacts(state, DT);
  }
}

// Put an enemy at a known distance along the road rather than at the start of
// it, so a test does not have to wait for it to walk there.
function place(e, s) {
  e.s = s;
  const p = pointOn(laneOf(level.routes[e.route], e.lane), s);
  e.x = p.x;
  e.y = p.y;
}

// Where on the road the squad is actually standing, as a distance along it. The
// tests below place the doctor relative to this rather than to a typed number,
// so they keep working when the rally, the formation or the plot moves.
function squadAt(state) {
  const road = laneOf(level.routes[0], 1);
  let best = 0, least = Infinity;
  for (let s = 0; s < road.total; s += 4) {
    const p = pointOn(road, s);
    for (const u of state.units) {
      const d = Math.hypot(p.x - u.x, p.y - u.y);
      if (d < least) { least = d; best = s; }
    }
  }
  return best;
}

console.log('The flask\n');

// --- 1. one flask catches more than one man ----------------------------------
//
// The whole point of the splash, and the number was wrong for a while: at a
// radius of 22 against a wedge whose men stand 40px apart, every flask in the
// game hit exactly the one man it was aimed at.
{
  const state = board();
  withSquad(state);
  const stand = squadAt(state);

  spawn(state, 'plague_inf');
  const doc = state.enemies[0];
  place(doc, Math.max(0, stand - 110));

  // A thug on top of the squad, unkillable, to hold the soldiers in a fight so
  // they stay in their wedge while the flasks come down. Without it they wander
  // off to meet the doctor and the thing being measured — how many men of a
  // FORMATION one flask catches — stops being what is on the board.
  spawn(state, 'light_inf');
  place(state.enemies[1], stand - 20);
  state.enemies[1].hp = 1e6;

  // COUNTED PER LANDING, which is the only way to ask this question. Counting
  // how many men are poisoned at any one moment measures something else
  // entirely: he throws every 2.2s and a dose lasts 3s, so doses overlap and
  // three men end up on the clock however small the splash is. That is exactly
  // the mistake this check was written with the first time — it passed at a
  // radius that could not reach a second man at all.
  //
  // A man poisoned THIS frame still holds the full duration, because nothing has
  // decremented him yet. That is the tell.
  const caught = [];
  for (let i = 0; i < 12 / DT; i++) {
    updateUnits(state, DT);
    updateEnemies(state, DT);
    const before = state.shots.length;
    updateShots(state, DT);
    if (state.shots.length < before) {
      caught.push(state.units.filter(u => u.poison && u.poison.left === flask.poison.seconds).length);
    }
    updateImpacts(state, DT);
  }
  const avg = caught.reduce((a, b) => a + b, 0) / (caught.length || 1);

  check(caught.length > 0, 'he throws at a squad in range', `${caught.length} flasks landed`);
  check(avg > 1.4, 'and one flask poisons more than the man it was aimed at',
    `${avg.toFixed(2)} men per flask`);
  check(flask.splash < 55, 'and its patch is smaller than a catapult\'s',
    `${flask.splash} against 55 at tier 1`);
}

// --- 2. the poison is the damage, and it beats the regen ---------------------
{
  const state = board();
  withSquad(state);
  const u = state.units[0];
  u.hp = u.maxHp;
  u.poison = { dps: flask.poison.dps, left: flask.poison.seconds };

  const before = u.hp;
  // One frame past the duration, not exactly the duration: `left` is counted
  // down by dt a frame at a time, so after precisely seconds/DT frames it is a
  // rounding error above zero rather than at it.
  for (let i = 0; i < flask.poison.seconds / DT + 1; i++) updateUnits(state, DT);
  const lost = before - u.hp;
  const want = flask.poison.dps * flask.poison.seconds;

  check(Math.abs(lost - want) < 1, 'a full dose takes its whole toll',
    `${lost.toFixed(1)} of ${want}, with regen ${u.def.regen}/s suppressed`);
  check(u.poison === null, 'and then it wears off and the regen comes back');
}

console.log('\nHe stands off\n');

// --- 3. he stops at throwing range, and moves on when his patience runs out --
//
// The behaviour this enemy exists for, and the one that can hang the game, so
// both halves are asserted in the same run: he must STOP while men screen the
// road ahead of him, and he must START AGAIN once `standoff` is spent, without
// anything having changed on the board in between.
{
  const state = board();
  withSquad(state);
  const stand = squadAt(state);

  spawn(state, 'plague_inf');
  const doc = state.enemies[0];
  // Just inside his throwing range and well outside a soldier's ENGAGE, so what
  // is measured is his own decision rather than him being caught. Check 4 is the
  // held case.
  place(doc, Math.max(0, stand - 125));

  const from = doc.s;
  let threw = 0, caught = false;
  for (let i = 0; i < 3 / DT && !caught; i++) {
    updateUnits(state, DT);
    updateEnemies(state, DT);
    const before = state.shots.length;
    updateShots(state, DT);
    if (state.shots.length < before) threw++;
    caught = !!doc.foe;
    updateImpacts(state, DT);
  }
  const held = doc.s - from;

  check(threw > 0, 'he throws at a squad in reach', `${threw} flasks`);
  check(held < 2 && doc.halted, 'and stops rather than walking into it',
    `${held.toFixed(0)}px covered in 3s, ${caught ? 'then pinned' : 'still free'}`);

  // Past the budget. The soldiers are still there and still alive, so nothing
  // about the board has changed — only his patience.
  const before = doc.s;
  for (let i = 0; i < (enemyTypes.plague_inf.ranged.standoff + 2) / DT && !doc.foe; i++) {
    updateUnits(state, DT);
    updateEnemies(state, DT);
    updateShots(state, DT);
    updateImpacts(state, DT);
  }

  check(doc.s > before + 2 || doc.foe, 'and walks in once his patience is spent',
    `${(doc.s - before).toFixed(0)}px after the standoff, ${doc.foe ? 'then pinned' : 'free'}`);
}

// --- 4. pinning him does not switch the basket off ---------------------------
//
// The thing a barracks player will try first, and the reason it must not work:
// an enemy whose whole character is thrown poison cannot have that character
// removed by the family it is meant to punish.
{
  const state = board();
  withSquad(state);
  const stand = squadAt(state);

  spawn(state, 'plague_inf');
  const doc = state.enemies[0];
  doc.hp = 1e6;                        // he must be pinned, not killed
  place(doc, stand);                   // right on top of the squad

  let threw = 0, everHeld = false;
  for (let i = 0; i < 8 / DT; i++) {
    updateUnits(state, DT);
    updateEnemies(state, DT);
    const before = state.shots.length;
    updateShots(state, DT);
    if (state.shots.length < before) threw++;
    if (doc.foe) everHeld = true;
    updateImpacts(state, DT);
  }

  check(everHeld, 'a soldier walks out and locks him down');
  check(threw > 0, 'and he throws anyway, from inside the melee',
    `${threw} flasks while held`);
}

// --- 5. a board with only doctors on it still empties -------------------------
//
// The end-to-end version of check 3, and the one that would actually have caught
// a soft-lock: a wave of nothing but throwers, against a squad, left to run.
{
  const state = board();
  withSquad(state);
  const stand = squadAt(state);

  for (let i = 0; i < 3; i++) {
    spawn(state, 'plague_inf');
    place(state.enemies[i], Math.max(0, stand - 100 - i * 30));
  }

  let secs = 0;
  while (state.enemies.length && secs < 180) { step(state, 1); secs++; }

  check(state.enemies.length === 0, 'a road of nothing but doctors clears itself',
    `${secs}s, ${state.enemies.length} left`);
  check(secs < 150, 'and does it in a sane time rather than eventually',
    `${secs}s`);
}

// --- 6. the soft-lock case, run on purpose ------------------------------------
//
// THIS IS THE CHECK THE STANDOFF EXISTS TO PASS. Check 5 clears because the
// poison eventually kills the squad screening the road, and that is the happy
// path rather than the guarantee: a deeper line, a tier 3 squad, or two barracks
// covering the same stretch all regenerate faster than one doctor can grind, and
// then "he stops while men are in front of him" means he stops forever.
//
// So the men here are simply unkillable. No amount of poison thins them, nothing
// he does changes the board, and the only reason he can ever move again is that
// he runs out of patience. If somebody makes the halt conditional on something
// cleverer later, this is the check that fails.
{
  const state = board();
  withSquad(state);
  const stand = squadAt(state);
  for (const u of state.units) { u.maxHp = 1e9; u.hp = 1e9; }

  for (let i = 0; i < 3; i++) {
    spawn(state, 'plague_inf');
    place(state.enemies[i], Math.max(0, stand - 100 - i * 30));
  }

  let secs = 0;
  while (state.enemies.length && secs < 240) { step(state, 1); secs++; }

  check(state.enemies.length === 0, 'and clears even against men his poison cannot kill',
    `${secs}s, ${state.enemies.length} left`);
}

console.log(bad
  ? `\n${bad} check(s) failed.`
  : '\nThe plague doctor behaves.');
process.exit(bad ? 1 : 0);
