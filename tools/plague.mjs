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
import { makeUnits, updateUnits, hidden } from '../src/units.js';
import { updateImpacts } from '../src/impacts.js';
// The wave loop, because it is now the thing that guarantees the board moves on
// — see check 5. STALL_GRACE comes with it so the test quotes the same number
// the game uses rather than a copy that can drift.
import { updateWaves, STALL_GRACE } from '../src/waves.js';
import { families } from '../src/data/towers.js';
import { flask, FLASK_HIT, enemyTypes } from '../src/data/waves.js';
// The poison is a STATUS now rather than a field of its own — one mechanism for
// a burning enemy and a poisoned soldier alike. This file reads it the way the
// game does, through the same helpers, so a check here is a check of the thing
// that ships. See src/status.js.
import { apply as applyStatus, wearing, tick as tickStatus } from '../src/status.js';

// The poison a figure is currently wearing, or undefined. A helper rather than
// the expression four times over, and it reads the same list the renderer draws
// from — so a check here cannot pass against a mark that is not on screen.
const dose = v => v.statuses && v.statuses.find(x => x.id === 'poisoned');
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

// A barracks with its squad already marched out and settled on the road. The
// tier is a parameter because the last section musters assassins rather than
// militia, and the whole point of that section is that the SAME fixture behaves
// differently — so it has to be the same fixture.
function withSquad(state, plotIndex = 3, def = barracks.tiers[0]) {
  const plot = level.plots[plotIndex];
  const t = { plot, fam: barracks, def, x: plot.x, y: plot.y, rally: null };
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
      caught.push(state.units.filter(u => dose(u) && dose(u).left === flask.poison.seconds).length);
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
  applyStatus(u, 'poisoned', flask.poison.dps, flask.poison.seconds, flask.kind);

  const before = u.hp;
  // One frame past the duration, not exactly the duration: `left` is counted
  // down by dt a frame at a time, so after precisely seconds/DT frames it is a
  // rounding error above zero rather than at it.
  for (let i = 0; i < flask.poison.seconds / DT + 1; i++) updateUnits(state, DT);
  const lost = before - u.hp;
  const want = flask.poison.dps * flask.poison.seconds;

  check(Math.abs(lost - want) < 1, 'a full dose takes its whole toll',
    `${lost.toFixed(1)} of ${want}, with regen ${u.def.regen}/s suppressed`);
  check(!wearing(u, 'poisoned'), 'and then it wears off and the regen comes back');

  // AND THE MARK COMES OFF WITH IT, which is the half a player can see. A status
  // that outlived its effect would be a droplet over a man nothing is happening
  // to — worse than no mark, because it teaches the player to ignore them.
  check(u.statuses.length === 0, 'and he is wearing nothing afterwards',
    `${u.statuses.length} statuses`);
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
  // UNKILLABLE THROUGH THE DEF, not by writing maxHp. updateUnits recomputes a
  // man's ceiling from `def.hp` every frame and rescales his health onto it —
  // that is how Divine Fortitude reaches men already on the road — so a maxHp
  // written straight onto the unit is undone on the next step and he is back to
  // 100. This fixture did exactly that and was passing for the wrong reason: the
  // men were ordinary, and what kept the doctors alive was the flask bug this
  // run is about. Each man gets his own def so the tier's is not touched.
  for (const u of state.units) {
    u.def = { ...u.def, hp: 1e9 };
    u.maxHp = 1e9;
    u.hp = 1e9;
  }

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
    x, y: 300, rx: x, ry: 300, respawn: 0, statuses: [], hold: 0, healing: 0
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
  check(took(aimed) === FLASK_HIT && wearing(aimed, 'poisoned'),
    'the man it was thrown at takes the blow AND the poison',
    `${took(aimed)} and ${flask.poison.dps}/s for ${flask.poison.seconds}s`);
  check(took(beside) === 0 && wearing(beside, 'poisoned'),
    'a man beside him takes the poison and nothing else', `${took(beside)}`);

  // AND BOTH OF THEM WEAR IT. The status is what the owner asked for and the only
  // part of this a player can read at a glance — a health bar that will not come
  // back up says nothing about why.
  check(dose(aimed) && dose(aimed).dps === flask.poison.dps,
    'and both are marked Poisoned, at the flask\'s own rate',
    `${dose(aimed).dps}/s for ${dose(aimed).left.toFixed(1)}s`);
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
                x: 400, y: 300, rx: 400, ry: 300, respawn: 0, statuses: [],
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
    doses.push(dose(man) ? dose(man).left : 0);
  }

  check(blows.every(d => d === FLASK_HIT), 'every flask lands its full blow, not just the first',
    blows.join(' + '));

  // AND ON A MAN WHO HAS DIED AND MUSTERED AGAIN, which is the case that was
  // broken in play for a long time. A respawn clock counts DOWN past zero and
  // used to be left there — about -0.016 — and land() asked `!mark.respawn`
  // rather than comparing it, so the blow was skipped for every soldier after
  // his first death. The spill went on catching him, so a doctor's flasks
  // quietly became poison-only, starting the moment a man came back at full
  // health. That is why it read as "the damage stopped after he healed".
  //
  // The fixture reproduces the state rather than the death: a mustered man is
  // one whose clock has been run to the bottom, and -0.016 is the number the
  // subtraction actually lands on.
  {
    const back = { ...man, hp: 1000, statuses: [], respawn: -0.0163 };
    const s2 = { units: [back], enemies: [], shots: [], hits: [],
                 impacts: [], splats: [], corpses: [] };
    const before = back.hp;
    s2.shots.push({
      x: 400, y: 260, angle: 0, fromX: 300, side: 'enemy', target: back,
      damage: enemyTypes.plague_inf.ranged.damage, splash: flask.splash,
      ammo: flask, speed: flask.speed,
      from: { x: 300, y: 260 }, to: { x: 400, y: 300 }, flight: 0.2, t: 0, lift: 20
    });
    for (let i = 0; i < 60 && s2.shots.length; i++) updateShots(s2, DT);
    check(Math.round(before - back.hp) === FLASK_HIT,
      'and one who has died and mustered again still takes it',
      `${Math.round(before - back.hp)} with respawn at ${back.respawn}`);
  }

  check(doses.every(d => Math.abs(d - flask.poison.seconds) < 1e-9),
    'and the poison refreshes rather than compounding',
    doses.map(d => d.toFixed(1) + 's').join(' / '));
}

