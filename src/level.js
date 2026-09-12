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
import { prepare } from './route.js';

// IN THE ORDER THEY ARE PLAYED, which is no longer the order the files are
// numbered in. level04 is the newest board drawn and it belongs SECOND: the
// campaign runs the tutorial, then Oakland Outskirts, then the three boards that
// were built for testing, which the owner asked to move further down the road.
//
// The file numbers are the order they were WRITTEN and the ids are save keys —
// `m1` has star records on players' phones and must never come to mean a
// different map — so neither of those can be renumbered to match. This array is
// the one that means play order, and everything that cares reads it: the admin
// panel's map tabs, and LEVEL_OF in tools/overview.mjs, which is what puts a
// board behind a stage on the world map.
export const levels = [level00, level04, level05, level06, level07, level01, level02, level03];

// Measure every route once, at load. `routes` holds prepared routes from here
// on — the raw polyline is `route.pts` — so nothing has to remember whether it
// is looking at the artist's numbers or the measured form of them.
for (const l of levels) l.routes = l.routes.map(prepare);

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
