// Headless balance run. Node only — never loaded by the game.
//
//   node tools/sim.mjs
//
// Imports the real update functions and steps them at a fixed 1/60s with no
// canvas, so a full eight-wave run takes about a second instead of five
// minutes. Nothing here is a model of the game; it is the game, minus drawing.
//
// Add an enemy type or retune a tower, then run this before committing. The
// archery baseline below is the balance the project was originally tuned to,
// and it should keep reading "won 20/20" — if it moves, something changed that
// you did not mean to change.

import { updateEnemies } from '../src/enemies.js';
import { updateTowers } from '../src/towers.js';
import { updateShots } from '../src/projectiles.js';
import { updateWaves } from '../src/waves.js';
import { updateUnits, makeUnits } from '../src/units.js';
import { updateCorpses } from '../src/corpses.js';
import { updateSplats } from '../src/blood.js';
import { updateImpacts } from '../src/impacts.js';
import { families } from '../src/data/towers.js';
import { level, levels, useLevel } from '../src/level.js';
import { openingDelay } from '../src/data/waves.js';

const DT = 1 / 60;
const TIME_LIMIT = 900;   // seconds of game time before a run is called stuck

// A plan is a shopping list. Towers are bought in order as gold allows, then
// upgraded toward their target tier — roughly how a player spends.
export const A = (plot, tier = 2) => ({ plot, fam: 'archery', tier });
export const B = (plot, tier = 2) => ({ plot, fam: 'barracks', tier });
export const S = (plot, tier = 2) => ({ plot, fam: 'siege', tier });

function newState() {
  return {
    gold: level.startGold,
    lives: level.startLives,
    towers: [], enemies: [], units: [], shots: [], hits: [], corpses: [], splats: [], impacts: [],
    waveIndex: 0, spawned: 0, timer: openingDelay,
    // Set explicitly rather than left undefined: the game holds everything until
    // the player presses Start, and a headless run has no player. If this is ever
    // missing the sim measures a game that never begins.
    started: true,
    resting: false, menu: null, result: null
  };
}

function build(state, entry) {
  const fam = families.find(f => f.id === entry.fam);
  const def = fam.tiers[0];
  if (state.gold < def.cost) return false;

  const plot = level.plots[entry.plot];
  const t = {
    plot, fam, def,
    x: plot.x, y: plot.y,
    aim: 0, cd: 0, recoil: 0,
    // The animation clock, same as input.js sets on a real build. A catapult
    // that never leaves beat 0 never fires, and it would fail silently: the sim
    // would just report that artillery is worthless.
    beat: 0, beatT: 0, face: 0,
    spent: def.cost,
    wantTier: entry.tier
  };
  state.gold -= def.cost;
  state.towers.push(t);
  makeUnits(state, t);
  return true;
}

function upgrade(state) {
  for (const t of state.towers) {
    while (t.def.tier - 1 < t.wantTier) {
      const next = t.fam.tiers[t.def.tier];
      if (!next || state.gold < next.cost) break;
      state.gold -= next.cost;
      t.def = next;
      t.spent += next.cost;
      makeUnits(state, t);
    }
  }
}

// A seeded random number generator, installed over Math.random for the length
// of a run and taken off again afterwards.
//
// The game became RANDOM when enemies got lanes: each one picks a road and a
// side of it at spawn, so no two runs of the same build are the same game. That
// turned this tool from a measurement into a coin toss — the same plan measured
// twice in a row came out "won with 3 lives" and then "lost at wave 7", which is
// not a difference anyone can tune against.
//
// Seeding it puts determinism back without taking the randomness out of the
// game: the same plan and seed always play out identically, and different seeds
// are different battles. That is why the scenarios below are run across several
// seeds rather than one — a single seed is one battle, and the question is how a
// build does in general.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function run(plan, seed = 1) {
  const realRandom = Math.random;
  Math.random = mulberry32(seed);
  try {
    return play(plan);
  } finally {
    Math.random = realRandom;
  }
}

function play(plan) {
  const state = newState();
  const pending = [...plan];
  let time = 0;

  while (!state.result && time < TIME_LIMIT) {
    // Upgrade before expanding. Spending everything on tier 1s and only then
    // improving them is a strategy no one plays, and modelling it that way made
    // the economy, not the towers, decide the outcome.
    upgrade(state);
    while (pending.length && build(state, pending[0])) pending.shift();

    updateWaves(state, DT);
    updateUnits(state, DT);      // before enemies, so a freshly blocked enemy
    updateEnemies(state, DT);    // is already held when movement is decided
    updateTowers(state, DT);
    updateShots(state, DT);
    updateCorpses(state, DT);    // decoration, but kept so this stays the game
    updateSplats(state, DT);
    // Decoration too, and kept for the same reason: a plague doctor's spill is
    // pushed onto state.impacts by the same land() the sim runs for real, so
    // without this the list grows for the whole run and the sim stops being the
    // game it claims to be.
    updateImpacts(state, DT);
    if (state.lives <= 0) state.result = 'lost';
    time += DT;
  }

  return {
    result: state.result || 'stuck',
    lives: state.lives,
    wave: state.waveIndex,
    gold: state.gold,
    time: Math.round(time)
  };
}

