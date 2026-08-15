// Enough PNG to read the pixels back. Node only, no dependencies.
//
// Three tools measure the artwork and all three need the same thing — the raw
// samples out of an 8-bit PNG. This used to be two hand-copied decoders, one in
// tools/trim.mjs and one in tools/shadow.mjs, which agreed on everything that
// mattered and differed on what they would accept: trim's took greyscale+alpha
// as well as RGBA and shadow's did not. That is exactly the kind of difference
// that only shows up on the day the artist exports one file differently.
//
// So it lives here once. It handles the four colour types that carry samples at
// 8 bits and reports the channel count, and a caller that needs colour rather
// than just coverage checks `ch` itself rather than assuming.
//
// What it does NOT do: 16-bit depth, interlacing, palettes. All three throw
// rather than returning something plausible — a measurement taken off a
// misdecoded image is worse than no measurement, because it looks like a number.

import { inflateSync } from 'zlib';

// Returns { w, h, ch, px } where px is w*h*ch bytes, row-major, alpha last.
export function decode(buf) {
  let i = 8, idat = [], w = 0, h = 0, depth = 0, colour = 0, interlace = 0;

  while (i < buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('ascii', i + 4, i + 8);
    if (type === 'IHDR') {
      w = buf.readUInt32BE(i + 8);
      h = buf.readUInt32BE(i + 12);
      depth = buf[i + 16];
      colour = buf[i + 17];
      interlace = buf[i + 20];
    } else if (type === 'IDAT') idat.push(buf.subarray(i + 8, i + 8 + len));
    else if (type === 'IEND') break;
    i += 12 + len;
  }

  if (depth !== 8) throw new Error(`bit depth ${depth} unsupported`);
  if (interlace) throw new Error('interlaced PNG unsupported');
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[colour];
  if (!ch) throw new Error(`colour type ${colour} unsupported`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const px = Buffer.alloc(stride * h);

  // The five PNG line filters, undone in place. Each byte is predicted from the
  // one `ch` to its left (a), the one above (b) and the one above-left (c).
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

// The same, insisting on colour. Anything measuring a PAINTED feature rather
// than coverage needs three channels to compare, and a greyscale export would
// otherwise be read as a very dark image with every colour test failing
// silently.
export function decodeRGBA(buf) {
  const img = decode(buf);
  if (img.ch !== 4) throw new Error(`expected 8-bit RGBA, got ${img.ch} channels`);
  return img;
}
