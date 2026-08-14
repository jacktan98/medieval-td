// Every six-tower build on the level, ranked. Node only.
//
//   node tools/sweep.mjs
//
// tools/sim.mjs runs the seven builds named in its scenario list and checks the
// invariant. This finds out what those seven should BE, and it exists because
// the answer changes whenever the artist moves a plot marker — twice now, and
// both times the old list looked like a balance collapse when it was really a
// stale shopping list.
//
// It runs every combination of the usable plots at the map's own BUILD SIZE, and
// every way of assigning the two families to them: 448 runs on map 1, about 20
// seconds.
//
// SIX IS NOT A UNIVERSAL BUILD SIZE. It is what maps 1 and 2 support — nine
// plots and an economy that funds about six towers over eight waves. Map 3 has
// ten plots, ten waves and a bigger purse, and it needs every one of them:
// six towers there is three per road, which is half a defence against each, and
// the first pass at that map's waves was tuned against six-tower builds and came
// out savage. The size is derived from the plot count now rather than typed.
//
// A plan longer than the money allows is not a problem: run() builds `pending`
// in order as gold arrives and simply never reaches the end of a list it cannot
// afford. The size is an upper bound on ambition, not a promise.
//
// The output is the best build at each family split. Paste the rows you want
// into the scenarios in tools/sim.mjs — IN THE ORDER PRINTED, which is plot
// order, which is also BUILD order, because a plan is a shopping list spent as
// gold arrives. Sorting a list "tidily" by family is a different build and has
// turned a win into a wave 7 loss before.
//
// What it is for is the invariant: the best all-archery build must LOSE, the
// best all-barracks build must LOSE, and the best mix must WIN. If the top line
// says archery alone wins, the level is an archery level and needs a lever
// moved — the heavy's hp, which is the one the difficulty is held with.

import { run, A, B } from './sim.mjs';
import { level, useLevel } from '../src/level.js';

// Which map to sweep. `node tools/sweep.mjs 2` for the second.
const WHICH = Number(process.argv[2] || 1);
useLevel(WHICH - 1);
console.log(`level ${WHICH}: ${level.name}`);

// Which plots are worth measuring. Map 1's plots 2 and 5 are more than 130px
// off the road and cover under 4% of it — a player would not take them, and
// including one measures the dead plot rather than the family. They are still
// in the ALL archery x8 scenario in sim.mjs, which is the "even with
// everything" case.
//
// Every other map's plots are all usable, so the list is DERIVED from the level
// rather than typed. Map 2's nine sit 79 to 91px off the road and map 3's ten
// sit 70 to 87 — none of them is a dead plot, and hard-coding nine indices
// quietly measured only nine of map 3's ten.
const DEAD = { 1: [2, 5] };
const USABLE = level.plots
  .map((_, i) => i)
  .filter(i => !(DEAD[WHICH] || []).includes(i));

console.log(`  ${USABLE.length} usable plots of ${level.plots.length}, ` +
  `${level.routes.length} road(s), ${level.waves.length} waves`);

// Every way of leaving out (USABLE.length - 6) of them.
function combinations(list, k) {
  if (k === 0) return [[]];
  if (list.length < k) return [];
  const [head, ...rest] = list;
  return [...combinations(rest, k - 1).map(c => [head, ...c]), ...combinations(rest, k)];
}

// How many towers a build on this map is allowed to reach for.
const SIZE = Number(process.env.SIZE || (level.plots.length > 9 ? 10 : 6));
console.log(`  builds of up to ${SIZE} towers`);

const results = [];
for (const combo of combinations(USABLE, SIZE)) {
  for (let mask = 0; mask < 1 << combo.length; mask++) {
    const plan = combo.map((plot, i) => ((mask >> i) & 1 ? B(plot) : A(plot)));
    results.push({ plan, archers: plan.filter(e => e.fam === 'archery').length, r: run(plan) });
  }
}

// Won beats lost outright; then more lives; then further through the waves.
const score = o => (o.r.result === 'won' ? 1e6 : 0) + o.r.lives * 1000 + o.r.wave;
const label = o => o.plan.map(e => (e.fam === 'archery' ? 'A' : 'B') + `(${e.plot})`).join(', ');

const byFamily = new Map();
for (const o of results) {
  const best = byFamily.get(o.archers);
  if (!best || score(o) > score(best)) byFamily.set(o.archers, o);
}

console.log(`${results.length} builds\n`);
for (const n of [...byFamily.keys()].sort((a, b) => b - a)) {
  const o = byFamily.get(n);
  console.log(
    `${n} archery + ${SIZE - n} barracks   ${o.r.result.padEnd(5)} ` +
    `lives ${String(o.r.lives).padStart(3)}  wave ${o.r.wave}   [${label(o)}]`
  );
}

const wins = results.filter(o => o.r.result === 'won');
console.log(`\n${wins.length} of ${results.length} builds win.`);

const pure = [...byFamily.entries()].filter(([n]) => n === SIZE || n === 0);
const broken = pure.filter(([, o]) => o.r.result === 'won');
if (broken.length) {
  console.log('INVARIANT BROKEN: a single family clears the level on its own.');
} else if (!wins.length) {
  console.log('INVARIANT BROKEN: nothing clears the level.');
} else {
  console.log('Invariant holds: neither family wins alone, and a mix does.');
}
process.exit(broken.length || !wins.length ? 1 : 0);
