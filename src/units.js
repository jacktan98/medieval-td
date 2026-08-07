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
const FORMATION = [[-17, 0, 0], [9, -13, -22], [9, 13, 22]];

// Nearest point on the path polyline — the rally point a barracks sends its
// soldiers to. Returns the segment direction too, so the formation can be laid
// out across the path rather than along it.
export function nearestOnPath(x, y) {
  let best = { x: path[0].x, y: path[0].y, d: Infinity, tx: 1, ty: 0, len: 1 };

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

    if (d < best.d) best = { x: px, y: py, d, tx: dx, ty: dy, len: Math.sqrt(len2) || 1 };
  }

  return best;
}

export function makeUnits(state, tower) {
  removeUnits(state, tower);

  const s = tower.def.soldier;
  if (!s) return;

  const near = nearestOnPath(tower.x, tower.y);

  // Keep the rally inside the tower's reach. Every plot on level 1 sits within
  // 96px of the path and the shortest barracks reach is 110, so this only bites
  // if a later level puts a plot further out.
  let rx = near.x;
  let ry = near.y;
  const away = Math.hypot(rx - tower.x, ry - tower.y);
  if (away > tower.def.range) {
    const k = tower.def.range / away;
    rx = tower.x + (rx - tower.x) * k;
    ry = tower.y + (ry - tower.y) * k;
  }

  // Unit vectors along the path segment and across it.
  const ax = near.tx / near.len;
  const ay = near.ty / near.len;
  const nx = -ay;
  const ny = ax;

  for (let i = 0; i < s.count; i++) {
    const [along, across, splay] = FORMATION[i % FORMATION.length];
    const idle = Math.atan2(-ay, -ax) + splay * Math.PI / 180;
    state.units.push({
      tower,
      def: s,
      slot: i,
      rx: rx + ax * along + nx * across,
      ry: ry + ay * along + ny * across,
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
