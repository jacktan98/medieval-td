// EACH STONE ITS OWN SHADE, at the owner's word: the walls of the board's buildings —
// houses, castles, the church, the well, the bridge — are drawn in one grey, and here
// every stone in them is made a little lighter or darker than its neighbours, as the
// towers' stones are.
//
// DONE ON THE PICTURE, NOT THE FILE: a wall is one grey shape with its stones drawn
// over it as lines, so a stone is only a stone once it is drawn. The sheet is drawn
// to a canvas once (render.js boardBase, tint.js shadowSplit) and handed here.
//
// ONLY THE BUILDINGS. The rocks and stepping stones on the ground are drawn in the
// same grey as the walls, and the owner wants them left as they are. So
// tools/shade.mjs gives every wall it shades a grey of its own, one no other part of
// any board uses: the front face a step lighter (#979797 for #969696, #878787 for
// #868686), the top and the side their own lighter and darker greys. Only those
// greys are stones here.
//
// THE SAME STONE THE SAME SHADE on every sheet and at every size: the shade comes from
// where the stone's middle is on the board, not from the order stones are found in,
// so the front sheet's copy of a wall matches the base sheet's.

export const STONE_GREYS = [0x97, 0x87, 0xb6, 0xa1, 0x7d, 0x70, 0x6e];

// UP TO 6% EITHER SIDE, half the towers' 13%: at 13% a dark wall's lightest stones
// came out as light as a lit wall's darkest, and the owner read the dark walls as lit.
// At 6% the three faces' greys never meet.
const SPREAD = 0.12;
const BIN = 4;        // board px: a stone's middle, rounded to this, picks its shade
const SMALLEST = 4;   // board px²: a chip smaller than this is left alone

const isGrey = new Uint8Array(256);
for (const g of STONE_GREYS) isGrey[g] = 1;

function shadeAt(x, y) {
  let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) & 0xffff) / 0x10000;
}

// `px` is the sheet's pixels, `w` by `h`, `scale` canvas px to a board px. Returns how
// many stones were shaded.
export function varyStone(px, w, h, scale) {
  const n = w * h;
  const stone = i => {
    const o = i * 4, r = px[o];
    return px[o + 3] === 255 && isGrey[r] && px[o + 1] === r && px[o + 2] === r;
  };
  const seen = new Uint8Array(n), queue = new Int32Array(n);
  const least = SMALLEST * scale * scale;
  let stones = 0;
  for (let start = 0; start < n; start++) {
    if (seen[start] || !stone(start)) continue;
    // The stone: every pixel of its grey joined to this one.
    let len = 0, sx = 0, sy = 0;
    queue[len++] = start; seen[start] = 1;
    for (let q = 0; q < len; q++) {
      const i = queue[q], x = i % w, y = (i - x) / w;
      sx += x; sy += y;
      if (x > 0 && !seen[i - 1] && stone(i - 1)) { seen[i - 1] = 1; queue[len++] = i - 1; }
      if (x < w - 1 && !seen[i + 1] && stone(i + 1)) { seen[i + 1] = 1; queue[len++] = i + 1; }
      if (y > 0 && !seen[i - w] && stone(i - w)) { seen[i - w] = 1; queue[len++] = i - w; }
      if (y < h - 1 && !seen[i + w] && stone(i + w)) { seen[i + w] = 1; queue[len++] = i + w; }
    }
    if (len < least) continue;
    const k = 1 + (shadeAt(Math.round(sx / len / scale / BIN), Math.round(sy / len / scale / BIN)) - 0.55) * SPREAD;
    // Its rim too — the pixels where its grey runs into the line round it — or a
    // ring of the old grey would show round every stone.
    let all = len;
    const rim = j => { if (!seen[j] && px[j * 4 + 3]) { seen[j] = 1; queue[all++] = j; } };
    for (let q = 0; q < len; q++) {
      const i = queue[q], x = i % w;
      if (x > 0) rim(i - 1);
      if (x < w - 1) rim(i + 1);
      if (i >= w) rim(i - w);
      if (i + w < n) rim(i + w);
    }
    for (let q = 0; q < all; q++) {
      const o = queue[q] * 4;
      px[o] = Math.min(255, px[o] * k); px[o + 1] = Math.min(255, px[o + 1] * k); px[o + 2] = Math.min(255, px[o + 2] * k);
    }
    stones++;
  }
  return stones;
}

// A canvas the sheet is drawn on, shaded in place.
export function varyStoneCanvas(c) {
  try {
    const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height);
    if (varyStone(d.data, c.width, c.height, c.width / 960)) g.putImageData(d, 0, 0);
  } catch { /* a canvas we may not read: the stones stay one grey */ }
}
