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
import { stageAt, stageOfLevel, startReveal } from '../src/overview.js';
import { hitStart, START_BTN } from '../src/render.js';
import { canReach, setReached } from '../src/admin.js';
// The stage panel's own geometry, for the setting rows below.
import { difficultyButtons, modeButtons } from '../src/render.js';
import { levels, useLevel } from '../src/level.js';
// For the prebuilt-tower checks below: the resolver the game itself runs, so a
// check here cannot pass against a tower the game would refuse to build.
import { prebuiltOn, makeTower, towerBox, machineBox } from '../src/towers.js';
// The real spawner, for the entry mix: what walks is the question, not what the
// level file declares.
import { spawn, updateEnemies } from '../src/enemies.js';
import { updateShots } from '../src/projectiles.js';
import { makeGarrison, makeUnits, updateUnits } from '../src/units.js';
import { readArtwork, allGroups, bounds, MAP_SCALE, layerFiles } from './svg.mjs';
// The real radial menu, so what is checked is what the player is offered.
import { openMenu } from '../src/menu.js';
import { selectionInfo } from '../src/select.js';
import { unitEntry } from '../src/book.js';
import { families, upgradesFrom } from '../src/data/towers.js';

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

// WHICH FILES THE DRAWING IS, through the same layerFiles the tool reads it with.
//
// Everything below re-implements the tool's ARITHMETIC on purpose — see the note
// under this one — but which files exist is not arithmetic, it is the input. A
// checker looking at a different set of files from the tool is not checking the
// tool, it is describing a drawing nobody draws.
//
// It mattered immediately. Both sides used to find layers with `_Layer_\d+\.svg`,
// and when layer 8 arrived split in two as `_Layer_8a` and `_Layer_8b` that matched
// neither — so both quietly agreed the map had no layer 8 in it at all, and the
// whole of it went missing from the picture with every check still green.
const LAYER_FILES = layerFiles(`${DIR}/Overview_Map`);

