// The puff of dust a plot throws up when something is built, upgraded or taken
// down. Three quarters of a second over the top of the building, thinning the
// whole way.
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

// How long it hangs about, in seconds. The artist's number.
//
// ONE NUMBER, and no hold in front of it: the cloud starts solid and is thinning
// from the first frame, all the way out. It went through a version with a
// separate hold and fade, and the hold was the wrong tool — it bought opacity at
// the moment the tower underneath was least worth hiding, since the swap it
// covers has already happened by the time the second frame is drawn. Fading from
// full does that job on frame one and then gets progressively out of the way.
//
// Three quarters of a second, down from one. Long enough to read as an event and
// to cover the swap it exists to cover — that happens on the first frame — and
// short enough that a player buying six towers during a rest is never waiting for
// the board to clear. The artist watched a full second of it and asked for less.
export const SMOKE_LIFE = 0.75;

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
