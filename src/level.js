// Which level is being played.
//
// Everything that used to import `path` and `plots` straight out of
// data/level01.js now reads them off `level`, because there is more than one
// map. The binding is a live one — reassigning it in useLevel() is seen by every
// module that imported it — so the switch is a single assignment rather than a
// rebuild of the world.
//
// That does mean `level` must be read at the point of USE, never destructured
// at import time. `import { level }` then `level.plots` is right;
// `const { plots } = level` at the top of a module captures map 1 forever.

import { level00 } from './data/level00.js';
import { level01 } from './data/level01.js';
import { level02 } from './data/level02.js';
import { level03 } from './data/level03.js';
import { level04 } from './data/level04.js';
import { level05 } from './data/level05.js';
import { level06 } from './data/level06.js';
import { level07 } from './data/level07.js';
import { level08 } from './data/level08.js';
import { level09 } from './data/level09.js';
import { level10 } from './data/level10.js';
import { level11 } from './data/level11.js';
import { level12 } from './data/level12.js';
import { level13 } from './data/level13.js';
import { level14 } from './data/level14.js';
import { level15 } from './data/level15.js';
import { prepare } from './route.js';

// IN THE ORDER THEY ARE PLAYED, which is no longer the order the files are
// numbered in. level04 is the newest board drawn and it belongs SECOND.
//
// The file numbers are the order they were WRITTEN and the ids are save keys —
// `m1` has star records on players' phones and must never come to mean a
// different map — so neither of those can be renumbered to match. This array is
// the one that means play order, and everything that cares reads it: the admin
// panel's map tabs, and LEVEL_OF in tools/overview.mjs, which is what puts a
// board behind a stage on the world map.
//
// THE THREE TESTING BOARDS ARE STILL HERE AND NO LONGER ON THE ROAD, at the owner's
// word: "The 3 test maps do not need a stage. Once I created 11 and 12 stage, they
// were replace these test maps. These 3 maps can just keep for future use if needed."
//
// THAT IS A CHANGE TO THE WORLD MAP, NOT TO THIS LIST. They rode the tail of this
// array from when the campaign had four boards, moving down one every time a real
// board was drawn, and stages 11 and 12 were drawn for boards still to come rather
// than for them. So LEVEL_OF in tools/overview.mjs now stops at stage 10 and the
// road's last two markers stand empty and locked — and these three keep their place
// HERE, which is what "keep for future use" needs.
//
// WHAT THAT MEANS IN THE GAME: no player can reach them, because the world map is the
// only way in. What it means everywhere else: they are still loaded, still in the
// admin panel's map tabs, and still the only board in the game with a longer Extended
// table (The Bend) and the only one with no tier cap. Several checkers exercise the
// dashboard's two-length path against The Bend and there is nothing else to point
// them at — see the note beside SHIPPED in src/admin.js, which is built from THIS
// array, so a board taken out of it stops being editable at all.
export const levels = [level00, level04, level05, level06, level07, level08, level09, level10,
                       level11, level12, level13, level14, level15, level01, level02, level03];

// Measure every route once, at load. `routes` holds prepared routes from here
// on — the raw polyline is `route.pts` — so nothing has to remember whether it
// is looking at the artist's numbers or the measured form of them.
for (const l of levels) l.routes = l.routes.map(prepare);

// WHERE THE ENEMY LEAVES, marked with the exit flag — at the owner's ask, so a
// player on a new stage can see which way the road runs out. Planted in the
// MIDDLE OF THE ROAD, on the route's own centreline, a little way back from where
// it leaves the board: far enough in that the whole flag is on screen and clear
// of the dashboard, near enough to the edge to read as the way out.
//
// Worked out from the routes rather than written into each board, so a new board
// gets its flags for nothing. Two routes that leave by the same road share one
// flag. A board that wants its flag somewhere else — stage 5's stands before the
// bridge, not at the bottom of it — says so with `exitFlags` of its own.
// The box is as close to the edge as the whole flag stays on screen: its banner
// reaches ~11px either side of the pole and ~33 above the foot. The top is lower
// than that, so a road leaving by the top edge plants its flag under the dashboard
// buttons rather than behind them.
const EXIT_BOX = { x0: 14, x1: 946, y0: 72, y1: 530 };   // where a foot may stand
const EXIT_IN = 10;                                       // and this far back along the road
const EXIT_APART = 60;                                    // closer than this is one exit

const inBox = p => p.x >= EXIT_BOX.x0 && p.x <= EXIT_BOX.x1 && p.y >= EXIT_BOX.y0 && p.y <= EXIT_BOX.y1;
const along = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

export function exitPoint(pts) {
  // The last place on the road inside the box: the end itself if the road stops on
  // the board, otherwise where its last segment crosses the box's edge.
  let i = pts.length - 1, at;
  if (inBox(pts[i])) at = { x: pts[i].x, y: pts[i].y, i };
  else {
    while (i > 0 && !inBox(pts[i - 1])) i--;
    if (i === 0) return null;
    const p = pts[i - 1], q = pts[i];
    let lo = 0, hi = 1;
    for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (inBox(along(p, q, m))) lo = m; else hi = m; }
    at = { ...along(p, q, lo), i: i - 1 };
  }
  // Then EXIT_IN back along the road towards where it came from.
  let need = EXIT_IN, j = at.i, cur = { x: at.x, y: at.y };
  while (j >= 0 && need > 0) {
    const b = pts[j], d = Math.hypot(cur.x - b.x, cur.y - b.y);
    if (d >= need) { cur = along(cur, b, need / d); break; }
    need -= d; cur = { x: b.x, y: b.y }; j--;
  }
  return { x: Math.round(cur.x), y: Math.round(cur.y) };
}

for (const l of levels) {
  if (l.exitFlags) continue;
  l.exitFlags = [];
  for (const r of l.routes) {
    const f = exitPoint(r.pts);
    if (f && !l.exitFlags.some(g => Math.hypot(g.x - f.x, g.y - f.y) < EXIT_APART)) l.exitFlags.push(f);
  }
}

export let level = levels[0];

export function useLevel(i) {
  level = levels[Math.max(0, Math.min(levels.length - 1, i))];
  return level;
}

// How far an enemy on this route still has to walk. The one number that means
// the same thing on every route of every map, which is what tower targeting
// needs: "closest to leaking" has to be comparable between an enemy on the
// northern road and one on the southern, and those roads are not the same
// length. Distance travelled is not comparable; distance remaining is.
export const remaining = (route, s) => route.total - s;
