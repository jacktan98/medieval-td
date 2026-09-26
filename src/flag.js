// THE EXIT FLAG: a pole that stands and a banner that waves, from ONE drawing.
//
// Drawn in two places — beside the road's exit on every board, and on the world
// map over the furthest stage reached — so it lives here rather than in either.
//
// The banner hangs from a rod at its top edge, so it is cut out along that edge
// and redrawn a couple of source rows at a time, each row pushed sideways by a
// ripple that runs down the cloth: nothing at the rod, most at the pointed tip.
// The pole behind the banner is never drawn by the artist — the banner covers it
// — so it is rebuilt from a row of the pole below the tip, or the cloth swinging
// aside would show a hole where the pole should be.
//
// All numbers are source px in assets/ui/Exit_Flag.png (512 square). The foot is
// the centre of the ground shadow, which is what every standing thing is placed by.

import { art } from './assets.js';

export const EXIT_TRIM = [216, 176, 80, 160];
export const EXIT_FOOT = [255.5, 328];
// Foot to the top of the pole, in source px — what a caller asking for a flag of
// a given height divides by.
export const EXIT_TALL = EXIT_FOOT[1] - EXIT_TRIM[1];
// The banner's outline, a little outside the artist's black edge. Its top runs
// along the rod, just above it, so the knob on the pole stays with the pole.
const EXIT_BANNER = [[212, 179], [300, 201], [300, 224], [292, 224], [292, 259],
  [256, 284], [212, 246]];
const EXIT_POLE = { x0: 246, x1: 266, row: 300, from: 186, to: 284 };
const EXIT_WAVE = { amp: 5.5, top: 190, bottom: 284, speed: 3.2, length: 58 };
const SHADOW = [54, 36, 7];      // the ground shadow's colour
const SHADOW_TOP = 316;          // and the row it starts below

let parts = null;
function layers() {
  if (parts !== null) return parts;
  const img = art.exit_flag;
  if (!img || !img.complete) return null;
  parts = false;
  try {
    const w = img.naturalWidth, h = img.naturalHeight;
    const make = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const outline = g => {
      g.beginPath();
      EXIT_BANNER.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
    };
    // The cloth: the drawing clipped to the banner's outline.
    const cloth = make(), cg = cloth.getContext('2d');
    outline(cg); cg.clip();
    cg.drawImage(img, 0, 0);
    // The pole: everything else, plus the pole rebuilt behind the banner.
    const pole = make(), pg = pole.getContext('2d');
    pg.drawImage(img, 0, 0);
    pg.globalCompositeOperation = 'destination-out';
    outline(pg); pg.fill();
    pg.globalCompositeOperation = 'destination-over';
    const { x0, x1, row, from, to } = EXIT_POLE;
    for (let y = from; y < to; y++) pg.drawImage(img, x0, row, x1 - x0, 1, x0, y, x1 - x0, 1);
    // AND THE GROUND SHADOW LIFTED OFF THE POLE, so a flag dropped from above can
    // leave its shadow on the ground rather than carry it through the air. It is the
    // flat dark ellipse at the foot, found by its colour.
    const shadow = make(), hg = shadow.getContext('2d', { willReadFrequently: true });
    const pd = pg.getImageData(0, SHADOW_TOP, w, h - SHADOW_TOP);
    const sd = hg.createImageData(w, h - SHADOW_TOP);
    const a = pd.data, b = sd.data;
    for (let i = 0; i < a.length; i += 4) {
      if (!a[i + 3]) continue;
      const tol = a[i + 3] >= 250 ? 10 : 10 + Math.round(255 / a[i + 3]);
      if (Math.abs(a[i] - SHADOW[0]) > tol || Math.abs(a[i + 1] - SHADOW[1]) > tol ||
          Math.abs(a[i + 2] - SHADOW[2]) > tol) continue;
      b[i] = a[i]; b[i + 1] = a[i + 1]; b[i + 2] = a[i + 2]; b[i + 3] = a[i + 3];
      a[i + 3] = 0;
    }
    // AND WHATEVER IS LEFT OF IT round the foot of the pole goes too — the soft rim
    // where the pole's outline blends into the shadow. Left on the pole it rose with
    // the flag as a faint dark ring. Below the shadow's top only the pole's own
    // column stays, and in it only what is not shadow-coloured at all.
    const W = w;
    for (let i = 0; i < a.length; i += 4) {
      if (!a[i + 3]) continue;
      const x = (i / 4) % W;
      const far = x < EXIT_POLE.x0 - 1 || x > EXIT_POLE.x1;
      const dim = Math.abs(a[i] - SHADOW[0]) + Math.abs(a[i + 1] - SHADOW[1]) + Math.abs(a[i + 2] - SHADOW[2]) < 60;
      if (far || dim) a[i + 3] = 0;
    }
    pg.globalCompositeOperation = 'source-over';
    pg.putImageData(pd, 0, SHADOW_TOP);
    // THE SHADOW IS DRAWN AGAIN AS ONE WHOLE ELLIPSE, over the pixels found. Found by
    // colour it has a hole where the pole's foot stood on it, and with the pole lifted
    // away that hole showed as a paler circle in the middle of it. Its size and place
    // are the found pixels' own.
    let l = W, r = -1, t = h, bt = -1;
    for (let i = 0; i < b.length; i += 4) {
      if (b[i + 3] < 128) continue;
      const x = (i / 4) % W, y = Math.floor(i / 4 / W) + SHADOW_TOP;
      l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); bt = Math.max(bt, y);
    }
    if (r >= 0) {
      hg.fillStyle = `rgb(${SHADOW.join(',')})`;
      hg.beginPath();
      hg.ellipse((l + r + 1) / 2, (t + bt + 1) / 2, (r - l + 1) / 2, (bt - t + 1) / 2, 0, 0, Math.PI * 2);
      hg.fill();
    } else {
      hg.putImageData(sd, 0, SHADOW_TOP);
    }
    parts = { cloth, pole, shadow };
  } catch {
    parts = false;
  }
  return parts;
}

