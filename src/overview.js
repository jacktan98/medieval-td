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

const NODE_R = 13;
const INK = '#2A1D0E';

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

// The medallion that replaces the artist's red marker once a stage is reached.
// A marker the player has not got to yet is left alone: the red dot painted into
// the map IS the drawing for an unvisited waypoint, so nothing is drawn over it.
function drawNode(ctx, i, hot) {
  const s = STAGES[i];
  const open = playable(i);

  ctx.save();
  ctx.beginPath();
  ctx.arc(s.x, s.y, NODE_R, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();

  const g = ctx.createLinearGradient(0, s.y - NODE_R, 0, s.y + NODE_R);
  if (open) { g.addColorStop(0, '#F5DB95'); g.addColorStop(1, '#BE8C2A'); }
  else { g.addColorStop(0, '#9C958A'); g.addColorStop(1, '#6E685F'); }
  ctx.beginPath();
  ctx.arc(s.x, s.y, NODE_R - 2.6, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  if (hot) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, NODE_R + 2.4, 0, Math.PI * 2);
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
    ctx.arc(s.x, s.y - 1.4, 3.1, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.fillRect(s.x - 4.2, s.y - 1.4, 8.4, 6.2);
  }
  ctx.restore();
}

// THE FLAG, on the furthest stage reached. `t` is how planted it is: 0 while it
// is still falling, 1 once it has settled. `wave` is wall-clock seconds and only
// moves the cloth.
function drawFlag(ctx, x, y, t, wave) {
  const k = plant(t);
  const drop = (1 - k) * 20;          // falls in from above
  const foot = y - NODE_R - 1 + drop;
  const h = 25 * (0.55 + 0.45 * k);   // and grows into its full height

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
  ctx.fillStyle = '#C4453A';
  ctx.fill();
  ctx.strokeStyle = '#3A2A12';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.restore();
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

  // The medallions. A stage still having its road drawn has not been arrived at
  // yet, so its marker stays as the artist painted it until the flag lands.
  for (let i = 0; i < unlocked; i++) {
    if (r && r.stage === i && r.phase === 'road') continue;
    drawNode(ctx, i, i === unlocked - 1 && state.stage === null);
  }

  // The flag sits on the furthest stage reached, which is the one the player is
  // being pointed at. It waves off wall-clock time so it is alive on a screen
  // where nothing else is moving.
  const front = unlocked - 1;
  if (front >= 0 && !(r && r.stage === front && r.phase === 'road')) {
    const t = r && r.stage === front && r.phase === 'flag' ? r.t : 1;
    drawFlag(ctx, STAGES[front].x, STAGES[front].y, t, performance.now() / 1000);
  }
}
