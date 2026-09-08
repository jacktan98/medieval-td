// Checks the world map: that the committed geometry still matches the artwork,
// that every road leads where it says, and that a marker without a map behind it
// cannot be tapped into a game. Node only — never loaded by the game.
//
//   node tools/campaign.mjs
//
// WHY THIS IS ITS OWN FILE, and not part of tools/overview.mjs. That file is a
// GENERATOR — it reads the artist's layers and writes src/data/overview.js and
// two stacked maps — and a generator cannot check its own output, because
// re-running it makes any question about staleness answer itself. The one failure
// this whole feature is most likely to have is the artist moving a marker and
// nobody re-running the tool, and the only way to catch that is from outside.
//
// The same trap the map splitter has, in other words. See the note at the top of
// assets/map/README.md about `Map_N_base.svg` being DERIVED and committed: there
// is no build step, so an upload alone is never enough.
//
// The six things asked, in the order they would break:
//
//   THE DATA IS NOT STALE      every stage sits on the marker the SVG draws
//   AND NOTHING WAS ADDED      the counts of markers and road paths still agree
//   EVERY ROAD ARRIVES         each stage's leg ends at that stage
//   AND STARTS SOMEWHERE REAL  at the stage before it, or off the edge for stage 1
//   THE MARKERS ARE APART      no two tap targets overlap
//   AND LOCKED MEANS LOCKED    every reached marker opens its panel, and Start
//                              refuses on the ones with no board behind them

import { readFileSync, readdirSync } from 'fs';
import { STAGES, STAGE_COUNT, playable } from '../src/data/overview.js';
import { stageAt, stageOfLevel } from '../src/overview.js';
import { hitStart, START_BTN } from '../src/render.js';
import { canReach, setReached } from '../src/admin.js';
import { levels } from '../src/level.js';

// THE LAYERS ARE THE SOURCE, not the merged file. Overview_Map.svg is written by
// the same tool this checks, so comparing the data against it would be asking the
// generator whether it agrees with itself. Staleness lives between the artist's
// layers and the committed data, and that is the gap this reads across.
const DIR = 'assets/map';
const GUIDE = `${DIR}/Overview_Map_Layer_1.svg`;
const SEPIA = `${DIR}/Overview_Map_sepia.svg`;
const MERGED = `${DIR}/Overview_Map_merged.svg`;
const NAMES = `${DIR}/Overview_Map_names.svg`;
const SCALE = 0.5;
const NODE_HIT = 22;   // must match src/overview.js

