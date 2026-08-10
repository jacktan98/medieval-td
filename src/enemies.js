import { level, remaining } from './level.js';
import { at as pointOn, laneOf, randomLane } from './route.js';
import { enemyTypes } from './data/waves.js';
import { dropCorpse } from './corpses.js';
import { unhook } from './units.js';
import { inRange } from './ground.js';
import { solo, CUE } from './audio.js';

// Which road, and which side of it. Two decisions made once, on the way in,
// and then kept for the figure's whole life.
//
// The lane is what stops a wave reading as a snake. Enemies used to file down
// the exact centreline one behind another; now each one walks its own side of
// the road, so a column arrives loose and ragged the way a body of men actually
// would. It is three lanes per road — near kerb, middle, far kerb — so a map
// with two roads in has six ways for an enemy to arrive.
export function spawn(state, typeId) {
  const def = enemyTypes[typeId];
  const ri = (Math.random() * level.routes.length) | 0;
  const lane = randomLane();
  const road = laneOf(level.routes[ri], lane);
  const at0 = pointOn(road, 0);

  state.enemies.push({
    def,
    route: ri,
    lane,            // which of the three, as an index into LANES
    s: 0,            // distance walked along that lane's own polyline
    x: at0.x,
    y: at0.y,
    hp: def.hp,
    maxHp: def.hp,
    face: 1,         // +1 walking right, -1 left; only the sign is ever drawn
    foe: null,       // the barracks soldier holding it, if any
    acd: 0,          // melee cooldown, only ticks while held
    thrust: 0        // 1 on the swing, decays; drives the lunge in render.js
  });
}

export function updateEnemies(state, dt) {
  for (const e of state.enemies) {
    // Decays wherever the enemy is, so a swing that lands just as its holder
    // dies still plays out instead of freezing mid-lunge. Same rate as the
    // soldiers' thrust, so the two sides of a fight move at the same tempo.
    e.thrust = Math.max(0, e.thrust - dt * 4);

    // Held in melee by a soldier. Blocked enemies stop dead rather than
    // sliding past — this is the whole point of the barracks family, and the
    // one case where an enemy is not a pure path-follower.
    if (e.foe) {
      // Turn to fight whoever is holding it, so the two face each other.
      if (e.foe.x !== e.x) e.face = e.foe.x > e.x ? 1 : -1;
      continue;
    }

    // One number forward along the road, then the position is looked up. The
    // old loop walked from waypoint to waypoint consuming the frame's movement,
    // which cannot express a lane: an offset has to be measured perpendicular
    // to the road, and there is no perpendicular to "somewhere near vertex 7".
    // The lane's own road, not the centreline. Walking the centreline and
    // drawing the figure offset from it makes speed depend on which way the
    // road is bending — see route.js.
    const road = laneOf(level.routes[e.route], e.lane);
    e.s += e.def.speed * level.march * dt;

    const p = pointOn(road, e.s);
    // A vertical stretch of road says nothing about which way the figure should
    // look, so keep the last horizontal heading rather than snapping to a
    // default.
    if (p.tx) e.face = p.tx > 0 ? 1 : -1;
    e.x = p.x;
    e.y = p.y;

    if (e.s >= road.total) e.leaked = true;
  }

  for (const e of state.enemies) {
    if (e.leaked) state.lives -= e.def.leak;
  }

  // Bounty is paid here rather than in projectiles.js, so a soldier's kill and
  // an arrow's kill are worth the same and neither can pay out twice.
  state.enemies = state.enemies.filter(e => {
    if (e.leaked) {
      unhook(e);
      return false;
    }
    if (e.hp <= 0) {
      state.gold += e.def.bounty;
      state.hits.push({ x: e.x, y: e.y, life: 0.25 });
      // A kill sounds like whatever landed the last blow, and the two are
      // different sounds because they are different events to watch: an arrow
      // finding its mark across the map, or a man winning the fight he is in.
      // Sorted here for the same reason the bounty is — this is the only place
      // that sees every death.
      solo(e.killedBy === 'arrow' ? CUE.arrowKill : CUE.meleeKill);
      // Falls where it stood, facing whatever killed it rather than facing the
      // way it was walking — see dropCorpse. The fallback is its heading, and
      // nothing should ever reach it: an enemy cannot die without being hit.
      //
      // A leak gets no body on purpose: the body is what you get for a kill.
      dropCorpse(state, e.def, e.x, e.y, e.struckFrom || e.face);
      unhook(e);
      return false;
    }
    return true;
  });
}

// Closest to leaking, so towers focus whatever is about to cost a life.
//
// Measured as distance REMAINING rather than distance travelled, which is the
// same ordering on a single road and the only meaningful one on a forked map:
// the two roads into map 2 are not the same length, so "further along" says
// nothing about which enemy is nearer the keep.
export function pickTarget(enemies, x, y, range) {
  let best = null;
  let least = Infinity;

  for (const e of enemies) {
    // Measured from the enemy's ground anchor — its shadow — because that is
    // where the figure IS. Its head is drawn well above that and never counts.
    if (!inRange(x, y, e.x, e.y, range)) continue;
    const left = remaining(laneOf(level.routes[e.route], e.lane), e.s);
    if (left < least) {
      least = left;
      best = e;
    }
  }
  return best;
}
