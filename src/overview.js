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
import { STAGES, STAGE_COUNT, playable, FRONT } from './data/overview.js';
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
// punctuation.
//
// SLOW, because it is the only thing on this screen that happens and it is the
// reward for a run. The first pass was 0.9s and 0.42s, which is the pace of a UI
// transition — something to be got through. A road being walked should take long
// enough to watch, and a flag going into the ground should land rather than
// appear. A tap still skips both, so the cost to somebody who has seen it is one
// touch.
const ROAD_SECONDS = 2.6;
const FLAG_SECONDS = 1.1;

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

// WHAT STANDS IN FRONT OF THE ROAD, PUT BACK ON TOP.
//
// The map is one flat picture, so everything the game draws on it lands over
// scenery it may well be behind — a medallion beside a tower, a trail dot crossing
// a mountain. tools/overview.mjs works out which shapes those are; this redraws
// them, each clipped to its own outline, so the artwork comes back on top with
// nothing else coming with it.
//
// ONE LIST, DRAWN ONCE, and late. It used to be per stage and drawn with each
// medallion, which covered the medallions correctly and left the trail alone —
// dots ran in front of hills they were plainly behind. A stretch of road between
// two stages belongs to neither of them, so the question stopped being "what is in
// front of stage 6" and became "what is in front of the road".
//
// AND IT IS BUILT ONCE, WHOLE, AND MASKED — never clipped and composited shape by
// shape. That was the first way round and it drew a hairline down the middle of
// every outline it touched: the temple's walls came back as thin double strokes,
// as though the artist had traced them twice.
//
// The cause is partial alpha at a clip edge. The map underneath is already the
// artwork multiplied by the parchment, and redrawing it inside a clip is meant to
// land on identical pixels and be invisible. It does, right up to the boundary,
// where the clip's antialiasing blends at some fraction a: the image is laid down
// as a*art + (1-a)*(art x paper), and the paper is then multiplied over THAT. Two
// operations at fractional coverage do not compose back to art x paper, so the
// edge pixel lands somewhere else — a pale line exactly one pixel wide, following
// the shape, which is the outline the stroke is centred on.
//
// So the two steps happen at full opacity on their own canvas, off screen, where
// every pixel is whole. Only when the result is finished is it cut to shape and
// laid down in one drawImage. A mask edge blends a finished pixel over the
// identical finished pixel beneath it, which cannot show. Redrawing thirty shapes
// once at load rather than every frame is the smaller reason to do it this way.
//
// The paths are in ARTBOARD units, which is why the scale is applied before them
// and the map is drawn at 1920x1080: the data is the artist's own, untouched, and
// re-scaling it here would round coordinates already rounded once.
let frontLayer = null, frontFrom = null;

function makeFront(img) {
  const c = document.createElement('canvas');
  c.width = 960;
  c.height = 540;
  const g = c.getContext('2d');

  // The map as the player already sees it: the artwork with the sheet over it.
  g.drawImage(img, 0, 0, 960, 540);
  g.globalCompositeOperation = 'multiply';
  g.drawImage(parchment || makeParchment(), 0, 0);

  // The mask, accumulated as solid fills on a canvas of its own rather than as one
  // Path2D. A union of paths taken as a single path is subject to the winding rule,
  // and a shape wound against its neighbour would punch a hole in it.
  const m = document.createElement('canvas');
  m.width = 960;
  m.height = 540;
  const mg = m.getContext('2d');
  mg.fillStyle = '#000';
  mg.scale(0.5, 0.5);
  for (const d of FRONT) mg.fill(new Path2D(d));

  g.globalCompositeOperation = 'destination-in';
  g.drawImage(m, 0, 0);
  return c;
}

function drawFront(ctx) {
  const img = art.overview;
  if (!img || !FRONT.length) return;
  if (frontFrom !== img) { frontLayer = makeFront(img); frontFrom = img; }
  ctx.drawImage(frontLayer, 0, 0);
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
  //
  const frontier = unlocked - 1;
  for (let i = 0; i < unlocked; i++) {
    if (r && r.stage === i && r.phase === 'road') continue;
    drawNode(ctx, i, i === frontier && state.stage === null);
  }

  // AND THE SCENERY BACK OVER BOTH, after the trail and the medallions rather than
  // between them. This is the whole depth pass in one call now.
  drawFront(ctx);

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
