// Checks the two monks of a Judgement Temple take turns. Node only — never
// loaded by the game.
//
//   node tools/pair.mjs
//
// WHY THIS IS ITS OWN FILE. Every other building in this game holds one figure,
// and `pair` is the first thing that holds two. tools/families.mjs checks the
// DATA — that there are two standing points, that they are apart, that they are
// on the boards — and none of that can see the thing most likely to break, which
// is the taking of turns.
//
// AND IT WOULD BREAK SILENTLY. A monk is 24 game px tall and the two of them
// stand 16px apart; if `turn` stopped flipping, every blast would leave the same
// man and the other would kneel there for the whole game doing nothing. On a
// phone that is a handful of pixels. Nothing would throw, no other check would
// notice, and the tower would go on doing exactly the right damage a second — so
// the only way to catch it is to run the loop and ask where each shot came from.
//
// The four things asked, in the order they would break:
//
//   THEY ALTERNATE           0, 1, 0, 1 and never twice in a row
//   EACH SHOT IS HIS OWN     the blast leaves the mount of the man whose turn it was
//   THE CADENCE IS THE PAIR  a shot every cooldown, each monk on twice that
//   CHARGING IS NEXT         the man drawn gathering is the man about to fire

import { updateTowers, mountPoint } from '../src/towers.js';
import { monastery, families } from '../src/data/towers.js';
import { level } from '../src/level.js';

