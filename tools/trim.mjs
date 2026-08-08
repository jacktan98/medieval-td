// Prints the trim rect of every sprite, measured from its alpha channel, plus
// how sharp each one will be on a phone. Run after re-exporting artwork:
//
//   node tools/trim.mjs
//
// The trims in src/data/towers.js and src/data/waves.js are pasted from here.
// Measuring beats guessing: a hand-typed trim that is a few pixels off shifts
// the sprite on its mount, and the error looks like a bad pivot rather than a
// bad number, which is a slow thing to chase.

import { readFileSync, readdirSync } from 'fs';
import { inflateSync } from 'zlib';
import { join } from 'path';
import { SCALE, BLOOD_SCALE } from '../src/data/towers.js';

// Art that is not drawn at the shared SCALE. Without this the sharpness verdict
// lies in the most dangerous direction: blood measures 17 source px and would be
// reported as a comfortably sharp 3x3 sprite, when the game actually draws it at
// 14px and upscales it two and a half times.
const scaleFor = file => /Blood/i.test(file) ? BLOOD_SCALE : SCALE;

// Decode enough PNG to reach the alpha channel: 8-bit RGBA or grey+alpha, which
// is what every export tool produces for transparent art.
function decode(buf) {
  let i = 8, idat = [], w = 0, h = 0, depth = 0, colour = 0;
  while (i < buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('ascii', i + 4, i + 8);
    if (type === 'IHDR') {
      w = buf.readUInt32BE(i + 8); h = buf.readUInt32BE(i + 12);
      depth = buf[i + 16]; colour = buf[i + 17];
    } else if (type === 'IDAT') idat.push(buf.subarray(i + 8, i + 8 + len));
    else if (type === 'IEND') break;
    i += 12 + len;
  }
  if (depth !== 8) throw new Error(`bit depth ${depth} unsupported`);
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[colour];
  if (!ch) throw new Error(`colour type ${colour} unsupported (needs an alpha channel)`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const px = Buffer.alloc(stride * h);
  let prev = Buffer.alloc(stride), pos = 0;

  for (let y = 0; y < h; y++) {
    const f = raw[pos++];
    const line = Buffer.from(raw.subarray(pos, pos + stride));
    pos += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? line[x - ch] : 0;
      const b = prev[x];
      const c = x >= ch ? prev[x - ch] : 0;
      if (f === 1) line[x] = (line[x] + a) & 255;
      else if (f === 2) line[x] = (line[x] + b) & 255;
      else if (f === 3) line[x] = (line[x] + ((a + b) >> 1)) & 255;
      else if (f === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        line[x] = (line[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
    }
    line.copy(px, y * stride);
    prev = line;
  }
  return { w, h, ch, px };
}

// Ignore near-transparent pixels: anti-aliased edges otherwise pad every trim
// by a pixel or two, which reads as the art having shifted.
const ALPHA = 8;

function trim({ w, h, ch, px }) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = px[(y * w + x) * ch + ch - 1];
      if (a > ALPHA) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}

const MAX_DPR = 3;     // MAX_SCALE in src/main.js

const dirs = ['towers', 'units', 'enemies', 'projectiles', 'dead'];
let soft = 0;

console.log('sprite                              export   trim                  drawn    3x needs  source  verdict');

for (const d of dirs) {
  let files;
  try { files = readdirSync(join('assets', d)).filter(f => f.endsWith('.png')).sort(); }
  catch { continue; }

  for (const f of files) {
    const path = join('assets', d, f);
    const img = decode(readFileSync(path));
    const t = trim(img);
    if (!t) { console.log(`${path.padEnd(35)} fully transparent`); continue; }

    const s = scaleFor(f);
    const dw = t[2] * s, dh = t[3] * s;
    // The tallest the sprite is ever rasterised: drawn size times the device
    // pixel cap. If the source has fewer pixels than that, it is being blown up.
    const need = Math.max(dw, dh) * MAX_DPR;
    const have = Math.max(t[2], t[3]);
    const ratio = need / have;
    const ok = ratio <= 1;
    if (!ok) soft++;

    console.log(
      `${path.padEnd(35)} ${String(img.w).padStart(4)}px  ` +
      `[${t.join(',')}]`.padEnd(20) +
      ` ${dw.toFixed(0)}x${dh.toFixed(0)}`.padEnd(9) +
      ` ${need.toFixed(0)}px`.padEnd(10) +
      ` ${have}px`.padEnd(8) +
      (ok ? 'sharp' : `SOFT, upscaled ${ratio.toFixed(2)}x`)
    );
  }
}

if (soft) {
  console.log(
    `\n${soft} sprite(s) get upscaled at 3x device pixels, which is why they` +
    `\nlook soft on a phone and fine on a laptop (a laptop asks for 1x).` +
    `\n` +
    `\nThere are two different causes and two different fixes:` +
    `\n  - the whole export is too small: re-export on a larger canvas and raise` +
    `\n    SCALE by the same factor, and every drawn size stays identical.` +
    `\n  - the ART is small inside a big enough canvas, which is what the blood` +
    `\n    does: 512 is plenty, but the splash only fills 17px of it. Redraw it` +
    `\n    LARGER on the same canvas. Nothing in the code changes — the trim is` +
    `\n    re-measured from here and the drawn size is set by BLOOD_SCALE.`
  );
} else {
  console.log('\nEvery sprite has enough source pixels for a 3x display.');
}
