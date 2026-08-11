// What a barracks squad does, checked against the two things that were reported
// as broken. Node only.
//
//   node tools/squad.mjs
//
// Both are behaviour rather than balance, so tools/sim.mjs cannot see them: it
// never moves a rally point, and it cannot tell a soldier who helped from a
// soldier who watched. It only sees the outcome, which is why both of these went
// unnoticed for as long as they did.

import { makeUnits, moveUnits, updateUnits } from '../src/units.js';
import { families } from '../src/data/towers.js';
import { level } from '../src/level.js';

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

console.log(bad ? `\n${bad} failure(s).` : '\nSquad behaves.');
process.exit(bad ? 1 : 0);
