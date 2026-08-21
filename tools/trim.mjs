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
import { basename, join } from 'path';
import { decode } from './png.mjs';
import { SCALE, BLOOD_SCALE, archery, barracks, siege, monastery } from '../src/data/towers.js';
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

// Ignore near-transparent pixels: anti-aliased edges otherwise pad every trim
// by a pixel or two, which reads as the art having shifted.
const ALPHA = 8;

function trim({ w, h, ch, px }, byInk = false) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      const a = px[i + ch - 1];
      // BY ALPHA normally, and BY INK for a full-plate button that came in OPAQUE —
      // see the `plate` entries in src/data/ui.js. Three of the four ability icons
      // arrived as a coloured disc on a white square, and on those every pixel of
      // the canvas passes the alpha test, so the box comes back as the whole 512.
      // What is actually drawn is the disc, and the disc is what is not white.
      //
      // The artist has since re-exported them clear, and the caller only asks for
      // ink when a file is still opaque — see `byInk` at the call. Alpha is the
      // truthful measure when there is alpha to read: ink would quietly drop a
      // white highlight inside the disc, which is a plausible thing to draw.
      const lit = byInk
        ? a > ALPHA && (px[i] < 250 || px[i + 1] < 250 || px[i + 2] < 250)
        : a > ALPHA;
      if (lit) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}

// Whether a file has a background: nine tenths of its pixels solid or better.
//
// The measure the transparency rule below runs on, hoisted out because the trim
// above needs the same answer. WHICH FILE IS OPAQUE IS A FACT ABOUT THE FILE, not
// about how it is used, and asking it per file is what lets one rule cover both
// versions of an ability icon — the white-square export and the clear one — with
// nothing to remember to change on the next upload.
const opaque = img => {
  let solid = 0;
  for (let p = 0; p < img.w * img.h; p++) if (img.px[p * img.ch + img.ch - 1] > 200) solid++;
  return solid / (img.w * img.h) >= 0.9;
};

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

// Which data/ui.js entry a UI file belongs to, DERIVED from assets.js rather
// than listed here. This used to be a hand-written filename -> key map beside a
// comment claiming the paths came from assets.js, and the gap between the two
// cost a measurement: Cost_Icon.png landed, was wired up in assets.js and
// data/ui.js, and this tool still reported it "not referenced" because the map
// had never heard of it. A tool that has to be edited before it can see a new
// file is a tool that quietly under-reports.
//
// Keys with no data/ui.js entry are left out on purpose, so a file wired into
// assets.js but never given a box still reports as unreferenced.
const UI_FILES = Object.fromEntries(
  Object.entries(ASSET_URLS)
    .filter(([key, src]) => src.startsWith('assets/ui/') && ui[key])
    .map(([key, src]) => [basename(src), key])
);
const uiKey = f => UI_FILES[f];
let soft = 0;

console.log('sprite                              export   trim                  drawn    3x needs  source  verdict');