let bad = 0;
const ok = (cond, label, detail = '') => {
  if (!cond) bad++;
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(54)} ${detail}`);
};

// --- what the drawing says today --------------------------------------------

const layerFiles = readdirSync(DIR)
  .filter(f => /^Overview_Map_Layer_\d+\.svg$/.test(f))
  .sort((a, b) => (+a.match(/\d+/)[0]) - (+b.match(/\d+/)[0]))
  .map(f => `${DIR}/${f}`);

const svg = readFileSync(GUIDE, 'utf8');
const allLayers = layerFiles.map(f => readFileSync(f, 'utf8')).join('\n');

// THE GROUP TRANSFORMS ARE WALKED HERE TOO, deliberately as a second
// implementation rather than by importing the generator's. A checker that shares
// the code it is checking cannot catch a bug in it — and this is the exact bug
// this feature already had once, where paths were read without their groups and
// every building in the artboard landed hundreds of pixels from where it is
// drawn. Both readings agreeing is the thing worth knowing.
const ID = [1, 0, 0, 1, 0, 0];
const mul = (P, C) => [
  P[0] * C[0] + P[2] * C[1], P[1] * C[0] + P[3] * C[1],
  P[0] * C[2] + P[2] * C[3], P[1] * C[2] + P[3] * C[3],
  P[0] * C[4] + P[2] * C[5] + P[4], P[1] * C[4] + P[3] * C[5] + P[5]
];

// Flatten a path to a polygon in artboard units. Curves are sampled rather than
// taken at their endpoints, because the road's edges ARE curves and a polygon cut
// across them would report the road narrower than it is drawn. Written here rather
// than imported, for the reason in the note above.
function outline(d, m) {
  const toks = d.match(/[MLCQZmlcqz]|-?\d+\.?\d*(?:[eE][-+]?\d+)?/g) || [];
  const at = (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const pts = [];
  let cur = null;
  for (let i = 0; i < toks.length;) {
    const t = toks[i];
    const n = k => Number(toks[i + k]);
    if (/[MLml]/.test(t)) { cur = at(n(1), n(2)); pts.push(cur); i += 3; }
    else if (/[Cc]/.test(t)) {
      const p1 = at(n(1), n(2)), p2 = at(n(3), n(4)), p3 = at(n(5), n(6));
      for (let k = 1; k <= 12; k++) {
        const u = k / 12, v = 1 - u;
        pts.push([
          v*v*v*cur[0] + 3*v*v*u*p1[0] + 3*v*u*u*p2[0] + u*u*u*p3[0],
          v*v*v*cur[1] + 3*v*v*u*p1[1] + 3*v*u*u*p2[1] + u*u*u*p3[1]
        ]);
      }
      cur = p3; i += 7;
    } else if (/[Qq]/.test(t)) {
      const p1 = at(n(1), n(2)), p2 = at(n(3), n(4));
      for (let k = 1; k <= 12; k++) {
        const u = k / 12, v = 1 - u;
        pts.push([
          v*v*cur[0] + 2*v*u*p1[0] + u*u*p2[0],
          v*v*cur[1] + 2*v*u*p1[1] + u*u*p2[1]
        ]);
      }
      cur = p2; i += 5;
    } else i += 1;
  }
  return pts;
}

const drawnMarkers = [];
const roadLines = [];   // the road as the artist drew it, flattened, artboard units
let paths = 0, transformed = 0;
{
  const stack = [ID];
  const TAG = /<(\/?)(g|path)\b([^>]*)>/g;
  for (let t; (t = TAG.exec(svg));) {
    const [, close, name, attrs] = t;
    if (name === 'g') {
      if (close) { stack.pop(); continue; }
      const tm = /transform="matrix\(([^)]+)\)"/.exec(attrs);
      const n = tm ? tm[1].split(',').map(Number) : null;
      stack.push(mul(stack[stack.length - 1], n && n.length === 6 ? n : ID));
      continue;
    }
    if (close) continue;

    const dm = /\bd="([^"]+)"/.exec(attrs);
    if (!dm) continue;
    const fm = /\bfill="(#[0-9a-fA-F]{6})"/.exec(attrs);
    const sm = /\bstroke="(#[0-9a-fA-F]{6})"/.exec(attrs);
    if (!fm && !sm) continue;
    paths++;

    const m = stack[stack.length - 1];
    if (m.some((v, i) => v !== ID[i])) transformed++;
    const nums = (dm[1].match(/-?\d+\.?\d*(?:[eE][-+]?\d+)?/g) || []).map(Number);
    const xs = [], ys = [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      xs.push(m[0] * nums[i] + m[2] * nums[i + 1] + m[4]);
      ys.push(m[1] * nums[i] + m[3] * nums[i + 1] + m[5]);
    }
    const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    const fill = fm ? fm[1].toLowerCase() : null;
    if (fill === '#d30000') {
      drawnMarkers.push([(box[0] + box[2]) / 2 * SCALE, (box[1] + box[3]) / 2 * SCALE]);
    } else if (!fm && sm) {
      // THE ROAD IS A BARE LINE NOW, not a filled ribbon. It used to be found by
      // its sand colour and told apart from the beach by area, and the centre of it
      // had to be recovered by pairing the two sides of the outline. It is one
      // stroked path per leg, so there is nothing to recover and nothing to confuse
      // it with: on the guide layer, a path with no fill is road.
      roadLines.push(outline(dm[1], m));
    }
  }
}

const area = b => (b[2] - b[0]) * (b[3] - b[1]);

console.log('\n--- the committed data still describes the drawing ---\n');

ok(drawnMarkers.length === STAGE_COUNT,
  'the SVG holds one marker per stage',
  `${drawnMarkers.length} drawn, ${STAGE_COUNT} in the data`);

// STALENESS, and the reason this file exists. Every stage must sit on a marker
// the artist has actually drawn. Half a pixel of slack because the data is
// rounded to one decimal on the way out; anything larger is a marker that moved.
{
  let off = 0, worst = 0;
  for (const s of STAGES) {
    const near = drawnMarkers.reduce((best, m) =>
      Math.hypot(s.x - m[0], s.y - m[1]) < Math.hypot(s.x - best[0], s.y - best[1]) ? m : best,
      drawnMarkers[0]);
    const d = Math.hypot(s.x - near[0], s.y - near[1]);
    worst = Math.max(worst, d);
    if (d > 0.5) off++;
  }
  ok(off === 0, 'and every stage sits on one of them',
    off ? `${off} stage(s) adrift — re-run node tools/overview.mjs`
        : `worst ${worst.toFixed(2)}px`);
}

// ONE LINE PER STAGE, which is what makes the rest of this simple. Nine legs join
// two markers and one comes in from off the map to reach stage 1, so the count is
// the number of stages exactly — and a line added or removed since the tool last
// ran is the staleness this file exists to catch, which the stage positions alone
// would not notice.
ok(roadLines.length === STAGE_COUNT, 'and one road line per stage, no more',
  `${roadLines.length} line(s) in the guide, ${STAGE_COUNT} stage(s)`);

// AND EVERY ONE OF THEM IS OPEN. A road that closes back on itself is a shape the
// artist has drawn by accident, and it would be followed all the way round.
{
  const closed = roadLines.filter(L =>
    Math.hypot(L[0][0] - L[L.length - 1][0], L[0][1] - L[L.length - 1][1]) < 1).length;
  ok(closed === 0, 'and every one of them is a line rather than a loop',
    closed ? `${closed} close back on themselves` : `${roadLines.length} open`);
}

// The reading that caught a real bug once. The guide layer carries no transforms
// at all — it is drawn flat — so this is asked of the PICTURE layers, which are
// full of mirrored groups and are where getting it wrong would move a building.
{
  const tf = (allLayers.match(/transform="matrix\(/g) || []).length;
  ok(tf > 0, 'and the picture still nests shapes inside moved groups',
    `${tf} transform(s) across ${layerFiles.length} layer(s)`);
}

console.log('\n--- every road leads where it says ---\n');

// A leg is the road INTO its stage, so its last point is that stage — but not its
// centre. The road is drawn UP TO a marker rather than through it, so the
// centreline stops at its own cap, which can sit a marker's width short. 20px of
// slack against a closest-marker-pair of 65 leaves no room to mistake one stage
// for another, which is the only thing this can actually get wrong.
{
  let off = 0, worst = 0;
  for (const [i, s] of STAGES.entries()) {
    const end = s.leg[s.leg.length - 1];
    const d = Math.hypot(end[0] - s.x, end[1] - s.y);
    worst = Math.max(worst, d);
    if (d > 20) { off++; console.log(`      stage ${i + 1} leg ends ${d.toFixed(1)}px from its marker`); }
  }
  ok(off === 0, 'every leg ends at the stage it belongs to', `worst ${worst.toFixed(1)}px`);
}

// And starts at the stage before it on the road — except stage 1's, which comes
// in from off the left edge of the artboard and is the animation a brand-new
// player sees. It is the ONE leg allowed to begin nowhere.
{
  // AT the edge counts as off it: the artist draws to the boundary of the artboard
  // and Graphite clips there, so a line meant to come in from outside starts at
  // exactly zero rather than at a negative number.
  const first = STAGES[0].leg[0];
  ok(first[0] <= 0.5, "stage 1's road comes in from off the map",
    `starts at x ${first[0]}`);

  let orphan = 0;
  for (let i = 1; i < STAGE_COUNT; i++) {
    const start = STAGES[i].leg[0];
    const near = STAGES.some((o, j) => j !== i && Math.hypot(start[0] - o.x, start[1] - o.y) <= 16);
    if (!near) { orphan++; console.log(`      stage ${i + 1}'s road starts at no stage at all`); }
  }
  ok(orphan === 0, 'and every other one starts at a stage', `${STAGE_COUNT - 1} checked`);
}

