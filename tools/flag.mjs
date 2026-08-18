// Where each barracks tier flies its pennant. Node only.
//
//   node tools/flag.mjs
//
// The muster rings — the countdown a barracks draws while one of its men is
// dead and walking back — hang UNDER THE FLAG, and that is a position in the
// artwork rather than a corner of a bounding box. Every tier draws its pennant
// somewhere different: the tent flies one from a pole standing beside it, and
// both huts fly one off the ridge of the roof. Anchoring on the box would put
// the rings in a plausible place on one tier and a silly one on the other two.
//
// So the pennant is MEASURED, exactly like a shadow is, and for the same reason:
// the artist can redraw a roofline and the game should follow it without anybody
// re-typing an offset. Re-run this after any barracks re-export and paste
// `flagFrac` into the three camp defs in src/data/towers.js.
//
// THE PENNANT IS FOUND BY COLOUR, one flat blue, the same trick tools/shadow.mjs
// uses on the grey under a building. It is exact rather than a tolerance range
// on purpose: if the artist recolours the flag this fails loudly instead of
// quietly measuring a patch of sky-coloured something else.
//
// TIER 4 IS NOT A PENNANT AND THE SUGGESTION BELOW IS WRONG FOR IT. The Paladin
// Keep has a banner hung down its front wall and a blue-painted deck, both this
// same blue and joined along the parapet, so the bounding box of "the blue" is
// both of them together and its bottom corner is the tip of the banner's right
// tail. Its `flagFrac` is measured off the cloth's own rows instead — see the note
// on `camp4` in data/towers.js.
//
// Which is why this tool CHECKS as well as suggests. The suggestion is right for a
// pennant and only for a pennant; the check — the held anchor lands inside the
// cloth — is right for both, and it is the thing that would notice an artist
// moving the heraldry in a redraw.

import { readFileSync } from 'fs';
import { decodeRGBA } from './png.mjs';
import { barracks } from '../src/data/towers.js';
import { paths as ASSET_URLS } from '../src/assets.js';

// The pennant blue, sampled from all three tiers: 3300-odd pixels of it in each
// file and nothing else in the set within 40 of it on the blue channel.
const PENNANT = [5, 93, 171];

// Its own cloth only. The pole is brown and the tier 2 hut has a blue-grey
// shadow side; neither is this colour, so an exact match needs no second rule.
function pennant(img) {
  const { w, h, px } = img;
  let x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (px[i + 3] < 200) continue;
      if (px[i] !== PENNANT[0] || px[i + 1] !== PENNANT[1] || px[i + 2] !== PENNANT[2]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      n++;
    }
  }

  if (n < 200) throw new Error(`only ${n} pennant pixels — has the flag been recoloured?`);
  return { x0, y0, x1, y1, n };
}

const file = key => decodeURIComponent(ASSET_URLS[key]);

console.log('tier  sprite            pennant (source px)        flagFrac');

let bad = 0;
for (const def of barracks) {
  const img = decodeRGBA(readFileSync(file(def.sprite)));
  const f = pennant(img);
  const [tx, ty, tw, th] = def.spriteTrim;

  // BOTTOM CENTRE OF THE CLOTH, as a fraction of the sprite's own trim — which
  // is the box render.js draws into, so the fraction survives a re-export at a
  // different size or a different amount of transparent margin.
  const fx = ((f.x0 + f.x1) / 2 - tx) / tw;
  const fy = (f.y1 - ty) / th;

  // A pennant outside the trim means the two were measured from different
  // files, which is the one way this can be confidently wrong.
  const outside = fx < 0 || fx > 1 || fy < 0 || fy > 1;

  // THE CHECK, as opposed to the suggestion: whatever the def is actually holding
  // has to land on the cloth. The bounding box of the blue rather than a blue
  // pixel, because the anchor is the BOTTOM of the cloth and a chevron's notch
  // means the bottom row of the cloth's own box need not be blue at its centre.
  const held = def.flagFrac;
  const hx = tx + held[0] * tw;
  const hy = ty + held[1] * th;
  // PAD, and 3 source px is the right amount: the anchor is the bottom EDGE of the
  // cloth and the fraction in the def is rounded to three places, which on a 526px
  // trim is worth a fifth of a pixel either way — enough to land just outside a box
  // it is supposed to sit on the rim of.
  const PAD = 3;
  const on = hx >= f.x0 - PAD && hx <= f.x1 + PAD && hy >= f.y0 - PAD && hy <= f.y1 + PAD;
  if (outside || !on) bad++;

  console.log(
    `${def.tier}     ${def.sprite.padEnd(16)}  ` +
    `${String(f.x0).padStart(4)},${String(f.y0).padStart(4)} ` +
    `${String(f.x1 - f.x0 + 1).padStart(3)}x${String(f.y1 - f.y0 + 1).padStart(3)}  ` +
    `${String(f.n).padStart(5)}px   ` +
    `[${fx.toFixed(3)}, ${fy.toFixed(3)}]   ` +
    `held [${held.join(', ')}] ` +
    (outside ? '  SUGGESTION OUTSIDE THE TRIM' : on ? 'on the cloth' : '  HELD ANCHOR IS OFF THE CLOTH')
  );
}

if (bad) console.log(`\n${bad} tier(s) have a flag anchor that no longer holds.`);
else console.log('\nEvery muster ring hangs off its tier\'s own cloth.');
process.exit(bad ? 1 : 0);