// The level is meant to need both families. Archery alone must not clear it,
// and blockers alone cannot kill, so the win has to be a mix. Those two are the
// invariants — if either flips, the balance moved.
//
// These are the BEST build of each kind, not a representative one. "Archery
// alone cannot win" is a claim about the best all-archery build that exists, so
// testing a mediocre one proves nothing. Each list is the winner of every
// six-tower combination of the usable plots crossed with all 64 family
// assignments of each — `node tools/sweep.mjs` prints them ready to paste, and
// it is the thing to run after any map redraw, before this.
//
// Plots 2 and 5 sit more than 110px off the road and cover almost none of it,
// so they are left out of the six-tower builds — a player would not take them
// either, and including one measured the dead plot rather than the family.
//
// WHICH build is best moves when the level does. Putting the path's ends back on
// the road shortened it from 1832 to 1804 and lifted the entry leg 40px, and the
// crown passed from the 4+2 build to the 5+1 one. Re-sweep rather than assuming
// the labels below still rank the way they did: 448 builds is 18 seconds.
//
// WHICH plot gets which family is not arbitrary, and getting it wrong makes the
// whole file lie. These indices were carried over unchanged the first time the
// artist moved the markers, and because plots are stored in road order, the
// re-ordering quietly put the barracks on the two highest-coverage plots and the
// archers on the two worst. Every mix "lost", which read as a balance collapse
// and was really a bad shopping list.
//
// Coverage per plot at tier 1 range (190, elliptical) is
//   18.9 / 28.0 / 5.8 / 29.7 / 30.7 / 6.1 / 17.5 / 22.0 / 18.2 percent
// for plots 0..8, and the seven usable ones cover 95.7% between them.
//
// Those are ELLIPSE numbers and are not comparable to the circle numbers this
// comment used to carry. Range went 150 -> 190 at tier 1 in the same change that
// made reach elliptical, and the two roughly cancel: a plot covers about what it
// used to, out of a ring that is 27% wider and 21% shorter. Re-measure after any
// redraw before trusting these, and do not trust the number itself too far: plot
// 8 once rose from 13.3 to 15.3 in the redraw that forced the heavy's hp DOWN.
// See the note on that hp in data/waves.js — coverage says where a tower can
// shoot, not whether anything can shoot the place a blocker stands.
//
// Every list below was re-derived by sweep after reach became elliptical and the
// barracks learned to gang up. Both of those moved which plots are worth taking:
// plot 0 is in three of the four winning builds now and was in none of them, and
// the best 5+1 build no longer wins at all, so the scenario that used to be the
// thinnest win is now listed as a loss. That is not a regression — it is the same
// lesson as every redraw before it, which is that the shopping list goes stale
// before the balance does.
//
// One thing this file CANNOT measure: barracks `range`. It is the leash on the
// rally point, and the sim never moves a rally, so every barracks here fights at
// its default stand. Changing 130 -> 165 showed up as literally identical output
// in all seven scenarios. That number is checked by playing, not by this.
//
// The level is far less brittle than it was. 33 of 448 builds clear it, against 4
// before these changes — and the 4 was fragile enough that a single plot marker
// moving 150px took it to 0. Wider is the point; it is still 7%.
//
// PER LEVEL, because a plot index means a different place on each map and a
// shopping list is only meaningful against the map it was swept on. Run
// `node tools/sweep.mjs 2` after redrawing map 2 and paste its rows here.
// EXPORTED so an experiment can run the real scenarios instead of retyping
// them. Retyping is how a damage sweep spent an afternoon measuring map 2's
// builds on map 1: the plot indices are per-map and the two lists look alike.
export const byLevel = {
m1: {
  'ALL archery x6  (expect LOSS)':  [A(1), A(3), A(4), A(6), A(7), A(8)],
  'ALL archery x8  (expect LOSS)':  [A(1), A(3), A(4), A(6), A(7), A(8), A(2), A(5)],
  'ALL barracks x6 (expect LOSS)':  [B(1), B(3), B(4), B(6), B(7), B(8)],
  // The best 5+1 build there is, and it loses. One blocker is no longer enough
  // to hold wave 8 now that the heavy has 1500hp, which is what makes the two
  // families need each other properly rather than nominally.
  'BEST 5 archery + 1 (expect LOSS)': [A(1), B(3), A(4), A(6), A(7), A(8)],
  // Listed in plot order, which is also BUILD order: the plan is a shopping list
  // spent as gold arrives, so moving a barracks to the end of the line is a
  // different build, not the same one written differently. Sorting these lists
  // "tidily" by family turned a 4+2 win into a wave 7 loss once already.
  'MIX 4 archery + 2 barracks':     [A(0), A(1), A(4), B(6), B(7), A(8)],
  'MIX 3 archery + 3 barracks':     [A(1), B(3), A(4), B(6), B(7), A(8)],
  'MIX 2 archery + 4 barracks':     [B(0), B(3), A(4), A(6), B(7), B(8)],
  // Artillery, held to the SAME two rules as the other families: no family
  // clears the level alone, and five towers behind one blocker is never enough
  // however good the five are. Both hold with an enormous margin — see the
  // plateau note above `siege` in src/data/towers.js, where neither loss flips
  // anywhere between 25 and 55 damage.
  //
  // The mixes SWAP ARCHERY for artillery and keep three blockers, because that
  // is the comparison worth having: a catapult against the tower it competes
  // with for a plot. Swapping a BARRACKS for one just measures what losing a
  // blocker on wave 8 costs, which is already known and is fatal for any family.
  'ALL siege x6    (expect LOSS)':  [S(1), S(3), S(4), S(6), S(7), S(8)],
  'BEST 5 siege + 1 (expect LOSS)': [S(1), B(3), S(4), S(6), S(7), S(8)],
  'MIX 2 archery + 3 barracks + 1 siege': [S(1), B(3), A(4), B(6), B(7), A(8)],
  'MIX 3 siege + 3 barracks':       [S(1), B(3), S(4), B(6), B(7), S(8)],
  'under-built     (expect LOSS)':  [A(1, 0)]
},

// Map 2, from `node tools/sweep.mjs 2`. Its plots are all live — none of them is
// more than 91px off the road — so there is no dead-plot scenario to write.
//
// The two roads are why the mixes look the way they do: plots 0 and 4 watch the
// northern road only, 1, 2 and 3 the southern, and 5 to 8 sit past the junction
// where everything funnels together. A build that ignores one arm loses to the
// half of every wave that walks up it.
m2: {
  'ALL archery x6  (expect LOSS)':  [A(0), A(1), A(2), A(3), A(5), A(6)],
  'ALL barracks x6 (expect LOSS)':  [B(2), B(3), B(4), B(5), B(7), B(8)],
  'BEST 5 archery + 1 (expect LOSS)': [A(0), A(1), B(2), A(3), A(4), A(7)],
  'MIX 4 archery + 2 barracks':     [A(0), A(2), B(5), B(6), A(7), A(8)],
  'MIX 3 archery + 3 barracks':     [A(2), B(4), A(5), A(6), B(7), B(8)],
  'MIX 2 archery + 4 barracks':     [A(1), B(3), B(4), B(5), B(7), A(8)],
  'ALL siege x6    (expect LOSS)':  [S(0), S(1), S(2), S(3), S(5), S(6)],
  'BEST 5 siege + 1 (expect LOSS)': [S(0), S(1), B(2), S(3), S(4), S(7)],
  'MIX 2 archery + 3 barracks + 1 siege': [S(2), B(4), A(5), A(6), B(7), B(8)],
  'MIX 3 siege + 3 barracks':       [S(2), B(4), S(5), S(6), B(7), B(8)],
  'under-built     (expect LOSS)':  [A(2, 0)]
}
};

