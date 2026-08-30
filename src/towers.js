import { pickTarget, leadPoint } from './enemies.js';
import { BEATS, SCALE } from './data/towers.js';
import { abilitiesOf, owns } from './data/abilities.js';
import { play, SHOT, ARCANE, MUSKET, DEADEYE, BOLT, CROSSBOW, CANNON } from './audio.js';

// What LEAVING sounds like, by ammunition — the mirror of the LANDING table in
// projectiles.js, and it is a table for the same reason that one is: "what does
// this sound like" has exactly one answer per kind, so a third projectile that
// announces itself needs a row rather than a branch.
//
// A rock is not here on purpose. It is silent in the air and announces itself by
// arriving, which is where the player is already looking.
//
// A CANNONBALL IS, AND IT IS THE ROW THAT MAKES THE POINT: the two artillery
// tier 4s and the three machines under them are the same family firing very
// different things, and the table is where that difference is stated once. Powder
// is the report; a boulder is the arrival. A row here and a row in LANDING say
// which, and no code anywhere asks what family a shot came from.
//
// `deadeye` is the fourth row and it is why the table earns its keep: an ability
// arrived with a projectile of its own, and giving it a voice was one line here
// rather than a branch in shoot().
//
// `judgement` is the fifth row and it points at the SAME cue as `arcane`, which
// is the other thing this table is good for: the pope fires the monastery's own
// noise, a quarter louder, so what he needed was a kind of his own for the KILL
// cry — see src/enemies.js — and no new sound at all. The loudness rides on the
// ammunition as `fireGain`.
//
// EXPORTED for tools/sound.mjs, which is the only way a missing row can be
// caught. `play(undefined)` is silence with no error and no warning, so an
// ammunition that says `fireSound: true` and has no row here simply stops making
// a noise — and the tower goes on working perfectly in every other respect.
export const FIRING = { arrow: SHOT, arcane: ARCANE, judgement: ARCANE, bullet: MUSKET,
                        deadeye: DEADEYE, bolt: BOLT, quarrel: CROSSBOW,
                        cannonball: CANNON };

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

