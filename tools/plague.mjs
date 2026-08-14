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
// THE THIRD CHECK IS THE IMPORTANT ONE. A wave only ends when the field is
// clear, and his flasks never run out, so the single thing standing between this
// enemy and a game that cannot be finished is that he walks when there is nobody
// ahead of him. That rule lives in one `if` in enemies.js and nothing about the
// game would look wrong the day somebody deleted it — until a board somewhere
// stopped ending.

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

  // A screen, so he stops and throws rather than walking on — see check 3.
  spawn(state, 'light_inf');
  place(state.enemies[1], stand - 20);
  state.enemies[1].hp = 1e6;            // it must not die and un-screen him

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

console.log('\nThe back of the line\n');

// --- 3. he halts behind a screen and walks without one -----------------------
//
// This is the soft-lock check. See the note at the top of the file.
{
  const state = board();
  withSquad(state);
  const stand = squadAt(state);

  spawn(state, 'plague_inf');
  const doc = state.enemies[0];
  place(doc, Math.max(0, stand - 110));

  spawn(state, 'light_inf');
  const screen = state.enemies[1];
  place(screen, stand - 20);
  screen.hp = 1e6;

  step(state, 2);
  const heldAt = doc.s;
  check(doc.halted, 'a doctor with somebody ahead of him stops', `s = ${doc.s.toFixed(0)}`);

  step(state, 3);
  check(Math.abs(doc.s - heldAt) < 0.01, 'and stays stopped while the screen lives',
    `moved ${(doc.s - heldAt).toFixed(2)}px in 3s`);

  // Take the screen away. He is now the front of the line and must come on.
  screen.hp = 0;
  step(state, 3);
  check(!doc.halted, 'the moment nothing is ahead of him he walks');
  check(doc.s > heldAt + 20, 'and he really covers ground',
    `${(doc.s - heldAt).toFixed(0)}px in 3s at ${doc.def.speed}px/s`);
}

// --- 4. two of them do not deadlock each other -------------------------------
//
// Each is behind something, so the naive reading is that both stand still. They
// cannot: only one can be the further back, so the leader always advances.
{
  const state = board();
  withSquad(state);
  const stand = squadAt(state);

  spawn(state, 'plague_inf');
  spawn(state, 'plague_inf');
  const [a, b] = state.enemies;
  a.route = b.route; a.lane = b.lane;   // same road, so one is plainly ahead
  place(a, Math.max(0, stand - 100));
  place(b, Math.max(0, stand - 140));

  const startA = a.s;
  step(state, 4);
  check(a.s > startA + 20, 'of two doctors the front one still comes on',
    `front moved ${(a.s - startA).toFixed(0)}px`);
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
}

console.log(bad
  ? `\n${bad} check(s) failed.`
  : '\nThe plague doctor behaves.');
process.exit(bad ? 1 : 0);
