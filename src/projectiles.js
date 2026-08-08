import { splat } from './blood.js';

export function updateShots(state, dt) {
  for (const s of state.shots) {
    // Homing keeps it simple — no lead prediction until enemies get faster.
    const dx = s.target.x - s.x;
    const dy = s.target.y - s.y;
    const dist = Math.hypot(dx, dy);
    const step = s.speed * dt;

    if (s.target.hp <= 0) { s.dead = true; continue; }

    if (dist <= step) {
      // Damage only — the bounty and the kill FX are paid out in enemies.js,
      // which is the one place that sees every death however it was caused.
      s.target.hp -= s.damage;
      s.dead = true;
      state.hits.push({ x: s.x, y: s.y, life: 0.12 });
      // Thrown from the arrow's own position rather than the target's centre,
      // so it appears where the shaft went in.
      splat(state, s.x, s.y);
    } else {
      s.x += (dx / dist) * step;
      s.y += (dy / dist) * step;
      s.angle = Math.atan2(dy, dx);
    }
  }

  state.shots = state.shots.filter(s => !s.dead);

  for (const h of state.hits) h.life -= dt;
  state.hits = state.hits.filter(h => h.life > 0);
}
