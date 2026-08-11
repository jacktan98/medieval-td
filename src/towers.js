import { pickTarget, leadPoint } from './enemies.js';
import { BEATS } from './data/towers.js';
import { play, SHOT } from './audio.js';

// The building's drawn box in world space. render.js draws the tower from this
// box and both mount and muzzle are measured from its top-left corner, so the
// art and the firing origin cannot drift apart.
//
// A building is placed by its GROUND SHADOW, not by its bounding box. The
// shadow's centre lands on the plot point, which is the same point the plot
// marker's own dirt ellipse lands on — so a building stands exactly where the
// marker it replaced was standing.
//
// The old rule was "centre the trim on x, put the bottom of the trim 12px below
// the plot", and it is wrong for any drawing with something sticking out. The
// barracks has a row of stakes planted in front of the tent that hang 68 source
// px BELOW its shadow; pinning those to the ground shoved the whole tent 22px
// up the screen. Tier 2's flagpole did the same thing sideways, 7px off centre.
// A bounding box is not where a building is — the shadow is the part that
// touches the ground, so it is the part that decides.
export function towerBox(t) {
  return {
    left: t.x - t.def.groundFrac[0] * t.def.w,
    top: t.y - t.def.groundFrac[1] * t.def.h,
    w: t.def.w,
    h: t.def.h
  };
}

// Whether the BUILDING's own artwork is drawn mirrored: -1 if it is, 1 if not.
//
// Buildings do not flip in this game — an isometric drawing reversed is lit from
// the wrong side — and artillery is the one exception, because a catapult is the
// only building that visibly POINTS. `buildingFaces` is which way the machine is
// drawn throwing, and it is only present on defs that mirror; everything else
// answers 1 and is never transformed at all.
//
// Note this is a different question from `spriteFaces`, which every archery tier
// also carries: that one is about the MAN standing on the deck.
export function buildingFlip(t) {
  const drawn = t.def.buildingFaces;
  if (!drawn) return 1;
  return (t.face || drawn) === drawn ? 1 : -1;
}

// Where the gunner stands: the centre of the building's platform. Held as a
// fraction of the box rather than a pixel offset, so it follows w/h when a
// tier is resized instead of drifting off the deck.
//
// A MIRRORED BUILDING MIRRORS ITS MOUNT with it, about the point it stands on —
// the same transform the renderer applies to the picture. Without this a
// catapult facing right would swing its arm to the right and drop the rock out
// of a sling still drawn on its left, which is the sort of thing that reads as
// the projectile being broken rather than the transform being incomplete.
export function mountPoint(t) {
  const box = towerBox(t);
  const x = box.left + box.w * t.def.mountFrac[0];
  return {
    x: buildingFlip(t) < 0 ? 2 * t.x - x : x,
    y: box.top + box.h * t.def.mountFrac[1]
  };
}

// Which side the target is on: +1 to the right, -1 to the left.
//
// Figures stay upright and only ever mirror. The art is drawn standing, so
// rotating it to the aim angle lays the figure over — upright with a left/right
// flip is the only orientation that reads correctly for a standing sprite.
export function facing(t) {
  return Math.cos(t.aim) >= 0 ? 1 : -1;
}

// Whether the sprite has to be mirrored to face the target. spriteFaces says
// which way the artwork is drawn, so art drawn facing the other way needs one
// number changed rather than the transform inverted.
export function mirror(def, dir) {
  return dir === def.spriteFaces ? 1 : -1;
}

// Where the projectile leaves the gunner, in world space. The muzzle is
// [sideways, vertical] from the body, and the sideways part flips with the
// sprite so the arrow always leaves the bow.
export function muzzlePoint(t) {
  const m = mountPoint(t);
  const [out, up] = t.def.muzzle;

  return {
    x: m.x + out * facing(t),
    y: m.y + up
  };
}

// Which drawing of the building to show. One-frame towers answer with the only
// picture they have; a catapult answers with the beat it is on.
//
// Read at DRAW time rather than stored on the tower, so the animation cannot get
// out of step with the rule that drives it — there is one clock, `beat`, and the
// picture is a function of it.
export function frameOf(t) {
  return t.def.frames ? t.def.frames[t.beat || 0] : t.def.sprite;
}

// The three beats of a catapult, in order. The index into `def.frames`, and into
// BEATS for how long each one holds.
const REST = 0;      // crew holding the rock — also the pose it idles on
const LOAD = 1;      // the rock goes in the sling; the crew commits to a side here
const FIRE = 2;      // the arm comes over, and the rock leaves on this beat

export function updateTowers(state, dt) {
  for (const t of state.towers) {
    // Barracks have no weapon — their range is rally reach, not a firing arc,
    // and they carry no mount or muzzle to aim with.
    if (!t.def.cooldown) continue;

    const target = pickTarget(state.enemies, t.x, t.y, t.def.range, t.def.minRange);
    if (target) t.aim = Math.atan2(target.y - t.y, target.x - t.x);

    if (t.def.frames) stepCrew(state, t, dt, target);
    else stepWeapon(state, t, dt, target);
  }
}

