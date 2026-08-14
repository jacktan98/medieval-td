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

import { level01 } from './data/level01.js';
import { level02 } from './data/level02.js';
import { level03 } from './data/level03.js';
import { prepare } from './route.js';

// In the order they are offered on the title screen, which is the order they
// are meant to be played.
export const levels = [level01, level02, level03];

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
