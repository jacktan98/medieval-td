// STAGE 8'S CHURCH BELL, taken out of the drawing so the game can swing it, and
// what hangs in front of it kept so it can be put back over the swinging bell.
// Node only. Run once after a redraw of the church, BEFORE tools/split-map.mjs:
//
//   node tools/bell-cover.mjs
//   node tools/split-map.mjs assets/map/Stage_8_Map
//
// The owner's word: the bell swings left and right as each wave starts, and "the
// roof overlaps the church bell". The bell is drawn in the tower between its
// pillars, the roof hanging down over its top and the front pillar across its
// right-hand side. So:
//
//   1. THE BELL — the gold shape in the tower (BELL_FILL, within BELL_BOX) — is cut
//      out of Stage_8_Map_Layer_3b.svg, so the base and front sheets have none and
//      the game draws the owner's three bell drawings in its place (src/data/level10.js,
//      `bell`).
//   2. EVERYTHING PAINTED AFTER IT that reaches into the space it swings through —
//      the roof, the front pillars, the nave's roof edge — is written, alone, to
//      Stage_8_Map_bell_cover.svg, which the game draws again just after the bell.
//      So the roof and pillars cover it exactly as they covered the painted one,
//      outlines and all, and nothing that was behind it is brought forward.
//
// It refuses if there is no bell to cut — which is what a second run finds.
import { readFileSync, writeFileSync } from 'fs';
import { allGroups, bounds, points, own, compose, parseTransform, MAP_SCALE } from './svg.mjs';

const LAYER = 'assets/map/Stage_8_Map_Layer_3b.svg';
const COVER = 'assets/map/Stage_8_Map_bell_cover.svg';
const BELL_FILL = '#ffd700';
const BELL_BOX = { x0: 380, y0: 90, x1: 435, y1: 145 };   // board px, round the tower's opening
const SWING = 10;                                          // px either side it may reach

const svg = readFileSync(LAYER, 'utf8');
const inBox = (b, box) => b.x0 * MAP_SCALE >= box.x0 && b.x1 * MAP_SCALE <= box.x1 &&
  b.y0 * MAP_SCALE >= box.y0 && b.y1 * MAP_SCALE <= box.y1;
// The bell: the biggest group inside the box that holds the gold.
const bell = allGroups(svg)
  .filter(g => inBox(bounds(g.subPaths.flat()), BELL_BOX) && svg.slice(g.start, g.end).includes(`fill="${BELL_FILL}"`))
  .sort((a, b) => (b.end - b.start) - (a.end - a.start))[0];
if (!bell) {
  console.error(`no bell in ${LAYER} — already cut? (this tool runs once per redraw)`);
  process.exit(1);
}
const bb = bounds(bell.subPaths.flat());
const reach = { x0: bb.x0 * MAP_SCALE - SWING, x1: bb.x1 * MAP_SCALE + SWING,
                y0: bb.y0 * MAP_SCALE - 4, y1: bb.y1 * MAP_SCALE + 6 };
console.log(`bell at ${[bb.x0, bb.y0, bb.x1, bb.y1].map(v => (v * MAP_SCALE).toFixed(1)).join(' ')}`);

// Every path after the bell, kept if it reaches into the swing; every other path
// dropped. Groups stay as they are, so each kept path keeps its transforms.
const tag = /<(\/?)(g|path|rect)\b([^>]*?)(\/?)>/g;
tag.lastIndex = svg.indexOf('>', svg.indexOf('<g clip-path')) + 1;
let tf = [[1, 0, 0, 1, 0, 0]], cover = '', last = 0, kept = 0;
for (let m; (m = tag.exec(svg));) {
  const [whole, close, name, attrs, selfClose] = m;
  if (name === 'path' || name === 'rect') {
    const d = attrs.match(/\bd="([^"]*)"/);
    let keep = false;
    if (d && m.index >= bell.end) {
      const pts = points(d[1], own(attrs, tf[tf.length - 1]));
      const b = pts.length && bounds(pts);
      keep = b && b.x1 * MAP_SCALE >= reach.x0 && b.x0 * MAP_SCALE <= reach.x1 &&
        b.y1 * MAP_SCALE >= reach.y0 && b.y0 * MAP_SCALE <= reach.y1;
    }
    cover += svg.slice(last, m.index) + (keep ? whole : '');
    last = m.index + whole.length;
    if (keep) kept++;
    continue;
  }
  if (!close && !selfClose) tf.push(compose(tf[tf.length - 1], parseTransform((attrs.match(/transform="([^"]*)"/) || [])[1])));
  else if (close && tf.length > 1) tf.pop();
}
cover += svg.slice(last);
writeFileSync(COVER, cover);
writeFileSync(LAYER, svg.slice(0, bell.start) + svg.slice(bell.end));
console.log(`cut the bell out of ${LAYER}; ${kept} path(s) in front of it written to ${COVER}`);
