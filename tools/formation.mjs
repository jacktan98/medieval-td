// Checks that every barracks squad stands fully on the road, on every plot.
// Node only — never loaded by the game.
//
//   node tools/formation.mjs
//
// Soldiers standing half on the grass is easy to miss by eye at 960x540 and
// obvious at a glance here. Run this after changing FORMATION in units.js, any
// soldier radius, the road width in render.js, or the plot positions.

import { makeUnits } from '../src/units.js';
import { path, plots } from '../src/data/level01.js';
import { barracks } from '../src/data/towers.js';

const ROAD_W = 52;              // must match ROAD_W in render.js
const HALF = ROAD_W / 2;

function distToPath(x, y) {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2)) : 0;
    best = Math.min(best, Math.hypot(a.x + dx * t - x, a.y + dy * t - y));
  }
  return best;
}

let worst = 0;
let offRoad = 0;

for (const def of barracks) {
  for (let i = 0; i < plots.length; i++) {
    const state = { units: [] };
    makeUnits(state, { def, x: plots[i].x, y: plots[i].y });

    for (const u of state.units) {
      const edge = distToPath(u.rx, u.ry) + u.def.r;
      worst = Math.max(worst, edge);
      if (edge > HALF) {
        offRoad++;
        console.log(`  OFF ROAD  T${def.tier} plot ${i} slot ${u.slot}` +
                    `  at (${u.rx.toFixed(0)},${u.ry.toFixed(0)})  edge ${edge.toFixed(1)} > ${HALF}`);
      }
    }
  }
}

console.log(offRoad
  ? `${offRoad} soldier position(s) off the road. Widest edge ${worst.toFixed(1)} of ${HALF}.`
  : `All squads on the road. Widest edge ${worst.toFixed(1)} of ${HALF}.`);

process.exit(offRoad ? 1 : 0);
