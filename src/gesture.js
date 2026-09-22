// HOW A FIGURE MOVES WHEN THE ROAD IS NOT MOVING IT.
//
// Two small things, both of them one number on a figure and one curve read off it
// at draw time. Nothing here changes what happens in the game: no damage, no
// reach, no depth, no hit box. A figure drawn through this file is at exactly the
// coordinates the rules put it at, with a few pixels of offset only the eye sees.
//
//   THE FLINCH. Before this, a paladin took 120 damage and the only thing that
//   changed on screen was a bar. Every blow in the game already recorded WHICH
//   SIDE it came from — `struckFrom`, set at all six places damage lands — and
//   the only thing reading it was the corpse, to decide which way to fall. So the
//   information was there for a living man to react to and nobody was asking.
//
//   THE SWING. `thrust` ran 1 to 0 at a constant rate, so a lunge went out and
//   came back at the same speed, which is the one thing weight never does.
//
// ONE CURVE FOR BOTH. A swing recovering and a man recovering from being hit are
// the same shape — hold, then settle — so `swingOut` below does both, and two
// figures trading blows move on one idea rather than two. The corpse throw in
// src/corpses.js deliberately keeps its own: see the note on `flinch`.
//
// A THIRD THING LIVED HERE AND WAS TAKEN OUT AT THE OWNER'S WORD: an idle breath,
// a 0.6px rise and fall on any figure standing still. It worked and it is gone,
// which is the whole note — a thing that measures correctly and is not wanted is
// still not wanted. Everything it needed went with it: the per-figure phase, the
// game clock this file kept, and `moving` on a soldier, which nothing else read.
// See the commit that removed it if it is ever asked for again.

// --- being hit -----------------------------------------------------------------

// HOW LONG A FLINCH LASTS. Short: this is a reaction to one blow, not a state a
// figure is in. At 0.12 it is seven frames at 1x and still four on the dashboard's
// 2x, which is the floor for anything that has to be seen rather than sensed.
//
// It was 0.25 first, matching the lunge, and that was wrong in a way worth writing
// down: a Militia Camp's three men hit a thug roughly every 0.4 seconds between
// them, so a quarter-second flash meant the thug was lit more often than not and
// the flash stopped meaning "just now" at all. A reaction has to end before the
// next one to be a reaction.
export const HIT_TIME = 0.12;

// HOW FAR IT SHOVES HIM, in game px, away from where the blow came from.
//
// 2.5, against the corpse's 10 and the lunge's 6, and the order matters more than
// the numbers: a man who flinches further than the man hitting him lunges reads as
// the one doing the pushing. A quarter of the knockback is a man taking a blow and
// keeping his feet, which is what is being drawn — he is still alive.
export const HIT_SHOVE = 2.5;

// AND HOW WHITE HE GOES AT THE INSTANT OF IT. Not to 1: a figure washed to solid
// white loses its outline, which on a drawing that is mostly outline reads as the
// sprite disappearing for two frames. At 0.55 the shape stays and the colour lifts.
export const HIT_FLASH = 0.55;


// A BLOW LANDED, AND FROM WHICH SIDE. One call at every place damage is dealt, so
// that the sign convention and the flinch can never disagree — they were two lines
// in six files before this, and the flinch would have been the seventh chance to
// write `>=` where `>` was meant.
//
// `fromX` is where the blow came FROM: the swinging man, the exploding bomb, the
// tower that fired. +1 means it came from the right, which is the direction the
// body will later fall away from. See KNOCKBACK in src/corpses.js.
export function struck(v, fromX) {
  v.struckFrom = fromX >= v.x ? 1 : -1;
  v.hit = 1;
}

// Counted down wherever the figure's own clocks are counted down, so a paused
// game does not hold a figure white.
export const tickHit = (v, dt) => { v.hit = Math.max(0, (v.hit || 0) - dt / HIT_TIME); };

