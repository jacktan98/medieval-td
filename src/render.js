import { level, levels } from './level.js';
import { waves } from './data/waves.js';
import { canCallWave, earlyCallBonus } from './waves.js';
import { SCALE, EXPORT_PX, BLOOD_SCALE } from './data/towers.js';
import { CORPSE_FADE, knockbackOffset, settled } from './corpses.js';
import { SPLAT_FADE } from './blood.js';
import { art } from './assets.js';
import { towerBox, mountPoint, muzzlePoint, facing, mirror, frameOf } from './towers.js';
import { BTN_R, CANCEL_R, canUse } from './menu.js';
import { ringPath, clampToRange, SQUASH } from './ground.js';
import { ui, uiSize, aspect, GLYPH_ART, GLYPH_BOX, GLYPH_BOX_BARE, RALLY_FLAG_H, FLAG_FOOT,
         PORTRAIT_SCALE, STAT_ICON_H, STAT_COL } from './data/ui.js';
import { selectionInfo } from './select.js';

const PLOT_R = 30;

// Draws a red dot at each tower's firing origin. Off by default; add ?muzzle
// to the URL to switch it on, so offsets can be checked on a phone without
// editing a file and redeploying.
// Guarded so this module can be imported by the node tools, which need ROAD_W
// and have no `location`. Duplicating that constant in a tool is how it drifts.
const DEBUG_MUZZLE = typeof location !== 'undefined' &&
  new URLSearchParams(location.search).has('muzzle');

export function draw(ctx, state) {
  ctx.clearRect(0, 0, 960, 540);

  drawGround(ctx);
  drawPlots(ctx, state);
  drawRangeDiscs(ctx, state);
  // Blood pools BEFORE the depth pass, not inside it. A pool is a stain on the
  // ground, so nothing standing on the board should ever be behind one — and in
  // particular the body that made it has to lie on top of its own pool, which
  // sorting by depth could not guarantee once the pool is offset a few pixels.
  drawPools(ctx, state);
  // Every solid thing standing on the ground, in one pass sorted by depth. The
  // spatter goes through that pass too — it is not solid, but it does have a
  // place on the board, and drawing it afterwards put it on top of buildings it
  // was thrown behind. See drawFigures.
  drawFigures(ctx, state);
  // Health bars and muster rings after that, so status is never hidden by a
  // figure standing in front of the thing it belongs to.
  drawStatus(ctx, state);
  drawShots(ctx, state);
  drawHits(ctx, state);
  drawRally(ctx, state);
  drawHud(ctx, state);
  drawInfo(ctx, state);
  drawMenu(ctx, state);

  // Over everything, including the menu: while either of these is up the board
  // is not accepting the taps it normally would, and a dimmed board is how that
  // is said.
  if (!state.started) drawStart(ctx, state);
  else if (state.result) drawResult(ctx, state);
}

// The painted board. The road, the ground and the plot markers all live in this
// one image now, so nothing here draws them.
//
// It is stretched to the full 960x540 rather than letter-boxed: the artwork is
// authored at exactly 16:9 against this coordinate space, so any mismatch is a
// bug in the export rather than something to paper over at draw time. If the
// image is missing, fall back to flat ground — the game stays playable and the
// console says which file did not load.
function drawGround(ctx) {
  const img = art[level.art];
  if (img) {
    ctx.drawImage(img, 0, 0, 960, 540);
    return;
  }
  ctx.fillStyle = '#4A5744';
  ctx.fillRect(0, 0, 960, 540);
}

// Width of the painted road, measured off the artwork rather than chosen: the
// map was rasterised and this is twice the largest distance from any road pixel
// to the grass, so it is the true width of the widest part of the band.
//
// Nothing draws a road with it any more. It survives because tools/formation.mjs
// uses it to check the barracks squad stands on the road rather than beside it.
export const ROAD_W = 125;

// NOTHING ON THE GROUND IS DRAWN IN CODE. The grass, the road, the rocks and
// the grass tufts are all in the artwork now, so the vector trees, rocks and
// keep that used to stand in for them are deleted rather than switched off —
// two sources for the same object is how a map ends up with a code rock sitting
// on a painted one.
//
// The keep is not in the artwork yet, so for now there is simply nothing at the
// end of the road; enemies walk off the right-hand edge. Nothing in the rules
// depended on it — a leak is triggered by running out of path, not by touching
// a building — so it left no hole in the game, only in the picture.
//
// The one exception is the plot marker below, and it is an exception for a
// reason: it has to be able to disappear.

// The artist's plot marker, stamped on every plot that is still empty. Sizes
// come from tools/split-map.mjs, which centres the marker's viewBox on its
// ground ellipse so it can simply be drawn centred here — the signpost sticks
// up out of the top and the padding accounts for it.
//
// Drawing them rather than painting them into the map is the whole point: an
// occupied plot loses its marker, so the signpost stops poking out between a
// watchtower's legs.
// Read the same way as every sprite: a trim rect into the source, drawn at the
// shared SCALE, anchored by a pivot. The pivot is the centre of the ground
// ellipse rather than the middle of the box, because the signpost sticks up out
// of the top — anchoring on the box would bury the ellipse below the plot.
//
// All four numbers come from `node tools/split-map.mjs`, which measures the
// artist's file. It also reports how far off the map's own painted markers this
// draws; at the time of writing, 2.5%.
// Measured on the marker's OWN canvas, which is 1024 square as of the last
// redraw where every other sprite is 512. That is fine and needs no special
// case: a trim is source pixels into whatever image it names, and SCALE turns
// them into game px, so the only thing that matters is that the two agree. The
// check that it is right is the last line tools/split-map.mjs prints — the
// stamped marker against the ones painted into the board, currently 2.5% apart.
// The marker was redrawn BIGGER — 99x49 game px where it was 86x38 — because
// the tier 2 barracks is the biggest building in the game and a marker the old
// size read as a plot too small to hold it. The nine painted into the map moved
// to make room for the new one, so the plot list in data/level01.js changed with
// it; re-run tools/split-map.mjs and re-paste both together.
const MARKER_TRIM = [270, 393, 484, 238];
const MARKER_PIVOT = [0.500, 0.532];
const MARKER_W = MARKER_TRIM[2] * SCALE;
const MARKER_H = MARKER_TRIM[3] * SCALE;

function drawPlots(ctx, state) {
  const img = art.plot_marker;
  if (!img) return;

  const [sx, sy, sw, sh] = MARKER_TRIM;
  for (const p of level.plots) {
    if (state.towers.some(t => t.plot === p)) continue;
    ctx.drawImage(img, sx, sy, sw, sh,
      p.x - MARKER_PIVOT[0] * MARKER_W, p.y - MARKER_PIVOT[1] * MARKER_H,
      MARKER_W, MARKER_H);
  }
}

// Range rings lie flat on the ground, so they belong under everything that
// stands on it — including the tower they belong to.
//
// Menu open, or the mouse is over it. The hover half only ever fires on a
// desktop — input.js gates it on pointerType — so the menu remains the only way
// to see this on a phone.
function drawRangeDiscs(ctx, state) {
  for (const t of state.towers) {
    if ((state.menu && state.menu.tower === t) || state.hoverTower === t) {
      drawRangeDisc(ctx, t);
    }
  }
}

// DEPTH. Everything solid standing on the board is drawn in one pass, ordered by
// how far down the screen its feet are: lower is nearer the camera, so it draws
// later and covers what is behind it.
//
// The order used to be structural — all towers, then bodies, then enemies in
// spawn order, then soldiers — which is not depth at all. A spearman covered an
// enemy even while standing behind it, an enemy that spawned earlier was covered
// by one that spawned later wherever the two happened to be, and anything on
// foot drew over a tower it was walking behind. With three soldiers and a knot
// of enemies meeting on the same bend, that is most of the screen.
//
// Sorting on the ANCHOR, not the sprite: every figure is anchored at its feet
// and a building at its base, so one number means the same thing for all of
// them. Sorting by sprite top would put a tall figure behind a short one it is
// standing in front of.
function drawFigures(ctx, state) {
  const items = [];
  const add = (y, rank, run) => items.push({ y, rank, run });

  // A building is anchored by its ground shadow, whose centre sits on the plot
  // point — so the plot point IS the building's ground line, the same way a
  // figure's feet are its own.
  for (const t of state.towers) add(t.y, 1, () => drawTower(ctx, t));
  // Bodies are flat on the ground, so at equal depth they go under a figure
  // standing at the same spot rather than over its feet.
  for (const c of state.corpses) add(c.y, 0, () => drawCorpse(ctx, c));
  for (const e of state.enemies) add(e.y, 1, () => drawEnemy(ctx, e));
  for (const u of state.units) if (u.respawn <= 0) add(u.y, 1, () => drawSoldier(ctx, u));
  // Spatter sorts HERE rather than in a pass of its own, and by the victim's
  // feet rather than by the wound it is drawn at. Rank 2 puts it just in front
  // of the figure it came out of, which is where blood coming off a body
  // belongs; being in the pass at all is what stops it landing on a building
  // that is nearer the camera than the fight. It used to be a separate pass
  // after this one, and painted red dots on the barracks roof.
  for (const s of state.splats) {
    add(s.groundY ?? s.y, 2, () => drawBlood(ctx, s.img, s.x, s.y, Math.min(1, s.life / SPLAT_FADE)));
  }

  items.sort((a, b) => a.y - b.y || a.rank - b.rank);
  for (const it of items) it.run();
}

