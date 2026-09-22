// What a barracks squad does, checked against the two things that were reported
// as broken. Node only.
//
//   node tools/squad.mjs
//
// Both are behaviour rather than balance, so tools/sim.mjs cannot see them: it
// never moves a rally point, and it cannot tell a soldier who helped from a
// soldier who watched. It only sees the outcome, which is why both of these went
// unnoticed for as long as they did.

import { readFileSync } from 'fs';
import { makeUnits, moveUnits, updateUnits, rallyPoint, nearestOnPath, makeGarrison,
         atEase, REST_SECONDS } from '../src/units.js';
import { at as pointOn, nearestOn, LANE } from '../src/route.js';
import { inRange } from '../src/ground.js';
import { families } from '../src/data/towers.js';
import * as WAVES from '../src/data/waves.js';
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

// Every wave table in the game, by shape rather than by name, so a table added
// later is included without this line being edited.
const waves = Object.values(WAVES).filter(v =>
  Array.isArray(v) && v.length && v[0] && Array.isArray(v[0].groups));

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


// --- A MAN WITH NOWHERE TO MUSTER ------------------------------------------------
//
// Stage 8's four church paladins are the first figures in this game that can die and
// stay dead, and getting there needed a third state beside "alive" and "mustering".
//
// WITHOUT IT THEY WOULD NOT HAVE DIED AT ALL. `respawn` undefined means the clock in
// updateUnits never runs, so the man is never restored and never removed — and the
// out-of-combat regen four lines above it heals him straight back off the floor. He
// would have flickered at zero health, crying out once a frame, and stood up again.
// That is not a hypothetical: it is written up on `fixture` in data/towers.js as the
// bug an earlier crossbowman hit, and it was dodged rather than fixed.
//
// So: kill one and step the world on. He must be GONE, and he must go once.
console.log('\nA garrison man with no respawn stays dead\n');
{
  const church = levels.findIndex(l => l.id === 'm10');
  useLevel(church);
  const st = { units: [], enemies: [], hits: [], corpses: [], shots: [], towers: [], gold: 0, lives: 20 };
  makeGarrison(st, level);
  const pope = st.units.filter(u => u.def.name === 'Pope');
  const pals = st.units.filter(u => u.def.name === 'Paladin');
  check(st.units.length === 5 && pope.length === 1 && pals.length === 4,
    'the church musters a pope and four paladins', `${st.units.length} men`);

  const doomed = pals[0];
  doomed.hp = -1;
  updateUnits(st, 1 / 60);
  check(!st.units.includes(doomed), 'a paladin brought to zero leaves the list on that frame',
    `${st.units.length} men left`);
  check(st.corpses.length === 1, 'and leaves a body where he fell', `${st.corpses.length} corpse(s)`);

  // AND HE DOES NOT COME BACK. Ten seconds of world, which is twice the Keep's own
  // five-second muster — the number he would have used if he had inherited one.
  for (let i = 0; i < 600; i++) updateUnits(st, 1 / 60);
  check(st.units.length === 4 && !st.units.includes(doomed),
    'and ten seconds later he is still gone', `${st.units.length} men`);
  check(st.units.filter(u => u.def.name === 'Paladin').length === 3,
    'leaving three of the four', `${st.units.filter(u => u.def.name === 'Paladin').length} paladins`);

  // THE POPE IS THE OTHER HALF. Nothing can reach him, so the same force applied to
  // him is a thing the game will never do — but if it ever did, he must not flicker.
  const p = st.units.find(u => u.def.name === 'Pope');
  p.hp = -1;
  const before = st.hits.length;
  updateUnits(st, 1 / 60);
  check(!st.units.includes(p), 'and a fixture forced to zero goes the same way, once',
    `${st.hits.length - before} death spark(s)`);
}

