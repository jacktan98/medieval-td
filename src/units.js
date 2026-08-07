import { path } from './data/level01.js';

// Blocking soldiers. A barracks puts a few of these on the path; enemies that
// walk into them stop and trade blows instead of continuing to the keep.
//
// The family is a stall first and a damage source second. Soldiers must be
// strong enough that a pure-archery build cannot win — see tools/sim.mjs — but
// not so strong that a pure-barracks build can. Both ends are checked there;
// soldier damage is the number that breaks it fastest in either direction.

const ENGAGE = 30;   // an enemy this close to a free soldier stops and fights
const REACH  = 20;   // melee lands at this range
const SETTLE = 16;   // stop walking here, so the two stand adjacent not stacked

// Formation offsets as [along, across, splay] in path-local units: along is
// the direction enemies travel, across is perpendicular, splay is degrees
// added to the idle facing. The point of the wedge faces upstream, into the
// oncoming enemies, with two behind it.
//
// `across` plus the soldier's radius must stay inside half the road width or
// the squad stands on the grass — tools/formation.mjs checks it against the
// road drawn in render.js. The road was widened to give the squad room, so the
// wedge can now spread properly instead of piling into one smudge.
//
// The splay fans the rear pair outward, which separates three long spears that
// would otherwise all point the same way and merge together.
// Widened when the painted road replaced the drawn one: the road went from 52
// to 125 across, and the old tight wedge read as a huddle in the middle of it.
//
// Spreading them does NOT weaken the block. Enemies walk the centreline exactly,
// so what matters is each soldier's distance to across=0, and 20 is still well
// inside ENGAGE. Spreading only changes how it looks.
const FORMATION = [[-24, 0, 0], [13, -20, -22], [13, 20, 22]];

// Nearest point on the path polyline — the rally point a barracks sends its
// soldiers to. Returns the segment direction too, so the formation can be laid
// out across the path rather than along it.
export function nearestOnPath(x, y) {
  let best = { x: path[0].x, y: path[0].y, d: Infinity, tx: 1, ty: 0, len: 1, seg: 0, t: 0 };

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len2)) : 0;
    const px = a.x + dx * t;
    const py = a.y + dy * t;
    const d = Math.hypot(px - x, py - y);

    if (d < best.d) {
      best = { x: px, y: py, d, tx: dx, ty: dy, len: Math.sqrt(len2) || 1, seg: i, t };
    }
  }

  return best;
}

// Walk `dist` along the polyline from (seg, t), forwards if positive. Returns
// the point and the unit tangent there.
//
// This is what keeps a squad on a bending road. Offsetting along the straight
// tangent of one segment is fine on a level made of long straight legs, but the
// road is traced from artwork now and curves constantly — a soldier placed 24px
// "forward" along a tangent ends up off the tarmac on the outside of a bend.
// Far enough off and enemies walk past outside ENGAGE without ever being
// blocked, which reads as the barracks being broken rather than misplaced.
function walkPath(seg, t, dist) {
  let i = seg;
  let u = t;
  let left = Math.abs(dist);
  const fwd = dist >= 0;

  const segLen = k => Math.hypot(path[k + 1].x - path[k].x, path[k + 1].y - path[k].y) || 1;

  while (left > 0) {
    const L = segLen(i);
    const avail = fwd ? L * (1 - u) : L * u;

    if (avail >= left) {
      u += (fwd ? left : -left) / L;
      break;
    }
    left -= avail;
    if (fwd) {
      if (i >= path.length - 2) { u = 1; break; }
      i++; u = 0;
    } else {
      if (i <= 0) { u = 0; break; }
      i--; u = 1;
    }
  }

  const a = path[i];
  const b = path[i + 1];
  const L = segLen(i);
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u,
           tx: (b.x - a.x) / L, ty: (b.y - a.y) / L };
}

