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
//   2. EVERYTHING PAINTED AFTER IT — the roof, the front pillars, the cross, the
//      nave — is written, alone, to Stage_8_Map_bell_cover.svg, which the game draws
//      again just after the bell, and ONLY over the space the bell swings through
//      (`bell.box` in level10.js). So there the roof and pillars cover it exactly as
//      they covered the painted one, outlines and all, and nothing that was behind
//      it is brought forward; everywhere else the church is the front sheet, as drawn.
//
//      IT WAS ONCE ONLY THE SHAPES THAT REACHED INTO THAT SPACE, drawn over the whole
//      tower, and the owner found what that does: a shape redrawn without the ones
//      painted over it lies on top of them — the roof over the foot of the cross, the
//      nave's roof over the lines of its own planks. All of them, and only there.
//
// It refuses if there is no bell to cut — which is what a second run finds.
import { readFileSync, writeFileSync } from 'fs';
import { allGroups, bounds, MAP_SCALE } from './svg.mjs';

const LAYER = 'assets/map/Stage_8_Map_Layer_3b.svg';
const COVER = 'assets/map/Stage_8_Map_bell_cover.svg';
const BELL_FILL = '#ffd700';
const BELL_BOX = { x0: 380, y0: 90, x1: 435, y1: 145 };   // board px, round the tower's opening

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
console.log(`bell at ${[bb.x0, bb.y0, bb.x1, bb.y1].map(v => (v * MAP_SCALE).toFixed(1)).join(' ')}`);

// Every path after the bell kept; every other path dropped. Groups stay as they
// are, so each kept path keeps its transforms.
const tag = /<(path|rect)\b[^>]*?\/>/g;
tag.lastIndex = svg.indexOf('>', svg.indexOf('<g clip-path')) + 1;
let cover = '', last = 0, kept = 0;
for (let m; (m = tag.exec(svg));) {
  const keep = m.index >= bell.end;
  cover += svg.slice(last, m.index) + (keep ? m[0] : '');
  last = m.index + m[0].length;
  if (keep) kept++;
}
cover += svg.slice(last);
writeFileSync(COVER, cover);
writeFileSync(LAYER, svg.slice(0, bell.start) + svg.slice(bell.end));
console.log(`cut the bell out of ${LAYER}; ${kept} path(s) in front of it written to ${COVER}`);
