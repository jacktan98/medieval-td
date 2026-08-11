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
import { basename, join } from 'path';
import { SCALE, BLOOD_SCALE, archery, barracks, siege } from '../src/data/towers.js';
// Sprite key -> file, so a frame is checked wherever the file actually lives.
// The paths are URL-encoded for the browser; decode them to read from disk.
import { paths as ASSET_URLS } from '../src/assets.js';
import { ui, uiSize, PORTRAIT_SCALE } from '../src/data/ui.js';
import { HUD_BTN, INFO_BOX } from '../src/render.js';

// The three plates are sized by the renderer, not by data/ui.js — their widths
// are derived from these very trims at a fixed height. Read the boxes back so
// the sharpness verdict is against what is actually drawn.
const PLATES = {
  plate_speed: HUD_BTN.speed,
  plate_wave: HUD_BTN.wave,
  plate_info: INFO_BOX
};

// Art that is not drawn at the shared SCALE. Without this the sharpness verdict
// lies in the most dangerous direction: blood measures 17 source px and would be
// reported as a comfortably sharp 3x3 sprite, when the game actually draws it at
// 14px and upscales it two and a half times.
//
// Keyed on the FILENAME rather than the folder, which is why moving all four
// blood files into assets/effects changed nothing here. Worth keeping that way:
// the folder is where a thing was uploaded and the name is what it is.
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

const ASSET_PATHS = Object.fromEntries(
  Object.entries(ASSET_URLS).map(([k, v]) => [k, decodeURIComponent(v)])
);

const dirs = ['towers', 'units', 'enemies', 'projectiles', 'dead', 'effects', 'ui'];

// Walks subfolders, because assets/towers now has one per family — archery,
// barracks, artillery. A flat readdir silently measured nothing after that move,
// which is the worst way for this tool to fail: it prints a clean table of the
// files it CAN see and says nothing about the ones it cannot.
//
// Returns paths relative to `assets` so the rest of the loop is unchanged, and
// the folder-level rules below (`d === 'ui'`) still key off the top-level name.
function pngsUnder(dir) {
  let entries;
  try { entries = readdirSync(join('assets', dir), { withFileTypes: true }); }
  catch { return []; }

  const here = entries.filter(e => e.isFile() && e.name.endsWith('.png'))
    .map(e => join(dir, e.name));
  const below = entries.filter(e => e.isDirectory())
    .flatMap(e => pngsUnder(join(dir, e.name)));

  return [...here, ...below].sort();
}

// Which data/ui.js entry a UI file belongs to. assets.js holds the paths, so the
// filename is matched back through it — that way a renamed upload shows up here
// as "not referenced" instead of being silently skipped.
const UI_FILES = {
  'Speed_Box.png': 'plate_speed',
  'Next_Wave_Box.png': 'plate_wave',
  'Description_Box.png': 'plate_info',
  'Damage_Icon.png': 'stat_damage',
  'Health_Icon.png': 'stat_health',
  'Gold_Icon.png': 'hud_gold',
  'Life_Icon.png': 'hud_life',
  'Button_Plate_Icon.png': 'btn_plate',
  'Cancel_Button_Icon.png': 'btn_cancel',
  'Archers_Icon.png': 'glyph_bow',
  'Barracks_Icon.png': 'glyph_swords',
  'Upgrade_Icon.png': 'glyph_up',
  'Sell_Icon.png': 'glyph_coin',
  'Rally_Point_Icon.png': 'glyph_flag'
};
const uiKey = f => UI_FILES[f];
let soft = 0;

console.log('sprite                              export   trim                  drawn    3x needs  source  verdict');