const svg = readFileSync(GUIDE, 'utf8');
const allLayers = LAYER_FILES.map(f => readFileSync(f, 'utf8')).join('\n');

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
    `${tf} transform(s) across ${LAYER_FILES.length} layer(s)`);
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
  // AND NO LAYER FILE IS QUIETLY LEFT OUT.
  //
  // Every check in this block compares the derived maps against LAYER_FILES, so a
  // layer that the discovery misses is a layer neither side knows about — the two
  // agree perfectly and the drawing is missing a layer. That is not hypothetical:
  // when layer 8 was split into `_Layer_8a` and `_Layer_8b`, the `_Layer_\d+\.svg`
  // both sides used matched neither, and the whole layer dropped out of the picture
  // with every check still green.
  //
  // So this asks the DIRECTORY instead: whatever is named like a layer must be one.
  const onDisk = readdirSync(DIR).filter(f => /^Overview_Map_Layer_.+\.svg$/.test(f)).sort();
  const taken = LAYER_FILES.map(f => f.split('/').pop()).sort();
  const missed = onDisk.filter(f => !taken.includes(f));
  ok(!missed.length, 'every layer file beside the map is read as a layer',
    missed.length ? `${missed.join(', ')} ignored` : `${taken.length} file(s), none skipped`);

  const LETTERING_FILL = '#fff5e1';
  const isNames = t => paths(t).length > 0 &&
    paths(t).every(g => /fill="#fff5e1"/i.test(g));
  const pictureFiles = LAYER_FILES.slice(1)
    .map(f => readFileSync(f, 'utf8'))
    .filter(t => !isNames(t));
  const nameFiles = LAYER_FILES.slice(1)
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
    `${paths(merged).length} path(s), ${paths(allLayers).length} across ${LAYER_FILES.length}`);

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

  // THE GOLD IS NOT PART OF THE PALETTE, and is held out here by name rather than
  // by widening the bound that follows. Raising SAT_MAX to let it through would
  // have let a raw grass green through with it, which is the whole thing the bound
  // is for. One exemption, written down, checked separately below.
  const GOLD_LEAF = '#ffd700';
  const colours = [...new Set((sep.match(/(?:fill|stroke)="(#[0-9a-fA-F]{6})"/g) || [])
    .map(t => t.slice(-8, -1).toLowerCase()))].filter(c => c !== GOLD_LEAF);

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

  // EXCEPT THE GOLD LEAF, which is not a material being lit. Every other colour on
  // the map is a surface under one light and belongs in one range; the cross on the
  // temple at Dawnford is meant to CATCH that light, and through the same
  // desaturation it came out as one more shade of the tan roof it stands on. It is
  // drawn as two thin STROKES rather than a fill, which is where the muting reaches
  // it, so that is where this looks.
  {
    const GOLD = '#ffd700';
    const drawnGold = (allLayers.match(new RegExp(`stroke="${GOLD}"`, 'gi')) || []).length;
    const keptGold = (sep.match(new RegExp(`stroke="${GOLD}"`, 'gi')) || []).length;
    ok(drawnGold > 0 && keptGold === drawnGold,
      'and the gold on the temple is left to shine',
      `${keptGold} of ${drawnGold} stroke(s) untouched`);
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

console.log('\n--- the march is one pace, whatever the distance ---\n');

// THE ARMY WALKS AT A SPEED, not for a duration. The reveal used to run for a
// fixed 2.6 seconds a leg, and a leg on this map is anywhere from 50 to 333 canvas
// px — so the short hop into stage 6 was walked at 19px a second and the long run
// out to stage 8 at 128. Seven times the pace, on the same road, and the long legs
// were the ones that looked hurried.
//
// This asks it through startReveal, which is the way the game asks it, rather than
// through the constant: a duration that came out right for the wrong reason would
// still be wrong the next time a leg is redrawn.
{
  const paces = STAGES.map((s, i) => {
    let d = 0;
    for (let k = 1; k < s.leg.length; k++)
      d += Math.hypot(s.leg[k][0] - s.leg[k - 1][0], s.leg[k][1] - s.leg[k - 1][1]);
    const st = {};
    startReveal(st, i);
    return { i, d, secs: st.reveal.seconds, pace: d / st.reveal.seconds };
  });

  // The floor is allowed to be quicker than the speed, and only the floor: a leg
  // too short to read as travel is paced by a minimum instead. Everything above it
  // walks at one pace.
  //
  // READ OFF THE SOURCE rather than typed here, and it had to be: this said 0.8
  // because that is what ROAD_MIN_SECONDS said when it was written, and when the
  // floor was raised to 2.0 every leg on the map counted as "long enough to see"
  // — including the three ON the floor — so the check reported ten legs at three
  // different paces and failed a change that was correct. A constant copied into
  // a checker is a constant that goes stale, and the failure it produces points
  // at the wrong file.
  const FLOOR = +(/ROAD_MIN_SECONDS = ([\d.]+)/.exec(readFileSync('src/overview.js', 'utf8')) || [0, 0])[1];
  ok(FLOOR > 0, 'the march floor is readable from src/overview.js', `ROAD_MIN_SECONDS = ${FLOOR}`);
  const paced = paces.filter(p => p.secs > FLOOR + 1e-9);
  const lo = Math.min(...paced.map(p => p.pace)), hi = Math.max(...paced.map(p => p.pace));
  // AND THE FLOOR ONLY EVER CATCHES SHORT LEGS, which is the thing this clause was
  // always trying to say and said twice with a guess instead.
  //
  // It was "all but two", then "two thirds", and both were arbitrary in the same
  // way: a count of how many legs are allowed to be floored is not a fact about
  // anything. Each one failed a correct map the first time the drawing moved under
  // it — "all but two" when the floor went from 0.8s to 2.0s, and "two thirds" when
  // the artist added an eleventh stage and the new Winchester leg came out 66px
  // long. Four floored of eleven is 4 too many for a two-thirds rule and exactly
  // right for the map.
  //
  // What the clause is actually for is keeping the floor an EXCEPTION rather than
  // the rule, so a map that had quietly gone back to a fixed duration could not
  // pass. That is checkable exactly: a leg is allowed to be floored IF AND ONLY IF
  // walking it at the shared pace would take less than the floor. No fraction, and
  // nothing to retune when either constant moves.
  const SPEED = +(/ROAD_SPEED = ([\d.]+)/.exec(readFileSync('src/overview.js', 'utf8')) || [0, 0])[1];
  ok(SPEED > 0, 'and the march speed with it', `ROAD_SPEED = ${SPEED}`);
  const wrongly = paces.filter(p => (p.secs <= FLOOR + 1e-9) !== (p.d / SPEED < FLOOR - 1e-9));
  ok(paced.length > 0 && hi - lo < 0.5 && !wrongly.length,
    'every leg long enough to see is walked at one speed',
    `${paced.length} of ${STAGE_COUNT} at ${lo.toFixed(0)}px/s, ` +
    (wrongly.length ? `but stage ${wrongly[0].i + 1} is on the wrong side of the floor`
                    : `the other ${STAGE_COUNT - paced.length} too short to be`));

  const floored = paces.filter(p => p.secs <= FLOOR + 1e-9);
  ok(floored.every(p => p.pace <= lo + 1e-6),
    'and the ones on the floor are never faster than that',
    floored.length ? `${floored.length} short leg(s) at the ${FLOOR}s floor`
                   : 'no leg is short enough to need the floor');

  // AND A LONG ROAD TAKES LONGER, which is the whole point of the change and the
  // thing a fixed duration cannot do.
  const longest = paces.reduce((a, b) => (b.d > a.d ? b : a));
  const shortest = paces.reduce((a, b) => (b.d < a.d ? b : a));
  ok(longest.secs > shortest.secs * 3,
    'so the far stages take longer to reach than the near ones',
    `stage ${longest.i + 1} ${longest.secs.toFixed(1)}s over ` +
    `${Math.round(longest.d)}px, stage ${shortest.i + 1} ${shortest.secs.toFixed(1)}s over ${Math.round(shortest.d)}px`);
}

console.log('\n--- the world beyond the road is drained of colour ---\n');

// A SOURCE CHECK, and it says so. What the fog looks like is a matter of pixels on
// a canvas this file has no way to make; what it must never do is a matter of the
// order two calls appear in, which this can read.
{
  const draw = readFileSync('src/overview.js', 'utf8');
  const fn = draw.slice(draw.indexOf('export function drawOverview'));
  const body = fn.slice(0, fn.indexOf('\n}\n') + 2).replace(/\/\/.*$/gm, '');
  const at = re => body.search(re);

  // Over the drawing INCLUDING the names — an unreached region should not be
  // announcing itself — and under the trail, the medallions and the flag, which are
  // the interface and are never in shadow.
  const names = at(/drawImage\(art\.overviewNames/);
  const fog = at(/spread\(fog\)/);
  const trail = at(/drawTrail\(/);
  ok(names >= 0 && fog > names, 'the drain falls over the names as well as the map',
    'fog after the names layer');
  ok(fog >= 0 && trail > fog, 'and never over the road, the medallions or the flag',
    'fog before the trail');

  // IT DRAINS THE COLOUR RATHER THAN PUTTING OUT THE LIGHT. The first version was a
  // dark wash, and when it was asked to be half as strong the only signal it had was
  // halved with it — darkness carried the whole distinction, so less darkness meant
  // less distinction, and the lit pocket around stage 1 could not be picked out of
  // the world at all.
  //
  // THE FLOOR HAS COME DOWN since, from a half to a third, and deliberately: there
  // is sunlight on the other side of the edge now, so the drain no longer has to be
  // bright enough to look at on its own. What it still may not be is a hole in the
  // page — below about a third the far country stops having a shape at all, and the
  // reason for drawing a whole world goes with it.
  const bright = /FOG_BRIGHT = ([\d.]+)/.exec(draw);
  // THE FLOOR HAS COME DOWN TWICE, from a half to a third to a fifth, each time
  // because the other side of the edge got stronger — first the drain replacing the
  // wash, then sunlight on the lit country. What it may still not be is a hole in
  // the page: below about a fifth the far country stops having a shape at all, and
  // the reason for drawing a whole world goes with it.
  ok(bright && +bright[1] >= 0.2 && +bright[1] < 1,
    'and the country it covers keeps a shape while losing its colour',
    bright ? `${bright[1]} of the brightness kept` : 'FOG_BRIGHT not found');

  // AND THE DRAIN IS THE SAME STACK, in the same order. What is punched out of the
  // fog has to line up exactly with what is underneath it, so the map, the paper
  // and the names all have to be in it — a fog built from the map alone would erase
  // the names wherever it fell.
  const mk = draw.slice(draw.indexOf('function makeFog'));
  const fogBody = mk.slice(0, mk.indexOf('\n}\n') + 2);
  ok(/art\.overview\b/.test(fogBody) && /parchment/.test(fogBody) && /overviewNames/.test(fogBody),
    'and it is drained from the same three layers the player sees',
    'map, paper and names');

  // A GRAYSCALE FILTER IS NOT EVERYWHERE, and where it is missing the colour has to
  // come out some other way — otherwise those browsers get a map with no unexplored
  // country at all, which is the feature silently absent rather than degraded. It is
  // blend modes now rather than a heavier wash, because a wash dims without draining
  // and the drain is the point.
  ok(/if \(!drained\) drainByBlend/.test(fogBody) && /grayscale/.test(fogBody),
    'and drains another way where filters are unavailable',
    'drainByBlend on the whole sheet');

  // AND THE TEST FOR THAT IS A DRAWN ONE. This is the bug the owner reported twice:
  // a phone showed hard lit circles where a laptop faded, because every feature test
  // here was of the form `ctx.filter = x; supported = ctx.filter !== 'none'` — and a
  // context WITHOUT filter support has no such property, so the assignment makes an
  // ordinary one and hands the string straight back. Every canvas that could not
  // filter was therefore judged to be able to, and no fallback ever ran.
  //
  // A property that lies cannot be asked. The test has to draw something and look.
  ok(/getImageData/.test((/function canFilter\(\)[\s\S]*?\n}/.exec(draw) || [''])[0]),
    'and asks whether it can filter by drawing, not by asking',
    'canFilter reads a pixel back');
  ok(!/filter\s*!==\s*'none'/.test(draw),
    'and never takes a filter property at its word',
    "no `filter !== 'none'` left in the file");

  // AND IT FADES RATHER THAN STOPPING. The owner's word was fade: the lit country
  // has to give way to the drained country over a distance, with no rim anywhere
  // that says "the light ends here". The blur IS that distance, and it has to be
  // wide against the reach — a short blur on a long reach is a spotlight with a
  // soft edge, which is still a spotlight.
  //
  // Held as a RATIO rather than a number so it survives the reach being retuned,
  // which has happened twice.
  const reach = /LIT_REACH = ([\d.]+)/.exec(draw);
  const blur = /LIT_BLUR = ([\d.]+)/.exec(draw);
  ok(reach && blur && +blur[1] >= +reach[1],
    'and the light fades out over at least as far as it reaches',
    reach && blur ? `${blur[1]} of fade on ${reach[1]} of reach` : 'constants not found');

  // AND THE COUNTRY THAT HAS BEEN REACHED IS LIFTED THE OTHER WAY. The gap between
  // reached and unreached is opened from BOTH ends now: the far country is darker
  // than it was and the near country is in sunlight. That is what stops either half
  // having to carry the whole distinction on its own, which is the trap this feature
  // fell into twice — once when darkness was the only signal, and again when the
  // brightness of the drain was asked to be both dim enough to read and bright
  // enough to look at.
  // AND IT IS AN ADDITION RATHER THAN A FILTER, on every device, which is the same
  // bug as the lit edge below and was found the same way: by somebody looking at two
  // screens. This asserted `SUN_FILTER = 'brightness(1.34)...'` until the owner
  // reported that Sandshroud's sand was a different colour on a laptop and a phone.
  //
  // It was, by a factor of two in saturation, and the filter was the reason:
  // brightness(1.34) CLIPS the brightest thing on the map, which is the sand, and a
  // clipped channel takes the hue with it. A device without ctx.filter was quietly
  // getting the better picture. See SUN_LIFT in src/overview.js.
  //
  // So what is checked is that there is no filter left to diverge on, and that the
  // lift is still applied.
  const sunFn = draw.slice(draw.indexOf('function makeSun'));
  ok(/const SUN_LIFT = 'rgb\(/.test(draw) && !/SUN_FILTER/.test(draw),
    'and the country that has been reached is lifted by an addition, not a filter',
    (/const SUN_LIFT = '([^']+)'/.exec(draw) || [])[1] || 'SUN_LIFT not found');
  ok(/\blift\(sg, 960, 540\)/.test(draw) && !/sg\.filter = /.test(draw),
    'and nothing on the sun sheet asks the browser to filter at all',
    'lift() on the sheet, no ctx.filter');

  // ONE SHAPE, TWO SHEETS. The sun is cut to the lit shape and the fog is punched
  // out with it, so they meet along a single edge. Two strokes with the same numbers
  // would still differ by a pixel of antialiasing everywhere they touched.
  const fin = draw.slice(draw.indexOf('function finishFog'));
  const finBody = fin.slice(0, fin.indexOf('\n}\n') + 2);
  const uses = (finBody.match(/drawImage\(lit, 0, 0\)/g) || []).length;
  ok(uses === 2, 'and both are cut from one lit shape rather than two',
    `${uses} use(s) of the lit sheet`);

  // AND THE LIT EDGE IS BLURRED BY THIS FILE, on every device, which is the other
  // half of the same bug. A blur the browser may or may not perform is two designs
  // wearing one set of numbers — soft on a laptop, a hard circle on a phone. Three
  // box passes over a quarter-size mask is a Gaussian to within a percent, costs
  // less than asking the browser did, and cannot be absent.
  ok(/boxBlurAlpha\(small\.data/.test(draw) && !/g\.filter = `blur/.test(draw),
    'and the lit edge is blurred here rather than by the browser',
    'boxBlurAlpha over the mask, no ctx.filter blur');

  // THE SHEETS USED TO BREATHE and no longer do, at the owner's word. Both are still
  // drawn through one helper, which is what kept them from sliding apart when they
  // did move and is still what keeps them agreeing about where the map is.
  const spreads = (draw.match(/\bspread\((sunSheet|fog)\)/g) || []).length;
  ok(/const spread = /.test(draw) && spreads === 2,
    'and the sunlight and the dark are laid down the same way',
    `${spreads} sheet(s) through one helper`);

  // AND IT LIFTS AS THE ROAD OPENS, which is the reason it is there. The lit area
  // is built from the stages the player has unlocked, so it cannot fail to grow.
  ok(/for \(let i = 0; i < unlocked; i\+\+\)/.test(draw.slice(draw.indexOf('function makeFog'))),
    'and what is lit is exactly what the player has reached',
    'the lit area is built from unlocked stages');
}

console.log('\n--- stage 1 is a tutorial, and the rest moved down ---\n');

// The first board a player ever sees. Everything asserted here is a promise the
// level file makes about being a teaching board rather than a testing one, and each
// one is a thing that could be quietly undone by a later edit.
{
  const tut = levels[0];
  ok(tut && tut.maxTier === 2, 'stage 1 caps the tower ladder at tier 2',
    tut ? `maxTier ${tut.maxTier}` : 'no level 0');

  // AND THE THREE TESTING BOARDS MOVED DOWN AGAIN, which is the whole of "move the
  // 3 testing maps to further stages" — a stage's board is the order of the levels
  // array in src/level.js and LEVEL_OF in tools/overview.mjs, and nothing else.
  //
  // THE IDS ARE OUT OF ORDER ON PURPOSE and that is the thing this pins. m4 is the
  // newest board drawn and it plays SECOND; the file numbers are the order they
  // were written and the ids are save keys that can never be renumbered, because
  // m1 has star records on players' phones. Only this array means play order.
  const order = STAGES.slice(0, 8).map(s => (s.level === null ? '-' : levels[s.level].id));
  ok(order.join(',') === 'm0,m4,m5,m6,m7,m1,m2,m3',
    'the campaign runs the five drawn boards, then the three testing ones',
    order.join(' -> '));
  ok(STAGES.filter(s => s.level !== null).length === 8,
    'with eight boards on the road and the rest still empty',
    `${STAGES.filter(s => s.level !== null).length} playable`);

  // AND STAGE 2 IS THE ONE WITH SOMETHING ALREADY ON IT. The owner asked for a
  // tier 3 barracks standing on the top-right plot from the first frame, and every
  // part of that is a thing a later edit could quietly undo: the plot index, the
  // tier, and — the one that would be invisible — whether it is still an ORDINARY
  // tower or has drifted into scenery that cannot be sold.
  const two = levels[1];
  ok(two.id === 'm4' && Array.isArray(two.prebuilt) && two.prebuilt.length === 1,
    'stage 2 opens with exactly one tower already standing',
    two.prebuilt ? `${two.prebuilt.length} on ${two.id}` : 'none');
  const pre = two.prebuilt[0];
  ok(pre.family === 'barracks' && pre.tier === 3, 'and it is a tier 3 barracks',
    `${pre.family} tier ${pre.tier}`);

  // THE TOP RIGHT MARKER, measured off the artwork's own plots rather than trusted.
  // "Top right" is what the owner asked for and an index is what the file holds, so
  // something has to check the two still mean the same thing: of the plots in the
  // right-hand third of the board, this must be the highest.
  const spot = two.plots[pre.plot];
  const right = two.plots.filter(p => p.x > 640);
  const topRight = right.reduce((a, b) => (b.y < a.y ? b : a));
  ok(spot === topRight, 'on the top right plot of the board',
    `(${spot.x}, ${spot.y}) of ${right.length} on the right-hand side`);

  // AND THE SIX WAVES ARE THE OWNER'S OWN, pinned the way the tutorial's five are.
  // Written down rather than derived, because the shape of them is a decision:
  // wave 5 sends NO THUGS, which no other wave in the game does, and a check that
  // measured "gets bigger" would call that a fault.
  const shape2 = w => w.groups.map(g => `${g.count} ${g.type}`).join(' + ');
  const WANT2 = [
    '5 light_inf',
    '5 light_inf + 2 tough_inf',
    '10 light_inf + 2 tough_inf + 1 archer_inf',
    '12 light_inf + 4 tough_inf + 4 archer_inf',
    '4 tough_inf + 10 archer_inf',
    '16 light_inf + 6 tough_inf + 16 archer_inf'
  ];
  const got2 = two.waves.map(shape2);
  ok(got2.join(' | ') === WANT2.join(' | '), 'and sends exactly the six it was given',
    got2.map((g, i) => (g === WANT2[i] ? '.' : `${i + 1}: ${g} (wanted ${WANT2[i]})`)).join(' '));
  ok(two.maxTier === 3, 'with the ladder capped at tier 3', `maxTier ${two.maxTier}`);
  ok(two.startGold === 200, 'and 200 gold on Hard', `${two.startGold}`);

  // AND IT IS WORTH WHAT IT WOULD HAVE COST. A prebuilt tower that refunds a tier
  // 1 price is a trap and one that refunds more than it is worth is a bank; both
  // are surprises, and neither is visible until somebody sells it.
  const built = prebuiltOn(two, families);
  const ladder = families.find(f => f.id === 'barracks').tiers
    .reduce((sum, d) => sum + (d.tier <= pre.tier ? d.cost : 0), 0);
  ok(built.length === 1 && built[0].spent === ladder,
    'and carries the price of the whole ladder, so selling it is honest',
    `${built[0].spent} gold, the same as building it`);

  // AND IT STANDS ON ONE OF THE BOARD'S OWN PLOTS — the SAME object, not a copy at
  // the same coordinates. That identity is what makes the plot marker disappear
  // under it: drawPlots skips a plot some tower is standing on, and it compares by
  // reference. A prebuilt given a coordinate rather than an index would look right
  // and leave a signpost poking out through the barracks' legs.
  ok(built[0].plot === two.plots[pre.plot],
    'and stands on one of the board\'s own plots rather than beside one',
    `plot ${pre.plot} of ${two.plots.length}, so ${two.plots.length - 1} markers are drawn`);

  // AND THE BOARD HAS EIGHT, which is what the artwork has. It read seven for a
  // while and that was the splitter's fault rather than the drawing's: it grouped
  // shapes by an exact size string, and one marker measures a fraction of a pixel
  // off the other seven, so it clustered alone and singletons are dropped as
  // scenery. The count is pinned here because the failure was SILENT — a board
  // with one fewer plot than it was drawn with, and nothing anywhere to say so.
  ok(two.plots.length === 8, 'and the board offers eight plots in all',
    `${two.plots.length}, ${two.plots.length - 1} of them to build on`);

  // FIVE WAVES, AND ONLY TWO KINDS OF ENEMY IN THEM. A tutorial that grew a third
  // enemy would have stopped being one without anybody deciding to.
  ok(tut.waves.length === 5, 'it runs five waves', `${tut.waves.length}`);
  const kinds = [...new Set(tut.waves.flatMap(w => w.groups.map(g => g.type)))].sort();
  ok(kinds.length === 2 && kinds.includes('light_inf') && kinds.includes('tough_inf'),
    'and sends thugs and tough thugs and nothing else', kinds.join(', '));

  // AND THE FIVE ARE THE OWNER'S OWN, pinned one by one.
  //
  // THIS USED TO ASSERT THAT THE WAVES GROW and it was wrong to. Wave 4 is two tough
  // thugs where wave 3 is six thugs — fewer bodies AND less health, and the harder
  // wave of the two, because a tough thug is the first thing on the road that
  // carries armour. A table whose whole point is that one wave breaks the pattern
  // cannot be guarded by a check that the pattern holds, so this pins the list
  // instead: the shape is a decision rather than a rule, and a decision is checked
  // by writing it down.
  const shape = w => w.groups.map(g => `${g.count} ${g.type}`).join(' + ');
  const WANT = [
    '2 light_inf',
    '4 light_inf',
    '6 light_inf',
    '2 tough_inf',
    '6 light_inf + 2 tough_inf'
  ];
  const got = tut.waves.map(shape);
  ok(got.join(' | ') === WANT.join(' | '), 'and sends exactly the five it was given',
    got.map((g, i) => (g === WANT[i] ? g : `${g} (wanted ${WANT[i]})`)).join(' / '));

  const size = w => w.groups.reduce((n, g) => n + g.count, 0);
  ok(size(tut.waves[0]) <= 5, 'the first small enough to learn on',
    `${size(tut.waves[0])} enemies`);

  // AND THE PURSE IT STARTS WITH, which is the other half of a tutorial's difficulty
  // and the easiest thing to change by accident while tuning a later board.
  ok(tut.startGold === 200, 'and opens the purse at 200 gold', `${tut.startGold}`);

  // FIVE PLOTS, ALL BESIDE THE ROAD. The splitter reads them off the artwork and the
  // level file only has to agree; what this catches is a plot typed in by hand that
  // no marker was ever drawn for.
  ok(tut.plots.length === 5, 'and offers five build plots', `${tut.plots.length}`);
  const near = (p, line) => {
    let best = Infinity;
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1], b = line[i];
      const dx = b.x - a.x, dy = b.y - a.y, len = dx * dx + dy * dy;
      const t = len ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len)) : 0;
      best = Math.min(best, Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)));
    }
    return best;
  };
  // The route is PREPARED by src/level.js on import — measured, with lanes — so the
  // points live on .pts rather than being the array itself.
  const offs = tut.plots.map(p => near(p, tut.routes[0].pts));
  ok(Math.max(...offs) < 140, 'every one of them within reach of the road',
    `furthest ${Math.max(...offs).toFixed(0)}px off`);
}

console.log('\n--- stage 5, the bridge and the two men at it ---\n');

{
  const castle = levels.find(l => l.id === 'm7');
  const WANT5 = [
    '8 light_inf',
    '10 light_inf + 2 tough_inf',
    '10 light_inf + 4 tough_inf + 1 heavy_inf',
    '10 light_inf + 2 blocker_inf + 2 heavy_inf',
    '10 light_inf + 4 tough_inf + 2 heavy_inf + 6 archer_inf',
    '6 blocker_inf + 3 heavy_inf + 10 archer_inf',
    '8 blocker_inf + 4 heavy_inf + 16 archer_inf',
    '8 blocker_inf + 5 heavy_inf + 16 archer_inf'
  ];
  const got5 = castle.waves.map(w => w.groups.map(g => `${g.count} ${g.type}`).join(' + '));
  ok(got5.join(' | ') === WANT5.join(' | '), 'the Castle sends exactly the eight it was given',
    got5.map((g, i) => (g === WANT5[i] ? '.' : `${i + 1}: ${g} (wanted ${WANT5[i]})`)).join(' '));
  ok(castle.plots.length === 9 && castle.startGold === 240 && castle.waves.length === 8,
    'and is nine plots, 240 gold and eight waves',
    `${castle.plots.length} plots, ${castle.startGold} gold, ${castle.waves.length} waves`);
  ok(!castle.prebuilt || !castle.prebuilt.length,
    'and opens with nothing built, the first board since the tutorial to',
    `${(castle.prebuilt || []).length} prebuilt`);

  // ITS FIRST THREE WAVES ARE STAGE 4'S, to the man, and the fourth is where they
  // part. Stated because it is a DESIGN — the Workshop teaches the opening and the
  // Castle asks whether it was learned — and a design that is only true by
  // coincidence stops being one silently.
  //
  // IT WAS SIX, THEN FOUR, NOW THREE, and the run has shortened both times for a
  // reason the owner gave: first the Castle's fifth was rewritten to open with ten
  // thugs, and now its giants walk in further apart from the fourth onwards. The
  // check states the number rather than counting whatever happens to match, so each
  // of those was a deliberate edit here rather than a silent drift.
  const shop = levels.find(l => l.id === 'm6');
  const shared = castle.waves.findIndex((w, i) =>
    i >= shop.waves.length || JSON.stringify(w.groups) !== JSON.stringify(shop.waves[i].groups));
  ok(shared === 3, "and its first three are the Workshop's own, unchanged",
    `${shared} of ${shop.waves.length} identical before they part`);

  // THE KEEP IS OFF THE BOTTOM. Every other board ends past the right edge, and this
  // is the one that made the exit an argument rather than a constant — so it is worth
  // pinning that the routes really do leave that way.
  const ends = castle.routes.map(r => r.pts[r.pts.length - 1]);
  ok(ends.every(p => p.y > 540), 'and both its roads leave past the BOTTOM edge, not the right',
    ends.map(p => `(${Math.round(p.x)}, ${Math.round(p.y)})`).join(' and '));

  // --- the two men at the bridge ---
  //
  // Everything the owner asked for here falls out of them being UNITS rather than
  // towers, so each check is of the CONSEQUENCE rather than of the flag that causes
  // it: no abilities because abilities live on a tower, no selling because selling
  // lives in a menu that opens on a plot, and selectable because pickFigure already
  // walks the unit list.
  const st = { units: [] };
  useLevel(levels.indexOf(castle));
  makeGarrison(st, castle);
  ok(st.units.length === 2 && st.units.every(u => u.def.name === 'Crossbowman'),
    'the Castle posts two crossbowmen who belong to no tower',
    st.units.map(u => `${u.def.name} at ${u.x},${u.y}`).join(', '));
  ok(st.units.every(u => u.x === u.rx && u.y === u.ry),
    'and each stands on his own post, so he never walks',
    'rally point is under his feet');
  ok(st.units.every(u => u.def.ranged && u.def.ranged.range > 0 && u.def.ranged.ammo),
    'and each carries his own weapon rather than a bought ability',
    `reach ${st.units[0].def.ranged.range}, ${st.units[0].def.ranged.damage} a bolt every ` +
    `${st.units[0].def.ranged.cd}s`);
  ok(st.units.every(u => !u.def.abilities || !u.def.abilities.length),
    'and has nothing to be taught',
    'no abilities on the def');

  // AND HIS NUMBERS ARE THE BOOK'S, which is the owner's ask read literally: "Use the
  // encyclopedia stats for both units. their range is 260 and deals 35 without any
  // armor and health."
  //
  // ASKED OF THE PAGE rather than typed in twice. `unitEntry` is what the encyclopedia
  // prints for the Crossbow Sentry, so this cannot drift: move the Sentry and either
  // these two follow or this fails.
  {
    const sentry = families.find(f => f.id === 'archery').tiers
      .find(t => t.name === 'Crossbow Sentry');
    const card = unitEntry(sentry);
    const w = st.units[0].def.ranged;
    ok(card.damage === w.damage && card.range === w.range,
      'and shoots the numbers the encyclopedia prints for a Crossbow Sentry',
      `book ${card.damage} at ${card.range}, post ${w.damage} at ${w.range}`);
    ok(card.hp == null && !card.traits.length,
      'which is a page with no health row and no armour row on it',
      'the man on a deck cannot be reached either');
  }

  // AND THE PANEL SAYS THE SAME THING. "when players click on them, it shows the range
  // and also stats in description panel" — so the reach every other soldier's card
  // gives up to make room for armour is back, because there is no armour to print.
  {
    const u = st.units[0];
    const card = selectionInfo({ selected: { kind: 'unit', ref: u } });
    ok(card.range === u.def.ranged.range && card.damage === u.def.ranged.damage,
      'and tapping one shows his reach and his bolt in the panel',
      `${card.damage} at ${card.range}`);
    ok(card.hp === null && card.maxHp === null && !card.traits.length,
      'and neither a health row nor an armour row, because nothing can hurt him',
      'the card a tower gets');
  }
  // AND NO MENU CAN REACH THEM, which is what "cannot sell" means. Asked of the PLOTS
  // rather than of a flag: a menu opens on a plot, so the test is that neither man is
  // standing on one.
  const onAPlot = st.units.filter(u =>
    castle.plots.some(p => Math.hypot(p.x - u.x, p.y - u.y) <= 30));
  ok(!onAPlot.length, 'and neither stands on a plot, so no menu can open on him',
    `nearest plot is ${Math.round(Math.min(...st.units.flatMap(u =>
      castle.plots.map(p => Math.hypot(p.x - u.x, p.y - u.y)))))}px away`);

  // AND THE PAINTED PAIR IS GONE FROM THE BASE. The artist drew them; split-map cuts
  // them; the game draws live ones on the same spot. If the cut ever stops happening
  // the board shows two of each, which is the kind of thing that looks like a
  // rendering bug and is actually a pipeline one.
  const base = readFileSync('assets/map/Stage_5_Map_base.svg', 'utf8');
  const stacked = readArtwork('assets/map/Stage_5_Map');
  ok(base.length < stacked.length,
    'and the painted copies are cut out of the base the game draws',
    `${stacked.length - base.length} characters of artwork removed`);

  // AND THE BOARD STEPS WITH A SQUAD ON IT, which is the check this whole feature
  // needed and did not have.
  //
  // The owner reported stage 5 frozen mid-wave. It was a TypeError thrown inside
  // updateUnits — the leash that keeps a squad near its barracks read `u.tower.def.
  // range` through the garrison's stand-in tower, whose `def` is null — and a throw
  // in the frame loop stops everything with the board still drawn, so it does not
  // look like a crash, it looks like the game hanging.
  //
  // IT NEEDED A BARRACKS TO REACH. Both leash tests live in the passes about helping
  // with somebody else's fight, so a garrison standing alone never touched them, and
  // every check and every browser run up to then had been exactly that.
  //
  // So this steps the real update with the three things that have to be true at once:
  // a garrison on the board, a squad on the board, and an enemy the squad is holding.
  {
    const barracks = families.find(f => f.id === 'barracks');
    const st = { towers: [], enemies: [], units: [], shots: [], hits: [], corpses: [],
                 splats: [], impacts: [], smoke: [], gold: 0, lives: 20 };
    const t = makeTower(castle.plots[6], barracks, barracks.tiers[0]);
    st.towers.push(t);
    makeUnits(st, t);
    makeGarrison(st, castle);
    for (let i = 0; i < 8; i++) spawn(st, 'light_inf');

    let threw = null;
    try {
      for (let f = 0; f < 60 * 40; f++) {
        updateUnits(st, 1 / 60);
        updateEnemies(st, 1 / 60);
      }
    } catch (e) { threw = e.message; }
    ok(!threw, 'and forty seconds of it step with a squad, a garrison and a wave all on the board',
      threw || `${st.enemies.length} enemies left, garrison ` +
        st.units.filter(u => u.garrison).map(u => `${Math.max(0, u.hp).toFixed(0)}hp`).join(' and '));
  }

  // AND NOTHING CAN TOUCH HIM, which is the owner's "without any armor and health"
  // taken at its word: the card prints neither row because there is nothing to print.
  //
  // A THUG STOOD ON TOP OF HIM is the test, placed by hand and deliberately so. Every
  // way an enemy can hurt a soldier begins with the enemy choosing him, and a wave
  // left to walk the road never chooses these two: melee wants to be within 30px and
  // they stand ninety off it, and a thrower only looks for a soldier once one has
  // SCREENED the road in front of him, which needs a man within 45px of the lane.
  // A wave of archers really does walk past them untouched — and passes this check
  // just as happily with every guard removed, which is how the first version of it
  // was written and why it was thrown away. An untouched man proves nothing if
  // nothing ever reached for him.
  //
  // So the enemy is put where it could not otherwise get. Inside ENGAGE, un-held, on
  // a board with no barracks: the block pass hands it to whoever is standing there,
  // and the fight that follows is the one thing on this board that could kill him.
  // `updateUnits` alone, so the thug stays where it was put rather than being walked
  // back onto the road by its own route.
  {
    const st = { units: [], enemies: [], towers: [], shots: [], hits: [], corpses: [],
                 splats: [], impacts: [], smoke: [], gold: 0, lives: 20 };
    useLevel(levels.indexOf(castle));
    makeGarrison(st, castle);
    spawn(st, 'heavy_inf');
    const [u] = st.units;
    const e = st.enemies[0];
    e.x = u.x + 6; e.y = u.y;

    const full = e.hp;
    for (let f = 0; f < 60 * 30; f++) { updateUnits(st, 1 / 60); updateShots(st, 1 / 60); }

    // AND HE SHOOTS IT, which is the half of this that must not come free. "Cannot be
    // hurt, cannot be held" is one line away from "does nothing at all", and a check
    // that only looked at his health would pass just as well on a man who had been
    // quietly switched off. The giant has to be losing health at the end of it.
    ok(e.hp < full, 'while shooting it the whole time he is not fighting it',
      `the giant is down ${(full - e.hp).toFixed(0)} of ${full}`);
    ok(u.hp === u.maxHp && !u.foe && !e.foe,
      'and a giant swinging at point blank cannot touch one of them, or be held by one',
      `${u.hp.toFixed(0)}/${u.maxHp} health, ` +
      `${u.foe ? 'he took the fight' : 'he took no fight'}, ` +
      `${e.foe ? 'the giant is held by him' : 'the giant is free to walk on'}`);
  }
}

console.log('\n--- stage 4, its three mouths and its two capped forks ---\n');

// THE OWNER'S SEVEN, pinned the way the other three boards' are.
{
  const shop = levels.find(l => l.id === 'm6');
  const WANT4 = [
    '8 light_inf',
    '10 light_inf + 2 tough_inf',
    '10 light_inf + 4 tough_inf + 1 heavy_inf',
    '10 light_inf + 2 blocker_inf + 2 heavy_inf',
    '4 tough_inf + 4 heavy_inf + 6 archer_inf',
    '6 blocker_inf + 4 heavy_inf + 10 archer_inf',
    '8 heavy_inf + 20 archer_inf'
  ];
  const got4 = shop.waves.map(w => w.groups.map(g => `${g.count} ${g.type}`).join(' + '));
  ok(got4.join(' | ') === WANT4.join(' | '), 'the Workshop sends exactly the seven it was given',
    got4.map((g, i) => (g === WANT4[i] ? '.' : `${i + 1}: ${g} (wanted ${WANT4[i]})`)).join(' '));
  ok(shop.plots.length === 9 && shop.startGold === 220 && shop.waves.length === 7,
    'and is nine plots, 220 gold and seven waves',
    `${shop.plots.length} plots, ${shop.startGold} gold, ${shop.waves.length} waves`);
  ok(shop.routes.length === 3, 'and three ways in', `${shop.routes.length} routes`);

  // HALF THE WAVE UP THE WEST ROAD, and it is asked of the SPAWNER rather than of
  // the level file — `entryMix` is a declaration and what matters is what walks. A
  // check that read the array back would agree with itself and tell us nothing.
  //
  // AND THE RUN LENGTH IS THE POINT, not the ratio. Weighted dice would pass a
  // ratio test and still lose the game the owner described: what they asked for is
  // that a long run down the short north-east road cannot happen. With a bag of
  // four, a road with one share can appear twice in a row at most — once at the end
  // of one bag and once at the start of the next.
  useLevel(levels.indexOf(shop));
  {
    const st = { enemies: [] };
    const n = [0, 0, 0];
    const longest = [0, 0, 0];
    let run = 0, prev = -1;
    for (let i = 0; i < 4000; i++) {
      st.enemies.length = 0;
      spawn(st, 'light_inf');
      const r = st.enemies[0].route;
      n[r]++;
      run = r === prev ? run + 1 : 1;
      prev = r;
      if (run > longest[r]) longest[r] = run;
    }
    const share = n.map(c => c / 4000);
    ok(Math.abs(share[0] - 0.5) < 0.01 && Math.abs(share[1] - 0.25) < 0.01 && Math.abs(share[2] - 0.25) < 0.01,
      'and half the wave comes up the west road, a quarter down each of the other two',
      share.map(x => (100 * x).toFixed(1) + '%').join(' / '));
    ok(longest[1] <= 2 && longest[2] <= 2 && longest[0] <= 4,
      'and no road ever sends a long run of them, which is what the mix is FOR',
      `longest run: west ${longest[0]}, north ${longest[1]}, north-east ${longest[2]}`);
  }

  // THE BALLISTA TURRET STANDS, AND IS ALSO BUILDABLE.
  //
  // IT WAS A GROUND BALLISTA FOR ONE BUILD, off the siege ladder so that nothing
  // could offer it for sale — and the checks here were the mirror of these: that no
  // ladder carried it, that no upgrade reached it, that it drew with no stone under
  // it. The owner sent it back to the ordinary turret and opened the ladder to it, so
  // every one of those assertions inverted, and all five failed together rather than
  // quietly passing on a board that had changed underneath them.
  const bt = prebuiltOn(shop, families)[0];
  ok(bt && bt.def.name === 'Ballista Turret' && bt.x === shop.plots[4].x && bt.y === shop.plots[4].y,
    'the Workshop opens with a Ballista Turret on its middle plot',
    bt ? `${bt.def.name} at ${bt.x},${bt.y}` : 'nothing prebuilt');
  ok(bt.abilities.length === 0 && bt.def.abilities.length === 2,
    'with neither of its two abilities bought',
    `owns ${JSON.stringify(bt.abilities)}, offers ${JSON.stringify(bt.def.abilities)}`);

  // AND IT IS WORTH THE LADDER, like every other prebuilt: what a player would have
  // paid to stand here, so selling it is neither a windfall nor a trap.
  const siegeLadder = families.find(f => f.id === 'siege').tiers
    .filter(d => d.tier < 4).reduce((a, d) => a + d.cost, 0);
  ok(bt.spent === siegeLadder + bt.def.cost,
    'and worth the whole ladder a player would have climbed to it',
    `spent ${bt.spent} = ${siegeLadder} of ladder + ${bt.def.cost}`);

  // IT IS ON ITS STONE. The machine mounts on the deck rather than on the ground,
  // which is the whole of "put the ballista back on the tower" and is checkable
  // through the same geometry the renderer uses.
  ok(!!bt.def.sprite && !!bt.def.machine,
    'and it is a machine on a building again, not a machine alone',
    `sprite ${bt.def.sprite}, machine ${bt.def.machine.frames[0]}`);
  {
    const box = towerBox(bt);
    const m = machineBox(bt.def, box);
    const foot = { x: m.left + m.w * bt.def.machine.pivot[0], y: m.top + m.h * bt.def.machine.pivot[1] };
    ok(foot.y < bt.y - 40,
      'with its post standing well above the plot, which is what a deck is',
      `post at y ${foot.y.toFixed(0)}, plot at ${bt.y}`);
  }

  // AND A TREBUCHET CAN NOW REACH IT, which is the change: one option on the siege
  // fork rather than none. Driven through the real menu rather than by re-deriving
  // `capped` here — a check that reimplemented the rule would agree with itself.
  {
    useLevel(levels.indexOf(shop));
    const treb = families.find(f => f.id === 'siege').tiers.find(d => d.tier === 3);
    const st = {};
    openMenu(st, shop.plots[0], makeTower(shop.plots[0], families.find(f => f.id === 'siege'), treb));
    // BY THE DEF IT BUYS, not by the button's text. A single choice is drawn due
    // east and simply labelled "Upgrade" — the tower's name only appears when there
    // are two of them to tell apart — so a check on the label would read "Upgrade"
    // and say nothing about which tower it is.
    const ups = st.menu.items.filter(it => it.act === 'upgrade' && it.available).map(it => it.to);
    ok(ups.length === 1 && ups[0] && ups[0].name === 'Ballista Turret',
      'and a Trebuchet on this board offers exactly one upgrade: the Ballista Turret',
      ups.length ? ups.map(d => d && d.name).join(', ') : 'nothing offered');
  }
  // The Cannon Outpost is the other half of that fork and is still above the cap.
  {
    const treb = families.find(f => f.id === 'siege').tiers.find(d => d.tier === 3);
    const st = {};
    openMenu(st, shop.plots[0], makeTower(shop.plots[0], families.find(f => f.id === 'siege'), treb));
    const named = st.menu.items.filter(it => it.act === 'upgrade').map(it => it.to && it.to.name);
    ok(!named.includes('Cannon Outpost'),
      'and the other half of that fork stays above the cap',
      `offered: ${named.filter(Boolean).join(', ') || 'nothing'}`);
  }
}

console.log('\n--- stage 3, and the one rung above its cap ---\n');

// AND ITS SEVEN WAVES ARE THE OWNER'S OWN, pinned the way the other two boards'
// are. Written down rather than derived: waves 5, 6 and 7 send NO THUGS AT ALL,
// which a check measuring "gets bigger" would call a fault.
//
// THE RATES ARE PINNED TOO, on the last three, and that is new. The owner asked
// for "the gap stepper shorter for wave 5, 6, 7" — a change to arrival rate with
// the counts left alone — and a check that reads only counts would have watched
// that change go by without a word.
{
  const win = levels.find(l => l.id === 'm5');
  const WANT3 = [
    '8 light_inf',
    '10 light_inf + 2 tough_inf',
    '10 light_inf + 4 tough_inf + 1 blocker_inf',
    '10 light_inf + 4 tough_inf + 2 blocker_inf + 4 archer_inf',
    '6 tough_inf + 4 blocker_inf + 8 archer_inf',
    '10 tough_inf + 4 blocker_inf + 16 archer_inf',
    '10 tough_inf + 10 blocker_inf + 20 archer_inf'
  ];
  const got3 = win.waves.map(w => w.groups.map(g => `${g.count} ${g.type}`).join(' + '));
  ok(got3.join(' | ') === WANT3.join(' | '), 'Winchester sends exactly the seven it was given',
    got3.map((g, i) => (g === WANT3[i] ? '.' : `${i + 1}: ${g} (wanted ${WANT3[i]})`)).join(' '));

  // AND THE LAST THREE ARRIVE FASTER THAN THE FOUR BEFORE THEM. Stated as the
  // SHAPE of the change rather than as nine numbers, so retuning a rate does not
  // mean editing this file: what the owner asked for is that waves 5, 6 and 7 come
  // in tighter, and what has to stay true is that no gap late in the table is
  // slower than the slowest gap early in it, and that each of the three is at
  // least as tight as the one before.
  const slowest = w => Math.max(...w.groups.map(g => g.gap));
  const early = Math.min(...win.waves.slice(0, 4).map(slowest));
  const late = win.waves.slice(4).map(slowest);
  ok(late.every(g => g < early), 'and its last three come in tighter than any of the first four',
    `${late.map(g => g.toFixed(2)).join(', ')} against ${early.toFixed(2)}`);
  ok(late.every((g, i) => i === 0 || g <= late[i - 1]),
    'and each of the three is at least as tight as the one before it',
    late.map(g => g.toFixed(2)).join(' >= '));
}

// EVERY BOARD WITH MORE THAN ONE ROUTE DEALS ITS WAVE, at the owner's ask to
// "assign 50% to left road for stage 2 and 3 too".
//
// Asked of the SPAWNER for every such board rather than of one of them, and stated
// as the property the mix exists to give: the shares come out right, and no route
// ever sends a long run. Loaded dice would pass the first half and fail the second,
// which is exactly the fix the owner asked for and the reason to check runs at all.
//
// STAGE 3 IS THE ODD ONE and worth naming: its two routes leave the SAME mouth —
// they are the two arms of a roundabout, not two entries — so "50% to the left road"
// is 100% either way there. What the deal buys on that board is that the four plots
// ringing the north arm always have something to shoot at.
// THE DRAWN BOARDS ONLY. The Fork and Two Rivers have several routes each and roll
// for them like everything did before stage 4; they are the TESTING boards and the
// owner has asked for the deal on the drawn campaign, board by board, as each was
// drawn. Adding it to those two uninvited would tighten the tail on maps that exist
// to be measured against. It is one `entryMix` line each when it is wanted.
{
  const drawn = levels.filter(l => /Stage_\d+_Map/.test(l.src));
  for (const l of drawn.filter(l => l.routes.length > 1)) {
    ok(!!l.entryMix, `${l.name} divides its wave between its roads rather than rolling`,
      l.entryMix ? `shares ${JSON.stringify(l.entryMix)} over ${l.routes.length} routes` : 'no entryMix');
  }

  // And every board that DECLARES a mix keeps to it, drawn or not, so the day one of
  // the testing boards gets a line it is checked by the same arithmetic.
  for (const l of levels.filter(l => l.entryMix)) {
    useLevel(levels.indexOf(l));
    const total = l.entryMix.reduce((a, b) => a + b, 0);
    const st = { enemies: [] };
    const n = l.routes.map(() => 0);
    const longest = l.routes.map(() => 0);
    let run = 0, prev = -1;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      st.enemies.length = 0;
      spawn(st, 'light_inf');
      const r = st.enemies[0].route;
      n[r]++;
      run = r === prev ? run + 1 : 1;
      prev = r;
      if (run > longest[r]) longest[r] = run;
    }
    const off = n.map((c, i) => Math.abs(c / N - l.entryMix[i] / total));
    ok(Math.max(...off) < 0.01, `  and ${l.short || l.name} deals them in the shares it declares`,
      n.map(c => (100 * c / N).toFixed(1) + '%').join(' / '));
    // A bag of `total` can put a route's last card next to its first, so the longest
    // possible run is twice its share. Anything longer means the deal is not a deal.
    const cap = l.entryMix.map(share => share * 2);
    ok(longest.every((r, i) => r <= cap[i]),
      `  and no road ever sends more than its share twice over`,
      longest.map((r, i) => `${r}/${cap[i]}`).join(' '));
  }
}

// AND A BAG DEALT ON ONE BOARD IS NEVER DEALT ON ANOTHER.
//
// A bag holds route INDICES, and an index only means something against one board's
// `routes`. Part-deal the Workshop's three-road bag, switch to a two-road board, and
// a leftover 2 is `routes[2]` — undefined, and an enemy walking a lane of nothing.
// newGame clears the bag, so this cannot happen through the front door; the bag also
// carries the id of the board it was filled for, so it cannot happen through a door
// nobody has thought of either.
//
// Checked by DOING IT: deal part of a three-road bag, change level underneath it
// without clearing anything, and keep spawning.
{
  const shop = levels.find(l => l.id === 'm6');
  const two = levels.find(l => l.entryMix && l.routes.length === 2);
  const st = { enemies: [] };

  useLevel(levels.indexOf(shop));
  for (let i = 0; i < 3; i++) { st.enemies.length = 0; spawn(st, 'light_inf'); }
  const carried = st.entryBag;

  useLevel(levels.indexOf(two));
  let bad = 0;
  for (let i = 0; i < 200; i++) {
    st.enemies.length = 0;
    spawn(st, 'light_inf');
    const e = st.enemies[0];
    if (e.route >= two.routes.length || !Number.isFinite(e.x) || !Number.isFinite(e.y)) bad++;
  }
  ok(bad === 0 && st.entryBag.id === two.id,
    'a part-dealt bag is never dealt onto the next board',
    `carried ${JSON.stringify(carried && carried.cards)} from ${carried && carried.id}, ` +
    `refilled for ${st.entryBag.id}, ${bad} bad spawn(s) of 200`);
}

// STAGE 2'S LAST TWO TIGHTENED THE SAME WAY, and for the same ask. Same shape of
// check rather than pinned numbers.
{
  const out = levels.find(l => l.id === 'm4');
  const slowest = w => Math.max(...w.groups.map(g => g.gap));
  const early = Math.min(...out.waves.slice(0, 4).map(slowest));
  const late = out.waves.slice(4).map(slowest);
  ok(late.length === 2 && late.every(g => g < early),
    'Oakland Outskirts tightens its last two the same way',
    `${late.map(g => g.toFixed(2)).join(', ')} against ${early.toFixed(2)}`);
}


// THE OWNER'S ASK: "towers that can be built is only restricted to tier 3 and
// crossbow sentry. For archery tier 3, just show 1 option which is crossbow
// sentry in the radial menu." Both halves are checkable and neither is visible
// from the level file alone — what matters is what the MENU offers.
{
  const win = levels.find(l => l.id === 'm5');
  ok(win && win.maxTier === 3 && (win.allow || []).join() === 'Crossbow Sentry',
    'Winchester caps at tier 3 and lets one named rung through',
    win ? `maxTier ${win.maxTier}, allow ${JSON.stringify(win.allow)}` : 'no m5');
  ok(win.plots.length === 8 && win.startGold === 220 && win.waves.length === 7,
    'and is eight plots, 220 gold and seven waves',
    `${win.plots.length} plots, ${win.startGold} gold, ${win.waves.length} waves`);

  // WHAT THE RADIAL MENU ACTUALLY OFFERS, driven through the real menu rather than
  // re-deriving the rule here. A check that reimplemented `capped` would agree with
  // itself and tell us nothing.
  const at = i => {
    useLevel(i);
    const out = {};
    for (const f of families) {
      const t3 = f.tiers.find(d => d.tier === 3);
      const state = { towers: [], menu: null, gold: 99999 };
      const tower = makeTower(levels[i].plots[2], f, t3);
      state.towers.push(tower);
      openMenu(state, levels[i].plots[2], tower);
      out[f.id] = state.menu.items.filter(x => x.act === 'upgrade' && x.to).map(x => x.to.name);
    }
    return out;
  };

  const here = at(levels.findIndex(l => l.id === 'm5'));
  ok(here.archery.join() === 'Crossbow Sentry',
    'a Crossbow Tower there offers exactly one thing, and it is the Sentry',
    here.archery.join(' | ') || 'nothing');
  ok(!here.barracks.length && !here.siege.length && !here.monastery.length,
    'and every other ladder stops dead at tier 3',
    `barracks ${here.barracks.length}, siege ${here.siege.length}, monastery ${here.monastery.length}`);

  // AND NOWHERE ELSE CHANGED. `allow` is a property of one board; a bug that let it
  // leak would be a fork quietly closing on The Bend, which nothing else would say.
  const bend = at(levels.findIndex(l => l.id === 'm1'));
  ok(bend.archery.length === 2 && bend.barracks.length === 2,
    'while an uncapped board still forks both ways',
    `${bend.archery.join(' | ')}`);

  // THE PREBUILT SENTRY, and the thing a number could not have said: archery has
  // two tier 4s, so it is named. prebuiltOn refuses a bare tier on a forked ladder
  // rather than picking the first one it finds.
  const built = prebuiltOn(win, families);
  ok(built.length === 1 && built[0].def.name === 'Crossbow Sentry',
    'and the board opens with a Crossbow Sentry already standing',
    built.length ? `${built[0].def.name} T${built[0].def.tier}` : 'nothing');
  ok(built[0].abilities.length === 0, 'with no abilities bought',
    `${built[0].abilities.length} of them`);

  // ON THE TOP RIGHT PLOT, measured off the artwork rather than trusted — the same
  // check stage 2's barracks gets, and the one that has caught the index moving
  // twice already.
  const spot = win.plots[win.prebuilt[0].plot];
  const right = win.plots.filter(p => p.x > 640);
  ok(spot === right.reduce((a, b) => (b.y < a.y ? b : a)),
    'on the top right plot of the board',
    `(${spot.x}, ${spot.y}) of ${right.length} on the right-hand side`);

  // AND A BARE TIER ON A FORKED LADDER IS REFUSED. This is the failure the naming
  // exists to prevent: a board that quietly opens with the wrong tier 4.
  let threw = '';
  try {
    prebuiltOn({ ...win, prebuilt: [{ plot: 0, family: 'archery', tier: 4 }] }, families);
  } catch (e) { threw = e.message; }
  ok(/name the one you mean/.test(threw),
    'and a prebuilt that says only "tier 4" on a forked ladder is refused',
    threw ? 'it throws' : 'it picked one silently');

  useLevel(0);
}

console.log('\n--- the panel a stage opens ---\n');

// WHAT THE PLAYER IS ASKED BEFORE A GAME, and the one setting that stopped being
// a question. Both Oakland boards run one wave table at either length, so the
// Length row offered a choice that changed nothing — and a player who picks
// Extended and gets the same six waves has been told something untrue.
{
  const draw = readFileSync('src/render.js', 'utf8');
  const bare = draw.replace(/\/\/.*$/gm, '');

  ok(/export const hasLength = lv => !\(lv && lv\.oneLength\);/.test(bare),
    'a board that runs one length says so, and the panel reads it',
    'hasLength off the level, not off the tier cap');

  // DRAWN AND TAPPED HAVE TO AGREE. A row that is not on screen must not still
  // answer a tap, or the panel has an invisible control sitting exactly where the
  // difficulty row moved to.
  ok(/if \(hasLength\(lv\)\) settingRowUi\(ctx, 'Length'/.test(bare),
    'the row is left out rather than drawn dead', 'not drawn on a one-length board');
  ok(/hasLength\(stageLevel\(state\)\) \? hitRow\(modeButtons\(\), x, y\) : null/.test(bare),
    'and it does not answer a tap either', 'the hit test asks the same question');

  // AND THE DIFFICULTY MOVES UP INTO ITS PLACE, so the panel does not carry a hole
  // where a setting used to be.
  const withLength = difficultyButtons(levels.find(l => !l.oneLength));
  const without = difficultyButtons(levels.find(l => l.oneLength));
  ok(without[0].y < withLength[0].y,
    'and the difficulty row moves up to fill the gap',
    `y ${without[0].y} against ${withLength[0].y}`);
  ok(without[0].y === modeButtons()[0].y,
    'into exactly the row the length had',
    `both at y ${without[0].y}`);

  // AND A ONE-LENGTH BOARD IS ALWAYS PLAYED AT THE FIRST MODE. The setting is
  // invisible now, so a modeIndex carried in from the last board would be a choice
  // the player cannot see — and star records key on the mode id, so the same six
  // waves could be recorded twice under two names.
  const tap = readFileSync('src/input.js', 'utf8');
  ok(/if \(levels\[li\]\.oneLength\) state\.modeIndex = 0;/.test(tap),
    'and opening one resets the length it will be played at',
    'modeIndex 0 on a one-length board');

  // THE BOARD BEHIND THE PANEL IS BRIGHTER, at the owner's ask. Held as a number
  // rather than a feeling: at 0.80 the map under the settings was a smudge that
  // could be told from another board only by the line of its road.
  const wash = /ctx\.fillStyle = 'rgba\(26,21,13,([\d.]+)\)';/.exec(bare);
  ok(wash && +wash[1] <= 0.6, 'and the map behind it is not washed out',
    wash ? `${wash[1]} of cover, where it was 0.80` : 'the wash is gone');
}

console.log('\n--- what a figure can walk behind ---\n');

// THE OWNER'S RULE: a building overlaps a soldier when the building is in front,
// judged by its shadow. The board is one flat image, so this is the one thing on
// it that has to be lifted out and sorted with the figures — see `front` in the
// level files, split-map.mjs which writes it, and drawFigures in src/render.js.
//
// Every check here is of the DATA against the ARTWORK, because the effect itself
// is pixels: what can be asserted is that the boxes still describe the drawing,
// that they are sorted by the right edge, and that the renderer still puts them in
// the pass rather than painting them over everything.
{
  const draw = readFileSync('src/render.js', 'utf8');
  const bare = draw.replace(/\/\/.*$/gm, '');

  // AND SORTED ON THE CENTRE OF THEIR SHADOW, which is the rule the whole board
  // obeys: a tower's plot point and a soldier's feet are both the middle of a ground
  // shadow. The map's scenery used to be the one thing sorted by the BOTTOM of its
  // box — half a shadow nearer the camera than it stands — and `g` is that centre,
  // measured off the artwork by tools/split-map.mjs.
  ok(/const front = art\[level\.frontArt\];/.test(bare) && /const foot = b\.g \?\? b\.y \+ b\.h;/.test(bare),
    'the map\'s standing things go into the depth pass, on the centre of each shadow',
    'sorted on g');

  // AND EVERY BOX CARRIES ONE. A missing `g` is not an error — it falls back to the
  // old rule for a drawing with no shadow to measure — so nothing would say if a
  // re-derive quietly stopped finding them.
  for (const l of levels.filter(l => l.front)) {
    const guessing = l.front.filter(b => b.g === undefined).length;
    ok(!guessing, `${l.name}'s boxes each know where they stand`,
      guessing ? `${guessing} of ${l.front.length} fall back to the bottom of the box`
               : `${l.front.length} ground line(s) off the shadows`);
  }

  // AND WHOEVER IS BEHIND SHOWS THROUGH, at the owner's ask and through the same
  // helper a tower uses. A figure that simply vanished behind a house would be a
  // squad the player cannot find — the rule is about depth, not about hiding.
  // Only the standing ones ghost: nothing can hide behind a road stone.
  ok(/ghostInside\(ctx, state, box, foot\)/.test(bare) &&
     /function ghostBehind\(ctx, state, t\) \{\s*ghostInside\(ctx, state, towerBox\(t\), t\.y\);/.test(bare),
    'and show whoever is behind them through, as a tower does',
    'one ghostInside for both');

  // NOT AFTER THE PASS, which is the version of this that looks right until a
  // soldier walks in front of a house. The call has to be INSIDE drawFigures.
  const fig = bare.slice(bare.indexOf('function drawFigures('));
  const body = fig.slice(0, fig.indexOf('\n}\n') + 2);
  ok(/level\.front/.test(body), 'and inside drawFigures rather than over the top of it',
    'in the same pass as the towers');

  // AND THE SHEET IS DRAWN WHERE IT WAS DRAWN. One game px is two source px and
  // there is no offset anywhere in the call — the moment there is, the copy on the
  // sheet and the copy in the base can disagree, which reads as a building with a
  // ghost of itself beside it.
  ok(/drawImage\(img, b\.x \* MAP_PX, b\.y \* MAP_PX, b\.w \* MAP_PX, b\.h \* MAP_PX,\s*b\.x, b\.y, b\.w, b\.h\)/.test(bare),
    'and lands exactly where it was drawn on the board',
    'no offset between the sheet and the base it was cut from');

  for (const l of levels.filter(l => l.front)) {
    // THE BOARD'S OWN SHEET, derived from its `src` like everything else about it.
    // This read `front00 ? Stage_1 : Stage_2` and had done since there were two
    // boards with front sheets: stages 3, 4 and 5 were each checked against stage
    // 2's drawing, so four checks apiece were answering about the wrong picture.
    const sheet = readFileSync(`${l.src}_front.svg`, 'utf8');
    const groups = (sheet.match(/<g transform=/g) || []).length;
    ok(groups >= l.front.length,
      `${l.name}'s sheet holds every box the level lists`,
      `${l.front.length} boxes, ${groups} group(s) drawn`);

    // SORTED BY THEIR GROUND LINE, which is what makes the list readable and is
    // free to keep true — the tool writes them in that order.
    const feet = l.front.map(b => b.g ?? b.y + b.h);
    ok(feet.every((f, i) => i === 0 || f >= feet[i - 1]),
      'and lists them from the back of the board forwards',
      feet.join(' -> '));

    // AND EVERY ONE OF THEM STANDS UP. Only standing things get a box: a road
    // stone with one would be a wall a soldier could hide behind, and the sheet
    // carries the flat props anyway, on whichever building they were drawn over.
    const shortest = Math.min(...l.front.map(b => b.h));
    ok(shortest >= 30, 'and every one of them is something that stands up',
      `${l.front.length} of them, shortest ${shortest}px`);

    // THE SHEET IS THE WHOLE LAYER, not just the boxed things. That is what keeps
    // the artist's own order: a slice of it carries the props drawn on top of that
    // building, so the little man at the tavern door stays in front of the tavern.
    ok(groups > l.front.length * 2,
      'while the sheet itself carries the whole layer, props and all',
      `${groups} group(s) for ${l.front.length} box(es)`);
  }

  // AND WHATEVER WAS CUT OUT OF THE BASE IS CUT OUT OF THE SHEET TOO.
  //
  // The splitter removes two kinds of thing from the board the game draws: the plot
  // markers, because an occupied plot has to lose its signpost, and stage 5's two
  // painted crossbowmen, because the game stands a live one on each spot. The front
  // sheet is a SECOND copy of the top layer, so anything left in it comes back.
  //
  // THE CROSSBOWMEN CAME BACK. Nothing showed it for a while — no box covered them,
  // so the second copy was never drawn — and it surfaced only when the barricade they
  // stand behind got a box of its own and brought both of them with it: two
  // crossbowmen in the right place in the right poses, of which half never moved.
  //
  // BY PATH DATA, which is exact and needs no window, no tolerance and no idea of
  // what a figure looks like. Whatever is in the artwork and not in the base is a
  // thing the game draws itself; if it is also on the sheet, it is drawn twice.
  const paths = text => new Set([...text.matchAll(/ d="([^"]{40,})"/g)].map(m => m[1]));
  for (const l of levels.filter(l => l.front && !l.src.endsWith('.svg'))) {
    const drawn = paths(readArtwork(l.src));
    const inBase = paths(readFileSync(`${l.src}_base.svg`, 'utf8'));
    const sheets = [`${l.src}_front.svg`, l.over ? `${l.src}_over.svg` : null].filter(Boolean);
    const back = [];
    for (const name of sheets) {
      const on = paths(readFileSync(name, 'utf8'));
      for (const d of drawn) if (!inBase.has(d) && on.has(d)) back.push(name.split('/').pop());
    }
    const cut = [...drawn].filter(d => !inBase.has(d)).length;
    ok(!back.length,
      `nothing ${l.name} cuts out of its board is put back by a sheet`,
      back.length ? `${[...new Set(back)].join(', ')} draws it again`
                  : `${cut} path(s) cut, none of them on ${sheets.length} sheet(s)`);
  }

  // AND NO SCENERY IS DRAWN OVER A TOWER STANDING IN FRONT OF IT.
  //
  // REPORTED TWICE, on the same board: "why is the castle overlapping the archery
  // tower" and then "why is the castle overlapping my barracks tower". Both times a
  // front box claimed a ground line its ink does not reach — a keep 359px wide meets
  // the grass at y 244 under one corner and 223 under another — so a building on the
  // plot beside it sorted behind the whole keep and had its roof painted out.
  //
  // ASKED OF THE INK, not of the box. A box may legitimately cover a plot it stands
  // in front of, and its rectangle may legitimately cover ground it draws nothing on.
  // What must not happen is scenery PIXELS landing over a tower the depth pass has
  // already decided is nearer the camera than that scenery's own footing.
  //
  // The mask is built here rather than imported, like everything else in this block:
  // a checker that shares the code it checks cannot catch a bug in it.
  const inkMask = text => {
    const rows = new Map();
    for (const g of allGroups(text)) {
      for (const ps of g.subPaths) {
        const b = bounds(ps);
        for (let y = Math.floor(b.y0 * MAP_SCALE); y <= Math.ceil(b.y1 * MAP_SCALE); y++) {
          const py = (y + 0.5) / MAP_SCALE;
          const xs = [];
          for (let k = 0; k < ps.length; k++) {
            const [ax, ay] = ps[k], [bx, by] = ps[(k + 1) % ps.length];
            if ((ay > py) !== (by > py)) xs.push(ax + (py - ay) / (by - ay) * (bx - ax));
          }
          xs.sort((m, n) => m - n);
          if (!rows.has(y)) rows.set(y, []);
          const spans = rows.get(y);
          for (let i = 0; i + 1 < xs.length; i += 2) {
            spans.push([xs[i] * MAP_SCALE, xs[i + 1] * MAP_SCALE]);
          }
        }
      }
    }
    // The lowest ink between two columns, or null for none — the ground line of this
    // drawing WHERE IT MATTERS, which is the whole point of the check below.
    return (x0, x1, y0, y1) => {
      let lo = null;
      for (const [y, spans] of rows) {
        if (y < y0 || y >= y1) continue;
        for (const [a, b] of spans) {
          if (b > x0 && a < x1 && (lo === null || y + 1 > lo)) lo = y + 1;
        }
      }
      return lo;
    };
  };

  for (const l of levels.filter(l => l.front)) {
    useLevel(levels.indexOf(l));
    const hasInk = inkMask(readFileSync(`${l.src}_front.svg`, 'utf8'));
    const buildable = fam => fam.tiers.filter(d =>
      !l.maxTier || d.tier <= l.maxTier || (l.allow || []).includes(d.name));
    const painted = [];
    for (const [pi, p] of l.plots.entries()) {
      for (const fam of families) {
        for (const def of buildable(fam)) {
          const t = makeTower(p, fam, def);
          const tb = towerBox(t);
          for (const b of l.front) {
            // A box that sorts BEHIND this plot never draws over it, whatever it
            // covers — that is the feature working.
            const stands = b.g ?? b.y + b.h;
            if (stands <= p.y) continue;
            const x0 = Math.max(tb.left, b.x), x1 = Math.min(tb.left + tb.w, b.x + b.w);
            const y0 = Math.max(tb.top, b.y), y1 = Math.min(tb.top + tb.h, b.y + b.h);
            if (x1 <= x0 || y1 <= y0) continue;
            // AND WHERE IT DOES COVER, IT HAS TO BE STANDING THERE. The box's foot is
            // one number for the whole drawing; this asks where the ink it is about to
            // paint over this tower actually meets the ground. A house whose left wall
            // laps over a plot behind it is nearer at that wall and passes. A keep
            // whose far corner laps over a plot in FRONT of that corner is not, and
            // does not.
            //
            // WITHIN A MAN'S HEIGHT, which is the same margin the splitter bands a
            // wide drawing to — see FOOT_SLACK in tools/split-map.mjs. Inside it the
            // worst a mis-sort can do is cover the head of somebody standing against
            // a wall he is half behind anyway; outside it, a building gets painted
            // out, which is what was reported twice.
            //
            // WIDER THAN A HAND. A drawing is banded into strips whose ground lines
            // agree, and a strip too thin to be worth its own depth is merged into its
            // neighbour — so a few pixels always ride at the wrong depth. The castle's
            // far-left shadow tip is 17px of it. What that costs on screen is a sliver
            // of shadow over the corner of a tent; what refusing it would cost is a
            // keep cut into two-pixel boxes.
            //
            // AND NO SLACK ON THE DEPTH ITSELF, which the first version of this had
            // and which made it useless: the reported bug is an EIGHT pixel mis-sort —
            // a hall standing at y 225 against a corner footing at 217 — and twenty
            // pixels of forgiveness waved it straight through. The depth error is
            // small and what it does is not. Eight pixels the wrong way flips a
            // hundred and twenty of roof behind a wall.
            const SLIVER = 20;
            if (x1 - x0 < SLIVER) continue;
            const ground = hasInk(x0, x1, b.y, b.y + b.h);
            if (ground === null || ground > p.y) continue;
            painted.push(`${def.name} on plot ${pi + 1} (${p.x},${p.y}): the box footing ` +
              `at ${stands} has ink down to only y ${ground} where it covers him`);
          }
        }
      }
    }
    ok(!painted.length, `nothing on ${l.name} paints over a tower standing in front of it`,
      painted.length ? `${painted.length} case(s), e.g. ${painted[0]}`
                     : `${l.plots.length} plot(s) against ${l.front.length} box(es)`);
  }

  // AND THE ONE PIECE THAT IS IN FRONT OF EVERYTHING, on its own sheet.
  //
  // Stage 5's bridge rail. Every claim below is about keeping the two kinds apart:
  // a `front` box is sorted into the depth pass by its foot, and this is not sorted
  // at all — which is right for the nearest thing on the board and catastrophic for
  // anything else, so the renderer must draw it AFTER the pass and the sheet must
  // hold that part alone.
  for (const l of levels.filter(l => l.over)) {
    const sheet = readFileSync(`${l.src}_over.svg`, 'utf8');
    const groups = (sheet.match(/<g transform=/g) || []).length;
    ok(groups > 0, `${l.name}'s near overlay is a sheet of its own`,
      `${groups} group(s) drawn`);

    // IT IS NOT ALSO A BOX. The same drawing in both lists would be drawn twice, once
    // sorted and once not, and the sorted copy is the overdraw the overlay exists to
    // avoid.
    const b = l.over;
    ok(!(l.front || []).some(f => f.x < b.x + b.w && b.x < f.x + f.w &&
                                  f.y < b.y + b.h && b.y < f.y + f.h),
      'and no box on the front sheet covers the same ground',
      `over at ${b.x},${b.y} ${b.w}x${b.h}`);

    // AFTER THE PASS, NOT IN IT, and showing whoever it covers through at the owner's
    // ask. Infinity is the ground line: everything on the board is behind this.
    const over = bare.slice(bare.indexOf('function drawOver('));
    const body = over.slice(0, over.indexOf('\n}\n') + 2);
    ok(/drawFront\(ctx, sheet, b\)/.test(body) &&
       /ghostInside\(ctx, state, \{ left: b\.x, top: b\.y, w: b\.w, h: b\.h \}, Infinity\)/.test(body),
      'and draws over every figure, showing each of them through it',
      'ghostInside at a ground line of Infinity');
    ok(bare.indexOf('drawOver(ctx, state)') > bare.indexOf('drawFigures(ctx, state)'),
      'and is drawn after the depth pass rather than inside it',
      'drawOver follows drawFigures');
  }
}

console.log('\n--- the marker, the flag and the stars ---\n');

// The furniture the game draws on top of the drawing. Source checks: what these
// look like is pixels, but what they are made of is text, and every one of them is
// a thing that was asked for by name and could silently drift back.
{
  const ov = readFileSync('src/overview.js', 'utf8');
  const bare = ov.replace(/\/\/.*$/gm, '');
  const num = n => { const m = new RegExp(`${n} = ([\\d.]+)`).exec(bare); return m ? +m[1] : null; };

  // THE MEDALLION HAS ITS OWN FORESHORTENING, and that is the point of the check
  // rather than the number. SQUASH in src/ground.js is the angle the whole GAME is
  // seen at — every reach ring and every dirt patch on all three boards — and
  // flattening a map marker by editing it would have tilted the floor of the game.
  ok(num('NODE_SQUASH') === 0.5, 'the medallion is an ellipse at its own squash',
    `${num('NODE_SQUASH')}`);
  ok(!/from '\.\/ground\.js'/.test(ov), 'and does not borrow the ground\'s',
    'src/ground.js is not imported by the map');

  const ground = readFileSync('src/ground.js', 'utf8');
  ok(/SQUASH = 0\.62/.test(ground), 'which is left where the boards need it',
    'ground.js still at 0.62');

  // AND IT IS SMALL. A marker is a place on a road, not a button; the tap target is
  // the thing that has to be thumb-sized, and it is checked above at 22.
  const r = num('NODE_R');
  ok(r !== null && r <= 12, 'and it is smaller than the tap target that finds it',
    `drawn at ${r}, tapped at ${NODE_HIT}`);
  ok(r < NODE_HIT, 'so the marker is never bigger than its own hit box',
    `${r} < ${NODE_HIT}`);

  // NO PADLOCK. It was drawn in the middle of the medallion, which is exactly where
  // the flag's pole now stands.
  ok(!/ctx\.fillRect\(s\.x - [\d.]+, s\.y/.test(bare) && !/padlock/i.test(bare),
    'a locked stage carries no padlock',
    'nothing drawn inside a locked marker');

  // THE FLAG IS THE OWNER'S OWN, AND IT IS IN TWO PIECES. It was the rally point's
  // PNG, sheared about its foot to wave — and a shear applies to the whole picture,
  // so the pole leaned over with the cloth. The owner's word: the pole stick is not
  // to wave with the flag. One picture cannot do that, so there are two, and only
  // one of them is ever transformed.
  ok(/art\.map_flag_pole/.test(bare) && /art\.map_flag_cloth/.test(bare),
    'the map plants a flag whose pole and cloth are separate',
    'two sheets, one drawing');

  // AND THE POLE IS DRAWN OUTSIDE THE TRANSFORM. This is the whole of what the
  // owner asked for and the one thing that could silently come undone: put the
  // pole's drawImage after the translate and it waves again, with every other
  // check here still passing.
  const flagBody = (/function drawFlag\([\s\S]*?\n}/.exec(bare) || [''])[0];
  const poleAt = flagBody.indexOf('drawImage(poleImg');
  const shearAt = flagBody.indexOf('ctx.transform(');
  ok(poleAt > 0 && shearAt > poleAt, 'and the pole is drawn before anything is bent',
    poleAt > 0 && shearAt > poleAt ? 'pole, then the shear' : 'the pole is inside the transform');

  // AND THE CLOTH IS BENT ABOUT THE MAST, VERTICALLY. A horizontal shear moves
  // everything above the ground however it is anchored; a vertical one about the
  // mast moves nothing on the mast and lifts the free end most, which is what cloth
  // pinned along one edge does.
  ok(/ctx\.transform\(.*, swing, 0, 1/.test(flagBody) && /translate\(mast, 0\)/.test(flagBody),
    'and bent about the mast rather than the ground',
    'a vertical shear, pinned at the pole');

  // THE TWO SHEETS SHARE ONE BOX, which is what puts the cloth back on the mast
  // without a number lining them up. tools/split-flag.mjs crops both to the two
  // paths together and prints the anchors below; this re-measures the artwork the
  // owner drew and fails if the constants here have drifted from it.
  const flagSvg = readFileSync('assets/map/Rally_Flag_pole.svg', 'utf8');
  const clothSvg = readFileSync('assets/map/Rally_Flag_cloth.svg', 'utf8');
  const vb = t => (/viewBox="([^"]+)"/.exec(t) || [])[1];
  ok(vb(flagSvg) && vb(flagSvg) === vb(clothSvg),
    'the pole and the cloth are cropped to one shared box',
    vb(flagSvg) || 'no viewBox');

  const [, , vw, vh] = (vb(flagSvg) || '0 0 0 0').split(' ').map(Number);
  const artW = num('FLAG_ART_W'), artH = num('FLAG_ART_H');
  ok(Math.abs(artW - vw) < 0.01 && Math.abs(artH - vh) < 0.01,
    'and the map is drawing them at the proportions they were cropped to',
    `${artW}x${artH} against ${vw}x${vh}`);

  // The mast is the pole's inner edge. Measured off the pole's own path rather than
  // trusted, because a redraw that moves the pole moves the line the cloth hangs
  // from, and nothing else in the game would notice.
  const poleXs = [...((/ d="([^"]*)"/.exec(flagSvg) || ['', ''])[1])
    .matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(m => +m[1]);
  const mat = ((/matrix\(([^)]*)\)/.exec(flagSvg) || ['', '1,0,0,1,0,0'])[1]).split(',').map(Number);
  const [vx] = (vb(flagSvg) || '0 0 0 0').split(' ').map(Number);
  const mastX = (Math.max(...poleXs) * mat[0] + mat[4] - vx) / vw;
  ok(Math.abs(num('FLAG_MAST') - mastX) < 0.005,
    'and the cloth hangs from where the pole actually ends',
    `FLAG_MAST ${num('FLAG_MAST')} against ${mastX.toFixed(4)} in the drawing`);

  const rd = readFileSync('src/render.js', 'utf8');
  ok(/glyph_flag/.test(rd), 'while the board plants its own rally flag',
    'the board is unchanged');

  // AND ITS POLE STANDS IN THE MIDDLE OF THE MARKER.
  ok(/const foot = y \+ drop;/.test(bare), 'and its pole stands in the middle of the marker',
    'foot at the marker centre');

  // THE STARS ARE BIG AND OUTLINED IN BLACK. The gap is held as a multiple of the
  // radius rather than a number of its own, because at this size a fixed gap and a
  // changed radius is a row of stars growing into each other.
  ok(num('STAR_R') === 10, 'the stars are drawn at radius 10', `${num('STAR_R')}`);
  ok(/STAR_GAP = STAR_R \* [\d.]+/.test(bare), 'and their spacing follows the radius',
    'gap is a multiple of the radius');
  // THE MEDALLION'S INK, not black and not a soft brown. Both have been tried: a
  // brown at 85% read as a smudge at this size, and pure black made the stars the
  // only true black on a map whose every outline is INK. One colour for both is what
  // makes them read as the same set of furniture rather than two.
  ok(/ctx\.strokeStyle = INK;/.test(bare), 'and outlined in the same ink as the medallion',
    'INK, the map\'s own outline colour');
}

console.log('\n--- the stage panel stands on its own board ---\n');

// Tapping a marker opens the length and difficulty panel, and behind it is the map
// that stage is played on. It was a flat plate, which is the one thing on that
// screen that says nothing about where the player is choosing to fight.
{
  const rd = readFileSync('src/render.js', 'utf8');
  const fn = rd.slice(rd.indexOf('function drawStart'));
  const body = fn.slice(0, fn.indexOf('\n}\n') + 2).replace(/\/\/.*$/gm, '');

  ok(/art\[levels\[stage\.level\]\.art\]/.test(body),
    'the panel is backed by the board that stage is played on',
    'the level\'s own art');

  // CLIPPED, or the board is a rectangle over a rounded panel and the corners show.
  const clipAt = body.search(/ctx\.clip\(\)/);
  const drawAt = body.search(/drawImage\(board/);
  ok(clipAt >= 0 && drawAt > clipAt, 'and cut to the panel rather than overhanging it',
    'clipped before the board is drawn');

  // COVER-FITTED. A 960x540 board in a 444x292 panel: fitting the width leaves the
  // panel half empty, and stretching bends roads that are never drawn bent.
  ok(/Math\.max\(p\.w \/ 960, p\.h \/ 540\)/.test(body),
    'and scaled to cover it rather than stretched to fit',
    'one scale for both axes, the larger');

  // AND DIMMED AFTERWARDS, because it is a background and the settings are the
  // point. A board at full strength is a lovely thing to read a label off badly.
  ok(drawAt >= 0 && body.indexOf('fillRect(p.x, p.y, p.w, p.h)', drawAt) > drawAt,
    'and then dimmed, because the settings are what the panel is for',
    'a wash over the board');
}

console.log('\n--- the map moves a little ---\n');

// AMBIENT MOTION. Source checks, and they say so: what a cloud shadow looks like is
// a matter of pixels on a canvas this file cannot make. What it can hold is the
// shape of the thing — where it is drawn, that it is removable, and that it stays
// out of the way of the one moving thing that means something.
{
  const motion = readFileSync('src/motion.js', 'utf8');
  const draw = readFileSync('src/overview.js', 'utf8');
  const bare = motion.replace(/\/\/.*$/gm, '');

  // BOTH SWITCHES ARE REAL, and this is the promise the file was written under:
  // the owner asked for it in a form they could take out again if they did not like
  // it. Each name has to be declared and each has to actually gate its own effect.
  for (const [name, fn] of [['SHIMMER', 'drawShimmer'], ['BIRDS', 'drawBirds']]) {
    const declared = new RegExp(`const ${name} = (true|false);`).test(bare);
    const gates = new RegExp(`${name}[^\\n]*${fn}\\(`).test(bare);
    ok(declared && gates, `${name} is a switch that turns its own effect off`,
      declared ? (gates ? 'declared and gates its call' : 'declared but gates nothing')
               : 'not declared');
  }

  // PULSE guards from inside its own function rather than at a call, because that
  // function is exported and called directly. Same promise, different shape, so it
  // is asked for differently rather than bent into the loop above.
  ok(/const PULSE = (true|false);/.test(bare) && /if \(!PULSE \|\|/.test(bare),
    'PULSE is a switch that turns its own effect off',
    'declared and guards drawPulse from within');

  // AND THE WHOLE THING COMES OUT IN FOUR LINES. One import and three calls is what
  // the file's own instructions promise — the three are the three places it has to
  // be: under the fog, over it, and over the trail. If a fourth appeared the promise
  // would be quietly false.
  const calls = (draw.match(/\b(drawMotion|drawWater|drawPulse)\(/g) || []).length;
  const imports = (draw.match(/from '\.\/motion\.js'/g) || []).length;
  ok(imports === 1 && calls === 3, 'and the whole of it is one import and three calls',
    `${imports} import, ${calls} call(s) in src/overview.js`);

  // THE WATER GOES WHERE THE ARTIST SAID. Two named directions in degrees, canvas
  // reckoning — 0 east, 90 south. The owner set the river round Dawnford running
  // east to west and the falls at Serene Peak coming down north-east to south-west,
  // and a boolean could not have expressed the second one at all.
  const flow = n => { const m = new RegExp(`${n} = (-?[\\d.]+)`).exec(bare); return m ? +m[1] : null; };
  ok(flow('RIVER_FLOW') === 180, 'the river runs east to west',
    `${flow('RIVER_FLOW')} degrees`);
  // South eleven degrees west, as a compass bearing: 90 for south, plus 11 towards
  // the west. Held as the number rather than the bearing because the code is in
  // canvas degrees and converting in two places is how the two drift apart.
  ok(flow('FALLS_FLOW') === 101, 'and the waterfall south, eleven degrees west',
    `${flow('FALLS_FLOW')} degrees`);

  // AND THE FALLS ARE NOT A FLICKER. Their first rate came from what falling water
  // does rather than what a thumbnail of falling water should do, and at two seconds
  // a band on a shape that size it read as a strobe rather than a current.
  const fallCycles = [...(/const FALL_BANDS = \[([^\]]+)\]/.exec(bare) || ['', ''])[1]
    .matchAll(/seconds: ([\d.]+)/g)].map(m => +m[1]);
  ok(fallCycles.length >= 3 && Math.min(...fallCycles) >= 5,
    'and it runs at the pace of the rest of the map',
    `quickest band ${Math.min(...fallCycles)}s`);

  // THE CLOUDS STAY UNDER THE FOG. Unexplored country is a still drained copy, and
  // a shadow crossing it would be motion in a place the player has not been.
  const body = draw.slice(draw.indexOf('export function drawOverview'));
  const fn = body.slice(0, body.indexOf('\n}\n') + 2).replace(/\/\/.*$/gm, '');
  const at = re => fn.search(re);
  // THE SUN IS LAID DOWN BEFORE THE NAMES AND THE FOG. It REPLACES the lit country
  // with a brighter copy rather than tinting it, so anything drawn inside the lit
  // shape before it is painted over.
  //
  // THE CLOUD SHADOWS ARE GONE, at the owner's word, and the pair of checks that
  // held their draw order went with them rather than being left to pass vacuously.
  // What they were guarding — that the sun goes down before the things it would
  // erase — is still worth holding, and is held here.
  ok(at(/spread\(sunSheet\)/) >= 0 && at(/spread\(sunSheet\)/) < at(/spread\(fog\)/),
    'the sun is laid on the map before the dark is',
    'the sun before the fog');

  // AND UNDER THE NAMES. A band crossing a river beneath a label was lighting the
  // lettering up with it, which is the one place this was visibly wrong.
  ok(at(/spread\(sunSheet\)/) < at(/drawImage\(art\.overviewNames/),
    'and under the region names, which it must not repaint',
    'the sun before the names');

  // NOTHING HERE MAY OUTRUN THE FLAG. Before this file the flag was the only thing
  // on the map that moved, and most of why it reads as "tap here" is that fact. The
  // flag's cloth rides a sine at 2.6 radians a second; a cloud takes over a minute
  // to cross and the slowest water band most of half of one. The falls are the
  // quickest thing here and still slower than the cloth.
  const cycles = [...bare.matchAll(/seconds: ([\d.]+)/g)].map(m => +m[1]);
  ok(cycles.length >= 6 && Math.min(...cycles) >= 1.5,
    'and nothing in it moves faster than the flag does',
    `${cycles.length} cycle(s), quickest ${Math.min(...cycles)}s`);

  // THE WATER IS MASKED BY ITS OWN PIXELS. Clipping to the outline put bands across
  // the temple and half of Dawnford, because the water is one shape whose outline
  // goes round the islands too. The colour key also keeps the shimmer off the four
  // bridges, which a clip never could.
  ok(/WATER_SHADE/.test(bare) && /getImageData/.test(bare) && !/ctx\.clip\(/.test(bare),
    'and the water is found by its colour rather than its outline',
    'colour-keyed mask, no path clip');
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
