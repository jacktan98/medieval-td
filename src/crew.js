// AN ARTILLERY CREWMAN TURNING ROUND WHILE HIS MACHINE STAYS PUT, at the owner's word:
// idle men in towers now and then face the other way, and on artillery "the unit is
// part of the weapon", so he is cut out of the drawing and only he is mirrored.
//
// The Default drawing's SVG is split into its paths in painting order, and each path
// is the man's (it is in his own drawing, or listed in `extra` — see src/data/crew.js)
// or the machine's. Consecutive paths of one kind make a RUN, and every run is drawn
// to a canvas of its own, the size of the PNG. Drawn in order they are the Default
// again, exactly; with the man's runs mirrored about his own shadow they are the man
// turned round on the spot, the machine unmoved, and whatever of the machine he stood
// in front of now showing, because the SVG's shapes are whole under him.
//
// Built once per drawing, in the background, the first time it is asked for. Until
// then — and for good if the SVGs cannot be read — this answers null and the tower is
// drawn as it always was, with the man facing the way the artist drew him.
import { CREW, GROUND_SHADOW } from './data/crew.js';
import { versioned } from './assets.js';

const made = new Map();

export function crewLayers(key) {
  const c = CREW[key];
  if (!c || typeof document === 'undefined') return null;
  if (!made.has(key)) {
    made.set(key, null);
    build(c).then(got => made.set(key, got), () => {});
  }
  return made.get(key);
}

const PATH = /<path[^>]*\/>/g;
const attr = (el, name) => (el.match(new RegExp(` ${name}="([^"]+)"`)) || [])[1];

async function build(c) {
  const [whole, own] = await Promise.all([c.svg, c.man].map(u => fetch(versioned(u)).then(r => r.text())));
  const his = new Set([...own.matchAll(/ d="([^"]+)"/g)].map(m => m[1]));
  const kinds = (whole.match(PATH) || []).map((el, i) => {
    if (his.has(attr(el, 'd')) || (c.extra || []).includes(i)) return 'man';
    return (attr(el, 'fill') || '').toLowerCase() === GROUND_SHADOW ? null : 'machine';
  });
  const runs = [];
  kinds.forEach((k, i) => {
    if (!k) return;
    const last = runs[runs.length - 1];
    if (last && last.man === (k === 'man')) last.paths.add(i);
    else runs.push({ man: k === 'man', paths: new Set([i]) });
  });
  if (!runs.some(r => r.man)) return null;
  for (const r of runs) {
    let i = -1;
    r.img = await raster(whole.replace(PATH, el => (r.paths.has(++i) ? el : '')));
  }
  return { runs, axis: axisOf(runs.filter(r => r.man).map(r => r.img)) };
}

function raster(svg) {
  return new Promise((ok, no) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || 1024;
      c.height = img.naturalHeight || 1024;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c);
    };
    img.onerror = () => { URL.revokeObjectURL(url); no(new Error('crew svg')); };
    img.src = url;
  });
}

// THE LINE HE TURNS ABOUT: the middle of his shadow, which is where he stands — the
// lowest few rows of him, which are nothing but the shadow under his feet.
function axisOf(imgs) {
  const W = imgs[0].width, H = imgs[0].height;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  for (const im of imgs) g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, W, H).data;
  let bottom = -1;
  for (let y = H - 1; y >= 0 && bottom < 0; y--) {
    for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 100) { bottom = y; break; }
  }
  let sum = 0, n = 0;
  for (let y = Math.max(0, bottom - 4); y <= bottom; y++) {
    for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 100) { sum += x; n++; }
  }
  return n ? sum / n : W / 2;
}

// Draws the drawing's `trim` window into `box` as drawImage would, with the man's
// runs mirrored about his axis. False while the pieces are not ready.
export function drawCrewTurned(ctx, key, [sx, sy, sw, sh], box) {
  const got = crewLayers(key);
  if (!got) return false;
  const kx = box.w / sw;
  const X = box.left + (got.axis - sx) * kx;
  for (const r of got.runs) {
    if (r.man) {
      ctx.save();
      ctx.translate(X, 0);
      ctx.scale(-1, 1);
      ctx.translate(-X, 0);
    }
    ctx.drawImage(r.img, sx, sy, sw, sh, box.left, box.top, box.w, box.h);
    if (r.man) ctx.restore();
  }
  return true;
}
