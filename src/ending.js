// THE ENDING, at the owner's word ("The Road Home"): played on the world map the
// first time stage 16 is won, and again whenever the campaign seal is tapped.
//
//   crows    the flock rises from the Dark Hollow and flies off the map
//   fog      the dark over the world lifts
//   road     stage 16's flag lifts away; the road's dots turn yellow, back from the
//            Citadel to Oakhaven, a flag dropping on each stage as they do, and
//            Oakhaven's bell rings twice at the end
//   words    the closing words, on the tutorial's paper
//   tally    the player's own campaign in numbers
//   credits  the credits
//
// EACH PART IS ONE ENTRY IN `PARTS`, at the owner's word ("if any part I don't like,
// it is easy to remove"): take a name out of the list and that part is gone, and the
// rest play as before. The words themselves are in src/data/ending.js. Two more
// switches below: KEEP_MAP_LIT and SHOW_SEAL.
//
// A tap moves on to the next part; Skip ends it. It runs on real seconds, on the
// world map, over everything else there.
import { STAGES, STAGE_COUNT } from './data/overview.js';
import { art } from './assets.js';
import { play, slice, BELL, FLAG_PLANTED } from './audio.js';
import { drawFlag, drawStageStars } from './overview.js';
import { tutorialPaper, TUTORIAL_INK, drawAdminDoor } from './render.js';
import { starsEarned } from './upgrades.js';
import { MAX_STARS } from './score.js';
import { ENDING_WORDS, TALLY_TITLE, CREDITS, SEAL_TEXT } from './data/ending.js';

export const PARTS = ['crows', 'fog', 'road', 'words', 'tally', 'credits'];
// AFTER THE ENDING, the whole map stays lit — the world at peace. False: the fog
// comes back as it was once the ending is over.
const KEEP_MAP_LIT = true;
// The "Campaign complete" seal on the world map, which plays the ending again.
const SHOW_SEAL = false;   // off, at the owner's word

const SEEN_KEY = 'medieval-td/ending';
const CAREER_KEY = 'medieval-td/career';
const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };
export const endingSeen = () => { try { return !!store()?.getItem(SEEN_KEY); } catch { return false; } };
function saveSeen() { try { store()?.setItem(SEEN_KEY, '1'); } catch { /* this visit only */ } }
// The admin dashboard's fresh start.
export function forgetEnding() { try { store()?.removeItem(SEEN_KEY); store()?.removeItem(CAREER_KEY); } catch { /* nothing kept */ } }

// --- the player's campaign, kept as they play, for the tally ------------------------
function career() {
  try { return JSON.parse(store()?.getItem(CAREER_KEY) || 'null') || {}; } catch { return {}; }
}
// Every finished battle, won or lost: called once, as its result comes up.
export function noteBattle(state, startLives) {
  const c = career();
  c.battles = (c.battles || 0) + 1;
  if (state.result === 'won') c.wins = (c.wins || 0) + 1;
  c.slain = (c.slain || 0) + (state.slain || 0);
  c.lost = (c.lost || 0) + Math.max(0, startLives - Math.max(0, state.lives));
  c.secs = (c.secs || 0) + (state.steps || 0) / 60;
  try { store()?.setItem(CAREER_KEY, JSON.stringify(c)); } catch { /* full or private */ }
}

// --- running it ---------------------------------------------------------------------

// Begin the ending (a win on the last stage, or the seal tapped).
export function startEnding(state) {
  if (!PARTS.length) { saveSeen(); return; }
  state.ending = { part: 0, t: 0, at: 0, lit: {}, crows: null, typed: 0 };
  state.menu = null;
}
export const lastStage = i => i === STAGE_COUNT - 1;

const PART_SECONDS = { crows: 6, fog: 3 };
const ease = k => k * k * (3 - 2 * k);
// The words, the tally and the credits wait for a tap, or this many seconds once whole.
const PANEL_HOLD = 12;
const TYPE_RATE = 32;

export function updateEnding(state, dt) {
  const E = state.ending;
  // THE MAP'S FOG, lifted by the `fog` part and kept lifted after (KEEP_MAP_LIT).
  if (!E) { state.fogLift = KEEP_MAP_LIT && endingSeen() ? 1 : 0; return; }
  E.t += dt;
  const part = PARTS[E.part];
  const fogAt = PARTS.indexOf('fog');
  state.fogLift = fogAt < 0 ? (KEEP_MAP_LIT ? 1 : 0)
    : E.part > fogAt ? 1 : E.part < fogAt ? 0 : ease(Math.min(1, E.t / PART_SECONDS.fog));
  if (E.begun !== E.part) { E.begun = E.part; begin(state, E, part); }
  if (part === 'road') stepRoad(E);
  if (over(E, part)) next(state);
}

