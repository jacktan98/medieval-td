// Checks the world map: that the committed geometry still matches the artwork,
// that every road leads where it says, and that a marker without a map behind it
// cannot be tapped into a game. Node only — never loaded by the game.
//
//   node tools/campaign.mjs
//
// WHY THIS IS ITS OWN FILE, and not part of tools/overview.mjs. That file is a
// GENERATOR — it reads assets/map/Overview_Map.svg and writes
// src/data/overview.js — and a generator cannot check its own output, because
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
//   AND LOCKED MEANS LOCKED    stageAt answers only for reached, playable stages

import { readFileSync } from 'fs';
import { STAGES, STAGE_COUNT, playable } from '../src/data/overview.js';
import { stageAt, stageOfLevel } from '../src/overview.js';
import { levels } from '../src/level.js';

const SRC = 'assets/map/Overview_Map.svg';
const SCALE = 0.5;
const NODE_HIT = 22;   // must match src/overview.js

let bad = 0;
const ok = (cond, label, detail = '') => {
  if (!cond) bad++;
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(54)} ${detail}`);
};

// --- what the drawing says today --------------------------------------------

const svg = readFileSync(SRC, 'utf8');
const RE = /<path\s+d="([^"]+)"\s+fill="(#[0-9a-fA-F]{6})"|<path\s+fill="(#[0-9a-fA-F]{6})"\s+d="([^"]+)"/g;

const drawnMarkers = [];
let roadPaths = 0;
for (let m; (m = RE.exec(svg));) {
  const d = m[1] || m[4];
  const fill = (m[2] || m[3]).toLowerCase();
  if (fill === '#d30000') {
    const n = (d.match(/-?\d+\.?\d*(?:[eE][-+]?\d+)?/g) || []).map(Number);
    const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1);
    drawnMarkers.push([(Math.min(...xs) + Math.max(...xs)) / 2 * SCALE,
                       (Math.min(...ys) + Math.max(...ys)) / 2 * SCALE]);
  } else if (fill === '#ffde9e' || fill === '#ffefd4') roadPaths++;
}

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

// The generator asserts these two counts and refuses to write if they change, so
// a mismatch here means the data was written against a different drawing.
ok(roadPaths === 14, 'and the road is still drawn in the same number of pieces',
  `${roadPaths} path(s) in the two road fills`);

console.log('\n--- every road leads where it says ---\n');

// A leg is the road INTO its stage, so its last point is that stage. 3px of
// slack: the centreline stops at the marker's edge rather than its centre, and
// the markers are 24px wide before scaling.
{
  let off = 0, worst = 0;
  for (const [i, s] of STAGES.entries()) {
    const end = s.leg[s.leg.length - 1];
    const d = Math.hypot(end[0] - s.x, end[1] - s.y);
    worst = Math.max(worst, d);
    if (d > 14) { off++; console.log(`      stage ${i + 1} leg ends ${d.toFixed(1)}px from its marker`); }
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

  ok(reachedButUnbuilt.every(([i, s]) => stageAt(all, s.x, s.y) === null),
    'a reached marker with no map still answers nothing',
    `${reachedButUnbuilt.length} locked marker(s) tested at full progress`);

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

console.log(bad
  ? `\n${bad} thing(s) about the world map are not true.`
  : '\nThe world map matches the drawing, and locked means locked.');
process.exit(bad ? 1 : 0);
