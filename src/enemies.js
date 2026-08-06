import { path } from './data/level01.js';
import { enemyTypes } from './data/waves.js';

export function spawn(state, typeId) {
  const def = enemyTypes[typeId];
  state.enemies.push({
    def,
    x: path[0].x,
    y: path[0].y,
    hp: def.hp,
    maxHp: def.hp,
    leg: 0,          // index of the waypoint being walked toward
    t: 0,            // wobble timer, drives the idle bob
    foe: null,       // the barracks soldier holding it, if any
    acd: 0           // melee cooldown, only ticks while held
  });
}

export function updateEnemies(state, dt) {
  for (const e of state.enemies) {
    e.t += dt;

    // Held in melee by a soldier. Blocked enemies stop dead rather than
    // sliding past — this is the whole point of the barracks family, and the
    // one case where an enemy is not a pure path-follower.
    if (e.foe) continue;

    let move = e.def.speed * dt;

    while (move > 0 && e.leg < path.length - 1) {
      const target = path[e.leg + 1];
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= move) {
        e.x = target.x;
        e.y = target.y;
        move -= dist;
        e.leg++;
      } else {
        e.x += (dx / dist) * move;
        e.y += (dy / dist) * move;
        move = 0;
      }
    }

    if (e.leg >= path.length - 1) {
      e.leaked = true;
    }
  }

  for (const e of state.enemies) {
    if (e.leaked) state.lives -= e.def.leak;
  }

  // Bounty is paid here rather than in projectiles.js, so a soldier's kill and
  // an arrow's kill are worth the same and neither can pay out twice.
  state.enemies = state.enemies.filter(e => {
    if (e.leaked) {
      if (e.foe) { e.foe.foe = null; e.foe = null; }
      return false;
    }
    if (e.hp <= 0) {
      state.gold += e.def.bounty;
      state.hits.push({ x: e.x, y: e.y, life: 0.25 });
      if (e.foe) { e.foe.foe = null; e.foe = null; }
      return false;
    }
    return true;
  });
}

// Furthest along the path, so towers focus whatever is closest to leaking.
export function pickTarget(enemies, x, y, range) {
  let best = null;
  let bestProgress = -1;

  for (const e of enemies) {
    if (Math.hypot(e.x - x, e.y - y) > range) continue;
    const progress = e.leg + 1 / (1 + Math.hypot(path[e.leg + 1].x - e.x, path[e.leg + 1].y - e.y));
    if (progress > bestProgress) {
      bestProgress = progress;
      best = e;
    }
  }
  return best;
}