for (const d of dirs) {
  for (const rel of pngsUnder(d)) {
    const path = join('assets', rel);
    const f = basename(rel);
    const img = decode(readFileSync(path));
    // A full-plate button that is OPAQUE is measured by its ink rather than its
    // alpha; one with a transparent background is measured like everything else.
    // See trim(), and `opaque` for why the file decides rather than the flag.
    const t = trim(img, d === 'ui' && !!(ui[uiKey(f)] || {}).plate && opaque(img));
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
  for (const def of [...archery, ...barracks, ...monastery]) {
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
  for (const def of [...archery, ...barracks, ...siege, ...monastery]) {
    // A tier 4 turret keeps its frames on the MACHINE that stands on it, with a
    // trim of its own — the stone underneath is a still picture and has its own
    // box. Same union property either way; only where it is written down moves.
    const frames = def.machine ? def.machine.frames : def.frames;
    if (!frames) continue;
    const [tx, ty, tw, th] = def.machine ? def.machine.trim : def.spriteTrim;
    for (const key of frames) {
      const file = ASSET_PATHS[key];
      if (!file) { console.log(`\n${def.name}: frame '${key}' has no path in src/assets.js`); bad++; continue; }
      const t = trim(decode(readFileSync(file)));
      if (t[0] >= tx && t[1] >= ty && t[0] + t[2] <= tx + tw && t[1] + t[3] <= ty + th) continue;
      console.log(`\n${def.name}: frame '${key}' trims to [${t}], outside [${def.machine ? def.machine.trim : def.spriteTrim}]`);
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

// A UI ICON WITH AN OPAQUE BACKGROUND IS ALWAYS A MISTAKE. Every one of them is
// drawn on top of the cream button plate or beside a HUD number, so a background
// is a card the artist did not mean to draw — and it is invisible in the export,
// because a white rectangle on a white canvas looks like nothing at all.
//
// It cost an upload: Aim_Most_Health_Icon came in 100% opaque and trimmed to the
// whole 512 square, which reported as a comfortably sharp 30x30 glyph rather
// than as broken. The trim table above cannot show it — a full-canvas trim looks
// like a big drawing.
{
  let solid = 0;
  for (const [key, src] of Object.entries(ASSET_URLS)) {
    if (!src.startsWith('assets/ui/') || !ui[key]) continue;
    // THE FOUR ABILITY BUTTONS ARE HELD TO THIS TOO, and were not always. They are
    // the one kind of UI file with nothing underneath them — each one IS the plate
    // rather than a mark laid over it — so a white square behind the disc was
    // exempted here as harmless, on the grounds that render.js clips it away.
    //
    // It was harmless right up until it was not: three of them shipped opaque, the
    // clip hid it on the button, and the same file drawn anywhere without a circular
    // clip would have carried its corners along. The artist re-exported them clear
    // and the exemption went with them. One rule for every icon is worth more than
    // a special case that happens to be survivable.
    const img = decode(readFileSync(src));
    if (!opaque(img)) continue;
    let lit = 0;
    for (let p = 0; p < img.w * img.h; p++) if (img.px[p * img.ch + img.ch - 1] > 200) lit++;
    console.log(`\n${src} is ${(100 * lit / (img.w * img.h)).toFixed(0)}% opaque — it has a background.`);
    solid++;
  }
  if (solid) {
    console.log('Re-export with a transparent background: these are drawn over a plate.');
    process.exitCode = 1;
  } else {
    console.log('Every wired UI icon that sits ON a plate has a transparent background.');
  }
}

// AND EVERY ICON THAT IS A PLATE IS A CENTRED SQUARE THE SIZE OF ONE.
//
// This is the check the four ability buttons get ON TOP OF the transparency rule
// above, and it is not a formality — it is the property the drawing code depends
// on. render.js clips these to a circle of the button's own radius, centred on the
// button. A re-export whose disc was smaller, off-centre, or not round would either
// lose ink to the clip or leave corners hanging outside it, and both would look
// like a rendering bug rather than an art one.
//
// Measured against `btn_plate`, not against a number typed here: the cream plate
// and these four are the same button at the same size, and if the artist ever
// redraws the plate the ability faces have to follow it.
{
  const want = ui.btn_plate.trim;
  let wrong = 0;
  for (const [key, src] of Object.entries(ASSET_URLS)) {
    if (!src.startsWith('assets/ui/') || !ui[key] || !ui[key].plate) continue;
    const img = decode(readFileSync(src));
    const t = trim(img, true);
    const square = t[2] === t[3];
    const centred = Math.abs(t[0] + t[2] / 2 - img.w / 2) < 1 &&
                    Math.abs(t[1] + t[3] / 2 - img.h / 2) < 1;
    const sized = t[2] === want[2] && t[3] === want[3];
    if (square && centred && sized) continue;
    console.log(`\n${src} draws [${t}] — the plate is [${want}], centred and square.`);
    wrong++;
  }
  if (wrong) {
    console.log('A full-plate button IS the button: same disc, same size, dead centre.');
    process.exitCode = 1;
  } else {
    console.log("Every full-plate button matches btn_plate's own disc.");
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
