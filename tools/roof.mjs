// Where each barracks tier's roof is, directly over the spot it stands on. Node
// only.
//
//   node tools/roof.mjs
//
// The muster rings — the countdown a barracks draws while one of its men is dead
// and walking back — stack in the air ABOVE the building, centred on the column
// it stands on. "Above the building" has to mean above the part of the building
// that is actually under them, and that is not the top of the sprite's box: the
// tent flies a pennant from a pole standing to one side, so its box top is 20
// game px higher than its own ridge, and hanging the stack off the box left it
// floating in empty sky with the tent well below.
//
// So `roofFrac` is measured from the artwork, exactly like `groundFrac`: the
// topmost opaque row inside a band the width of the ring stack, centred on the
// shadow's own column. Re-run after any barracks re-export and paste the fraction
// into the camp defs in src/data/towers.js.
//
// FOUND BY ALPHA, not by colour. That is the difference from the tool this
// replaced — `tools/flag.mjs` found the pennant by its flat blue, which worked
// until a tier 4 arrived whose heraldry is a banner down the front wall in the
// same blue. Alpha cannot be recoloured and every building has some.
//
// This tool CHECKS as well as suggests: the fraction each def is holding has to
// land within a pixel or two of the ink, so a redraw that raises a roofline shows
// up here rather than as a ring resting on a chimney.

import { readFileSync } from 'fs';
import { decodeRGBA } from './png.mjs';
import { barracks, SCALE } from '../src/data/towers.js';
import { paths as ASSET_URLS } from '../src/assets.js';
import { RING_R0, RING_STEP } from '../src/render.js';

// How wide a band to look at, in game px: the widest ring's diameter, which is
// exactly the run of building the stack sits over. Read from render.js so the
// measurement follows the drawing rather than a remembered 20.
const band = def => 2 * (RING_R0 + (def.soldier.count - 1) * RING_STEP);

// Anything this opaque counts as ink. Not > 0: every export carries a few rows of
// almost-transparent anti-aliasing above the outline, and measuring to those puts
// the answer a pixel or two high on some files and not on others.
const INK = 8;

function roofTop(img, cx, halfBand) {
  let top = Infinity;
  const lo = Math.max(0, Math.round(cx - halfBand));
  const hi = Math.min(img.w - 1, Math.round(cx + halfBand));
  for (let x = lo; x <= hi; x++) {
    for (let y = 0; y < img.h; y++) {
      if (img.px[(y * img.w + x) * 4 + 3] > INK) { if (y < top) top = y; break; }
    }
  }
  return top;
}

// How far the held fraction may sit from the measured row, in source px. 6 is the
// same tolerance tools/shadow.mjs uses and it is well under a game pixel on a
// 1024 canvas.
const TOLERANCE = 6;

const file = key => decodeURIComponent(ASSET_URLS[key]);

console.log('tier  sprite            band (source px)   roof row   roofFrac   held');

let bad = 0;
for (const def of barracks) {
  const img = decodeRGBA(readFileSync(file(def.sprite)));
  const [tx, ty, tw, th] = def.spriteTrim;

  // The column the rings hang in IS the column the building stands on — the
  // renderer uses the tower's own x, and `groundFrac` is what puts the shadow's
  // centre there. So the band is derived rather than chosen.
  const cx = tx + def.groundFrac[0] * tw;
  const halfBand = band(def) / SCALE / 2;

  const row = roofTop(img, cx, halfBand);
  if (!Number.isFinite(row)) {
    console.log(`${def.tier}     ${def.sprite}   NO INK in the band — is groundFrac right?`);
    bad++;
    continue;
  }

  const frac = (row - ty) / th;
  const held = def.roofFrac ?? 0;
  const off = Math.abs(held * th - (row - ty));
  const ok = off <= TOLERANCE;
  if (!ok) bad++;

  console.log(
    `${def.tier}     ${def.sprite.padEnd(16)}  ` +
    `x ${String(Math.round(cx - halfBand)).padStart(3)}..${String(Math.round(cx + halfBand)).padStart(3)}   ` +
    `${String(row).padStart(6)}     ` +
    `${frac.toFixed(3)}      ${held.toFixed(3)}  ` +
    (ok ? `${off.toFixed(1)}px` : `   WRONG by ${off.toFixed(1)}px — paste the fraction on the left`)
  );
}

// What the number buys, printed because it is the whole argument for measuring
// rather than using the box: on the tent the two answers are 20 game px apart.
console.log('\nBox top vs roof, in game px under the rings:');
for (const def of barracks) {
  const [, ty, , th] = def.spriteTrim;
  console.log(`  ${def.name.padEnd(14)} ${(( def.roofFrac ?? 0) * th * SCALE).toFixed(1)}`);
}

console.log(bad
  ? `\n${bad} barracks tier(s) hang their rings off the wrong row.`
  : `\nEvery muster ring stack sits on its own tier's roof, within ${TOLERANCE} source px.`);
process.exit(bad ? 1 : 0);
