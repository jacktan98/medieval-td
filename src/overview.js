// THE CAMPAIGN MAP: the screen a player sees before they choose anything.
//
// It replaces the row of map buttons the title screen used to carry. The board
// behind it is not dimmed, it is COVERED — this is a screen of its own now
// rather than an overlay on a game that has not started, and the artwork it draws
// is the whole world rather than the one map about to be played.
//
// WHAT IT IS FOR, in the order it happens:
//
//   A player with no progress at all sees the road come in from off the left edge
//   of the world, draw itself to the first marker, and a flag plant there. Then
//   that marker is tappable and nothing else is.
//
//   Tapping a flagged marker opens the length, difficulty and Start panel over
//   the map — see drawStart in render.js, which owns that panel because it owns
//   the setting rows it is built from.
//
//   Winning a stage unlocks the next one, and the same road-then-flag animation
//   plays on the way back to this screen. That is the whole loop.
//
// WHERE THE GEOMETRY COMES FROM: data/overview.js, which is DERIVED from
// assets/map/Overview_Map.svg by tools/overview.mjs and committed. Nothing here
// measures the artwork; it reads the numbers that tool wrote.

import { art } from './assets.js';
import { STAGES, STAGE_COUNT, playable } from './data/overview.js';
import { levels } from './level.js';
import { bestStars, unlockedStages, saveUnlocked, MAX_STARS } from './score.js';
import { DIFFICULTIES } from './data/difficulty.js';
import { MODES } from './data/waves.js';
import { SQUASH } from './ground.js';

// --- how much of the road is open -------------------------------------------

// HOW FAR A PLAYER HAS GOT, and the answer for somebody who was playing this
// game before there was a road to be along.
//
// The progress key is new. Every player who already has this game on their phone
// has no value under it, and reading that as "has never played" would lock maps
// they cleared weeks ago behind stages they had just been told they cannot reach
// — the one bug in this feature that would look exactly like the feature working.
//
// So a missing key falls back to the star records, which have been kept since
// long before any of this. A star at ANY difficulty and ANY length means that
// stage was finished, and finishing a stage is the whole of what opens the next
// one. It stops at the first stage with nothing recorded, because the road opens
// in order and a player who somehow has stars on map 3 and none on map 2 has not
// walked past map 2.
//
// Seeded once and saved, so this runs on exactly one load per player.
function seedFromStars() {
  let open = 0;
  for (let i = 0; i < STAGE_COUNT; i++) {
    if (!playable(i)) break;
    const id = levels[STAGES[i].level].id;
    const cleared = DIFFICULTIES.some(d => MODES.some(m => bestStars(id, d.id, m.id) > 0));
    if (!cleared) break;
    open = i + 2;                       // this one is done, so the next is open
  }
  return Math.min(open, STAGE_COUNT);
}

// What the game should start with: the saved count, or one worked out from the
// stars for a player who predates the key. Zero means a genuinely new player, and
// zero is what makes the opening animation play.
export function openedStages() {
  const saved = unlockedStages();
  if (saved !== null) return saved;         // including a deliberate zero

  const seeded = seedFromStars();
  saveUnlocked(seeded);                     // written even at zero, so this runs once
  return seeded;
}

// --- the animation ----------------------------------------------------------

// How long the road takes to draw itself, and how long the flag takes to land.
// The road is the part worth watching, so it gets most of the time; the flag is
// punctuation. Together they are about a second and a quarter, which is long
// enough to read as an event and short enough that a player who has seen it four
// times is not waiting on it — and they can tap through it anyway.
const ROAD_SECONDS = 0.9;
const FLAG_SECONDS = 0.42;

// Slow into the destination rather than arriving at full speed. The road is
// walking towards somewhere, and something that stops dead has not arrived, it
// has been cut off.
const easeOut = t => 1 - (1 - t) * (1 - t) * (1 - t);

// The flag overshoots and settles. A pure ease would have it slide into place;
// this drops it, lets it go slightly past, and brings it back — which is what
// planting something looks like.
const plant = t => {
  const e = 1 - Math.pow(1 - t, 3);
  return e + Math.sin(t * Math.PI) * 0.16;
};

// Begin revealing the road into stage `i`. The caller has already counted the
// stage as unlocked — this governs how much of it is DRAWN, not whether it
// exists, which is what lets a tap skip straight to the end without losing the
// unlock.
export function startReveal(state, i) {
  state.reveal = { stage: i, t: 0, phase: 'road' };
}

