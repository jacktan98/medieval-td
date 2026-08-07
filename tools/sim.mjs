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
    waveIndex: 0, spawned: 0, timer: 2,
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

// Thin builds on purpose. A full build reaches 20/20 whatever you do to the
// numbers, so it cannot tell a good change from a great one.
// The level is meant to need both families. Archery alone must not clear it,
// and blockers alone cannot kill, so the win has to be a mix. These two are the
// invariants — if either flips, the balance moved.
// Plot indices run in road order, so these lists are a genuine spread along the
// level. Plots 3 and 6 sit too far off the road to be worth a tier 1 archer and
// are deliberately left out of the six-tower builds — a player would not take
// them either, and including them measured the dead plot rather than the family.
const scenarios = {
  'ALL archery x6  (expect LOSS)':  [A(0), A(1), A(2), A(4), A(5), A(7)],
  'ALL archery x8  (expect LOSS)':  [A(0), A(1), A(2), A(4), A(5), A(7), A(8), A(3)],
  'ALL barracks x6 (expect LOSS)':  [B(0), B(1), B(2), B(4), B(5), B(7)],
  'MIX 5 archery + 1 barracks':     [A(0), A(1), A(2), B(4), A(5), A(7)],
  'MIX 4 archery + 2 barracks':     [A(0), B(1), A(2), B(4), A(5), A(7)],
  'MIX 3 archery + 3 barracks':     [A(0), B(1), A(2), B(4), A(5), B(7)],
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
