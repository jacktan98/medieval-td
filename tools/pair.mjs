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
//   AND FOR AS LONG AS ASKED  `charge` seconds of gathering, the rest at rest
//   AND HIS HEAD IS CLEAR    no man's crown is drawn inside his own roof
//   AND HIS FEET ARE ON THE FLOOR  as deep on the boards as that roof allows

import { readFileSync } from 'fs';
import { updateTowers, mountPoint, muzzlePoint } from '../src/towers.js';
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
  // OUT OF HIS OWN HANDS, to the pixel. Each man's muzzle is his mount plus the
  // def's offset, so asking whether a blast STARTS there is exact rather than
  // approximate — and it fails on the two ways this can break at once: a `turn`
  // that stops flipping puts every blast on one man's muzzle, and a muzzle read
  // off `mountFrac` instead of the pair puts every blast between the two of them.
  const { t: probe } = volley(def, 0.01);
  const muzzles = def.pair.map((_, i) => { probe.turn = i; return muzzlePoint(probe); });
  const wrong = out.filter(s =>
    Math.hypot(s.x - muzzles[s.monk].x, s.y - muzzles[s.monk].y) > 0.01);
  ok(wrong.length === 0, 'and every blast leaves its own man\'s hands',
    muzzles.map((m, i) => `${i} at (${m.x.toFixed(1)}, ${m.y.toFixed(1)})`).join(', '));

  // AND THE TWO MUZZLES REALLY ARE TWO, or the check above would pass on a tower
  // that fired both men's blasts from one place.
  ok(new Set(muzzles.map(m => `${m.x.toFixed(2)},${m.y.toFixed(2)}`)).size === n,
    `and the ${n} of them fire from ${n} different points`,
    `${Math.hypot(muzzles[0].x - muzzles[1].x, muzzles[0].y - muzzles[1].y).toFixed(1)}px apart`);

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

  // AND FOR AS LONG AS THE OWNER ASKED. `charge` is the window before a blast in
  // which a man is drawn gathering, and the rest of his wait he is at rest. Read
  // the same way drawPair reads it — off `cd` — so this is the picture rather than
  // a restatement of the data.
  if (def.charge !== undefined) {
    const { t: t3, state: s3 } = stand(def);
    let gathering = 0, resting = 0, frames = 0;
    // Two whole cycles, after letting the first shot settle the counter.
    for (let i = 0; i * DT < def.cooldown * n * 3; i++) {
      updateTowers(s3, DT);
      s3.shots.length = 0;
      if (i * DT < def.cooldown * n) continue;      // skip the run-up
      frames++;
      // Monk 0 only: he is gathering when it is his turn and the blast is close.
      if (t3.turn === 0 && t3.cd > 0 && t3.cd <= def.charge) gathering++; else resting++;
    }
    const per = def.cooldown * n;                   // one man's whole cycle
    const shown = gathering / frames * per;
    ok(Math.abs(shown - def.charge) < 0.06,
      `and gathers for ${def.charge}s of his ${per.toFixed(1)}s cycle`,
      `${shown.toFixed(2)}s gathering, ${(per - shown).toFixed(2)}s at rest`);
  }

  // AND HIS HEAD IS NOT INSIDE HIS OWN ROOF. The owner asked for the roof to
  // overlap the men and then, seeing it, asked for it not to touch their heads —
  // so this is the line between the two, and it is the one thing about this tower
  // that is decided by the artwork rather than by the numbers.
  //
  // `frontPolys[0]` is the roof band, in the building's own source pixels. A man's
  // crown is his anchor less the height of his tallest ink, and the test is that it
  // sits BELOW the lowest edge of that band at his x. Below rather than outside:
  // the band is drawn as a strip along the eave, so a crown that cleared it by
  // going further up would pass a point-in-polygon test and look absurd.
  if (def.frontPolys && def.frontPolys.length) {
    const roof = def.frontPolys[0];
    // How tall he is above his anchor, in the sprite's own source px.
    const crownUp = def.gunnerPivot[1] * def.gunnerTrim[3];
    // The roof's lowest edge on the vertical line through x.
    const eaveAt = x => {
      let y = -Infinity;
      for (let i = 0, j = roof.length - 1; i < roof.length; j = i++) {
        const [x1, y1] = roof[j], [x2, y2] = roof[i];
        if ((x1 <= x && x2 >= x) || (x2 <= x && x1 >= x)) {
          const k = x2 === x1 ? 0 : (x - x1) / (x2 - x1);
          y = Math.max(y, y1 + k * (y2 - y1));
        }
      }
      return y;
    };
    const heads = def.pair.map((f, i) => {
      const sx = def.spriteTrim[0] + f[0] * def.spriteTrim[2];
      const sy = def.spriteTrim[1] + f[1] * def.spriteTrim[3];
      return { i, x: sx, crown: sy - crownUp, eave: eaveAt(sx) };
    });
    const under = heads.filter(h => h.eave > -Infinity && h.crown <= h.eave);
    ok(under.length === 0, 'and no man\'s head is drawn inside the roof',
      heads.map(h => `${h.i}: clear by ${(h.crown - h.eave).toFixed(1)}px`).join(', '));

    // AND HE IS NOT STANDING FURTHER FORWARD THAN HE HAS TO. The check above is
    // one-sided: it is happy with a man at the very front lip of the platform,
    // because a man out there has all the headroom in the world. That is exactly
    // where the two of them drifted to, and what the owner saw — "they are closer
    // to the bottom edge of the platform".
    //
    // So this is the other side of it. A man belongs at the deepest point the eave
    // allows, and SLACK is how many pixels of that he is giving away. Six is a
    // pixel over a game pixel: enough room for the eave being a curve sampled
    // every 18px, not enough for a man to wander to the rail.
    const SLACK = 6;
    const forward = heads.filter(h => h.eave > -Infinity && h.crown - h.eave > SLACK);
    ok(forward.length === 0, `and stands as deep as the roof allows (${SLACK}px)`,
      heads.map(h => `${h.i}: ${(h.crown - h.eave).toFixed(1)}px of slack`).join(', '));
  }

  // AND BOTH OF THEM ARE ON THE BOARDS. The rule above pushes them backward and
  // nothing pushed back until now — a man moved one step too far is standing in
  // the air behind the platform, which looks no better than one on the lip.
  //
  // `floorQuad` is the belfry floor in the building's own source pixels, so this
  // is a plain point-in-polygon on the artist's own shape. It also reports how far
  // down the floor each man is, front to back, which is the number the owner was
  // actually describing: they were at 67% and 79% before, and the middle is 50%.
  if (def.floorQuad) {
    const inside = (px, py, poly) => {
      let hit = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) hit = !hit;
      }
      return hit;
    };
    // How far from the floor's back edge to its front edge he is, on his own
    // column, as a fraction. 0 is against the back rail and 1 is over the lip.
    const depth = (sx, sy) => {
      let lo = Infinity, hi = -Infinity;
      const poly = def.floorQuad;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [x1, y1] = poly[j], [x2, y2] = poly[i];
        if ((x1 <= sx && x2 >= sx) || (x2 <= sx && x1 >= sx)) {
          const y = x2 === x1 ? y1 : y1 + (sx - x1) / (x2 - x1) * (y2 - y1);
          lo = Math.min(lo, y); hi = Math.max(hi, y);
        }
      }
      return hi > lo ? (sy - lo) / (hi - lo) : NaN;
    };
    const feet = def.pair.map((f, i) => {
      const sx = def.spriteTrim[0] + f[0] * def.spriteTrim[2];
      const sy = def.spriteTrim[1] + f[1] * def.spriteTrim[3];
      return { i, on: inside(sx, sy, def.floorQuad), at: depth(sx, sy) };
    });
    ok(feet.every(f => f.on), 'and both men have their feet on the boards',
      feet.map(f => `${f.i}: ${(f.at * 100).toFixed(0)}% back to front`).join(', '));
  }

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