// A tower that simply fires when its cooldown runs out, and whose GUNNER kicks
// backward when it does. Archery, and anything else with one drawing and a man
// standing on it.
//
// `cd` and `recoil` both live here rather than in shoot(), because neither means
// anything to a catapult: its clock is the beat loop below, and its recoil would
// have to be the arm, which the artist has drawn.
function stepWeapon(state, t, dt, target) {
  t.recoil = Math.max(0, t.recoil - dt * 5);
  t.cd -= dt;
  if (!target || t.cd > 0) return;

  shoot(state, t, target);
  t.cd = t.def.cooldown;
  t.recoil = 1;
}

// A tower whose reload is ANIMATED, so the rules and the pictures have to agree.
//
// The loop is three beats — rest, reload, fire — of the lengths in BEATS, and
// the shot happens on the beat the arm is drawn coming over rather than on a
// cooldown that expires somewhere in the middle of it. That is the whole reason
// this is a separate function rather than a frame index derived from `cd`: the
// machine must never fire on a frame it is not drawn firing.
//
// The beats are NOT equal — 0.75, 0.75, 1.5 — so the Fire pose holds long enough
// for a lobbed rock to land under it. That is why each boundary reads its own
// length out of BEATS instead of adding a constant.
//
// AT REST it sits on beat 0 with the clock stopped, which is what makes an idle
// catapult a still picture rather than a machine miming a reload at nobody. The
// clock only starts when there is something to shoot, so a target walking into
// range always gets the full reload beat before the rock comes — you see it
// being loaded, then you see it thrown.
function stepCrew(state, t, dt, target) {
  t.beatT -= dt;
  if (t.beatT > 0) return;

  // A beat boundary is the ONLY place this decides anything, which is what stops
  // a target dying mid-swing from snapping the arm back down: whatever is drawn
  // now finishes its second first.
  if (!target) {
    t.beat = REST;
    t.beatT = 0;
    return;
  }

  t.beat = (t.beat + 1) % t.def.frames.length;
  t.beatT = BEATS[t.beat];

  // WHICH WAY THE MACHINE FACES IS DECIDED HERE AND NOWHERE ELSE — once per
  // cycle, on the beat the crew starts loading, and then held through the throw
  // and back to rest.
  //
  // The alternative is to face wherever the current target happens to be, and it
  // looks terrible: pickTarget re-chooses every frame, and on a road with
  // enemies on both sides of a machine the whole thing snaps back and forth
  // several times a second. Worse, it can turn BETWEEN the reload and the
  // throw — the crew loads facing left and looses to the right.
  //
  // Latching at LOAD is also the honest reading of the animation. A crew winds
  // and loads a machine pointing somewhere; they do not swivel it mid-swing
  // because a better target walked past.
  if (t.beat === LOAD) t.face = target.x >= t.x ? 1 : -1;

  if (t.beat === FIRE) shoot(state, t, target);
}

function shoot(state, t, target) {
  const m = muzzlePoint(t);
  const ammo = t.def.ammo;

  const shot = {
    x: m.x,
    y: m.y,
    angle: t.aim,          // so the first frame already points at the target
    // Where it was shot FROM, kept because the projectile's own position at the
    // moment it lands is the target's. A corpse faces the blow, and this is the
    // only record of which side the blow was on.
    fromX: t.x,
    target,
    damage: t.def.damage,
    // 0 or absent on everything but a catapult, and read by projectiles.js as
    // "hit only what you hit".
    splash: t.def.splash || 0,
    ammo,
    speed: ammo.speed
  };

  if (ammo.arc) aim(shot, m, target);
  state.shots.push(shot);

  // Category B: never skipped, never queued. Every arrow you can see leave a bow
  // makes its own noise, because ten towers firing is ten events the player is
  // watching and a shared channel would silence nine of them.
  //
  // The rock's noise is not here — it is in projectiles.js, on the landing. See
  // `fireSound` / `landSound` in data/towers.js.
  if (ammo.fireSound) play(SHOT);
}

// Commit a lobbed shot to a patch of ground, and aim it AHEAD of the target.
//
// This is the whole difference between the two projectiles. An arrow is steered
// and needs no plan; a rock is thrown, and by the time it arrives — up to 1.2s
// later — a marching enemy has moved 85px, which is more than the splash is
// wide. Thrown at where the man IS, a catapult would land behind the column
// every single time and read as broken.
//
// The lead is EXACT rather than extrapolated from a heading: an enemy's position
// is a distance along a known polyline, so where it will be in 1.2 seconds is a
// lookup rather than a guess. That matters most at the bends, which is exactly
// where a straight-line extrapolation would throw the rock off the road.
//
// Solved by ONE PASS, not iterated. The flight time is measured to where the
// target is now and the aim point is taken that far ahead — the honest fixed
// point would re-measure the distance to the new aim and go round again, and it
// is not worth it: the error is second-order, the splash is 55px or more, and a
// crew that occasionally leads a fraction long is a crew.
function aim(shot, from, target) {
  const dist = Math.hypot(target.x - from.x, target.y - from.y);
  const flight = dist / shot.speed;
  const to = leadPoint(target, flight);

  shot.from = { x: from.x, y: from.y };
  shot.to = to;
  shot.flight = flight;
  shot.t = 0;
  // The top of the arc, as a fraction of how far the rock is actually going —
  // so a short lob is a low one and the throw always looks like the same engine.
  shot.lift = Math.hypot(to.x - from.x, to.y - from.y) * shot.ammo.arc;
}
