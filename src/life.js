// THE TOWNS ON THE WORLD MAP, ALIVE: smoke from Ironforge and from the castles
// and workshops, Oakhaven's campfire, the castle banners, Dawnford's fountain and
// the holy light on it, and the trees in the wind. At the owner's ask, alongside
// the water in src/motion.js.
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

const ON = { smoke: true, holy: true, fire: true, banners: true, fountain: true, trees: true };

// The first stage of each town, by index into STAGES — the town wakes when the
// player has reached it.
const TOWN = { oakhaven: 0, winchester: 2, dawnford: 5, ironforge: 9 };

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
  { x: 709, y: 346, w: 5, h: 12, town: 'ironforge' }
];

const FOUNTAIN = { x: 517.5, y: 264, bowl: 276, town: 'dawnford' };

// A tree: where its canopy meets its trunk, how wide the canopy is either side,
// and how tall. The trunk stays; the crown sways.
const TREES = [
  { x: 136, y: 46, w: 14, h: 20, town: 'oakhaven' },
  { x: 160, y: 60, w: 14, h: 20, town: 'oakhaven' },
  { x: 265, y: 64, w: 13, h: 18, town: 'winchester' },
  { x: 372, y: 55, w: 14, h: 20, town: 'winchester' },
  { x: 571, y: 186, w: 14, h: 18, town: 'dawnford' },
  { x: 566, y: 290, w: 15, h: 20, town: 'dawnford' },
  { x: 782, y: 243, w: 14, h: 20, town: 'ironforge' },
  { x: 802, y: 262, w: 14, h: 18, town: 'ironforge' },
  { x: 724, y: 291, w: 14, h: 18, town: 'ironforge' },
  { x: 941, y: 290, w: 14, h: 18, town: 'ironforge' },
  { x: 784, y: 324, w: 13, h: 18, town: 'ironforge' },
  { x: 856, y: 364, w: 14, h: 20, town: 'ironforge' },
  { x: 926, y: 366, w: 14, h: 20, town: 'ironforge' },
  { x: 737, y: 380, w: 13, h: 18, town: 'ironforge' }
];

const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const awake = (town, unlocked) => unlocked > TOWN[town];

// The wind: from the west, gusting. Everything that leans leans with this.
const wind = (t, x) => 0.6 + 0.4 * Math.sin(t * 0.37 - x * 0.006) * Math.sin(t * 0.23 + 1.3);

// --- smoke -------------------------------------------------------------------