function begin(state, E, part) {
  if (part === 'crows') play(['crows_cawing'], 0.8);
  if (part === 'road') E.road = roadPlan();
  if (part === 'words' || part === 'tally' || part === 'credits') play(['page_flip']);
}

function over(E, part) {
  if (PART_SECONDS[part]) return E.t >= PART_SECONDS[part];
  if (part === 'road') return E.road && E.t >= Math.max(E.road.end, E.road.home + BELL_STROKES[BELL_STROKES.length - 1][0]) + 1.5;
  if (part === 'words') return E.t >= ENDING_WORDS.length / TYPE_RATE + PANEL_HOLD;
  return E.t >= PANEL_HOLD;
}

function next(state) {
  const E = state.ending;
  E.part++;
  E.t = 0;
  if (E.part >= PARTS.length) finish(state);
}
function finish(state) {
  state.ending = null;
  saveSeen();
  state.fogLift = KEEP_MAP_LIT ? 1 : 0;
}

// A TAP: Skip ends it; anywhere else moves to the next part (or, while the words are
// still typing, finishes typing them first). Always taken: nothing under the ending
// answers while it plays.
// IN THE ADMIN BUTTON'S PLACE AND STYLE, at the owner's word, while the ending plays
// (src/admin.js ADMIN_BTN; render.js leaves the Admin button out meanwhile).
export const SKIP_BTN = { x: 858, y: 484, w: 84, h: 38 };
export function tapEnding(state, x, y) {
  const E = state.ending;
  if (!E) return false;
  if (inside(SKIP_BTN, x, y)) { finish(state); return true; }
  if (PARTS[E.part] === 'words' && E.t < ENDING_WORDS.length / TYPE_RATE) { E.t = ENDING_WORDS.length / TYPE_RATE; return true; }
  next(state);
  return true;
}
const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// THE SEAL, top right of the world map, once the ending has been seen.
export const SEAL = { x: 790, y: 12, w: 156, h: 36 };
export function tapSeal(state, x, y) {
  if (!SHOW_SEAL || state.ending || !endingSeen() || !inside(SEAL, x, y)) return false;
  startEnding(state);
  return true;
}

// --- the road ---------------------------------------------------------------------
//
// Back down the road the army came up: each stage's leg walked from its far end to its
// near one, from the Citadel to Oakhaven, at ROAD_PACE, its dots turning yellow.
const ROAD_PACE = 240;          // px a second
const LEG_MIN = 0.35;           // seconds, however short a leg
const legLength = leg => leg.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - leg[i][0], p[1] - leg[i][1]), 0);
// THE FLAGS, at the owner's word: one comes down on every stage as the yellow reaches
// it — the Citadel's first.
function roadPlan() {
  const legs = [];
  let t = 0.6;
  const flags = { [STAGE_COUNT - 1]: t };
  // AND ON PAST OAKHAVEN, at the owner's word: stage 1's own leg, in from the map's
  // edge, turns yellow too — after Oakhaven's flag, while its bell rings (`home`).
  let home = t;
  for (let i = STAGE_COUNT - 1; i >= 0; i--) {
    const leg = STAGES[i].leg;
    const d = Math.max(LEG_MIN, legLength(leg) / ROAD_PACE);
    legs.push({ i, leg, from: t, to: t + d });
    t += d;
    if (i >= 1) flags[i - 1] = t;
    if (i === 1) home = t;
  }
  return { legs, flags, home, end: t, rung: {}, dropped: {} };
}
// OAKHAVEN'S BELL as the light comes home, rung twice, at the owner's word — 2
// strokes as the church bell on stage 8 rings them (BELL_STROKES: seconds after the
// light arrives, and how long each is let ring).
const BELL_STROKES = [[0, 1.8], [2.1, 1.8]];
function stepRoad(E) {
  const R = E.road;
  for (const [i, at] of Object.entries(R.flags)) {
    if (E.t >= at && !R.dropped[i]) { R.dropped[i] = true; play(FLAG_PLANTED, 0.6); }
  }
  BELL_STROKES.forEach(([at, d], k) => {
    if (E.t >= R.home + at && !R.rung[k]) { R.rung[k] = true; slice(BELL.key, 0, d, 1, BELL.fade); }
  });
}

// --- drawing ------------------------------------------------------------------------

