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
import { starsFor, PASS } from '../src/progress.js';
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
// lists them buries Rei — whose reach is the shortest in the family — on
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

// FIFTEEN RUNS OF EACH, and the median answer. Thugs pick a lane and a road at
// random when they spawn, so one run of one plan is a coin toss at the margins —
// and tuning against a coin toss is how an afternoon disappears.
//
// It was three, then five, and neither was enough once the tuning target became
// LIVES rather than won-or-lost. A star is a threshold on lives, and lives are far
// noisier than the verdict: the same table was measured at 8 lives and then at 3
// on the very next run, which reads as a difficulty change that never happened.
// Fifteen runs settles it, and the whole file still finishes in under ten seconds.
const TRIES = 15;

const best = (mapIndex, plan) => {
  const runs = Array.from({ length: TRIES }, () => run(mapIndex, plan));
  const wins = runs.filter(r => r.result === 'won').length;
  const typical = runs.sort((a, b) => a.lives - b.lives)[TRIES >> 1];
  return { ...typical, result: wins * 2 > TRIES ? 'won' : typical.result, wins };
};

// WHAT THE PLAYER ACTUALLY HAS ON EACH MAP, which is the whole point of this
// file now. The story gives them two people on The Bend, three on The Fork and
// four on Two Rivers, so a plan built out of Papa on map 1 is not a build anybody
// can make — testing it would be testing a game nobody plays.
//
// The FIRST plan of each map is the intended one: everybody who is unlocked, in
// rotation. That is the one the assertions are about. The rest are the ways a
// player might actually go wrong — one person everywhere, or ignoring somebody —
// and they are reported for a person to read.
const ROSTER = [
  ['mommy', 'ella'],
  ['papa', 'mommy', 'ella'],
  ['papa', 'mommy', 'ella', 'rei']
];

const PLANS = [
  [
    ['everyone', ['mommy', 'ella']],
    ['mommy only', ['mommy']],
    ['ella only', ['ella']]
  ],
  [
    ['everyone', ['papa', 'mommy', 'ella']],
    ['papa only', ['papa']],
    ['mommy only', ['mommy']],
    ['ella only', ['ella']],
    ['no papa', ['mommy', 'ella']]
  ],
  [
    ['everyone', ['papa', 'mommy', 'ella', 'rei']],
    ['papa only', ['papa']],
    ['mommy only', ['mommy']],
    ['ella only', ['ella']],
    ['rei only', ['rei']],
    ['no rei', ['papa', 'mommy', 'ella']],
    ['towers', ['ella', 'rei']]
  ]
];

let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(46)} ${detail}`);
  if (!cond) bad++;
};

const verdicts = [];

for (let m = 0; m < maps.length; m++) {
  console.log(`\n${maps[m].name} — ${maps[m].waves.length} waves, with ` +
              `${ROSTER[m].join(', ')}\n`);
  for (const [label, plan] of PLANS[m]) {
    const r = best(m, plan);
    const got = r.result === 'won' ? starsFor(r.lives) : 0;
    if (label === 'everyone') verdicts.push({ map: m, ...r, stars: got });
    console.log(`  ${label.padEnd(12)} ${r.result.padEnd(6)} ` +
      `${r.wins}/${TRIES}  lives ${String(r.lives).padStart(2)}  ` +
      `wave ${String(r.wave).padStart(2)}  ${got ? '*'.repeat(got) : '-'}`);
  }
}

console.log('\nWhat that says\n');

// THE ONE THING THAT MUST HOLD: the roster you are given has to be enough to pass
// the map it is given on, because passing it is the only way to get the next one.
// A map that cannot be two-starred with what the player owns is not hard, it is a
// dead end — the story stops there and the certificate is unreachable.
//
// Two stars rather than a win, because two stars is what the door asks for.
for (const v of verdicts) {
  ok(v.result === 'won' && v.stars >= PASS,
     `${maps[v.map].name}: its own roster passes it`,
     `${v.stars} star(s), ${v.lives} lives, ${v.wins}/${TRIES} wins`);
}

// AND IT MUST NOT BE TRIVIAL EITHER. Three stars every time on every map means
// the difficulty is doing nothing and the stars say nothing; the owner asked for
// easy-to-normal, not for a walk. This is a soft check and it is meant to be:
// one map landing on three stars is fine, all three is a flat game.
ok(verdicts.filter(v => v.stars >= 3).length < 3,
   'not every map hands out three stars',
   verdicts.map(v => v.stars).join('/'));

// THE REST IS REPORTED, NOT ASSERTED, and that is a deliberate line.
//
// medieval-td holds a real invariant — no single family may clear any map — and it
// costs twenty seeds, an exhaustive sweep and an afternoon every time a number
// moves. Trying to hold the same line here failed for an honest reason: with five
// runs a plan sitting anywhere near half flips its verdict between runs of this
// file, so the check reported balance changes that had not happened.
//
// What to read the solo lines for: if one of the four wins its map alone with
// three stars, the others are decoration on that map, and the fix is that
// character's COST — the only lever that changes who is worth building without
// changing how hard the game is.
console.log(bad ? `\n${bad} thing(s) to look at.` : '\nThe family game holds together.');
process.exit(bad ? 1 : 0);
