export function updateShots(state, dt) {
  for (const s of state.shots) {
    // Homing keeps it simple — no lead prediction until enemies get faster.
    const dx = s.target.x - s.x;
    const dy = s.target.y - s.y;
    const dist = Math.hypot(dx, dy);
    const step = s.speed * dt;

    if (s.target.hp <= 0) { s.dead = true; continue; }

    if (dist <= step) {
      s.target.hp -= s.damage;
      s.dead = true;
      if (s.target.hp <= 0) {
        state.gold += s.target.def.bounty;
        state.hits.push({ x: s.target.x, y: s.target.y, life: 0.25 });
      } else {
        state.hits.push({ x: s.x, y: s.y, life: 0.12 });
      }
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