export function drawEnding(ctx, state) {
  const E = state.ending;
  if (!E) { if (SHOW_SEAL && endingSeen() && (state.stage === null || state.stage === undefined)) drawSeal(ctx); return; }
  const part = PARTS[E.part];
  // THE ROAD STAYS LIT once it has been, under the panels that follow.
  const roadAt = PARTS.indexOf('road');
  drawFlags(ctx, E, roadAt);
  if (part === 'crows') drawCrows(ctx, E);
  if (part === 'words' || part === 'tally' || part === 'credits') {
    ctx.save();
    ctx.globalAlpha = Math.min(1, E.t / 0.5) * 0.45;
    ctx.fillStyle = '#140f09';
    ctx.fillRect(0, 0, 960, 540);
    ctx.restore();
    if (part === 'words') drawWords(ctx, E);
    if (part === 'tally') drawTally(ctx, E);
    if (part === 'credits') drawCredits(ctx, E);
  }
  drawAdminDoor(ctx, 'Skip');
}

// THE FLOCK: the Dark Crow's own wingbeat, small, rising out of the Dark Hollow and
// away off the bottom right of the map.
const FLOCK = 64;
const CROW_FRAMES = [['crow', [217, 180, 78, 60]], ['crow_flap1', [217, 199, 78, 41]], ['crow_flap2', [217, 212, 78, 51]], ['crow_flap1', [217, 199, 78, 41]]];
const CROW_W = 8;
const CROW_PACE = 150;          // px a second, along the way
function drawCrows(ctx, E) {
  if (!E.crows) {
    // THE DARK HOLLOW'S 3 STAGES, and 2 spots further up and left inside it — all
    // within the Hollow's grey ground, at the owner's word, as the paths below are.
    const homes = [...[STAGE_COUNT - 3, STAGE_COUNT - 2, STAGE_COUNT - 1].map(i => STAGES[i]),
                   { x: 712, y: 430 }, { x: 668, y: 478 }];
    // Laid out the same every time, so the ending looks the same every time.
    let seed = 7;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    E.crows = Array.from({ length: FLOCK }, (_, k) => {
      const h = homes[k % homes.length];
      // OFF THE BOTTOM RIGHT, at the owner's word: away to the right and curving
      // down off the corner, each on its own line.
      const x0 = h.x + (r() - 0.5) * 40, y0 = h.y + (r() - 0.5) * 20;
      const x1 = 900 + r() * 140, y1 = 570 + r() * 50;
      // NEVER ABOVE WHERE HE STARTS, so no crow strays up out of the Hollow.
      const cx = x0 + (x1 - x0) * 0.7, cy = y0 + (y1 - y0) * 0.25;
      // MOSTLY AT ONE PACE, at the owner's word: the same speed give or take a little,
      // and 1 in 8 a little quicker or slower.
      const odd = r() < 0.125;
      const pace = CROW_PACE * (odd ? 0.8 + r() * 0.4 : 0.95 + r() * 0.1);
      return { x0, y0, x1, y1, cx, cy, delay: r() * 2.6, dur: Math.hypot(x1 - x0, y1 - y0) * 1.1 / pace,
               beat: r() * 4, size: 0.75 + r() * 0.5 };
    });
  }
  for (const c of E.crows) {
    const k = (E.t - c.delay) / c.dur;
    if (k <= 0 || k >= 1) continue;
    // Along a gentle curve (a quadratic through `cx, cy`), at an even pace.
    const u = k, v = 1 - u;
    const x = v * v * c.x0 + 2 * v * u * c.cx + u * u * c.x1, y = v * v * c.y0 + 2 * v * u * c.cy + u * u * c.y1;
    const [key, [sx, sy, sw, sh]] = CROW_FRAMES[Math.floor(E.t * 9 + c.beat) % CROW_FRAMES.length];
    const img = art[key];
    if (!img) continue;
    const w = CROW_W * c.size, h = w * sh / sw;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 6, (1 - k) * 6);
    // The drawings face left; the flock flies right.
    ctx.translate(x, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

// THE ROAD TURNS YELLOW, dot by dot, back from the Citadel to Oakhaven — the map's
// own dots, recoloured where the map draws them (under the medallions, the flags and
// the stars), at the owner's word: nothing new drawn over anything. `yellowFrom` is
// asked by src/overview.js for each stage's leg: the first dot that is yellow.
const dotCount = leg => Math.floor(legLength(leg) / 10) + 1;
export function yellowFrom(state, i) {
  const E = state.ending;
  if (!E || !E.road) return Infinity;
  const roadAt = PARTS.indexOf('road');
  if (E.part > roadAt) return 0;
  const L = E.road.legs.find(l => l.i === i);
  if (!L || E.t < L.from) return Infinity;
  const n = dotCount(L.leg);
  const frac = Math.min(1, (E.t - L.from) / (L.to - L.from));
  return n - Math.ceil(frac * n);
}

// THE FLAGS AND THE STARS, drawn here while the ending plays (the map leaves both to
// it): stage 16's flag as the map has it until the road part, lifting away as it
// begins; then a flag dropping on each stage as the yellow reaches it. Every stage's
// stars go over its flag, so a flag never covers them.
function drawFlags(ctx, E, roadAt) {
  const wave = performance.now() / 1000;
  const before = roadAt < 0 || E.part < roadAt, during = E.part === roadAt;
  const R = E.road;
  for (let i = 0; i < STAGE_COUNT; i++) {
    const s = STAGES[i];
    let top = null;
    // (NO FLAG ON STAGE 16 BEFORE THE ROAD PART, at the owner's word: the map has
    // none there once the campaign is won — see src/overview.js.)
    if (!before) {
      const at = R && R.flags[i];
      const now = during ? E.t : Infinity;
      if (at !== undefined && now >= at) top = drawFlag(ctx, s.x, s.y, Math.min(1, (now - at) / 1.1), wave + i);
    }
    drawStageStars(ctx, i, top);
  }
}

// --- the paper panels ----------------------------------------------------------------
const FONT = '19px Lobster, system-ui, sans-serif';
const TITLE_FONT = '26px Lobster, system-ui, sans-serif';
const LINE = 26;
const PANEL_W = 460;
const PAD = 22;

function wrap(ctx, text, w) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > w && line) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}
function panel(ctx, h, E) {
  const x = 480 - PANEL_W / 2, y = 270 - h / 2;
  ctx.globalAlpha = Math.min(1, E.t / 0.4);
  tutorialPaper(ctx, x, y, PANEL_W, h);
  return { x, y };
}
function drawWords(ctx, E) {
  ctx.save();
  ctx.font = FONT;
  const lines = wrap(ctx, ENDING_WORDS, PANEL_W - PAD * 2);
  const { x, y } = panel(ctx, lines.length * LINE + PAD * 2, E);
  ctx.fillStyle = TUTORIAL_INK;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  let left = Math.floor(E.t * TYPE_RATE);
  lines.forEach((line, i) => {
    const part = line.slice(0, Math.max(0, left));
    left -= line.length + 1;
    if (part) ctx.fillText(part, x + PAD, y + PAD + i * LINE);
  });
  ctx.restore();
}

