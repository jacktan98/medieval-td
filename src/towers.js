import { pickTarget } from './enemies.js';
import { projectileSpeed } from './data/towers.js';

// The building's drawn box in world space. render.js draws the tower from this
// box and both mount and muzzle are measured from its top-left corner, so the
// art and the firing origin cannot drift apart. When real tower sprites land,
// set w/h in data/towers.js to the size the sprite is drawn at — nothing else
// needs to change.
export function towerBox(t) {
  return {
    left: t.x - t.def.w / 2,
    top: t.y + 12 - t.def.h,
    w: t.def.w,
    h: t.def.h
  };
}

// Gunner sprites are side elevation, drawn facing right, same as every other
// building in the game. Aiming left mirrors them horizontally. They are never
// rotated — a standing archer rotated to aim upward is an archer lying down.
export function facing(t) {
  return Math.abs(t.aim) > Math.PI / 2 ? -1 : 1;
}

// Where the projectile leaves the gunner, in world space. Mirrors the muzzle's
// x offset with the sprite so the arrow always leaves the bow.
export function muzzlePoint(t) {
  const box = towerBox(t);
  const [mx, my] = t.def.mount;
  const [ox, oy] = t.def.muzzle;

  return {
    x: box.left + mx + ox * facing(t),
    y: box.top + my + oy
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
