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
import { KNOCKBACK } from '../src/corpses.js';

// One arrow, lethal, fired from `towerX` at an enemy walking `walkFace`.
// Everything else about the enemy is the minimum updateEnemies will accept.
function kill(towerX, walkFace) {
  const state = {
    enemies: [], corpses: [], shots: [], hits: [], splats: [], units: [],
    gold: 0, lives: 20
  };
  const e = {
    def: enemyTypes.light_inf, x: 400, y: 300, hp: 1, maxHp: 80,
    face: walkFace, seg: 0, t: 0, bobAmp: 1, acd: 0, thrust: 0, leaked: false
  };
  state.enemies.push(e);
  state.shots.push({ x: 401, y: 300, angle: 0, fromX: towerX, target: e, damage: 99, speed: 999 });

  updateShots(state, 1 / 60);
  updateEnemies(state, 1 / 60);

  const c = state.corpses[0];
  if (!c) throw new Error('no body was dropped');
  // dropCorpse stores where the body ENDS UP and animates back from the spot
  // the man died on, so the death spot is one knockback the other way.
  return { face: c.face, rest: c.x, death: c.x + c.face * KNOCKBACK };
}

const CASES = [
  ['walking LEFT,  shot from the RIGHT', 600, -1,  1],
  ['walking LEFT,  shot from the LEFT ', 200, -1, -1],
  ['walking RIGHT, shot from the RIGHT', 600,  1,  1],
  ['walking RIGHT, shot from the LEFT ', 200,  1, -1]
];

let bad = 0;
for (const [label, towerX, walkFace, wantFace] of CASES) {
  const r = kill(towerX, walkFace);
  const facesBlow = r.face === wantFace;
  // Thrown away from what it faces, and starting on the spot the man died.
  const thrownBack = Math.sign(r.rest - r.death) === -r.face;
  const onTheSpot = r.death === 400;
  const ok = facesBlow && thrownBack && onTheSpot;
  if (!ok) bad++;

  console.log(
    `${label}  ->  faces ${r.face > 0 ? 'RIGHT' : 'LEFT '}, ` +
    `dies at ${r.death}, settles at ${r.rest} ` +
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

console.log(bad
  ? `\n${bad} case(s) wrong.`
  : '\nEvery body faces the blow and is thrown away from it.');
process.exit(bad ? 1 : 0);
