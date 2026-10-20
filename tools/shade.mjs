// The owner's shading, lit from the top left, in flat colours only. Node only —
// never loaded by the game, and it runs Chromium (Playwright) to measure shapes.
//
//   node tools/shade.mjs maps            every board's _base, _front and _over sheet
//   node tools/shade.mjs maps 5          one board's
//   node tools/shade.mjs towers          every tower's PNG, from its SVG (see TOWERS)
//   node tools/shade.mjs towers Paladin  one tower's
//
// THE RULE, at the owner's word, for everything:
//
//   tops (roofs, battlements, wall walks, decks)   a fifth lighter
//   faces turned toward the viewer                 as drawn
//   faces turned to the right                      a sixth darker
//   round things (leaf clumps, trunks, rocks,
//   round towers)                                  a darker band along the lower right
//
// No gradients, ever: every shaded part is one flat colour. The colours are the
// owner's own: stone #b6b6b6 / #969696 / #7d7d7d, wood #8b6b37 / #74592e / #604a26,
// leaves #456036 with #384f2c in shadow — and the same factors on any other fill.
//
// WHICH FACE IS WHICH is read off the shapes, because the drawings carry no labels:
// a shape with no upright edges is a top (when it sits on a wall — a stepping stone
// on its own is left alone); of two upright faces standing side by side, the right
// one is turned away from the light; otherwise a face whose edges rise to the right
// is a right-hand face. See classify().
//
// THE BOARDS' SHEETS ARE DERIVED, and so is their shading: tools/split-map.mjs
// writes _base, _front and _over from the owner's layers, and this is run after it.
// A sheet it has shaded is marked (data-shaded) and left alone on a second run, so
// running it twice is harmless; after split-map rewrites a sheet, run it again. The
// owner's layer files are never touched.
//
// The FRONT and OVER sheets are copies of buildings in the base, drawn again over the
// figures walking behind them, so they must come out the same colour as the base or
// the building changes shade as a man walks past. So the base is shaded first and
// every shape in the other two that is also in the base (the same fill, in the same
// place) takes the base's decision — leaving it as drawn included.
//
// Stones each their own shade is not done here: a wall is one shape with the brick
// lines drawn over it, so no SVG can colour one brick. The game does it as a board
// loads — see src/stone.js.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// Fills that are walls, roofs and timber: their faces are sorted top / front / side.
const FACE = ['#969696', '#868686', '#74592e', '#be9f6d', '#5c4828', '#5e4927'];
// Fills that are leaves: the band whatever their shape.
const ROUND = ['#456036', '#46792a'];
// Dark timber is a dead tree when it stands alone and a roof or a wall when it does not.
const DEADWOOD = ['#5c4828', '#5e4927'];
// Greys that are rocks when they stand alone.
const ROCK = ['#969696', '#868686', '#595959'];
const TOP = 1.2, SIDE = 0.835, BAND = 0.82;
// BUILDING STONE IS MARKED, so the game's stones-each-their-own-shade (src/stone.js)
// finds walls and not the rocks and stepping stones on the ground, which are drawn
// in the same grey: a wall's face is moved one step lighter, which no eye can see.
// Tops and right-hand faces are colours only buildings wear already.
const MARK = { '#969696': '#979797', '#868686': '#878787' };
// THE OWNER'S OWN CALLS, where the rules read a face another way: by board, the
// shape's fill and the top-left corner of its box on a 1920x1080 sheet; `as` is
// 'top', 'side' or 'keep' (as drawn).
const OWNER = {
  // Stage 13: the lake's bank is ground, and is left as drawn.
  13: [{ fill: '#74592e', at: [-64, 211], as: 'keep' }],
  // Stage 16: the Citadel's walk behind its battlements, dark.
  16: [{ fill: '#868686', at: [-41, 263], as: 'side' }, { fill: '#868686', at: [0, 286], as: 'side' }],
};