export function stepReveal(state, dt) {
  const r = state.reveal;
  if (!r) return;
  r.t += dt / (r.phase === 'road' ? ROAD_SECONDS : FLAG_SECONDS);
  if (r.t < 1) return;
  if (r.phase === 'road') { r.phase = 'flag'; r.t = 0; return; }
  state.reveal = null;
}

// A tap during the animation finishes it rather than being swallowed. Returns
// whether there was anything to skip, so the caller knows the tap was spent.
export function skipReveal(state) {
  if (!state.reveal) return false;
  state.reveal = null;
  return true;
}

// --- what a tap can reach ---------------------------------------------------

// Comfortably bigger than the 13px medallion, because these are the smallest tap
// targets in the game and they sit on a busy drawing. 22 is a 44px circle, which
// is the floor the radial menu already holds itself to.
const NODE_HIT = 22;

// Which stage is under a tap, or null. Only stages that are unlocked AND have a
// map behind them answer — a marker the artist has drawn ahead of its level is
// visible, but it is not a button.
export function stageAt(state, x, y) {
  for (let i = 0; i < Math.min(state.unlocked ?? 0, STAGE_COUNT); i++) {
    if (!playable(i)) continue;
    const s = STAGES[i];
    if (Math.hypot(x - s.x, y - s.y) <= NODE_HIT) return i;
  }
  return null;
}

// Which stage plays a given level, or null if no marker claims it. Used when a
// game is won: the level that was played has to be turned back into a place on
// the road before the next one can be unlocked.
export const stageOfLevel = li => {
  const i = STAGES.findIndex(s => s.level === li);
  return i < 0 ? null : i;
};

// --- drawing ----------------------------------------------------------------

// THE MEDALLION IS AN ELLIPSE, not a disc, and it is the game's own SQUASH that
// flattens it — the same 0.62 every reach ring and every plot's dirt patch on
// every board is drawn with. A stage marker is a thing lying on the ground seen
// from the same angle as everything else, so it is foreshortened by the same
// amount. Picking a number by eye here would have made the world map the one
// surface in the game at a different tilt.
const NODE_R = 15;
const INK = '#2A1D0E';

// A blue banner, and blue because it has to be the one thing on a brown map that
// is not brown. The map is a parchment now: every fill in it went through a
// luminance ramp into browns, so a red flag would sit a shade away from the
// hills behind it. See sepia() in tools/overview.mjs.
const FLAG_CLOTH = '#3E6FA8';
const FLAG_SHADE = '#2E5583';

// A dot every 10px reads as a trail of steps rather than a line, which is the
// whole point: the road is already painted into the artwork, so what this marks
// is that you have BEEN there.
const DOT_GAP = 10;
const DOT_R = 2.5;

