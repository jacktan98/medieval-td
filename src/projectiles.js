import { splat } from './blood.js';
import { inRange } from './ground.js';

export function updateShots(state, dt) {
  for (const s of state.shots) {
    const step = s.speed * dt;

    // A dead target ends an arrow, because an arrow is aimed at ONE man and
    // there is nothing left to aim at. A rock is not: it is a lump already in
    // the air over a crowd, and where it comes down is the crowd's problem
    // whether or not the man it was thrown at is still standing. So a splash
    // shot carries on to the spot and lands there.
    if (s.target.hp <= 0) {
      if (!s.splash) { s.dead = true; continue; }
      // Its aim point stops moving with the corpse: the target's last position
      // is the ground the crew was throwing at.
      s.at = s.at || { x: s.target.x, y: s.target.y };
    }

    // Homing keeps it simple — no lead prediction until enemies get faster.
    const aim = s.at || s.target;
    const ax = aim.x - s.x, ay = aim.y - s.y;
    const adist = Math.hypot(ax, ay);

    if (adist <= step) {
      land(state, s);
    } else {
      s.x += (ax / adist) * step;
      s.y += (ay / adist) * step;
      s.angle = Math.atan2(ay, ax);
    }
  }

  state.shots = state.shots.filter(s => !s.dead);

  for (const h of state.hits) h.life -= dt;
  state.hits = state.hits.filter(h => h.life > 0);
}

// Where the shot arrives. One victim for an arrow, everything standing in a
// patch of ground for a rock.
//
// THE SPLASH IS AN ELLIPSE, through the same inRange() that every tower's reach
// and every rally clamp goes through. That is not tidiness: the board is drawn
// in perspective, so a round patch of ground is drawn squashed, and a splash
// tested as a circle would kill men who are visibly outside it and spare men who
// are visibly inside. src/ground.js has the whole story — the game has already
// paid for that lesson once, with a tower that read as aiming at heads.
function land(state, s) {
  s.dead = true;
  state.hits.push({ x: s.x, y: s.y, life: 0.12 });

  if (!s.splash) {
    hit(state, s, s.target);
    return;
  }

  // Everything under it takes the FULL damage — there is no falloff, and the
  // one number in the info box is the number every man in the patch takes. A
  // gradient would be more realistic and would make the tower impossible to
  // describe on a button.
  //
  // Measured from where the rock actually landed rather than from the target,
  // so a shot that arrives after its man has walked on hits the ground it was
  // thrown at and whoever is standing there now.
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    if (!inRange(s.x, s.y, e.x, e.y, s.splash)) continue;
    hit(state, s, e);
  }
}

function hit(state, s, e) {
  // Damage only — the bounty and the kill FX are paid out in enemies.js, which
  // is the one place that sees every death however it was caused.
  e.hp -= s.damage;
  // On the man, not on the projectile. An arrow is inside its target by the time
  // it lands so the two are the same point, but a rock has a patch of victims
  // and blood belongs on each of them rather than in a heap at the impact.
  splat(state, e.x, e.y, e.y);
  // Which side the blow came from, so the body ends up facing it. The TOWER's
  // x, not the projectile's: at the moment of impact the projectile is on top of
  // the target, so its own position says nothing about where it was shot from.
  // Overwritten by every hit, so the last blow is the one that counts, which is
  // the one that killed him.
  e.struckFrom = s.fromX >= e.x ? 1 : -1;
  // Who to credit if this is the killing blow — see enemies.js, which is the one
  // place that sees every death however it was caused, and so the only place
  // that can tell a ranged kill from a sword kill.
  e.killedBy = 'shot';
}
