import { path } from './data/level01.js';

// Blocking soldiers. A barracks puts a few of these on the path; enemies that
// walk into them stop and trade blows instead of continuing to the keep.
//
// The whole family is a stall, not a damage source. A tier 1 militiaman holds
// one light infantry for 11.7s and deals 35 of its 50 hp before dying — the
// enemy walks away wounded, not dead. Holding the path is the product. Raising
// soldier damage is the fastest way to break this: at 4 damage a barracks-only
// build clears all eight waves on its own, which is not what the family is for.

const ENGAGE = 30;   // an enemy this close to a free soldier stops and fights
const REACH  = 20;   // melee lands at this range
const SETTLE = 16;   // stop walking here, so the two stand adjacent not stacked
const SPREAD = [-14, 0, 14];   // across the path, not along it, so the line blocks

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

  const nx = -near.ty / near.len;
  const ny = near.tx / near.len;

  for (let i = 0; i < s.count; i++) {
    const off = SPREAD[i % SPREAD.length];
    state.units.push({
      tower,
      def: s,
      slot: i,
      rx: rx + nx * off,
      ry: ry + ny * off,
      x: tower.x,
      y: tower.y,
      hp: s.hp,
      maxHp: s.hp,
      foe: null,
      cd: 0,
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

    if (d > SETTLE) {
      const step = Math.min(u.def.speed * dt, d);
      u.x += ((tx - u.x) / d) * step;
      u.y += ((ty - u.y) / d) * step;
    }

    u.cd -= dt;

    if (u.foe && d <= REACH) {
      if (u.cd <= 0) {
        u.foe.hp -= u.def.damage;
        u.cd = u.def.cd;
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