// Walk a polyline and call back at every DOT_GAP of arc length, up to `frac` of
// the total. Kept separate from the drawing because the flag needs the same walk
// to find where the road ends.
function alongLeg(leg, frac, fn) {
  let total = 0;
  for (let i = 1; i < leg.length; i++) total += Math.hypot(leg[i][0] - leg[i - 1][0], leg[i][1] - leg[i - 1][1]);
  const stop = total * frac;

  let walked = 0;
  let next = DOT_GAP;
  for (let i = 1; i < leg.length; i++) {
    const [x0, y0] = leg[i - 1], [x1, y1] = leg[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    if (seg === 0) continue;
    while (next <= walked + seg) {
      if (next > stop) return;
      const t = (next - walked) / seg;
      fn(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
      next += DOT_GAP;
    }
    walked += seg;
  }
}

function drawTrail(ctx, leg, frac) {
  ctx.save();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(42,29,14,0.65)';
  ctx.fillStyle = '#F6E7C1';
  alongLeg(leg, frac, (x, y) => {
    ctx.beginPath();
    ctx.arc(x, y, DOT_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

const disc = (ctx, x, y, r) => {
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * SQUASH, 0, 0, Math.PI * 2);
};

// A waypoint the player has not reached. The artist's red dot is a brown dot on
// the parchment now and would barely read, so it is drawn here instead — flat,
// unlit, and the same ellipse as everything else so the row of them looks like
// one kind of thing at two states rather than two kinds.
function drawUnreached(ctx, i) {
  const s = STAGES[i];
  ctx.save();
  disc(ctx, s.x, s.y, NODE_R * 0.62);
  ctx.fillStyle = 'rgba(59,41,23,0.55)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(59,41,23,0.75)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

// The medallion that replaces the artist's marker once a stage is reached.
function drawNode(ctx, i, hot) {
  const s = STAGES[i];
  const open = playable(i);

  ctx.save();

  // The shadow it casts on the ground, offset down rather than out: the light on
  // this map comes from above, and a flat thing lying in grass has its shadow
  // under its lower edge.
  disc(ctx, s.x, s.y + 2.4, NODE_R);
  ctx.fillStyle = 'rgba(43,30,16,0.34)';
  ctx.fill();

  disc(ctx, s.x, s.y, NODE_R);
  ctx.fillStyle = INK;
  ctx.fill();

  const g = ctx.createLinearGradient(0, s.y - NODE_R * SQUASH, 0, s.y + NODE_R * SQUASH);
  if (open) { g.addColorStop(0, '#F5DB95'); g.addColorStop(1, '#BE8C2A'); }
  else { g.addColorStop(0, '#9C958A'); g.addColorStop(1, '#6E685F'); }
  disc(ctx, s.x, s.y, NODE_R - 2.8);
  ctx.fillStyle = g;
  ctx.fill();

  if (hot) {
    disc(ctx, s.x, s.y, NODE_R + 2.6);
    ctx.strokeStyle = 'rgba(246,231,193,0.9)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  if (open) {
    ctx.fillStyle = INK;
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), s.x, s.y + 0.5);
  } else {
    // A padlock, small enough to read as texture at this size and specific
    // enough to read as "not yet" when you look at it.
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(s.x, s.y - 1.8, 2.8, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.fillRect(s.x - 3.9, s.y - 1.8, 7.8, 5.4);
  }
  ctx.restore();
}

// WHAT STANDS IN FRONT OF THE MARKER, PUT BACK ON TOP.
//
// The map is one flat picture, so a medallion drawn over it covers the tower
// beside it — which is backwards, because the tower's feet are lower on the
// screen and it is therefore nearer. tools/overview.mjs works out which shapes
// those are; this redraws them, each clipped to its own outline, so the artwork
// comes back over the medallion with nothing else coming with it.
//
// The clip is in ARTBOARD units, which is why the scale is applied first and the
// map is drawn at 1920x1080 underneath it: the path data is the artist's own,
// untouched, and re-scaling it here would round coordinates that have already
// been rounded once.
function drawFront(ctx, i) {
  const img = art.overview;
  const front = STAGES[i].front;
  if (!img || !front || !front.length) return;

  for (const d of front) {
    ctx.save();
    ctx.scale(0.5, 0.5);
    ctx.clip(new Path2D(d));
    ctx.drawImage(img, 0, 0, 1920, 1080);
    ctx.restore();
  }
}

// The stars a stage has been beaten with, over its marker. The BEST across every
// difficulty and every length, not the setting currently chosen — there is no
// setting chosen on this screen, and "what you have achieved here" is one answer
// rather than four. The panel that opens on a tap is where the four are told
// apart, because that is where they can be tapped between.
function starsAt(i) {
  const s = STAGES[i];
  if (s.level === null) return 0;
  const id = levels[s.level].id;
  let best = 0;
  for (const d of DIFFICULTIES) {
    for (const m of MODES) best = Math.max(best, bestStars(id, d.id, m.id));
  }
  return best;
}

const STAR_R = 4.6;
const STAR_GAP = 11;

function drawStars(ctx, cx, cy, filled) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.5;
  const left = cx - (MAX_STARS - 1) * STAR_GAP / 2;
  for (let i = 0; i < MAX_STARS; i++) {
    ctx.beginPath();
    for (let p = 0; p < 10; p++) {
      const a = -Math.PI / 2 + p * Math.PI / 5;
      const rr = p % 2 ? STAR_R * 0.45 : STAR_R;
      const x = left + i * STAR_GAP + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      p ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = i < filled ? '#F2C64B' : 'rgba(59,41,23,0.30)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(43,30,16,0.85)';
    ctx.stroke();
  }
  ctx.restore();
}

// THE FLAG, on the furthest stage reached. `t` is how planted it is: 0 while it
// is still falling, 1 once it has settled. `wave` is wall-clock seconds and only
// moves the cloth.
function drawFlag(ctx, x, y, t, wave) {
  const k = plant(t);
  const drop = (1 - k) * 20;          // falls in from above
  // The pole stands at the BACK of the ellipse rather than its centre, so the
  // medallion reads as ground the flag is planted in rather than a coin the flag
  // is balanced on.
  const foot = y - NODE_R * SQUASH - 1 + drop;
  const h = 27 * (0.55 + 0.45 * k);   // and grows into its full height

  ctx.save();
  ctx.globalAlpha = Math.min(1, t * 2.4);

  ctx.strokeStyle = '#3A2A12';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, foot);
  ctx.lineTo(x, foot - h);
  ctx.stroke();

  // The cloth, as a triangle whose free corner and waist ride a slow sine. Two
  // control points rather than one so it furls rather than merely tilting.
  const top = foot - h;
  const s1 = Math.sin(wave * 2.6) * 1.9;
  const s2 = Math.sin(wave * 2.6 + 1.1) * 2.6;
  ctx.beginPath();
  ctx.moveTo(x + 1, top + 1);
  ctx.quadraticCurveTo(x + 9 + s1, top + 3.5, x + 16 + s2, top + 7);
  ctx.quadraticCurveTo(x + 9 + s1, top + 10, x + 1, top + 13.5);
  ctx.closePath();
  ctx.fillStyle = FLAG_CLOTH;
  ctx.fill();
  ctx.strokeStyle = '#25190C';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // A fold along the underside, so the cloth has a near face and a far one
  // rather than reading as a flat triangle of colour.
  ctx.beginPath();
  ctx.moveTo(x + 1, top + 13.5);
  ctx.quadraticCurveTo(x + 9 + s1, top + 10, x + 16 + s2, top + 7);
  ctx.lineTo(x + 16 + s2, top + 7);
  ctx.quadraticCurveTo(x + 9 + s1, top + 12.5, x + 1, top + 13.5);
  ctx.closePath();
  ctx.fillStyle = FLAG_SHADE;
  ctx.fill();

  ctx.restore();
  return foot - h;                    // the top of the pole, for the stars
}

// The world, everything reached on it, and the flag on the furthest point. Draws
// nothing else: the panel that opens on a tap belongs to render.js.
export function drawOverview(ctx, state) {
  const img = art.overview;
  if (img) ctx.drawImage(img, 0, 0, 960, 540);
  else { ctx.fillStyle = '#3E7C94'; ctx.fillRect(0, 0, 960, 540); }

  const r = state.reveal;
  const unlocked = Math.min(state.unlocked ?? 0, STAGE_COUNT);

  // Every road walked so far, and the one being walked now at whatever fraction
  // the animation has reached.
  for (let i = 0; i < unlocked; i++) {
    const live = r && r.stage === i;
    drawTrail(ctx, STAGES[i].leg, live && r.phase === 'road' ? easeOut(r.t) : 1);
  }

  // Waypoints still ahead of the player, drawn before anything reached so a
  // medallion always wins where two sit close together.
  for (let i = unlocked; i < STAGE_COUNT; i++) drawUnreached(ctx, i);

  // The medallions. A stage still having its road drawn has not been arrived at
  // yet, so its marker stays as the artist painted it until the flag lands.
  //
  // EACH ONE IS FOLLOWED BY WHATEVER STANDS IN FRONT OF IT, put back on top of
  // the medallion — the depth rule the board itself uses, applied to a flat
  // picture. Done per stage rather than in a second pass over all of them,
  // because a shape in front of stage 3 is not in front of stage 6 and redrawing
  // it there would paint over a medallion it has nothing to do with.
  const frontier = unlocked - 1;
  for (let i = 0; i < unlocked; i++) {
    if (r && r.stage === i && r.phase === 'road') continue;
    drawNode(ctx, i, i === frontier && state.stage === null);
    drawFront(ctx, i);
  }

  // The flag sits on the furthest stage reached, which is the one the player is
  // being pointed at. It waves off wall-clock time so it is alive on a screen
  // where nothing else is moving.
  let flagTop = null;
  if (frontier >= 0 && !(r && r.stage === frontier && r.phase === 'road')) {
    const t = r && r.stage === frontier && r.phase === 'flag' ? r.t : 1;
    flagTop = drawFlag(ctx, STAGES[frontier].x, STAGES[frontier].y, t,
      performance.now() / 1000);
  }

  // AND THE STARS, LAST AND ABOVE EVERYTHING. A stage that has been beaten wears
  // what it was beaten with, over the flag where there is one and over the
  // medallion where there is not — so the row never lands on the cloth, and a
  // player looking down the road reads their record off it without tapping
  // anything.
  for (let i = 0; i < unlocked; i++) {
    if (r && r.stage === i && r.phase === 'road') continue;
    const stars = starsAt(i);
    if (!stars) continue;
    const top = i === frontier && flagTop !== null
      ? flagTop - 8
      : STAGES[i].y - NODE_R * SQUASH - 9;
    drawStars(ctx, STAGES[i].x, top, stars);
  }
}
