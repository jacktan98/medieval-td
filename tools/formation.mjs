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
import { makeUnits, moveUnits, nearestOnPath, rallyPoint } from '../src/units.js';
import { LANE } from '../src/route.js';
import { levels, useLevel } from '../src/level.js';
import { barracks } from '../src/data/towers.js';
import { fillPoly, insidePoly, ROAD_FILL, MAP_SCALE } from './svg.mjs';

// The road as a polygon and the test against it both live in tools/svg.mjs now —
// tools/trace-road.mjs finds the road with the same two functions, which is the
// point: "is this man on tarmac" and "where does the road run" are one question
// asked twice, and they were two copies of the same arithmetic until they were
// not.
const roadOf = src => fillPoly(readFileSync(src, 'utf8'), ROAD_FILL, MAP_SCALE).poly;
const onRoad = (poly, x, y) => insidePoly(poly, x, y);

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

  console.log(`${l.id} ${l.name.padEnd(12)} ${l.plots.length} plots x ${barracks.length} tiers ` +
    `x ${barracks[0].soldier.count} men` +
    `${bad ? `   ${bad} OFF THE ROAD` : '   all on the road'}`);
}

console.log(off
  ? `\n${off} of ${checked} soldier positions are off the road.`
  : `\nAll ${checked} soldier positions are on the road, on every map.`);

// --- AND WHAT HUGGING A KERB COSTS ----------------------------------------------
//
// Everything above is the SHIPPED posting: no rally given, squad on the
// centreline, and it must be perfect. This is the other one — a player dragging
// the flag hard to one edge, which units.js now honours up to KERB.
//
// IT IS ALLOWED TO PUT MEN ON THE GRASS and that is the owner's decision, so this
// measures the cost rather than forbidding it. The squad is 52px wide with the
// men's bodies and the narrowest road in the game is 58px across, so there is
// simply nowhere for a shifted wedge to go at the pinch points; the alternative
// was a control that could only ever be pointed at the middle of the road.
//
// WHAT IS GUARDED IS THE SIZE OF IT. A share this small is a shoulder on the kerb
// at the tightest stretches; a share much larger would be a squad routinely
// standing in a field, and the difference between those two is one careless edit
// to KERB or to the wedge. So the number is asserted, not just printed.
console.log('\nAnd a player hugging one kerb\n');

let grass = 0;
let posted = 0;

for (const [i, l] of levels.entries()) {
  useLevel(i);
  const poly = roadOf(l.src);
  let bad = 0;

  for (const def of barracks) {
    for (let p = 0; p < l.plots.length; p++) {
      for (const side of [1, -1]) {
        const t = { def, x: l.plots[p].x, y: l.plots[p].y, rally: null };
        const state = { units: [] };
        makeUnits(state, t);
        // The drag: the road nearest this tower, pushed a full lane to one side.
        const near = nearestOnPath(t.x, t.y);
        t.rally = rallyPoint(t, near.x - near.ty * LANE * side, near.y + near.tx * LANE * side);
        moveUnits(state, t);
        for (const u of state.units) {
          posted++;
          if (bodyOff(poly, u)) { bad++; grass++; }
        }
      }
    }
  }
  console.log(`  ${l.id} ${l.name.padEnd(12)} ${bad} of ${l.plots.length * barracks.length * 6} men on grass`);
}

// MEASURED AT 25% WHEN THE OFFSET SHIPPED, and 30 is the line. The gap is not
// slack for its own sake: it is room for one more map with a tight road, and it
// is narrow enough that widening KERB or the wedge much past where they are now
// trips it. The three points on the curve, for whoever has to move that line:
// 8px of kerb costs 7%, 12px costs 20%, 16px costs 25%.
const LIMIT = 0.30;
const share = grass / posted;
const okShare = share <= LIMIT;
if (!okShare) off++;
console.log(`\n${okShare ? 'ok  ' : 'FAIL'}  a kerb rally keeps the squad on tarmac ` +
  `${((1 - share) * 100).toFixed(0)}% of the time (${grass} of ${posted} on grass, limit ${LIMIT * 100}%)`);

process.exit(off ? 1 : 0);