// WHERE THE FLINCH PUTS HIM, in px along x. Away from the blow, hardest at the
// instant of it, and back on the same curve the swing recovers on.
//
// THE CORPSE'S CURVE WAS TRIED FIRST AND IT WAS THE WRONG ONE, which is worth
// writing down because it looked like the obvious reuse. src/corpses.js throws a
// body along an ease-out cubic — fast then slowing — and that is right for a body,
// because a corpse TRAVELS ten pixels and the eye follows the journey. A flinch
// does not travel anywhere: it is at full displacement on the first frame and the
// only visible part is the recovery. Measured through the ease-out, 87% of that
// recovery happened in the first 60 milliseconds, so a 2.5px shove was over in
// three frames and read as nothing at all.
//
// `swingOut` is the curve that holds and then settles, which is what a man rocked
// by a blow does, so the flinch and the swing recover on the same one. Two figures
// trading blows are then moving on one shared idea of what a gesture is.
export function flinch(v) {
  const h = v.hit || 0;
  if (h <= 0) return 0;
  return -(v.struckFrom || 1) * HIT_SHOVE * swingOut(h);
}

// --- the swing -----------------------------------------------------------------

// HOW FAR THROUGH ITS LUNGE A SWING IS, given the raw `thrust`.
//
// THE PROBLEM WAS NEVER THE DISTANCE. `thrust` is set to 1 on the blow and falls
// linearly, and the lunge was `thrust * lunge` — so the figure was at FULL
// extension on the first frame and walked back in a straight line. Out in one
// frame, back in fifteen, at a constant speed: the shape of a spring, not of a man.
//
// SMOOTHSTEP, AND THE ASYMMETRY IS THE POINT. Read against a `thrust` that is
// falling steadily, this holds the figure out near full extension at the start,
// brings him through the middle quickly, and sets him down gently at the end. That
// is follow-through and settle — he stays in the blow, then recovers.
//
// IT IS ONLY THE DISPLACEMENT. `thrust > 0` still decides which drawing is shown
// and still answers `striking`, so the pose, the sound and the damage are on
// exactly the clock they were on before. This file may not change when anything
// happens, only where a figure is drawn while it does.
//
// NAMED `swingOut` RATHER THAN `swing`, because three files already import a
// `swing` from src/status.js — the Rally Thug's damage boost — and two of them
// need both.
export const swingOut = thrust => thrust * thrust * (3 - 2 * thrust);

// --- the white copy ------------------------------------------------------------

// A FLASH IS THE SAME DRAWING IN WHITE, laid over the figure at the alpha the
// flinch is at. That needs a white copy of the sprite SHEET, not of the frame: a
// figure's pose is a rectangle out of a sheet, the trims are already worked out
// everywhere, and a silhouette of the whole sheet means the flash is drawn with
// the identical source rectangle as the figure — so it cannot be a pixel off,
// whatever pose is up and whoever is drawing it.
//
// BAKED ONCE PER SHEET AND KEPT, the same shape as src/tint.js: a Map keyed by the
// image, filled on first use, and thirty-odd small canvases for a whole session.
//
// AND IT READS NO PIXELS, which is the one way this differs from tint.js and the
// reason it needs none of that file's care about tainted canvases. `source-atop`
// paints white only where the sheet is already opaque, using the canvas's own
// compositor — nothing is ever read back, so a sheet from any origin works.
const white = new Map();

function silhouette(img) {
  if (white.has(img)) return white.get(img);

  // NOT UNTIL IT HAS LOADED, for the same reason tint.js waits: an Image still in
  // flight has no size, and baking one would cache an empty canvas for the rest of
  // the session. Nothing is stored, so the next frame asks again.
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return null;

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) return null;
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = '#fff';
  g.fillRect(0, 0, w, h);

  white.set(img, c);
  return c;
}

// DRAWN WITH THE CALLER'S OWN NUMBERS, and that is the whole interface: whatever
// drawImage the figure was just drawn with, said again against the white copy at
// the flash's alpha. The caller is already inside its own translate and scale, so
// a mirrored figure's flash is mirrored and a lunging one's flash lunges.
//
// Silently does nothing if the sheet is not ready or the figure is not lit, which
// is the right failure for something purely cosmetic.
export function flash(ctx, img, v, sx, sy, sw, sh, dx, dy, dw, dh) {
  const h = v.hit || 0;
  if (h <= 0 || !img) return;
  const lit = silhouette(img);
  if (!lit) return;

  ctx.save();
  ctx.globalAlpha = h * HIT_FLASH;
  ctx.drawImage(lit, sx, sy, sw, sh, dx, dy, dw, dh);
  ctx.restore();
}
