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
// CHECK 5 IS THE IMPORTANT ONE, and it is the reason he is allowed to stand
// still at all. His flasks never run out and he stands off for as long as men
// are in front of him, so an enemy with no bound on standing still is a game
// that can hang.
//
// WHAT BOUNDS IT IS A CLOCK IN THE WAVE LOOP, and getting there took three
// wrong answers worth writing down. Three designs bounded it on HIM — a finite
// basket, a rule about screens, then 14 seconds of patience; the first two
// bounded the flasks and not the time, and the third read as a man losing his
// nerve on a timer. A fourth bounded it on the OTHER ARMY: a soldier walked out
// to a thrower who would not come to him. That one worked and the owner has
// since overruled it — a squad holds the ground it was posted to hold, and
// takes what is thrown at it.
//
// So the bound is no longer anywhere in the fight. updateWaves measures how long
// the stragglers would need to walk out unimpeded, adds a grace, and hands over
// when that passes. Check 5 asserts BOTH halves of that: the board genuinely
// does not clear, and the wave moves on regardless. It is deliberately the case
// that soft-locked every earlier design — men his poison can never kill.

import { spawn, updateEnemies } from '../src/enemies.js';
import { updateShots } from '../src/projectiles.js';
import { makeUnits, updateUnits } from '../src/units.js';
import { updateImpacts } from '../src/impacts.js';
// The wave loop, because it is now the thing that guarantees the board moves on
// — see check 5. STALL_GRACE comes with it so the test quotes the same number
// the game uses rather than a copy that can drift.
import { updateWaves, STALL_GRACE } from '../src/waves.js';
import { families } from '../src/data/towers.js';
import { flask, FLASK_HIT, enemyTypes } from '../src/data/waves.js';
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

// --- 3. he stops at throwing range, and the squad has to come and get him -----
//
// The behaviour this enemy exists for, and the one that can hang the game, so
// both halves are asserted in the same run: he must STOP while men screen the
// road ahead of him and never advance on his own while they are there, and the
// SQUAD must be the thing that ends it, by walking out and pinning him.
//
// The second half is what replaced his patience. He used to walk in after 14
// seconds with the board unchanged; now nothing about the board has to change
// and he is still not standing there at the end of it.
{
  const state = board();
  withSquad(state);
  const stand = squadAt(state);

  spawn(state, 'plague_inf');
  const doc = state.enemies[0];
  doc.hp = 1e6;                        // he must be pinned, not killed
  // Just inside his throwing range and well outside a soldier's ENGAGE, so what
  // is measured is his own decision rather than him being caught where he stands.
  place(doc, Math.max(0, stand - 125));

  // Long enough to see him decide and throw, short enough that the man walking
  // out to him has not arrived yet — he is fetched in about a second and a half,
  // so what is being measured here is his own halt rather than the squad's answer
  // to it.
  const from = doc.s;
  let threw = 0, everHalted = false;
  for (let i = 0; i < 1 / DT; i++) {
    updateUnits(state, DT);
    updateEnemies(state, DT);
    const before = state.shots.length;
    updateShots(state, DT);
    if (state.shots.length < before) threw++;
    if (doc.halted) everHalted = true;
    updateImpacts(state, DT);
  }
  const held = doc.s - from;

  check(threw > 0, 'he throws at a squad in reach', `${threw} flasks`);
  check(held < 2 && everHalted, 'and stops rather than walking into it',
    `${held.toFixed(0)}px covered in 1s`);

  // AND NOBODY COMES OUT TO HIM. This asserted the opposite for one build — a
  // soldier was sent to fetch him — and the owner has since ruled that a squad
  // holds its rally point: "It is okay if they are attacked from afar and cannot
  // do anything." So the check is inverted rather than deleted, because the
  // inversion is the rule. Left alone he stands there, and the squad stands
  // where it was posted.
  const before = doc.s;
  let secs = 0;
  for (; secs < 20 && !doc.foe; secs++) step(state, 1);

  check(!doc.foe, 'and no soldier leaves the rally point to fetch him',
    `${secs}s with the squad holding`);
  check(doc.s < before + 2, 'and he does not advance either',
    `${(doc.s - before).toFixed(0)}px`);
  // 20 rather than 0: SETTLE in units.js is 16, so a man who has arrived stops
  // within 16px of his post rather than standing exactly on it. What is being
  // asserted is that nobody has SET OUT — a fetched man ends up 100px away.
  check(state.units.every(u => Math.hypot(u.x - u.rx, u.y - u.ry) < 20),
    'and every man is still on his own station',
    state.units.map(u => Math.hypot(u.x - u.rx, u.y - u.ry).toFixed(0)).join('/'));
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

  // COUNTED ON THE THROW, not on the landing. The first version counted shots
  // leaving the list, which is where a flask ARRIVES — and one thrown a frame
  // before a soldier reached him lands a second later, inside the held window,
  // and read as a flask thrown from inside the melee. What is being asked is
  // whether one is created while somebody has hold of him.
  let threw = 0, everHeld = false;
  for (let i = 0; i < 8 / DT; i++) {
    updateUnits(state, DT);
    const held = !!doc.foe;
    const before = state.shots.length;
    updateEnemies(state, DT);
    if (held && state.shots.length > before) threw++;
    if (held) everHeld = true;
    updateShots(state, DT);
    updateImpacts(state, DT);
  }

  check(everHeld, 'a soldier walks out and locks him down');
  // AND NOTHING LEAVES HIS HAND WHILE HE IS HELD, which is the reverse of what
  // this checked before. A pinned thrower swings the flask instead of throwing
  // it, at the owner's word — what makes pinning him a fight rather than an off
  // switch is his club, which went from 5 to 20 in the same pass.
  check(threw === 0, 'and throws nothing at all from inside the melee',
    `${threw} flasks while held`);
}

