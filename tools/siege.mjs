// The catapult: its three-beat loop, and what a rock does where it lands.
// Node only.
//
//   node tools/siege.mjs
//
// Three rules are checked here and none of them reads wrong on its own in the
// file it lives in.
//
// THE LOOP. A catapult's reload is ANIMATED — three drawings of 0.75, 0.75 and
// 1.5 seconds — and the rock leaves on the beat the arm is drawn coming over.
// The rule and the pictures are the same clock in src/towers.js, and the whole
// point of that is that the machine can never fire on a frame it is not drawn
// firing. A cooldown that expired half a beat early would still shoot every
// three seconds and still cycle three frames, and nothing would look wrong until
// you watched one carefully — the rock would simply leave while the arm was down.
//
// THE PATCH. A rock damages everything standing in an ellipse, through the same
// inRange() as every tower's reach, because the board is drawn in perspective
// and a round patch of ground is drawn squashed. Tested as a circle it would
// kill men visibly outside it and spare men visibly inside — this game has
// already paid for that lesson once, with a tower that read as aiming at heads.
// See src/ground.js.
//
// THE LOB. A rock is thrown at a patch of ground, not steered at a man, so it
// has to be aimed AHEAD — and both halves of that fail quietly. A lead that is
// wrong lands the rock just behind a marching column, which reads as the splash
// being too small. A flight that outlasts the Fire pose leaves a rock in the air
// over a machine that has already reloaded, which reads as a second catapult
// somewhere off screen.

import { updateTowers, muzzlePoint, buildingFlip } from '../src/towers.js';
import { updateShots } from '../src/projectiles.js';
import { updateEnemies } from '../src/enemies.js';
import { siege, arrow, rock, BEATS, DEAD } from '../src/data/towers.js';
import { enemyTypes } from '../src/data/waves.js';
import { SQUASH, inRange } from '../src/ground.js';
import { level, levels } from '../src/level.js';
import { at as pointOn, laneOf, LANES } from '../src/route.js';

const DT = 1 / 60;
const def = siege[0];

