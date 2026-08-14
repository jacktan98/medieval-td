// Checks that every barracks squad stands fully on the road — every plot, every
// tier, every map. Node only; never loaded by the game.
//
//   node tools/formation.mjs
//
// Soldiers standing half on the grass is easy to miss by eye at 960x540 and
// obvious at a glance here. Run this after changing FORMATION in units.js, any
// soldier radius, or the plot positions in any level.
//
// IT ASKS THE ARTWORK NOW, not a constant. It used to compare each man's
// distance from route 0 against `ROAD_W / 2` from render.js, and that number is
// a fossil: nothing on the ground has been drawn in code since the painted maps
// arrived, so 125 was map 1's road width remembered by a file that no longer
// draws anything. Map 2's roads are not 125 wide and map 3's are 72, so the
// check was passing two maps it had never actually measured.
//
// It also only ever looked at `routes[0]`. Map 2 has two roads in and map 3 has
// two that never meet, so a squad rallied to the southern road on either was
// being measured against the northern one.
//
// The road is a filled path in the artist's SVG, so "is this man on tarmac" is a
// point-in-polygon against that path — the same test tools/trace-road.mjs uses
// to find the road in the first place, and the same source of truth.

import { readFileSync } from 'fs';
import { makeUnits, nearestOnPath } from '../src/units.js';
import { levels, useLevel } from '../src/level.js';
import { barracks } from '../src/data/towers.js';
import { shapesByFill } from './svg.mjs';

// The artist's road colour, in every map so far.
const ROAD = '#ffde9e';
// The maps are drawn at 1920x1080 and the game is 960x540.
const MAP_SCALE = 0.5;

// Every road ring of one map, in game space.
function roadOf(src) {
  const shapes = shapesByFill(readFileSync(src, 'utf8'))
    .filter(s => (s.fill || '').toLowerCase() === ROAD);
  if (!shapes.length) throw new Error(`no shape filled ${ROAD} in ${src}`);
  // One `d` can hold several sub-paths and a map can have several road shapes;
  // an even-odd test over the whole soup answers for all of them at once, which
  // is what makes a map with two separate roads need no special case.
  return shapes.flatMap(s => s.pts).map(p => [p[0] * MAP_SCALE, p[1] * MAP_SCALE]);
}

const onRoad = (poly, x, y) => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

// A man is off the road if any of his BODY is: sample his collision circle at
// eight points around the rim as well as at the centre. Testing the centre alone
// would pass a soldier standing with one shoulder on the grass, which is exactly
// the failure this tool exists to see.
function bodyOff(poly, u) {
  if (!onRoad(poly, u.rx, u.ry)) return true;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    if (!onRoad(poly, u.rx + Math.cos(a) * u.def.r, u.ry + Math.sin(a) * u.def.r)) return true;
  }
  return false;
}

let off = 0;
let checked = 0;

for (const [i, l] of levels.entries()) {
  useLevel(i);
  const poly = roadOf(l.src);
  let bad = 0;

  for (const def of barracks) {
    for (let p = 0; p < l.plots.length; p++) {
      const state = { units: [] };
      makeUnits(state, { def, x: l.plots[p].x, y: l.plots[p].y, rally: null });

      for (const u of state.units) {
        checked++;
        if (!bodyOff(poly, u)) continue;
        bad++;
        off++;
        // Which road he was aiming for, so a report says something actionable
        // rather than just a coordinate.
        const near = nearestOnPath(u.rx, u.ry);
        console.log(`  OFF ROAD  ${l.id} T${def.tier} plot ${p} slot ${u.slot} ` +
          `at (${u.rx.toFixed(0)},${u.ry.toFixed(0)})  ` +
          `${Math.hypot(near.x - u.rx, near.y - u.ry).toFixed(0)}px from route ${near.route}`);
      }
    }
  }

  console.log(`${l.id} ${l.name.padEnd(12)} ${l.plots.length} plots x 3 tiers x 3 men` +
    `${bad ? `   ${bad} OFF THE ROAD` : '   all on the road'}`);
}

console.log(off
  ? `\n${off} of ${checked} soldier positions are off the road.`
  : `\nAll ${checked} soldier positions are on the road, on every map.`);

process.exit(off ? 1 : 0);
