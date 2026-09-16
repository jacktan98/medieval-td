// A tower's ground shadow, recoloured for the board it is standing on.
//
// EVERY TOWER CARRIES ITS SHADOW BAKED INTO ITS PNG, as a flat ellipse in
// #37422f — the dark green of shaded grass. That is right on eight boards and it
// is what tools/shadow.mjs reads to find where each building stands, so the colour
// is already load-bearing rather than decorative.
//
// SANDSHROUD IS SAND. The same ellipse on the desert board is a green disc under a
// stone tower standing on dune, which is the one thing on that board that still
// says "grass". Twenty-six of the thirty-five tower sprites carry it.
//
// THREE WAYS TO FIX IT, and this is the cheapest by a distance:
//
//   A SECOND SET OF PNGS per palette. Twenty-six more files, and every redraw of
//   a tower from then on is two exports instead of one, forever.
//
//   SVG SOURCES for the towers, so the shadow path could be recoloured exactly
//   and rasterised. That would work and it is real machinery: the game loads PNGs
//   and has no build step, so it would mean rasterising vectors at load.
//
//   RECOLOUR THE PIXELS, which is this file. The shadow is one exact colour, the
//   board already declares what colour its shadows are — see `palette` in
//   src/data/level11.js — and the swap is a few hundred microseconds per sprite,
//   once, cached for the rest of the session.
//
// IT IS ONLY SAFE BECAUSE THE COLOUR IS ONLY THE SHADOW, and that was checked by
// doing it rather than by reasoning about it: every tower in the game was recoloured
// offline and looked at side by side, and in all twenty-six only the ground ellipse
// moves — no banner, no flag, no roof, no shaded wall. Pixel geometry could not
// settle it, because a building standing ON its own shadow breaks the ellipse into
// pieces and every shape test reads those pieces as stray ink. The picture settled
// it.
//
// NOT THE FIGURES. Soldiers and enemies wear #362407, a dark brown, which reads
// correctly on sand already — this is about the one colour that does not.
import { art } from './assets.js';
import { level } from './level.js';

// The colour every tower's ground shadow is painted in. The same constant
// tools/svg.mjs calls SHADOW_FILL and tools/shadow.mjs calls GROUND; it is spelled
// out here rather than imported because those are Node-only modules and this runs
// in the browser.
const GRASS_SHADOW = [0x37, 0x42, 0x2f];

// Keyed `sprite|colour`, so switching boards mid-session reuses whatever was baked
// for a board played earlier rather than redoing it.
const baked = new Map();

// Sprites that turned out to have no shadow in them at all, so the work is not
// attempted again every frame for the rest of the game. The ballista and cannon
// MACHINES are these: their stone base carries the shadow and they do not.
const plain = new Set();

const hex = c => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// The drawing to use for `key` on the board being played.
//
// ANSWERS WITH THE ORIGINAL unless there is a reason not to: no board palette, a
// palette whose shadow is the grass one anyway, artwork that has not finished
// loading, or a canvas that will not give its pixels back. Every one of those is a
// board that looks exactly as it did before this file existed, which is the right
// failure for a cosmetic pass.
export function onGround(key) {
  const img = art[key];
  if (!img) return img;

  const want = level && level.palette && level.palette.shadow;
  if (!want || want.toLowerCase() === '#37422f') return img;

  const id = `${key}|${want}`;
  if (baked.has(id)) return baked.get(id);
  if (plain.has(key)) return img;

  // NOT UNTIL IT HAS LOADED. An Image that is still in flight has no pixels to
  // read, and baking one would cache a blank sprite for the whole session. Return
  // the original and try again on a later frame — `art` hands out the same object,
  // so this settles itself within a frame or two of the board opening.
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return img;

  let out;
  try {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, w, h);
    const px = d.data;
    const [r, gr, b] = hex(want);
    let hits = 0;
    for (let i = 0; i < px.length; i += 4) {
      // The alpha test matches the one every tool in this project uses to find a
      // shadow: the artist's ellipse is opaque, and anything half-transparent
      // wearing this colour is an antialiased edge that belongs to whatever is
      // drawn over it.
      if (px[i + 3] > 200 &&
          px[i] === GRASS_SHADOW[0] && px[i + 1] === GRASS_SHADOW[1] && px[i + 2] === GRASS_SHADOW[2]) {
        px[i] = r; px[i + 1] = gr; px[i + 2] = b;
        hits++;
      }
    }
    if (!hits) { plain.add(key); return img; }
    g.putImageData(d, 0, 0);
    out = c;
  } catch {
    // getImageData throws on a canvas tainted by an image from another origin.
    // The game serves its own artwork, so this does not happen where it runs —
    // but a page opened straight off the filesystem would, and a board that
    // simply keeps its green shadows is a much better answer than one that stops
    // drawing towers.
    plain.add(key);
    return img;
  }

  baked.set(id, out);
  return out;
}
