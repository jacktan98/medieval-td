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
// THE RANKING IS ONE SEED, AND THAT IS THIS TOOL'S ONE BLIND SPOT. Every build in
// the table above is played ONCE, on seed 1, because 2048 builds times twenty
// seeds is an hour rather than three minutes. A single run is a single battle —
// the note on mulberry32 in sim.mjs says so at length — so "best" here means
// "won that particular battle by the most", not "wins most often".
//
// It bites when the rows are pasted straight into sim.mjs. Map 1's top-ranked
// 3+3 build came back "won with 10 lives" and measures 2 wins in 20; the build it
// replaced measures 15. Nothing was wrong with either the sweep or the paste —
// the sweep answered the question it was asked.
//
// SO: re-check a row over twenty seeds before it replaces a scenario, and keep
// whichever build actually wins more. The pure-build check at the bottom of this
// file already runs twenty for exactly this reason; the table above does not.
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
// sit 68 to 86 — none of them is a dead plot, and hard-coding nine indices
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
//
// SIX on maps 1 and 2, and EVERY PLOT on a map that has more than nine — which
// is map 3, and it now has eleven. It used to be a flat 10 for a big map, and
// that stopped being either principled or cheap the moment the artist added a
// marker: ten of eleven means C(11,10) = 11 combinations times 2^10 assignments,
// which is 11264 runs, where "all eleven" is one combination times 2^11, which is
// 2048. Fewer runs AND the question you actually want answered on a map whose
// whole problem is covering two roads.
//
// It costs nothing in realism. A plan longer than the money allows is not a
// problem — run() builds `pending` in order as gold arrives and simply never
// reaches the end of a list it cannot afford — so the size is an upper bound on
// ambition rather than a promise that eleven towers get built.
const SIZE = Number(process.env.SIZE || (level.plots.length > 9 ? level.plots.length : 6));
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

// THE PURE BUILDS GET A SECOND, SLOWER LOOK, and it is not a formality — it is
// the check that caught the two maps where this file used to print "invariant
// holds" over a broken level.
//
// `stuck` means the run hit the time limit with lives left. It is neither a win
// nor a loss, and the row above prints it honestly. The bug was down here: this
// test only failed on `won`, so a pure build that ended `stuck` was quietly
// counted as not-a-threat.
//
// That is exactly backwards for the family most likely to stall. A barracks
// blocks: it holds an enemy on the road and grinds it down, where archery
// either kills things on the way past or leaks them. So the pure-barracks run
// is the SLOWEST build on the board, and the one whose clock runs out first —
// and the real game has no clock at all. A player who would sit through a very
// long wave 8 gets the win the sim was throwing away.
//
// So the two pure builds are re-run with thirteen times the patience, which is
// enough for every one of them to reach a real verdict.
//
// TWENTY SEEDS, AND FIVE WAS NOT ENOUGH. This is the second thing about this
// check that was quietly wrong, and it hid the same failure the `stuck` bug hid.
// A pure-barracks build on map 3 wins about one game in five, so at five seeds
// the answer it gives is a coin: the same level measured 0/5 the day it was
// declared sound and 4/20 a batch later with nothing about it changed. Every
// candidate lever tried against a 5-seed check came back "1/5" on a different
// seed each time, which is what noise looks like when you are hoping it is a
// signal.
//
// Twenty is enough to tell 5% from 40%, which is the distinction that matters
// here, and it costs forty runs on top of a sweep of a thousand. The verdict is
// still "any win is a break" — but the RATE is printed too, because "1/20" and
// "8/20" are different problems and the old output could not tell them apart.
const PATIENCE = 13;
const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);

const pure = [...byFamily.entries()].filter(([n]) => n === SIZE || n === 0);
const broken = [];
console.log('\npure builds, re-run with the clock taken off:');
for (const [n, o] of pure) {
  const rs = SEEDS.map(s => run(o.plan, s, PATIENCE));
  const wins = rs.map((r, i) => [r, i]).filter(([r]) => r.result === 'won');
  const name = n === SIZE ? 'archery' : 'barracks';
  console.log(
    `  ${SIZE} ${name.padEnd(9)}  wins ${String(wins.length).padStart(2)}/${SEEDS.length}` +
    `  (${Math.round(100 * wins.length / SEEDS.length)}%)   ` +
    (wins.length ? wins.map(([r, i]) => `#${SEEDS[i]}:${r.lives}`).join(' ') : 'never')
  );
  if (wins.length) broken.push(`${name} ${wins.length}/${SEEDS.length}`);
}

if (broken.length) {
  console.log(
    `INVARIANT BROKEN: pure ${broken.join(' and ')} clears the level on its own.`
  );
} else if (!wins.length) {
  console.log('INVARIANT BROKEN: nothing clears the level.');
} else {
  console.log('Invariant holds: neither family wins alone, and a mix does.');
}
process.exit(broken.length || !wins.length ? 1 : 0);