export function makeUnits(state, tower) {
  removeUnits(state, tower);

  const s = tower.def.soldier;
  if (!s) return;

  // Where the player has sent the squad, or the nearest bit of road if they
  // have not sent it anywhere. The rally is stored as a free point rather than
  // a point on the path, so it survives an upgrade and stays where it was put.
  const want = tower.rally || { x: tower.x, y: tower.y };
  const near = nearestOnPath(want.x, want.y);

  // Keep the rally inside the tower's reach, measured from the TOWER — that
  // reach is what the barracks upgrade buys, and it is drawn as a circle around
  // the building, so the clamp has to agree with the picture.
  let rx = near.x;
  let ry = near.y;
  const away = Math.hypot(rx - tower.x, ry - tower.y);
  if (away > tower.def.range) {
    const k = tower.def.range / away;
    rx = tower.x + (rx - tower.x) * k;
    ry = tower.y + (ry - tower.y) * k;
  }

  // Re-find the rally on the path after the range clamp, so the slots are laid
  // out from a point that is actually on the road.
  const base = nearestOnPath(rx, ry);

  for (let i = 0; i < s.count; i++) {
    const [along, across, splay] = FORMATION[i % FORMATION.length];
    // `along` follows the road's curve; `across` steps off the tangent there.
    const at = walkPath(base.seg, base.t, along);
    const idle = Math.atan2(-at.ty, -at.tx) + splay * Math.PI / 180;

    state.units.push({
      tower,
      def: s,
      slot: i,
      rx: at.x - at.ty * across,
      ry: at.y + at.tx * across,
      x: tower.x,
      y: tower.y,
      // At rest a soldier watches the way the enemies come from, which is back
      // along the segment they walk. Only the left/right of this is drawn.
      faceIdle: idle,
      face: idle,
      hp: s.hp,
      maxHp: s.hp,
      foe: null,
      cd: 0,
      thrust: 0,      // 1 on the swing, decays; drives the lunge in render.js
      respawn: 0
    });
  }
}

export function removeUnits(state, tower) {
  for (const u of state.units) {
    if (u.tower === tower) release(u);
  }
  state.units = state.units.filter(u => u.tower !== tower);
}

function release(u) {
  if (!u.foe) return;
  u.foe.foe = null;
  u.foe = null;
}

export function updateUnits(state, dt) {
  for (const u of state.units) {
    if (u.respawn > 0) {
      u.respawn -= dt;
      if (u.respawn <= 0) {
        u.hp = u.maxHp;
        u.x = u.tower.x;
        u.y = u.tower.y;
        u.face = u.faceIdle;
      }
      continue;
    }

    if (u.foe && (u.foe.hp <= 0 || u.foe.leaked)) release(u);

    // A free soldier grabs the nearest unheld enemy that has walked into range.
    // One soldier holds one enemy, so three militiamen stall exactly three.
    if (!u.foe) {
      let best = null;
      let bestD = ENGAGE;
      for (const e of state.enemies) {
        if (e.foe || e.hp <= 0) continue;
        const d = Math.hypot(e.x - u.x, e.y - u.y);
        if (d < bestD) { bestD = d; best = e; }
      }
      if (best) { u.foe = best; best.foe = u; }
    }

    const tx = u.foe ? u.foe.x : u.rx;
    const ty = u.foe ? u.foe.y : u.ry;
    const d = Math.hypot(tx - u.x, ty - u.y);

    if (u.foe) u.face = Math.atan2(u.foe.y - u.y, u.foe.x - u.x);
    else if (d > SETTLE) u.face = Math.atan2(ty - u.y, tx - u.x);
    else u.face = u.faceIdle;

    if (d > SETTLE) {
      const step = Math.min(u.def.speed * dt, d);
      u.x += ((tx - u.x) / d) * step;
      u.y += ((ty - u.y) / d) * step;
    }

    u.cd -= dt;
    u.thrust = Math.max(0, u.thrust - dt * 4);

    if (u.foe && d <= REACH) {
      if (u.cd <= 0) {
        u.foe.hp -= u.def.damage;
        u.cd = u.def.cd;
        u.thrust = 1;
      }
      u.foe.acd -= dt;
      if (u.foe.acd <= 0) {
        u.hp -= u.foe.def.damage;
        u.foe.acd = u.foe.def.atkCd;
        u.foe.thrust = 1;   // the enemy lunges back, so a fight reads two-sided
      }
    }

    // Regen only out of combat, so a barracks recovers between waves without
    // making a soldier unkillable inside one.
    if (!u.foe && u.hp < u.maxHp) {
      u.hp = Math.min(u.maxHp, u.hp + u.def.regen * dt);
    }

    if (u.hp <= 0) {
      release(u);
      u.respawn = u.def.respawn;
      state.hits.push({ x: u.x, y: u.y, life: 0.2 });
    }
  }
}
