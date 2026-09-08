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

// HOW FAST THE MARCH GOES, rather than how long it takes. This was one number —
// 2.6 seconds a leg, whatever the leg — and a leg is anywhere from 50 to 333
// canvas px, so the army crossed the short hop into stage 6 at 19px a second and
// the long run out to stage 8 at 128. Nearly SEVEN TIMES the pace, on the same
// road, on the same screen. Nothing about it read as one army walking; the long
// legs in particular looked hurried, which is the opposite of what the distance
// should say.
//
// So the road is walked at a fixed speed and the far stages simply take longer to
// reach, which is what distance means. A tap still skips it, so the cost of a long
// march to somebody who has seen it is one touch.
//
// Sixty is deliberately near the SLOW end of what the fixed duration used to
// produce rather than at its average: the complaint was about rushing, and the
// legs that were being rushed were the long ones. It puts the longest march on
// this map at 5.6 seconds and the shortest at the floor below.
const ROAD_SPEED = 60;

// And a floor, because a 50px hop at any honest speed is over before it reads as
// travel. Short legs are paced by this rather than by the speed, which is the one
// place the two rules disagree and the right way round: a march you cannot see is
// worse than a march very slightly quicker than its neighbour.
const ROAD_MIN_SECONDS = 0.8;

const FLAG_SECONDS = 1.1;

// How long the road into a given stage should take: its own length at the march
// speed, never under the floor.
function roadSeconds(i) {
  const leg = STAGES[i] ? STAGES[i].leg : null;
  if (!leg || leg.length < 2) return ROAD_MIN_SECONDS;
  let d = 0;
  for (let k = 1; k < leg.length; k++) d += Math.hypot(leg[k][0] - leg[k - 1][0], leg[k][1] - leg[k - 1][1]);
  return Math.max(ROAD_MIN_SECONDS, d / ROAD_SPEED);
}

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
  state.reveal = { stage: i, t: 0, phase: 'road', seconds: roadSeconds(i) };
}