// --- THE MAN HE CANNOT SEE -----------------------------------------------------
//
// The assassin's whole defence, and it is checked HERE rather than in a file of
// its own because the thing it changes is the doctor. Two of the doctor's three
// decisions ask "is there a soldier there" — screened(), which is why he stops,
// and nearestUnit(), which is what he throws at — and hidden() in units.js is the
// one answer both of them now take. A test that only asserted the flag would say
// nothing about either.
//
// THE SAME FIXTURE TWICE is the whole design of this section. A doctor put 110px
// short of a militia squad stops dead and starts throwing; the identical doctor
// put 110px short of an ASSASSIN squad has no reason to do either and walks on
// into them. One number changed between the two runs — which barracks was built —
// so the difference cannot be anything else.
console.log('\nThe man he cannot see\n');
{
  const guild = barracks.tiers.find(d => d.name === 'Assassin Guild');

  const run = def => {
    const state = board();
    withSquad(state, 3, def);
    const stand = squadAt(state);

    spawn(state, 'plague_inf');
    const doc = state.enemies[0];
    doc.hp = 1e6;                        // he is meant to be walked into, not killed
    place(doc, Math.max(0, stand - 110));

    const from = doc.s;
    let flasks = 0;
    for (let i = 0; i < 6 / DT; i++) {
      updateUnits(state, DT);
      const before = state.shots.length;
      updateEnemies(state, DT);
      if (state.shots.length > before) flasks++;   // counted as they LEAVE his hand
      updateShots(state, DT);
      updateImpacts(state, DT);
    }
    return { state, doc, walked: Math.round(doc.s - from), flasks };
  };

  const seen = run(barracks.tiers[0]);
  const unseen = run(guild);

  check(seen.walked < 5 && seen.flasks > 0,
    'a doctor stops for militia and throws at them',
    `${seen.walked}px in 6s, ${seen.flasks} flasks`);

  check(unseen.flasks === 0,
    'and throws nothing at all at assassins',
    `${unseen.flasks} flasks from the same 110px`);

  check(unseen.walked > 40,
    'and walks straight into the men he cannot see',
    `${unseen.walked}px against the militia\'s ${seen.walked}`);

  // AND THEY DO NOT STAY INVISIBLE, which is the other half of the rule and the
  // half a flag-only test would miss. The moment one of them takes hold of him he
  // is a fight rather than an ambush: hidden() goes false, render.js stops fading
  // him, and from then on he is as shootable as anybody.
  const engaged = unseen.state.units.filter(u => u.foe);
  check(engaged.length > 0 && engaged.every(u => !hidden(u)),
    'and they show themselves the moment they have hold of him',
    `${engaged.length} of ${unseen.state.units.length} engaged, none still hidden`);

  check(unseen.doc.foe !== null && unseen.doc.foe !== undefined,
    'so he ends the six seconds pinned rather than throwing');

  // The flag belongs to the man, not to the family. A militiaman is never hidden
  // however the rest of the board is arranged.
  check(seen.state.units.every(u => !hidden(u)),
    'while a militiaman is never hidden from anybody');
}