// The page side: classify every shape on one sheet and colour it. `known` is the
// base sheet's decisions, keyed by outline and fill, for the front and over sheets.
function shadeInPage([W, H, FACE, ROUND, ROCK, DEADWOOD, TOP, SIDE, BAND, MARK, known, DEBUG, owner = []]) {
  const NS = 'http://www.w3.org/2000/svg', root = document.querySelector('svg');
  if (root.getAttribute('data-shaded')) return null;
  let defs = root.querySelector('defs');
  if (!defs) { defs = document.createElementNS(NS, 'defs'); root.prepend(defs); }
  const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const tone = (f, k) => hex(rgb(f).map(v => v * k));
  // The owner's own colours where they named them.
  const NAMED = { '#969696': ['#b6b6b6', '#7d7d7d'], '#74592e': ['#8b6b37', '#604a26'], '#456036': [null, '#384f2c'] };
  const top = f => (NAMED[f] && NAMED[f][0]) || tone(f, TOP);
  const side = f => (NAMED[f] && NAMED[f][1]) || tone(f, SIDE);
  const dark = f => (NAMED[f] && NAMED[f][1]) || tone(f, BAND);

  const els = [...root.querySelectorAll('path,rect,ellipse,circle,polygon')];

  // How a shape's outline runs: upright, falling to the right, rising to the right, flat.
  const edges = el => {
    let vert = 0, dr = 0, ur = 0, flat = 0;
    const m = el.getScreenCTM();
    if (!el.getTotalLength) return { vert, dr, ur, flat, turn: 0, tot: 1 };
    const L = el.getTotalLength(), N = 240; let prev = null, head = null, turn = 0;
    for (let k = 0; k <= N; k++) {
      const q = el.getPointAtLength(L * k / N), x = m.a * q.x + m.c * q.y + m.e, y = m.b * q.x + m.d * q.y + m.f;
      if (prev) {
        const dx = x - prev[0], dy = y - prev[1], len = Math.hypot(dx, dy);
        // HOW MUCH IT CURVES: turning a little at every step, as an arc does, and not
        // all at once, as a corner does.
        if (len > 0.5) { const h = Math.atan2(dy, dx); if (head !== null) { let t = Math.abs(h - head); if (t > Math.PI) t = 2 * Math.PI - t; if (t < 0.4) turn += t; } head = h; }
        if (len > 0) {
          if (Math.abs(dx) < 0.3 * Math.abs(dy)) vert += len;
          else if (Math.abs(dy) < 0.08 * Math.abs(dx)) flat += len;
          else if (dy / dx > 0) dr += len; else ur += len;
        }
      }
      prev = [x, y];
    }
    return { vert, dr, ur, flat, turn, tot: vert + dr + ur + flat || 1 };
  };

  const info = els.map(el => {
    const f = (el.getAttribute('fill') || '').toLowerCase(), r = el.getBoundingClientRect();
    // Keyed by fill and where it stands, not by its outline's text: a front sheet can
    // write the same shape another way.
    return { el, f, r, area: r.width * r.height, k: `${f}|${[r.left, r.top, r.width, r.height].map(v => Math.round(v * 2) / 2).join(',')}` };
  });
  const ground = s => {
    const touch = (s.r.left <= 1) + (s.r.top <= 1) + (s.r.right >= W - 1) + (s.r.bottom >= H - 1);
    return s.area > 0.2 * W * H || (touch >= 2 && s.area > 0.05 * W * H);
  };
  const faces = info.filter(s => FACE.includes(s.f) && !ground(s) && s.area >= 20);
  for (const s of faces) { s.e = edges(s.el); s.up = s.e.vert >= 0.12 * s.e.tot; }
  const ups = faces.filter(s => s.up);
  const near = (a, b, pad) => a.r.left - pad < b.r.right && b.r.left - pad < a.r.right && a.r.top - pad < b.r.bottom && b.r.top - pad < a.r.bottom;
  // A TOP SITS ON A WALL: a good part of its outline runs along the wall's.
  const outline = s => {
    if (s.pts) return s.pts;
    const el = s.el, m = el.getScreenCTM(), L = el.getTotalLength ? el.getTotalLength() : 0;
    s.pts = [];
    for (let k = 0; k < 48 && L; k++) { const q = el.getPointAtLength(L * k / 48); s.pts.push([m.a * q.x + m.c * q.y + m.e, m.b * q.x + m.d * q.y + m.f]); }
    return s.pts;
  };
  const sits = (s, u) => {
    if (!near(s, u, 3)) return false;
    const m = u.el.getScreenCTM().inverse(), sw = Math.max(6, +(u.el.getAttribute('stroke-width') || 2) * 3);
    const was = u.el.getAttribute('stroke-width'); u.el.setAttribute('stroke-width', sw);
    let on = 0;
    for (const [x, y] of outline(s)) { const p = new DOMPoint(x, y).matrixTransform(m); if (u.el.isPointInStroke(p)) on++; }
    if (was === null) u.el.removeAttribute('stroke-width'); else u.el.setAttribute('stroke-width', was);
    return on >= 0.15 * outline(s).length;
  };

  // A ROOF OF FACES MEETING AT ONE PEAK — a hut's cone, a bell tower's spire: three
  // or more faces of one fill whose highest points meet. At the owner's word the faces
  // left of the peak are lit and those right of it dark. Keyed by shape: the peak.
  const peakOf = new Map();
  {
    const highest = s => {
      const el = s.el, m = el.getScreenCTM(), L = el.getTotalLength();
      let t = [0, Infinity];
      for (let k = 0; k < 400; k++) { const q = el.getPointAtLength(L * k / 400), y = m.b * q.x + m.d * q.y + m.f; if (y < t[1]) t = [m.a * q.x + m.c * q.y + m.e, y]; }
      return t;
    };
    const flat = faces.filter(s => s.el.getTotalLength).map(s => [s, highest(s)]);
    for (const [s, t] of flat) {
      const at = flat.filter(([u, v]) => u.f === s.f && Math.hypot(v[0] - t[0], v[1] - t[1]) < 4);
      if (at.length >= 3) peakOf.set(s, at.reduce((m, [, v]) => Math.min(m, v[0]), Infinity) / 2 + at.reduce((m, [, v]) => Math.max(m, v[0]), -Infinity) / 2);
    }
  }
  // A PILE OF STOCK — pipes, bars — is the same long shape again and again, each lying
  // across the next. Not a building: left as drawn, at the owner's word.
  const same = (a, b) => Math.abs(a.r.width - b.r.width) < 1.5 && Math.abs(a.r.height - b.r.height) < 1.5;
  const across = (a, b) => { const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top); return w > 0 && h > 0 && w * h > 0.3 * a.area; };
  const stock = faces.filter(s => faces.filter(u => u !== s && u.f === s.f && same(s, u) && across(s, u)).length >= 2);
  // And everything of its grey within the pile: the pipes' ends, what they lie on.
  const piles = stock.map(s => s.r);
  const pile = s => piles.some(r => s.r.left >= r.left - 12 && s.r.right <= r.right + 12 && s.r.top >= r.top - 12 && s.r.bottom <= r.bottom + 12) ||
    stock.some(u => u.f === s.f && across(s, u) && s.area < 2 * u.area);

  const out = new Map();   // key -> decision
  for (const s of info) {
    // The base's word, even when it was to leave the shape as drawn: the front sheet
    // holds less round a shape, and would read some faces another way.
    if (known && known[s.k]) { if (known[s.k].fill || known[s.k].band) out.set(s, known[s.k]); continue; }
    // (A leaf clump, not a lake's grassy bank drawn in the same green.)
    if (ROUND.includes(s.f) && !ground(s) && s.area >= 20 && s.area < 40000) {
      const d = Math.max(3, Math.min(10, 0.12 * Math.min(s.r.width, s.r.height)));
      out.set(s, { band: [d, s.f === '#5c4828' || s.f === '#5e4927' ? d * 0.5 : d] });
      continue;
    }
    const call = owner.find(o => o.fill === s.f && Math.abs(o.at[0] - s.r.left) < 2 && Math.abs(o.at[1] - s.r.top) < 2);
    if (call) { if (call.as !== 'keep') out.set(s, { fill: call.as === 'side' ? side(s.f) : top(s.f) }); continue; }
    if (!s.e) continue;
    const e = s.e;
    if (pile(s)) continue;
    if (peakOf.has(s)) {
      const mid = s.r.left + s.r.width / 2, peak = peakOf.get(s);
      if (Math.abs(mid - peak) > 0.1 * s.r.width) out.set(s, { fill: mid < peak ? top(s.f) : side(s.f) });
      continue;
    }
    // GROUND CLUTTER: a small thing with nothing but small things against it — a rock,
    // a crate, a stepping stone. Not on the owner's list, and left as drawn.
    const inside = (a, u) => a.r.left >= u.r.left - 2 && a.r.right <= u.r.right + 2 && a.r.top >= u.r.top - 2 && a.r.bottom <= u.r.bottom + 2;
    const touching = () => faces.filter(u => u !== s && near(s, u, 3) && (sits(s, u) || sits(u, s) || inside(s, u)));
    if (s.area < 1200 && touching().every(u => u.area < 2500)) continue;
    // ALONE: no other wall, roof or timber shares any of its outline.
    const alone = () => !faces.some(u => u !== s && near(s, u, 3) && (sits(s, u) || sits(u, s)));
    if (DEADWOOD.includes(s.f) && alone()) { out.set(s, { band: [4, 2] }); continue; }    // a dead tree, a stump
    // A TRUNK: timber standing alone, taller than it is wide (its roots can make its
    // outline read as flat, so this comes first).
    const leafy = () => info.some(l => ROUND.includes(l.f) && l.area < 40000 && near(s, l, 2));
    if (s.f === '#74592e' && s.r.height > 40 && s.r.height > 1.3 * s.r.width && alone() && leafy()) { out.set(s, { band: [6, 0] }); continue; }
    if (!s.up) {
      // A TOP SITS ON A WALL. Anything flat lying on the ground on its own — a mat, a
      // stepping stone, a plank, a rock — is left as drawn: the owner's list is
      // buildings and trees, not the ground.
      // A big roof overhangs its walls, so its outline need not run along theirs:
      // overlapping a wall well is enough for one.
      const over = u => { const w = Math.min(s.r.right, u.r.right) - Math.max(s.r.left, u.r.left), h = Math.min(s.r.bottom, u.r.bottom) - Math.max(s.r.top, u.r.top); return w > 0 && h > 0 && w * h > 0.15 * Math.min(s.area, u.area); };
      const onWall = ups.some(u => u !== s && (sits(s, u) || (s.area >= 1500 && over(u))));
      if (onWall) out.set(s, { fill: top(s.f) });
      continue;
    }
    // A ROUND TOWER: upright, taller than wide, its outline curving rather than cornered.
    if (ROCK.includes(s.f) && s.area >= 3000 && s.r.width < 180 && s.r.height > 0.8 * s.r.width && e.turn > 4) {
      out.set(s, { band: [0.3 * s.r.width, 0] });
      continue;
    }
    // OF TWO NARROW FACES SIDE BY SIDE — a post's, a merlon's — the right one turns
    // away from the light. A post's edges are too short to say which way it faces;
    // a wall's are not, and a wall is left to them.
    const narrow = o => o.r.width < 30;
    const leftOf = narrow(s) && ups.find(o => o !== s && o.f === s.f && narrow(o) && Math.abs(o.r.right - s.r.left) < 4 && o.r.top < s.r.bottom && s.r.top < o.r.bottom);
    const rightOf = narrow(s) && ups.find(o => o !== s && o.f === s.f && narrow(o) && Math.abs(s.r.right - o.r.left) < 4 && o.r.top < s.r.bottom && s.r.top < o.r.bottom);
    if (leftOf) { out.set(s, { fill: side(s.f) }); continue; }
    if (rightOf) { if (MARK[s.f]) out.set(s, { fill: MARK[s.f] }); continue; }
    if (e.ur > e.dr * 1.4 && e.ur > e.flat) { out.set(s, { fill: side(s.f) }); continue; }
    const front = () => MARK[s.f] && out.set(s, { fill: MARK[s.f] });
    // AND WHERE THE EDGES DO NOT SAY — a face whose sides lean, like the Citadel's —
    // its foot does: a face whose bottom edge rises to the right is turned to the right.
    {
      // Where its lowest corner is: at the left of a face turned to the right.
      const pts = outline(s), w = s.r.width, foot = Math.max(...pts.map(([, y]) => y));
      const at = pts.filter(([, y]) => y >= foot - 3).map(([x]) => x), t = (at.reduce((a, x) => a + x, 0) / at.length - s.r.left) / w;
      if (t < 0.35) { out.set(s, { fill: side(s.f) }); continue; }
    }
    front();
  }

  // Colour. A band is the shape filled dark, lit again wherever the shape still covers
  // the point (dx, dy) further on, and its outline drawn back over the top. The shape
  // is kept once, bare, in <defs>, and drawn 3 times by <use>, so the sheet does not
  // carry its outline 4 times over.
  const GEOMETRY = new Set(['d', 'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'points', 'x1', 'y1', 'x2', 'y2', 'id']);
  const use = (el, id, attrs) => {
    const u = document.createElementNS(NS, 'use');
    for (const a of el.attributes) if (!GEOMETRY.has(a.name)) u.setAttribute(a.name, a.value);
    u.setAttribute('href', `#${id}`);
    for (const [a, v] of Object.entries(attrs)) u.setAttribute(a, v);
    return u;
  };
  let n = 0;
  const decisions = {};
  for (const s of info) decisions[s.k] = {};
  for (const [s, d] of out) {
    decisions[s.k] = d;
    const el = s.el;
    if (DEBUG) { el.setAttribute('fill', d.fill ? (d.fill === top(s.f) ? '#ffe000' : d.fill === MARK[s.f] ? '#20d0d0' : '#2050ff') : d.band[1] === 0 && d.band[0] > 10 ? '#ff00ff' : '#ff3030'); continue; }
    if (d.fill) { el.setAttribute('fill', d.fill); continue; }
    const [dx, dy] = d.band, m = el.getCTM(), det = m.a * m.d - m.b * m.c;
    const lx = (m.d * -dx - m.c * -dy) / det, ly = (-m.b * -dx + m.a * -dy) / det;
    const id = `shape${n}`, cp = document.createElementNS(NS, 'clipPath');
    cp.id = `shade${n++}`; cp.setAttribute('clipPathUnits', 'userSpaceOnUse');
    const bare = el.cloneNode();
    for (const a of [...bare.attributes]) if (!GEOMETRY.has(a.name)) bare.removeAttribute(a.name);
    bare.id = id; defs.appendChild(bare);
    const g = document.createElementNS(NS, 'use');
    g.setAttribute('href', `#${id}`); g.setAttribute('transform', `translate(${lx},${ly})`);
    cp.appendChild(g); defs.appendChild(cp);
    const lit = MARK[s.f] || el.getAttribute('fill');
    el.replaceWith(use(el, id, { fill: dark(s.f) }),
      use(el, id, { fill: lit, stroke: 'none', 'clip-path': `url(#${cp.id})` }),
      use(el, id, { fill: 'none' }));
  }
  root.setAttribute('data-shaded', '1');
  return { svg: new XMLSerializer().serializeToString(root), decisions };
}

async function shadeSheets(page, files, W, H, owner = []) {
  let known = null;
  for (const f of files) {
    if (!existsSync(f)) continue;
    await page.setViewportSize({ width: W, height: H });
    await page.setContent(`<body style="margin:0">${readFileSync(f, 'utf8')}</body>`);
    const r = await page.evaluate(shadeInPage, [W, H, FACE, ROUND, ROCK, DEADWOOD, TOP, SIDE, BAND, MARK, known, !!process.env.DEBUG_TO, owner]);
    if (!r) { console.log(`  ${f}: already shaded`); continue; }
    writeFileSync(process.env.DEBUG_TO ? `${process.env.DEBUG_TO}/${f.split('/').pop()}` : f, r.svg);
    if (!known) known = r.decisions;
    console.log(`  ${f}: ${Object.values(r.decisions).filter(d => d.fill || d.band).length} shapes shaded`);
  }
}

// THE TOWERS: drawn from their SVG, shaded, every stone its own shade and the lowest
// stones mossy, and written over the tower's PNG — the PNG is what the game draws.
// The SVG is never touched, so this can be run again at any time and gives the same
// PNG; after the owner uploads a tower again, run it again for that tower.
//
// Most towers' faces were picked by hand, by the order of the <path> tags in the
// file (the first is 0), because a roof of planks or a cone roof is more than the
// rules above can read. A tower uploaded afresh must be picked again or set to 'auto'
// (the rules above, which read walls and battlements well); `auto: true` beside a
// list picks those paths by hand and leaves the rest to the rules. The Abbey's roof
// cross is drawn in the walls' grey and is `keep`: left as drawn.
//
// At the owner's word: the cone roofs of the High Altar and the Judgment Temple lit
// on the faces left of the peak and dark on those right of it, as the boards' huts;
// and the top of every banner, where it lies over the edge of the roof, lit (the
// Assassin Guild's, in timber brown, was lit by the rules already).
const TOWERS = {
  'archery/Archery_Tower_T2': { top: [34, 109], side: [89, 119, 120, 121] },
  'archery/Archery_Tower_T3': { top: [1, 112], side: [3, 108, 109, 110] },
  'archery/Musketeer_Post': { top: [1, 59, 62, 65, 67, 56], side: [3, 60, 63, 66, 68] },
  'archery/Crossbow_Sentry': { top: [1, 60, 79, 77, 63, 57], side: [3, 61, 80, 78, 64] },
  'artillery/Ballista_Turret_Tower': { top: [40, 41, 73, 81, 76, 79], side: [2, 43, 74, 82, 77, 80] },
  'artillery/Cannon_Outpost_Tower': { top: [40, 41, 73, 81, 76, 79], side: [2, 43, 74, 82, 77, 80] },
  // The tent: its right-hand end, and the door flap rolled back on it, dark.
  // No stones to vary: its grey is the spearheads' steel.
  'barracks/Barracks_Tower_T1': { top: [], side: [4, 6, 7], stone: false },
  'barracks/Barracks_Tower_T2': 'auto',
  'barracks/Barracks_Tower_T3': 'auto',
  'barracks/Paladin_Keep': { auto: true, top: [69], side: [] },
  'barracks/Assassin_Guild': 'auto',
  'monastery/Monastery_Tower_T1': { top: [5], side: [7] },
  'monastery/Monastery_Tower_T2': { top: [9, 57], side: [11, 59, 60, 61] },
  'monastery/Monastery_Tower_T3': { top: [1, 26, 27, 29, 31, 33, 35, 52], side: [2, 28, 30, 32, 34, 36, 54, 55, 56], keep: [66] },
  'monastery/High_Altar': { top: [26, 35, 58, 62, 66], side: [2, 50, 47, 56, 59, 60, 61, 67, 68] },
  'monastery/Judgment_Temple': { top: [26, 35, 52, 56, 60], side: [2, 44, 41, 50, 53, 54, 55, 61, 62] },
};
// A tower is sorted at about the size it stands on a board drawn at 1920, so the
// rules' sizes mean the same as on a board.
const TOWER_PX = 240, PNG_PX = 1024;
// By hand: the n-th <path>'s fill, top or side. #735a31 is the archery towers' timber.
const BY_HAND = {
  top: { '#969696': '#b6b6b6', '#74592e': '#8b6b37', '#735a31': '#8a6c3b' },
  side: { '#969696': '#7d7d7d', '#74592e': '#604a26', '#735a31': '#5f4b29' },
};
// Any other colour: a fifth lighter, or a sixth darker, as on the boards.
const tone = (c, k) => '#' + [1, 3, 5].map(i => Math.min(255, Math.round(parseInt(c.slice(i, i + 2), 16) * k)).toString(16).padStart(2, '0')).join('');
// Kept as drawn through the stone pass: a grey the pass does not take for stone.
const KEEP = '#9a9692';

async function shadeTower(page, f, job) {
  let src = readFileSync(`assets/towers/${f}.svg`, 'utf8');
  let svg;
  const byHand = src => {
    let i = -1;
    return src.replace(/<path\b[^>]*>/g, tag => {
      i++;
      if ((job.keep || []).includes(i)) return tag.replace('fill="#969696"', `fill="${KEEP}"`);
      const up = job.top.includes(i), down = job.side.includes(i);
      if (!up && !down) return tag;
      const to = up ? BY_HAND.top : BY_HAND.side;
      const recolour = (m, a, c) => `${a}="${to[c] || tone(c, up ? TOP : SIDE)}"`;
      // A shape drawn as a wide line and no fill (the tent's door flaps) is its line.
      return /fill="#[0-9a-f]{6}"/.test(tag) ? tag.replace(/(fill)="(#[0-9a-f]{6})"/, recolour) : tag.replace(/(stroke)="(#[0-9a-f]{6})"/, recolour);
    });
  };
  if (job === 'auto' || job.auto) {
    if (job.auto) src = byHand(src);
    await page.setViewportSize({ width: TOWER_PX, height: TOWER_PX });
    await page.setContent(`<body style="margin:0">${src.replace(/(<svg[^>]*?)\swidth="1024" height="1024"/, `$1 width="${TOWER_PX}" height="${TOWER_PX}"`)}</body>`);
    svg = (await page.evaluate(shadeInPage, [1e6, 1e6, FACE, ROUND, ROCK, DEADWOOD, TOP, SIDE, BAND, MARK, null, false])).svg;
  } else svg = byHand(src);
  const png = readFileSync(`assets/towers/${f}.png`).toString('base64');
  const r = await page.evaluate(stoneInPage, [svg, png, PNG_PX, KEEP, job.stone !== false]);
  // The PNG must be the SVG drawn, or the swap would move the tower.
  if (r.mismatch > 0.02) { console.log(`  ${f}: SVG and PNG differ by ${(r.mismatch * 100).toFixed(1)}% — not written`); return; }
  writeFileSync(`assets/towers/${f}.png`, Buffer.from(r.png.split(',')[1], 'base64'));
  console.log(`  ${f}: ${r.stones} stones`);
}

// EVERY STONE ITS OWN SHADE: each patch of wall grey between the lines is made a
// little lighter or darker, and the lowest quarter of the walls darker still, some of
// it green with moss. Seeded, so the same tower comes out the same every time.
async function stoneInPage([svg, png, N, KEEP, stone]) {
  const load = async t => { const im = new Image(); im.src = t; await im.decode(); return im; };
  const draw = im => { const c = document.createElement('canvas'); c.width = c.height = N; c.getContext('2d').drawImage(im, 0, 0, N, N); return c; };
  const shipped = draw(await load(`data:image/png;base64,${png}`)).getContext('2d').getImageData(0, 0, N, N).data;
  const c = draw(await load(`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`));
  const g = c.getContext('2d'), img = g.getImageData(0, 0, N, N), d = img.data;
  let diff = 0, on = 0;
  for (let k = 3; k < d.length; k += 4) { if (d[k] > 128 || shipped[k] > 128) on++; if ((d[k] > 128) !== (shipped[k] > 128)) diff++; }
  const greys = [0x96, 0x7d, 0xb6];
  const wall = k => { if (!stone) return false; const r = d[k], gg = d[k + 1], bb = d[k + 2]; return d[k + 3] > 250 && Math.abs(r - gg) < 3 && Math.abs(gg - bb) < 3 && greys.some(v => Math.abs(r - v) < 4); };
  const seen = new Uint8Array(N * N); let seed = 7, stones = 0;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let ymin = N, ymax = 0;
  for (let q = 0; q < N * N; q++) if (wall(q * 4)) { const y = (q / N) | 0; if (y < ymin) ymin = y; if (y > ymax) ymax = y; }
  for (let p0 = 0; p0 < N * N; p0++) {
    if (seen[p0] || !wall(p0 * 4)) continue;
    const st = [p0], px = []; seen[p0] = 1;
    while (st.length) {
      const q = st.pop(); px.push(q); const x = q % N, y = (q / N) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const n = ny * N + nx; if (!seen[n] && wall(n * 4)) { seen[n] = 1; st.push(n); }
      }
    }
    if (px.length < 40) continue;
    const cy = px.reduce((t, q) => t + ((q / N) | 0), 0) / px.length;
    const low = Math.max(0, (cy - (ymax - 0.25 * (ymax - ymin))) / (0.25 * (ymax - ymin)));
    const k = 1 + (rnd() - 0.55) * 0.26 - low * 0.2, moss = rnd() < 0.45 * low;
    for (const q of px) {
      const o = q * 4; let r = d[o] * k, gg = d[o + 1] * k, bb = d[o + 2] * k;
      if (moss) { r *= 0.93; bb *= 0.86; }
      d[o] = Math.min(255, r); d[o + 1] = Math.min(255, gg); d[o + 2] = Math.min(255, bb);
    }
    stones++;
  }
  const keep = [1, 3, 5].map(i => parseInt(KEEP.slice(i, i + 2), 16));
  for (let q = 0; q < d.length; q += 4) if (d[q] === keep[0] && d[q + 1] === keep[1] && d[q + 2] === keep[2]) d[q] = d[q + 1] = d[q + 2] = 0x96;
  g.putImageData(img, 0, 0);
  return { mismatch: diff / on, stones, png: c.toDataURL('image/png') };
}

const [what, only] = process.argv.slice(2);
if (what !== 'maps' && what !== 'towers') { console.log('usage: node tools/shade.mjs maps [stage] | towers [name]'); process.exit(1); }
const b = await chromium.launch({ executablePath: CHROME });
const page = await b.newPage();
if (process.env.DEBUG_TO) page.on('console', m => console.log(m.text()));
if (what === 'towers') {
  for (const [f, job] of Object.entries(TOWERS)) {
    if (only && !f.includes(only)) continue;
    await shadeTower(page, f, job);
  }
  await b.close();
  process.exit(0);
}
for (let n = 1; n <= 16; n++) {
  if (only && +only !== n) continue;
  const at = `assets/map/Stage_${n}_Map`;
  console.log(`stage ${n}`);
  // Stage 8's bell cover is a piece of the front sheet, drawn again over the bell.
  await shadeSheets(page, ['_base', '_front', '_over', '_bell_cover'].map(s => `${at}${s}.svg`), 1920, 1080, OWNER[n]);
}
await b.close();