// The flag with its foot at (x, y), drawn at `scale` game px per source px.
// `wind` scales the wave — 0 holds it still, 1 is a steady breeze — and `time` is
// in seconds, wall-clock by default so it waves on a paused board too. Each flag
// is put out of step with the next by where it stands. `lift` raises the flag that
// many px off the ground while its shadow stays where it would land, fainter and
// smaller the higher it is. Returns false when the drawing has not loaded, so a
// caller can fall back to its own.
export function drawExitFlag(ctx, x, y, scale, { wind = 1, time = performance.now() / 1000, lift = 0 } = {}) {
  const img = art.exit_flag;
  if (!img) return false;
  const [tx, ty, tw, th] = EXIT_TRIM;
  const left = x - (EXIT_FOOT[0] - tx) * scale;
  const top = y - (EXIT_FOOT[1] - ty) * scale;
  const got = layers();
  if (!got) {
    ctx.drawImage(img, tx, ty, tw, th, left, top, tw * scale, th * scale);
    return true;
  }
  // The shadow on the ground, then everything else `lift` px above it.
  // THE HIGHER THE FLAG, THE SMALLER AND FAINTER ITS SHADOW — shrinking about its
  // own middle as the board's flags lift away, and growing as the map's flag falls.
  const near = Math.max(0, 1 - lift / 70);
  ctx.save();
  ctx.globalAlpha *= 0.3 + 0.7 * near;
  const ss = 0.25 + 0.75 * near;
  ctx.translate(x, y);
  ctx.scale(ss, ss);
  ctx.translate(-x, -y);
  ctx.drawImage(got.shadow, tx, ty, tw, th, left, top, tw * scale, th * scale);
  ctx.restore();
  ctx.save();
  ctx.translate(0, -lift);
  ctx.drawImage(got.pole, tx, ty, tw, th, left, top, tw * scale, th * scale);

  const t = time + x * 0.013;
  const { amp, top: t0, bottom: t1, speed, length } = EXIT_WAVE;
  const STEP = 2;
  for (let sy = t0 - 14; sy < t1; sy += STEP) {
    const s = Math.max(0, Math.min(1, (sy + STEP / 2 - t0) / (t1 - t0)));
    const dx = wind * (amp * s * s * Math.sin(t * speed - (sy - t0) * (Math.PI * 2 / length))
      + amp * 0.35 * s * Math.sin(t * speed * 0.53 + 0.8));
    // A hair taller than the slice, so two neighbours overlap rather than leave a
    // seam of the board between them where they have been pushed apart.
    ctx.drawImage(got.cloth, tx - 8, sy, tw + 16, STEP,
      left + (dx - 8) * scale, top + (sy - ty) * scale, (tw + 16) * scale, STEP * scale + 0.4);
  }
  ctx.restore();
  return true;
}
