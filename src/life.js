// THE TOWNS ON THE WORLD MAP, ALIVE: smoke from Ironforge and from the castles
// and workshops, Oakhaven's campfire, the castle banners, and Dawnford's fountain
// and the holy light on it. At the owner's ask, alongside the water in
// src/motion.js.
//
// ONLY WHERE THE PLAYER HAS BEEN. Each town wakes when the first of its stages is
// reached, so unlocking a stage visibly brings a town to life, and the country
// still ahead stays as still as the fog says it is. It is all drawn under the fog
// as well, which dims whatever might stray over its edge.
//
// NOTHING HERE OUTSHINES THE FLAG, the rule src/motion.js is written to: small,
// slow, pale, and on cycles long enough that it is noticed on the second look.
//
// Coordinates are canvas px, read off the map as drawn. A redraw of the world map
// that moves a house moves its chimney away from its smoke — re-read them then.

import { art } from './assets.js';

const ON = { smoke: true, holy: true, fire: true, banners: true, fountain: true,
             birds: true, tumbleweeds: true, pristine: true };

// The first stage of each town, by index into STAGES — the town wakes when the
// player has reached it.
const TOWN = { oakhaven: 0, winchester: 2, dawnford: 5, sandshroud: 8, ironforge: 9, serene: 12 };

// SMOKE, AT THE OWNER'S WORD: grey from Ironforge's houses, and black from the
// castles and the workshops of Winchester and Ironforge. The villages of Oakhaven,
// Winchester and Dawnford keep clean roofs — the campfire is Oakhaven's smoke.
const HOUSE_SMOKE = [
  { x: 810, y: 231 }, { x: 783, y: 288 }, { x: 746, y: 302 }, { x: 759, y: 314 },
  { x: 810, y: 325 }, { x: 889, y: 335 }, { x: 879, y: 352 }, { x: 740, y: 355 },
  { x: 767, y: 372 }
].map(c => ({ ...c, town: 'ironforge' }));

const BLACK_SMOKE = [
  { x: 446, y: 57, town: 'winchester' },   // the castle's towers
  { x: 469, y: 50, town: 'winchester' },
  { x: 425, y: 121, town: 'winchester' },  // the workshop
  { x: 909, y: 196, town: 'ironforge' },   // the castle's towers
  { x: 937, y: 205, town: 'ironforge' },
  { x: 878, y: 292, town: 'ironforge' }    // the factory
];

// AND TWO THREADS OF IT FROM WINCHESTER'S STATUE, at the owner's word — the two
// torches on their pillars either side of it on stage 3, too small to see from here,
// sending up a little pale smoke each.
const STATUE_SMOKE = [
  { x: 295.5, y: 71, town: 'winchester' },
  { x: 309.5, y: 72, town: 'winchester' }
];

const CAMPFIRE = { x: 18, y: 84, town: 'oakhaven' };

// A banner: the top of it (where it hangs from), its width and its length. They
// hang from the battlements, so the top stays and the foot swings.
const BANNERS = [
  { x: 341, y: 52, w: 5, h: 12, town: 'winchester' },
  { x: 400, y: 70, w: 5, h: 11, town: 'winchester' },
  { x: 488, y: 73, w: 5, h: 12, town: 'winchester' },
  { x: 500, y: 68, w: 5, h: 12, town: 'winchester' },
  { x: 880, y: 216, w: 5, h: 12, town: 'ironforge' },
  { x: 893, y: 221, w: 5, h: 12, town: 'ironforge' },
  { x: 917, y: 326, w: 5, h: 11, town: 'ironforge' },
  { x: 709, y: 346, w: 5, h: 12, town: 'ironforge' },
  { x: 407, y: 262, w: 6, h: 11, town: 'dawnford' },     // the church
  { x: 415, y: 262, w: 6, h: 11, town: 'dawnford' },
  { x: 429, y: 264, w: 6, h: 12, town: 'dawnford' },
  { x: 514, y: 205, w: 7, h: 12, town: 'dawnford' },     // the barracks
  { x: 245, y: 360, w: 6, h: 13, town: 'sandshroud' },   // Sandshroud's barracks
  { x: 823, y: 66, w: 5, h: 13, town: 'serene' }         // Serene Peak's temple
];