// --- WHAT THE KNIFE CHANGES ABOUT HIM -------------------------------------------
//
// Knife Throw was written to close the hole check 5 measured — a thrower nobody
// can reach — and against a GUILD it turns out not to be closing that at all,
// because a Guild never had that hole. Its men are invisible, so the doctor never
// stops for them and walks into the ambush and dies of a blade. That is worth
// stating plainly rather than letting the ability's prose claim more than it does:
// the hole is real for a Militia Camp and a Paladin Keep, and it was already shut
// for this tower before either ability existed.
//
// SO WHAT IT ACTUALLY BUYS IS THE ROAD. Untaught, the assassins wait for him to
// arrive and three of them shuffle 50px out of formation to meet him. Taught, he
// dies on the road before he gets there and nobody moves at all — which is a
// different and better thing, and it is what is checked here.
//
// 260px BACK ALONG THE ROAD, which is not 260px away — the road bends, and on this
// map a doctor a quarter of a lap back stands about 109px from the squad in a
// straight line. What the extra road buys is TIME: he walks the last stretch of it
// inside knife reach, so the further back he starts the more of him the knives get
// through before he arrives. At 160 he still reaches them and the ability's
// difference is a second shaved off a melee; at 260 he does not, which is the
// thing worth checking. Both distances are printed below so the number the ability
// actually sees is on the page rather than inferred from this comment — and it has
// stayed true across the reach going from 200 to 100, because the straight-line
// start did not move.
console.log('\nWhat the knife changes about him\n');
{
  const guild = barracks.tiers.find(d => d.name === 'Assassin Guild');

  const siege = ids => {
    const state = board();
    const t = withSquad(state, 3, guild);
    t.abilities = ids;
    const stand = squadAt(state);

    spawn(state, 'plague_inf');
    const doc = state.enemies[0];
    // ON THE ROAD squadAt MEASURED, and this section is the one place in the file
    // that has to say so. spawn() picks a route and a lane at random — three lanes
    // per road, which is what stops a wave reading as a snake — so "160px back
    // along the road" is only 160px from the men if it is the same lane they are
    // standing in. Every other check here is about whether he throws at all and
    // survives the wobble; these four are about a DISTANCE, and one lane over is
    // enough to change which side of a 200px reach he starts on.
    doc.route = 0;
    doc.lane = 1;
    place(doc, Math.max(0, stand - 260));
    const start = Math.round(Math.min(...state.units.map(u => Math.hypot(u.x - doc.x, u.y - doc.y))));

    let secs = 0;
    let gap = Infinity;
    for (let i = 0; i < 60 / DT && state.enemies.length; i++) {
      step(state, DT);
      secs = i * DT;
      const live = state.units.filter(u => u.respawn <= 0);
      if (live.length) gap = Math.min(...live.map(u => Math.hypot(u.x - doc.x, u.y - doc.y)));
    }
    // How far the furthest man ended up from the post he was given. SETTLE is 16
    // in units.js — a settled man is anywhere inside it — so anything much over
    // that is a man who left his station.
    const off = Math.max(...state.units.map(u => Math.hypot(u.x - u.rx, u.y - u.ry)));
    return { state, doc, secs, start, gap: Math.round(gap), off: Math.round(off) };
  };

  const mute = siege([]);
  const armed = siege(['knife']);

  check(mute.doc.killedBy === 'assassin' && mute.state.enemies.length === 0,
    'an untaught Guild lets him walk in and knifes him at arm\'s length',
    `from ${mute.start}px: killedBy ${mute.doc.killedBy} after ${mute.secs.toFixed(1)}s, ${mute.gap}px away`);

  check(armed.doc.killedBy === 'knife',
    'and one that has bought Knife Throw kills him on the road',
    `from ${armed.start}px: killedBy ${armed.doc.killedBy} after ${armed.secs.toFixed(1)}s, ${armed.gap}px away`);

  check(armed.gap > mute.gap, 'so he never reaches the men at all',
    `${armed.gap}px against ${mute.gap}px`);

  // AND NOBODY MOVED TO DO IT, which is the half that would be easiest to lose.
  // An ability that quietly let the squad drift out to throw would pass every
  // check above and break the rule the owner set on all of them.
  check(armed.off <= 16 && armed.off < mute.off,
    'and nobody left his station for it',
    `${armed.off}px off post against ${mute.off}px untaught`);
}

