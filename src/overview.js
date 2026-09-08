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
// The rally point's flag and the numbers that place it — the same picture and the
// same anchor the board plants, so the map's flag and the board's are one flag.
import { ui, uiSize, FLAG_FOOT } from './data/ui.js';
// AMBIENT MOTION, and the only line that ties it to this file. See src/motion.js
// for what it does and how to switch it off or take it out.
import { drawMotion, drawWater, drawPulse } from './motion.js';

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

// THE MEDALLION IS AN ELLIPSE, not a disc, and it was the game's own SQUASH that
// flattens it — the same 0.62 every reach ring and every plot's dirt patch on
// every board is drawn with. A stage marker is a thing lying on the ground seen
// from the same angle as everything else, so it is foreshortened by the same
// amount. Picking a number by eye here would have made the world map the one
// surface in the game at a different tilt.
// SMALLER, AND FLATTER, both at the owner's word. It was 15 at the game's own
// SQUASH of 0.62; it is 11 at 0.50, which is a third less across and half again as
// flat. A marker is a place on a road rather than a button, and the flag standing in
// it is what the eye is meant to find.
//
// THE SQUASH IS ITS OWN NUMBER NOW rather than the one imported from ground.js.
// That one is the game's ground foreshortening — every reach ring and every dirt
// patch on every board is drawn at it — and pulling it to 0.50 to flatten a
// medallion would have tilted the floor of all three battle maps with it.
const NODE_R = 11;
const NODE_SQUASH = 0.50;
const INK = '#2A1D0E';

// A blue banner, and blue because it has to be the one thing on a brown map that
// is not brown. The map is a parchment now: every fill in it went through a
// luminance ramp into browns, so a red flag would sit a shade away from the
// hills behind it. See sepia() in tools/overview.mjs.
// How tall the planted flag stands, in canvas px. The drawing is scaled to this
// height and keeps its own proportions.
const FLAG_H = 30;

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

  // FROM THE FIRST STEP, NOT THE SECOND. This started at DOT_GAP, so every leg
  // lost a dot at its near end — invisible while the medallion was fifteen across
  // and covered the gap, and a hole in the road once it came down to eleven. The
  // dot that lands on the previous marker is drawn under it and costs nothing.
  let walked = 0;
  let next = 0;
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
  ctx.ellipse(x, y, r, r * NODE_SQUASH, 0, 0, Math.PI * 2);
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
  disc(ctx, s.x, s.y + 1.8, NODE_R);
  ctx.fillStyle = 'rgba(43,30,16,0.34)';
  ctx.fill();

  disc(ctx, s.x, s.y, NODE_R);
  ctx.fillStyle = INK;
  ctx.fill();

  const g = ctx.createLinearGradient(0, s.y - NODE_R * NODE_SQUASH, 0, s.y + NODE_R * NODE_SQUASH);
  if (open) { g.addColorStop(0, '#F5DB95'); g.addColorStop(1, '#BE8C2A'); }
  else { g.addColorStop(0, '#9C958A'); g.addColorStop(1, '#6E685F'); }
  disc(ctx, s.x, s.y, NODE_R - 2.1);
  ctx.fillStyle = g;
  ctx.fill();

  if (hot) {
    disc(ctx, s.x, s.y, NODE_R + 2.2);
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
    const lit = ctx.createLinearGradient(0, s.y - NODE_R * NODE_SQUASH, 0, s.y + NODE_R * NODE_SQUASH * 0.4);
    lit.addColorStop(0, 'rgba(255,246,214,0.62)');
    lit.addColorStop(1, 'rgba(255,246,214,0)');
    disc(ctx, s.x, s.y - NODE_R * NODE_SQUASH * 0.16, NODE_R - 3.4);
    ctx.fillStyle = lit;
    ctx.fill();
  }
  // NOTHING FOR A LOCKED STAGE ANY MORE. There was a padlock drawn in the middle of
  // it, gone at the owner's word — the grey face already says the stage is not open,
  // the panel says so in words when it is tapped, and a lock inside an 11px ellipse
  // was a detail nobody could read at map scale. It also sat exactly where the
  // flag's pole now stands.
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