// THE TOPMOST INK OF THE WHOLE TOWER, occupant included.
//
// towerBox is the BUILDING, and on half the families that is not the top of what
// the player sees: a Ballista Turret is a squat stone base with a machine sitting
// on it, and an archer stands a head above his deck. Anything that hangs
// something over a tower — the aura badges — has to clear the drawing rather than
// the building, or it lands on the ballista of one family and in clear sky over
// another.
//
// EVERY POSE, not the one being drawn this frame. A man's Attack drawing is a
// different height from his Default and an ability's pose is different again, so
// a badge measured off the current frame would bob up and down as he shot. The
// union is static per tier and the badge holds still.
//
// A monastery answers with its own roof and that is correct: the pope stands
// UNDER it, so the building really is the top of that drawing.
export function crownTop(t) {
  const d = t.def;
  const box = towerBox(t);
  let top = box.top;

  if (d.gunner) {
    const m = mountPoint(t);
    const poses = [[d.gunnerTrim, d.gunnerPivot]];
    if (d.attack) poses.push([d.attack.trim, d.attack.pivot]);
    for (const a of abilitiesOf(d)) if (a.pose) poses.push([a.pose.trim, a.pose.pivot]);
    for (const [trim, pivot] of poses) top = Math.min(top, m.y - pivot[1] * trim[3] * SCALE);
  }

  if (d.machine) top = Math.min(top, machineBox(d, box).top);

  return top;
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

// WHERE THE MACHINE ON A TURRET IS DRAWN, given the box its base occupies.
//
// One helper for two callers that must not disagree: the board draws the turret
// from towerBox and the encyclopedia draws it into a card slot, and in both the
// machine has to stand on the same spot of the same roof at the same scale. The
// box is whatever the base was drawn at, so the machine is scaled by the ratio
// rather than by SCALE — a card that shrinks the turret shrinks the ballista on
// top of it by exactly as much.
//
// `x` is the machine's standing point, which is also the line it mirrors about.
export function machineBox(def, box) {
  const m = def.machine;
  const x = box.left + box.w * def.mountFrac[0];
  const y = box.top + box.h * def.mountFrac[1];
  const w = m.w * (box.w / def.w);
  const h = m.h * (box.h / def.h);
  const left = x - m.pivot[0] * w;
  return {
    x, y, left, top: y - m.pivot[1] * h, w, h,
    // THE LINE IT MIRRORS ABOUT, and it is NOT the post it stands on.
    //
    // It was the post for one build and that is the version the owner sent back:
    // the ballista is drawn with its post near one end and its crew at the
    // other, so flipping about the post swings the whole machine 175 source px
    // across the roof and it ends up hanging off one side or the other whichever
    // way it turns. Flipping about the middle of the DRAWING keeps the same
    // footprint both ways — the post and the engineer simply swap ends of it —
    // so a machine centred on the deck stays centred on the deck.
    axis: left + w * (m.mirror ?? 0.5)
  };
}

// Where the bolt leaves a turret's machine, in world space.
//
// Held as a fraction of the machine's own trim rather than as an offset from
// anything, for the same reason `pivot` is: it is a point of the DRAWING, so it
// survives the machine being resized, and it goes through exactly the same
// mirror the picture does. An offset measured from the post would have to be
// re-derived every time the mirror line moved, which is how the first version
// ended up firing out of the back of the machine.
export function machineNose(def, box) {
  const m = machineBox(def, box);
  const [fx, fy] = def.machine.nose;
  return { x: m.left + m.w * fx, y: m.top + m.h * fy, axis: m.axis };
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

// Whether the MACHINE on a turret is drawn mirrored: -1 if it is, 1 if not.
//
// The same question buildingFlip asks about a whole building, asked about the
// half of a tier 4 that turns. The stone underneath it never flips — see the
// note on `ballista` in data/towers.js — so the two cannot be the same call.
//
// `t.face` is latched once a cycle in stepCrew, exactly as it is for the
// catapults, so a machine cannot turn between loading and loosing.
export function machineFlip(t) {
  const m = t.def.machine;
  if (!m) return 1;
  return (t.face || m.faces) === m.faces ? 1 : -1;
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
  // A MACHINE'S MUZZLE IS A POINT OF ITS DRAWING, mirrored with the drawing —
  // see machineNose. Not an offset from the post: the post is not the line the
  // picture flips about, so an offset from it puts the shot on the wrong end of
  // the machine in one of the two directions.
  if (t.def.machine) {
    const n = machineNose(t.def, towerBox(t));
    return { x: machineFlip(t) < 0 ? 2 * n.axis - n.x : n.x, y: n.y };
  }

  const m = mountPoint(t);
  const [out, up] = t.def.muzzle;

  // `out` is measured toward the target: an archer's bow arm is on the side he
  // is shooting at, so it simply follows `facing`.
  return {
    x: m.x + out * facing(t),
    y: m.y + up
  };
}

// HOW FAR THIS TOWER REACHES, which is the tier's number unless an ability it has
// bought says otherwise.
//
// A HELPER RATHER THAN A FIELD, because reach is asked for in five places — the
// target picker twice, the ring the player sees, the rally clamp, the leash on a
// squad — and a tower whose ring and whose targeting disagreed would be the worst
// kind of bug: the game would be right and the drawing would be lying, or the
// other way round. Everything that asks a TOWER how far it reaches comes here.
//
// `def.range` is still the answer for anything holding a def rather than a tower —
// the encyclopedia, the upgrade preview, tools/families.mjs — and that is correct:
// those are questions about the tower as it is SOLD, and an ability is bought
// afterwards, per tower, with gold.
// A MULTIPLE OF THE TIER'S OWN REACH rather than a distance of its own, which is
// the rule every ability magnitude in this game now follows: half again as far
// stays half again as far the next time the turret's 260 is retuned. `rangeTimes`
// is the only shape here today; a flat `range` is still read, so an ability that
// genuinely wants a fixed distance can have one.
export function rangeOf(t) {
  let k = 1;
  for (const a of boughtAbilities(t)) {
    if (a.range) return a.range;
    if (a.rangeTimes) k *= a.rangeTimes;
  }
  return Math.round(t.def.range * k);
}

// HOW LONG THIS TOWER TAKES TO RELOAD, which is the tier's number unless an
// ability it has bought says otherwise. The reload twin of rangeOf above.
//
// A MULTIPLIER ON THE SPEED, WHICH IS A DIVISOR ON THE TIME, and that is the
// whole of why this reads backwards from rangeOf. `reloadTimes: 1.25` means the
// tower reloads a quarter faster, so the cooldown is DIVIDED — a number above 1
// makes the gap smaller. Written that way round because "reloads 1.25x faster"
// is the sentence on the card, and a 0.8 that meant the same thing would read as
// a nerf every time somebody looked at it.
//
// THEY COMPOUND, like rangeOf's `rangeTimes`, so two of them would be worth the
// product rather than the better of the pair. Nothing hands out two today.
// HOW FAR THIS TOWER'S MEN THROW, or null if they do not throw at all.
//
// THE THIRD READING OF "REACH" ON ONE TOWER, and the reason it is a function of
// its own rather than a branch in rangeOf. A barracks carries a `range` that is
// the LEASH on its rally point — where its men may be posted — and rangeOf
// answers with that; the Assassin Guild that has bought Knife Throw ALSO has a
// distance its men can hurt somebody at, and the two are different numbers
// meaning different things on the same building. Folding this into rangeOf would
// have shortened the leash to the throw, which is the bug the ability's field is
// named `reach` to avoid — see the note on it in data/abilities.js.
//
// Null for every tower in the game but that one, and null for that one until it
// is taught. The info box prints it in the range row, which is otherwise blank
// for a barracks; nothing else reads it, and in particular the RING on the board
// is still the leash, because the ring is what the player drags a rally flag
// against.
export function reachOf(t) {
  for (const a of boughtAbilities(t)) if (a.reach) return a.reach;
  return null;
}

export function cooldownOf(t) {
  return t.def.cooldown / reloadK(t);
}

// How much faster this tower reloads than its tier says, as a multiplier. Split
// out of cooldownOf because artillery needs the same figure applied somewhere
// else entirely — see beatsOf.
function reloadK(t) {
  let k = 1;
  for (const a of boughtAbilities(t)) if (a.reloadTimes) k *= a.reloadTimes;
  return k;
}

// WHICH PAIR OF DRAWINGS THE MAN ON THE DECK IS SHOWING, or null for the ones
// the tier ships with. The figure's answer to framesOf below.
//
// Reinforced Tension rebuilds the crossbow in steel, which is two files — his
// standing pose and his loosing pose — and BOTH have to swap or he would change
// weapon every time he fired. The artist drew them to the same trims and the
// same shadow pixel as the timber pair, so this is a sprite key and nothing else:
// no trim, no pivot, no muzzle. See the entry in data/abilities.js.
export const gunnerOf = t => {
  for (const a of boughtAbilities(t)) if (a.gunner) return a.gunner;
  return null;
};

// Which drawing of the building to show. One-frame towers answer with the only
// picture they have; a catapult answers with the beat it is on.
//
// Read at DRAW time rather than stored on the tower, so the animation cannot get
// out of step with the rule that drives it — there is one clock, `beat`, and the
// picture is a function of it.
export function frameOf(t) {
  const f = framesOf(t.def, t);
  return f ? f[t.beat || 0] : t.def.sprite;
}

// The animation frames a def owns, or null for a building with one picture.
// Tiers 1 to 3 hold them directly; tier 4 holds them on the MACHINE that stands
// on its turret, because the turret itself never moves.
//
// AN ABILITY MAY REPLACE THE SET, and Far Shot does: it rebuilds the ballista in
// iron, which is three files with the same three trims. `t` is optional so every
// caller that only has a def — the encyclopedia, the tools — still gets the
// pictures the tier ships with, which is what those callers are asking about.
export const framesOf = (def, t) => {
  if (t) for (const a of boughtAbilities(t)) if (a.frames) return a.frames;
  return (def.machine ? def.machine.frames : def.frames) || null;
};

// How long each beat holds, and a tier may have its own. The three catapults
// share BEATS; the ballista is the same three beats at 60% of the length, which
// is what "faster reload" is in a family whose cooldown IS its animation.
//
// AND AN ABILITY MAY SHORTEN THEM, which is the `t` argument and is the whole of
// what Swift Reload means on this family.
//
// It is not a nicety. Artillery's clock is its ANIMATION — stepCrew advances on
// beat boundaries and the shot leaves on the Fire beat, and `cooldown` is a
// description of the beats that the menu and the encyclopedia read. So a reload
// ability that only divided cooldownOf would have done LITERALLY NOTHING to a
// cannon: the card would promise a ball every 2 seconds and the machine would go
// on firing every 3, with no error anywhere and nothing to find but the feeling
// that 150 gold had bought nothing.
//
// Dividing each beat by the same figure keeps the two in step by construction:
// the beats still add up to cooldownOf, which is the invariant tools/families.mjs
// checks for every artillery tier.
//
// `t` is optional, and a caller with only a def — the encyclopedia, the tools —
// gets the beats the tier ships with, which is what those callers are asking
// about. Exactly the same split framesOf makes, for the same reason.
export const beatsOf = (def, t) => {
  const beats = def.beats || BEATS;
  const k = t ? reloadK(t) : 1;
  return k === 1 ? beats : beats.map(b => b / k);
};

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

    const target = pickTarget(state.enemies, t.x, t.y, rangeOf(t), t.def.minRange, t.aimMode);
    if (target) t.aim = Math.atan2(target.y - t.y, target.x - t.x);

    if (framesOf(t.def, t)) stepCrew(state, t, dt, target);
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

  // THE REST OF A BURST, on its own little clock rather than on the reload. Once
  // the trigger has been squeezed the three balls are going.
  //
  // EACH ONE PICKS ITS OWN MAN. That is the ability, at the artist's request —
  // three balls into one militiaman is 180 damage spent on 80 health, and three
  // into three of them is a rank gone — so every ball after the first re-chooses
  // through the tower's own standing order, excluding whoever the burst has hit
  // already. See burstTarget below for the case where there is nobody left to
  // choose.
  //
  // Ahead of the hold below, because the hold does not start until the last ball
  // has left.
  if (t.burst > 0) {
    t.burstT -= dt;
    if (t.burstT > 0) return;
    const next = burstTarget(state, t) || target;
    if (!next) return;
    // Turn to the new man before the ball leaves, so the gunner is facing what he
    // is shooting and the shot's own angle is right on its first frame.
    t.aim = Math.atan2(next.y - t.y, next.x - t.x);
    shoot(state, t, next, t.special);
    t.hit.push(next);
    t.recoil = 1;
    t.burst--;
    t.burstT = t.special.gap;
    if (t.burst === 0) t.hold = t.special.hold;
    return;
  }

  // THE HELD POSE AFTER A SPECIAL, and it blocks the next shot as well as showing.
  // One rule for all four abilities — see `hold` in data/abilities.js — and on this
  // tower it is invisible: the reload is 2.4s and the longest hold is 2, so the
  // pose is over before the musket is loaded again. It is the paladin, whose swing
  // is 0.80s, that a two-second hold actually costs anything.
  if (t.hold > 0) {
    t.hold -= dt;
    if (t.hold > 0) return;
    t.special = null;
    // And let go of whoever the burst hit. Nothing reads the list once the burst
    // is over — it is only consulted while `t.burst` is above zero — but holding
    // three references to dead enemies until the next burst is three bodies the
    // collector cannot take.
    t.hit.length = 0;
  }

  // THE WIND-UP, and only Deadeye has one. A second before the shot goes the tower
  // chooses its man and paints a mark over his head — see `lock` in
  // data/abilities.js for why the hardest blow in the game announces itself.
  //
  // The choice is made ONCE and then held: re-picking every frame would slide the
  // mark from man to man up the road, which is the opposite of what a mark is for.
  // It is dropped and re-taken only if the man it was on dies or leaks in the
  // meantime.
  const coming = specialFor(t, (t.shots || 0) + 1);

  // A GLOBAL SPECIAL LOOKS OVER THE WHOLE BOARD, which is Deadeye and only
  // Deadeye. The tower's own reach decides every ordinary shot; this one shot
  // ignores it and takes the enemy the tower's standing order would pick if the
  // map were all inside its ring — see `global` in data/abilities.js.
  //
  // It is also the one case where a tower with NOTHING in range still fires: the
  // ball goes to a man on the far side of the map, so "no target" below has to
  // mean no target ANYWHERE rather than none in the ring.
  const far = coming && coming.global
    ? pickTarget(state.enemies, t.x, t.y, Infinity, 0, t.aimMode)
    : null;
  const aimAt = far || target;

  if (coming && coming.lock && aimAt && t.cd <= coming.lock) {
    if (!t.locked || t.locked.hp <= 0 || t.locked.leaked) t.locked = aimAt;
    // And he turns to the man he has chosen for the whole second, rather than
    // tracking whoever the tower would otherwise be aiming at. That is most of
    // what makes the warning read as one: the mark goes up, the musketeer swings
    // round to it, and then the ball.
    t.aim = Math.atan2(t.locked.y - t.y, t.locked.x - t.x);
  } else if (t.locked) {
    t.locked = null;
  }

  if (t.cd > 0) return;

  // WHAT THIS SHOT CAN BE FIRED AT: the whole board if the special coming up is a
  // global one, the ring otherwise. An ordinary shot with an empty ring still
  // waits, exactly as it always has.
  const shotAt = coming && coming.global ? aimAt : target;
  if (!shotAt) return;

  t.shots = (t.shots || 0) + 1;
  t.cd = cooldownOf(t);
  t.recoil = 1;

  const special = specialFor(t, t.shots);
  if (!special) { shoot(state, t, shotAt); return; }

  // A locked shot goes to the man the mark is on, not to whoever the tower would
  // pick this frame. Without that the mark would be a lie — a second of warning
  // over one enemy and the ball into another.
  const at = (special.lock && t.locked && t.locked.hp > 0 && !t.locked.leaked)
    ? t.locked : shotAt;
  t.locked = null;
  if (at !== target) t.aim = Math.atan2(at.y - t.y, at.x - t.x);

  // The first ball of a burst leaves on this frame, exactly as an ordinary shot
  // would; the other two are queued above. Deadeye is `shots: 1`, so for it the
  // queue is empty and the hold starts here.
  t.special = special;
  shoot(state, t, at, special);
  t.hit = [at];
  t.burst = special.shots - 1;
  t.burstT = special.gap || 0;
  if (t.burst === 0) t.hold = special.hold;
}

// WHO THE NEXT BALL OF A BURST GOES TO: the tower's own choice again, made over
// everybody it has not already hit this burst.
//
// Through pickTarget rather than "the nearest one left", so the standing order
// still means what it says — a Post told to shoot the toughest spreads its burst
// across the three toughest, not across the three nearest.
//
// IT FALLS BACK, and the fallback is the interesting half. With one man on the
// road there is nobody else to spread to, and a burst that refused to fire would
// read as the ability being broken exactly when the player is watching it. So the
// caller uses this if it can and the tower's ordinary target if it cannot: three
// different men when there are three, and three into one when there is one.
function burstTarget(state, t) {
  const fresh = state.enemies.filter(e => !t.hit.includes(e));
  if (!fresh.length) return null;
  return pickTarget(fresh, t.x, t.y, rangeOf(t), t.def.minRange, t.aimMode);
}

// The abilities a tower has BOUGHT that change how it shoots. Holy Light is not
// one of them anywhere — it has no `every` — which is what keeps a paladin's heal
// out of a musketeer's trigger without either of them knowing about the other.
//
// The empty case is answered without allocating, because this is asked once a
// frame per tower for the wind-up as well as once per shot, and the answer for
// every tower on the board except a taught tier 4 is "none".
const NONE = [];
const firingAbilities = t =>
  (t.abilities && t.abilities.length)
    ? abilitiesOf(t.def).filter(a => a.every && owns(t, a.id))
    : NONE;

// EVERY AURA IN FORCE ON THE MAP, ONE ENTRY PER TOWER THAT PAID FOR IT.
//
// AN AURA IS A STATE OF THE MAP RATHER THAN A THING A TOWER HAS. Everything else
// in this game is bought per plot and works on the plot it was bought on; these
// two are bought on one plot and work everywhere.
//
// AND THEY COMPOUND. Two temples both taught Holy Wrath are 1.1 x 1.1 = +21%, and
// the same for Divine Fortitude, so the second 150 gold buys as much as the first
// did relative to what is already on the board. The list is therefore the bought
// COPIES rather than the distinct abilities — a temple that has bought nothing
// contributes nothing, and a temple that has bought both puts both here.
//
// The one thing a caller must not do is treat this as a list of what to draw:
// two temples are two Holy Wraths and one badge over each tower. See drawBadges
// in render.js, which reduces it to the distinct badges.
//
// Rebuilt per call rather than cached on the state: it is asked once per shot and
// once per frame for the squads, the tower list is never longer than eleven, and a
// cache would need invalidating on build, sell, upgrade and purchase — four hooks
// to get wrong in exchange for nothing measurable.
export function auras(state) {
  const out = [];
  for (const t of state.towers || NONE) {
    for (const a of boughtAbilities(t)) if (a.aura) out.push(a);
  }
  return out;
}

// The multiplier an aura puts on one FIELD for one family: 1 when nothing on the
// map is buffing it, which is the answer almost every call gets.
//
// Keyed by family id rather than by a predicate on the def, so what an aura covers
// can be read out of the data and printed — see the `on` lists in
// data/abilities.js and the table tools/abilities.mjs prints from them.
export function boost(state, what, famId) {
  let k = 1;
  for (const a of auras(state)) {
    if (a.aura[what] && a.aura.on.includes(famId)) k *= a.aura[what];
  }
  return k;
}

// EVERYTHING THIS TOWER HAS BOUGHT, whether or not it fires on a count.
//
// The two lists are different questions and the difference is Far Shot. The one
// above answers "what happens on shot number n", so it is filtered to abilities
// with an `every`; this one answers "what has this tower become", which is what
// its reach and its pictures are asking. Holy Light is in neither — it belongs to
// a MAN rather than to the tower, and units.js looks it up for itself.
const boughtAbilities = t =>
  (t.abilities && t.abilities.length) ? abilitiesOf(t.def).filter(a => owns(t, a.id)) : NONE;

// WHICH SPECIAL, IF ANY, SHOT NUMBER `n` IS.
//
// EVERY ABILITY KEEPS ITS OWN CYCLE. Burst Fire wants every sixth shot and Deadeye
// every eleventh, and they simply both run on the tower's one counter — so a Post
// that has bought both bursts on 6, 12, 18... and takes the long shot on 11, 22,
// 33..., and each ability is worth exactly what it is worth alone. An earlier
// version divided one shared cycle between them, which was written when both
// wanted the same number and became wrong the moment they did not.
//
// The two collide only where the cycles meet — shot 66, once every two and a half
// minutes of continuous firing — and there the RARER one wins, because the rarer
// one is the bigger event and losing it is the more noticeable of the two.
//
// It takes the shot number rather than reading `t.shots` so the same function can
// answer "what was this shot" and "what will the next one be", which is what the
// wind-up above needs.
function specialFor(t, n) {
  const due = firingAbilities(t).filter(a => n % a.every === 0);
  if (!due.length) return null;
  return due.reduce((rarest, a) => (a.every > rarest.every ? a : rarest));
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

  t.beat = (t.beat + 1) % framesOf(t.def, t).length;
  t.beatT = beatsOf(t.def, t)[t.beat];

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

  if (t.beat === FIRE) {
    // COUNTED HERE, so `shots` means "shots this tower has fired" on every tower
    // rather than only on the ones whose clock is a cooldown. It was counted here
    // a while before anything read it, against exactly this day: Heavy Bolt is
    // every third shot, and a machine counting from a frozen zero would have
    // fired an ordinary bolt forever with no error to find. It is also what
    // tools/sim.mjs reports as `fired`.
    t.shots = (t.shots || 0) + 1;

    // AND THE SPECIAL IS PICKED HERE RATHER THAN IN fire(), because this family
    // never goes through fire() — its clock is the animation. What it does NOT
    // need is the rest of what fire() does with a special: no lock (nothing on a
    // machine announces itself), no burst queue (no artillery ability fires more
    // than one), and no held pose (a machine has no man to change the drawing of,
    // and its next shot comes on the next cycle regardless). If one of those ever
    // arrives on a turret, this is where it goes.
    shoot(state, t, target, specialFor(t, t.shots));
  }
}

// `special` is the ability this shot belongs to, or nothing for an ordinary one.
// It may swap the AMMUNITION and the DAMAGE and nothing else — the muzzle, the
// aim, the lead and the noise all come out of the tower and the ammo exactly as
// they did before, which is why Deadeye needed no branch anywhere below.
function shoot(state, t, target, special) {
  const m = muzzlePoint(t);
  const ammo = (special && special.ammo) || t.def.ammo;

  // WHERE THE DRAWING STARTS, which is not always where the weapon is. A
  // projectile is anchored by its HEAD — that is the point that has to land on
  // the man — so a long one placed at the muzzle lies backward across whatever
  // fired it. `clear` pushes the head forward along the shot's own line by the
  // length of the drawing, which puts the TAIL at the muzzle instead. Only the
  // ballista's bolt carries one; an arrow is 20px long and has never needed it.
  //
  // Clamped to the RANGE so the head never starts past the man it is aimed at.
  // Not to a fraction of it: at anything under a couple of bolt-lengths that put
  // the head short and left the tail back inside the machine, which is the whole
  // thing this is here to avoid. At the clamp the bolt simply spans the gap —
  // tail at the mouth, head on the target — which is what a bolt fired at
  // somebody standing right there should look like.
  // FROM THE MUZZLE, not from the plot. `t.aim` is the angle the TOWER makes with
  // its target and it is what turns the machine; the shot leaves a mouth that is
  // a couple of dozen pixels off the tower's own centre, so the line it actually
  // travels is measured from there. On an archery tower the two are the same
  // angle to within nothing; on a turret they are a few degrees apart, which is
  // enough to leave the bolt's tail off the mouth it is supposed to sit on.
  const dx = target.x - m.x;
  const dy = target.y - m.y;
  const reach = Math.hypot(dx, dy) || 1;
  const ahead = Math.min(ammo.clear || 0, reach);

  const shot = {
    x: m.x + (dx / reach) * ahead,
    y: m.y + (dy / reach) * ahead,
    angle: Math.atan2(dy, dx),   // so the first frame already points at the target
    // Where it was shot FROM, kept because the projectile's own position at the
    // moment it lands is the target's. A corpse faces the blow, and this is the
    // only record of which side the blow was on.
    fromX: t.x,
    target,
    // WHAT IT HITS FOR. An ability may name an absolute — Deadeye's 300, Holy
    // Slash's 35 — or a MULTIPLIER of the tower's own damage, which is what Heavy
    // Bolt's "double" is. The multiplier is preferred where both exist, and it is
    // there so that "twice as hard" stays true after the next retune of the number
    // it is twice OF.
    // AND THE MAP'S OWN BUFF ON TOP, which is Holy Wrath. It multiplies whatever
    // this shot was going to do, ability included — a Deadeye ball under a Holy
    // Wrath is 330 rather than 300 — because the aura is a fact about the tower
    // firing rather than about which shot this is. Rounded, so a health bar never
    // has to show a fraction of a point.
    damage: Math.round(
      (special && special.times
        ? t.def.damage * special.times
        : (special && special.damage) || t.def.damage) * boost(state, 'damage', t.fam.id)
    ),
    // 0 or absent on everything but a catapult, and read by projectiles.js as
    // "hit only what you hit".
    splash: t.def.splash || 0,
    // Whether the mark over the target's head stays up while this is in the air.
    // Set from the ABILITY rather than from the ammunition, because the mark is
    // about the announcement — the wind-up above — and not about the ball. It ends
    // when the shot does: render.js draws it for every marked shot still in flight,
    // and a shot that lands is a shot off the list.
    marked: !!(special && special.lock),
    ammo,
    speed: ammo.speed
  };

  // `lob`, not `arc`. They were the same test until the Cannon Outpost, which is
  // thrown at the ground like a catapult's rock and flies flat like a musket
  // ball — see `cannonball` in data/towers.js. Asking about `arc` here would have
  // read a flat shot as a steered one and quietly handed it an 85px blast that
  // dies with its target.
  if (ammo.lob) aim(shot, m, target);
  state.shots.push(shot);

  // Category B: never skipped, never queued. Every arrow you can see leave a bow
  // makes its own noise, because ten towers firing is ten events the player is
  // watching and a shared channel would silence nine of them.
  //
  // The rock's noise is not here — it is in projectiles.js, on the landing. See
  // `fireSound` / `landSound` in data/towers.js.
  if (ammo.fireSound) play(FIRING[ammo.kind], ammo.fireGain);
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