// --- 5. standing down, and coming back to attention --------------------------
//
// At the owner's ask: "if the unit has not been attacking for a while, he can face
// backwards randomly or use this pose."
//
// WHAT IS CHECKED IS THE STATE MACHINE, not the drawing. Whether the right PNG is
// on screen is a question for the eye and for tools/shadow.mjs, which already pins
// all four idle anchors to the same source pixel as their Default. What can go
// wrong silently is the timing: a man who stands down while the road is still full,
// or one who is slow coming back out of it, and neither shows up in a screenshot.
{
  const { state } = board(2);           // Knight's Hall, so the men have an `idle`
  step(state, 6);                       // out to their stations and settled
  const men = squad(state);

  check(men.every(u => u.def.idle), 'a barracks soldier has a pose for standing down',
    men.map(u => u.def.idle.sprite).join(', '));

  // FROM THE MOMENT SOMETHING LAST NEEDED HIM, which is what the clock actually
  // measures — not from muster. The men are put back to attention by hand here,
  // exactly as a blow landing would, so the two steps below straddle the threshold
  // rather than whatever the march happened to leave on the clock. The first
  // version of this check measured from muster and read 8.6s where it wanted 3.9.
  //
  // THROUGH THE REAL CODE PATH rather than by hand: a blow lands on each of them,
  // one frame passes, and `needed` resets their clocks exactly as the end of a
  // fight would. Setting the fields directly would have skipped the line that
  // draws each man's own wait, which is the thing being checked.
  men.forEach(u => { u.hit = 1; });
  updateUnits(state, DT);
  men.forEach(u => { u.hit = 0; });

  // AND EACH MAN CAME AWAY WITH HIS OWN WAIT, which is the mechanism the owner's
  // complaint was about. Three men whose fight ends on the same frame used to hold
  // one number between them; now the draw is per man, and three independent draws
  // colliding is a thing that does not happen.
  check(new Set(men.map(u => u.stance)).size === men.length,
    'each man of a squad waits his own spell before standing down',
    men.map(u => u.stance.toFixed(2) + 's').join(' / ') + ' on top of the threshold');

  // NOT YET. Five seconds is the threshold and four and a half is inside it. This
  // is the half a smaller REST_AFTER would break: a man who stands down between
  // two thugs of the same wave, with the road still full.
  step(state, 4.5);
  check(men.every(u => !atEase(u)), 'and is still at attention four seconds later',
    `rest ${men.map(u => u.rest.toFixed(1)).join('/')}s of ${REST_SECONDS}`);

  // AND THEN HE IS, but NOT ALL ON THE SAME FRAME, which is the owner's ask:
  // "don't make all the 3 units in each barracks go to idle pose at the same
  // time." They shared one clock before this — `rest` is zero in all three men on
  // the frame their fight ends — so they crossed the threshold together and stood
  // down as one figure three wide.
  //
  // WHAT IS MEASURED IS THE FRAME EACH ONE FIRST GOES OVER, stepped one frame at a
  // time so the answer is exact rather than sampled.
  const first = men.map(() => null);
  for (let i = 0; i < 6 / DT && first.some(f => f === null); i++) {
    updateUnits(state, DT);
    men.forEach((u, k) => { if (first[k] === null && atEase(u)) first[k] = u.rest; });
  }
  check(first.every(f => f !== null), '  then stands down once nothing has needed him',
    `at ${first.map(f => (f === null ? 'never' : f.toFixed(1) + 's')).join(' / ')}, ` +
    `${(Math.max(...first) - Math.min(...first)).toFixed(1)}s between the first and the last`);
  // NO BOUND ON THAT SPREAD, deliberately. Three draws from one range land close
  // together often enough that any threshold here would fail on a good build now
  // and then, and a check that cries wolf gets deleted. What can be asserted
  // exactly is the MECHANISM — three men holding three different waits, above —
  // and what it produces over a long quiet, below.

  // AND HE DOES NOT STAY DOWN. At the owner's ask: "each unit can also go back to
  // default pose after being in idle pose for awhile." So over a long quiet every
  // man must be seen in BOTH poses — a man who only ever stands down is the
  // feature half-built, and one who never does is it not running.
  const easy = men.map(() => 0);
  const back = men.map(() => 0);
  const awayWhileEasy = men.map(() => 0);
  let frames = 0, together = 0;
  for (let i = 0; i < 300 / DT; i++) {
    updateUnits(state, DT);
    frames++;
    men.forEach((u, k) => {
      if (atEase(u)) { easy[k]++; if (u.away) awayWhileEasy[k]++; }
      if (u.rest >= REST_SECONDS && !atEase(u)) back[k]++;
    });
    if (men.every(u => atEase(u) === atEase(men[0]))) together++;
  }
  check(easy.every(n => n > 0) && back.every(n => n > 0),
    '  and comes back up to the ready, then down again, for as long as it is quiet',
    easy.map((n, k) => `${(100 * n / (n + back[k])).toFixed(0)}%`).join(' / ') +
    ' of five minutes at ease');

  // LONGER AT EASE THAN AT THE READY, which is what the two poses mean: a man with
  // nothing to do spends most of his time at rest and straightens up now and then.
  const share = easy.reduce((a, b) => a + b, 0) /
                (easy.reduce((a, b) => a + b, 0) + back.reduce((a, b) => a + b, 0));
  check(share > 0.5 && share < 0.8, '  spending more of the quiet at ease than at the ready',
    `${(100 * share).toFixed(0)}% of man-frames at ease`);

  // AND THE SQUAD IS NOT IN STEP. Three men on one clock are in the same stance on
  // EVERY frame; three on their own are in the same one about half the time, which
  // is what two independent coins do. The bound is well below the first.
  check(together / frames < 0.75, '  and not in step with each other',
    `${(100 * together / frames).toFixed(0)}% of frames with the whole squad in one stance`);

  // HE LOOKS ROUND WHILE HE IS DOWN, and the share is asked OF THE TIME HE IS AT
  // EASE rather than of the whole quiet. Turning away belongs to being at ease —
  // a man back at the ready faces the road — so measuring it against the whole
  // five minutes would report a third of a two-thirds as a fifth and fail for
  // arithmetic rather than for behaviour. It did, once.
  const turned = awayWhileEasy.reduce((a, b) => a + b, 0) / easy.reduce((a, b) => a + b, 0);
  check(awayWhileEasy.every(n => n > 0) && turned > 0.2 && turned < 0.5,
    '  looking away from the road for about a third of the time he is down',
    `${(100 * turned).toFixed(0)}% of at-ease man-frames turned away, ` +
    `against the ${(100 / 3).toFixed(0)}% asked for`);

  // BACK TO ATTENTION ON THE FRAME SOMETHING ARRIVES, which is the half that can
  // actually cost the player something to look at. One enemy walks into the point
  // man; by the end of that single step he must be facing the road with his weapon
  // levelled, not part way through a turn.
  const point = men.reduce((a, u) => (u.ry < a.ry ? u : a));
  state.enemies.push({
    def: { r: 12, damage: 18, atkCd: 1.2, speed: 0 },
    x: point.rx, y: point.ry, hp: 4000, maxHp: 4000,
    foe: null, acd: 0, thrust: 0, face: 1, route: 0, lane: 1, s: 0
  });
  updateUnits(state, DT);
  check(!atEase(point) && point.rest === 0 && !point.away,
    'and comes back to attention on the frame an enemy reaches him',
    `rest ${point.rest}s, away ${point.away}`);
}