// --- 5. the board does NOT empty, and the wave loop is what moves on ----------
//
// THE SOFT-LOCK, RUN ON PURPOSE, and it is no longer a case that resolves. For
// one build the guarantee was "a soldier walks out and kills him"; the owner has
// ruled that a squad holds its rally point, so a thrower who halts where nothing
// reaches him is killed by nothing, advances never and leaks never. That is the
// truth about the board now, and pretending otherwise in a tool is worse than
// having no tool.
//
// So this asserts the lock — three doctors against men their poison cannot kill,
// left to run — and then asserts the thing that actually saves the game from it:
// updateWaves times the wave out and hands over anyway.
//
// The men are unkillable on purpose. Check 3 already covers one doctor against a
// squad that can lose; this is the deeper line, the tier 3 squad, the two
// barracks covering one stretch — every board where the poison never wins.
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
  while (state.enemies.length && secs < 120) { step(state, 1); secs++; }

  check(state.enemies.length === 3, 'three doctors against unkillable men never clear',
    `${secs}s, ${state.enemies.length} left`);
  check(state.enemies.every(e => e.halted), 'and every one of them is stood off',
    state.enemies.map(e => e.halted).join('/'));

  // AND THE WAVE HANDS OVER ANYWAY. The wave table is emptied so the loop is
  // past spawning on the first call, which is the state the clock is set in.
  // `stall` starts null exactly as newGame leaves it.
  state.waves = [{ groups: [], rest: 9 }];
  state.waveIndex = 0;
  state.spawned = 0;
  state.resting = false;
  state.stall = null;
  state.timer = 0;
  state.result = null;

  let waited = 0;
  while (!state.resting && waited < 400) { updateWaves(state, DT); waited += DT; }

  check(state.resting, 'but the wave gives up waiting and rests anyway',
    `after ${waited.toFixed(0)}s with ${state.enemies.length} still on the road`);
  // The clock is the walk plus the grace, and with three doctors halfway down a
  // road the walk is the dominant half — so what is asserted is that it fired,
  // and that it did not fire so early that a wave still arriving would trip it.
  check(waited > STALL_GRACE, 'and not before the stragglers could have walked out',
    `${waited.toFixed(0)}s against a ${STALL_GRACE}s grace`);
}

