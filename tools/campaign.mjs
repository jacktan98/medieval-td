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

const drawnMarkers = [];
const roadBoxes = [];
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
    const fm = /\bfill="(#[0-9a-fA-F]{6})"/.exec(attrs);
    if (!dm || !fm) continue;
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
    const fill = fm[1].toLowerCase();
    if (fill === '#d30000') {
      drawnMarkers.push([(box[0] + box[2]) / 2 * SCALE, (box[1] + box[3]) / 2 * SCALE]);
    } else if (fill === '#ffde9e' || fill === '#ffefd4') roadBoxes.push(box);
  }
}

// The beach shares the road's sand colour and is excluded by area — see
// ROAD_MAX_AREA in tools/overview.mjs. That split has to stay clean, or a
// landmass gets fed to the centreline finder and a "road" appears through the sea.
const ROAD_MAX_AREA = 100000;
const area = b => (b[2] - b[0]) * (b[3] - b[1]);
const roadPaths = roadBoxes.filter(b => area(b) <= ROAD_MAX_AREA).length;
const roadTooBig = roadBoxes.filter(b => area(b) > ROAD_MAX_AREA);

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

// The generator asserts this count and refuses to write if it changes, so a
// mismatch here means the data was written against a different drawing.
ok(roadPaths === 14, 'and the road is still drawn in the same number of pieces',
  `${roadPaths} leg(s) in the two road fills`);

// THE GUIDE HOLDS NOTHING BUT ROAD. On the old single-file map the beach shared
// the road's sand colour and had to be excluded by size; the picture lives in its
// own layers now, so anything sand-coloured on this one is road and a shape big
// enough to trip the guard means the artist has painted terrain onto the guide.
ok(roadTooBig.length === 0, 'and nothing sand-coloured on the guide is terrain',
  roadTooBig.length ? roadTooBig.map(b => `${Math.round(area(b))} sq units`).join(', ')
                    : `all ${roadPaths} under ${ROAD_MAX_AREA}`);

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
  const first = STAGES[0].leg[0];
  ok(first[0] < 0, "stage 1's road comes in from off the map",
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

console.log('\n--- the parchment is the same drawing in browns ---\n');

// The recoloured map is DERIVED and committed like everything else here, so it
// can go stale on its own — a redraw that is recoloured but not re-extracted, or
// re-extracted but not recoloured, both leave a file that no longer matches.
{
  const sep = readFileSync(SEPIA, 'utf8');

  const paths = t => (t.match(/<path\b[^>]*>/g) || []);
  const pictureFiles = layerFiles.slice(1).map(f => readFileSync(f, 'utf8'));
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

  // EVERY COLOUR IS A BROWN. Red down through green down through blue is what
  // brown IS, and it is the one thing a luminance ramp cannot get wrong by
  // accident — a hue slipping through unconverted fails here immediately.
  const colours = [...new Set((sep.match(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g) || [])
    .map(s => s.slice(-8, -1).toLowerCase()))];
  const notBrown = colours.filter(c => {
    const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
    return !(r >= g && g >= b);
  });
  ok(notBrown.length === 0, 'and every colour in it is a brown',
    notBrown.length ? notBrown.join(', ') : `${colours.length} shade(s), all r >= g >= b`);

  // A ramp that collapsed would be a silhouette rather than a map: the whole
  // point is that lighter things stay lighter.
  const lum = c => 0.299 * parseInt(c.slice(1, 3), 16) +
                   0.587 * parseInt(c.slice(3, 5), 16) +
                   0.114 * parseInt(c.slice(5, 7), 16);
  const lo = Math.min(...colours.map(lum)), hi = Math.max(...colours.map(lum));
  ok(hi - lo > 90, 'and the browns still range from dark to light',
    `${Math.round(lo)} to ${Math.round(hi)} of 255, over ${colours.length} shade(s)`);
}

console.log('\n--- what stands in front of a marker is put back on top ---\n');

// The depth pass. Its failure mode is silence: get it wrong and the medallion
// simply covers a building, which looks like nothing in particular unless you
// know the building should be in front.
{
  // NOT AN ASSERTION THAT THERE ARE ANY. A map whose road runs through open
  // country has nothing standing in front of anything, and that is a fact about
  // the drawing rather than a fault in the tool — the artist adds buildings when
  // they add buildings. What follows checks whatever was found, and finding
  // nothing passes.
  const withFront = STAGES.filter(s => s.front && s.front.length);
  console.log(`      ${withFront.length} of ${STAGE_COUNT} stage(s) have scenery in front of them`);

  // Every occluder has to be a path the browser can actually clip with. A
  // malformed one throws at draw time, on the world map, every frame.
  const shapes = STAGES.flatMap(s => s.front || []);
  const wellFormed = shapes.every(d => /^M[-\d.,\sCLZ]+$/.test(d) && d.includes('Z'));
  ok(wellFormed, 'and every one is a closed path the game can clip with',
    `${shapes.length} shape(s)`);

  // AND ITS FEET ARE LOWER THAN THE MARKER, which is the whole rule. A shape
  // that failed this would be drawn in front of something it is behind.
  const NUM = /-?\d+\.?\d*(?:[eE][-+]?\d+)?/g;
  let wrong = 0;
  for (const s of STAGES) {
    for (const d of s.front || []) {
      const n = (d.match(NUM) || []).map(Number);
      const ys = n.filter((_, i) => i % 2 === 1);
      if (Math.max(...ys) * SCALE <= s.y) wrong++;
    }
  }
  ok(wrong === 0, 'and stands nearer the viewer than the marker it covers',
    wrong ? `${wrong} shape(s) are actually behind` : `${shapes.length} checked`);

  // The occluders are the artist's own path data at ARTBOARD scale, because the
  // game clips with them under a 0.5 transform. Emitted halved, every one would
  // land in the top-left quarter of the map.
  const onBoard = shapes.every(d => {
    const n = (d.match(NUM) || []).map(Number);
    const xs = n.filter((_, i) => i % 2 === 0);
    return Math.max(...xs) <= 1920 && Math.min(...xs) >= -200;
  });
  ok(onBoard, 'and is stored in artboard units, not halved ones', '0..1920 across');
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