console.log('\n--- the markers are tappable and tell each other apart ---\n');

// Two markers closer than two tap radii would give a tap to whichever is tested
// first, which is an ordering accident rather than a decision.
{
  let clash = 0, closest = Infinity;
  for (let i = 0; i < STAGE_COUNT; i++) {
    for (let j = i + 1; j < STAGE_COUNT; j++) {
      const d = Math.hypot(STAGES[i].x - STAGES[j].x, STAGES[i].y - STAGES[j].y);
      closest = Math.min(closest, d);
      if (d < NODE_HIT * 2) { clash++; console.log(`      stages ${i + 1} and ${j + 1} are ${d.toFixed(0)}px apart`); }
    }
  }
  ok(clash === 0, 'no two markers share a tap', `closest pair ${closest.toFixed(0)}px, targets ${NODE_HIT * 2}px`);
}

// Every marker has to be ON the board, or it is a stage that cannot be reached.
{
  const out = STAGES.filter(s => s.x < 0 || s.x > 960 || s.y < 0 || s.y > 540);
  ok(out.length === 0, 'and every marker is on the screen', `${STAGE_COUNT} within 960x540`);
}

console.log('\n--- a marker with no map behind it is not a button ---\n');

// The whole point of the locked state: the artist draws markers ahead of the
// boards, and a tap on one must do nothing rather than start a game on whatever
// level index happens to be lying around.
{
  const built = STAGES.filter(s => s.level !== null);
  ok(built.length === levels.length,
    'every level the game has is somewhere on the road',
    `${built.length} playable stage(s), ${levels.length} level(s)`);

  const ids = built.map(s => s.level);
  ok(new Set(ids).size === ids.length && ids.every(i => i >= 0 && i < levels.length),
    'and no level is claimed by two stages', ids.join(', '));

  ok(built.every((s, i) => STAGES.indexOf(s) === i),
    'and the playable ones come first, in order',
    built.map(s => levels[s.level].name).join(' -> '));
}