// --- THE BLOW AND THE PATCH ARE TWO DIFFERENT THINGS ---------------------------
//
// The flask does both now: it breaks on ONE man for its own damage, and it
// leaves a spill that poisons everyone standing in it. Getting that wrong in
// either direction is invisible in play — a blow applied to the whole patch is
// the doctor quietly doing three times his damage, and a blow applied to nobody
// is the owner's change silently not shipping.
//
// So: three men, one aimed at, one beside him inside the splash, one well clear.
console.log('\nWhat one flask does to three men\n');
{
  const man = (x, name) => ({
    def: { r: 8, hp: 275, damage: 7, cd: 0.8, name }, hp: 275, maxHp: 275,
    x, y: 300, rx: x, ry: 300, respawn: 0, poison: null, hold: 0, healing: 0
  });
  const aimed = man(400, 'the man it was thrown at');
  const beside = man(400 + Math.round(flask.splash / 2), 'a man beside him');
  const clear = man(400 + flask.splash * 4, 'a man well clear');
  const state = { units: [aimed, beside, clear], enemies: [], shots: [], hits: [],
                  impacts: [], splats: [], corpses: [] };

  state.shots.push({
    x: 400, y: 260, angle: 0, fromX: 300, side: 'enemy', target: aimed,
    damage: FLASK_HIT, splash: flask.splash, ammo: flask, speed: flask.speed,
    from: { x: 300, y: 260 }, to: { x: 400, y: 300 }, flight: 0.2, t: 0, lift: 20
  });
  for (let i = 0; i < 60 && state.shots.length; i++) updateShots(state, 1 / 60);

  const took = u => Math.round(u.maxHp - u.hp);
  check(took(aimed) === FLASK_HIT && !!aimed.poison,
    'the man it was thrown at takes the blow AND the poison',
    `${took(aimed)} and ${flask.poison.dps}/s for ${flask.poison.seconds}s`);
  check(took(beside) === 0 && !!beside.poison,
    'a man beside him takes the poison and nothing else', `${took(beside)}`);
  check(took(clear) === 0 && !clear.poison,
    'and a man outside the patch takes neither');

  // AND THE TWO HALVES AGREE WITH THE CARD. His club and his glass are the same
  // number by the owner's rule, and the card prints that number — see
  // listedDamage in data/waves.js for why the poison is not in it.
  const doc = enemyTypes.plague_inf;
  check(doc.damage === FLASK_HIT && doc.ranged.damage === FLASK_HIT &&
        doc.listedDamage === FLASK_HIT,
    'and his club, his glass and his card are one number', `${FLASK_HIT}`);
}

// --- EVERY FLASK, NOT JUST THE FIRST ------------------------------------------
//
// The blow is per-throw and the poison is not, and those are two different rules
// on one bottle — which is exactly the pair that gets conflated. The poison
// REFRESHES rather than stacks (see hit() in projectiles.js), and it would be an
// easy mistake to make the blow refresh with it and quietly turn a doctor into a
// man who hurts you once and then only ever tops the clock up.
//
// So: four flasks onto one stationary man, and the blow is asserted on every one
// of them rather than on the total. The poison is asserted NOT to compound in
// the same run — same length after the fourth as after the first.
{
  const man = { def: { r: 8, name: 'a man who does not move' }, hp: 1000, maxHp: 1000,
                x: 400, y: 300, rx: 400, ry: 300, respawn: 0, poison: null,
                hold: 0, healing: 0 };
  const state = { units: [man], enemies: [], shots: [], hits: [],
                  impacts: [], splats: [], corpses: [] };

  const blows = [];
  const doses = [];
  for (let n = 0; n < 4; n++) {
    const before = man.hp;
    state.shots.push({
      x: 400, y: 260, angle: 0, fromX: 300, side: 'enemy', target: man,
      damage: enemyTypes.plague_inf.ranged.damage, splash: flask.splash,
      ammo: flask, speed: flask.speed,
      from: { x: 300, y: 260 }, to: { x: 400, y: 300 }, flight: 0.2, t: 0, lift: 20
    });
    // Just the flight and the landing. updateUnits is deliberately NOT stepped,
    // so what is measured is the blow alone with no poison tick or regen in it.
    for (let i = 0; i < 60 && state.shots.length; i++) updateShots(state, DT);
    blows.push(Math.round(before - man.hp));
    doses.push(man.poison ? man.poison.left : 0);
  }

  check(blows.every(d => d === FLASK_HIT), 'every flask lands its full blow, not just the first',
    blows.join(' + '));
  check(doses.every(d => Math.abs(d - flask.poison.seconds) < 1e-9),
    'and the poison refreshes rather than compounding',
    doses.map(d => d.toFixed(1) + 's').join(' / '));
}

console.log(bad
  ? `\n${bad} check(s) failed.`
  : '\nThe plague doctor behaves.');
process.exit(bad ? 1 : 0);
