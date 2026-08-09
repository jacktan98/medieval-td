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
// It runs every combination of six of the seven usable plots and all 64 ways of
// assigning the two families to them: 448 runs, about 20 seconds.
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

// Plots 2 and 5 are more than 130px off the road and cover under 4% of it. A
// player would not take them and neither does this: including one measures the
// dead plot rather than the family. They are still in the ALL archery x8
// scenario in sim.mjs, which is the "even with everything" case.
const USABLE = [0, 1, 3, 4, 6, 7, 8];

const results = [];
for (let drop = 0; drop < USABLE.length; drop++) {
  const combo = USABLE.filter((_, i) => i !== drop);
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
    `${n} archery + ${6 - n} barracks   ${o.r.result.padEnd(5)} ` +
    `lives ${String(o.r.lives).padStart(3)}  wave ${o.r.wave}   [${label(o)}]`
  );
}

const wins = results.filter(o => o.r.result === 'won');
console.log(`\n${wins.length} of ${results.length} builds win.`);

const pure = [...byFamily.entries()].filter(([n]) => n === 6 || n === 0);
const broken = pure.filter(([, o]) => o.r.result === 'won');
if (broken.length) {
  console.log('INVARIANT BROKEN: a single family clears the level on its own.');
} else if (!wins.length) {
  console.log('INVARIANT BROKEN: nothing clears the level.');
} else {
  console.log('Invariant holds: neither family wins alone, and a mix does.');
}
process.exit(broken.length || !wins.length ? 1 : 0);