// stageAt is what input.js asks, and it must refuse twice over: for a stage the
// player has not reached, and for a marker with no map behind it.
{
  const all = { unlocked: STAGE_COUNT };
  const reachedButUnbuilt = STAGES
    .map((s, i) => [i, s])
    .filter(([, s]) => s.level === null);

  // IT ANSWERS, and that is the rule now. A marker you can see with a flag on it
  // that does nothing when tapped is a dead control with no explanation; the
  // panel opens instead and its Start button is drawn locked. What must still
  // hold is that the panel cannot be turned into a game — checked below through
  // hitStart, which is the thing that would actually start one.
  ok(reachedButUnbuilt.every(([i, s]) => stageAt(all, s.x, s.y) === i),
    'a reached marker with no map opens its panel',
    `${reachedButUnbuilt.length} locked marker(s) tested at full progress`);

  // And Start refuses on every one of them. This is the check that matters: the
  // drawing being dimmed is cosmetic, and a live hit test under a dead-looking
  // button would launch a game on whatever level index was lying around.
  ok(reachedButUnbuilt.every(([i]) =>
      !hitStart({ started: false, stage: i }, START_BTN.x + START_BTN.w / 2,
                START_BTN.y + START_BTN.h / 2)),
    'and its Start button will not start anything', 'hitStart refuses all of them');

  // While a stage that HAS a board is startable from the same place, or the check
  // above would pass by refusing everybody.
  const built0 = STAGES.findIndex(s => s.level !== null);
  ok(hitStart({ started: false, stage: built0 }, START_BTN.x + START_BTN.w / 2,
               START_BTN.y + START_BTN.h / 2),
    'while a stage with a board still starts', `stage ${built0 + 1}`);

  const none = { unlocked: 1 };
  ok(stageAt(none, STAGES[0].x, STAGES[0].y) === 0,
    'the first stage answers as soon as it is reached');
  ok(STAGES.slice(1).every((s) => stageAt(none, s.x, s.y) === null),
    'and nothing further along does', 'unlocked = 1');

  // Just off the edge of the target, and well away from it.
  ok(stageAt(all, STAGES[0].x + NODE_HIT - 1, STAGES[0].y) === 0 &&
     stageAt(all, STAGES[0].x + NODE_HIT + 6, STAGES[0].y) === null,
    'and the tap target is the size it claims', `${NODE_HIT}px radius`);
}