function puff(ctx, x, y, p, rise, drift, r0, r1, rgb, alpha) {
  const e = 1 - (1 - p) * (1 - p);
  const px = x + drift * p * p + Math.sin(p * 5 + x) * 0.8;
  const py = y - rise * e;
  const r = r0 + (r1 - r0) * p;
  const a = alpha * Math.min(1, p / 0.15) * (1 - p);
  if (a <= 0.005) return;
  const g = ctx.createRadialGradient(px, py, 0, px, py, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(px - r, py - r, r * 2, r * 2);
}

function drawSmoke(ctx, t, unlocked) {
  HOUSE_SMOKE.forEach((c, i) => {
    if (!awake(c.town, unlocked)) return;
    const w = wind(t, c.x);
    for (let k = 0; k < 9; k++) {
      const p = ((t / 5.2) + k / 9 + hash(i)) % 1;
      // A PALE grey: a mid grey is the grass's own brightness and vanished into it.
      puff(ctx, c.x, c.y, p, 22, 10 * w, 1.8, 6.2, '204,200,194', 0.85);
    }
  });
  BLACK_SMOKE.forEach((c, i) => {
    if (!awake(c.town, unlocked)) return;
    const w = wind(t, c.x);
    // SLOW, at the owner's word: heavy smoke hangs and rolls rather than streams.
    for (let k = 0; k < 12; k++) {
      const p = ((t / 7.5) + k / 12 + hash(i + 50)) % 1;
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
// SHAFTS OF LIGHT FALLING ON THE TOWN, at the owner's ask: subtle, and alive. A
// fan of soft rays from high above the island, each one slowly widening,
// brightening and fading on its own beat so the light seems to breathe, and a few
// motes of light drifting down through it. Laid on with `screen`, so it lightens
// what is there without covering it.
// THE WHOLE ISLAND IS LIT, and the light gathers on the church and the High Altar:
// the rays fan out to reach every shore, and the ones aimed at those two buildings
// are the brightest and the widest.
const HOLY = { x: 470, y: -60, town: 'dawnford', reach: 440, from: 0.95, to: 2.08, focus: 1.60 };
const RAYS = 18;
const ISLAND = { x: 512, y: 252, rx: 235, ry: 95 };
const SHRINE = { x: 462, y: 262, rx: 72, ry: 44 };   // the church and the High Altar

function drawHoly(ctx, t, unlocked) {
  const h = HOLY;
  if (!awake(h.town, unlocked)) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < RAYS; i++) {
    const a = h.from + (h.to - h.from) * (i + 0.5 + (hash(i) - 0.5) * 0.6) / RAYS
      + 0.015 * Math.sin(t * 0.21 + i);
    const near = Math.exp(-(((a - h.focus) / 0.22) ** 2));      // 1 on the shrine
    const width = (0.022 + 0.02 * hash(i + 10)) * (1 + near)
      + 0.008 * Math.sin(t * 0.5 + i * 1.7);
    const glow = (0.05 + 0.06 * (0.5 + 0.5 * Math.sin(t * (0.35 + hash(i + 20) * 0.3) + i * 2.1)))
      * (0.55 + 0.9 * near);
    const len = h.reach * (0.85 + 0.15 * hash(i + 30));
    const g = ctx.createLinearGradient(h.x, h.y, h.x + Math.cos(a) * len, h.y + Math.sin(a) * len);
    // Dark until the rays reach the island, so Winchester across the river is not
    // lit with it.
    g.addColorStop(0, 'rgba(255,238,180,0)');
    g.addColorStop(0.5, 'rgba(255,238,180,0)');
    g.addColorStop(0.7, `rgba(255,236,170,${glow})`);
    g.addColorStop(0.88, `rgba(255,232,160,${glow * 0.8})`);
    g.addColorStop(1, 'rgba(255,232,160,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(h.x, h.y);
    ctx.lineTo(h.x + Math.cos(a - width) * len, h.y + Math.sin(a - width) * len);
    ctx.lineTo(h.x + Math.cos(a + width) * len, h.y + Math.sin(a + width) * len);
    ctx.closePath();
    ctx.fill();
  }
  // Warmth over the whole island, and more of it on the shrine.
  const breathe = 0.5 + 0.5 * Math.sin(t * 0.4);
  for (const [e, a] of [[ISLAND, 0.05 + 0.015 * breathe], [SHRINE, 0.10 + 0.03 * breathe]]) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(1, e.ry / e.rx);
    const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, e.rx);
    pool.addColorStop(0, `rgba(255,236,170,${a})`);
    pool.addColorStop(1, 'rgba(255,236,170,0)');
    ctx.fillStyle = pool;
    ctx.fillRect(-e.rx, -e.rx, e.rx * 2, e.rx * 2);
    ctx.restore();
  }
  // Motes of light drifting down through the rays, most of them over the shrine.
  for (let k = 0; k < 24; k++) {
    const life = 6 + hash(k + 40) * 5;
    const p = ((t / life) + hash(k + 50)) % 1;
    const wide = k % 3 === 0 ? SHRINE : ISLAND;
    const x = wide.x + (hash(k + 60) - 0.5) * wide.rx * 1.6 + Math.sin(t * 0.6 + k) * 4;
    const y = wide.y - wide.ry * 0.9 + hash(k + 70) * wide.ry * 1.4 + p * 25;
    const r = 0.8 + hash(k + 80) * 1.6;
    const a = 0.45 * Math.sin(Math.PI * p);
    const m = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
    m.addColorStop(0, `rgba(255,245,205,${a})`);
    m.addColorStop(1, 'rgba(255,245,205,0)');
    ctx.fillStyle = m;
    ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
  }
  ctx.restore();
}

// --- the campfire --------------------------------------------------------------

function drawFire(ctx, t, unlocked) {
  const f = CAMPFIRE;
  if (!awake(f.town, unlocked)) return;
  // A warm glow on the ground round it, breathing.
  const flick = 0.75 + 0.15 * Math.sin(t * 9.1) + 0.1 * Math.sin(t * 13.7 + 1);
  const glow = ctx.createRadialGradient(f.x, f.y + 1, 0, f.x, f.y + 1, 11);
  glow.addColorStop(0, `rgba(255,170,70,${0.30 * flick})`);
  glow.addColorStop(1, 'rgba(255,170,70,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(f.x - 11, f.y - 10, 22, 22);
  // Flames: three tongues licking up out of the logs, each its own height.
  for (let k = 0; k < 3; k++) {
    const h = (3.2 + 1.4 * Math.sin(t * (7 + k * 2.3) + k * 2)) * flick;
    const x = f.x - 1.2 + k * 1.2;
    const lean = Math.sin(t * 5 + k) * 0.6;
    ctx.fillStyle = k === 1 ? 'rgba(255,214,110,0.95)' : 'rgba(240,120,50,0.9)';
    ctx.beginPath();
    ctx.moveTo(x - 1, f.y);
    ctx.quadraticCurveTo(x - 0.9, f.y - h * 0.5, x + lean, f.y - h);
    ctx.quadraticCurveTo(x + 0.9, f.y - h * 0.5, x + 1, f.y);
    ctx.closePath();
    ctx.fill();
  }
  // Embers, drifting up and off with the wind.
  for (let k = 0; k < 5; k++) {
    const life = 1.4 + hash(k + 30) * 0.8;
    const p = ((t / life) + hash(k + 40)) % 1;
    ctx.fillStyle = `rgba(255,${150 + 60 * (1 - p) | 0},60,${0.85 * (1 - p)})`;
    ctx.beginPath();
    ctx.arc(f.x + (hash(k) - 0.5) * 3 + 4 * p * p, f.y - 3 - 13 * p, 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  // And a thread of smoke over it.
  for (let k = 0; k < 4; k++) {
    const p = ((t / 4.5) + k / 4) % 1;
    puff(ctx, f.x, f.y - 5, p, 16, 9 * wind(t, f.x), 1.2, 4.8, '240,236,226', 0.45);
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

// --- banners and trees: the map's own pixels, bent ----------------------------
//
// NOT REDRAWN, MOVED. A banner and a tree are already painted into the map, so they
// are taken off the canvas as it stands — lit, textured and inked exactly as the
// player sees them — and put back a row at a time, each row pushed a fraction of a
// pixel sideways. The top of a banner and the foot of a tree stay where they are
// and the far end swings. The canvas is copied onto itself, which it allows.
const scratch = typeof document !== 'undefined' ? document.createElement('canvas') : null;
function bend(ctx, x0, y0, w, h, shift) {
  const m = ctx.getTransform();
  const k = m.a;
  // ONE READ OF THE CANVAS PER THING, into a scratch sheet, and the rows are cut from
  // that. Reading the canvas row by row copied the whole canvas every time and
  // brought a large screen to a standstill.
  const sw = Math.ceil(w * k), sh = Math.ceil(h * k);
  if (scratch.width < sw) scratch.width = sw;
  if (scratch.height < sh) scratch.height = sh;
  const g = scratch.getContext('2d');
  g.clearRect(0, 0, sw, sh);
  g.drawImage(ctx.canvas, x0 * k + m.e, y0 * k + m.f, sw, sh, 0, 0, sw, sh);
  // ONE DEVICE ROW AT A TIME. A logical row is two or three device rows on a phone,
  // and moving them together turned a smooth lean into a staircase.
  for (let r = 0; r < sh; r++) {
    const dx = shift(r / sh);
    if (Math.abs(dx) < 0.02) continue;
    ctx.drawImage(scratch, 0, r, sw, 1, x0 + dx, y0 + r / k, sw / k, 1 / k);
  }
}

function drawBanners(ctx, t, unlocked) {
  BANNERS.forEach((b, i) => {
    if (!awake(b.town, unlocked)) return;
    const w = wind(t, b.x);
    // Nothing at the top, most at the foot, a ripple running down.
    bend(ctx, b.x - b.w / 2 - 1, b.y, b.w + 2, b.h, v =>
      w * 0.9 * v * Math.sin(t * 3.4 + i - v * 4));
  });
}

function drawTrees(ctx, t, unlocked) {
  TREES.forEach((tr, i) => {
    if (!awake(tr.town, unlocked)) return;
    // A gust crosses the map west to east, so neighbouring trees lean in turn.
    const gust = wind(t, tr.x);
    const sway = 0.55 * gust * Math.sin(t * 1.3 - tr.x * 0.02 + hash(i) * 2)
      + 0.2 * Math.sin(t * 2.9 + i);
    // v is 0 at the top of the crown and 1 where it meets the trunk.
    bend(ctx, tr.x - tr.w - 1, tr.y - tr.h, tr.w * 2 + 2, tr.h, v => sway * (1 - v) * (1 - v));
  });
}

// Called from src/overview.js over the map and under the names and the fog.
// `unlocked` is how many stages the player has reached.
export function drawLife(ctx, t, unlocked) {
  if (ON.trees) drawTrees(ctx, t, unlocked);
  if (ON.banners) drawBanners(ctx, t, unlocked);
  if (ON.fire) drawFire(ctx, t, unlocked);
  if (ON.fountain) drawFountain(ctx, t, unlocked);
  if (ON.smoke) drawSmoke(ctx, t, unlocked);
  if (ON.holy) drawHoly(ctx, t, unlocked);
}
