// The three shooting families, checked against the design they are supposed to
// embody. Node only.
//
//   node tools/families.mjs
//
// Archery, the monastery and artillery are not three sets of numbers that happen
// to differ. They are one design with three columns, and the artist stated it:
//
//                 rate      projectile   damage    range     other
//   Archery       HIGHEST   HIGHEST      decent    decent    —
//   Monastery     decent    decent       HIGHEST   LOWEST    —
//   Artillery     LOWEST    LOWEST       decent    HIGHEST   blast radius
//
// "Decent" is the load-bearing word and it is why this file exists. It does not
// mean "some value somebody liked"; with exactly three families it means BETWEEN
// THE OTHER TWO, and that is a claim a tool can check. Nothing else in the
// project can: tools/sim.mjs measures whether a build wins, which is a different
// question and stays true for a while after the identities have blurred.
//
// WHAT GOES WRONG WITHOUT IT. Every one of these numbers gets tuned — the
// monastery's damage has been 5, then 30, then 55, then 190, then 20 in the
// space of two days — and each move is judged against a win rate rather than
// against the table. It takes one pass for a "decent" to drift past a "highest"
// and for two families to become the same tower at different prices, and the
// only symptom is that the game slowly stops having a reason to offer both.
//
// A BARRACKS IS NOT IN HERE. It shoots nothing, its `range` is the leash on a
// rally point rather than a weapon's reach, and comparing that to a bow's range
// would be comparing two different things that share a field name.

import { archery, monastery, siege } from '../src/data/towers.js';

