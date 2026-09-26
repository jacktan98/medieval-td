// STAGE 8'S CHURCH WITHOUT ITS TWO BANNERS, so the game knows exactly what wall is
// behind them. Node only. Run after tools/split-map.mjs, whenever it has been run:
//
//   node tools/bare-banners.mjs
//
// The owner's word, on the church's banners swaying: "use the same concept as the
// tier 4 towers as I see the line broken." A swaying cloth uncovers the wall it was
// painted over, and on a tower that wall is REBUILT from the stone either side of it
// — which the owner redrew plain behind every tier 4 banner, so it rebuilds cleanly.
// The church's wall is coursed brick. Rebuilt row by row, its mortar lines came out
// broken where the cloth had been.
//
// So nothing is rebuilt here: the wall is the artist's own. This writes
// Stage_8_Map_front_bare.svg, the front sheet with each banner taken out — the cloth
// (BANNER_FILL, inside BANNERS) and everything painted after it that lies within its
// outline: the cross, the shield. The game lays that where each cloth swings, and the
// cloth itself is whatever differs between the two sheets (see bannerLayers in
// src/render.js, `bare` on the level's `mapBanners`).
import { readFileSync, writeFileSync } from 'fs';
import { bounds, points, own, compose, parseTransform, MAP_SCALE } from './svg.mjs';

const FRONT = 'assets/map/Stage_8_Map_front.svg';
const BARE = 'assets/map/Stage_8_Map_front_bare.svg';
const BANNER_FILL = '#e9e9e9';
const BANNERS = { x0: 420, y0: 150, x1: 530, y1: 240 };   // board px, the nave's wall

const svg = readFileSync(FRONT, 'utf8');
const tag = /<(\/?)(g|path|rect)\b([^>]*?)(\/?)>/g;
tag.lastIndex = svg.indexOf('>', svg.indexOf('<g clip-path')) + 1;
let tf = [[1, 0, 0, 1, 0, 0]];
const shapes = [];
for (let m; (m = tag.exec(svg));) {
  const [whole, close, name, attrs, selfClose] = m;
  if (name === 'path' || name === 'rect') {
    const d = attrs.match(/\bd="([^"]*)"/);
    const pts = d ? points(d[1], own(attrs, tf[tf.length - 1])) : [];
    if (pts.length) {
      const b = bounds(pts);
      shapes.push({ at: m.index, len: whole.length, fill: (attrs.match(/\bfill="([^"]*)"/) || [])[1],
        x0: b.x0 * MAP_SCALE, y0: b.y0 * MAP_SCALE, x1: b.x1 * MAP_SCALE, y1: b.y1 * MAP_SCALE });
    }
    continue;
  }
  if (!close && !selfClose) tf.push(compose(tf[tf.length - 1], parseTransform((attrs.match(/transform="([^"]*)"/) || [])[1])));
  else if (close && tf.length > 1) tf.pop();
}
const inside = (s, b, slack = 1) => s.x0 >= b.x0 - slack && s.x1 <= b.x1 + slack && s.y0 >= b.y0 - slack && s.y1 <= b.y1 + slack;
// The cloths: the banner's white, of a banner's size, on the nave's wall.
const cloths = shapes.filter(s => s.fill === BANNER_FILL && inside(s, BANNERS, 0) && s.x1 - s.x0 > 20 && s.y1 - s.y0 > 30);
if (cloths.length !== 2) {
  console.error(`expected the church's 2 banners in ${FRONT}, found ${cloths.length}`);
  process.exit(1);
}
const drop = new Set();
for (const c of cloths) {
  for (const s of shapes) if (s.at >= c.at && inside(s, c)) drop.add(s);
  console.log(`banner at ${[c.x0, c.y0, c.x1, c.y1].map(v => v.toFixed(1)).join(' ')}: ` +
    `${[...drop].filter(s => s.at >= c.at && inside(s, c)).length} shape(s) taken out`);
}
let out = '', last = 0;
for (const s of [...drop].sort((a, b) => a.at - b.at)) {
  out += svg.slice(last, s.at);
  last = s.at + s.len;
}
out += svg.slice(last);
writeFileSync(BARE, out);
console.log(`wrote ${BARE}`);
