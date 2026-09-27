// SANDSHROUD'S WIND, at the owner's word: "random tumbleweeds that roll from left to
// right that vanish after a while, just like the one you made in the overview map",
// and "some wind effects that show that the wind carries sand".
//
// TUMBLEWEEDS, the owner's two drawings: now and then one blows in off the left
// edge of the board and rolls east, spinning and bouncing, and fades out somewhere
// along the way. Not on a beat: slots of WEED_SLOT seconds, each with none, one or
// two, every one with its own drawing, size, line, pace and distance. Sorted among
// the figures by where it touches the ground, so it rolls behind a house and in
// front of a man — see `weeds` and its caller in src/render.js.
//
// SAND ON THE WIND: fine streaks of sand racing east low over the board, and now and
// then a gust — a soft band of dust sweeping across. Laid over the board and the
// figures, under the health bars and the interface. Faint on purpose: the wind is
// the room the battle is in, not the battle.
//
// A level asks for both with `desert: true`. On the board's clock, so a paused board
// holds still.
import { art } from './assets.js';
import { SCALE } from './data/towers.js';

const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const WEED_SLOT = 9;             // seconds
const WEED_DRAWINGS = ['vill_tumbleweed_1', 'vill_tumbleweed_2'];
const WEED_MID = [256, 256];     // the middle of the ball on the drawings' 512 canvas
const WEED_R = 64;               // and about its radius there

// Every tumbleweed on the board at `t`: where it is, how big, turned how far, how
// high off the ground and how strongly drawn.
export function weeds(t) {
  const out = [];
  const now = Math.floor(t / WEED_SLOT);
  for (let n = now - 3; n <= now; n++) {
    const roll = hash(n * 4.7 + 3);
    const count = roll < 0.35 ? 0 : roll < 0.8 ? 1 : 2;
    for (let i = 0; i < count; i++) {
      const pace = 55 + hash(n * 7 + i) * 35;                 // px a second
      const far = 320 + hash(n * 2.9 + i * 5) * 520;          // how far before it fades
      const dur = (far + 30) / pace;
      const start = n * WEED_SLOT + hash(n * 3.3 + i * 11) * WEED_SLOT;
      const k = t - start;
      if (k < 0 || k > dur) continue;
      const d = k * pace;
      const size = 0.85 + hash(n * 5 + i * 3) * 0.5;          // against the drawing
      const r = WEED_R * SCALE * 0.62 * size;                 // board px
      const y = 90 + hash(n * 6.1 + i * 2) * 420 + 10 * Math.sin(d / 90 + n);
      // Bouncing along: a hop a little over its own width, higher now and then.
      const hop = Math.abs(Math.sin(d / (r * 3.2) + i + n)) * r * (0.5 + 0.5 * hash(n + i + Math.floor(d / 60)));
      out.push({
        img: WEED_DRAWINGS[(n + i) % 2 === 0 ? 0 : 1], x: -30 + d, y, r, size,
        rot: d / r, hop, alpha: Math.min(1, k / 0.4, (dur - k) / 1.6)
      });
    }
  }
  return out;
}

export function drawWeed(ctx, w) {
  const img = art[w.img];
  if (!img) return;
  ctx.save();
  // Its shadow on the sand, smaller and paler the higher it bounces.
  const lift = 1 - Math.min(0.5, w.hop / (w.r * 4));
  ctx.globalAlpha = 0.22 * w.alpha * lift;
  ctx.fillStyle = '#5a4020';
  ctx.beginPath();
  ctx.ellipse(w.x, w.y, w.r * 0.95 * lift, w.r * 0.3 * lift, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = w.alpha;
  ctx.translate(w.x, w.y - w.r - w.hop);
  ctx.rotate(w.rot);
  const k = (w.r / WEED_R);
  ctx.drawImage(img, -WEED_MID[0] * k, -WEED_MID[1] * k, 512 * k, 512 * k);
  ctx.restore();
}

// --- sand on the wind ------------------------------------------------------------

const STREAKS = 35;             // halved at the owner's word, and halved again
const SAND = '255,247,226';       // the grains: sand in the sun, paler than the ground
const DUST = '196,158,104';       // the gusts: a haze of it, darker than the ground

// A soft sand-coloured puff, drawn once and stamped for the gusts.
let puff = null;
function dust() {
  if (puff) return puff;
  puff = document.createElement('canvas');
  puff.width = puff.height = 64;
  const g = puff.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `rgba(${DUST},1)`);
  grad.addColorStop(1, `rgba(${DUST},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return puff;
}

export function drawSandWind(ctx, t) {
  ctx.save();
  // GUSTS: now and then a broad soft band of dust sweeps across the board, low and
  // long, rising and thinning as it goes. Slots of 4.7 seconds, most with one — half
  // as many again as the 7 they were, at the owner's word.
  const slot = 4.7, now = Math.floor(t / slot);
  for (let n = now - 2; n <= now; n++) {
    if (hash(n * 1.7 + 9) < 0.25) continue;
    const dur = 5 + hash(n * 2.3) * 3;
    const k = t - (n * slot + hash(n * 3.1) * slot);
    if (k < 0 || k > dur) continue;
    const q = k / dur;
    const y = 120 + hash(n * 4.3) * 380;
    const head = -250 + q * 1450;
    const strength = Math.sin(Math.PI * q);
    for (let j = 0; j < 14; j++) {
      const x = head - j * 26 - hash(n * 9 + j) * 20;
      const r = 26 + hash(n * 11 + j) * 26;
      const yy = y + (hash(n * 13 + j) - 0.5) * 34 - q * 12 + 6 * Math.sin(x / 60 + n);
      ctx.globalAlpha = 0.16 * strength * (1 - j / 16);
      ctx.drawImage(dust(), x - r * 1.6, yy - r * 0.5, r * 3.2, r);
    }
  }
  // STREAKS: grains of sand racing east, each on a line of its own that ripples a
  // little, fading in and out, a few in the air at any moment everywhere.
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round';
  for (let i = 0; i < STREAKS; i++) {
    const speed = 170 + hash(i + 1) * 170;
    const span = 960 + 120;
    const life = span / speed;
    const p = ((t / life) + hash(i + 2)) % 1;
    const round = Math.floor(t / life + hash(i + 2));
    const x = -60 + p * span;
    const y0 = 20 + hash(i * 7 + round * 13) * 510;
    const y = y0 + 5 * Math.sin(x / 70 + i) + p * 10;
    const len = 7 + hash(i + 3) * 13;
    const a = (0.35 + hash(i + 4) * 0.4) * Math.min(1, p / 0.08, (1 - p) / 0.08);
    // Most in the sun's colour, pale against the road; some darker, to show on the
    // pale sand.
    ctx.strokeStyle = `rgba(${hash(i + 6) < 0.6 ? SAND : DUST},${a})`;
    ctx.lineWidth = 0.7 + hash(i + 5) * 0.7;
    ctx.beginPath();
    ctx.moveTo(x - len, y - 5 * Math.cos(x / 70 + i) * len / 70);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  ctx.restore();
}