function drawTower(ctx, t) {
  const box = towerBox(t);
  drawBuilding(ctx, t, box);
  if (t.def.gunner) drawGunner(ctx, t);
  drawBuildingFront(ctx, t, box);
  // Above everything the building draws, including its front layer — the marks
  // are information, and the same rule that puts health bars over the figures
  // they belong to applies.
  drawTierMarks(ctx, t, box);

  if (DEBUG_MUZZLE) {
    // Drawn from muzzlePoint itself, so the dot marks where arrows really
    // spawn rather than where the sprite transform thinks they should.
    const m = muzzlePoint(t);
    ctx.fillStyle = '#D4453A';
    ctx.beginPath();
    ctx.arc(m.x, m.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Health bars and muster rings. Drawn after every figure rather than with the
// one they belong to, because they are information: a bar hidden behind the
// soldier standing in front of its enemy is the one thing depth sorting must not
// take away.
function drawStatus(ctx, state) {
  for (const e of state.enemies) {
    healthBar(ctx, e.x, e.y - artHeight(e.def) - 4, e.def.r, e.hp / e.maxHp);
  }
  for (const u of state.units) {
    if (u.respawn > 0) musterRing(ctx, u);
    else healthBar(ctx, u.x, u.y - artHeight(u.def) - 4, u.def.r, u.hp / u.maxHp);
  }
}

// The tower's reach: a translucent fill so you can see which stretch of road it
// covers, a shadowed rim below and a lit rim on top.
//
// An ELLIPSE flattened to SQUASH, because a reach is a patch of GROUND and the
// ground is drawn in perspective. It is not decoration: ground.js holds the
// shape once, and pickTarget's test, the rally clamp and this drawing all go
// through it, so the picture and the rule cannot be different shapes.
//
// Both halves of that were reported as bugs, in order, and the pair is the
// lesson. First the ring was drawn squashed while the rules used plain round
// distance — which left a 57px band above and below every tier 1 tower that was
// outside the ring and shot at anyway. An enemy standing there had its head
// inside the ring and its shadow outside, and since the shadow is where a figure
// IS, the tower read as aiming at heads. Drawing a true circle fixed that and
// threw away the perspective with it. So the rule was squashed to match the
// picture instead, which is the version that keeps the 3D and costs a rebalance
// — a tower now covers 62% of the area it used to, and the ranges went up to pay
// for it. That is the real price of the look, and it has been paid once.
function drawRangeDisc(ctx, t) {
  const r = t.def.range;
  const next = t.fam.tiers[t.def.tier];

  // The reach the upgrade would buy, as a dotted ring outside the solid one.
  //
  // Shown whenever the menu is open, NOT on hover: there is no hover on a
  // phone, and this game is played with a thumb. Anything that only appears
  // under a mouse pointer is invisible to most of the people playing it, so the
  // trigger is "you are looking at this tower's menu" instead.
  //
  // Drawn first so the current range's rim stays the crisper of the two.
  if (next && next.range > t.def.range) {
    const gx = next.range;
    ctx.save();
    ctx.fillStyle = 'rgba(200,240,255,0.07)';
    ringPath(ctx, t.x, t.y, gx);
    ctx.fill();

    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = 'rgba(24,26,20,0.35)';
    ctx.lineWidth = 3;
    ringPath(ctx, t.x, t.y, gx, 3);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(150,225,255,0.90)';
    ctx.lineWidth = 2;
    ringPath(ctx, t.x, t.y, gx);
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(240,230,210,0.10)';
  ringPath(ctx, t.x, t.y, r);
  ctx.fill();

  ctx.strokeStyle = 'rgba(24,26,20,0.40)';
  ctx.lineWidth = 3;
  ringPath(ctx, t.x, t.y, r, 3);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,247,228,0.72)';
  ctx.lineWidth = 2;
  ringPath(ctx, t.x, t.y, r);
  ctx.stroke();
}

// THE TIER STARS ARE BACK, BUT ONLY WHERE THE ARTWORK CANNOT SAY IT.
//
// They used to sit over every tower's roof, one per tier, and they came out when
// the info box learned to say "Barracks Tier II" in words: two indicators for
// one fact is one too many, and the stars were the worse of the pair — three
// small shapes competing with the flag and the muster rings, and the first thing
// cut off by the top of the board on a high plot. That reasoning still holds
// wherever a tier has a building of its own to be recognised by. Timber becomes
// stone; you can see it.
//
// Artillery's three tiers are one drawing. Nothing about a Trebuchet on the
// board distinguishes it from the Catapult it was, so the stars come back for
// exactly that case and no other. The test is `tierMarks` below, and it reads
// the DATA rather than a flag someone has to remember to clear: the moment tiers
// 2 and 3 get frames of their own, their sprite keys differ and the stars stop
// being drawn. Nothing has to be undone.
//
// tools/hud-clear.mjs allows STAR_LIFT + STAR_R above the box for towers that
// have them, which is how the stars stay out of the dashboard.
export const STAR_R = 5;        // point radius
export const STAR_LIFT = 9;     // centre, above the top of the building's box
const STAR_GAP = 11;            // between stars in the row

// How many stars this tower wants, or 0 for none.
//
// A tier gets marked when another tier in the SAME family is drawn with the same
// artwork — meaning the building on the board cannot tell you which one it is.
// Tier 1 of such a family is marked too: one star against two is the comparison
// that carries the information, and an unmarked tier 1 beside a two-starred tier
// 2 reads as "this one is broken" rather than "this one is tier 1".
export function tierMarks(t) {
  const key = t.def.sprite;
  const shared = t.fam.tiers.filter(d => d.sprite === key).length > 1;
  return shared ? t.def.tier : 0;
}

// A row of small stars, centred over the building.
//
// Drawn rather than lettered, and outlined rather than plain, because they land
// on grass, on road and on the top of another building depending on the plot —
// the same reason the HUD numbers carry a shadow.
function drawTierMarks(ctx, t, box) {
  const n = tierMarks(t);
  if (!n) return;

  const cy = box.top - STAR_LIFT;
  const cx = box.left + box.w / 2 - (n - 1) * STAR_GAP / 2;

  ctx.save();
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(24,28,20,0.75)';
  ctx.fillStyle = '#F2C64B';

  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    for (let p = 0; p < 10; p++) {
      // Alternating outer and inner points, starting at the top.
      const a = -Math.PI / 2 + p * Math.PI / 5;
      const r = p % 2 ? STAR_R * 0.45 : STAR_R;
      const x = cx + i * STAR_GAP + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      p ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  }
  ctx.restore();
}

const OUTLINE = '#22201C';
const DECK_H = 7;      // thickness of the platform slab the gunner stands on

// Lighten (positive) or darken (negative) a #rrggbb by a fraction of full
// range. Saves carrying three shades of every tower colour in the data.
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c + 255 * amt)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// Real artwork if the tier has any, otherwise the vector building. Families
// get wired up one tier at a time as art arrives, and a PNG that fails to
// load falls back to something drawn rather than to an empty plot.
function drawBuilding(ctx, t, box) {
  // frameOf, not def.sprite: a catapult is three drawings on a one-second beat
  // and this is which one it is on. Everything else has a single frame and
  // answers with it. The three share ONE trim — the union of all three boxes —
  // so they register pixel-for-pixel and only what the artist moved appears to
  // move; see CATAPULT_TRIM in data/towers.js.
  const key = frameOf(t);
  const img = key && art[key];
  if (img) {
    const [sx, sy, sw, sh] = t.def.spriteTrim;
    ctx.drawImage(img, sx, sy, sw, sh, box.left, box.top, box.w, box.h);
    return;
  }
  if (t.def.shape === 'camp') drawCamp(ctx, t, box);
  else drawStoneTower(ctx, t, box);
}

// The bits of the building that stand between the gunner and the camera: the
// roof he is under, and the post at the deck's nearest corner. Drawn again after
// him, from rects of the SAME image, so nothing new has to be exported and the
// two layers cannot drift apart the way a separate "front" file would.
//
// Re-drawing a rect of the sprite paints exactly what the artist put there,
// transparency included — the archer shows through wherever the tower does not
// cover him, and each rect only has to be chosen so that everything solid inside
// it really does belong in front. That is the whole trick, and it is why the
// rects are tight rather than generous.
//
// Depth inside one sprite is the tower's own business. The y-sort in
// drawFigures decides where the whole tower sits against everything else on the
// board; this decides what the tower puts in front of its own gunner.
function drawBuildingFront(ctx, t, box) {
  const d = t.def;
  const img = d.sprite && art[d.sprite];
  if (!img || (!d.frontTrims && !d.frontPolys)) return;

  const [tx, ty, tw, th] = d.spriteTrim;
  const toX = sx => box.left + (sx - tx) / tw * box.w;
  const toY = sy => box.top + (sy - ty) / th * box.h;

  for (const [sx, sy, sw, sh] of d.frontTrims || []) {
    ctx.drawImage(img, sx, sy, sw, sh, toX(sx), toY(sy), sw / tw * box.w, sh / th * box.h);
  }

  // The railings run diagonally, and a rect around one always contains the deck
  // behind it as well — paint that over the archer and it erases his legs. So a
  // rail is given as a POLYGON in the same source pixels, the canvas is clipped
  // to it, and the sprite is redrawn through the hole. Four points instead of a
  // staircase of a dozen rects, and exact rather than approximate.
  for (const poly of d.frontPolys || []) {
    ctx.save();
    ctx.beginPath();
    poly.forEach(([px, py], i) => (i ? ctx.lineTo(toX(px), toY(py)) : ctx.moveTo(toX(px), toY(py))));
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, tx, ty, tw, th, box.left, box.top, box.w, box.h);
    ctx.restore();
  }
}

// Fallback archery tower, drawn only when the sprite fails to load. Side
// elevation rather than top-down, so it will not match a rotating gunner —
// it exists so a failed image leaves a building rather than bare ground.
function drawStoneTower(ctx, t, box) {
  const stone = t.def.colour;
  const deckTop = box.top + box.h * 0.15;
  const deckBottom = deckTop + DECK_H;
  const bottom = box.top + box.h;

  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';

  // Shaft, wider at the base so it reads as load-bearing.
  const topIn = box.w * 0.13;
  const baseIn = box.w * 0.05;
  ctx.fillStyle = shade(stone, -0.06);
  ctx.beginPath();
  ctx.moveTo(box.left + topIn, deckBottom);
  ctx.lineTo(box.left + box.w - topIn, deckBottom);
  ctx.lineTo(box.left + box.w - baseIn, bottom);
  ctx.lineTo(box.left + baseIn, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Arrow slit, centred on the shaft.
  const slitH = Math.min(14, (bottom - deckBottom) * 0.3);
  ctx.fillStyle = '#3E3E46';
  ctx.fillRect(box.left + box.w / 2 - 2, deckBottom + 9, 4, slitH);

  // Door at the foot.
  ctx.fillStyle = '#3E3E46';
  ctx.fillRect(box.left + box.w / 2 - 6, bottom - 13, 12, 13);
  ctx.strokeRect(box.left + box.w / 2 - 6, bottom - 13, 12, 13);

  // Platform slab, overhanging the shaft on both sides.
  ctx.fillStyle = shade(stone, 0.1);
  ctx.fillRect(box.left, deckTop, box.w, DECK_H);
  ctx.strokeRect(box.left, deckTop, box.w, DECK_H);

  // Merlons at the ends only. The gunner stands in the gap between them, feet
  // on the slab, which is the whole point of drawing the deck at all.
  const mw = box.w * 0.27;
  const mh = box.h * 0.15;
  ctx.fillStyle = stone;
  ctx.fillRect(box.left, deckTop - mh, mw, mh);
  ctx.strokeRect(box.left, deckTop - mh, mw, mh);
  ctx.fillRect(box.left + box.w - mw, deckTop - mh, mw, mh);
  ctx.strokeRect(box.left + box.w - mw, deckTop - mh, mw, mh);
}

// Barracks: a timber hall under a pitched roof. No gunner, so nothing has to
// line up with the roofline.
function drawCamp(ctx, t, box) {
  const wall = t.def.colour;
  const bottom = box.top + box.h;
  const eaves = box.top + box.h * 0.46;

  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';

  // Walls.
  ctx.fillStyle = shade(wall, 0.04);
  ctx.fillRect(box.left + 4, eaves, box.w - 8, bottom - eaves);
  ctx.strokeRect(box.left + 4, eaves, box.w - 8, bottom - eaves);

  // Roof, overhanging the walls at the eaves.
  ctx.fillStyle = shade(wall, -0.2);
  ctx.beginPath();
  ctx.moveTo(box.left, eaves);
  ctx.lineTo(box.left + box.w / 2, box.top + 3);
  ctx.lineTo(box.left + box.w, eaves);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Doorway.
  const dw = 13;
  const dh = (bottom - eaves) * 0.66;
  ctx.fillStyle = '#3E3E46';
  ctx.fillRect(box.left + box.w / 2 - dw / 2, bottom - dh, dw, dh);
  ctx.strokeRect(box.left + box.w / 2 - dw / 2, bottom - dh, dw, dh);

  // A banner from tier 2, so the upgrade is visible at a glance.
  if (t.def.tier < 2) return;
  const px = box.left + box.w - 7;
  ctx.strokeStyle = OUTLINE;
  ctx.beginPath();
  ctx.moveTo(px, eaves + 2);
  ctx.lineTo(px, box.top - 12);
  ctx.stroke();
  ctx.fillStyle = t.def.tier === 3 ? '#C4A574' : '#8C4A3C';
  ctx.beginPath();
  ctx.moveTo(px, box.top - 12);
  ctx.lineTo(px + 14, box.top - 8);
  ctx.lineTo(px, box.top - 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// Gunners stay upright and only mirror. The art is drawn standing, so rotating
// it to the aim angle lays the figure on its side; a left/right flip is the
// only orientation that reads correctly for a standing sprite.
//
// The drawn size comes from gunnerR, so the body reads at a known radius
// whatever the source art's proportions are, and it mirrors about the body
// rather than the middle of a box that a bow pulls off-centre.
function drawGunner(ctx, t) {
  const d = t.def;
  const m = mountPoint(t);
  const img = art[d.gunner];

  if (!img) {
    ctx.fillStyle = '#E0D6C2';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    return;
  }

  const [sx, sy, sw, sh] = d.gunnerTrim;
  const dw = sw * SCALE;
  const dh = sh * SCALE;

  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.scale(mirror(d, facing(t)), 1);
  ctx.translate(-t.recoil * 3, 0);   // kicks backward, opposite the shot
  ctx.drawImage(img, sx, sy, sw, sh, -d.gunnerPivot[0] * dw, -d.gunnerPivot[1] * dh, dw, dh);
  ctx.restore();
}

// Blood. Measured by tools/trim.mjs like everything else, but drawn at
// BLOOD_SCALE rather than the shared SCALE — see the note on that constant in
// data/towers.js for why an effect is allowed to break the one-scale rule.
//
// Anchored at the CENTRE of the trim, not at a pivot. A splash has no feet and
// no upright; the point it is thrown at is the middle of it.
const BLOOD_TRIM = {
  blood_1:      [241, 240,  33, 32],
  blood_2:      [238, 239,  36, 20],
  blood_dead_1: [207, 241,  98, 30],
  blood_dead_2: [200, 243, 112, 26]
};

function drawBlood(ctx, key, x, y, alpha) {
  const img = art[key];
  if (!img) return;
  const [sx, sy, sw, sh] = BLOOD_TRIM[key];
  const dw = sw * BLOOD_SCALE;
  const dh = sh * BLOOD_SCALE;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, sx, sy, sw, sh, x - dw / 2, y - dh / 2, dw, dh);
  ctx.restore();
}

// The stain under each body. Offset and image were chosen once, when the corpse
// was created, and both live on the corpse — so a pool never flickers between
// the two pictures and never crawls around between frames.
//
// It sits at the corpse's resting x and does NOT follow the knockback: the body
// slides into its pool rather than dragging it along. It fades in over the throw
// for the same reason — blood on the ground before the man has landed on it
// would give the whole thing away.
function drawPools(ctx, state) {
  for (const c of state.corpses) {
    if (!c.pool) continue;
    drawBlood(ctx, c.pool.img, c.x + c.pool.dx, c.y + c.pool.dy,
      Math.min(1, c.life / CORPSE_FADE) * settled(c));
  }
}

// Where a figure's feet sit inside its FULL square export, as a fraction of that
// square. Every other anchor in the game is a fraction of a sprite's trim; this
// one is not, and cannot be, because it has to place a second drawing that has a
// different trim of its own.
//
// It is what lets a death pose work with no numbers pasted in: the body is drawn
// as the whole 512 canvas, lined up so the point the living man stood on lands
// where he died. Draw the corpse over the standing figure on the same canvas and
// it is right by construction — assets/dead/README.md says exactly that.
function canvasAnchor(def) {
  const [sx, sy, sw, sh] = def.spriteTrim;
  return [(sx + def.pivot[0] * sw) / EXPORT_PX, (sy + def.pivot[1] * sh) / EXPORT_PX];
}

// Bodies. Two seconds on the ground, fading out over the last half of a second,
// mirrored to the way the man was facing when he died — the same upright-and-
// mirror-only rule as every other figure, except that this one is drawn already
// lying down. Nothing is ever rotated to tip a standing sprite over.
//
// A def with no death art, or one whose PNG has not been uploaded yet, draws
// nothing at all. That is the whole fallback: no grey box, no placeholder, just
// the game exactly as it was before the feature existed.
function drawCorpse(ctx, c) {
  const img = art[c.def.dead];
  if (!img) return;

  ctx.save();
  ctx.globalAlpha = Math.min(1, c.life / CORPSE_FADE);
  // The throw is applied in world space, before the mirror, so a body goes back
  // from the way it was facing rather than back from the way the art is drawn.
  ctx.translate(c.x + knockbackOffset(c), c.y);
  ctx.scale(mirror(c.def, c.face), 1);

  if (c.def.deadTrim) {
    // Measured art, once tools/trim.mjs has been run on the upload. Read the
    // same way as every other sprite: a window into the source, drawn at the
    // shared SCALE, anchored by a pivot into that window.
    const [sx, sy, sw, sh] = c.def.deadTrim;
    const dw = sw * SCALE;
    const dh = sh * SCALE;
    ctx.drawImage(img, sx, sy, sw, sh,
      -c.def.deadPivot[0] * dw, -c.def.deadPivot[1] * dh, dw, dh);
  } else {
    const [ax, ay] = canvasAnchor(c.def);
    const d = EXPORT_PX * SCALE;
    ctx.drawImage(img, -ax * d, -ay * d, d, d);
  }

  ctx.restore();
}

// How far an enemy shifts forward on its swing, in game px. Now the same 6 as a
// spearman's, so both sides of a melee move the same distance as well as at the
// same tempo — at 4 the enemy read as flinching while the spearman attacked.
// One number for both is also one number to change.
const ENEMY_LUNGE = 6;

// Enemies stay upright and only mirror, same rule as the gunners and soldiers.
// They face the way they are walking, which is the direction of the segment
// they are on, so a column marching left is drawn facing left.
//
// THEY DO NOT BOB. A walking enemy used to rise and fall about 2px on a sine of
// its walk timer, fading out when it stopped to fight. It is gone: a figure that
// moves up and down as well as along reads as hopping rather than marching, and
// with three lanes on the road there are enough of them on screen for the
// hopping to be the thing you notice. The only movement an enemy has now is
// along its lane, plus the lunge when it swings.
function drawEnemy(ctx, e) {
  const img = e.def.sprite && art[e.def.sprite];

  if (!img) {
    ctx.fillStyle = e.def.colour;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.def.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#22201C';
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }

  const [sx, sy, sw, sh] = e.def.spriteTrim;
  const dw = sw * SCALE;
  const dh = sh * SCALE;
  const dir = e.face;

  ctx.save();
  // Lunge toward whatever it is hitting, the same way a soldier does, so a
  // melee reads as two figures trading blows rather than one animated one.
  ctx.translate(e.x + dir * (e.thrust || 0) * ENEMY_LUNGE, e.y);
  ctx.scale(mirror(e.def, dir), 1);
  ctx.drawImage(img, sx, sy, sw, sh, -e.def.pivot[0] * dw, -e.def.pivot[1] * dh, dw, dh);
  ctx.restore();
}

// How tall a figure is DRAWN, which is not the same as how big its body is for
// collisions. Health bars hang off this: pinned to the collision radius instead,
// a bar sat across the chest of anything drawn taller than its hitbox, and the
// tier 2 enemy — 28px of art over a 12px body — made that obvious.
const artHeight = def => def.spriteTrim ? def.spriteTrim[3] * SCALE : def.r * 2;

// Sized to the thing it belongs to, and hidden at full health. Fixed-width bars
// over 12px soldiers read as a wall of stripes and hide the fight underneath.
function healthBar(ctx, x, y, r, pct) {
  if (pct >= 1) return;
  const w = Math.max(14, r * 2.6);
  ctx.fillStyle = 'rgba(34,32,28,0.85)';
  ctx.fillRect(x - w / 2, y, w, 4);
  ctx.fillStyle = pct > 0.5 ? '#6BBF59' : '#D4453A';
  ctx.fillRect(x - w / 2 + 1, y + 1, (w - 2) * Math.max(0, pct), 2);
}

// Soldiers stay upright and only mirror, same as the gunners — the art is
// drawn standing, and a standing figure rotated to face north-east is a
// standing figure lying down.
//
// The drawn size comes from the soldier's own radius via bodyFrac, so the
// sprite's body always matches the radius the formation layout and
// tools/formation.mjs use.
function drawSoldier(ctx, u) {
  const s = u.def;
  const img = s.sprite && art[s.sprite];

  if (!img) {
    ctx.fillStyle = s.colour;
    ctx.beginPath();
    ctx.arc(u.x, u.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }

  const [sx, sy, sw, sh] = s.spriteTrim;
  const dw = sw * SCALE;
  const dh = sh * SCALE;
  const dir = Math.cos(u.face) >= 0 ? 1 : -1;

  ctx.save();
  // Lunge toward the foe on the swing, so a spear thrust reads as a thrust.
  ctx.translate(u.x + dir * u.thrust * s.lunge, u.y);
  ctx.scale(mirror(s, dir), 1);
  ctx.drawImage(img, sx, sy, sw, sh, -s.pivot[0] * dw, -s.pivot[1] * dh, dw, dh);
  ctx.restore();
}

// Countdown ring for a soldier that is dead and coming back, floating off the
// barracks' top-right corner rather than centred on the building.
//
// Centred, the rings sat behind the roof and read as part of the building. Out
// in the air beside it they read as status. They are anchored to the drawn box
// rather than to tower.x/y so they follow the roofline of whatever art a tier
// has, and they hug the corner tightly: at the highest plot the box top is only
// 51px down, and the 40px HUD is waiting just above it.
function musterRing(ctx, u) {
  const box = towerBox(u.tower);
  const cx = box.left + box.w + 2;
  const cy = box.top + 8;
  const r = 4 + u.slot * 3;      // one ring per slot, nested, so three read as three
  const done = 1 - u.respawn / u.def.respawn;

  ctx.strokeStyle = 'rgba(20,22,16,0.30)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(240,230,210,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + done * Math.PI * 2);
  ctx.stroke();
}

// Arrows are the only sprite that rotates: a projectile has no upright, and it
// has to point where it is flying. The art is drawn pointing left, so the
// rotation is the heading plus a half turn.
// The patch of ground a lobbed rock is currently over.
//
// THIS IS WHAT MAKES THE ARC READABLE, and it is not decoration. On a board
// drawn in perspective, a rock 60px up over the road and a rock 60px further
// along the road are the same pixels — so without a shadow the height reads as
// distance and the player cannot tell where the thing is going to land. Every
// figure in the game has one for exactly this reason; a rock in flight is the
// only object that leaves the ground, so it is the only one that needs its
// shadow drawn separately.
//
// It earns its keep twice over now that the crew aims AHEAD of its target: the
// shadow is the only thing on screen that says where the splash is going, in
// time for the player to watch it happen.
//
// Flattened to SQUASH like every other patch of ground, and it fades as the rock
// rises — the higher the thrower, the softer the shadow, which is the cue that
// reads as height without needing a size change big enough to be mistaken for
// the splash radius.
function rockShadow(ctx, s) {
  const height = s.groundY - s.y;
  const fade = Math.max(0, 0.34 - height / 400);

  ctx.save();
  ctx.fillStyle = `rgba(30,36,26,${fade.toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(s.x, s.groundY, 5, 5 * SQUASH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Every shot draws the ammunition it was fired with. Which is not the same
// picture any more: an arrow and a catapult's rock are in the air at the same
// time and the shot carries its own, so nothing here has to know which tower
// threw it.
function drawShots(ctx, state) {
  // Shadows first, so every one of them is under every rock rather than under
  // only the rocks drawn after it.
  for (const s of state.shots) if (s.groundY !== undefined) rockShadow(ctx, s);

  for (const s of state.shots) {
    const ammo = s.ammo;
    const img = art[ammo.sprite];
    const a = s.angle || 0;

    if (!img) {
      ctx.strokeStyle = '#F0E6D2';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - Math.cos(a) * 10, s.y - Math.sin(a) * 10);
      ctx.stroke();
      continue;
    }

    const [sx, sy, sw, sh] = ammo.trim;
    const dw = sw * SCALE;
    const dh = sh * SCALE;

    ctx.save();
    ctx.translate(s.x, s.y);
    // `faces` 0 means the drawing has no nose to point anywhere, so it is never
    // turned. A rock rotated to its heading is a rock at a random angle: all the
    // spin and none of the meaning, and it reads as a bug in the arrow code.
    if (ammo.faces) ctx.rotate(a + (ammo.faces < 0 ? Math.PI : 0));
    // `grip` is which point of the drawing sits on the flight path — the head of
    // an arrow, the middle of a rock.
    ctx.drawImage(img, sx, sy, sw, sh, -dw * ammo.grip, -dh / 2, dw, dh);
    ctx.restore();
  }
}

function drawHits(ctx, state) {
  for (const h of state.hits) {
    ctx.strokeStyle = `rgba(255,255,255,${h.life * 4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(h.x, h.y, (0.25 - h.life) * 60, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// Rally point overlay. Two jobs: while a barracks is selected for placement it
// shows how far the squad may be sent, and at all other times it marks where a
// moved rally actually sits, so a squad standing off in the distance is not a
// mystery.
//
// Only ever shown for ONE barracks at a time — the one being placed, or the one
// whose menu is open, or the one under the mouse. Nine rally flags on screen at
// once is noise, not information.
function drawRally(ctx, state) {
  const t = state.placing ||
            (state.menu && state.menu.tower && state.menu.tower.def.soldier ? state.menu.tower : null) ||
            (state.hoverTower && state.hoverTower.def.soldier ? state.hoverTower : null);
  if (!t) return;

  const placing = state.placing === t;

  // How far the rally point may be dragged, through the same ringPath the
  // archery reach uses — input.js clamps the drag with clampToRange, so this
  // line is exactly the set of points a drag can land on.
  ctx.save();
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = placing ? 'rgba(150,225,255,0.95)' : 'rgba(240,230,210,0.55)';
  ctx.lineWidth = 2;
  ringPath(ctx, t.x, t.y, t.def.range);
  ctx.stroke();
  if (placing) {
    ctx.fillStyle = 'rgba(200,240,255,0.06)';
    ctx.fill();
  }
  ctx.restore();

  // Where the squad is actually standing, which is the rally projected onto the
  // road — not the raw point, because that is what the soldiers obey.
  const squad = state.units.filter(u => u.tower === t);
  if (squad.length) {
    const mx = squad.reduce((a, u) => a + u.rx, 0) / squad.length;
    const my = squad.reduce((a, u) => a + u.ry, 0) / squad.length;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(240,230,210,0.40)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(mx, my);
    ctx.stroke();
    ctx.setLineDash([]);
    // Dimmed: this is where they ARE, which is a reminder rather than an action.
    flag(ctx, mx, my, 0.6);
  }

  // The ghost follows the mouse while placing. There is no ghost on a phone —
  // a thumb has no position until it touches — so the flag above is what makes
  // the feature usable there: tap, look, tap again to correct.
  if (placing && state.ghost) {
    const at = clampToRange(t.x, t.y, state.ghost.x, state.ghost.y, t.def.range);
    // Full strength: this is where they would GO, under the player's pointer.
    flag(ctx, at.x, at.y, 1);
  }
}

// The rally flag, on the board. The SAME picture as the rally button in the
// menu, so the control and the thing it places look like each other — it used to
// be a vector pole and triangle drawn here, which meant tapping a drawn flag
// produced a different flag.
//
// Planted, not centred: FLAG_FOOT puts the bottom of the pole on (x, y), which
// is the point being marked. Centring it would float the marker half a flag
// above the spot and lean it to one side, because the pennant is all on the
// right of the pole.
//
// `alpha` is the dimming. The squad's current stand is a quiet marker and the
// ghost under a live drag is the loud one, and one file covers both.
function flag(ctx, x, y, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;

  if (!drawUi(ctx, 'glyph_flag', x, y, RALLY_FLAG_H, FLAG_FOOT)) {
    // Vector fallback, matched to the drawing's proportions: a 20px pole with
    // the pennant on the upper right.
    ctx.strokeStyle = 'rgba(24,26,20,0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - RALLY_FLAG_H);
    ctx.stroke();

    ctx.fillStyle = '#1F63AB';
    ctx.beginPath();
    ctx.moveTo(x, y - RALLY_FLAG_H);
    ctx.lineTo(x + 14, y - RALLY_FLAG_H + 5);
    ctx.lineTo(x, y - RALLY_FLAG_H + 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(24,26,20,0.75)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

// The two dashboard controls, at the right-hand end of the header strip.
//
// The drawn boxes are 44 tall, but the TAP targets run the full depth of the
// strip and overhang the sides, the same trick the radial menu uses with
// HIT_R > BTN_R. At the smallest phone this game targets — a 667px-wide canvas
// — 63 logical px is 44 real ones, which is the minimum a thumb can hit.
// The two dashboard controls, right-aligned to x=944.
//
// 24 TALL, the same height as the gold and lives icons beside them, so the whole
// dashboard sits on one band instead of the controls being twice the depth of
// the readouts. They were 44 tall, which is the touch minimum — but the touch
// minimum was never being met by the drawn box anyway. It is met by the HIT box,
// which is unchanged: the full 63px depth of the strip plus HUD_PAD each side,
// and 63 logical px is 44 real ones on the smallest canvas this game targets.
// Shrinking the picture does not shrink the target.
// The plates are artwork now, so the HEIGHT is chosen and the WIDTH follows from
// the drawing's own proportions — 24 tall ties them to the icons beside them, and
// squashing a plate to a width picked before it was drawn is the one thing this
// project never does to art. 174x78 and 414x78 at 24 tall come out 54 and 127.
//
// Centred as a ROW: 54 + 14 + 54 + 14 + 127 = 263, so 349..612 puts the middle
// on 480. The readouts end around x=324 and the info box starts at 728.
//
// Pause borrows the speed plate's artwork, because it is the same size and shape
// of control and there is no third plate drawn yet. When one arrives it only has
// to be added to data/ui.js and named here — the width comes off its own aspect,
// so a differently proportioned plate re-centres the row rather than being
// squashed into this one's slot.
const PLATE_H = 24;
const HUD_GAP = 14;
const PAUSE_W = Math.round(PLATE_H * aspect('plate_speed'));
const SPEED_W = Math.round(PLATE_H * aspect('plate_speed'));
const WAVE_W = Math.round(PLATE_H * aspect('plate_wave'));
const HUD_X = Math.round(480 - (PAUSE_W + HUD_GAP + SPEED_W + HUD_GAP + WAVE_W) / 2);

export const HUD_BTN = {
  pause: { x: HUD_X, y: 9, w: PAUSE_W, h: PLATE_H, art: 'plate_speed' },
  speed: { x: HUD_X + PAUSE_W + HUD_GAP, y: 9, w: SPEED_W, h: PLATE_H, art: 'plate_speed' },
  wave:  { x: HUD_X + PAUSE_W + HUD_GAP + SPEED_W + HUD_GAP, y: 9, w: WAVE_W, h: PLATE_H, art: 'plate_wave' }
};

// Sized so the two padded boxes do not touch: the gap between the buttons is 14,
// so 7 a side exactly fills it and no tap is ambiguous. It used to be 12 against
// a 12px gap, which overlapped, and the loop below silently gave the overlap to
// whichever button came first in the object.
const HUD_PAD = 7;

export function hitHudButton(state, x, y) {
  if (y > 63) return null;
  for (const [id, b] of Object.entries(HUD_BTN)) {
    if (x < b.x - HUD_PAD || x > b.x + b.w + HUD_PAD) continue;
    if (id === 'wave' && !canCallWave(state)) return null;
    return id;
  }
  return null;
}

// One line, not two. At 24px deep there is room for a single row of 13px text,
// so the early-call bonus sits AFTER the label rather than under it — still in
// green, so it reads as a reward and not as part of the button's name.
//
// Disabled is the whole plate at 45%, the same as the menu buttons, rather than a
// second drawing. One file per control is the rule for this folder.
// A pair of bars, or a triangle. Drawn rather than written, because "||" and a
// play arrow are not characters every phone has at the same weight — the two
// bars come out as a broken vertical bar on some Android builds, and a triangle
// is an emoji on others.
//
// The button shows the ACTION, not the state: running, it offers a pause; paused,
// it offers a play. That is the convention every transport control uses, and the
// alternative reads as a status light nobody can press.
function transportGlyph(ctx, b, paused, ink) {
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  ctx.fillStyle = ink;

  if (paused) {
    const r = 6;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.6, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx - r * 0.6, cy + r);
    ctx.closePath();
    ctx.fill();
    return;
  }

  const w = 3.5, h = 12, gap = 3.5;
  ctx.fillRect(cx - gap / 2 - w, cy - h / 2, w, h);
  ctx.fillRect(cx + gap / 2, cy - h / 2, w, h);
}

function hudButton(ctx, b, label, sub, on) {
  ctx.save();
  if (!on) ctx.globalAlpha = 0.45;

  const drawn = drawPlate(ctx, b.art, b);
  if (!drawn) {
    // Vector fallback: the dark translucent plate this replaced.
    ctx.fillStyle = 'rgba(28,32,24,0.62)';
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(240,230,210,0.75)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // BOTH text properties, set here rather than inherited. This is the one that
  // bit: the buttons used to sit inside drawHud's save/restore and picked up its
  // textBaseline = 'middle' for free, and when that restore moved above them —
  // so a drop shadow meant for text on grass would stop before these plates —
  // they started inheriting whatever the previous frame happened to leave.
  //
  // Usually that was 'middle' and nothing looked wrong. But ROTATING A PHONE
  // resizes the canvas, and assigning canvas.width RESETS the whole 2D context,
  // including textBaseline, back to 'alphabetic'. So the labels dropped half a
  // line inside their plates after a rotation and stayed there until something
  // else set 'middle' and left it. That is why it was intermittent.
  //
  // The rule this file follows now: anything that draws text sets its own align
  // and baseline. Inheriting canvas state across functions is how a change in
  // one place moves the pixels in another.
  // A button with no words is a button with a picture on it, and the caller
  // draws that itself — see the pause control in drawHud.
  if (label === null) { ctx.restore(); return drawn; }

  const mid = b.y + b.h / 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '700 13px system-ui, sans-serif';
  const lw = ctx.measureText(label).width;
  ctx.font = '600 12px system-ui, sans-serif';
  const sw = sub ? ctx.measureText(sub).width + 5 : 0;

  const x = b.x + (b.w - lw - sw) / 2;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillStyle = drawn ? INK : '#F0E6D2';
  ctx.fillText(label, x, mid);

  if (sub) {
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillStyle = drawn ? INK_GREEN : '#9BE08A';
    ctx.fillText(sub, x + lw + 5, mid);
  }

  ctx.restore();
  return drawn;
}

// Ink for text sitting on a CREAM plate. The dashboard and the info box used to
// be dark translucent panels with pale text; the drawn plates are pale, so every
// colour on them inverted. Kept together here because they are one decision —
// if a plate is ever redrawn dark, these all change at once.
const INK = '#3A3026';
const INK_GREEN = '#2F6B27';
const INK_AMBER = '#8A6A12';
const INK_RED = '#A83A2C';

// A plate drawn to an exact rect rather than fitted to a box. Returns false if
// the art has not loaded, so the caller can fall back to the vector it replaced.
//
// The rect is safe to stretch to because it was DERIVED from this trim's aspect
// — see HUD_BTN and INFO_BOX. If a plate is redrawn at a different shape its slot
// changes with it and nothing is squashed.
function drawPlate(ctx, key, b) {
  const img = key && art[key];
  if (!img) return false;
  const [sx, sy, sw, sh] = ui[key].trim;
  ctx.drawImage(img, sx, sy, sw, sh, b.x, b.y, b.w, b.h);
  return true;
}

// HUD icons. These are the one kind of artwork NOT sized by the shared SCALE,
// and correctly so: an icon's job is to sit beside a number and be read, so it
// is sized to the text, not to how big a coin is next to a soldier. 24px against
// a 20px font puts its cap height on the digits' cap height.
//
// Trims measured from the alpha the same as everything else. The aspect comes
// out of them rather than being assumed, so a redrawn icon that is a different
// shape still lands on its baseline instead of being squashed to fit.
// Draws a piece of UI art centred on (x, y), at the box data/ui.js gives it.
// Returns false if the image is not loaded, so every caller can fall back to the
// vector it replaced rather than leaving a hole.
function drawUi(ctx, key, x, y, box, anchor = HALF) {
  const img = art[key];
  if (!img) return false;
  const [sx, sy, sw, sh] = ui[key].trim;
  const { w, h } = uiSize(key, box);
  ctx.drawImage(img, sx, sy, sw, sh, x - anchor[0] * w, y - anchor[1] * h, w, h);
  return true;
}

// Centred, which is what every piece of UI wants except the rally flag — that
// one is planted, so it hangs off its pole foot.
const HALF = [0.5, 0.5];
const ZERO = [0, 0];

// Draws a HUD icon and returns the x to carry on from. Falls back to the old
// word if the image is missing, so a failed load leaves a readable dashboard
// rather than a bare number.
function hudIcon(ctx, key, x, word) {
  if (!art[key]) {
    ctx.fillText(word, x, 21);
    return x + ctx.measureText(word).width + 7;
  }
  const { w } = uiSize(key);
  drawUi(ctx, key, x + w / 2, 21);
  return x + w + 7;
}

function statValue(ctx, x, value) {
  const text = String(value);
  ctx.fillText(text, x, 21);
  return x + ctx.measureText(text).width;
}

function drawHud(ctx, state) {
  // The map artwork paints its own header strip across the top, 50px deep, so
  // the HUD does not paint one. Drawing both left a seam: the translucent bar
  // stopped at 40 and the painted strip carried on to 50 in a warmer brown.
  //
  // Still drawn when the map is missing, because then the text would be sitting
  // on the flat-green fallback with nothing behind it.
  if (!art[level.art]) {
    ctx.fillStyle = 'rgba(34,32,28,0.75)';
    ctx.fillRect(0, 0, 960, 40);
  }

  // A drop shadow, not decoration. Two things sit behind this text and neither
  // is under our control: the artist's header strip, whose colour changes when
  // the map is redrawn, and the top of any tower built on a high plot, because
  // the HUD draws after the towers. The shadow means neither can make a number
  // unreadable. tools/hud-clear.mjs checks the second case has not got silly.
  ctx.save();
  ctx.shadowColor = 'rgba(12,14,10,0.85)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;

  ctx.fillStyle = '#F0E6D2';
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Icons where the words used to be. "Wave" keeps its label: a count of eight
  // has no picture that reads faster than the word, and inventing one would be
  // a puzzle rather than a shortcut.
  let x = 16;
  x = statValue(ctx, hudIcon(ctx, 'hud_gold', x, 'Gold'), state.gold);
  x = statValue(ctx, hudIcon(ctx, 'hud_life', x + 26, 'Lives'), state.lives);
  ctx.fillText(`Wave ${Math.min(state.waveIndex + 1, waves.length)} / ${waves.length}`, x + 26, 21);

  // The shadow ends here. It exists because the readouts sit straight on grass
  // and road with nothing behind them; the two controls have a cream plate behind
  // them now, and a drop shadow on dark text on a pale plate is a dirty halo
  // rather than legibility. Restore BEFORE the buttons, not after.
  ctx.restore();

  // The "Tap a plot to build" hint is gone. It said the same thing on every
  // frame of every game and this is where the controls live now.
  const call = canCallWave(state);
  const plated = hudButton(ctx, HUD_BTN.pause, null, null, true);
  transportGlyph(ctx, HUD_BTN.pause, state.paused, plated ? INK : '#F0E6D2');

  // A word, because a paused game now refuses every tap except the one that
  // restarts it. Without a reason on screen, a plot that will not open its menu
  // reads as the game having hung — the changed glyph is 12px of detail in a
  // corner and nobody looks at it while they are jabbing at a tower.
  //
  // No dimming veil over the board, which is the usual way to say this: the
  // whole point of pausing here is to study the board, and a game that greys out
  // the thing you paused to look at has answered the wrong question. A label
  // under the dashboard says it and hides nothing.
  if (state.paused) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(24,28,20,0.55)';
    ctx.strokeText('Paused', 480, 78);
    ctx.fillStyle = '#F0E6D2';
    ctx.fillText('Paused', 480, 78);
    ctx.restore();
  }

  hudButton(ctx, HUD_BTN.speed, state.speed === 2 ? '2x' : '1x', null, true);
  hudButton(ctx, HUD_BTN.wave, 'Next wave',
    call ? `+${earlyCallBonus(state)}g` : null, call);
}

function drawMenu(ctx, state) {
  const menu = state.menu;
  if (!menu) return;

  const clamped = menu.cx !== menu.plot.x || menu.cy !== menu.plot.y;

  // Leader first, so the ring and buttons draw over it.
  if (clamped) {
    ctx.strokeStyle = 'rgba(240,230,210,0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(menu.plot.x, menu.plot.y);
    ctx.lineTo(menu.cx, menu.cy);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Marks which plot the menu will act on. A clamped menu puts a button on top
  // of the plot, so use a small dot there instead of the full ring.
  ctx.strokeStyle = '#F0E6D2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (clamped) ctx.arc(menu.plot.x, menu.plot.y, 5, 0, Math.PI * 2);
  else ctx.arc(menu.plot.x, menu.plot.y, PLOT_R, 0, Math.PI * 2);
  ctx.stroke();

  drawCancel(ctx, menu);
  for (const it of menu.items) drawButton(ctx, state, it);
}

function drawCancel(ctx, menu) {
  if (drawUi(ctx, 'btn_cancel', menu.cx, menu.cy)) return;

  ctx.fillStyle = 'rgba(34,32,28,0.7)';
  ctx.beginPath();
  ctx.arc(menu.cx, menu.cy, CANCEL_R, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#8A8478';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(menu.cx - 5, menu.cy - 5);
  ctx.lineTo(menu.cx + 5, menu.cy + 5);
  ctx.moveTo(menu.cx + 5, menu.cy - 5);
  ctx.lineTo(menu.cx - 5, menu.cy + 5);
  ctx.stroke();
}

// A menu button: a plate, a picture, and a price. NO WORDS.
//
// The names came out — "Barracks", "Sell", "Upgrade", the "T1" in front of every
// cost. What is left is the glyph and the gold, which is the whole decision: a
// button says what it builds by showing it and what it costs by saying it. The
// text that remains is the one part a picture cannot carry.
//
// The picture takes the room the words used to. A button with a price gets a 26px
// glyph above it; a button with nothing to say — rally, and a tower already at
// tier 3 — centres a 32px one instead.
//
// Disabled is one draw at 45% rather than a second set of files. That is what
// keeps this folder at nine PNGs instead of eighteen.
function drawButton(ctx, state, it) {
  const on = canUse(state, it);
  const caption = it.gain !== null ? `+${it.gain}g`
                : it.cost !== null ? `${it.cost}g`
                : '';

  ctx.save();
  ctx.globalAlpha = on ? 1 : 0.45;

  if (!drawUi(ctx, 'btn_plate', it.x, it.y)) {
    ctx.fillStyle = 'rgba(34,32,28,0.94)';
    ctx.beginPath();
    ctx.arc(it.x, it.y, BTN_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#C4A574';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  const gy = caption ? it.y - 7 : it.y;
  const box = caption ? GLYPH_BOX : GLYPH_BOX_BARE;
  const key = GLYPH_ART[it.glyph];
  // Optical centring, per glyph. Only the flag needs it — see data/ui.js.
  const nudge = (key && ui[key].nudge) || ZERO;

  if (!key || !drawUi(ctx, key, it.x + nudge[0], gy + nudge[1], ui[key] && ui[key].fit)) {
    // Siege, the monastery and the `max` chevrons have no drawing yet. The
    // vector is scaled to the same box so a mixed ring does not look like two
    // different sets of icons, and it is drawn dark because the plate is cream.
    ctx.save();
    ctx.translate(it.x, gy);
    ctx.scale(box / 22, box / 22);
    ctx.strokeStyle = ctx.fillStyle = '#3A3026';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawGlyph(ctx, it.glyph);
    ctx.restore();
  }

  if (caption) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Dark on the cream plate, and green when it is gold coming back to you.
    ctx.fillStyle = it.gain !== null ? '#2F6B27' : '#3A3026';
    // 10px. The glyphs grew when the labels came out, and the price is the
    // smaller half of the button's job — what it IS reads first, what it costs
    // second. 12 -> 11 -> 10 over two passes, each time to give the glyph more
    // of the disc.
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.fillText(caption, it.x, it.y + 16);
    ctx.textAlign = 'left';
  }

  ctx.restore();
}

// Vector glyphs, now the FALLBACK rather than the design. Five of the eight have
// drawings in assets/ui and go through drawUi; these are what siege, the
// monastery and a maxed-out tower still use, plus what every button falls back to
// if its PNG fails to load. Each draws centred on the origin in a 22px box, and
// drawButton scales that to whatever box the drawn glyphs are using.
//
// The label-shrinking helper that used to live here went with the labels. Buttons
// carry a glyph and a price now, and a price cannot get long enough to need it.
function drawGlyph(ctx, kind) {
  ctx.beginPath();

  if (kind === 'bow') {
    ctx.arc(-3, 0, 9, -Math.PI / 2.2, Math.PI / 2.2);
    ctx.moveTo(3, -8); ctx.lineTo(3, 8);
    ctx.moveTo(-6, 0); ctx.lineTo(9, 0);
    ctx.stroke();
  } else if (kind === 'swords') {
    ctx.moveTo(-8, 8); ctx.lineTo(7, -8);
    ctx.moveTo(8, 8); ctx.lineTo(-7, -8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-9, 3); ctx.lineTo(-3, 9);
    ctx.moveTo(9, 3); ctx.lineTo(3, 9);
    ctx.stroke();
  } else if (kind === 'catapult') {
    ctx.moveTo(-9, 8); ctx.lineTo(0, -2); ctx.lineTo(9, 8);
    ctx.moveTo(-5, 3); ctx.lineTo(5, 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -2); ctx.lineTo(8, -8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(9, -9, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'cross') {
    ctx.moveTo(0, -9); ctx.lineTo(0, 9);
    ctx.moveTo(-6, -3); ctx.lineTo(6, -3);
    ctx.stroke();
  } else if (kind === 'up') {
    ctx.moveTo(-7, 2); ctx.lineTo(0, -6); ctx.lineTo(7, 2);
    ctx.moveTo(-7, 9); ctx.lineTo(0, 1); ctx.lineTo(7, 9);
    ctx.stroke();
  } else if (kind === 'max') {
    ctx.moveTo(-8, -6); ctx.lineTo(8, -6);
    ctx.moveTo(-7, 2); ctx.lineTo(0, -5); ctx.lineTo(7, 2);
    ctx.moveTo(-7, 9); ctx.lineTo(0, 2); ctx.lineTo(7, 9);
    ctx.stroke();
  } else if (kind === 'flag') {
    ctx.moveTo(-5, 9); ctx.lineTo(-5, -9);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5, -9); ctx.lineTo(8, -5); ctx.lineTo(-5, -1);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'coin') {
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// The info box: who you have selected, and how they are doing.
//
// TOP right, with the dashboard controls centred to its left. What it shows comes
// from selectionInfo() in select.js; health is read off the live object every
// frame, so a soldier's bar and this number are the same fact twice.
//
// Same rule as the dashboard plates: the HEIGHT is chosen — 76 holds a title and
// two stat rows beside a 56px portrait — and the WIDTH comes from the drawing's
// own proportions. 678x234 at 76 tall is 220.
const INFO_H = 76;
const INFO_W = Math.round(INFO_H * aspect('plate_info'));
export const INFO_BOX = { x: 960 - INFO_W - 12, y: 9, w: INFO_W, h: INFO_H, art: 'plate_info' };

// The portrait slot, sized to the BIGGEST figure rather than the other way
// round. Every portrait is drawn at PORTRAIT_SCALE * SCALE — one factor, so a
// Giant Thug is genuinely bigger than a Thug — and the largest of them is the
// heavy at 186 x 162 source, which lands at 61 x 53. 64 x 56 holds it.
const PORTRAIT = { w: 64, h: 56 };

function drawInfo(ctx, state) {
  const info = selectionInfo(state);
  if (!info) return;

  const { x, y, w, h } = INFO_BOX;
  const drawn = drawPlate(ctx, INFO_BOX.art, INFO_BOX);

  if (!drawn) {
    ctx.fillStyle = 'rgba(28,32,24,0.82)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 9);
    ctx.fill();
    ctx.strokeStyle = 'rgba(240,230,210,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // The figure, at the shared portrait scale rather than fitted to the slot.
  // Drawn from its own sprite trim, so a re-export moves the portrait with the
  // board art and there is no second set of pictures to keep in step.
  const img = info.sprite && art[info.sprite];
  if (img && info.trim) {
    const [sx, sy, sw, sh] = info.trim;
    const dw = sw * SCALE * PORTRAIT_SCALE;
    const dh = sh * SCALE * PORTRAIT_SCALE;
    ctx.drawImage(img, sx, sy, sw, sh,
      x + 12 + (PORTRAIT.w - dw) / 2,
      y + h / 2 - dh / 2,
      dw, dh);
  }

  const tx = x + 12 + PORTRAIT.w + 10;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // The whole block is CENTRED in the panel rather than hung from the top, so a
  // tower's two lines and a figure's three both sit in the middle of the plate
  // instead of the last row crowding the bottom edge. That is why the number of
  // rows is counted before anything is drawn.
  const rows = info.hp !== null ? 2 : 1;
  const top = y + (h - (TITLE_BAND + rows * ROW_PITCH)) / 2;

  ctx.fillStyle = drawn ? INK : '#F0E6D2';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText(info.title, tx, top + TITLE_BAND / 2);

  // The rows are ICONS, not the words "Health:" and "Damage:". Both sit in a
  // column STAT_COL wide so the numbers beside them line up whether the row
  // above is there or not — a tower has no health row, and a damage figure that
  // shifted left on towers and right on units would read as two layouts.
  ctx.font = '700 12px system-ui, sans-serif';
  let ty = top + TITLE_BAND + ROW_PITCH / 2;

  if (info.hp !== null) {
    drawUi(ctx, 'stat_health', tx + STAT_COL / 2, ty, { h: STAT_ICON_H });
    // Reddens as it drops, on the same thresholds as the health bars over their
    // heads, so the two readings agree at a glance.
    const frac = info.maxHp ? info.hp / info.maxHp : 1;
    ctx.fillStyle = !drawn ? '#F0E6D2'
                  : frac > 0.5 ? INK_GREEN : frac > 0.25 ? INK_AMBER : INK_RED;
    ctx.fillText(`${info.hp}/${info.maxHp}`, tx + STAT_COL + 6, ty);
    ty += ROW_PITCH;
  }

  drawUi(ctx, 'stat_damage', tx + STAT_COL / 2, ty, { h: STAT_ICON_H });
  ctx.fillStyle = drawn ? INK : '#F0E6D2';
  ctx.fillText(String(info.damage), tx + STAT_COL + 6, ty);
}

// How much vertical room the title takes, and the pitch between stat rows. 20 is
// a 16px icon with 4 of air, which is the tightest the two hearts and swords can
// sit without touching.
const TITLE_BAND = 22;
const ROW_PITCH = 20;

// The title screen, and the reason it exists.
//
// The game used to be live the instant the page finished loading: state.timer
// started at openingDelay and ticked down from that first frame. That timer is
// also what the early-call bonus is worth — 14 seconds at earlyCallRate 4 — so a
// player who spent ten seconds looking at the board had already lost 40 of the 56
// gold they could have claimed, without touching anything or being told. Nothing
// on screen said it was running.
//
// So nothing runs until this is dismissed. main.js skips the whole step while
// state.started is false, which means the wave timer, the bonus, the spawns and
// the clock are all held, not just hidden.
export const START_BTN = { x: 400, y: 344, w: 160, h: 54 };

// One button per level, side by side above Start. Sized for a thumb like
// everything else — 150 x 46 is well over the 44px minimum — and laid out from
// the middle so a third map would not need the numbers re-typed.
const MAP_BTN_W = 150, MAP_BTN_H = 46, MAP_GAP = 16;

export function mapButtons() {
  const n = levels.length;
  const total = n * MAP_BTN_W + (n - 1) * MAP_GAP;
  return levels.map((l, i) => ({
    i,
    name: l.name,
    x: Math.round(480 - total / 2 + i * (MAP_BTN_W + MAP_GAP)),
    y: 272,
    w: MAP_BTN_W,
    h: MAP_BTN_H
  }));
}

// Which map button is under a tap, or null. Only meaningful on the title
// screen; input.js asks before it asks about Start.
export function hitMapButton(state, x, y) {
  for (const b of mapButtons()) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.i;
  }
  return null;
}

// Generous on a thumb without being a whole-screen tap: a mis-tap on the board
// should do nothing rather than start a game you were not ready for.
const START_PAD = 16;

export function hitStart(state, x, y) {
  if (state.started) return false;
  const b = START_BTN;
  return x >= b.x - START_PAD && x <= b.x + b.w + START_PAD &&
         y >= b.y - START_PAD && y <= b.y + b.h + START_PAD;
}

function drawStart(ctx, state) {
  ctx.fillStyle = 'rgba(34,32,28,0.72)';
  ctx.fillRect(0, 0, 960, 540);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F0E6D2';
  ctx.font = '700 46px system-ui, sans-serif';
  ctx.fillText('Medieval TD', 480, 214);

  ctx.font = '17px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(240,230,210,0.72)';
  ctx.fillText('Nothing moves until you begin. Tap a plot to build.', 480, 252);

  // The board behind this overlay is already the chosen map, so picking one is
  // its own preview: the roads and the plots change under the panel as you tap.
  for (const m of mapButtons()) {
    const on = m.i === (state.levelIndex ?? 0);
    ctx.fillStyle = on ? 'rgba(196,165,116,0.92)' : 'rgba(28,32,24,0.85)';
    ctx.beginPath();
    ctx.roundRect(m.x, m.y, m.w, m.h, 9);
    ctx.fill();
    ctx.strokeStyle = on ? '#F0E6D2' : 'rgba(196,165,116,0.55)';
    ctx.lineWidth = on ? 2.5 : 1.5;
    ctx.stroke();

    ctx.fillStyle = on ? '#241F17' : 'rgba(240,230,210,0.75)';
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillText(m.name, m.x + m.w / 2, m.y + m.h / 2 + 1);
  }

  const b = START_BTN;
  ctx.fillStyle = 'rgba(28,32,24,0.85)';
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 10);
  ctx.fill();
  ctx.strokeStyle = '#C4A574';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = '#F0E6D2';
  ctx.font = '700 24px system-ui, sans-serif';
  ctx.fillText('Start', b.x + b.w / 2, b.y + b.h / 2 + 1);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
}

function drawResult(ctx, state) {
  ctx.fillStyle = 'rgba(34,32,28,0.82)';
  ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = '#F0E6D2';
  ctx.font = '700 52px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.result === 'won' ? 'Waves cleared' : 'The keep has fallen', 480, 250);
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Tap to play again', 480, 306);
  ctx.textAlign = 'left';
}

export { PLOT_R };