// Which map to balance. `node tools/sim.mjs 2` runs the second one.
//
// Only when this file IS the program. It used to select the level at import
// time from process.argv, which quietly broke every other script that imports
// run() — those scripts have their own arguments, sim.mjs read them as a map
// number, and an experiment that thought it was measuring map 2 measured map 1
// with map 2's plot indices. Two hours of "the second map is unwinnable" came
// out of that.
if (import.meta.url === `file://${process.argv[1]}`) {
  const which = Number(process.argv[2] || 1);
  useLevel(which - 1);
  console.log(`level ${which}: ${level.name}\n`);

  // Five battles per build, not one. See mulberry32 above: with lanes in, a
  // single run is a single battle, and the spread between them is wide enough
  // to flip a verdict.
  const SEEDS = [1, 2, 3, 4, 5];

  const scenarios = byLevel[level.id];
  if (!scenarios) throw new Error(`no scenarios for level ${level.id}`);

  for (const [label, plan] of Object.entries(scenarios)) {
    const rs = SEEDS.map(s => run(plan, s));
    const wins = rs.filter(r => r.result === 'won').length;
    const lives = rs.map(r => r.lives).sort((a, b) => a - b);
    const waves = rs.map(r => r.wave).sort((a, b) => a - b);
    const verdict = wins === SEEDS.length ? 'won' : wins === 0 ? 'lost' : `${wins}/5`;
    console.log(
      `${label.padEnd(38)} ${verdict.padEnd(6)}  lives ${String(lives[2]).padStart(3)}/${level.startLives}` +
      ` (${lives[0]}..${lives[lives.length - 1]})  wave ${waves[2]}`
    );
  }
}