// --- THE DARK PRIEST, AND THE STALL THE OWNER ACCEPTED -------------------------
//
// This file exists because of one sentence in data/waves.js: a pinned thrower is
// in a fight he loses, BECAUSE ENEMIES DO NOT HEAL, so a wave always ends. The
// Dark Priest makes that sentence false, and unlike the version of him that
// shipped for one build he makes it emphatically false — 10 health a second is
// three times a spearman's damage, and only an assassin out-does it.
//
// THAT IS THE OWNER'S DECISION, taken with the consequence in front of him: "I am
// fine if the game stalls theoretically. Players will find ways to prevent this
// from happening, selling towers and placing at right plots or move rally
// points." So what is checked here is no longer "a pinned enemy still dies" —
// he does not, and asserting otherwise would be a tool lying about the game.
//
// WHAT IS CHECKED IS THAT IT IS A STALL AND NOT A LOCK. The wave loop already
// measures: when the field has not cleared in the time an unimpeded walk would
// have taken plus the grace, it hands over. That clock was built for a thrower
// nothing could reach, and this run is the proof that it covers a man nothing can
// out-damage too — which is the difference between a game that gets slow and a
// game that stops.
console.log('\nThe Dark Priest, and the stall the owner accepted\n');

{
  const priest = enemyTypes.dark_priest;

  check(priest.heal.hps === 10 && priest.heal.seconds === 5,
    'a dark healing mends 10 health a second for five',
    `${priest.heal.hps} x ${priest.heal.seconds} = ${priest.heal.hps * priest.heal.seconds} a cast`);

  // REFRESHES RATHER THAN STACKS, which is still true and still worth holding.
  // Re-casting on one man is allowed now; a rate that CLIMBED with the number of
  // priests would not be a healer topping somebody up, it would be an unbounded
  // number.
  const victim = { hp: 100, maxHp: 500, statuses: [] };
  for (let i = 0; i < 3; i++)
    applyStatus(victim, 'healing', priest.heal.hps, priest.heal.seconds, null);
  check(victim.statuses.length === 1, 'three priests on one man is still one mark',
    `${victim.statuses.length} mark(s)`);
  const perSecond = -tickStatus(victim, 1);
  check(Math.abs(perSecond - priest.heal.hps) < 1e-9,
    'and mends at the rate one of them would, not three',
    `${perSecond.toFixed(0)} a second`);

  // AND IT DOES OUT-HEAL A SQUAD, which is the fact the old check denied. Stated
  // rather than asserted away, so the number is in front of whoever reads this
  // next.
  const men = [];
  for (const tier of barracks.tiers) if (tier.soldier)
    men.push({ name: tier.soldier.name, dps: tier.soldier.damage / tier.soldier.cd });
  const best = men.reduce((a, b) => a.dps > b.dps ? a : b);
  check(priest.heal.hps > men[0].dps,
    'and it out-heals a tier 1 squad, which is the accepted consequence',
    `${priest.heal.hps} mended against ${men[0].name} ${men[0].dps.toFixed(2)}, ` +
    `only ${best.name} ${best.dps.toFixed(2)} is over it`);

  // MENDING STOPS AT FULL HEALTH. Without the clamp the bar runs past its own
  // maximum and every health-bar fraction in the game goes over 1.
  const whole = { hp: 95, maxHp: 100, statuses: [] };
  applyStatus(whole, 'healing', priest.heal.hps, priest.heal.seconds, null);
  whole.hp = Math.min(whole.maxHp, whole.hp - tickStatus(whole, 1));
  check(whole.hp === 100, 'and a mended figure stops at full health', `${whole.hp}/100`);
}

// HE DOES NOT PARK ON ONE MAN, which is what the thirty-second memory is for:
// "only go back to healing the same unit after 30 seconds. It goes to heal other
// units first or attack soldiers etc."
//
// Run rather than reasoned about, because the behaviour is emergent — nothing in
// the code says "walk away", it says "this man is not a candidate", and what he
// does instead falls out of the blocks below the heal. The measurable consequence
// is that ONE priest can no longer hold ONE thug alive: he mends 50, looks
// elsewhere, and the squad gets on with it.
{
  const state = board();
  withSquad(state);
  const stand = squadAt(state);

  spawn(state, 'light_inf');
  place(state.enemies[0], Math.max(0, stand - 20));
  spawn(state, 'dark_priest');
  place(state.enemies[1], Math.max(0, stand - 70));
  const priest = state.enemies[1];

  let secs = 0, everMended = false;
  while (secs < 90) {
    step(state, 1); secs++;
    if (priest.mended.length) everMended = true;
    if (!state.enemies.some(e => e.def.name === 'Thug')) break;
  }

  check(everMended, 'a priest does mend the thug in front of him',
    everMended ? 'the mark landed' : 'never cast');
  check(!state.enemies.some(e => e.def.name === 'Thug'),
    'and the squad still kills him, because the priest looks elsewhere after',
    `dead in ${secs}s`);
  check(priest.def.heal.again === 30, 'thirty seconds before that man is a candidate again',
    `${priest.def.heal.again}s`);
}

