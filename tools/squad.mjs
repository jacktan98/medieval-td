// What a barracks squad does, checked against the two things that were reported
// as broken. Node only.
//
//   node tools/squad.mjs
//
// Both are behaviour rather than balance, so tools/sim.mjs cannot see them: it
// never moves a rally point, and it cannot tell a soldier who helped from a
// soldier who watched. It only sees the outcome, which is why both of these went
// unnoticed for as long as they did.

import { makeUnits, moveUnits, updateUnits, rallyPoint, nearestOnPath } from '../src/units.js';
import { at as pointOn, nearestOn, LANE } from '../src/route.js';
import { inRange } from '../src/ground.js';
import { families } from '../src/data/towers.js';
import { level, useLevel, levels } from '../src/level.js';
// Stage 1 is the tutorial and is the default board now — a short road with six
// plots. These measurements were written against a full-length board, so pick
// the first level that is not tier-capped and leave the tutorial out of it.
// Pinned to the Bend BY ID rather than to "the first uncapped board" — stage 2 now
// sits in front of it and is a different shape of map. See the longer note in
// tools/siege.mjs.
useLevel(levels.findIndex(l => l.id === 'm1'));


const DT = 1 / 60;
const barracks = families.find(f => f.id === 'barracks');

function board(tier = 0) {
  const state = { towers: [], enemies: [], units: [], shots: [], hits: [], corpses: [], splats: [], impacts: [] };
  const plot = level.plots[3];
  const t = { plot, fam: barracks, def: barracks.tiers[tier], x: plot.x, y: plot.y, rally: null };
  state.towers.push(t);
  makeUnits(state, t);
  return { state, t };
}

const step = (state, secs) => { for (let i = 0; i < secs / DT; i++) updateUnits(state, DT); };
const squad = state => state.units;