// THE PLAYER'S OWN NUMBERS: the stars they hold, and what they have done since the
// game started keeping count (a row with nothing behind it is left out).
function tallyRows() {
  const c = career();
  const rows = [['Stars earned', `${starsEarned()} of ${STAGE_COUNT * MAX_STARS}`]];
  if (c.battles) rows.push(['Battles won', `${c.wins || 0} of ${c.battles}`]);
  if (c.slain) rows.push(['Enemies defeated', `${c.slain}`]);
  if (c.battles) rows.push(['Lives lost', `${c.lost || 0}`]);
  if (c.secs) {
    const m = Math.round(c.secs / 60);
    rows.push(['Time in battle', m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`]);
  }
  return rows;
}
function drawTally(ctx, E) {
  const rows = tallyRows();
  ctx.save();
  const h = PAD * 2 + 40 + rows.length * LINE;
  const { x, y } = panel(ctx, h, E);
  ctx.fillStyle = TUTORIAL_INK;
  ctx.textBaseline = 'top';
  ctx.font = TITLE_FONT;
  ctx.textAlign = 'center';
  ctx.fillText(TALLY_TITLE, 480, y + PAD - 2);
  ctx.font = FONT;
  rows.forEach(([k, v], i) => {
    const ry = y + PAD + 40 + i * LINE;
    ctx.textAlign = 'left'; ctx.fillText(k, x + PAD + 20, ry);
    ctx.textAlign = 'right'; ctx.fillText(v, x + PANEL_W - PAD - 20, ry);
  });
  ctx.restore();
}
function drawCredits(ctx, E) {
  ctx.save();
  const h = PAD * 2 + CREDITS.length * LINE + 8;
  const { y } = panel(ctx, h, E);
  ctx.fillStyle = TUTORIAL_INK;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  CREDITS.forEach((line, i) => {
    ctx.font = i === 0 ? TITLE_FONT : FONT;
    if (line) ctx.fillText(line, 480, y + PAD + i * LINE + (i === 0 ? -2 : 4));
  });
  ctx.restore();
}

function drawButton(ctx, r, label) {
  ctx.save();
  tutorialPaper(ctx, r.x, r.y, r.w, r.h);
  ctx.fillStyle = TUTORIAL_INK;
  ctx.font = '17px Lobster, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
  ctx.restore();
}
function drawSeal(ctx) { drawButton(ctx, SEAL, `★ ${SEAL_TEXT}`); }
