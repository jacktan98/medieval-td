import { level, remaining } from './level.js';
import { at as pointOn, laneOf, randomLane } from './route.js';
import { enemyTypes, flask } from './data/waves.js';
import { dropCorpse } from './corpses.js';
import { unhook } from './units.js';
import { inRange } from './ground.js';
import { SCALE } from './data/towers.js';
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
    thrust: 0,       // 1 on the swing, decays; drives the lunge in render.js
    // A thrower's own state, and it is set on every enemy rather than only on
    // the ones that throw. `halted` is read by leadPoint, which has to answer
    // for anything a catapult might be aiming at, and a missing field there
    // would be a silent `undefined` rather than a false.
    halted: false,   // standing still to throw, so nothing may lead ahead of it
    tcd: 0,          // throwing cooldown
    flasks: def.ranged ? def.ranged.flasks : 0
  });
}

// Where an enemy will be `t` seconds from now, if nothing interrupts it.
//
// EXACT, not extrapolated. An enemy's position is one number — how far it has
// walked along a known polyline — so "where will it be" is that number plus its
// speed times the time, looked up on the same road. Extrapolating from its
// current heading instead would be right on the straights and wrong at exactly
// the places that matter: on map 1's hairpin a 1.2s lead runs a good 40px off
// the tarmac, which is where a lobbed rock would land.
//
// A HELD ENEMY IS NOT GOING ANYWHERE, so it leads to itself. Without this a
// catapult throws over the head of every enemy a barracks is holding — which is
// most of the ones worth hitting, since a blocked crowd is the crowd a splash is
// for.
//
// Only artillery asks. Arrows steer, so they never need to know.
export function leadPoint(e, t) {
  const road = laneOf(level.routes[e.route], e.lane);
  // A HELD ENEMY IS NOT GOING ANYWHERE, and neither is one that has stopped to
  // throw. Both lead to themselves. The second case is easy to forget and hard
  // to see when it is wrong: a catapult would throw 130px up the road past a
  // plague doctor standing perfectly still, and it would look like the machine
  // simply could not hit him.
  const ahead = e.foe || e.halted ? 0 : e.def.speed * level.march * t;
  return pointOn(road, e.s + ahead);
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
      // A doctor who has been caught fights with his hands, not his basket. He
      // is unhalted here rather than left alone so that killing his blocker
      // puts him straight back to throwing.
      e.halted = false;
      continue;
    }

    // THE THROWER. He stops when a soldier comes within range and starts
    // lobbing; he walks again the moment there is nobody to throw at, or the
    // basket is empty. Everything below this block is the ordinary walk, and a
    // halted enemy skips all of it.
    if (e.def.ranged && e.flasks > 0) {
      const mark = nearestUnit(state, e.x, e.y, e.def.ranged.range);
      e.halted = !!mark;
      if (mark) {
        // He faces what he is throwing at, the same way a held enemy faces the
        // man holding it — this is the only other case where an enemy's heading
        // is decided by something other than the road under it.
        if (mark.x !== e.x) e.face = mark.x > e.x ? 1 : -1;
        e.tcd -= dt;
        if (e.tcd <= 0) {
          throwFlask(state, e, mark);
          e.tcd = e.def.ranged.cd;
          e.flasks--;
          // Same field the melee lunge uses, so the Attack drawing shows for
          // the throw exactly as long as it shows for a swing.
          e.thrust = 1;
        }
        continue;
      }
    } else {
      e.halted = false;
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
      //
      // THREE WAYS TO DIE, three clips. An arrow finding one man across the map
      // and a rock coming down on several are different enough events to be
      // worth telling apart with your eyes shut, so the rock stopped borrowing
      // the arrow's line the moment it had one of its own.
      //
      // `killedBy` is the ammunition's `kind`, stamped on the victim by whatever
      // landed the last blow, and absent on a melee kill.
      solo(e.killedBy === 'arrow' ? CUE.arrowKill
         : e.killedBy === 'rock' ? CUE.rockKill
         : CUE.meleeKill);
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

// The nearest soldier a thrower could reach, or null. Respawning men are not on
// the board — they are a muster ring over a barracks — so nothing may aim at
// them, the same rule pickFigure uses for taps.
//
// Through inRange like every other reach in the game, because the board is drawn
// in perspective and a round patch of ground is drawn squashed. A thrower using
// a plain radius would stand off further up the screen than down it, which reads
// as him being nervous of some men and not others.
function nearestUnit(state, x, y, range) {
  let best = null;
  let least = Infinity;

  for (const u of state.units) {
    if (u.respawn > 0 || u.hp <= 0) continue;
    if (!inRange(x, y, u.x, u.y, range)) continue;
    const d = Math.hypot(u.x - x, u.y - y);
    if (d < least) { least = d; best = u; }
  }
  return best;
}

// A flask leaves the doctor's hand and comes down on the ground a soldier is
// standing on.
//
// COMMITTED TO THE GROUND, like a rock and unlike an arrow — see the two kinds
// in projectiles.js. It is thrown at where the man is NOW rather than where he
// will be, and that is a decision rather than an omission: a soldier at his post
// is not going anywhere, and one who has just been pulled into a fight is going
// somewhere a lead could not predict. Throwing at the ground he is on means the
// flask lands where you saw it aimed, and a man who steps out of it has dodged
// something rather than been missed by a bug.
function throwFlask(state, e, mark) {
  // The hand, derived from his own drawing rather than typed: the height of the
  // figure above the shadow it stands on, a little over half way up. Nothing to
  // re-measure when the artist redraws him.
  const up = e.def.spriteTrim[3] * e.def.pivot[1] * SCALE * 0.55;
  const from = { x: e.x, y: e.y - up };
  const to = { x: mark.x, y: mark.y };
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const flight = dist / flask.speed;

  state.shots.push({
    x: from.x,
    y: from.y,
    angle: Math.atan2(to.y - from.y, to.x - from.x),
    fromX: e.x,
    // Whose side it is on, and the only thing projectiles.js needs to know to
    // point the same landing code at the other army. Absent on every tower's
    // shot, which reads as the player's side.
    side: 'enemy',
    target: mark,
    damage: 0,
    splash: flask.splash,
    ammo: flask,
    speed: flask.speed,
    from,
    to,
    flight,
    t: 0,
    lift: dist * flask.arc
  });
}

// Closest to leaking, so towers focus whatever is about to cost a life.
//
// Measured as distance REMAINING rather than distance travelled, which is the
// same ordering on a single road and the only meaningful one on a forked map:
// the two roads into map 2 are not the same length, so "further along" says
// nothing about which enemy is nearer the keep.
//
// `min` is a DEAD ZONE, and only artillery has one: a catapult cannot drop a
// rock on its own feet, so anything close enough walks past untouched. It is the
// price of the longest reach in the game, and it is what makes a siege plot a
// different decision from an archery plot — a machine wants to be BACK from the
// road, where a bow wants to be beside it.
//
// Two ellipses rather than two radii, through the same inRange as everything
// else: the board is drawn in perspective and both edges of an annulus are
// patches of ground. See src/ground.js.
// `mode` is an index into AIM_MODES, and it changes WHICH of the enemies in
// reach is picked without changing what "in reach" means. It is a preference
// with a tiebreak rather than a filter: a tower told to shoot throwers first and
// offered nothing but militia shoots the militia. A mode that could leave a
// tower idle with a target in front of it would be a trap, and the player would
// have to remember to unset it.
//
// Distance-to-the-exit is the tiebreak in every mode, which is what makes mode 0
// fall out as the special case where the preference is flat.
export function pickTarget(enemies, x, y, range, min = 0, mode = 0) {
  let best = null;
  let least = Infinity;
  let bestRank = Infinity;

  for (const e of enemies) {
    // Measured from the enemy's ground anchor — its shadow — because that is
    // where the figure IS. Its head is drawn well above that and never counts.
    if (!inRange(x, y, e.x, e.y, range)) continue;
    if (min && inRange(x, y, e.x, e.y, min)) continue;
    const left = remaining(laneOf(level.routes[e.route], e.lane), e.s);
    // Lower wins. Negated hp for mode 1 so "most health" sorts the same
    // direction as everything else; `ranged` is a 0/1 flag for mode 2, which
    // makes the whole preference a single comparable number in every mode.
    const rank = mode === 1 ? -e.hp
               : mode === 2 ? (e.def.ranged ? 0 : 1)
               : 0;
    if (rank < bestRank || (rank === bestRank && left < least)) {
      bestRank = rank;
      least = left;
      best = e;
    }
  }
  return best;
}
