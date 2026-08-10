// The shape of a reach on the ground.
//
// The board is painted in perspective: the road, the dirt patches and every
// cast shadow are drawn as if the ground plane recedes. A patch of ground that
// is round in the world is therefore drawn as an ellipse, flattened vertically.
//
// Tower range and barracks rally reach are patches of ground, so they are
// ellipses — both when drawn AND when measured. That second half is the whole
// point of this file. It used to hold only the drawing: the rings were squashed
// to 62% while pickTarget and the rally clamp used plain round distance, so at
// tier 1 the ring stopped 93px above the tower and the archers shot to 150. An
// enemy standing in that 57px band had its head inside the ring and its shadow
// outside, which is indistinguishable from the tower aiming at heads, and it was
// reported as exactly that bug.
//
// The fix that time was to draw the circle the rule was. This is the other fix,
// and it is the one that keeps the perspective: the rule is now the ellipse the
// picture was. Either is honest. What is not allowed is one of each, so the test
// and the drawing live in this file together and every caller goes through them.
//
// Everything else in the game is still flat screen pixels — path lengths, unit
// speeds, collision radii, melee reach. Those are distances between two things
// standing on the ground, not areas of it, and they read fine unforeshortened.

// How much of a reach's height survives the perspective. Matched by eye to the
// dirt ellipses under the plot markers, which is what the ring sits next to.
//
// Changing it is a balance change, not a look: at 0.62 a tower's covered area is
// 62% of the circle of the same range. See assets/map/README.md.
export const SQUASH = 0.62;

// Is (x, y) inside the reach of radius `r` centred on (cx, cy)?
//
// The radius is the reach ACROSS — sideways along the road, where nearly all of
// the interesting ground is. Vertically the reach is r * SQUASH.
export function inRange(cx, cy, x, y, r) {
  const dx = (x - cx) / r;
  const dy = (y - cy) / (r * SQUASH);
  return dx * dx + dy * dy <= 1;
}

// The same point pulled back onto the boundary if it is outside, along the ray
// from the centre. Used wherever the player aims at something out of reach —
// the rally drag and its ghost flag — so the thing they get is the nearest point
// on the line they can see.
export function clampToRange(cx, cy, x, y, r) {
  const dx = (x - cx) / r;
  const dy = (y - cy) / (r * SQUASH);
  const d = Math.hypot(dx, dy);
  if (d <= 1) return { x, y };
  return { x: cx + (x - cx) / d, y: cy + (y - cy) / d };
}

// The outline, as a canvas path. `lift` shifts it down for the shadowed rim
// drawn under the lit one.
//
// Nothing outside this file may draw a reach with ctx.arc. That is not style:
// a round ring around an elliptical rule is the bug above, drawn again.
export function ringPath(ctx, cx, cy, r, lift = 0) {
  ctx.beginPath();
  ctx.ellipse(cx, cy + lift, r, r * SQUASH, 0, 0, Math.PI * 2);
}
