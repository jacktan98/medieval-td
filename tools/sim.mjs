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
import { families } from '../src/data/towers.js';
import { plots, startGold, startLives } from '../src/data/level01.js';
import { openingDelay } from '../src/data/waves.js';

const DT = 1 / 60;
const TIME_LIMIT = 900;   // seconds of game time before a run is called stuck

// A plan is a shopping list. Towers are bought in order as gold allows, then
// upgraded toward their target tier — roughly how a player spends.
export const A = (plot, tier = 2) => ({ plot, fam: 'archery', tier });
export const B = (plot, tier = 2) => ({ plot, fam: 'barracks', tier });

function newState() {
  return {
    gold: startGold,
    lives: startLives,
    towers: [], enemies: [], units: [], shots: [], hits: [],
    waveIndex: 0, spawned: 0, timer: openingDelay,
    resting: false, menu: null, result: null
  };
}

function build(state, entry) {
  const fam = families.find(f => f.id === entry.fam);
  const def = fam.tiers[0];
  if (state.gold < def.cost) return false;

  const plot = plots[entry.plot];
  const t = {
    plot, fam, def,
    x: plot.x, y: plot.y,
    aim: 0, cd: 0, recoil: 0,
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

export function run(plan) {
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
// testing a mediocre one proves nothing. Each list was found by running every
// six-tower combination of the usable plots and all 64 family assignments of
// each, and keeping the winner.
//
// Plots 3 and 6 sit more than 110px off the road and cover almost none of it,
// so they are left out of the six-tower builds — a player would not take them
// either, and including one measured the dead plot rather than the family.
//
// WHICH plot gets which family is not arbitrary, and getting it wrong makes the
// whole file lie. These indices were carried over unchanged when the artist
// moved the markers, and because plots are stored in road order, the re-ordering
// quietly put the barracks on the two highest-coverage plots and the archers on
// the two worst. Every mix "lost", which read as a balance collapse and was
// really a bad shopping list. Coverage per plot at tier 1 range against the
// 1832px road is 9.5 / 21.5 / 6.7 / 0 / 22.6 / 18.3 / 1.4 / 18.2 / 10.2 percent
// for plots 0..8; re-measure after any redraw before trusting these lists.
// (Those figures are at the old tier 1 range of 118. The reach is 150 now, so
// every plot covers more than this — the ORDER is what still matters.)
const scenarios = {
  'ALL archery x6  (expect LOSS)':  [A(1), A(2), A(4), A(5), A(7), A(8)],
  'ALL archery x8  (expect LOSS)':  [A(1), A(2), A(4), A(5), A(7), A(8), A(0), A(3)],
  'ALL barracks x6 (expect LOSS)':  [B(0), B(1), B(2), B(4), B(5), B(7)],
  'MIX 5 archery + 1 barracks':     [A(1), A(2), A(4), A(5), A(7), B(8)],
  'MIX 4 archery + 2 barracks':     [A(1), B(2), A(4), A(5), A(7), B(8)],   // the best build there is
  'MIX 3 archery + 3 barracks':     [A(1), B(2), A(4), A(5), B(7), B(8)],
  'under-built     (expect LOSS)':  [A(1, 0)]
};

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const [label, plan] of Object.entries(scenarios)) {
    const r = run(plan);
    console.log(
      `${label.padEnd(38)} ${r.result.padEnd(6)}  lives ${String(r.lives).padStart(3)}/${startLives}` +
      `  wave ${r.wave}  gold ${String(r.gold).padStart(4)}  ${r.time}s`
    );
  }
}