let bad = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? '   ' + detail : ''}`);
  if (!ok) bad++;
};

// --- 1. moving the rally is an order, not a rebuild --------------------------
{
  const { state, t } = board();
  step(state, 6);                       // let them march out and settle

  const before = squad(state);
  const ids = before.map(u => u);       // identity, not a copy
  before.forEach((u, i) => { u.hp = u.maxHp - 20 - i; });
  const wounded = before.map(u => u.hp);
  const stood = before.map(u => ({ x: u.x, y: u.y }));

  // Send them somewhere else on the road, well inside the tier 1 leash.
  const road = level.routes[0].pts;
  const far = road.find(p => Math.hypot(p.x - t.x, p.y - t.y) > 60) || road[0];
  t.rally = { x: far.x, y: far.y };
  moveUnits(state, t);

  const after = squad(state);
  check(after.length === ids.length && after.every((u, i) => u === ids[i]),
        'a rally move keeps the same three men', `${after.length} men`);
  check(after.every((u, i) => u.hp === wounded[i]),
        'and their wounds', `hp ${after.map(u => Math.round(u.hp)).join('/')}`);
  check(after.every((u, i) => u.x === stood[i].x && u.y === stood[i].y),
        'and leaves them standing where they were, to walk from there');

  const moved = after.some((u, i) => Math.hypot(u.rx - stood[i].x, u.ry - stood[i].y) > 20);
  check(moved, 'while the post they are walking to has moved');

  const start = after.map(u => ({ x: u.x, y: u.y }));
  step(state, 3);
  check(after.every((u, i) => Math.hypot(u.x - start[i].x, u.y - start[i].y) > 5),
        'and they actually walk to it');
  check(after.every(u => Math.hypot(u.x - u.rx, u.y - u.ry) < 20),
        'and arrive', `off by ${after.map(u => Math.round(Math.hypot(u.x - u.rx, u.y - u.ry))).join('/')}px`);
}

// --- 2. free men join a squadmate's fight ------------------------------------
{
  const { state } = board();
  step(state, 6);

  // One enemy walks into the point man. The other two are in the wedge behind
  // him, roughly 40px away — too far to have been reached before.
  const point = squad(state).reduce((a, u) => (u.ry < a.ry ? u : a));
  const foe = {
    def: { r: 12, damage: 18, atkCd: 1.2, speed: 0 },
    x: point.rx, y: point.ry, hp: 4000, maxHp: 4000,
    foe: null, acd: 0, thrust: 0, face: 1, route: 0, lane: 1, s: 0
  };
  state.enemies.push(foe);

  step(state, 2.5);
  const fighting = squad(state).filter(u => u.foe === foe);
  const holding = squad(state).filter(u => u.holds);

  check(fighting.length === 3, 'all three men engage one enemy', `${fighting.length} of 3`);
  check(holding.length === 1, 'but exactly one of them is the block', `${holding.length} holding`);
  check(foe.foe === holding[0], 'and the enemy is hooked to that one');

  const hpBefore = foe.hp;
  step(state, 3);
  const dps = (hpBefore - foe.hp) / 3;
  const solo = barracks.tiers[0].soldier.damage / barracks.tiers[0].soldier.cd;
  check(dps > solo * 2, 'three men do about three men of damage',
        `${dps.toFixed(1)}/s against ${solo.toFixed(1)}/s for one`);

  // The enemy swings back at its blocker and nobody else.
  const hurt = squad(state).filter(u => u.hp < u.maxHp);
  check(hurt.length === 1 && hurt[0].holds, 'and only the blocker takes blows',
        `${hurt.length} wounded`);
}

// --- 3. helping never costs the squad its grip on the road -------------------
{
  const { state } = board();
  step(state, 6);

  const men = squad(state);
  const first = {
    def: { r: 12, damage: 18, atkCd: 1.2, speed: 0 },
    x: men[0].rx, y: men[0].ry, hp: 9000, maxHp: 9000,
    foe: null, acd: 0, thrust: 0, face: 1, route: 0, lane: 1, s: 0
  };
  state.enemies.push(first);
  step(state, 2.5);
  check(squad(state).filter(u => u.foe === first).length === 3,
        'the whole squad piles onto a lone enemy');

  // Now two more arrive, one at each of the other two slots.
  for (const u of men.slice(1)) {
    state.enemies.push({
      def: { r: 12, damage: 18, atkCd: 1.2, speed: 0 },
      x: u.rx, y: u.ry, hp: 9000, maxHp: 9000,
      foe: null, acd: 0, thrust: 0, face: 1, route: 0, lane: 1, s: 0
    });
  }
  step(state, 2);

  const blocked = state.enemies.filter(e => e.foe).length;
  check(blocked === 3, 'and lets go the moment there is one each to block',
        `${blocked} of 3 enemies held`);
  check(squad(state).every(u => u.holds), 'with every man on his own');
}

// --- WHERE A FLAG PUTS THEM, from every place a finger could land ----------------
//
// The checks above stand one squad up and watch it. This one asks a property of
// EVERY drag on EVERY plot, because the bug it guards was invisible one rally at
// a time: "when I place the rally point on the top right, the assassins move to
// bottom left".
//
// THE PROPERTY: of all the places on the road the squad could actually be posted,
// it is posted at the one nearest the finger. Three versions of postOn have got
// this wrong in three different ways — walking one direction only, walking both
// but ranking by arc length, and ranking by distance to the road point rather
// than to the flag — and none of them looked wrong until the whole board was
// swept. So the whole board is swept.
//
// COMPARED ON HOW GOOD THE ANSWER IS, not on which of two equal ones it picked. A
// road that doubles back offers two spots the same distance from a finger out of
// reach of both; either is correct, and demanding one would be testing the
// tie-break instead of the posting.
//
// EVERY BOARD, AND EVERY ROAD ON IT. This check existed and this bug walked past it,
// which is worth more than the bug: it ran on ONE board — the Bend, which has a
// single road — and it worked out the best available posting by sweeping
// `level.routes[near.route]`, the one road `nearestOnPath` picks. That is the very
// assumption the code under test was making. A checker that shares the assumption it
// is meant to be testing agrees with anything.
//
// So the best is now the best over ALL roads, and the loop runs every level. The
// owner's report: "Units will head to another rally point instead of the rally point
// I clicked." It was 3.1% of drags on stage 3, 1.6% on stage 4 and the Fork, 1.3% on
// stage 5 — and 0 on both single-road boards, which is exactly why one board was not
// enough to see it.
console.log('\nWhere a flag puts them\n');
{
  const guild = barracks.tiers.find(d => d.name === 'Assassin Guild');
  let checked = 0, off = 0, worst = 0, where = '';

  for (const [li, lv] of levels.entries()) {
    useLevel(li);
    for (const plot of lv.plots) {
      for (let x = 0; x < 960; x += 20) {
        for (let y = 0; y < 540; y += 20) {
          const near = nearestOnPath(x, y);
          if (Math.hypot(near.x - x, near.y - y) > 40) continue;

          // THE BEST POSTING ON ANY ROAD, using the game's own offset rule and the
          // game's own reach test — so what is compared is the CHOICE and not a
          // paraphrase of the rules it chose under. The kerb is measured per road,
          // because which side of a road the finger fell on is a fact about that
          // road.
          let best = Infinity;
          for (const road of lv.routes) {
            const on = nearestOn([road], x, y);
            const raw = -(x - on.x) * on.ty + (y - on.y) * on.tx;
            const across = Math.max(-LANE, Math.min(LANE, raw));
            for (let s = 0; s <= road.total; s += 2) {
              const q = pointOn(road, s);
              const px = q.x - q.ty * across, py = q.y + q.tx * across;
              if (!inRange(px, py, plot.x, plot.y, guild.range)) continue;
              best = Math.min(best, Math.hypot(px - x, py - y));
            }
          }
          if (best === Infinity) continue;
          checked++;

          const t = { plot, fam: barracks, def: guild, x: plot.x, y: plot.y, rally: null };
          const got = rallyPoint(t, x, y);
          // 12px of slack: postOn steps 4px along the road and this sweep 2px.
          const worse = Math.hypot(got.x - x, got.y - y) - best;
          if (worse > worst) { worst = worse; where = `${lv.id} plot at ${plot.x},${plot.y}, drag to ${x},${y}`; }
          if (worse > 12) off++;
        }
      }
    }
  }

  check(off === 0, 'every drag posts the squad at the nearest spot it can reach, on any road',
    `${checked} drags over ${levels.length} boards, worst ${worst.toFixed(0)}px off the best available` +
    (worst > 6 ? ` (${where})` : ''));
}

console.log(bad ? `\n${bad} failure(s).` : '\nSquad behaves.');
process.exit(bad ? 1 : 0);
