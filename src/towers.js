import { pickTarget } from './enemies.js';
import { projectileSpeed } from './data/towers.js';

export function muzzlePoint(t) {
  const [mx, my] = t.def.mount;
  const [ox, oy] = t.def.muzzle;
  const flip = Math.abs(t.aim) > Math.PI / 2 ? -1 : 1;
  const fy = oy * flip;
  const c = Math.cos(t.aim);
  const s = Math.sin(t.aim);

  const left = t.x - t.def.w / 2;
  const top = t.y - t.def.h + 18;

  return {
    x: left + mx + ox * c - fy * s,
    y: top + my + ox * s + fy * c
  };
}

  // Tower sprite is drawn centred on the plot, so back out to its top-left.
  const left = t.x - t.def.w / 2;
  const top = t.y - t.def.h + 18;

  return {
    x: left + mx + ox * c - oy * s,
    y: top + my + ox * s + oy * c
  };
}

export function updateTowers(state, dt) {
  for (const t of state.towers) {
    t.cd -= dt;
    t.recoil = Math.max(0, t.recoil - dt * 5);

    const target = pickTarget(state.enemies, t.x, t.y, t.def.range);
    if (!target) continue;

    t.aim = Math.atan2(target.y - t.y, target.x - t.x);

    if (t.cd <= 0) {
      const m = muzzlePoint(t);
      state.shots.push({
        x: m.x,
        y: m.y,
        target,
        damage: t.def.damage,
        speed: projectileSpeed
      });
      t.cd = t.def.cooldown;
      t.recoil = 1;
    }
  }
}