// The round trip input.js and main.js both depend on: a level index has to come
// back as the stage that plays it.
{
  const trip = levels.every((_, li) => {
    const i = stageOfLevel(li);
    return i !== null && STAGES[i].level === li;
  });
  ok(trip, 'and every level knows which stage it is',
    levels.map((l, li) => `${l.name}=${stageOfLevel(li) + 1}`).join(', '));

  ok(stageOfLevel(levels.length) === null,
    'while a level that does not exist is nowhere');
}

console.log('\n--- the display map is the same drawing, muted ---\n');

// The recoloured map is DERIVED and committed like everything else here, so it
// can go stale on its own — a redraw that is recoloured but not re-extracted, or
// re-extracted but not recoloured, both leave a file that no longer matches.
{
  const sep = readFileSync(SEPIA, 'utf8');

  const paths = t => (t.match(/<path\b[^>]*>/g) || []);
  // THE NAMES ARE NOT IN THE DISPLAY MAP, and that is the point of them. They are
  // laid over the parchment rather than under it, so they cannot be part of the
  // picture the parchment is multiplied over — they live in their own file and are
  // counted against that instead, below.
  const LETTERING_FILL = '#fff5e1';
  const isNames = t => paths(t).length > 0 &&
    paths(t).every(g => /fill="#fff5e1"/i.test(g));
  const pictureFiles = layerFiles.slice(1)
    .map(f => readFileSync(f, 'utf8'))
    .filter(t => !isNames(t));
  const nameFiles = layerFiles.slice(1)
    .map(f => readFileSync(f, 'utf8'))
    .filter(isNames);
  const pictureText = pictureFiles.join('\n');

  ok(paths(sep).length === paths(pictureText).length,
    'the display map holds every shape in the picture layers',
    `${paths(sep).length} path(s), ${paths(pictureText).length} across ` +
    `${pictureFiles.length} layer(s)`);

  const merged = readFileSync(MERGED, 'utf8');
  ok(paths(merged).length === paths(allLayers).length,
    'and the merged map holds every shape in every layer',
    `${paths(merged).length} path(s), ${paths(allLayers).length} across ${layerFiles.length}`);

  // THE GUIDES ARE ACTUALLY GONE from what the player sees, checked by colour
  // rather than by counting: a count can come out right while the wrong shapes
  // were dropped.
  const fillsIn = t => new Set((t.match(/fill="(#[0-9a-fA-F]{6})"/g) || []).map(f => f.slice(6, -1).toLowerCase()));
  ok(!fillsIn(sep).has('#d30000'), 'and no red marker survives in it',
    fillsIn(svg).has('#d30000') ? 'dropped from the guide' : 'none in the guide either');

  // EVERY SURVIVING SHAPE IS THE ARTIST'S OWN, geometry untouched — the
  // medallions are placed from the guide and drawn over this one, so the two must
  // be the same picture or every stage sits somewhere wrong.
  const dOf = t => { const m = /\bd="([^"]+)"/.exec(t); return m ? m[1] : null; };
  const drawn = new Set(paths(pictureText).map(dOf).filter(Boolean));
  const strayed = paths(sep).map(dOf).filter(d => d && !drawn.has(d));
  ok(strayed.length === 0, 'and every shape in it is one the artist drew',
    strayed.length ? `${strayed.length} shape(s) differ` : `${paths(sep).length} matched`);

  // The outlines are thinned, which is most of what stops it reading as a
  // colouring book. If a redraw ships a different width this stops firing and the
  // heavy line comes back without anybody noticing.
  const widths = new Set((sep.match(/stroke-width="([\d.]+)"/g) || []).map(w => w.slice(14, -1)));
  ok(!widths.has('4'), 'and its outlines are thinner than the artist drew them',
    `width(s): ${[...widths].join(', ') || 'none'}`);

  const colours = [...new Set((sep.match(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g) || [])
    .map(t => t.slice(-8, -1).toLowerCase()))];

  // EVERY COLOUR IS MUTED. It used to check that every one was literally a brown
  // — r >= g >= b — which was true while the map was full sepia and stopped being
  // true when the hues were let back in. What matters was never the hue; it is
  // that nothing on the map has enough life left in it to compete with a gold
  // medallion.
  //
  // Saturation is max minus min. The artist's own colours run 127 to 211 (the
  // grass, the sea, the red marker); everything here comes out at 55 or less, so
  // a bound of 80 separates a muted palette from a raw one with room to spare and
  // no room to be wrong.
  const SAT_MAX = 80;
  const sat = c => {
    const v = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    return Math.max(...v) - Math.min(...v);
  };
  const loud = colours.filter(c => sat(c) > SAT_MAX);
  ok(loud.length === 0, 'and every colour in it is muted',
    loud.length ? loud.map(c => `${c} at ${sat(c)}`).join(', ')
                : `${colours.length} shade(s), strongest ${Math.max(...colours.map(sat))} of ${SAT_MAX}`);

  // AND THE HUES SURVIVED, which is the other half of the same decision. A map
  // where every colour came out grey would pass the bound above and would have
  // thrown away exactly what the muting was pulled back to keep: water reading as
  // water rather than as a crease in a field.
  const hued = colours.filter(c => sat(c) >= 15);
  ok(hued.length >= 4, 'while keeping enough hue to tell materials apart',
    `${hued.length} of ${colours.length} shade(s) carry colour`);

  // A ramp that collapsed would be a silhouette rather than a map: the whole
  // point is that lighter things stay lighter.
  const lum = c => 0.299 * parseInt(c.slice(1, 3), 16) +
                   0.587 * parseInt(c.slice(3, 5), 16) +
                   0.114 * parseInt(c.slice(5, 7), 16);
  const lo = Math.min(...colours.map(lum)), hi = Math.max(...colours.map(lum));
  ok(hi - lo > 90, 'and the palette still ranges from dark to light',
    `${Math.round(lo)} to ${Math.round(hi)} of 255, over ${colours.length} shade(s)`);

  // THE NAMES REACH THE PLAYER EXACTLY AS DRAWN, which is what the owner asked for
  // twice: not muted, and not under the paper. The paper is a multiply over the
  // whole map, so a name inside the map picks up whatever grain, stain and vignette
  // happen to fall on it — one of them sat in the darkest corner of the map looking
  // like a different colour from the rest. The only place a name can be untouched is
  // ON TOP of the sheet, which means it cannot be in the picture underneath it.
  //
  // So they have a file of their own, and this checks it end to end: every letter
  // the artist drew is in it, in the colour they drew it, and none of them is in the
  // map that gets muted and papered.
  {
    const names = readFileSync(NAMES, 'utf8');
    const drawnNames = paths(nameFiles.join('\n'));
    ok(nameFiles.length > 0 && paths(names).length === drawnNames.length,
      'the region names are a picture of their own',
      `${paths(names).length} of ${drawnNames.length} letterform(s)`);

    const own = (names.match(new RegExp(`fill="${LETTERING_FILL}"`, 'gi')) || []).length;
    ok(own === drawnNames.length, 'and every one keeps the colour it was drawn in',
      `${own} of ${drawnNames.length} untouched`);

    ok(!new RegExp(LETTERING_FILL, 'i').test(sep),
      'and none of them is in the map the paper goes over',
      'nothing lettering-coloured in the display map');

    // A ground under the names would be a second sheet of grass over the finished
    // map, which is the whole map gone.
    ok(!/<rect[^>]*fill="#(?!ffffff")[0-9a-f]{6}"/i.test(names),
      'and it carries no ground of its own',
      'transparent behind the lettering');
  }

  // AND THE TOOL CAN READ EVERY KIND OF CURVE THE ARTIST DRAWS. Text converts to
  // outlines as QUADRATIC curves, and every other layer on this map is cubic — so
  // the path parser in tools/overview.mjs read C and silently skipped Q for as long
  // as the map was only scenery, and nobody could have known.
  //
  // The display map itself was never at risk: the stacker copies each layer's body
  // through verbatim, so path data reaches the player exactly as drawn whatever the
  // parser makes of it. What the parser feeds is the ANALYSIS — every shape's
  // bounding box, which decides what stands in front of the road, and the outline
  // the crossing test walks. A command it cannot read is a shape in the wrong place.
  //
  // So this is asked of the parser rather than of the output: whatever letters the
  // drawing uses, the regex that tokenises paths has to list them.
  {
    const gen = readFileSync('tools/overview.mjs', 'utf8');
    const tokeniser = /const toks = d\.match\(\/\[([A-Za-z]+)\]/.exec(gen);
    const known = new Set((tokeniser ? tokeniser[1] : '').split(''));
    const used = new Set();
    for (const m of allLayers.matchAll(/\bd="([^"]*)"/g))
      for (const c of m[1].match(/[A-Za-z]/g) || []) used.add(c);
    const unread = [...used].filter(c => !known.has(c));
    ok(tokeniser && unread.length === 0,
      'and the path parser knows every command the drawing uses',
      unread.length ? `cannot read ${unread.join(', ')}`
                    : `${[...used].sort().join('')} drawn, all listed`);
  }
}

