// Which way a body lies, and which way it is thrown. Node only.
//
//   node tools/facing.mjs
//
// A corpse faces the blow that killed it, and is thrown away from it. That is
// one rule but it lives in four files — the shot records where it was fired
// from, projectiles.js and units.js stamp `struckFrom` on the victim, the two
// death sweeps pass it to dropCorpse, and corpses.js derives the throw from it.
// Nothing in any of those files reads wrong on its own if the rule breaks, which
// is why it is checked here.
//
// It replaced "the body keeps the facing it was walking with", and the case that
// showed the difference is the common one: a militiaman walking left, shot by a
// tower on his right. He used to fall with his back to the arrow and fly toward
// the archer that killed him. Both halves came from the one number, so both are
// fixed by the one change.
//
// Melee sets `struckFrom` the same way, from the attacker's x, at both of the
// places damage is dealt in units.js. It is not exercised here because standing
// a fight up needs a tower, a rally point and a path; the arrow is the same rule
// through the same funnel.

import { updateShots } from '../src/projectiles.js';
import { updateEnemies } from '../src/enemies.js';
import { enemyTypes } from '../src/data/waves.js';
import { arrow } from '../src/data/towers.js';
import { level } from '../src/level.js';
import { at as pointOn, laneOf } from '../src/route.js';
import { KNOCKBACK } from '../src/corpses.js';
import { enemyStance } from '../src/render.js';

// Where on the road the test stands its victim. An enemy's position is DERIVED
// from its route and how far along it has walked — setting x and y directly does
// nothing, they are overwritten on the next step — so the fixture has to name a
// place on the road instead of a coordinate. 400px along route 0 is somewhere in
// the middle of map 1's first straight.
const AT = 400;
const SPOT = pointOn(laneOf(level.routes[0], 1), AT);

// One arrow, lethal, fired from `side` of the enemy, at one walking `walkFace`.
// Everything else about the enemy is the minimum updateEnemies will accept.
function kill(side, walkFace) {
  const state = {
    enemies: [], corpses: [], shots: [], hits: [], splats: [], impacts: [], units: [],
    gold: 0, lives: 20
  };
  // `route` and `s` are how an enemy knows where it is now — a road index and a
  // distance along it. Route 0 at s 0 is the spawn end of the first road, which
  // is fine here: the arrow kills it on the first step and nothing about this
  // test depends on where it was standing.
  const e = {
    // Standing still, so "the body starts on the spot the man died" is an exact
    // claim. A walking victim advances a pixel in the frame the arrow lands and
    // the body drops a pixel further on, which is correct behaviour and just
    // noise in a test about which way it falls.
    def: { ...enemyTypes.light_inf, speed: 0 }, x: SPOT.x, y: SPOT.y, hp: 1, maxHp: 80,
    face: walkFace, route: 0, s: AT, lane: 1,
    acd: 0, thrust: 0, leaked: false
  };
  state.enemies.push(e);
  // `ammo` is not optional furniture: it carries the projectile's speed, its
  // drawing, and the `kind` stamped on the victim as `killedBy`. A shot in the
  // game always has one, so a fixture without one is testing something the game
  // cannot produce.
  state.shots.push({
    x: SPOT.x + 1, y: SPOT.y, angle: 0, ammo: arrow,
    fromX: SPOT.x + side * 200, target: e, damage: 99, speed: 999
  });

  updateShots(state, 1 / 60);
  updateEnemies(state, 1 / 60);

  const c = state.corpses[0];
  if (!c) throw new Error('no body was dropped');
  // dropCorpse stores where the body ENDS UP and animates back from the spot
  // the man died on, so the death spot is one knockback the other way.
  return { face: c.face, rest: c.x, death: c.x + c.face * KNOCKBACK };
}

// The tower is named as a SIDE of the victim rather than an absolute x, since
// where the victim stands is now the road's business and not the test's.
const CASES = [
  ['walking LEFT,  shot from the RIGHT',  1, -1,  1],
  ['walking LEFT,  shot from the LEFT ', -1, -1, -1],
  ['walking RIGHT, shot from the RIGHT',  1,  1,  1],
  ['walking RIGHT, shot from the LEFT ', -1,  1, -1]
];