const DT = 1 / 60;
let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(52)} ${detail}`);
  if (!cond) bad++;
};

const PAIRED = [...families.flatMap(f => f.tiers)].filter(d => d.pair);

// A temple on a plot with something in front of it that cannot die, so the
// cadence runs for as long as it is asked to and every gap in the firing is the
// tower's own doing.
function stand(def) {
  const plot = level.plots[0];
  const t = {
    plot, fam: { id: 'monastery' }, def, x: plot.x, y: plot.y,
    aim: 0, cd: 0, recoil: 0, beat: 0, beatT: 0, face: 0, aimMode: 0, spent: 590,
    rally: null, abilities: [], shots: 0, special: null, burst: 0, burstT: 0,
    hit: [], locked: null, hold: 0, turn: 0
  };
  const e = {
    def: { r: 10, hp: 1e9, speed: 0, atkCd: 1, damage: 0 }, x: t.x + 60, y: t.y,
    hp: 1e9, maxHp: 1e9, route: 0, lane: 1, s: 300,
    foe: null, acd: 1, thrust: 0, halted: false, leaked: false, statuses: []
  };
  return { t, state: { towers: [t], enemies: [e], shots: [], units: [], hits: [],
                       corpses: [], splats: [], impacts: [], smoke: [] } };
}

// Fire it for `seconds` and report every blast with the man it came from.
function volley(def, seconds) {
  const { t, state } = stand(def);
  const out = [];
  for (let i = 0; i * DT < seconds; i++) {
    // WHOSE TURN IT WAS, read BEFORE the step: stepWeapon flips it as the shot
    // leaves, so afterwards the counter already points at the next man.
    const was = t.turn;
    updateTowers(state, DT);
    for (const s of state.shots) {
      const m = mountPoint(t, was);
      out.push({ at: i * DT, monk: was, x: s.x, y: s.y, mx: m.x, my: m.y,
                 damage: s.damage, kind: s.ammo.kind });
    }
    state.shots.length = 0;
  }
  return { t, out };
}

console.log('\nEvery tower that stands two men\n');
ok(PAIRED.length > 0, 'there is at least one', PAIRED.map(d => d.name).join(', '));

for (const def of PAIRED) {
  console.log(`\n${def.name}\n`);
  const n = def.pair.length;
  const { out } = volley(def, def.cooldown * 8 + 0.1);

  ok(out.length >= n * 3, 'it keeps firing', `${out.length} blasts`);

  // ONE AFTER THE OTHER. Not "each fires sometimes" — no two consecutive shots
  // may come from the same man, which is the owner's own wording and is stricter
  // than an even split. A tower that fired 0,0,1,1,0,0 would pass a count and is
  // not what was asked for.
  const order = out.map(s => s.monk);
  ok(order.every((m, i) => i === 0 || m !== order[i - 1]),
    'and no man fires twice in a row', order.join(''));
  ok(new Set(order).size === n, `and all ${n} of them fire`,
    [...new Set(order)].sort().join(', '));

  // EACH BLAST LEAVES ITS OWN MAN. The muzzle is an offset from the mount, so a
  // shot is his if it starts within a muzzle's length of where he is standing —
  // and, more to the point, NEARER his mount than the other man's. That second
  // half is the check: if `turn` stopped flipping, every shot would still be
  // near A mount, just always the same one.
  const { t: probe } = volley(def, 0.01);
  const spots = def.pair.map((_, i) => mountPoint(probe, i));
  const wrong = out.filter(s => {
    const mine = Math.hypot(s.x - spots[s.monk].x, s.y - spots[s.monk].y);
    // NEARER HIS OWN MOUNT THAN THE OTHER MAN'S, which is the clause that does the
    // work. "Within a muzzle's length of a mount" would pass a tower whose `turn`
    // had stopped flipping, because every blast would still be near the one man it
    // all came from. This asks whose.
    const others = spots.filter((_, i) => i !== s.monk)
      .map(o => Math.hypot(s.x - o.x, s.y - o.y));
    return mine >= Math.min(...others);
  });
  ok(wrong.length === 0, 'and every blast leaves the man whose turn it was',
    `${out.length - wrong.length}/${out.length} nearer their own mount than the other's`);

  // AND THE TWO MOUNTS REALLY ARE TWO. Distinct standing points, or the check
  // above would pass on a tower that drew both monks in the same spot.
  const seen = new Set(out.map(s => `${s.mx.toFixed(1)},${s.my.toFixed(1)}`));
  ok(seen.size === n, `and the ${n} of them stand in ${n} different places`,
    [...seen].join('  '));

  // THE CADENCE IS THE PAIR'S, not one man's. The tower looses every `cooldown`;
  // each monk works a cycle of cooldown x however many of them there are, which
  // is the 1s / 2s the owner asked for coming out of one number.
  const gaps = out.slice(1).map((s, i) => s.at - out[i].at);
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  ok(Math.abs(avg - def.cooldown) < 0.05,
    `and the tower looses every ${def.cooldown.toFixed(2)}s`,
    `${avg.toFixed(2)}s over ${gaps.length} gaps`);

  const own = out.filter(s => s.monk === 0);
  const ownGaps = own.slice(1).map((s, i) => s.at - own[i].at);
  const ownAvg = ownGaps.reduce((a, b) => a + b, 0) / ownGaps.length;
  ok(Math.abs(ownAvg - def.cooldown * n) < 0.05,
    `while each man works a ${(def.cooldown * n).toFixed(2)}s cycle`,
    `${ownAvg.toFixed(2)}s over ${ownGaps.length} gaps`);

  // THE MAN GATHERING IS THE MAN ABOUT TO FIRE, which is the whole reason the
  // Attack pose is shown BEFORE the shot on this tower and after it on every
  // other. Asked of the tower's own state rather than of the renderer: `turn` is
  // what drawPair reads, so if it points at the wrong man the picture is wrong.
  const { t } = volley(def, def.cooldown * 2.5);
  const nextUp = t.turn;
  const { out: after } = (() => {
    // Step it on to the very next blast and see whose it is.
    const { t: t2, state } = stand(def);
    t2.turn = nextUp;
    const list = [];
    for (let i = 0; i * DT < def.cooldown + 0.1 && !list.length; i++) {
      const was = t2.turn;
      updateTowers(state, DT);
      for (const s of state.shots) list.push({ monk: was });
      state.shots.length = 0;
    }
    return { out: list };
  })();
  ok(after.length > 0 && after[0].monk === nextUp,
    'and the man drawn gathering is the man who fires next',
    `turn ${nextUp} -> blast from ${after.length ? after[0].monk : 'none'}`);

  // AND NOBODY GATHERS OVER NOTHING. With no target the tower does not count
  // down, so drawPair's `t.cd > 0` is false and both men are at rest — the check
  // is that an idle temple really does leave the clock alone rather than sitting
  // at some positive value forever.
  const idle = stand(def);
  idle.state.enemies.length = 0;
  for (let i = 0; i < 60 * 3; i++) updateTowers(idle.state, DT);
  ok(idle.t.cd <= 0, 'and an idle temple leaves both men at rest',
    `cd ${idle.t.cd.toFixed(2)} with nothing in range`);
}

console.log(bad
  ? `\n${bad} thing(s) about a pair are not true.`
  : '\nThe men on a paired tower take turns.');
process.exit(bad ? 1 : 0);
