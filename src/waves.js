import { waveClearBonus, earlyCallRate, waveSize, enemyTypes } from './data/waves.js';

// THE WAVES THIS GAME IS SENDING live on the state, not on the level.
//
// They are the level's own table with the chosen difficulty already applied —
// see scaleWaves in data/difficulty.js — and they are built once, when the game
// starts. Reading them off the state rather than off `level` also sidesteps the
// live-binding trap at the top of level.js entirely: there is nothing to capture
// at import time and nothing to remember to re-read.
import { spawn } from './enemies.js';
// The stall clock asks how much road each straggler has left, which is a
// question about the route rather than about the wave — same two helpers the
// archery towers use to rank targets by how close they are to getting through.
import { level, remaining } from './level.js';
import { laneOf } from './route.js';

// state.spawned counts enemies spawned in the CURRENT wave, across all of its
// groups, so a wave that sends militia and then heavies is still one wave with
// one counter. Which group that count falls in is worked out here rather than
// stored, so nothing can drift out of sync with the data.
function groupAt(wave, spawned) {
  let n = 0;
  for (const g of wave.groups) {
    if (spawned < n + g.count) return g;
    n += g.count;
  }
  return null;
}

export function updateWaves(state, dt) {
  const waves = state.waves;
  if (state.waveIndex >= waves.length) {
    if (state.enemies.length === 0 && state.result === null) state.result = 'won';
    return;
  }

  const wave = waves[state.waveIndex];
  state.timer -= dt;

  const group = groupAt(wave, state.spawned);
  if (group) {
    if (state.timer <= 0) {
      spawn(state, group.type);
      state.spawned++;
      // Read the group again: the one that just filled up hands over to the
      // next, and its gap is what should govern the pause before that spawn.
      const next = groupAt(wave, state.spawned);
      state.timer = (next || group).gap;
    }
    return;
  }

  // Wave fully spawned — wait for the field to clear, then bank the bonus.
  //
  // OR FOR THE CLOCK TO RUN OUT, which is the other way a wave can end now. See
  // stallClock: a wave that nothing is finishing hands over anyway rather than
  // holding the game open forever.
  if (state.enemies.length === 0 || stallClock(state, dt)) {
    if (!state.resting) {
      state.gold += waveClearBonus;
      state.resting = true;
      state.timer = wave.rest;
    }
    if (state.timer <= 0) {
      state.waveIndex++;
      state.spawned = 0;
      state.resting = false;
      state.stall = null;
      state.timer = 0;
    }
  }
}

// THE GRACE ON TOP OF THE WALK. Seconds.
//
// The wave is given exactly as long as its stragglers would need to walk the
// rest of the road with nothing in their way, and then this much on top for
// everything that legitimately slows them down: being blocked, being shot at,
// being knocked about. Twenty is the owner's number.
//
// It is the one number to move if waves start handing over while a real fight is
// still going on. A barracks holding a giant for a minute is a normal thing to
// be doing, and it is longer than this grace — see the note on what the clock
// costs, below.
export const STALL_GRACE = 20;

// HOW LONG BEFORE A WAVE GIVES UP WAITING, and why there has to be an answer.
//
// A wave used to end on one condition: the field is clear. That was safe only
// while every enemy was guaranteed to die or reach the exit, and it no longer is
// — a thrower halts in front of a squad that will not come out to him, and if no
// tower reaches where he stopped, nothing on the board will ever move him. The
// argument that used to cover this lived in enemies.js and depended on a pass in
// units.js that the owner has since removed. Rather than rebuild an argument
// spread across two files, the wave loop now measures.
//
// THE CLOCK IS SET ONCE, when the last enemy of the wave has spawned, and it is
// set to how long the walk would take if nothing interrupted it:
//
//   the furthest-from-home enemy on the board decides it. `remaining` is road
//   left, its own speed is how fast it covers it, and the slowest of those is
//   when the last figure would reach the exit unimpeded. Taking the maximum
//   rather than the last-spawned one's own walk matters on a wave that opens
//   with giants: a giant spawned first at 30px/s is still out there long after
//   an archer spawned last at 65 would have left.
//
// PLUS THE GRACE. What is left after that is time nobody can account for by
// walking, which is the definition of stalled.
//
// WHAT IT COSTS. A wave that is genuinely still being fought — a squad grinding
// a giant down for a minute — will trip this and the next wave will start on top
// of it. That is a real change to the game's pacing and it is the owner's call:
// the two options were a clock that can fire early, or a board that can lock up,
// and a clock that fires early is recoverable. STALL_GRACE is the dial.
//
// Returns true on the frame the clock runs out and on every frame after, so the
// caller can treat it exactly like a cleared field. Reset when the wave is
// banked, and on a new game — see newGame in main.js.
function stallClock(state, dt) {
  if (state.stall === null || state.stall === undefined) {
    let slowest = 0;
    for (const e of state.enemies) {
      const road = laneOf(level.routes[e.route], e.lane);
      slowest = Math.max(slowest, remaining(road, e.s) / e.def.speed);
    }
    state.stall = slowest + STALL_GRACE;
  }

  state.stall -= dt;
  return state.stall <= 0;
}

// True when the player may call the next wave in early: during the rest between
// waves, and during the opening delay before the first one. Not mid-wave —
// calling then would stack two waves on the road, which is a different game and
// not one this level is balanced for.
export function canCallWave(state) {
  if (state.result || state.waveIndex >= state.waves.length || state.timer <= 0) return false;
  const opening = state.waveIndex === 0 && state.spawned === 0;
  return state.resting || opening;
}

// Gold for the rest you give up. Paid immediately, so the trade is visible: you
// are buying that gold with the time you would have spent rebuilding.
export function callWaveEarly(state) {
  if (!canCallWave(state)) return 0;
  const bonus = Math.round(state.timer * earlyCallRate);
  state.gold += bonus;
  state.timer = 0;
  return bonus;
}

export function earlyCallBonus(state) {
  return canCallWave(state) ? Math.round(state.timer * earlyCallRate) : 0;
}

// WHAT IS COMING, and it is the one thing the dashboard never told anybody.
//
// Every nine seconds this game asks the player a question — call the wave in
// early and take the gold, or take the time — and until now it asked with the
// composition of that wave hidden. A wave of 24 militia and a wave with 4 giants
// in it are completely different answers to "am I ready", and both looked like
// the words "Next wave" on a plate.
//
// WHICH WAVE IT IS is the one the Next wave button would summon, so the row and
// the button agree: the first wave while the opening delay is still running,
// and the one AFTER the current index at every other moment — during a fight,
// during the rest, and while the field is clearing. Mid-fight the button is dead
// and the row is still the right information: it is what you are buying towers
// for.
//
// GROUPED BY TYPE rather than listed as the table writes them. A wave that sends
// militia, then giants, then more militia is three groups and two pictures, and
// the player is asking "how many giants", not "in what order".
//
// Counts come off `state.waves`, which is the table with the difficulty already
// applied — so what is shown is what will actually walk down the road, not what
// the data file says. See newGame in main.js.
export function upcomingWave(state) {
  const opening = state.waveIndex === 0 && state.spawned === 0;
  const i = opening ? 0 : state.waveIndex + 1;
  if (!state.waves || i >= state.waves.length) return null;

  const total = new Map();
  for (const g of state.waves[i].groups) total.set(g.type, (total.get(g.type) || 0) + g.count);

  return {
    index: i,
    groups: [...total].map(([type, count]) => ({ type, def: enemyTypes[type], count }))
  };
}

export { waveSize };