// --- 5b. and his health bar stays where it was -------------------------------
//
// AT THE OWNER'S WORD: "do not move the health bar. just let the health bar
// overlap part of the spear."
//
// IT MOVED FOR ONE BUILD. A spear carried upright is 181 source px against the 116
// the same man levels it at, so a bar hung off the DEF's height crosses the shaft
// with the spearhead above it — found by rendering the board, not by reasoning —
// and the fix was to let the bar follow the pose. The owner looked at both and
// kept the still bar. This is what stops it drifting back: artHeight is asked of
// the def alone, and knows nothing about the pose a soldier is in.
{
  const withIdle = barracks.tiers.map(t => t.soldier).filter(d => d.idle);
  const spread = withIdle.map(d => d.idle.trim[3] - d.spriteTrim[3]);
  check(Math.max(...spread.map(Math.abs)) > 20,
    'a soldier at ease is a different height from one at attention',
    withIdle.map((d, i) => `${d.name} ${spread[i] > 0 ? '+' : ''}${spread[i]}`).join(', ') +
    ' source px');

  const render = readFileSync(new URL('../src/render.js', import.meta.url), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '');
  check(/artHeight\(u\.def\)/.test(render) && !/idle.*atEase\(fig\)/.test(render),
    '  and his bar does not move for it — it is measured off his def, as it always was',
    'artHeight is asked of the def alone, with no branch for the pose');
}

// --- 6. the assassin never stands down ---------------------------------------
//
// He has no `idle` drawing, and that is the whole of his exemption — no line was
// written to exclude him. What this pins is that the absence is doing the work: a
// guild soldier left alone for a minute is still at attention.
{
  const guild = barracks.tiers.find(d => d.name === 'Assassin Guild');
  const plot = level.plots[3];
  const state = { towers: [], enemies: [], units: [], shots: [], hits: [], corpses: [], splats: [], impacts: [] };
  const t = { plot, fam: barracks, def: guild, x: plot.x, y: plot.y, rally: null, abilities: [], hold: 0 };
  state.towers.push(t);
  makeUnits(state, t);
  step(state, 60);
  const men = squad(state);
  check(men.every(u => !u.def.idle), 'an assassin has no pose to stand down into',
    `${men.length} man/men, none with an idle drawing`);
  check(men.every(u => !atEase(u) && !u.away),
    '  so a minute alone leaves him at attention, knife out',
    `rest ${men.map(u => u.rest.toFixed(0)).join('/')}s, none turned away`);
}

console.log(bad ? `\n${bad} failure(s).` : '\nSquad behaves.');
process.exit(bad ? 1 : 0);