// AND THE MEMORY IS WHAT SENDS HIM TO THE NEXT MAN, checked directly rather than
// through a fight: two wounded creatures, the worse one mended first, and then the
// OTHER one chosen while the first is still the more injured of the two.
{
  const state = board();
  spawn(state, 'dark_priest');
  spawn(state, 'heavy_inf');
  spawn(state, 'light_inf');
  const [priest, giant, thug] = state.enemies;
  // ONE LANE ON ONE ROAD. spawn() picks both at random, so three figures placed
  // at the same distance along "their" road can be a hundred px apart on the
  // screen — which is outside his reach, and the fixture would then be measuring
  // a priest with nobody to heal rather than a priest choosing between two.
  for (const e of state.enemies) { e.route = 0; e.lane = 1; }
  const hold = () => { place(priest, 200); place(giant, 230); place(thug, 250); };
  hold();
  giant.hp = 100;    // 100 of 800, far the worse
  thug.hp = 60;      // 60 of 80

  let first = null, second = null;
  for (let f = 0; f < 60 * 12; f++) {
    step(state, 1 / 60);
    // Pinned in place, so this measures who he PICKS rather than who he drifts
    // into range of.
    hold();
    if (priest.mended.length === 1 && !first) first = priest.mended[0].mark;
    if (priest.mended.length === 2 && !second) second = priest.mended[1].mark;
    if (second) break;
  }

  const name = m => m ? m.def.name : 'nobody';
  check(first === giant, 'the worst wounded is mended first', name(first));
  check(second === thug,
    'and the next cast goes to somebody else, though the giant is still the worse',
    `${name(second)}, with the giant on ${Math.round(giant.hp)}/${giant.maxHp}`);
  check(priest.mended.every(m => m.left > 0 && m.left <= priest.def.heal.again),
    'and both are held on a clock that is running down',
    priest.mended.map(m => `${name(m.mark)} ${m.left.toFixed(0)}s`).join(', '));

  // AND THE CLOCK RUNS OUT, which is the other half of "after 30 seconds" and the
  // half nothing above would catch. A memory that never expired would look right
  // for the first minute of every wave — each man mended once, the priest moving
  // along the line — and then quietly stop being a healer at all.
  //
  // Run past the cooldown with the giant still far from whole, and he must come
  // back to him.
  const before = priest.mended.length;
  let back = false;
  for (let f = 0; f < 60 * 40 && !back; f++) {
    step(state, 1 / 60);
    hold();
    // The pair he is holding drains, and a fresh entry for the giant is him
    // returning to the man he had finished with.
    if (priest.mended.length && priest.mended.some(m => m.mark === giant && m.left > 29)) back = true;
  }
  check(before === 2 && back,
    'and once it has, he comes back to the man he had finished with',
    back ? `the giant again, on ${Math.round(giant.hp)}/${giant.maxHp}` : 'never returned');
}

// AND THE WAVE STILL HANDS OVER when the board will not clear on its own. The
// memory makes a lone priest much less able to stall one, but a crowd of them can
// still keep a crowd of enemies standing, and the clock is what covers that — the
// same one built for a thrower nothing could reach.
{
  const state = board();
  withSquad(state);
  const stand = squadAt(state);
  for (let i = 0; i < 3; i++) {
    spawn(state, 'dark_priest');
    place(state.enemies[i], Math.max(0, stand - 90 - i * 20));
  }

  let secs = 0;
  while (state.enemies.length && secs < 60) { step(state, 1); secs++; }

  state.waves = [{ groups: [], rest: 9 }];
  state.waveIndex = 0;
  state.spawned = 0;
  state.resting = false;
  state.stall = null;
  state.timer = 0;
  state.result = null;

  let waited = 0;
  while (!state.resting && waited < 400) { updateWaves(state, DT); waited += DT; }

  check(state.resting, 'and a wave that will not clear hands over anyway',
    `after ${waited.toFixed(0)}s with ${state.enemies.length} still on the road`);
}

console.log(bad
  ? `\n${bad} check(s) failed.`
  : '\nThe plague doctor behaves.');
process.exit(bad ? 1 : 0);