let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(52)} ${detail}`);
  if (!cond) bad++;
};

// A place on the road, and a catapult beside it. An enemy's position is DERIVED
// from its route and how far along it has walked, so the fixture names a spot on
// the road rather than a coordinate — see tools/facing.mjs.
const AT = 400;
const SPOT = pointOn(laneOf(level.routes[0], 1), AT);

// How far back from the road the fixture stands its machine. It has to clear the
// DEAD ZONE — a catapult 60px above the road cannot shoot it, which is the whole
// new mechanic and which silently broke every loop test the first time, because
// a machine with nothing it may shoot at sits on Default forever.
//
// The reach is an ellipse, so vertical distance is measured against r * SQUASH:
// 130 up clears the 130 dead zone (80.6 tall) and sits well inside tier 1's 300
// reach (186 tall).
const BACK = 130;

function board() {
  return { towers: [], enemies: [], units: [], shots: [], hits: [], splats: [], impacts: [], corpses: [], gold: 0, lives: 20 };
}

// Standing still, and far too tough to die — this test is about where damage
// goes, not about who survives it.
function enemyAt(x, y, hp = 1e6) {
  return { def: { ...enemyTypes.light_inf, speed: 0 }, x, y, hp, maxHp: hp,
           face: 1, route: 0, s: AT, lane: 1, acd: 0, thrust: 0, leaked: false };
}

function catapultAt(x, y, d = def) {
  return { plot: { x, y }, fam: { id: 'siege', tiers: siege }, def: d,
           x, y, aim: 0, cd: 0, recoil: 0, beat: 0, beatT: 0, spent: d.cost };
}

// --- the loop -----------------------------------------------------------------

console.log('The three-beat loop\n');

{
  // Nothing to shoot at: the machine must sit still on its resting pose rather
  // than mime a reload at nobody.
  const s = board();
  s.towers.push(catapultAt(SPOT.x, SPOT.y - BACK));
  for (let i = 0; i < 60 * 10; i++) updateTowers(s, DT);
  ok(s.towers[0].beat === 0, 'an idle catapult rests on the Default frame',
     `beat ${s.towers[0].beat} after 10s`);
  ok(s.shots.length === 0, 'and never fires at an empty road', `${s.shots.length} shots`);
}

{
  const s = board();
  const t = catapultAt(SPOT.x, SPOT.y - BACK);
  s.towers.push(t);
  s.enemies.push(enemyAt(SPOT.x, SPOT.y));

  // Record the beat on every step, and the step each shot appeared on.
  const beats = [];
  const firedOn = [];
  for (let i = 0; i < 60 * 10; i++) {
    const before = s.shots.length;
    updateTowers(s, DT);
    beats.push(t.beat);
    if (s.shots.length > before) firedOn.push(i);
    s.shots.length = 0;         // drop them; this block is about the clock
  }

  // Collapse into runs: [beat, how many steps it held].
  const runs = [];
  for (const b of beats) {
    const last = runs[runs.length - 1];
    if (last && last[0] === b) last[1]++;
    else runs.push([b, 1]);
  }

  // No rest run to skip: the enemy is already in reach on the first step, so the
  // clock starts there and the very first beat recorded is Reload. That is the
  // behaviour to want — a target walking into range gets the full reload beat
  // before the rock comes, so you see it loaded and then you see it thrown.
  const cycle = runs.slice(0, 9);
  ok(cycle.every(([b, n]) => Math.abs(n - BEATS[b] * 60) <= 1),
     `each beat holds for its own length ${JSON.stringify(BEATS)}`,
     cycle.map(([b, n]) => `${b}:${(n / 60).toFixed(2)}s`).join(' '));

  ok(cycle.map(([b]) => b).join('') === '120120120',
     'and they run Reload, Fire, Default, round and round',
     cycle.map(([b]) => ['Default', 'Reload', 'Fire'][b]).slice(0, 3).join(' -> '));

  ok(firedOn.every(i => beats[i] === 2), 'the rock leaves ONLY on the Fire beat',
     `${firedOn.length} shots, all on beat ${[...new Set(firedOn.map(i => beats[i]))]}`);

  const gaps = firedOn.slice(1).map((v, i) => (v - firedOn[i]) / 60);
  ok(gaps.every(g => Math.abs(g - def.cooldown) < 0.02),
     `so a shot every ${def.cooldown}s`, gaps.map(g => g.toFixed(2)).join(' '));
}

{
  // A target that walks out of reach must not leave the arm stuck in the air.
  const s = board();
  const t = catapultAt(SPOT.x, SPOT.y - BACK);
  s.towers.push(t);
  const e = enemyAt(SPOT.x, SPOT.y);
  s.enemies.push(e);
  for (let i = 0; i < 90; i++) updateTowers(s, DT);   // 1.5s in: mid-cycle
  const midway = t.beat;
  s.enemies.length = 0;
  for (let i = 0; i < 90; i++) updateTowers(s, DT);
  ok(midway !== 0 && t.beat === 0, 'losing the target settles it back to Default',
     `beat ${midway} -> ${t.beat}`);
}

// --- the patch ----------------------------------------------------------------

console.log('\nWhere a rock lands\n');

{
  // Four enemies around the impact: one on it, one just inside the ellipse
  // sideways, one just outside sideways, and one the same distance ABOVE — which
  // is the case a circular test gets wrong, because the reach is only
  // SQUASH x as tall as it is wide.
  const s = board();
  const R = def.splash;
  const centre = enemyAt(SPOT.x, SPOT.y);
  const nearSide = enemyAt(SPOT.x + R * 0.9, SPOT.y);
  const farSide = enemyAt(SPOT.x + R * 1.1, SPOT.y);
  const above = enemyAt(SPOT.x, SPOT.y - R * 0.9);      // inside a circle of R,
  s.enemies.push(centre, nearSide, farSide, above);      // outside the ellipse

  // Dropped straight onto the spot: no flight, so it lands on the first step.
  s.shots.push({
    x: SPOT.x, y: SPOT.y, angle: 0, fromX: SPOT.x, target: centre,
    damage: def.damage, splash: def.splash, ammo: rock, speed: rock.speed
  });
  updateShots(s, DT);

  const hurt = e => e.maxHp - e.hp;
  ok(hurt(centre) === def.damage, 'the man it lands on takes full damage', `${hurt(centre)}`);
  ok(hurt(nearSide) === def.damage, `so does one ${(R * 0.9).toFixed(0)}px to the side`, `${hurt(nearSide)}`);
  ok(hurt(farSide) === 0, `one ${(R * 1.1).toFixed(0)}px away takes none`, `${hurt(farSide)}`);
  ok(hurt(above) === 0,
     `and one ${(R * 0.9).toFixed(0)}px ABOVE takes none — the patch is an ellipse`,
     `${hurt(above)}, reach up is ${(R * SQUASH).toFixed(0)}px`);
}

{
  // An arrow carries no splash and must stay single-target, or every archery
  // tower in the game quietly became artillery.
  const s = board();
  const target = enemyAt(SPOT.x, SPOT.y);
  const bystander = enemyAt(SPOT.x + 10, SPOT.y);
  s.enemies.push(target, bystander);
  s.shots.push({
    x: SPOT.x, y: SPOT.y, angle: 0, fromX: SPOT.x, target,
    damage: 9, splash: 0, ammo: arrow, speed: arrow.speed
  });
  updateShots(s, DT);
  ok(target.maxHp - target.hp === 9, 'an arrow hits its man', `${target.maxHp - target.hp}`);
  ok(bystander.hp === bystander.maxHp, 'and nobody standing 10px from him', `${bystander.maxHp - bystander.hp}`);
}

{
  // A rock already in the air is not called back because the man it was thrown
  // at died. It is committed to a patch of ground and lands on whoever is there.
  const s = board();
  const doomed = enemyAt(SPOT.x, SPOT.y);
  const neighbour = enemyAt(SPOT.x + 20, SPOT.y);
  s.enemies.push(doomed, neighbour);
  s.shots.push({
    x: SPOT.x - 100, y: SPOT.y, angle: 0, fromX: SPOT.x - 100, target: doomed,
    damage: def.damage, splash: def.splash, ammo: rock, speed: rock.speed,
    from: { x: SPOT.x - 100, y: SPOT.y }, to: { x: SPOT.x, y: SPOT.y },
    flight: 0.5, t: 0, lift: 28
  });
  doomed.hp = 0;                                  // killed by something else
  for (let i = 0; i < 60 * 3; i++) updateShots(s, DT);
  ok(neighbour.maxHp - neighbour.hp === def.damage,
     'a rock whose target dies still lands on the spot', `${neighbour.maxHp - neighbour.hp}`);
}

{
  ok(rock.speed < arrow.speed, 'and a rock flies slower than an arrow',
     `${rock.speed} vs ${arrow.speed} px/s`);
}

// --- the lob ------------------------------------------------------------------
//
// The two things that make a thrown rock different from a steered arrow, and
// both of them fail QUIETLY. A lead that is wrong lands the rock a few pixels
// behind a column, which looks like the splash being small. A flight that
// outlasts the Fire pose puts the rock in the air over a machine that has
// already reloaded, which looks like a second catapult somewhere off screen.

console.log('\nThe lob\n');

{
  // The whole point of leading: a WALKING enemy must still be hit. Run the real
  // thing — a catapult beside the road, an enemy marching past it — and see
  // whether the rock finds him.
  const walk = (blocked, label) => {
    const s = board();
    const t = catapultAt(SPOT.x, SPOT.y - BACK);
    s.towers.push(t);
    const e = { ...enemyAt(SPOT.x - 150, SPOT.y), def: enemyTypes.light_inf, s: AT - 150 };
    e.hp = e.maxHp = 1e6;
    if (blocked) e.foe = { x: e.x, y: e.y };   // held by a soldier: going nowhere
    s.enemies.push(e);

    for (let i = 0; i < 60 * 6; i++) {
      updateEnemies(s, DT);
      updateTowers(s, DT);
      updateShots(s, DT);
      if (e.maxHp - e.hp > 0) break;
    }
    ok(e.maxHp - e.hp >= def.damage, label, `took ${e.maxHp - e.hp}`);
  };

  walk(false, 'a rock lands on a man who is WALKING');
  walk(true, 'and on one a barracks is holding still');
}

{
  // The longest throw in the game has to arrive while the arm is still up.
  const longest = siege[siege.length - 1].range;
  const flight = longest / rock.speed;
  ok(flight < BEATS[2], 'the longest throw lands inside the Fire beat',
     `${flight.toFixed(2)}s of a ${BEATS[2]}s pose, ${(BEATS[2] - flight).toFixed(2)}s spare`);
}

{
  // The arc has to be zero at BOTH ends, or the rock lands above the ground it
  // was thrown at and the splash is measured somewhere the player cannot see.
  const s = board();
  const from = { x: 100, y: 300 }, to = { x: 300, y: 300 };
  const shot = { ...from, from, to, flight: 1, t: 0, lift: 56, damage: 1, splash: 0,
                 ammo: rock, speed: rock.speed, fromX: from.x, target: enemyAt(300, 300) };
  s.enemies.push(shot.target);
  s.shots.push(shot);

  let peak = 0;
  for (let i = 0; i < 60; i++) {
    updateShots(s, DT);
    peak = Math.max(peak, to.y - shot.y);
  }
  ok(Math.abs(shot.x - to.x) < 0.01 && Math.abs(shot.y - to.y) < 0.01,
     'a lob ends exactly on the ground it was aimed at',
     `landed (${shot.x.toFixed(2)}, ${shot.y.toFixed(2)}) for (${to.x}, ${to.y})`);
  ok(Math.abs(peak - 56) < 2, 'having risen to its full arc on the way',
     `peaked ${peak.toFixed(1)}px up, wanted 56`);
}

// --- which way it faces -------------------------------------------------------
//
// The catapult is the only BUILDING in the game that mirrors, and the rule is
// not "face the target" — it is "face the target you committed to when you
// started loading, until the rock has gone". Facing per frame looks wrong in two
// separate ways and both of them are invisible in a still: the machine snaps
// back and forth several times a second when there are enemies on both sides,
// and it can turn BETWEEN the reload and the throw, so the crew loads facing one
// way and looses the other.

console.log('\nWhich way it faces\n');

{
  const s = board();
  const t = catapultAt(SPOT.x, SPOT.y - BACK);
  s.towers.push(t);

  // ONE enemy, WALKING, on a course that takes it under the machine and out the
  // far side. That is the case the rule exists for and the only one that makes
  // the machine genuinely change its mind: two stationary enemies either side
  // would let pickTarget settle on one and the test would pass without a single
  // turn ever happening.
  // Walking at 40 rather than the militia's 70, so it spends long enough inside
  // a 300px reach for several full three-second cycles to run either side of the
  // crossing. A fixture may slow a figure down; it may not change the rule.
  const walker = { ...enemyAt(0, 0), def: { ...enemyTypes.light_inf, speed: 40 }, s: AT - 260 };
  walker.hp = walker.maxHp = 1e6;
  s.enemies.push(walker);

  // Watch face and beat together, long enough to cross and then some.
  const log = [];
  for (let i = 0; i < 60 * 16; i++) {
    updateEnemies(s, DT);
    updateTowers(s, DT);
    s.shots.length = 0;
    log.push({ beat: t.beat, face: t.face, side: walker.x >= t.x ? 1 : -1 });
  }

  // It has to have crossed, or the rest of this proves nothing.
  ok(new Set(log.map(e => e.side)).size === 2, 'the target really does cross the machine',
     `sides seen ${[...new Set(log.map(e => e.side))]}`);

  // A change of face is only ever allowed on the step the beat becomes LOAD.
  let stray = 0, turns = 0;
  for (let i = 1; i < log.length; i++) {
    if (log[i].face === log[i - 1].face) continue;
    turns++;
    const enteredLoad = log[i].beat === 1 && log[i - 1].beat !== 1;
    if (!enteredLoad) stray++;
  }
  ok(stray === 0, 'the facing only ever changes on the loading beat',
     `${turns} turn(s), ${stray} of them off-beat`);

  // And it really does hold across the two beats after it.
  const spans = [];
  for (let i = 1; i < log.length; i++) {
    if (log[i].beat === 1 && log[i - 1].beat !== 1) spans.push(i);
  }
  const held = spans.slice(0, -1).every((start, k) => {
    const end = spans[k + 1];
    return log.slice(start, end).every(e => e.face === log[start].face);
  });
  ok(spans.length >= 3 && held, 'and holds through Fire and Default to the next load',
     `${spans.length} cycles seen`);
}

{
  // WHICH SIDE FLIPS, stated as the two concrete cases rather than as a sign.
  //
  // This was wrong once and it was wrong in a way that reads perfectly in code:
  // `buildingFaces` was -1, every mirror mechanism worked, both directions were
  // used, the latch held — and the machine threw away from the enemy in every
  // shot. A test that only checks "the far side mirrors" passes either way round,
  // because either way round has a far side. So the sides are named.
  const s = board();
  const t = catapultAt(SPOT.x, SPOT.y - BACK);

  t.face = 1;
  ok(buildingFlip(t) === 1, 'a target on the RIGHT draws the machine unmirrored',
     `flip ${buildingFlip(t)}`);

  t.face = -1;
  ok(buildingFlip(t) === -1, 'and a target on the LEFT mirrors it',
     `flip ${buildingFlip(t)}`);

  // The picture and the firing origin have to mirror TOGETHER. If only the
  // drawing flips, the arm swings one way and the rock leaves from a sling still
  // drawn on the other, which reads as a broken projectile rather than a missing
  // transform.
  t.face = 1;
  const un = muzzlePoint(t);
  t.face = -1;
  const flipped = muzzlePoint(t);
  ok(Math.abs((un.x + flipped.x) / 2 - t.x) < 0.01 && un.y === flipped.y,
     'the muzzle mirrors about the plot with it',
     `${un.x.toFixed(1)} and ${flipped.x.toFixed(1)} about ${t.x.toFixed(1)}`);

  // And the drawn direction is not a matter of opinion: it is where the sling
  // TRAVELS between the resting frame and the firing one. Pinned here so a
  // redraw that swings the arm the other way fails loudly instead of shipping.
  ok(def.buildingFaces === 1,
     'the artwork throws RIGHT — the sling moves +60.5px in x from rest to Fire',
     `buildingFaces ${def.buildingFaces}`);
}

// --- the dead zone ------------------------------------------------------------
//
// A catapult cannot drop a rock on its own feet. That is the price of the
// longest reach in the game and it is what makes a siege plot a different
// decision from an archery plot — but it is also the one artillery rule that can
// silently make a PLOT worthless, which no other tower stat can do.

console.log('\nThe dead zone\n');

{
  const s = board();
  const t = catapultAt(SPOT.x, SPOT.y - BACK);
  s.towers.push(t);
  // Right under the machine, well inside DEAD.
  const close = enemyAt(t.x, t.y + 40);
  s.enemies.push(close);
  for (let i = 0; i < 60 * 8; i++) updateTowers(s, DT);
  ok(s.shots.length === 0 && t.beat === 0,
     `an enemy inside the ${DEAD}px dead zone is never shot at`,
     `${s.shots.length} shots, beat ${t.beat}`);
}

{
  const s = board();
  const t = catapultAt(SPOT.x, SPOT.y - BACK);
  s.towers.push(t);
  // Just outside it sideways: DEAD is the reach ACROSS, so this is the honest
  // edge rather than a diagonal.
  s.enemies.push(enemyAt(t.x + DEAD * 1.05, t.y));
  for (let i = 0; i < 60 * 4; i++) updateTowers(s, DT);
  ok(s.shots.length > 0, 'and one just outside it is', `${s.shots.length} shots`);
}

// Per-plot coverage, sampled along every lane of every route on every map. The
// question is not "is the dead zone big" — it is "does any plot lose so much
// road that building a catapult there is a mistake the game never warns you
// about". A plot that keeps under a tenth of the road is smothered.
{
  const SAMPLE = 4;
  const FLOOR = 0.10;
  let worst = null;

  console.log('\nRoad each plot still covers, tier 1 (dead ground in brackets)\n');
  for (const lv of levels) {
    const cells = lv.plots.map((p, i) => {
      let live = 0, dead = 0, total = 0;
      for (const r of lv.routes) {
        for (let li = 0; li < LANES.length; li++) {
          const road = laneOf(r, li);
          for (let d = 0; d <= road.total; d += SAMPLE) {
            const q = pointOn(road, d);
            total++;
            if (!inRange(p.x, p.y, q.x, q.y, def.range)) continue;
            if (inRange(p.x, p.y, q.x, q.y, DEAD)) dead++;
            else live++;
          }
        }
      }
      const frac = live / total;
      if (!worst || frac < worst.frac) worst = { frac, id: lv.id, i };
      return `${i}:${(frac * 100).toFixed(0)}%${dead ? `(-${(dead / total * 100).toFixed(0)})` : ''}`;
    });
    console.log(`  ${lv.id}  ${cells.join('  ')}`);
  }

  ok(worst.frac >= FLOOR, `every plot keeps at least ${FLOOR * 100}% of the road`,
     `worst is ${worst.id} plot ${worst.i} at ${(worst.frac * 100).toFixed(0)}%`);
}

console.log(bad ? `\n${bad} check(s) failed.` : '\nThe catapult behaves.');
process.exit(bad ? 1 : 0);