let bad = 0;
for (const [label, side, walkFace, wantFace] of CASES) {
  const r = kill(side, walkFace);
  const facesBlow = r.face === wantFace;
  // Thrown away from what it faces, and starting on the spot the man died.
  const thrownBack = Math.sign(r.rest - r.death) === -r.face;
  const onTheSpot = Math.abs(r.death - SPOT.x) < 1e-6;
  const ok = facesBlow && thrownBack && onTheSpot;
  if (!ok) bad++;

  console.log(
    `${label}  ->  faces ${r.face > 0 ? 'RIGHT' : 'LEFT '}, ` +
    `dies at ${r.death.toFixed(0)}, settles at ${r.rest.toFixed(0)} ` +
    (ok ? '  ok'
        : `  WRONG:${facesBlow ? '' : ' should face the blow'}` +
          `${thrownBack ? '' : ' should be thrown away from its facing'}` +
          `${onTheSpot ? '' : ' should start on the death spot'}`)
  );
}

// The whole point of the change: facing must depend on the blow and NOT on the
// direction of travel. Same tower side, both headings, same answer.
const pair = [kill(600, -1).face, kill(600, 1).face];
if (pair[0] !== pair[1]) {
  bad++;
  console.log('\nWRONG: the body still turns with the way it was walking.');
}

// --- WHICH DRAWING AN ENEMY IS SHOWING ----------------------------------------
//
// Two enemies fight at both distances now, and each carries two Defaults and two
// Attacks — or, for the doctor, one Default and two Attacks. Four states, and
// the rule that picks between them is one line in render.js that no screenshot
// would catch getting subtly wrong: a swapped pair reads as "the artist drew him
// oddly" rather than as a bug.
//
// `e.foe` is the whole test. It is not how near the soldier is: it is whether one
// has hold of him.
console.log('\nWhich drawing an enemy shows\n');
{
  const ok = (cond, label, detail = '') => {
    console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(56)} ${detail}`);
    if (!cond) bad++;
  };
  const state = (def, foe, thrust) => ({ def, foe, thrust });

  for (const id of ['archer_inf', 'plague_inf']) {
    const d = enemyTypes[id];
    const far = enemyStance(state(d, null, 0));
    const loose = enemyStance(state(d, null, 1));
    const near = enemyStance(state(d, {}, 0));
    const swing = enemyStance(state(d, {}, 1));

    console.log(`      ${d.name}: standing ${far.stand.sprite} / ${near.stand.sprite}, ` +
      `striking ${loose.swing.sprite} / ${swing.swing.sprite}`);

    ok(far.stand.sprite === d.sprite, `${d.name} walks in his own Default`, far.stand.sprite);
    ok(loose.swing.sprite === d.attack.sprite,
      'and strikes at a distance with his ranged Attack', loose.swing.sprite);
    ok(swing.swing.sprite === d.melee.attack.sprite,
      'and with the close one the moment somebody has hold of him', swing.swing.sprite);
    // THE DOCTOR SHARES ONE STANDING POSE and the archer does not, which is the
    // artist's decision rather than the code's — so what is checked is that each
    // gets what his own def carries.
    const expect = d.melee.default ? d.melee.default.sprite : d.sprite;
    ok(near.stand.sprite === expect,
      d.melee.default ? 'and stands differently while he is held'
                      : 'and keeps his one standing pose while he is held',
      near.stand.sprite);
  }

  // AND NOTHING ELSE CHANGED. An enemy with no `melee` block has one pair and
  // shows it whatever is happening to him.
  const thug = enemyTypes.light_inf;
  const held = enemyStance({ def: thug, foe: {}, thrust: 1 });
  ok(held.stand.sprite === thug.sprite && held.swing.sprite === thug.attack.sprite,
    'a thug has one pair and shows it however he is caught', thug.sprite);
}

console.log(bad
  ? `\n${bad} case(s) wrong.`
  : '\nEvery body faces the blow, and every figure shows the drawing it should.');
process.exit(bad ? 1 : 0);
