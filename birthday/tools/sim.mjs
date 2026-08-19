// Does the birthday game work, and is any of the family a trap? Node only.
//
//   node birthday/tools/sim.mjs
//
// It runs the real rules headless at a fixed 1/60s — `../src/rules.js` has no
// browser in it, which is what makes this possible — and plays each map with
// several compositions of the four of them.
//
// TWO QUESTIONS, and the second is the one that matters.
//
// DOES IT RUN? Eight or ten waves of three kinds of thug, with blocking, slime,
// a shotgun spray and an aura all going at once, is more than anyone will click
// through by hand. A crash on wave 7 would otherwise be found by a five-year-old.
//
// IS ANYONE A TRAP? This is a birthday present for four people, so a build with
// one of each has to be a reasonable way to play it. If the only thing that works
// is four Papas then three of the family are decoration, which is the one outcome
// worth spending an evening avoiding.
//
// The bar is deliberately low: MIXED should win most maps, should be no worse than
// playing one person, and every one of the four should be on a winning team
// somewhere. It is not a balance proof and is not trying to be one — the big
// game's invariant costs twenty seeds and an afternoon per change, and this is a
// birthday present.

import { newGame, step, build, upgrade, family, maps } from '../src/rules.js';
import { nearestOn } from '../../src/route.js';

const DT = 1 / 60;

// Give up on a run this long. Long enough for the slowest winning build measured
// so far (548s) with room, short enough that nine runs finish in a few seconds.
const LIMIT = 1500;

// How a plan is played: fill the plots NEAREST THE ROAD first, cycling the list,
// and then spend whatever comes in on upgrades. Roughly how somebody actually
// plays.
//
// The order matters more than it looks. Filling plots in the order the level file
// lists them buries Rei Rei — whose reach is the shortest in the family — on
// whichever plot happens to be furthest from the road, where he does nothing at
// all. That is a fact about this file, not about the game, and it made the mixed
// build look like a coin toss when the real thing is comfortable. A player looks
// at the board and puts the short-ranged one by the road.
function run(mapIndex, plan) {
  const s = newGame(mapIndex);
  s.screen = 'play';
  const plots = [...s.map.plots].sort((a, b) =>
    nearestOn(s.map.routes, a.x, a.y).d - nearestOn(s.map.routes, b.x, b.y).d);
  let built = 0;
  let t = 0;

  while (!s.result && t < LIMIT) {
    if (built < plots.length) {
      const who = family.find(f => f.id === plan[built % plan.length]);
      if (build(s, plots[built], who)) built++;
    } else {
      for (const tower of s.towers) if (upgrade(s, tower)) break;
    }
    step(s, DT);
    t += DT;
  }

  return { result: s.result || 'stuck', lives: s.lives, wave: s.waveIndex + 1, t };
}

// FIVE RUNS OF EACH, and the majority answer. Thugs pick a lane and a road at
// random when they spawn, so one run of one plan is a coin toss at the margins —
// and tuning against a coin toss is how an afternoon disappears. Three was not
// enough: a plan sitting near 50% flipped its verdict between runs of this file,
// which reads as a balance change that never happened.
const TRIES = 5;

const best = (mapIndex, plan) => {
  const runs = Array.from({ length: TRIES }, () => run(mapIndex, plan));
  const wins = runs.filter(r => r.result === 'won').length;
  const typical = runs.sort((a, b) => a.lives - b.lives)[TRIES >> 1];
  return { ...typical, result: wins * 2 > TRIES ? 'won' : typical.result, wins };
};

const PLANS = [
  ['MIXED', ['papa', 'olivia', 'rei', 'mommy']],
  ['papa only', ['papa']],
  ['mommy only', ['mommy']],
  ['olivia only', ['olivia']],
  ['rei only', ['rei']],
  ['no papa', ['mommy', 'olivia', 'rei']],
  ['blockers', ['papa', 'mommy']],
  ['towers', ['olivia', 'rei']]
];

let bad = 0;
const won = {};

for (let m = 0; m < maps.length; m++) {
  console.log(`\n${maps[m].name}\n`);
  for (const [label, plan] of PLANS) {
    const r = best(m, plan);
    won[label] = (won[label] || 0) + (r.result === 'won' ? 1 : 0);
    console.log(`  ${label.padEnd(12)} ${r.result.padEnd(6)} ` +
      `${r.wins}/${TRIES}  lives ${String(r.lives).padStart(2)}  wave ${r.wave}`);
  }
}

console.log('\nWhat that says\n');

// ONE OF EACH HAS TO BE A WAY TO PLAY. Not the best way — the best way should be
// whatever suits the map — but a family game where the family build loses every
// map is a family game where three of them are decoration.
const mixed = won.MIXED || 0;
const ok = (cond, label, detail = '') => {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(46)} ${detail}`);
  if (!cond) bad++;
};

ok(mixed >= 2, 'one of each wins most maps', `${mixed} of ${maps.length}`);

// THE SOLO BUILDS ARE REPORTED, NOT ASSERTED, and that is a deliberate line.
//
// medieval-td holds a real invariant — no single family may clear any map — and it
// costs twenty seeds, an exhaustive sweep and an afternoon every time a number
// moves. Trying to hold the same line here failed for an honest reason: with five
// runs a plan sitting anywhere near half flips its verdict between runs of this
// file, so the check reported balance changes that had not happened.
//
// So the numbers are printed and a person reads them. If one of the four is
// winning every map on its own after the family have played it, that is the line
// to look at — and the fix is that character's cost, which is the only lever that
// changes who is worth building without changing how hard the game is.
const solo = PLANS.filter(([l]) => l.endsWith(' only'))
  .map(([l]) => `${l.replace(' only', '')} ${won[l] || 0}`).join(', ');
console.log(`  --    alone, out of ${maps.length} maps:               ${solo}`);

// AND THE PAIRS, reported for the same reason the solos are. A pair sitting on one
// map out of three is exactly the case that flips between runs of this file, so
// asserting it would be asserting the weather.
//
// What to read them for: every one of the four should appear on a winning team
// somewhere. If a pair is on nought across several runs of this file, one of those
// two is dead weight and their cost is the number to look at.
const pairs = [['Papa + Mommy', 'blockers'], ['Olivia + Rei Rei', 'towers'],
               ['without Papa', 'no papa']];
console.log(`  --    in pairs:                              ` +
  pairs.map(([label, key]) => `${label} ${won[key] || 0}`).join(', '));

console.log(bad ? `\n${bad} thing(s) to look at.` : '\nThe family game holds together.');
process.exit(bad ? 1 : 0);