for (const d of dirs) {
  for (const rel of pngsUnder(d)) {
    const path = join('assets', rel);
    const f = basename(rel);
    const img = decode(readFileSync(path));
    const t = trim(img);
    if (!t) { console.log(`${path.padEnd(35)} fully transparent`); continue; }

    // UI is the one folder where the drawn size does NOT come from a scale
    // factor. A button is 60px because a thumb needs 60px; an icon is 24px tall
    // because the number beside it is 20px. So its size is looked up rather than
    // multiplied — and a UI file with no entry in data/ui.js is reported as
    // unused rather than measured against a scale that does not apply to it.
    let dw, dh;
    if (d === 'ui') {
      const key = uiKey(f);
      if (!key) { console.log(`${path.padEnd(35)} not referenced by src/data/ui.js`); continue; }
      // Every UI entry carries the box it is actually drawn at — except the
      // three plates, which are drawn to a rect derived elsewhere, so their
      // sizes come from the renderer's own boxes rather than being guessed.
      const plate = PLATES[key];
      if (plate) { dw = plate.w; dh = plate.h; }
      else ({ w: dw, h: dh } = uiSize(key));
    } else {
      const s = scaleFor(f);
      dw = t[2] * s;
      dh = t[3] * s;
    }
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

// The info box draws FIGURES, not UI art, and at PORTRAIT_SCALE times the board
// scale rather than the board scale itself. That multiplier is the one number
// that can quietly make every portrait soft at once — it is the same ratio for
// every sprite, because a figure's source pixels and its drawn size scale
// together, so one comparison covers all of them.
//
// This is what caught the blur: the box used to FIT each portrait into a 68px
// square, which drew a 114px sprite at 68 and wanted 204 source pixels it did
// not have. Sizing by a multiple instead makes the question answerable once.
{
  const ceiling = 1 / (MAX_DPR * SCALE);
  const ok = PORTRAIT_SCALE <= ceiling;
  console.log(
    `\ninfo-box portraits: ${PORTRAIT_SCALE}x board scale, ceiling ${ceiling.toFixed(3)}x  ` +
    (ok ? 'sharp' : `SOFT, upscaled ${(PORTRAIT_SCALE / ceiling).toFixed(2)}x`)
  );
  if (!ok) process.exitCode = 1;
}

// The front layer — the roof and near post a tier 2 tower draws OVER its archer
// — is rects of source pixels, and it is the one set of numbers here that has no
// picture to check itself against. A rect that falls outside its sprite's trim
// after a re-export still draws, just in the wrong place and at the wrong size,
// and it looks like a bad mount rather than a stale number. Catch it here.
{
  let bad = 0;
  for (const def of [...archery, ...barracks]) {
    if (!def.frontTrims) continue;
    const [tx, ty, tw, th] = def.spriteTrim;
    for (const r of def.frontTrims) {
      if (r[0] >= tx && r[1] >= ty && r[0] + r[2] <= tx + tw && r[1] + r[3] <= ty + th) continue;
      console.log(`\n${def.name}: frontTrim [${r}] falls outside spriteTrim [${def.spriteTrim}]`);
      bad++;
    }
  }
  if (bad) {
    console.log('Re-measure the front rects against the new export — see assets/towers/README.md.');
    process.exitCode = 1;
  }
}

// An ANIMATED building draws several files into ONE box, so its spriteTrim is
// the union of its frames' own trims rather than any single measured rect. That
// is the one trim in the project the table above cannot verify by printing —
// it will never match a frame — so the union property is checked directly here.
//
// What goes wrong without it: a frame whose art reaches outside the shared box
// is silently CROPPED, and the crop lands on whatever part of the drawing the
// artist added. On this catapult that is the top of the raised arm, so a redraw
// that swung it a little higher would quietly saw the bucket off at the moment
// of firing and nothing anywhere would say so.
{
  let bad = 0;
  for (const def of [...archery, ...barracks, ...siege]) {
    if (!def.frames) continue;
    const [tx, ty, tw, th] = def.spriteTrim;
    for (const key of def.frames) {
      const file = ASSET_PATHS[key];
      if (!file) { console.log(`\n${def.name}: frame '${key}' has no path in src/assets.js`); bad++; continue; }
      const t = trim(decode(readFileSync(file)));
      if (t[0] >= tx && t[1] >= ty && t[0] + t[2] <= tx + tw && t[1] + t[3] <= ty + th) continue;
      console.log(`\n${def.name}: frame '${key}' trims to [${t}], outside spriteTrim [${def.spriteTrim}]`);
      bad++;
    }
  }
  if (bad) {
    console.log('Widen spriteTrim to the union of every frame — see CATAPULT_TRIM in src/data/towers.js.');
    process.exitCode = 1;
  } else {
    console.log('Every animation frame fits inside its shared trim.');
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