// BIG, at the owner's word, and the gap follows the radius or a three-star row
// becomes one lump. Points touch at a gap of two radii; this leaves a little air.
//
// Twelve first, then ten: at twelve the rows on stages 1 and 2 nearly met, because
// those markers are ninety pixels apart and a three-star row was eighty-four wide.
const STAR_R = 10;
const STAR_GAP = STAR_R * 2.35;

function drawStars(ctx, cx, cy, filled) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.7;
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
    // THE MEDALLION'S OWN INK, not black. Black was a step too far in the other
    // direction from the soft brown it replaced — the stars were the only pure black
    // on a map whose every outline is INK, and they sat in front of the drawing
    // rather than on it. One colour for both is what makes them look like the same
    // set of furniture.
    ctx.strokeStyle = INK;
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
  // THE POLE STANDS IN THE MIDDLE OF THE MEDALLION, at the owner's word. It used to
  // stand at the BACK of the ellipse, on the reasoning that a flag planted in ground
  // should meet it at the far edge rather than balance on the near one — but the
  // medallion is smaller and flatter now and its back edge is five pixels off the
  // centre, so the distinction cost more than it bought.
  const foot = y + drop;
  const h = FLAG_H * (0.62 + 0.38 * k);   // and grows into its full height

  ctx.save();
  ctx.globalAlpha = Math.min(1, t * 2.4);

  // THE RALLY POINT'S OWN FLAG, the same file the barracks plants on a battle map,
  // so the game has one flag rather than two drawn by different code.
  //
  // AND IT WAVES, which the picture cannot do on its own. The cloth is all on one
  // side of the pole, so shearing the drawing horizontally about the FOOT swings the
  // pennant and leaves the pole standing — the further up the drawing a pixel is,
  // the further it moves, which is how a flag on a pole actually behaves. Two sines
  // at different rates so the swing never repeats on a beat the eye can count.
  //
  // Sheared rather than redrawn: a vector pennant waving is a different flag from
  // the one the board plants, and having one flag was the point of the change.
  //
  // FLAG_FOOT puts the bottom of the pole on the point given, which is the same
  // anchor the board uses — see flag() in src/render.js. The pole is at 11% across
  // the drawing rather than at its centre, because the pennant is all on one side.
  const img = art.glyph_flag;
  if (img) {
    const [sx, sy, sw, sh] = ui.glyph_flag.trim;
    const { w, h: ih } = uiSize('glyph_flag', h);
    const swing = (Math.sin(wave * 2.1) * 0.055 + Math.sin(wave * 3.3 + 1.1) * 0.03) * k;
    ctx.translate(x, foot);
    ctx.transform(1, 0, swing, 1, 0, 0);     // shear about the foot: the top moves most
    ctx.translate(-x, -foot);
    ctx.drawImage(img, sx, sy, sw, sh, x - FLAG_FOOT[0] * w, foot - FLAG_FOOT[1] * ih, w, ih);
  } else {
    // The same vector fallback the board carries, so a missing file is a plainer
    // flag rather than no flag.
    ctx.strokeStyle = '#3A2A12';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, foot);
    ctx.lineTo(x, foot - h);
    ctx.stroke();
    ctx.fillStyle = FLAG_CLOTH;
    ctx.beginPath();
    ctx.moveTo(x, foot - h);
    ctx.lineTo(x + h * 0.52, foot - h + h * 0.19);
    ctx.lineTo(x, foot - h + h * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#25190C';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }

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
// DARK, and it can afford to be, because the lit country is lifted into sunlight
// below: the gap between reached and unreached is opened from BOTH ends rather than
// by pushing one of them around on its own. That was the trap the first version fell
// into — darkness carrying the whole distinction, so every change to the darkness
// changed the whole effect.
//
// Asked for twice, in opposite directions, and both were right at the time. It was
// once a dark WASH, and halving that on request halved the only signal there was. It
// is a colour DRAIN now, so the far country keeps its shape at a brightness that
// would have hidden it before — 0.28 here is much darker than the 0.45 wash ever
// was, and you can still see it is a desert.
const FOG_BRIGHT = 0.20;   // how much light the drained country keeps
const FOG_WASH = 'rgba(30,20,9,0.30)';   // and a breath of brown over that

// AND THE COUNTRY THAT HAS BEEN REACHED IS IN SUNLIGHT — the exact mirror of the
// fog. The fog is a DRAINED copy of the map with the lit shape cut out of it; this
// is a BRIGHTENED copy with everything but the lit shape cut out. Same picture,
// same mask, opposite sides of it, so the two meet along one edge and can never
// disagree about where that edge is.
//
// TWO BLEND MODES WERE TRIED FIRST AND BOTH WERE THE WRONG TOOL. `overlay` drives
// light pixels hard towards white: the brightest thing in the lit country is the
// river, and it came out a bleached channel with no water left in it. `soft-light`
// was gentler and warmed rather than lit — the greens went olive and the whole map
// read hazy rather than sunny. Neither could be tuned into the answer, because a
// wash tints what is there and what was wanted was more LIGHT on it.
//
// A filtered copy says exactly what it means: fifteen percent more light, a little
// more colour with it, and the faintest warm cast.
const SUN_FILTER = 'brightness(1.26) saturate(1.30) sepia(0.05)';

// HOW FAR THE LIGHT REACHES, and HOW LONG IT TAKES TO GO OUT. These are two
// different things and the difference matters: reach is how much country a player
// gets for arriving somewhere, blur is how gradually that country gives way to the
// country beyond it.
//
// THE BLUR IS THE FADE, and it is wide on purpose. A short one puts a rim around
// the explored land — you can see where the light stops, which makes it a spotlight
// on a map rather than a map that carries on into the distance. At this width there
// is no edge to find anywhere: the colour leaves the drawing over most of a
// medallion's width, so the eye reads distance rather than a boundary.
//
// It has been both ways round now. When the fog was a DARK WASH at half strength a
// blur this wide erased the effect completely — there was nothing left to see the
// lit pocket by. That is not true of a colour drain: the far country is a different
// kind of picture rather than a dimmer one, so the two stay told apart however
// softly they are joined, and the fade can be as long as it wants to be.
const LIT_REACH = 69;
const LIT_BLUR = 120;

let fogSheet = null, sunSheet = null, litSheet = null, fogKey = '';

// A SOFT EDGE WITHOUT A BLUR FILTER. Stamps every so often along the same roads,
// each a radial gradient that is solid to LIT_REACH and gone by LIT_REACH+LIT_BLUR.
// `lighter` rather than source-over: two overlapping half-transparent stamps under
// source-over leave a seam where they meet, and under addition they simply saturate.
function softFalloff(g, unlocked, live, frac) {
  const STEP = 26;                       // stamps this far apart along the road
  g.save();
  g.globalCompositeOperation = 'lighter';
  const stamp = (x, y) => {
    const grad = g.createRadialGradient(x, y, LIT_REACH * 0.55, x, y, LIT_REACH + LIT_BLUR);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.45, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x - LIT_REACH - LIT_BLUR, y - LIT_REACH - LIT_BLUR,
               (LIT_REACH + LIT_BLUR) * 2, (LIT_REACH + LIT_BLUR) * 2);
  };

  for (let i = 0; i < unlocked; i++) {
    const leg = STAGES[i].leg;
    const upto = i === live ? frac : 1;
    if (upto <= 0) continue;
    let total = 0;
    for (let k = 1; k < leg.length; k++) total += Math.hypot(leg[k][0] - leg[k - 1][0], leg[k][1] - leg[k - 1][1]);
    const stop = total * upto;
    let walked = 0, next = 0;
    for (let k = 1; k < leg.length; k++) {
      const [x0, y0] = leg[k - 1], [x1, y1] = leg[k];
      const seg = Math.hypot(x1 - x0, y1 - y0);
      if (!seg) continue;
      while (next <= walked + seg && next <= stop) {
        const t = (next - walked) / seg;
        stamp(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
        next += STEP;
      }
      walked += seg;
    }
    if (upto >= 1) stamp(STAGES[i].x, STAGES[i].y);
  }
  g.restore();
}

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
  const f = c.getContext('2d');
  f.clearRect(0, 0, 960, 540);

  // THE SAME PICTURE, DRAINED. The map, the paper and the names in the order
  // drawOverview lays them down, so that what is punched out of this lines up
  // exactly with what is underneath it — then the whole stack put through one
  // filter. Rebuilt from the source images rather than copied off the screen,
  // because the canvas the game draws to may carry a transform this knows nothing
  // about, and reading pixels back through the wrong one is a bug that only shows
  // on somebody else's display.
  let drained = false;
  try {
    f.filter = `grayscale(1) sepia(0.62) brightness(${FOG_BRIGHT})`;
    drained = f.filter !== 'none';
  } catch { /* no filter support */ }

  if (art.overview) f.drawImage(art.overview, 0, 0, 960, 540);
  else { f.fillStyle = '#C9A878'; f.fillRect(0, 0, 960, 540); }
  f.filter = 'none';

  f.globalCompositeOperation = 'multiply';
  f.drawImage(parchment || makeParchment(), 0, 0);
  f.globalCompositeOperation = 'source-over';

  if (art.overviewNames) {
    // The names go through the same drain. A region nobody has reached should not
    // be announcing itself in white.
    try { f.filter = `grayscale(1) sepia(0.62) brightness(${FOG_BRIGHT})`; } catch { /* */ }
    f.drawImage(art.overviewNames, 0, 0, 960, 540);
    f.filter = 'none';
  }

  // Where filters are not available there is nothing to drain the colour, so the
  // old dark wash stands in: heavier than this, and the only thing that works.
  f.fillStyle = drained ? FOG_WASH : 'rgba(26,17,8,0.55)';
  f.fillRect(0, 0, 960, 540);

  // THE LIT SHAPE, ON ITS OWN SHEET, because two things need it: the fog is punched
  // out with it and the sunlight is cut to it. Drawing it once and using it twice is
  // the only way the two can be guaranteed to line up — a second stroke with the
  // same numbers would still differ by a pixel of antialiasing along every edge.
  const lit = litSheet || (litSheet = document.createElement('canvas'));
  lit.width = 960;
  lit.height = 540;
  const g = lit.getContext('2d');
  g.clearRect(0, 0, 960, 540);

  // A blur filter is what makes the edge a falloff rather than a cut, and WHERE IT
  // IS MISSING THE EDGE IS THE BUG THE OWNER SAW. Canvas filters are not universal —
  // the same build showed a soft fade on a laptop and hard lit circles on a phone,
  // which is exactly the shape of a silently skipped filter. The old code caught the
  // failure and carried on with a hard rim, which is a feature quietly not working.
  //
  // So the falloff is drawn a second way when the first is unavailable: soft radial
  // stamps along the same road, which every canvas can do. See softFalloff below.
  let blurred = false;
  try { g.filter = `blur(${LIT_BLUR}px)`; blurred = g.filter !== 'none'; } catch { /* stamps instead */ }
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
    // A POOL AT AN ARRIVED-AT MARKER, THE SAME WIDTH AS THE ROAD. It was half again
    // wider, on the reasoning that a stage is a place rather than a point — and a
    // circle wider than the corridor it sits on is a bulge, which is a circle you
    // can see. That is most of what "obvious lit circles" was.
    if (upto >= 1) {
      g.beginPath();
      g.arc(STAGES[i].x, STAGES[i].y, LIT_REACH, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.filter = 'none';

  // WITHOUT THE FILTER, the shape above is a hard-edged corridor. These are the
  // edge: a ring of soft radial stamps along every open road, each opaque out to the
  // reach and fading to nothing over the same distance the blur would have taken.
  // Drawn with `lighter` so overlapping stamps saturate rather than banding, which
  // is what accumulating alpha along a line would do.
  if (!blurred) softFalloff(g, unlocked, live, frac);

  // The fog is the drained picture with the lit shape taken out of it.
  f.globalCompositeOperation = 'destination-out';
  f.drawImage(lit, 0, 0);
  f.globalCompositeOperation = 'source-over';

  // And the sunlight is a brightened copy of the same picture with everything BUT
  // the lit shape taken out.
  //
  // THE NAMES ARE NOT IN IT. They are in the fog, because a region nobody has
  // reached should not be announcing itself — but the owner asked for them exactly
  // as drawn, and putting them through a brightness filter would be one more thing
  // done to them. So this sheet is the map and the paper only, and it is laid down
  // BEFORE the names: in lit country a name is still the artist's own pixels.
  const sun = sunSheet || (sunSheet = document.createElement('canvas'));
  sun.width = 960;
  sun.height = 540;
  const sg = sun.getContext('2d');
  sg.clearRect(0, 0, 960, 540);

  try { sg.filter = SUN_FILTER; } catch { /* unfiltered: the map, unchanged */ }
  if (art.overview) sg.drawImage(art.overview, 0, 0, 960, 540);
  sg.filter = 'none';
  sg.globalCompositeOperation = 'multiply';
  sg.drawImage(parchment || makeParchment(), 0, 0);
  sg.globalCompositeOperation = 'destination-in';
  sg.drawImage(lit, 0, 0);

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

  // WHAT THE PLAYER HAS REACHED, AND WHAT THEY HAVE NOT. Both sheets are built
  // together from one lit shape — see makeFog — so this settles the order they go
  // down in, which is the whole of how the map reads.
  const r = state.reveal;
  const unlocked = Math.min(state.unlocked ?? 0, STAGE_COUNT);
  const live = r && r.phase === 'road' ? r.stage : -1;
  const now = performance.now() / 1000;
  const fog = fogFor(unlocked, live, live >= 0 ? r.t : 1);

  // THE SHEETS USED TO BREATHE, drifting a few pixels on a slow figure of eight so
  // the edge of the dark moved rather than sitting still. Gone at the owner's word,
  // and it takes its own complications with it: a drifting sheet had to be drawn
  // oversize, because shifting a 960x540 sheet by three pixels left three pixels of
  // map uncovered along one edge and showed as a hard strip across the top. Laid at
  // its own size in its own place, a sheet covers the map exactly.
  const spread = (img) => ctx.drawImage(img, 0, 0);

  // THE SUN FIRST, because it REPLACES the lit country with a brighter copy of
  // itself rather than tinting what is there. Anything drawn before it inside the
  // lit shape would be painted over — which is why the cloud shadows come after it
  // and not before, so that a shadow falls on sunlit ground rather than being
  // erased by it.
  if (sunSheet) spread(sunSheet);

  // AND THE MAP MOVES A LITTLE: shadows crossing the land. Before the names, because
  // a band crossing a river under a label was lighting the lettering up with it, and
  // before the fog, because unexplored country is a drained still copy and should
  // stay still.
  drawMotion(ctx, now);

  // THE REGION NAMES, OVER ALL OF IT. They are a second image for exactly this
  // reason: the parchment is a multiply, so a name inside the map picks up whatever
  // grain, stain and vignette fall on it, and one sat in the darkest corner looking
  // like a different colour from the rest. The owner asked for them exactly as
  // drawn — so the sun does not touch them either, and in lit country these are the
  // artist's own pixels and nothing else.
  if (art.overviewNames) ctx.drawImage(art.overviewNames, 0, 0, 960, 540);

  // AND THE DARK OVER THE PARTS OF THE WORLD NOBODY HAS WALKED TO. Over the whole
  // drawing including the names — a region nobody has reached should not be
  // announcing itself — and under everything the game draws, because the trail, the
  // medallions and the flag are the interface and are never in shadow.
  spread(fog);

  // AND THE WATER OVER THE TOP OF THE DARK, which is the one thing allowed through
  // it. The waterfall is in country the road never reaches, so under the fog it
  // would never be seen to move at all. See WATER_THROUGH_FOG in src/motion.js.
  drawWater(ctx, now);

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

  // AND A LIGHT RUNS UP THE LAST STRETCH OF ROAD TO THE FLAG. Over the trail so it
  // lands on the dots, under the medallions and the flag so it cannot outshine
  // either, and only while the map is at rest — during a march the road is already
  // drawing itself and a second travelling light on the same line is a fight.
  if (frontier >= 0 && !r && state.stage === null) drawPulse(ctx, now, STAGES[frontier].leg);

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
      ? flagTop - STAR_R - 3
      : STAGES[i].y - NODE_R * NODE_SQUASH - STAR_R - 4;
    drawStars(ctx, STAGES[i].x, top, stars);
  }
}