export function stepReveal(state, dt) {
  const r = state.reveal;
  if (!r) return;
  r.t += dt / (r.phase === 'road' ? (r.seconds || ROAD_MIN_SECONDS) : FLAG_SECONDS);
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

// Which stage is under a tap, or null.
//
// EVERY STAGE THE ROAD HAS REACHED ANSWERS, including the ones with no map behind
// them. It used to refuse those, which meant a marker you could see, with a flag
// planted on it, that did nothing when tapped — and nothing on screen to say why.
// The panel says why now, and its Start button is drawn locked. The refusal moved
// from the marker to the button, which is where a player can read it.
export function stageAt(state, x, y) {
  for (let i = 0; i < Math.min(state.unlocked ?? 0, STAGE_COUNT); i++) {
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

// NOTHING IS DRAWN FOR A STAGE THE PLAYER HAS NOT REACHED. The artist's red dots
// are gone from the display map — see the note in tools/overview.mjs about why the
// guide shapes are dropped — and nothing replaces them, deliberately: a waypoint
// visible before it is reached tells a player how many stages are left and where
// the road goes, which is the whole thing the reveal is for.
//
// The medallion that appears once a stage IS reached.
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
    // NO NUMBER. It used to carry one and it is better without: a player reads
    // this map by where the flag is and how far the dots reach, not by counting.
    // The numeral was also the only thing on the map at UI scale rather than map
    // scale, and it fought the drawing for it — 13px of sans-serif on a
    // parchment. The panel still says which stage this is, on the screen where
    // that is a thing worth knowing.
    //
    // What replaces it is a highlight across the top of the dome, so the disc
    // still reads as a raised object rather than a hole.
    const lit = ctx.createLinearGradient(0, s.y - NODE_R * SQUASH, 0, s.y + NODE_R * SQUASH * 0.4);
    lit.addColorStop(0, 'rgba(255,246,214,0.62)');
    lit.addColorStop(1, 'rgba(255,246,214,0)');
    disc(ctx, s.x, s.y - NODE_R * SQUASH * 0.16, NODE_R - 4.6);
    ctx.fillStyle = lit;
    ctx.fill();
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

// THE DEPTH PASS IS GONE, and this is where it was.
//
// The map is one flat picture, so everything the game draws on it landed over
// scenery it might be behind — a medallion beside a tower, a trail dot crossing a
// mountain. tools/overview.mjs worked out which shapes those were and this redrew
// them, masked to their own outlines, over the trail and the medallions.
//
// The owner asked for the dots on top of everything and moved the buildings clear
// of the medallions in the drawing itself, which is the same answer reached with a
// pen. There are no cases left, so the pass is deleted rather than left switched
// off: the trail and the medallions now simply go on last, in the order they are
// drawn below, and that is the whole of it.

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

// --- making it look like a map rather than a drawing -------------------------
//
// THE FLAT FILLS ARE THE PROBLEM. The artwork is clean vector shapes in even
// colours, which is what makes it read as a diagram: real maps are drawn on
// something, and the something shows. Three passes over the top fix most of it
// without touching a single shape the artist drew.
//
//   THE PAPER    a fixed grain multiplied over everything, so no fill is
//                perfectly even any more
//   THE AGE      a handful of soft blotches, darker in some places than others,
//                the way a sheet that has been folded and carried is
//   THE EDGES    a vignette, because the middle of a map is the part that has
//                been looked at and the edges are the part that has been handled
//
// All three are drawn ONCE into an offscreen canvas and blitted, because the
// grain is per-pixel work and this screen redraws every frame.

let parchment = null;

function makeParchment() {
  const c = document.createElement('canvas');
  c.width = 960; c.height = 540;
  const g = c.getContext('2d');

  // Deterministic noise: the same sheet of paper every time the game is opened,
  // rather than a surface that crawls between reloads.
  let seed = 0x9E3779B9;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  const grain = g.createImageData(960, 540);
  const px = grain.data;
  for (let i = 0; i < px.length; i += 4) {
    const v = 214 + (rnd() - 0.5) * 62;
    px[i] = px[i + 1] = px[i + 2] = v;
    px[i + 3] = 255;
  }
  g.putImageData(grain, 0, 0);

  // Stains. Big, soft, and few — a dozen reads as age, fifty reads as dirt.
  g.globalCompositeOperation = 'multiply';
  for (let i = 0; i < 14; i++) {
    const x = rnd() * 960, y = rnd() * 540, r = 60 + rnd() * 150;
    const blot = g.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.05 + rnd() * 0.07;
    blot.addColorStop(0, `rgba(150,120,80,${a})`);
    blot.addColorStop(1, 'rgba(150,120,80,0)');
    g.fillStyle = blot;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // The vignette, elliptical rather than round so it follows the shape of the
  // sheet instead of putting a circle on a landscape page.
  const vig = g.createRadialGradient(480, 270, 120, 480, 270, 620);
  vig.addColorStop(0, 'rgba(120,92,58,0)');
  vig.addColorStop(0.62, 'rgba(120,92,58,0.10)');
  vig.addColorStop(1, 'rgba(92,66,36,0.46)');
  g.fillStyle = vig;
  g.fillRect(0, 0, 960, 540);

  parchment = c;
  return c;
}

// The world, everything reached on it, and the flag on the furthest point. Draws
// nothing else: the panel that opens on a tap belongs to render.js.
// --- the world beyond the road ----------------------------------------------

// WHAT HAS NOT BEEN REACHED IS BROWN, and the country fades out the further from
// the road it lies. The map is finished before the campaign is: every mountain,
// every bridge and every name is drawn from the first load, so a player standing
// on stage 1 can already see the corner they will arrive at ten stages later. That
// is a lot of world handed over at once, and none of it is a reason to keep
// playing.
//
// So the drawing is in COLOUR only where the army has been. Everything the road
// has opened looks as it was painted; the country around it drains to a flat brown
// and dims, and every stage cleared pulls more of the map back into colour.
//
// IT IS A DRAIN RATHER THAN A VEIL, and that is the second attempt. The first was
// a dark wash over the unreached country, which worked and was too heavy — and
// halving its strength, which is what was asked for, halved the only signal it
// had. Darkness carried the whole distinction, so less darkness meant less
// distinction, and at half strength the lit pocket around stage 1 could not be
// picked out of the world at all.
//
// Colour carries it instead. The unreached country keeps most of its brightness
// and loses its greens and greys, so the difference is what KIND of picture it is
// rather than how much light is on it — and the brightness is then free to be
// whatever reads best rather than being the thing doing the work.
const FOG_BRIGHT = 0.62;   // how much light the drained country keeps
const FOG_WASH = 'rgba(38,25,12,0.16)';   // and a breath of brown over that

// How far the light reaches from the road, and how soft its edge is. The reach is
// half again what it started at: arriving somewhere should show the player the
// country they have arrived in rather than a circle of it.
//
// The BLUR is not scaled with it. Widening both together is the obvious reading of
// "more range" and it washes the effect out — reach is how much you can see, blur
// is how quickly it stops, and only the first was asked for.
const LIT_REACH = 69;
const LIT_BLUR = 58;

let fogSheet = null, fogKey = '';

// The lit area is drawn as one thick round-capped stroke along every road the
// player has walked, plus a disc at every marker they have reached, and then
// blurred. Stroking a polyline is one operation for a whole leg where a radial
// gradient per point would be forty, and the blur does the falloff for nothing.
function makeFog(unlocked, live, frac) {
  // One canvas, redrawn. A march rebuilds this thirty times and a fresh canvas
  // each time is thirty two-megabyte allocations to hand straight back.
  const c = fogSheet || (fogSheet = document.createElement('canvas'));
  c.width = 960;
  c.height = 540;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 960, 540);

  // THE SAME PICTURE, DRAINED. The map, the paper and the names in the order
  // drawOverview lays them down, so that what is punched out of this lines up
  // exactly with what is underneath it — then the whole stack put through one
  // filter. Rebuilt from the source images rather than copied off the screen,
  // because the canvas the game draws to may carry a transform this knows nothing
  // about, and reading pixels back through the wrong one is a bug that only shows
  // on somebody else's display.
  let drained = false;
  try {
    g.filter = `grayscale(1) sepia(0.62) brightness(${FOG_BRIGHT})`;
    drained = g.filter !== 'none';
  } catch { /* no filter support */ }

  if (art.overview) g.drawImage(art.overview, 0, 0, 960, 540);
  else { g.fillStyle = '#C9A878'; g.fillRect(0, 0, 960, 540); }
  g.filter = 'none';

  g.globalCompositeOperation = 'multiply';
  g.drawImage(parchment || makeParchment(), 0, 0);
  g.globalCompositeOperation = 'source-over';

  if (art.overviewNames) {
    // The names go through the same drain. A region nobody has reached should not
    // be announcing itself in white.
    try { g.filter = `grayscale(1) sepia(0.62) brightness(${FOG_BRIGHT})`; } catch { /* */ }
    g.drawImage(art.overviewNames, 0, 0, 960, 540);
    g.filter = 'none';
  }

  // Where filters are not available there is nothing to drain the colour, so the
  // old dark wash stands in: heavier than this, and the only thing that works.
  g.fillStyle = drained ? FOG_WASH : 'rgba(26,17,8,0.55)';
  g.fillRect(0, 0, 960, 540);

  g.globalCompositeOperation = 'destination-out';
  // A blur filter is what makes the edge a falloff rather than a cut. Where it is
  // not supported the light still lands, with a harder rim — the map stays
  // playable and nothing throws.
  try { g.filter = `blur(${LIT_BLUR}px)`; } catch { /* hard edge, still lit */ }
  g.lineWidth = LIT_REACH * 2;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = '#000';
  g.fillStyle = '#000';

  for (let i = 0; i < unlocked; i++) {
    const leg = STAGES[i].leg;
    // The leg being walked is lit only as far as it has been walked, so the light
    // travels with the army rather than arriving before it.
    const upto = i === live ? frac : 1;
    if (upto <= 0) continue;

    let total = 0;
    for (let k = 1; k < leg.length; k++) total += Math.hypot(leg[k][0] - leg[k - 1][0], leg[k][1] - leg[k - 1][1]);
    const stop = total * upto;

    g.beginPath();
    g.moveTo(leg[0][0], leg[0][1]);
    let walked = 0;
    for (let k = 1; k < leg.length; k++) {
      const seg = Math.hypot(leg[k][0] - leg[k - 1][0], leg[k][1] - leg[k - 1][1]);
      if (walked + seg >= stop) {
        const t = seg ? (stop - walked) / seg : 0;
        g.lineTo(leg[k - 1][0] + (leg[k][0] - leg[k - 1][0]) * t,
                 leg[k - 1][1] + (leg[k][1] - leg[k - 1][1]) * t);
        break;
      }
      g.lineTo(leg[k][0], leg[k][1]);
      walked += seg;
    }
    g.stroke();

    // A wider pool at a marker the player has actually arrived at: a stage is a
    // place rather than a point on a line, and its surroundings are what the
    // player is choosing from.
    if (upto >= 1) {
      g.beginPath();
      g.arc(STAGES[i].x, STAGES[i].y, LIT_REACH * 1.5, 0, Math.PI * 2);
      g.fill();
    }
  }

  return c;
}

// Rebuilt only when what is lit has actually changed. During a march that is
// thirty times across the whole leg, which is under the eye's threshold for a
// blur this soft and a great deal cheaper than doing it every frame.
function fogFor(unlocked, live, frac) {
  const key = `${unlocked}:${live}:${Math.round(frac * 30)}`;
  if (key !== fogKey) { makeFog(unlocked, live, frac); fogKey = key; }
  return fogSheet;
}

export function drawOverview(ctx, state) {
  const img = art.overview;
  if (img) ctx.drawImage(img, 0, 0, 960, 540);
  else { ctx.fillStyle = '#C9A878'; ctx.fillRect(0, 0, 960, 540); }

  // Over the artwork and UNDER everything the game draws on it: the medallions,
  // the flag and the stars belong to the interface, not to the sheet, and a
  // stain across a stage number would be a bug rather than atmosphere.
  const sheet = parchment || makeParchment();
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(sheet, 0, 0);
  ctx.restore();

  // THE REGION NAMES, OVER THE SHEET RATHER THAN UNDER IT. They are a second image
  // for exactly this reason: the sheet is a multiply, so a name inside the map
  // picks up whatever grain, stain and vignette happen to fall on it, and one of
  // them sat in the darkest corner of the map looking like a different colour from
  // the rest. The owner asked for them exactly as drawn, and after the multiply is
  // the only place that can be true.
  if (art.overviewNames) ctx.drawImage(art.overviewNames, 0, 0, 960, 540);

  const r = state.reveal;
  const unlocked = Math.min(state.unlocked ?? 0, STAGE_COUNT);

  // AND THE DARK OVER THE PARTS OF THE WORLD NOBODY HAS WALKED TO. Over the whole
  // drawing including the names — a region nobody has reached should not be
  // announcing itself — and under everything the game draws, because the trail, the
  // medallions and the flag are the interface and are never in shadow.
  const live = r && r.phase === 'road' ? r.stage : -1;
  ctx.drawImage(fogFor(unlocked, live, live >= 0 ? r.t : 1), 0, 0);

  // AND THE TRAIL OVER ALL OF IT. The dots are the last thing from the artwork
  // side to go down and nothing in the drawing is put back on top of them: the
  // road is on top of the world it crosses, which is what the owner asked for and
  // what the drawing is now made to suit.
  //
  // Every road walked so far, and the one being walked now at whatever fraction
  // the animation has reached.
  for (let i = 0; i < unlocked; i++) {
    const live = r && r.stage === i;
    // LINEAR, and that is the point. The reveal used to ease out into the marker,
    // which is a lovely thing for a UI panel to do and the wrong thing for an army:
    // it means the last third of every road is walked slower than the first. The
    // fraction here is fraction of ARC LENGTH, so a straight t is a straight pace.
    // The arrival still has its beat — the flag drops, overshoots and settles.
    drawTrail(ctx, STAGES[i].leg, live && r.phase === 'road' ? r.t : 1);
  }

  // The medallions. A stage still having its road drawn has not been arrived at
  // yet, so its marker stays as the artist painted it until the flag lands.
  //
  const frontier = unlocked - 1;
  for (let i = 0; i < unlocked; i++) {
    if (r && r.stage === i && r.phase === 'road') continue;
    drawNode(ctx, i, i === frontier && state.stage === null);
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
