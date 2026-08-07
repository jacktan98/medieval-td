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

// Where the gunner stands: the centre of the building's platform. Held as a
// fraction of the box rather than a pixel offset, so it follows w/h when a
// tier is resized instead of drifting off the deck.
export function mountPoint(t) {
  const box = towerBox(t);
  return {
    x: box.left + box.w * t.def.mountFrac[0],
    y: box.top + box.h * t.def.mountFrac[1]
  };
}

// Where the projectile leaves the gunner, in world space.
//
// Gunner art is top-down, so the sprite rotates rigidly to aim and the muzzle
// rides along with it — [forward, sideways] relative to the aim. No mirroring,
// which is what used to flip the sprite as a target crossed straight overhead.
export function muzzlePoint(t) {
  const m = mountPoint(t);
  const [forward, side] = t.def.muzzle;
  const c = Math.cos(t.aim);
  const s = Math.sin(t.aim);

  return {
    x: m.x + forward * c - side * s,
    y: m.y + forward * s + side * c
  };
}

export function updateTowers(state, dt) {
  for (const t of state.towers) {
    // Barracks have no weapon — their range is rally reach, not a firing arc,
    // and they carry no mount or muzzle to aim with.
    if (!t.def.cooldown) continue;

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
