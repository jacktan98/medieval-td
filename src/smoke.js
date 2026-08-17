// The puff of dust a plot throws up when something is built, upgraded or taken
// down. A second and a half over the top of the building: half of it holding
// solid, then a full second thinning out.
//
// WHAT IT IS FOR, and it is not decoration. All three of those actions used to
// happen between one frame and the next: a tent appears, or becomes a hut, or
// vanishes, with nothing in between. On a board where everything else moves —
// men walk, arrows fly, corpses settle — an instant swap reads as a glitch
// rather than as a thing you did. The smoke is the moment.
//
// It also HIDES THE SWAP, which is the part that earns its keep on an upgrade.
// A Militia Camp and a Guard Post are different drawings on the same plot, and
// cutting from one to the other is the least convincing frame in the game. A
// cloud over it for half a second and the two never share the screen.
//
// A SEPARATE LIST FROM THE OTHER EFFECTS, and deliberately, even though blood,
// impacts and this are all "a picture that fades". They differ in the three
// things that matter: blood is anchored to a wound and drawn at BLOOD_SCALE,
// a rock's earth lies flat on the ground where it landed, and this is sized to
// the BUILDING it covers and centred on it. One list with a `kind` on each entry
// would be three sets of rules behind one name.

// How long it hangs about, in seconds, in two parts. The artist's numbers.
//
// TWO PARTS RATHER THAN ONE because they do different jobs. The HOLD is the
// cover: for its whole length the cloud is solid and the plot underneath is
// simply not visible, which is what lets a tent become a hut without the two
// ever sharing a frame. The FADE is the exit, and it is long on purpose — a
// cloud that vanished between two frames would need the same excuse the instant
// tower swap needed, which is the thing this was added to cover.
//
// Half a second of cover and a full second of leaving. The short hold is
// deliberate: it is about as long as the fastest tower's reload, so a tower
// bought in front of a live wave is not firing blind out of solid dust — and
// the long fade carries the moment past it, since a cloud that has started to
// thin is something to watch through rather than something in the way.
export const SMOKE_HOLD = 0.5;
export const SMOKE_FADE = 1;
export const SMOKE_LIFE = SMOKE_HOLD + SMOKE_FADE;

// Measured by `node tools/trim.mjs`, on the 1024 canvas the buildings use.
export const SMOKE_TRIM = [242, 254, 540, 516];

// How much bigger than the building the cloud is drawn, on its longest side.
//
// It has to COVER, which is the whole point, so the fit is against whichever of
// the box's two dimensions needs the most and then a margin on top. 1.06 puts a
// few pixels of dust past every edge of every building in the game — the widest
// is the tier 2 barracks at 128 and the tallest are the monastery's upper tiers
// at 158 — without the cloud becoming the thing you notice.
const COVER = 1.06;

// How far BELOW the plot the cloud's bottom edge sits.
//
// Smoke rises from the ground, so it is anchored at the foot rather than centred
// on the box: the cloud's densest part is drawn low and its wisps high, and
// hanging it from the bottom puts the billow where the digging is. 8px of it
// spills past the plot onto the grass in front, which is what stops a tall
// building looking like it is wearing a hat.
const FOOT = 8;

// Raise one over a building. Takes the BOX rather than the tower, because a
// refund puffs at a tower that is about to stop existing — holding a reference
// to it would keep a sold building alive inside an effect for half a second, and
// the renderer would have every right to draw it.
export function puff(state, x, y, box) {
  if (!state.smoke) return;

  const k = Math.max(box.w / SMOKE_TRIM[2], box.h / SMOKE_TRIM[3]) * COVER;

  state.smoke.push({
    x,
    // The GROUND line, not the middle. See FOOT.
    y: y + FOOT,
    w: SMOKE_TRIM[2] * k,
    h: SMOKE_TRIM[3] * k,
    life: SMOKE_LIFE
  });
}

export function updateSmoke(state, dt) {
  if (!state.smoke || !state.smoke.length) return;
  for (const s of state.smoke) s.life -= dt;
  state.smoke = state.smoke.filter(s => s.life > 0);
}
