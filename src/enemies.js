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
    t: 0             // wobble timer, drives the idle bob
  });
}

export function updateEnemies(state, dt) {
  for (const e of state.enemies) {
    e.t += dt;
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

  state.enemies = state.enemies.filter(e => !e.leaked && e.hp > 0);
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