console.log('\n--- the trail is evenly spaced along every leg ---\n');

// THE FAILURE THIS CATCHES IS INVISIBLE ON THE MAP. The trail is spaced by ARC
// LENGTH, so a leg that doubles back on itself spends walking without going
// anywhere and drops two dots almost on top of each other. The road looks
// perfectly fine; only the dots show it.
//
// It happened on all four bridge crossings at once, back when the road was a filled
// ribbon drawn in pieces: the artist drew up to a bridge and started the bridge's
// own piece a little way back along it, so the two overlapped where they joined.
// The road is one stroked line per leg now, so there are no pieces and no joins and
// nothing to overlap — and the closest pair on the map went from 3.4px to 8.9 of a
// nominal 10 without anything being cleaned up at all. The checks stay because the
// arithmetic that made bunching possible has not changed, only the input that used
// to trip it.
{
  const GAP = 10, DOT_R = 2.5;   // must match src/overview.js

  // The same walk drawTrail does, so this measures what is actually drawn rather
  // than a second idea of it.
  const dotsOn = leg => {
    const out = [];
    let walked = 0, next = GAP;
    for (let i = 1; i < leg.length; i++) {
      const [x0, y0] = leg[i - 1], [x1, y1] = leg[i];
      const seg = Math.hypot(x1 - x0, y1 - y0);
      if (!seg) continue;
      while (next <= walked + seg) {
        const t = (next - walked) / seg;
        out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
        next += GAP;
      }
      walked += seg;
    }
    return out;
  };

  let worst = Infinity, worstAt = 0, touching = 0;
  for (const [i, s] of STAGES.entries()) {
    const d = dotsOn(s.leg);
    for (let k = 1; k < d.length; k++) {
      const gap = Math.hypot(d[k][0] - d[k - 1][0], d[k][1] - d[k - 1][1]);
      if (gap < DOT_R * 2) touching++;
      if (gap < worst) { worst = gap; worstAt = i + 1; }
    }
  }
  // Two dots closer than their own diameter are drawn overlapping, which is the
  // thing you can see. Three quarters of the nominal gap is the useful bound: a
  // curve legitimately shortens the straight-line distance a little, and nothing
  // clean has ever come in under it.
  ok(touching === 0, 'no two dots are drawn on top of each other',
    touching ? `${touching} pair(s) closer than ${DOT_R * 2}px` : 'none closer than their own width');
  ok(worst >= GAP * 0.75, 'and none is bunched against its neighbour',
    `closest pair ${worst.toFixed(1)}px of ${GAP}, on stage ${worstAt}`);

  // AND EVERY STEP OF IT IS ON THE LINE THE ARTIST DREW.
  //
  // This replaces a check that no leg doubles back on itself, which was aimed at a
  // problem that can no longer happen. The road used to be a filled ribbon drawn in
  // pieces; the pieces overlapped at their joins, the overlaps sent the line
  // backwards, and the trail is spaced by ARC LENGTH so a backwards stretch dropped
  // two dots almost on top of each other. It is one stroked line per leg now. There
  // are no pieces, so there are no joins, so there is nothing to overlap.
  //
  // What is worth asking instead is whether the leg is still the artist's line.
  // Every other check here measures a leg against itself, and a leg that is smooth,
  // evenly spaced and in completely the wrong place passes all of them — which is
  // exactly what happened when a pass meant to clean up overlaps ate a switchback
  // and ran the trail down a cliff. This is the only rule that reads the drawing, so
  // it is the only one that could tell.
  {
    const near = (p, L) => {
      let best = Infinity;
      for (let i = 1; i < L.length; i++) {
        const [ax, ay] = L[i - 1], [bx, by] = L[i];
        const dx = bx - ax, dy = by - ay;
        const len = dx * dx + dy * dy;
        const t = len ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / len)) : 0;
        best = Math.min(best, Math.hypot(p[0] - (ax + dx * t), p[1] - (ay + dy * t)));
      }
      return best;
    };
    // Artboard units, because the lines are read straight off the guide. Two is
    // generous for a resample of a curve already flattened finely: the worst point
    // on this drawing sits well inside it, and a leg following the WRONG line is
    // out by hundreds.
    const SLACK = 2;
    let off = 0, worst = 0, offAt = new Set();
    for (const [i, st] of STAGES.entries()) {
      for (const p of st.leg) {
        const q = [p[0] / SCALE, p[1] / SCALE];
        const d = Math.min(...roadLines.map(L => near(q, L)));
        worst = Math.max(worst, d);
        if (d > SLACK) { off++; offAt.add(i + 1); }
      }
    }
    ok(off === 0, 'and every step of it lies on a line the artist drew',
      off ? `${off} point(s) off the road, on ${[...offAt].map(n => `stage ${n}`).join(', ')}`
          : `worst ${worst.toFixed(2)} of ${SLACK} artboard units, over ${STAGE_COUNT} legs`);
  }
}