let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(52)} ${detail}`);
  if (!cond) bad++;
};

// Keyed by the name the table uses, so a failure reads in the same words the
// design is written in.
const FAM = { Archery: archery, Monastery: monastery, Artillery: siege };
const NAMES = Object.keys(FAM);

// Two letters, not one: "Archery" and "Artillery" both start with an A, and a
// row reading `A>M>A` is a row nobody can check at a glance.
const TAG = { Archery: 'Ar', Monastery: 'Mo', Artillery: 'Ty' };

const show = pick => NAMES.map(n => `${TAG[n]} ${FAM[n].map(pick).join('/')}`).join('   ');

// Every claim is per TIER, not per family average. A family that wins on tier 1
// and loses on tier 3 has an identity that changes as you upgrade it, which is
// the same defect as not having one.
//
// `higher` says which direction is "more of this quality" — a cooldown is
// backwards, because less of it is more rate.
function ranks(pick, higher = true) {
  const out = [];
  for (let t = 0; t < 3; t++) {
    const row = NAMES.map(n => ({ n, v: pick(FAM[n][t]) }));
    row.sort((a, b) => (higher ? b.v - a.v : a.v - b.v));
    out.push(row.map(r => r.n));
  }
  return out;
}

const holds = (pick, higher, want) =>
  ranks(pick, higher).every(order => want.every((n, i) => order[i] === n));

console.log('\nRate — how often it fires\n');
console.log(`  cooldowns   ${show(d => d.cooldown)}\n`);
{
  // Lower cooldown is more rate, so `higher: false`.
  ok(holds(d => d.cooldown, false, ['Archery', 'Monastery', 'Artillery']),
    'archery fastest, monastery between, artillery slowest',
    ranks(d => d.cooldown, false).map(o => o.map(n => TAG[n]).join('>')).join('  '));

  // Said again as a strict inequality, because "in the right order" is satisfied
  // by three families that all fire at the same rate.
  const strict = [0, 1, 2].every(t =>
    archery[t].cooldown < monastery[t].cooldown && monastery[t].cooldown < siege[t].cooldown);
  ok(strict, 'and all three are genuinely apart, not tied');
}

console.log('\nProjectile speed — how fast the shot travels\n');
{
  // Read off the AMMUNITION each tier carries rather than a constant, so a tier
  // given its own faster ammo is caught here rather than on the board.
  const speed = d => d.ammo.speed;
  console.log(`  speeds      ${show(speed)}\n`);
  ok(holds(speed, true, ['Archery', 'Monastery', 'Artillery']),
    'archery fastest, monastery between, artillery slowest',
    ranks(speed, true).map(o => o.map(n => TAG[n]).join('>')).join('  '));
  const strict = [0, 1, 2].every(t =>
    siege[t].ammo.speed < monastery[t].ammo.speed && monastery[t].ammo.speed < archery[t].ammo.speed);
  ok(strict, 'and all three are genuinely apart, not tied');
}

console.log('\nDamage — how hard one shot lands\n');
console.log(`  damage      ${show(d => d.damage)}\n`);
{
  const top = ranks(d => d.damage, true).map(o => o[0]);
  ok(top.every(n => n === 'Monastery'), 'the monastery hits hardest at every tier',
    top.join(', '));
  const strict = [0, 1, 2].every(t =>
    monastery[t].damage > archery[t].damage && monastery[t].damage > siege[t].damage);
  ok(strict, 'and by a margin rather than a tie');
}

console.log('\nRange — how far it reaches\n');
console.log(`  range       ${show(d => d.range)}\n`);
{
  ok(holds(d => d.range, true, ['Artillery', 'Archery', 'Monastery']),
    'artillery furthest, archery between, monastery shortest',
    ranks(d => d.range, true).map(o => o.map(n => TAG[n]).join('>')).join('  '));
  const strict = [0, 1, 2].every(t =>
    monastery[t].range < archery[t].range && archery[t].range < siege[t].range);
  ok(strict, 'and all three are genuinely apart, not tied');
}

console.log('\nBlast — the one thing only artillery has\n');
{
  ok(siege.every(d => d.splash > 0), 'every artillery tier has a blast radius',
    siege.map(d => d.splash).join('/'));
  const others = [...archery, ...monastery].filter(d => d.splash);
  ok(!others.length, 'and nothing else does',
    others.map(d => d.title).join(', ') || 'archery and the monastery are single-target');

  // The dead zone is artillery's alone as well, and it is the other half of what
  // "highest range" costs. A family that reached furthest AND could shoot its own
  // feet would simply be the best tower.
  ok(siege.every(d => d.minRange > 0), 'and artillery alone has a hole in the middle',
    `${siege[0].minRange}px`);
}

// --- what the shape actually buys ------------------------------------------------
//
// Not a pass/fail — there is no right answer to it — but it is the number the
// table is really about, and printing it beside the checks is what stops the
// design being read as "the monastery is the strong one".
console.log('\nWhat the shape costs, per second\n');
{
  console.log('  tier   archery   monastery   artillery');
  for (let t = 0; t < 3; t++) {
    const dps = f => (FAM[f][t].damage / FAM[f][t].cooldown).toFixed(1);
    console.log(`  ${t + 1}      ${dps('Archery').padStart(7)}   ${dps('Monastery').padStart(9)}` +
      `   ${dps('Artillery').padStart(9)}${siege[t].splash ? ' + blast' : ''}`);
  }
  console.log('\n  The monastery runs about a tenth ahead of archery, which is what its');
  console.log('  shorter reach and its higher price are buying — they were exactly level');
  console.log('  for one commit and that made one of them strictly worse. Artillery');
  console.log('  trades raw output for reach and blast.');
}

// The one claim in this file that is not in the artist's table, and it earns its
// place: the two single-target families are the pair a player picks between on
// the same plot, so the more expensive, shorter-ranged one has to be doing MORE
// per second. They were exactly level for one commit and nothing caught it,
// because every claim above was still true.
console.log('');
{
  const dps = (f, t) => FAM[f][t].damage / FAM[f][t].cooldown;
  const ahead = [0, 1, 2].every(t => dps('Monastery', t) > dps('Archery', t));
  ok(ahead, 'and the monastery is ahead of archery at every tier',
    [0, 1, 2].map(t => `+${((dps('Monastery', t) / dps('Archery', t) - 1) * 100).toFixed(0)}%`).join('  '));

  const dearer = [0, 1, 2].every(t => monastery[t].cost > archery[t].cost);
  ok(dearer, 'which is what its higher price buys',
    [0, 1, 2].map(t => `+${monastery[t].cost - archery[t].cost}g`).join('  '));
}

console.log(bad
  ? `\n${bad} of the design's claims no longer holds.`
  : '\nAll three families are still the towers the design says they are.');
process.exit(bad ? 1 : 0);