const FOUNTAIN = { x: 517.5, y: 264, bowl: 276, town: 'dawnford' };


const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const awake = (town, unlocked) => unlocked > TOWN[town];

// The wind: from the west, gusting. Everything that leans leans with this.
const wind = (t, x) => 0.6 + 0.4 * Math.sin(t * 0.37 - x * 0.006) * Math.sin(t * 0.23 + 1.3);

// --- smoke -------------------------------------------------------------------

// A soft round puff, drawn once per colour and stamped, rather than a new gradient
// built for every puff on every frame.
const sprites = new Map();
function sprite(rgb) {
  let c = sprites.get(rgb);
  if (!c) {
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${rgb},1)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    sprites.set(rgb, c);
  }
  return c;
}

function puff(ctx, x, y, p, rise, drift, r0, r1, rgb, alpha) {
  const e = 1 - (1 - p) * (1 - p);
  const px = x + drift * p * p + Math.sin(p * 5 + x) * 0.8;
  const py = y - rise * e;
  const r = r0 + (r1 - r0) * p;
  const a = alpha * Math.min(1, p / 0.15) * (1 - p);
  if (a <= 0.005) return;
  ctx.globalAlpha = a;
  ctx.drawImage(sprite(rgb), px - r, py - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

function drawSmoke(ctx, t, unlocked) {
  HOUSE_SMOKE.forEach((c, i) => {
    if (!awake(c.town, unlocked)) return;
    const w = wind(t, c.x);
    for (let k = 0; k < 6; k++) {
      const p = ((t / 9.5) + k / 6 + hash(i)) % 1;
      // A PALE grey: a mid grey is the grass's own brightness and vanished into it.
      puff(ctx, c.x, c.y, p, 22, 10 * w, 1.8, 6.2, '204,200,194', 0.85);
    }
  });
  STATUE_SMOKE.forEach((c, i) => {
    if (!awake(c.town, unlocked)) return;
    const w = wind(t, c.x);
    for (let k = 0; k < 4; k++) {
      const p = ((t / 6.5) + k / 4 + hash(i + 70)) % 1;
      puff(ctx, c.x, c.y, p, 16, 7 * w, 1.4, 5, '226,222,216', 0.9);
    }
  });
  BLACK_SMOKE.forEach((c, i) => {
    if (!awake(c.town, unlocked)) return;
    const w = wind(t, c.x);
    // SLOW, at the owner's word: heavy smoke hangs and rolls rather than streams.
    for (let k = 0; k < 8; k++) {
      const p = ((t / 13) + k / 8 + hash(i + 50)) % 1;
      puff(ctx, c.x, c.y, p, 26, 13 * w, 2, 7.5, '26,24,22', 0.8);
    }
    // A spark now and then from the fires under it.
    const sp = ((t / 3.4) + hash(i + 90)) % 1;
    if (sp < 0.35) {
      const q = sp / 0.35;
      ctx.fillStyle = `rgba(255,${170 - 60 * q | 0},70,${0.9 * (1 - q)})`;
      ctx.beginPath();
      ctx.arc(c.x + 3 * w * q + Math.sin(q * 9 + i) * 0.8, c.y - 1 - 11 * q, 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// --- the holy light over Dawnford ---------------------------------------------
//
// SHAFTS OF LIGHT COMING DOWN ON THE TOWN, every one of them landing somewhere: a
// ray runs from high above the island, grows out of the sky as it comes down, and
// ends on the ground in a soft pool of light. Nothing cuts it at the river — a ray
// that crosses the water on its way down simply shines on it, as light would.
//
// At the owner's word, after a fan of rays faded at the shore and never looked
// right: "light should be like the one you did for the church and altar". So all
// of them are that kind now. The brightest and widest fall on the church and the
// High Altar; the rest are spread over the town.
//
// AND THEY WANDER, slowly: each foot drifts on its own small loop — `rx` by `ry`,
// one lap every `lap` seconds, neighbours turning opposite ways — so the light
// seems to shift as clouds pass, and each breathes brighter and dimmer on its own
// beat. Laid on with `screen`, so it lightens what is there without covering it.
const HOLY = { x: 470, y: -60, town: 'dawnford' };
const LANDING = [
  { at: [420, 282], w: 16, rx: 12, ry: 4, lap: 23, k: 1 },     // the church
  { at: [434, 284], w: 12, rx: 10, ry: 3, lap: 31, k: 1 },
  { at: [490, 295], w: 13, rx: 7, ry: 3, lap: 27, k: 1 },      // the High Altar
  { at: [497, 292], w: 9, rx: 6, ry: 2.5, lap: 19, k: 1 },
  { at: [514, 222], w: 11, rx: 8, ry: 3, lap: 29, k: 0.7 },    // the barracks
  { at: [465, 240], w: 12, rx: 10, ry: 4, lap: 33, k: 0.65 },  // the houses by the church
  { at: [517, 278], w: 10, rx: 6, ry: 2.5, lap: 21, k: 0.7 },  // the fountain
  { at: [560, 262], w: 12, rx: 10, ry: 4, lap: 35, k: 0.6 },   // the houses east of it
  { at: [590, 235], w: 11, rx: 9, ry: 3, lap: 26, k: 0.5 },
  { at: [395, 252], w: 10, rx: 8, ry: 3, lap: 30, k: 0.5 }     // the trees west of the church
];

function drawHoly(ctx, t, unlocked) {
  const h = HOLY;
  if (!awake(h.town, unlocked)) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const [i, r] of LANDING.entries()) {
    const a = (t / r.lap) * Math.PI * 2 * (i % 2 ? -1 : 1) + i * 1.7;
    const ex = r.at[0] + Math.cos(a) * r.rx;
    const ey = r.at[1] + Math.sin(a) * r.ry;
    const dx = ex - h.x, dy = ey - h.y, len = Math.hypot(dx, dy);
    const nx = -dy / len, ny = dx / len;
    const glow = (0.35 + 0.65 * r.k) * (0.13 + 0.08 * (0.5 + 0.5 * Math.sin(t * (0.3 + 0.07 * i) + i * 1.9)));
    const half = r.w * (0.9 + 0.1 * Math.sin(t * 0.45 + i));
    const g = ctx.createLinearGradient(h.x, h.y, ex, ey);
    // Out of the sky: nothing high up, growing as it comes down, full on the ground.
    g.addColorStop(0, 'rgba(255,238,180,0)');
    g.addColorStop(0.45, 'rgba(255,238,180,0)');
    g.addColorStop(0.8, `rgba(255,236,170,${glow * 0.8})`);
    g.addColorStop(1, `rgba(255,236,170,${glow})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    ctx.lineTo(ex + nx * half, ey + ny * half);
    // The foot of the shaft follows the ground: a flat curve, not a straight cut.
    ctx.quadraticCurveTo(ex, ey + 2.5, ex - nx * half, ey - ny * half);
    ctx.closePath();
    ctx.fill();
    // Where it lands, a flat pool of light on the ground.
    ctx.save();
    ctx.translate(ex, ey);
    ctx.scale(1, 0.4);
    const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, half * 1.3);
    pool.addColorStop(0, `rgba(255,238,178,${glow * 1.6})`);
    pool.addColorStop(1, 'rgba(255,238,178,0)');
    ctx.fillStyle = pool;
    ctx.fillRect(-half * 1.3, -half * 1.3, half * 2.6, half * 2.6);
    ctx.restore();
  }
  // Motes of light drifting down in the shafts, glowing and gone.
  for (let k = 0; k < 18; k++) {
    const r = LANDING[k % LANDING.length];
    const life = 6 + hash(k + 40) * 5;
    const p = ((t / life) + hash(k + 50)) % 1;
    // Somewhere along the lower part of its shaft, drifting down it.
    const f = 0.6 + 0.35 * ((hash(k + 60) + p * 0.3) % 1);
    const x = h.x + (r.at[0] - h.x) * f + (hash(k + 70) - 0.5) * r.w + Math.sin(t * 0.6 + k) * 2;
    const y = h.y + (r.at[1] - h.y) * f;
    const rad = 0.8 + hash(k + 80) * 1.4;
    ctx.globalAlpha = 0.45 * Math.sin(Math.PI * p);
    ctx.drawImage(sprite('255,245,205'), x - rad * 2, y - rad * 2, rad * 4, rad * 4);
  }
  ctx.restore();
}

// --- the campfire --------------------------------------------------------------

function drawFire(ctx, t, unlocked) {
  const f = CAMPFIRE;
  if (!awake(f.town, unlocked)) return;
  campfire(ctx, f.x, f.y, t, 1);
}

// THE SAME FIRE, AT ANY SIZE. The world map draws it a few pixels tall; stage 1
// (Oakhaven's own board) draws it at `s` times that over the logs its artwork keeps,
// in place of the flame that used to be painted there. `ink` is the board's black
// outline, which the world map's tiny fire has no room for.
// `heat` (0 to 1) flares it — taller, brighter, and throwing sparks — for stage 4's
// forge, where the smith's pipe going in stokes it. `flameClip` keeps the flame inside
// a shape (the furnace mouth); `smokeClip` keeps the glow, embers, sparks and smoke
// inside another (under the forge's roof); `smoke` scales the smoke, 1 as it is.
// `tall` scales the flame's height alone — the forge's fire, small or roaring.
// `part` draws half of it: 'under' everything but the sparks, 'sparks' the sparks
// alone — so something held in the fire (stage 4's pipe) is drawn over the flame and
// only the sparks it throws fly over it.
export function campfire(ctx, x0, y0, t, s, ink = false, { heat = 0, tall = 1, flameClip = null, smokeClip = null, smoke = 1, part = 'all' } = {}) {
  const clipTo = c => { ctx.save(); if (c) ctx.clip(c); };
  // A warm glow on the ground round it, breathing.
  const flick = 0.75 + 0.15 * Math.sin(t * 9.1) + 0.1 * Math.sin(t * 13.7 + 1);
  const R = 11 * s * (1 + 0.3 * heat);
  if (part !== 'sparks') {
  clipTo(smokeClip);
  const glow = ctx.createRadialGradient(x0, y0 + s, 0, x0, y0 + s, R);
  glow.addColorStop(0, `rgba(255,170,70,${Math.min(0.75, 0.30 * flick * (1 + 1.2 * heat))})`);
  glow.addColorStop(1, 'rgba(255,170,70,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x0 - R, y0 + s - R, R * 2, R * 2);
  ctx.restore();
  }
  // THE FLAME, AS A FLAME BURNS: a big red one, an orange one inside it and a
  // yellow heart inside that, each a teardrop with a rounded bottom sitting in the
  // logs, each flickering on its own beat so the colours slide over each other.
  // Two small red tongues either side lick up behind the main body.
  const tongue = (x, y, w, h, lean) => {
    ctx.beginPath();
    ctx.moveTo(x - w, y - w * 0.5);
    ctx.bezierCurveTo(x - w, y - h * 0.55, x + lean * 0.5 - w * 0.25, y - h * 0.8, x + lean, y - h);
    ctx.bezierCurveTo(x + lean * 0.5 + w * 0.25, y - h * 0.8, x + w, y - h * 0.55, x + w, y - w * 0.5);
    ctx.bezierCurveTo(x + w, y + w * 0.15, x - w, y + w * 0.15, x - w, y - w * 0.5);
    ctx.closePath();
  };
  const beat = (f, ph) => Math.sin(t * f + ph);
  // The flicker sways the height, never halves it; the heat lifts it half again.
  const lift = (0.8 + 0.25 * flick) * (1 + 0.5 * heat) * tall;
  const red = [
    [x0 - 1.3 * s, y0 - 0.1 * s, 0.8 * s, (2.6 + 0.7 * beat(8.3, 1)) * s * lift, (-0.7 + 0.4 * beat(4.1, 2)) * s],
    [x0 + 1.3 * s, y0 - 0.1 * s, 0.8 * s, (2.3 + 0.7 * beat(9.1, 4)) * s * lift, (0.7 + 0.4 * beat(3.7, 5)) * s],
    [x0, y0, 2.0 * s, (4.6 + 0.8 * beat(6.3, 0) + 0.3 * beat(15, 1)) * s * lift, 0.7 * beat(4.6, 0) * s]
  ];
  const orange = [x0 + 0.1 * s * beat(5.2, 3), y0 - 0.15 * s, 1.4 * s, (3.3 + 0.6 * beat(7.7, 2)) * s * lift, 0.6 * beat(5.3, 1) * s];
  const yellow = [x0 + 0.1 * s * beat(6.1, 5), y0 - 0.3 * s, 0.8 * s, (2.1 + 0.5 * beat(10.3, 3)) * s * lift * (1 + 0.3 * heat), 0.4 * beat(6.7, 2) * s];
  const under = part !== 'sparks', over = part !== 'under';
  if (under) {
  clipTo(flameClip);
  if (ink) {
    // One black outline round the red silhouette only: stroked first, then the
    // red filled back over it, so where tongues overlap no line shows inside.
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.2;
    ctx.lineJoin = 'round';
    for (const f of red) { tongue(...f); ctx.stroke(); }
  }
  ctx.fillStyle = ink ? '#d8321b' : 'rgba(216,50,27,0.9)';
  for (const f of red) { tongue(...f); ctx.fill(); }
  ctx.fillStyle = ink ? '#f5862a' : 'rgba(245,134,42,0.95)';
  tongue(...orange); ctx.fill();
  ctx.fillStyle = ink ? '#ffd95a' : 'rgba(255,217,90,0.95)';
  tongue(...yellow); ctx.fill();
  ctx.restore();
  }
  clipTo(smokeClip);
  // Embers, drifting up and off with the wind.
  for (let k = 0; k < 5 && under; k++) {
    const life = 1.4 + hash(k + 30) * 0.8;
    const p = ((t / life) + hash(k + 40)) % 1;
    ctx.fillStyle = `rgba(255,${150 + 60 * (1 - p) | 0},60,${0.85 * (1 - p)})`;
    ctx.beginPath();
    ctx.arc(x0 + ((hash(k) - 0.5) * 3 + 4 * p * p) * s, y0 - (3 + 13 * p) * s, 0.45 * Math.sqrt(s), 0, Math.PI * 2);
    ctx.fill();
  }
  // SPARKS, while it is stoked: bright, quick, thrown up and out of the fire — a
  // shower of them at full heat, each with a short bright streak behind it.
  if (heat > 0.05 && over) {
    const n = Math.round(26 * heat);
    for (let k = 0; k < n; k++) {
      const life = 0.3 + hash(k + 60) * 0.35;
      const p = ((t / life) + hash(k + 61)) % 1;
      const dir = (hash(k + 62) - 0.5) * 2.8;
      const reach = 6 + 4 * hash(k + 63);
      const px = q => x0 + dir * reach * 0.8 * s * q;
      const py = q => y0 - 2 * s - reach * s * q + 6 * s * q * q;
      const a = Math.min(1, heat * 1.3) * (1 - p);
      ctx.strokeStyle = `rgba(255,${240 - 80 * p | 0},${150 - 110 * p | 0},${a})`;
      ctx.lineWidth = 0.5 * Math.sqrt(s);
      ctx.beginPath();
      ctx.moveTo(px(Math.max(0, p - 0.08)), py(Math.max(0, p - 0.08)));
      ctx.lineTo(px(p), py(p));
      ctx.stroke();
      ctx.fillStyle = `rgba(255,${250 - 70 * p | 0},${190 - 140 * p | 0},${a})`;
      ctx.beginPath();
      ctx.arc(px(p), py(p), 0.45 * Math.sqrt(s), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // And a thread of smoke over it.
  for (let k = 0; k < 4 && smoke > 0 && under; k++) {
    const p = ((t / 4.5) + k / 4) % 1;
    puff(ctx, x0, y0 - 5 * s * smoke, p, 16 * s * smoke, 9 * wind(t, x0) * s * smoke, 1.2 * s * smoke, 4.8 * s * smoke, '240,236,226', 0.45);
  }
  ctx.restore();
}

// BLACK SMOKE FROM A TOWER ON A BOARD — stage 5's castle — the world map's black
// smoke at board size: heavy, slow, rolling off with the wind. `s` its size against
// the world map's, `a` how far it has thickened in (0 to 1).
export function towerSmoke(ctx, x, y, t, s, a = 1) {
  // SEPARATE CLOUDS, as on the world map: a few puffs, well spaced, each its own
  // round cloud swelling as it climbs and drifts off with the wind — not one unbroken
  // column. Each cloud is three soft blobs lumped together, so it has a body and a
  // lumpy edge, and it keeps its darkness most of the way up before thinning out.
  const N = 6;
  const w = wind(t, x);
  for (let k = 0; k < N; k++) {
    const p = ((t / 11) + k / N) % 1;
    const e = 1 - (1 - p) * (1 - p);
    const cx = x + 20 * w * s * p * p + Math.sin(p * 5 + k) * 1.2 * s;
    const cy = y - 44 * s * e;
    const r = (3.2 + 7 * p) * s;
    const alpha = a * Math.min(1, p / 0.08) * Math.pow(1 - p, 0.55);
    if (alpha <= 0.01) continue;
    ctx.globalAlpha = alpha;
    for (const [ox, oy, rr] of [[-0.45, 0.15, 0.85], [0.45, 0.1, 0.8], [0, -0.3, 0.95]]) {
      const R = r * rr * 1.5;
      ctx.drawImage(sprite('26,24,22'), cx + ox * r - R, cy + oy * r - R, R * 2, R * 2);
    }
    ctx.globalAlpha = 1;
  }
}

// --- the fountain --------------------------------------------------------------

function drawFountain(ctx, t, unlocked) {
  const f = FOUNTAIN;
  if (!awake(f.town, unlocked)) return;
  // Drops thrown up from the spout and falling back into the bowl in arcs.
  for (let k = 0; k < 16; k++) {
    const life = 0.9 + hash(k + 70) * 0.4;
    const p = ((t / life) + hash(k + 80)) % 1;
    const side = (hash(k + 90) - 0.5) * 2;          // which way this drop is thrown
    const x = f.x + side * 6.5 * p;
    const y = f.y - 4 * Math.sin(Math.PI * Math.min(1, p * 1.15)) + (f.bowl - 2 - f.y) * p * p;
    ctx.fillStyle = `rgba(236,244,246,${0.8 * (1 - p * 0.6)})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  // The jet itself, a pale column that swells and settles.
  const jet = 5.5 + Math.sin(t * 3.1) * 0.8;
  ctx.strokeStyle = 'rgba(236,244,246,0.55)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(f.x, f.y + 3);
  ctx.lineTo(f.x, f.y + 3 - jet);
  ctx.stroke();
}

// --- banners: the map's own pixels, bent ------------------------------------
//
// NOT REDRAWN, MOVED. A banner and a tree are already painted into the map, so they
// are taken off the canvas as it stands — lit, textured and inked exactly as the
// player sees them — and put back a row at a time, each row pushed a fraction of a
// pixel sideways. The top of a banner and the foot of a tree stay where they are
// and the far end swings. The canvas is copied onto itself, which it allows.
// FROM THE STILL MAP, NOT THE CANVAS. Copying pixels off the canvas while it is
// being drawn makes the device finish everything queued so far first, and doing it
// for every tree and banner — twenty-odd times a frame — was what made the map lag.
// src/overview.js hands over the still map it has already built (see stillMap
// there), which is exactly what lies under the trees and the banners, and every
// bend reads from that.
function bend(ctx, src, x0, y0, w, h, shift) {
  const m = ctx.getTransform();
  const k = m.a;
  const sx = x0 * k + m.e, sy = y0 * k + m.f;
  const sw = Math.ceil(w * k), sh = Math.ceil(h * k);
  // ONE DEVICE ROW AT A TIME. A logical row is two or three device rows on a phone,
  // and moving them together turned a smooth lean into a staircase.
  for (let r = 0; r < sh; r++) {
    const dx = shift(r / sh);
    if (Math.abs(dx) < 0.02) continue;
    ctx.drawImage(src, sx, sy + r, sw, 1, x0 + dx, y0 + r / k, sw / k, 1 / k);
  }
}

function drawBanners(ctx, t, unlocked, src) {
  BANNERS.forEach((b, i) => {
    if (!awake(b.town, unlocked)) return;
    const w = wind(t, b.x);
    // Nothing at the top, most at the foot, a ripple running down.
    bend(ctx, src, b.x - b.w / 2 - 1, b.y, b.w + 2, b.h, v =>
      w * 0.9 * v * Math.sin(t * 3.4 + i - v * 4));
  });
}


// --- birds over Oakhaven ---------------------------------------------------------
//
// A small flock now and then, low over the village and away east across the open
// grass, where a dark bird can be seen — over the woods it vanished — wings
// beating, then gone for a while.
// NOT ON A FIXED BEAT. Time is cut into 30-second slots; in each one a flock
// comes or does not, and a flock that comes has its own size (two to seven),
// path, height and moment, all drawn from the slot number so every visit sees the
// same sky but no two slots look alike.
const BIRD_SLOT = 30;
const FLIGHT = 12;                  // seconds a crossing takes

function drawBirds(ctx, t, unlocked) {
  if (!awake('oakhaven', unlocked)) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(34,26,14,0.85)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.1;
  const now = Math.floor(t / BIRD_SLOT);
  for (const n of [now - 1, now]) {
    if (hash(n * 3.1 + 7) < 0.30) continue;            // seven slots in ten carry a flock
    const start = n * BIRD_SLOT + hash(n * 5.7) * (BIRD_SLOT - FLIGHT);
    const q = (t - start) / FLIGHT;
    if (q < 0 || q > 1) continue;
    const count = 2 + Math.floor(hash(n * 9.3 + 1) * 6);
    const fromY = 100 + hash(n * 2.2) * 35, toY = 45 + hash(n * 4.4) * 35;
    const fromX = -20 + hash(n * 6.6) * 100, toX = fromX + 300 + hash(n * 8.8) * 120;
    const fade = Math.min(1, q / 0.1, (1 - q) / 0.15);
    const bx = fromX + (toX - fromX) * q;
    const by = fromY + (toY - fromY) * q - Math.sin(q * Math.PI) * 10;
    ctx.globalAlpha = fade;
    for (let j = 0; j < count; j++) {
      // A loose V: every other bird to one side, each a little further back.
      const rank = Math.ceil(j / 2), side = j % 2 ? 1 : -1;
      const ox = -rank * (8 + hash(n + j) * 4), oy = side * rank * (4 + hash(n * 2 + j) * 3);
      const x = bx + ox + Math.sin(t * 1.7 + j) * 1.2, y = by + oy + Math.cos(t * 1.3 + j * 2) * 0.8;
      const beat = Math.sin(t * 11 + j * 1.9);
      const sz = 3.6 + hash(n * 3 + j) * 1.4, drop = sz * 0.5 * beat;
      ctx.beginPath();
      ctx.moveTo(x - sz, y - drop);
      ctx.quadraticCurveTo(x - sz * 0.4, y + drop * 0.5, x, y);
      ctx.quadraticCurveTo(x + sz * 0.4, y + drop * 0.5, x + sz, y - drop);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// --- tumbleweeds across Sandshroud -----------------------------------------------
//
// Now and then one blows in off the western edge and rolls east across the sand,
// spinning and hopping, and fades before it reaches the woods.
// NOT ON A FIXED BEAT either: 25-second slots, each with none, one, two or three
// tumbleweeds — none most often — every one with its own size, line, pace and
// moment. A crossing takes ROLL seconds.
const WEED_SLOT = 25;
const ROLL = 9;

function drawTumbleweeds(ctx, t, unlocked) {
  if (!awake('sandshroud', unlocked)) return;
  ctx.save();
  const now = Math.floor(t / WEED_SLOT);
  for (const n of [now - 1, now]) {
    const roll = hash(n * 4.7 + 3);
    const count = roll < 0.2 ? 0 : roll < 0.62 ? 1 : roll < 0.88 ? 2 : 3;   // eight in ten carry some
    for (let i = 0; i < count; i++) {
      const pace = 0.75 + hash(n * 7 + i) * 0.5;
      const dur = ROLL / pace;
      const start = n * WEED_SLOT + hash(n * 3.3 + i * 11) * (WEED_SLOT - dur);
      const q = (t - start) / dur;
      if (q < 0 || q > 1) continue;
      const r = 3.4 + hash(n * 5 + i * 3) * 1.8;
      const base = 420 + hash(n * 6.1 + i * 2) * 95;
      const x = -10 + q * 380;
      const hop = Math.abs(Math.sin(q * 28 + i + n)) * 5 * (0.6 + 0.4 * Math.sin(q * 7 + n));
      const ground = base - q * 12;
      const fade = Math.min(1, q / 0.05, (1 - q) / 0.2);
      // Its shadow, on the sand under it.
      ctx.globalAlpha = 0.25 * fade;
      ctx.fillStyle = '#3a2a16';
      ctx.beginPath();
      ctx.ellipse(x, ground + r * 0.9, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // A ball of tangled twigs, spinning as it rolls.
      ctx.globalAlpha = 0.9 * fade;
      ctx.strokeStyle = '#6b4c28';
      ctx.lineWidth = 0.8;
      const spin = q * 60;
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.ellipse(x, ground - hop, r, r * (0.45 + 0.15 * k), spin + k * 0.8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

// --- Serene Peak, pristine -------------------------------------------------------
//
// THE GRASS UP BY THE LAKE A LITTLE GREENER, so the high country reads as untouched.
// The map's grass is one flat colour, so it is found by that colour and nothing
// else is touched — not the trees, the houses or the lake — and the tint fades out
// towards the edge of the peak so there is no line where it stops.
const PEAK = { x: 875, y: 55, rx: 150, ry: 95 };
const GRASS = [131, 153, 84];
let pristine = null, pristineFrom = null;

// Baked into the still map by src/overview.js rather than drawn every frame.
export function drawPristine(ctx) {
  if (!ON.pristine) return;
  const img = art.overview;
  if (!img) return;
  if (pristineFrom !== img) {
    pristineFrom = img;
    const c = document.createElement('canvas');
    c.width = 960; c.height = 540;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, 960, 540);
    const d = g.getImageData(0, 0, 960, 540);
    const px = d.data;
    for (let i = 0; i < px.length; i += 4) {
      const p = i / 4, x = p % 960, y = (p / 960) | 0;
      const e = ((x - PEAK.x) / PEAK.rx) ** 2 + ((y - PEAK.y) / PEAK.ry) ** 2;
      const grass = Math.abs(px[i] - GRASS[0]) < 12 && Math.abs(px[i + 1] - GRASS[1]) < 12 &&
        Math.abs(px[i + 2] - GRASS[2]) < 12;
      px[i] = 96; px[i + 1] = 178; px[i + 2] = 72;
      px[i + 3] = grass && e < 1 ? Math.round(255 * Math.min(1, (1 - e) * 2.5)) : 0;
    }
    g.putImageData(d, 0, 0);
    pristine = c;
  }
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.55;
  ctx.drawImage(pristine, 0, 0, 960, 540);
  ctx.restore();
}

// Called from src/overview.js over the map and under the names and the fog.
// `unlocked` is how many stages the player has reached.
// `src` is the still map the towns stand on — see stillMap in src/overview.js.
export function drawLife(ctx, t, unlocked, src) {
  if (ON.banners) drawBanners(ctx, t, unlocked, src);
  if (ON.fire) drawFire(ctx, t, unlocked);
  if (ON.fountain) drawFountain(ctx, t, unlocked);
  if (ON.smoke) drawSmoke(ctx, t, unlocked);
  if (ON.holy) drawHoly(ctx, t, unlocked);
  if (ON.birds) drawBirds(ctx, t, unlocked);
  if (ON.tumbleweeds) drawTumbleweeds(ctx, t, unlocked);
}