console.log('\n--- the road opens one stage at a time ---\n');

// THE DASHBOARD CANNOT INVENT A STATE THE GAME CANNOT REACH. Progress is one
// number and the road is walked in order, so "stage 5 open, stage 3 shut" does not
// exist — and a test panel able to produce it would be testing something the game
// never does.
{
  const at = n => ({ unlocked: n, stage: null, reveal: null, pendingReveal: null });

  ok(canReach(at(3), 3) && canReach(at(3), 2),
    'the next stage and the last one reached can be pressed', 'open to 3: rows 4 and 3');
  ok(!canReach(at(3), 4) && !canReach(at(3), 1),
    'and nothing further ahead or further back can be', 'rows 5 and 2 refuse');

  // The refusal has to be in setReached, not only in the drawing. A dimmed button
  // with a live handler under it is the bug this pair of checks exists for.
  const jump = at(3);
  ok(setReached(jump, 7, true) === false && jump.unlocked === 3,
    'and a press on an out-of-order row changes nothing', 'stage 8 from open-to-3');

  const step = at(3);
  ok(setReached(step, 3, true) === true && step.unlocked === 4,
    'while the next stage along moves the road one', 'open to 3 -> 4');

  // WHICH LEG GETS ANIMATED. Each stage's leg is the road INTO it, so queueing the
  // stage just reached draws exactly the stretch from the one before it — which is
  // what makes several presses in a row show the last leg rather than a replay.
  ok(step.pendingReveal === step.unlocked - 1,
    'and queues the leg into the stage just reached', `stage ${step.pendingReveal + 1}`);

  const back = at(4);
  ok(setReached(back, 3, false) === true && back.unlocked === 3 && back.pendingReveal === null,
    'giving a stage back walks the road down and queues nothing', 'open to 4 -> 3');

  // Reaching several in a row leaves only the last queued.
  const many = at(0);
  for (let i = 0; i < 3; i++) setReached(many, i, true);
  ok(many.unlocked === 3 && many.pendingReveal === 2,
    'and three presses queue only the last of them', `open to ${many.unlocked}, leg into ${many.pendingReveal + 1}`);
}

console.log(bad
  ? `\n${bad} thing(s) about the world map are not true.`
  : '\nThe world map matches the drawing, and locked means locked.');
process.exit(bad ? 1 : 0);
