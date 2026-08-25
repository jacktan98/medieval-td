import { level, levels } from './level.js';
import { DIFFICULTIES } from './data/difficulty.js';
import { canCallWave, earlyCallBonus, upcomingWave } from './waves.js';
import { SCALE, EXPORT_PX, BLOOD_SCALE } from './data/towers.js';
import { CORPSE_FADE, knockbackOffset, settled } from './corpses.js';
import { SPLAT_FADE } from './blood.js';
import { IMPACT_TRIM, IMPACT_SCALE, IMPACT_FADE, IMPACT_LIE } from './impacts.js';
import { art } from './assets.js';
import { towerBox, mountPoint, muzzlePoint, facing, mirror, frameOf, buildingFlip, rangeOf, auras,
         machineBox, machineFlip, crownTop } from './towers.js';
import { BTN_R, CANCEL_R, canUse } from './menu.js';
import { ringPath, clampToRange, SQUASH } from './ground.js';
import { ui, uiSize, aspect, GLYPH_ART, GLYPH_BOX, GLYPH_BOX_BARE, RALLY_FLAG_H, FLAG_FOOT,
         INFO_SCALE, INFO_PORTRAIT, STAT_COL, BOOK_ICON_H } from './data/ui.js';
import { selectionInfo, shownDamage, shownRange } from './select.js';
import { PAGES, shelf, shelfRect, enemyCards, abilityCards, towerEntry, unitEntry,
         abilityEntry, figureSlot, ABILITY_ICON, ICON_BOX,
         SHEET, FOLD, PAGE_X, popSlot, TITLE_Y, HEAD_Y, FOOT_Y, TOWER_BOX, FIGURE_BOX, rowsIn,
         BOOK_CLOSE, BOOK_PREV, BOOK_NEXT,
         BOOK_BTN_START } from './book.js';
import { MAX_STARS, bestStars, starCuts } from './score.js';
import { SMOKE_TRIM, SMOKE_LIFE } from './smoke.js';
import { PIN, ADMIN_BTN, PANEL as ADMIN_PANEL, TITLE_Y as ADMIN_TITLE_Y, TABS as ADMIN_TABS,
         CLOSE_BTN as ADMIN_CLOSE, RESET_BTN, PREV_BTN, NEXT_BTN, mapTabs, waveTabs,
         groupRows, unitRows, unitPages, stepper, goldStepper, adminGold, keys,
         PIN_DOTS, PIN_CANCEL,
         waveCount, shipped, touched, statStep, COLS } from './admin.js';
import { enemyTypes, MODES } from './data/waves.js';

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
  // And the mark Deadeye paints, above even those: it is a warning, and a warning
  // that can be stood in front of is not one.
  drawMarks(ctx, state);
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

  // Over even those. The encyclopedia is opened FROM the title screen and from a
  // paused game, so it has to cover the thing that offered it — and while it is
  // up it owns every tap on the board, which is the other half of the same fact.
  if (state.book !== null) drawBook(ctx, state);

  // And the dashboard over everything, on the same terms: it is opened from the
  // title screen, it covers the board, and it owns every tap while it is up.
  if (state.admin) drawAdmin(ctx, state);
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
  // A tower draws the figures it is standing in front of straight back over
  // itself, at half alpha — see ghostBehind. It happens HERE, inside the pass and
  // immediately after the building, rather than afterwards: anything nearer the
  // camera than this tower is drawn later and covers the ghost, which is what
  // stops a man walking in front of a barracks from having a thug show through
  // him.
  for (const t of state.towers) add(t.y, 1, () => { drawTower(ctx, t); ghostBehind(ctx, state, t); });
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
  // A rock's earth sorts in this pass too, and for the same reason the spatter
  // does: it belongs to a place on the board. Its `y` IS its ground line — a
  // lobbed rock's landing point is on the ground by construction, which is what
  // the parabola's zero lift at u = 1 buys — so there is no second anchor here.
  //
  // BUT THE TWO KINDS SIT AT DIFFERENT RANKS, and it is the same distinction
  // IMPACT_LIE already draws. Earth is thrown UP in front of the impact, so at
  // equal depth it belongs over the figures standing there — rank 2, beside the
  // blood. A spill LIES on the road for four seconds and men stand IN it, so it
  // goes under them at rank 0, beside the corpses: a puddle painted over a
  // soldier's boots and his shadow reads as a sticker rather than as ground.
  //
  // AND A SPILL SORTS BY ITS TOP EDGE, not by its middle. This is what the rank
  // alone did not fix: the patch is 24px deep and centred on where the flask
  // broke, so a man standing in the NEAR half of it has feet at a smaller y than
  // its centre — he drew first and the puddle went over him. Sorted by the top
  // of the patch, everybody whose feet are anywhere inside it draws afterwards,
  // which is what "standing in it" should look like from either side.
  //
  // Only the spill needs it: earth is meant to be in front of things, and every
  // other flat mark on the board is small enough that its middle and its top are
  // the same answer.
  for (const i of state.impacts) {
    const lies = IMPACT_LIE[i.img];
    add(lies ? i.y - impactHeight(i) / 2 : i.y, lies ? 0 : 2, () => drawImpact(ctx, i));
  }
  // The dust over a plot something was just built on, and it sorts in this pass
  // like everything else rather than being painted on top afterwards.
  //
  // RANK 3, the highest there is, so at its own depth it is drawn after the
  // building it is hiding — which is the whole job. Anything NEARER the camera
  // still draws over it, because a soldier standing in front of a plot is in
  // front of the dust too. Painting it after the pass would have put it over that
  // soldier, which is the mistake the blood spatter made before it moved in here.
  for (const p of state.smoke || []) {
    add(p.y, 3, () => drawSmoke(ctx, p));
  }

  items.sort((a, b) => a.y - b.y || a.rank - b.rank);
  for (const it of items) it.run();
}

function drawTower(ctx, t) {
  const box = towerBox(t);

  // A BUILDING THAT MIRRORS. Only artillery does, and it is the one exception to
  // the rule that buildings never flip — a catapult that always throws the same
  // way reads as a machine pointing away from the enemy, which is worse than the
  // perspective cost of flipping an isometric drawing. See buildingFlip in
  // towers.js for which direction, and when.
  //
  // Mirrored about t.x, the point the machine STANDS on, not about the middle of
  // its box. The two are not the same — the ground shadow sits at 0.582 across
  // rather than 0.5 — and mirroring about the box centre would slide the machine
  // 8px sideways off its own plot every time it turned.
  const flip = buildingFlip(t);
  if (flip < 0) {
    ctx.save();
    ctx.translate(t.x, 0);
    ctx.scale(-1, 1);
    ctx.translate(-t.x, 0);
  }

  drawBuilding(ctx, t, box);
  if (t.def.gunner) drawGunner(ctx, t);
  // THE MACHINE ON TOP OF A TURRET, between the stone and the stone's front
  // layer — exactly where a gunner goes, and for the same reason: it stands on
  // the deck, so the near merlon is in front of it and everything else is
  // behind. See `ballista` in data/towers.js for why tier 4 is two drawings.
  if (t.def.machine) drawMachine(ctx, t, box);
  drawBuildingFront(ctx, t, box);

  if (flip < 0) ctx.restore();

  // Above everything the building draws, including its front layer — the marks
  // are information, and the same rule that puts health bars over the figures
  // they belong to applies. OUTSIDE the mirror, and centred on t.x rather than
  // on the box, so a machine turning round does not swing its own stars about.
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
  drawBadges(ctx, state);
}

// --- what an aura is doing, over the towers it is doing it to --------------------
//
// THE BADGE IS THE WHOLE FEEDBACK. Every other ability in this game announces
// itself where it happens — a burst of three, a kneeling paladin, a burning bolt,
// a machine rebuilt in iron. The Judgement Temple's two do their work on OTHER
// towers and change nothing about themselves or about the shots, so without a
// mark on the board the player has spent 150 gold on a number they have to take
// on trust. A sword and an arrow over every tower hitting harder, a heart and an
// arrow over every barracks whose men are tougher.
//
// DRAWN WITH THE STATUS PASS rather than with the buildings, and for the same
// reason the health bars are: a badge that a tower standing in front could hide
// is a badge the player cannot rely on. It is under the Deadeye mark, which is a
// warning and outranks it.
//
// CLEAR AIR between the top of the DRAWING and the bottom of the badge, which is
// why the badge hangs from its own bottom edge rather than its middle. Anchored
// at the middle, half of it is inside the roof and how much of it shows depends
// on how tall the badge drawing happens to be; anchored at the bottom, this
// number is the gap, and it stays the gap if the artist redraws either one.
//
// MEASURED FROM crownTop RATHER THAN FROM THE BUILDING. A monastery's roof is the
// top of that tower, but a Ballista Turret is a squat base with a machine sitting
// on it and an archery deck has a man standing a head above it — measured off the
// stone, the badge would sit in the middle of the ballista. See crownTop in
// towers.js, which is the whole drawing including whoever is on top of it.
//
// The towers run 108 to 165px tall before their crew, so the badges sit at a
// different height on every plot and that is correct — a badge belongs to the
// tower it is over, not to a line across the board.
const BADGE_GAP = 10;

// AND IT NEVER LEAVES THE BOARD. A Judgement Temple is the tallest building in
// the game, and on the highest plots of all three maps its roof is within 30px of
// the top edge — badge, gap and all would be off the canvas, which draws a badge
// sliced in half or not at all. On those plots the badge stops here and rests on
// the roof instead, because a badge touching a roof is a badge you can read.
const BADGE_TOP_MIN = 2;

// Hangs the badge above the point given rather than centring it on it.
const ABOVE = [0.5, 1];

// THE MULTIPLIER BESIDE THE BADGE, when more than one temple is buffing this
// tower. The badge says "something is boosting you" and stops being the whole
// truth the moment a second temple buys the same ability, because two Holy
// Wraths are not one — see `auras` in towers.js, where they compound. So the
// badge stays one drawing and takes a count: x2 for two temples, x3 for three.
//
// It is the NUMBER OF SOURCES rather than the multiplier itself. "x2" for two
// temples reads immediately; the multiplier they actually make is 1.21, and a
// badge captioned x1.21 would be a number the player has to do arithmetic on.
const MULT_FONT = '700 11px system-ui, sans-serif';
const MULT_GAP = 2;

// Cream on the same black the badges are outlined in, which is what makes it
// read over grass, road and stone alike — the board has no one background to
// pick a single ink against.
const MULT_INK = '#F4ECD8';
const MULT_EDGE = '#241E17';

// The topmost ink a badge puts over a tower whose drawing tops out at `crown`,
// for anything that needs to know what is above a roof — tools/hud-clear.mjs,
// which counts the tier stars and the muster rings on the same terms.
//
// The TALLEST badge rather than the one this tower would wear: which badge a plot
// ends up carrying depends on what the player buys, so the headroom has to be
// there for either. And it applies to EVERY family, unlike the stars and the
// rings — an aura works on whole families, so any building on the board can end
// up under one.
export function badgeTop(crown) {
  const h = Math.max(uiSize('badge_wrath').h, uiSize('badge_fortitude').h);
  return Math.max(crown - BADGE_GAP - h, BADGE_TOP_MIN);
}

function drawBadges(ctx, state) {
  const on = auras(state);
  if (!on.length) return;

  ctx.save();
  ctx.font = MULT_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = MULT_EDGE;

  for (const t of state.towers) {
    // ONE BADGE PER ABILITY, however many temples paid for it, with the count
    // beside it. Two identical drawings stacked on each other would read as a
    // rendering bug rather than as twice the buff.
    //
    // At most one badge per tower today, since the two `on` lists are disjoint: a
    // shooting tower or a barracks. They are drawn side by side rather than on top
    // of each other so that a third aura which overlapped would look crowded
    // instead of looking broken.
    const mine = [];
    for (const a of on) {
      if (!a.aura.badge || !a.aura.on.includes(t.fam.id)) continue;
      const seen = mine.find(b => b.a.aura.badge === a.aura.badge);
      if (seen) seen.n++;
      else mine.push({ a, n: 1 });
    }
    if (!mine.length) continue;

    // Laid out left to right and centred on the tower as one group, so a badge
    // that grows a "x2" does not shove itself off the middle of its own roof.
    const parts = mine.map(({ a, n }) => {
      const { w, h } = uiSize(a.aura.badge);
      const label = n > 1 ? `x${n}` : '';
      return { a, w, h, label, lw: label ? MULT_GAP + ctx.measureText(label).width : 0 };
    });
    const total = parts.reduce((s, p) => s + p.w + p.lw, 0) + (parts.length - 1) * 3;

    // The bottom edge of the row, which is where the badges hang from — and the
    // tallest of them is what the floor is measured against, so a row of two
    // different heights still sits on the board whichever is taller.
    const tall = Math.max(...parts.map(p => p.h));
    const y = Math.max(crownTop(t) - BADGE_GAP, BADGE_TOP_MIN + tall);

    let x = t.x - total / 2;
    for (const p of parts) {
      drawUi(ctx, p.a.aura.badge, x + p.w / 2, y, undefined, ABOVE);
      x += p.w;
      if (p.label) {
        // Beside the badge and level with its middle, rather than under it: the
        // badge already ends where the roof begins, and a caption below it would
        // be inside the building.
        ctx.strokeText(p.label, x + MULT_GAP, y - p.h / 2);
        ctx.fillStyle = MULT_INK;
        ctx.fillText(p.label, x + MULT_GAP, y - p.h / 2);
        x += p.lw;
      }
      x += 3;
    }
  }

  ctx.restore();
}

// --- the mark Deadeye paints --------------------------------------------------
//
// The crosshair over the head of the man a Musketeer Post has chosen. It goes up
// a second before the heavy ball is fired and comes down when the ball lands —
// see `lock` in data/abilities.js for why the hardest blow in the game announces
// itself, and the wind-up in src/towers.js for how the choice is made once and
// then held.
//
// TWO SOURCES, ONE MARK, and they hand over cleanly. While the tower is winding
// up, `t.locked` is the man; the instant the shot leaves, the lock is dropped and
// the SHOT carries the mark instead. So the crosshair never blinks between the two
// halves, and it needs no lifetime of its own: a shot that lands is a shot off
// state.shots, and the mark goes with it.
const MARK_TRIM = [211, 211, 90, 90];
const MARK = Math.round(MARK_TRIM[2] * SCALE);

// How far the crosshair floats above the drawn top of the figure. 12 clears the
// health bar that sits at 4 above the head and is 4 deep, with room to spare, so
// the mark does not move when a man takes his first wound.
const MARK_LIFT = 12;

function drawMarks(ctx, state) {
  for (const t of state.towers) if (t.locked) mark(ctx, t.locked);
  for (const s of state.shots) {
    // A target that died or reached the keep while the ball was in the air is off
    // the board, and a crosshair left hanging where it used to be would read as
    // the mark having come loose.
    if (s.marked && s.target && s.target.hp > 0 && !s.target.leaked) mark(ctx, s.target);
  }
}

function mark(ctx, e) {
  const img = art.target_lock;
  const cy = e.y - artHeight(e.def) - MARK_LIFT - MARK / 2;

  if (!img) {
    // The vector fallback every drawn thing in this game has: a ring and a cross,
    // in the red the artwork uses, so a file that failed to load still warns.
    ctx.save();
    ctx.strokeStyle = '#D40000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(e.x, cy, MARK / 2 - 2, 0, Math.PI * 2);
    ctx.moveTo(e.x - MARK / 2, cy);
    ctx.lineTo(e.x + MARK / 2, cy);
    ctx.moveTo(e.x, cy - MARK / 2);
    ctx.lineTo(e.x, cy + MARK / 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const [sx, sy, sw, sh] = MARK_TRIM;
  ctx.drawImage(img, sx, sy, sw, sh, e.x - MARK / 2, cy - MARK / 2, MARK, MARK);
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
  // THROUGH rangeOf, not off the def, so the ring and the targeting cannot
  // disagree. Far Shot takes the Ballista Turret from 260 to 480 and this is the
  // drawing that has to say so — a tower shooting further than its own ring reads
  // as the ring being broken.
  const r = rangeOf(t);
  const next = t.fam.tiers[t.def.tier];

  // The reach the upgrade would buy, as a dotted ring outside the solid one.
  //
  // Shown whenever the menu is open, NOT on hover: there is no hover on a
  // phone, and this game is played with a thumb. Anything that only appears
  // under a mouse pointer is invisible to most of the people playing it, so the
  // trigger is "you are looking at this tower's menu" instead.
  //
  // Drawn first so the current range's rim stays the crisper of the two.
  if (next && next.range > r) {
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

  // ARTILLERY HAS A HOLE IN IT. A catapult cannot drop a rock on its own feet,
  // so the ground inside `minRange` is dead and anything walking through it is
  // safe. The fill is an ANNULUS rather than a disc, which is the only honest
  // picture: the pale wash means "this tower shoots here", and washing over the
  // dead zone would promise reach the tower does not have.
  //
  // Two ellipses in one path with an even-odd fill. Drawing the hole as a second
  // shape on top would need a colour that matches the ground under it, and the
  // ground is grass, road, dirt and other buildings depending on the plot.
  const min = t.def.minRange || 0;

  ctx.fillStyle = 'rgba(240,230,210,0.10)';
  ctx.beginPath();
  ctx.ellipse(t.x, t.y, r, r * SQUASH, 0, 0, Math.PI * 2);
  if (min) ctx.ellipse(t.x, t.y, min, min * SQUASH, 0, 0, Math.PI * 2);
  ctx.fill('evenodd');

  ctx.strokeStyle = 'rgba(24,26,20,0.40)';
  ctx.lineWidth = 3;
  ringPath(ctx, t.x, t.y, r, 3);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,247,228,0.72)';
  ctx.lineWidth = 2;
  ringPath(ctx, t.x, t.y, r);
  ctx.stroke();

  // The inner rim, dashed and warmer than the outer one. Dashed because it is a
  // limit rather than a reach — the same visual grammar the upgrade preview uses
  // — and warmer because the two rims mean opposite things and a player glancing
  // at a plot should not have to work out which ellipse is which.
  if (min) {
    ctx.save();
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = 'rgba(24,26,20,0.40)';
    ctx.lineWidth = 3;
    ringPath(ctx, t.x, t.y, min, 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,190,120,0.85)';
    ctx.lineWidth = 2;
    ringPath(ctx, t.x, t.y, min);
    ctx.stroke();
    ctx.restore();
  }
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
  const cx = t.x - (n - 1) * STAR_GAP / 2;

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
  //
  // EXCEPT ON A TURRET, where the beats belong to the machine standing on top
  // and the BUILDING is the stone underneath — one picture, never animated,
  // never mirrored. drawMachine draws the other half.
  const key = t.def.machine ? t.def.sprite : frameOf(t);
  const img = key && art[key];
  if (img) {
    const [sx, sy, sw, sh] = t.def.spriteTrim;
    ctx.drawImage(img, sx, sy, sw, sh, box.left, box.top, box.w, box.h);
    return;
  }
  if (t.def.shape === 'camp') drawCamp(ctx, t, box);
  else drawStoneTower(ctx, t, box);
}

// The machine a turret carries, drawn on its deck and mirrored to face its
// target — the only thing in the game that flips while the building under it
// stays put.
//
// MIRRORED ABOUT THE MIDDLE OF ITS OWN DRAWING rather than about the tower or
// about the post it stands on — see `axis` in machineBox for why that is the one
// line that keeps the machine centred on the roof both ways round.
function drawMachine(ctx, t, box) {
  const m = t.def.machine;
  const img = art[frameOf(t)];
  if (!img) return;

  const slot = machineBox(t.def, box);
  const [sx, sy, sw, sh] = m.trim;

  ctx.save();
  if (machineFlip(t) < 0) {
    ctx.translate(slot.axis, 0);
    ctx.scale(-1, 1);
    ctx.translate(-slot.axis, 0);
  }
  ctx.drawImage(img, sx, sy, sw, sh, slot.left, slot.top, slot.w, slot.h);
  ctx.restore();
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

  // The empty bow for as long as the recoil lasts, the nocked arrow the rest of
  // the time. One state drives both, which is the point: the kick backward and
  // the arrow leaving the string are the same event, so they cannot drift apart.
  // The empty barrel while the recoil lasts, and the whole time an ability is
  // holding him in place afterwards — `t.hold` is the second the artist asked a
  // special to stay up for. Deadeye brings a drawing of its own and hands it in as
  // the third argument; Burst Fire brings none, so the Attack pose is what stays
  // up, which is exactly what "use the Attack image" asked for.
  const held = t.hold > 0 && t.special ? t.special.pose : null;
  const [frame, trim, pivot] =
    pose(d.attack, t.recoil > 0 || t.hold > 0, img, d.gunnerTrim, d.gunnerPivot, held);

  const [sx, sy, sw, sh] = trim;
  const dw = sw * SCALE;
  const dh = sh * SCALE;

  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.scale(mirror(d, facing(t)), 1);
  ctx.translate(-t.recoil * 3, 0);   // kicks backward, opposite the shot
  ctx.drawImage(frame, sx, sy, sw, sh, -pivot[0] * dw, -pivot[1] * dh, dw, dh);
  ctx.restore();
}

// WHICH OF A FIGHTING MAN'S TWO DRAWINGS TO USE.
//
// Every archer and every soldier is a Default he stands, walks and is portrayed
// in, and an Attack he swings or looses in. This picks between them and hands
// back the three things a draw needs — the image, the window into it, and the
// anchor — because all three change together and using one pose's trim with
// another's pivot would put the man in the wrong place.
//
// The two poses are NOT unioned into one box the way an animated building's
// frames are; they do not need to be, because a figure is anchored on its own
// shadow and the artist draws that shadow at the same source pixel in both. See
// the trim block in data/towers.js.
//
// A def with no `attack` — every enemy, for now — falls through to its Default
// and nothing else changes, so a family can get its second drawing whenever the
// artist gets to it.
// `special` is a THIRD drawing, and it wins over both. An ability that carries a
// pose — Deadeye, Holy Light, Holy Slash — hands it in here, and it is shaped like
// `attack` so nothing below has to know which it got. An ability with no pose of
// its own hands in nothing and falls back to the Attack pose, which is what Burst
// Fire wants: the artist asked for the pictures the man already has.
//
// It is registered on the same shadow as the other two — tools/shadow.mjs measures
// all three of the ability poses against their own man's anchor — so swapping to it
// cannot move him.
function pose(attack, attacking, img, trim, pivot, special) {
  const held = special && art[special.sprite];
  if (held) return [held, special.trim, special.pivot];
  const alt = attacking && attack && art[attack.sprite];
  return alt ? [alt, attack.trim, attack.pivot] : [img, trim, pivot];
}

// The construction dust. Anchored at the BOTTOM of its box rather than the
// middle, because smoke rises from a place on the ground — see FOOT in smoke.js,
// which is where the size and the anchor are both worked out. This only draws it.
//
// A straight linear fade across the whole life — solid on the frame the plot
// changes, gone at the end, with no plateau in between. See SMOKE_LIFE in
// smoke.js for why there is no hold, and why the curve is not squared.
function drawSmoke(ctx, p) {
  const img = art.build_smoke;
  if (!img) return;

  const u = Math.max(0, Math.min(1, p.life / SMOKE_LIFE));
  const [sx, sy, sw, sh] = SMOKE_TRIM;

  ctx.save();
  ctx.globalAlpha = u;
  ctx.drawImage(img, sx, sy, sw, sh, p.x - p.w / 2, p.y - p.h, p.w, p.h);
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

// The earth a rock throws up. Anchored at the BOTTOM of its trim rather than the
// middle, which is the whole difference between this and a splash of blood: the
// artist drew a clump of soil sitting on a line with specks flying above it, so
// the bottom edge of the drawing is the ground and the picture hangs up from the
// point of impact. Centre it instead and half the spray is drawn underground.
// How deep a mark is drawn, in board px. Used by the depth pass to sort a spill
// by its top edge rather than by the point the flask broke on.
const impactHeight = i => IMPACT_TRIM[i.img][3] * IMPACT_SCALE;

function drawImpact(ctx, i) {
  const img = art[i.img];
  if (!img) return;
  const [sx, sy, sw, sh] = IMPACT_TRIM[i.img];
  const dw = sw * IMPACT_SCALE;
  const dh = sh * IMPACT_SCALE;

  ctx.save();
  ctx.globalAlpha = Math.min(1, i.life / (i.fade || IMPACT_FADE));
  // A spill LIES on the ground it landed on, so it is centred like a pool of
  // blood; earth hangs above the point of impact and is anchored at its foot.
  // See IMPACT_LIE in impacts.js for which is which and why.
  ctx.drawImage(img, sx, sy, sw, sh,
    i.x - dw / 2, IMPACT_LIE[i.img] ? i.y - dh / 2 : i.y - dh, dw, dh);
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
// WHICH PAIR OF DRAWINGS AN ENEMY IS SHOWING, for the two that fight at both
// distances. Exported because it is a RULE rather than a piece of drawing —
// tools/facing.mjs asks it what each state resolves to, and a rule nothing can
// ask is a rule nobody can check.
//
// A `melee` block on the def is a second Default and a second Attack, and they
// are shown while a soldier is HOLDING him — `e.foe` — because that is what
// "face to face" means in this game: not how near he is, but whether somebody
// has hold of him. An archer with a man on him puts the bow about as a club; a
// doctor stops throwing at the line and swings at the one in front of him.
//
// The pair is not all-or-nothing. `melee.default` is optional, because the artist
// drew the doctor ONE standing pose that serves both stances and drew the archer
// two — so a def takes only the halves it actually has, and an enemy with no
// `melee` at all answers with the one pair it has ever had.
export function enemyStance(e) {
  const d = e.def;
  const close = !!(e.foe && d.melee);
  const own = { sprite: d.sprite, trim: d.spriteTrim, pivot: d.pivot };
  return {
    stand: (close && d.melee.default) || own,
    swing: close ? d.melee.attack : d.attack
  };
}

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

  const { stand, swing } = enemyStance(e);

  // The swing, the stab, or the throw — one field for all three, because they
  // are the same event to an enemy: the moment it does the thing it does. A
  // plague doctor's `thrust` is set by the flask leaving his hand rather than by
  // a blow landing, and he gets the lunge with it, which is exactly right for a
  // man putting his shoulder into a throw.
  const [frame, trim, pivot] = pose(swing, e.thrust > 0,
    art[stand.sprite] || img, stand.trim, stand.pivot);

  const [sx, sy, sw, sh] = trim;
  const dw = sw * SCALE;
  const dh = sh * SCALE;
  const dir = e.face;

  ctx.save();
  // Lunge toward whatever it is hitting, the same way a soldier does, so a
  // melee reads as two figures trading blows rather than one animated one.
  ctx.translate(e.x + dir * (e.thrust || 0) * ENEMY_LUNGE, e.y);
  ctx.scale(mirror(e.def, dir), 1);
  ctx.drawImage(frame, sx, sy, sw, sh, -pivot[0] * dw, -pivot[1] * dh, dw, dh);
  ctx.restore();
}

// How tall a figure is DRAWN, which is not the same as how big its body is for
// collisions. Health bars hang off this: pinned to the collision radius instead,
// a bar sat across the chest of anything drawn taller than its hitbox, and the
// tier 2 enemy — 28px of art over a 12px body — made that obvious.
// THE TALLEST DRAWING A FIGURE HAS, not the one it is showing.
//
// An archer thug raises his bow overhead when a soldier reaches him, and his
// close-quarters Default is 152 source px where the one he walks in is 120. A
// health bar hung off whichever pose was on screen would jump up his body the
// moment somebody caught him — and a bar that moves for a reason other than
// health is a bar the player stops trusting. So it is a property of the DEF,
// answered once and the same in every stance.
const artHeight = def => {
  if (!def.spriteTrim) return def.r * 2;
  const close = def.melee && def.melee.default;
  return Math.max(def.spriteTrim[3], close ? close.trim[3] : 0) * SCALE;
};

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

  // The swing for exactly as long as the lunge lasts. `thrust` is set to 1 on
  // the blow and decays over a quarter second, so the pose and the movement are
  // one gesture — he steps in holding the spear out, not one then the other.
  // `holdArt` is whatever an ability has committed him to — the kneel of Holy
  // Light or the follow-through of Holy Slash — and it stays up for as long as
  // `hold` does. A spearman carries both at zero forever and draws exactly as he
  // always did.
  const [frame, trim, pivot] =
    pose(s.attack, u.thrust > 0 || u.hold > 0, img, s.spriteTrim, s.pivot, u.holdArt);

  const [sx, sy, sw, sh] = trim;
  const dw = sw * SCALE;
  const dh = sh * SCALE;
  const dir = Math.cos(u.face) >= 0 ? 1 : -1;

  ctx.save();
  // Lunge toward the foe on the swing, so a spear thrust reads as a thrust.
  ctx.translate(u.x + dir * u.thrust * s.lunge, u.y);
  ctx.scale(mirror(s, dir), 1);
  ctx.drawImage(frame, sx, sy, sw, sh, -pivot[0] * dw, -pivot[1] * dh, dw, dh);
  ctx.restore();
}

// --- seeing through a tower ---------------------------------------------------

// How much of a hidden figure shows through the building in front of it.
//
// 0.3, and the arithmetic is why it is done this way round. What is wanted is the
// TOWER at 70% over the figure; what is drawn is the FIGURE at 30% over the
// tower, and the two composite to the same thing — 0.3 x figure plus 0.7 x tower
// either way. Drawing the figure again is enormously simpler: it needs no second
// pass over the building, no inverse clip, and above all no hard rectangular edge
// where the tower's transparency changes. A ghost is shaped like the man it is a
// ghost of.
//
// It shipped at 0.5 and the artist called it too strong: at half, a man behind a
// tower reads almost as solidly as one in front of it, and the building stops
// looking like a building. 0.3 is enough to follow a fight through the stonework
// and not enough to argue with what is standing in front of you.
const GHOST = 0.3;

// The rectangle a figure's art covers. Symmetric about the point it stands on, so
// it is the same box whichever way the sprite happens to be mirrored, and drawn
// from the RESTING trim — a lunge moves a man a few pixels and this is a test for
// "is any of him behind that building", not a hitbox.
function figureSpan(def, x, y) {
  const t = def.spriteTrim;
  // The fallback disc, for a def wired up before its art has landed — the same
  // case drawEnemy and drawSoldier both answer with a coloured circle.
  if (!t || !def.pivot) return { left: x - def.r, top: y - def.r, right: x + def.r, bottom: y };
  const dw = t[2] * SCALE;
  const dh = t[3] * SCALE;
  const out = Math.max(def.pivot[0], 1 - def.pivot[0]) * dw;
  return { left: x - out, right: x + out,
           top: y - def.pivot[1] * dh, bottom: y + (1 - def.pivot[1]) * dh };
}

const spanHits = (s, box) =>
  s.right > box.left && s.left < box.left + box.w &&
  s.bottom > box.top && s.top < box.top + box.h;

// Redraw, at GHOST alpha and clipped to this building, every figure the building
// is standing in front of.
//
// BEHIND is `y < t.y` and nothing else, because that is exactly the test the depth
// sort just used: a figure at the same depth as a tower is drawn after it, so it
// is already in front and has nothing to show through. The clip is the tower's own
// box, so the ghost cannot appear anywhere the building is not — and inside the
// box, where the building's art is transparent, redrawing a figure at half alpha
// on top of itself changes nothing.
//
// Two towers overlapping and hiding the same man will each ghost him, so the
// sliver where their boxes cross ends up 0.75 figure rather than 0.5. Two plots
// close enough for that is rare and the difference is a shade.
function ghostBehind(ctx, state, t) {
  const box = towerBox(t);
  const hidden = [];

  for (const e of state.enemies) {
    if (e.y < t.y && spanHits(figureSpan(e.def, e.x, e.y), box)) hidden.push(() => drawEnemy(ctx, e));
  }
  for (const u of state.units) {
    if (u.respawn <= 0 && u.y < t.y && spanHits(figureSpan(u.def, u.x, u.y), box)) {
      hidden.push(() => drawSoldier(ctx, u));
    }
  }
  if (!hidden.length) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(box.left, box.top, box.w, box.h);
  ctx.clip();
  ctx.globalAlpha = GHOST;
  for (const run of hidden) run();
  ctx.restore();
}

// How the muster rings nest: the innermost radius, and how much each slot adds.
// Exported because musterRing has to reason about the WIDEST one to place them,
// and tools/hud-clear.mjs has to know how far above a roof the stack reaches.
export const RING_R0 = 4;
export const RING_STEP = 3;

// The clear air between the top of the building and the top of the widest ring.
//
// 6, and it is doing one job: saying the rings are not part of the drawing. Less
// and the stack touches a roofline, which reads as a finial the artist put there;
// much more and it floats free of the building it belongs to. Six is about half a
// ring, which is enough of a break to see and small enough to still be attached.
export const RING_GAP = 6;

// How far the muster rings reach above the top of a tower's box, or 0 for a tower
// that musters nobody. The roof is BELOW the box top by `roofFrac` — see the note
// on musterRing — so what the stack costs in headroom is the gap plus the whole
// diameter of the widest ring plus half the 3px stroke, less that drop.
//
// Exported for tools/hud-clear.mjs, which asks the same question of the tier
// stars: what is the topmost INK this tower can put on the board, so a plot near
// the HUD can be checked against it.
export function ringLift(def) {
  if (!def.soldier) return 0;
  const widest = RING_R0 + (def.soldier.count - 1) * RING_STEP;
  return Math.max(0, RING_GAP + 2 * widest + 1.5 - (def.roofFrac || 0) * def.h);
}

// Countdown ring for a soldier that is dead and coming back, stacked DIRECTLY
// OVER THE BARRACKS.
//
// It has been in four places now and the reasoning is worth keeping, because each
// move fixed the last one's problem and introduced its own:
//
//   CENTRED ON THE BUILDING. Behind the roof, reading as part of the artwork
//   rather than as status.
//
//   OFF THE TOP-LEFT CORNER, out in the air beside it. That reads as status,
//   and it was chosen to keep clear of the pennant every tier flies from its
//   top RIGHT. What it does not do is stay on the board: the offset is a whole
//   ring stack outside the box, and map 3's plot 0 puts a tent's left edge at
//   x 15, so the rings were drawn at x 3 and clipped by the canvas.
//
//   UNDER THE FLAG. Measured per tier off the pennant's own cloth, which put the
//   stack somewhere different on each building — beside the tent's pole, on the
//   huts' ridge, and down on the keep's front wall once a tier 4 arrived with a
//   banner instead of a pennant. Three tiers agreeing was luck; four did not.
//
//   OVER THE BUILDING, which is this, and it is the first position that is the
//   SAME PLACE on every tier: dead centre, in the air above the roof.
//
// Both numbers come off the artwork rather than out of the air. The column is the
// tower's own x — which IS the centre of the shadow it stands on, because that is
// what `groundFrac` anchors the building by, so the stack is over the middle of
// the building for the same reason the building is over the middle of the plot.
// The row is `roofFrac`, the topmost ink in the band the stack covers, measured by
// `node tools/roof.mjs`.
//
// roofFrac rather than the box top, and the tent is why: it flies its pennant from
// a pole standing to one side, so the top of its box is 20 game px above its own
// ridge and a stack hung there floats in empty sky with the tent well below it.
// The keep's is 0.002 — a battlement has nothing sticking up beside it — and that
// spread between the two is the whole reason this is measured.
//
// Nothing can push it off an edge the building is not already falling off, except
// upward — and tools/hud-clear.mjs counts the stack as ink for exactly that.
function musterRing(ctx, u) {
  const box = towerBox(u.tower);
  const r = RING_R0 + u.slot * RING_STEP;   // nested, so three read as three

  // Hung from the widest ring this squad will ever draw, not from this one, so
  // a three-man barracks and a one-man one put their stacks in the same place
  // and the rings do not shuffle downward as men come back.
  const widest = RING_R0 + (u.tower.def.soldier.count - 1) * RING_STEP;
  const cx = u.tower.x;
  const cy = box.top + (u.tower.def.roofFrac || 0) * box.h - RING_GAP - widest;
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
    //
    // `drawn` is the angle the artwork's own nose already points at, and it is
    // the general form of the half-turn `faces` asks for: an arrow lying left is
    // drawn at pi, so the two agree and only the ballista's bolt — drawn
    // diagonally across its export at 3/4 pi — needs to say so. Turn the canvas
    // by the difference and the nose lands on the heading whatever the art does.
    if (ammo.faces) ctx.rotate(a - (ammo.drawn ?? (ammo.faces < 0 ? Math.PI : 0)));
    // `hold` is which point of the drawing sits on the flight path, in both
    // axes. `grip` says the same thing for art drawn lying flat and takes the
    // middle vertically, which is where a horizontal arrow's shaft is; the head
    // of a diagonal bolt is in a corner instead.
    const [hx, hy] = ammo.hold || [ammo.grip, 0.5];
    ctx.drawImage(img, sx, sy, sw, sh, -dw * hx, -dh * hy, dw, dh);
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
// As a ROW: 54 + 14 + 54 + 14 + 127 = 263 wide, and it wants to be centred on
// 480, which would put it at 349..612.
//
// IT CANNOT ALWAYS BE CENTRED, because the readouts to its left grow. "The
// readouts end around x=324" is what this comment used to say and it was never
// measured: they end at 349.1 on map 1 with three digits of gold, which is the
// pause plate's left edge exactly, and the plate is drawn AFTER the text — so
// the readouts have always been one gold digit away from being covered up by a
// button, on every map.
//
// Map 3 is where it stopped being a lurking bug and became a visible one. Ten
// waves makes the string "Wave 1 / 10" instead of "Wave 1 / 8", and the extra
// character pushed the last digit under the pause plate from the first frame of
// the map: the counter read "Wave 1 / 1".
//
// So the row is centred OR pushed right, whichever clears. READOUT_END is the
// far edge of the widest dashboard this game can produce, measured in a browser
// because node has no canvas to measure a font with:
//
//   gold  286, lives 20, "Wave 1 / 8"      349.1   <- map 1 today, touching
//   gold  286, lives 20, "Wave 1 / 10"     363.1   <- map 3's first frame
//   gold  286, lives 20, "Wave 10 / 10"    377.0
//   gold 1000, lives 20, "Wave 10 / 10"    390.9   <- this
//
// Four digits of gold is the ceiling in practice — map 3 pays out about 3000
// across all ten waves from a 286 purse — and a fifth would cost 14 more, which
// the 73px of slack between the row's right edge (678) and the info box (751)
// absorbs without this number needing to change.
//
// RE-MEASURE THIS if the dashboard font, the icons, or the wave-counter wording
// change. It is a fixed number rather than a live measurement because
// tools/hud-clear.mjs imports HUD_BTN in node, where there is no canvas, and a
// button whose position only exists in the browser is a button that tool cannot
// check plots against.
//
// Pause borrows the speed plate's artwork, because it is the same size and shape
// of control and there is no third plate drawn yet. When one arrives it only has
// to be added to data/ui.js and named here — the width comes off its own aspect,
// so a differently proportioned plate re-centres the row rather than being
// squashed into this one's slot.
//
// HUD_LEAD is the air between the readouts and the first button, and it is
// deliberately wider than the gap between the buttons themselves. Two reasons,
// and both of them are good enough on their own:
//
//   The readouts and the buttons are different things — one is what the game is
//   telling you and the other is what you can press it about. At 14 they read as
//   one run of five items; at 24 they read as two groups.
//
//   It is also ten pixels of somebody's roof. Map 3's highest north marker is
//   painted at
//   x 369, and a watchtower there is 88 wide, so its right edge is 413 — eight
//   pixels under a pause plate starting at 405. The plot used to be nudged 4px
//   down the board to fix that, and a nudged plot is a plot that no longer
//   matches the artwork the artist compares it against. The row had 83px of
//   slack before the info panel and now has 73, so this is the cheap side of
//   that trade by a wide margin. tools/hud-clear.mjs is what notices if it stops
//   being enough.
const PLATE_H = 24;
const HUD_GAP = 14;
const HUD_LEAD = 24;
const PAUSE_W = Math.round(PLATE_H * aspect('plate_speed'));
const SPEED_W = Math.round(PLATE_H * aspect('plate_speed'));
const WAVE_W = Math.round(PLATE_H * aspect('plate_wave'));
const HUD_ROW_W = PAUSE_W + HUD_GAP + SPEED_W + HUD_GAP + WAVE_W;
const READOUT_END = 391;
const HUD_X = Math.max(
  Math.round(480 - HUD_ROW_W / 2),
  Math.ceil(READOUT_END) + HUD_LEAD
);

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
// "Owned" and "Maxed" are set a shade smaller than a price — see buttonPrice.
// 9 against 10: both are five characters where a price is three or four, and at
// the price's own size they crowded the disc they sit under.
const WORD_SIZE = 9;
const INK_AMBER = '#8A6A12';
const INK_RED = '#A83A2C';

// THE INFO BOX HAS NO COLOUR OF ITS OWN FOR A BUFFED NUMBER, and that is the
// owner's call after seeing one. The rows simply show what the fight is using —
// 66 rather than 60, 330 rather than 275 — so the buff is visible as the number
// itself, and the health row keeps its green/amber/red for the one thing that
// row is for. What announces the aura is the badge over the tower.

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
  // This game's own count, not a shared one: map 3 runs ten where the other two
  // run eight, and it is read off the state because that is where the waves the
  // player is actually facing live.
  const n = state.waves.length;
  ctx.fillText(`Wave ${Math.min(state.waveIndex + 1, n)} / ${n}`, x + 26, 21);

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

    drawPauseRow(ctx, state);
  }

  hudButton(ctx, HUD_BTN.speed, state.speed === 2 ? '2x' : '1x', null, true);
  hudButton(ctx, HUD_BTN.wave, 'Next wave',
    call ? `+${earlyCallBonus(state)}g` : null, call);

  drawWavePreview(ctx, state);
}

// --- what is coming, under the button that calls it ---------------------------
//
// A row of faces with counts: 12 militia, 2 giants, a plague doctor. It hangs
// directly under the Next wave plate because it is the answer to that button's
// question — call this in early for the gold, or take the time and build.
//
// PICTURES RATHER THAN WORDS. "Wave 6: 18 light infantry, 3 heavy" is a sentence
// nobody reads mid-fight; three small figures with numbers beside them is a
// glance. They are the enemies' own board drawings, at their own proportions, so
// a giant is visibly bigger than a thug in the row exactly as he is on the road.
//
// RIGHT-ALIGNED to the plate above it and grown leftwards, so the row cannot
// creep under the info box on the right however many kinds a wave holds — and so
// the first thing your eye lands on is the same edge every time.
const PREVIEW_H = 26;      // how tall the BIGGEST enemy is drawn
const PREVIEW_Y = 39;      // the top of the row, 6px under the 24px HUD plates
const PREVIEW_GAP = 5;     // between a number and the next face
const PREVIEW_TEXT = 4;    // between a face and its own number

// ONE SCALE FOR EVERY ENEMY, exactly as the info box portraits use one — so the
// giant is drawn bigger than the thug beside him, which is the whole reason the
// row is pictures. Fitted so the tallest drawing in the game fills PREVIEW_H and
// the others come out in proportion, and taken across EVERY type rather than the
// ones in this wave: sized per wave, a thug would grow whenever no giant was
// coming and the row would breathe between waves for no reason.
const PREVIEW_K = PREVIEW_H /
  Math.max(...Object.values(enemyTypes).map(d => d.spriteTrim[3]));

function drawWavePreview(ctx, state) {
  // ONLY WHILE THE BUTTON IS LIVE, which is the owner's call after playing with
  // it: between waves and during the opening delay, when the row is a decision,
  // and not during the fight, when it is one more thing moving on a screen the
  // player is already reading. `canCallWave` is asked rather than re-derived, so
  // the row and the button it explains can never disagree about when they apply.
  //
  // Nothing before the game starts, nothing once it is over, and nothing on the
  // last wave — there is no wave after it, and an empty row that only appears at
  // the end reads as something having broken.
  if (!state.started || state.result || !canCallWave(state)) return;
  const next = upcomingWave(state);
  if (!next || !next.groups.length) return;

  ctx.save();
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  // Measured before anything is drawn, because the row is laid out from its
  // RIGHT edge and the width is the sum of what is in it.
  const items = next.groups.map(g => {
    const [, , sw, sh] = g.def.spriteTrim;
    const label = `x${g.count}`;
    return { g, w: sw * PREVIEW_K, h: sh * PREVIEW_K,
             label, lw: ctx.measureText(label).width };
  });
  const total = items.reduce((n, it) => n + it.w + PREVIEW_TEXT + it.lw, 0)
    + (items.length - 1) * PREVIEW_GAP;

  const right = HUD_BTN.wave.x + HUD_BTN.wave.w;
  let x = right - total;
  const mid = PREVIEW_Y + PREVIEW_H / 2;

  for (const it of items) {
    const img = art[it.g.def.sprite];
    if (img) {
      const [sx, sy, sw, sh] = it.g.def.spriteTrim;
      // Bottom-aligned rather than centred: these are figures standing on a
      // line, and a shorter one hung from the middle of the row would look like
      // it was floating while the giant beside it stood.
      ctx.drawImage(img, sx, sy, sw, sh, x, PREVIEW_Y + PREVIEW_H - it.h, it.w, it.h);
    }
    x += it.w + PREVIEW_TEXT;

    // Cream on ink, the same pair the aura badges use, because this row sits on
    // the board rather than on a plate and the board is grass, road and stone.
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#241E17';
    ctx.strokeText(it.label, x, mid);
    ctx.fillStyle = '#F4ECD8';
    ctx.fillText(it.label, x, mid);
    x += it.lw + PREVIEW_GAP;
  }

  ctx.restore();
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
// The names came out — "Barracks", "Refund", "Upgrade", the "T1" in front of every
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
  // WHAT THE LINE UNDER THE PICTURE SAYS. A price, a refund — or one of two
  // words, on the two buttons that have no price because there is nothing left
  // to pay: an ability you already own, and a tower already at the top of its
  // ladder.
  //
  // Both slots were simply blank, which is the worst thing a status line can be:
  // a button with no price under it reads as a button with nothing to tell you,
  // not as one that has already answered. The room was reserved and centred
  // either way, so saying it costs no layout at all — and a caption is also what
  // moves the glyph up into the two-line arrangement every priced button uses, so
  // these two stop being the odd ones out on the ring.
  const caption = it.owned ? 'Owned'
                : it.glyph === 'max' ? 'Maxed'
                : it.gain !== null ? `+${it.gain}g`
                : it.cost !== null ? `${it.cost}g`
                : '';

  ctx.save();
  // THREE STATES, NOT TWO, and the third is what abilities needed. A button you
  // cannot afford is dimmed; a button you have already BOUGHT is not — it is on
  // the ring to say what this tower does, and greying it would read as "you cannot
  // have this" when the answer is "you already do". What tells them apart on the
  // screen is the caption: a price if it is for sale, "Owned" if it is not.
  ctx.globalAlpha = it.owned || on ? 1 : 0.45;

  // AN ABILITY BUTTON IS ONE PICTURE, plate and all: the artist drew these four on
  // a blue disc of exactly the cream plate's size, so there is nothing to lay a
  // glyph over. See the `plate` entries in data/ui.js — including why the drawing
  // has to be clipped to a circle before it goes down.
  if (it.face && plateFace(ctx, it)) {
    if (caption) buttonPrice(ctx, it, caption);
    ctx.restore();
    return;
  }

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
    // A glyph whose art has not arrived, or has not loaded. The vector is
    // scaled to the same box so a mixed ring does not look like two different
    // sets of icons, and it is drawn dark because the plate is cream.
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

  if (caption) buttonPrice(ctx, it, caption);

  ctx.restore();
}

// The price under a button's picture — or "Owned" or "Maxed" in its place, on the
// two buttons that have nothing left to charge for.
//
// 10px. The glyphs grew when the labels came out, and the price is the smaller
// half of the button's job — what it IS reads first, what it costs second.
// 12 -> 11 -> 10 over two passes, each time to give the glyph more of the disc.
//
// THREE INKS. Dark on the cream plate and green when it is gold coming back to
// you; white on an ability's coloured disc, where neither of the dark ones reads.
//
// THE WORDS TAKE WHATEVER INK THEIR OWN BUTTON'S PRICE TOOK — that is the rule,
// and the ink is not asked what the caption says. "Owned" was a green of its own
// for a build, to keep a status from reading as a price; the owner asked for the
// consistency instead, and it is the better call. A button does not change colour
// when you buy it, so the eye has one less thing to account for, and the WORD is
// already doing the separating: no price on the ring is a word.
//
// So a bought ability on a blue disc keeps the white its price was in, one on the
// temple's pale disc keeps the ordinary dark ink, and "Maxed" on a cream plate
// takes the same dark ink every tier upgrade in the game prints its price in.
//
// They are set SMALLER than a price, though — see WORD_SIZE. That is about the
// disc having room for five characters, not about the caption meaning something
// different.
//
// AND THE PALE DISCS TAKE THAT ORDINARY DARK INK TOO. They were gold for one
// build, because white on the artist's white disc was invisible; the owner has
// since asked for the ordinary colour, which reads on a pale disc for exactly the
// reason white does not. `pale` in data/ui.js is which discs those are — it
// belongs to the drawing rather than to the ability, so a re-export on a dark
// disc fixes it there.
//
// The white sat on a dark rounded plate of its own for one build, on the reasoning
// that text over artwork needs something behind it. The artist took it off: the
// disc is already a flat, dark, even blue, so the plate was solving a problem the
// drawing does not have and it read as a label stuck on the button rather than as
// part of it.
function buttonPrice(ctx, it, caption) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const onDark = it.face && !(ui[it.face] && ui[it.face].pale);
  ctx.font = `700 ${it.cost === null && it.gain === null ? WORD_SIZE : 10}px system-ui, sans-serif`;
  ctx.fillStyle = onDark ? '#FFFFFF' : it.gain !== null ? INK_GREEN : INK;
  ctx.fillText(caption, it.x, it.y + 16);
  ctx.textAlign = 'left';
}

// A button whose ARTWORK IS THE WHOLE BUTTON, clipped to a circle.
//
// The clip earned its keep before it was a safeguard. Three of these four files
// shipped with an OPAQUE WHITE background outside the disc, and drawn as a plain
// rect they would have put four white corners on the grass; the clip is why nobody
// ever saw them. They are transparent now, so it guards a mistake rather than
// hiding one — and it still catches the next re-export that brings a background
// back. The disc fills its measured box exactly — [163, 163, 186, 186] in all four,
// which is `btn_plate`'s own trim — so a circle of the button's radius lands on the
// drawn outline rather than inside it.
//
// Returns false if the file has not loaded, so the caller falls back to the cream
// plate and the vector glyph like every other button.
function plateFace(ctx, it) {
  const key = it.face;
  if (!art[key] || !ui[key]) return false;

  ctx.save();
  ctx.beginPath();
  ctx.arc(it.x, it.y, BTN_R, 0, Math.PI * 2);
  ctx.clip();
  drawUi(ctx, key, it.x, it.y, ui[key].fit);
  ctx.restore();
  return true;
}

// Vector glyphs, now the FALLBACK rather than the design. Every glyph the menu
// uses has a drawing in assets/ui and goes through drawUi — the maxed button was
// the last one still on a vector — so these are what a button falls back to only
// if its PNG fails to load, and what the next glyph added will use until its art
// arrives. Each draws centred on the origin in a 22px box, and drawButton scales
// that to whatever box the drawn glyphs are using.
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
  } else if (kind === 'refund') {
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.stroke();

  // THE THREE STANDING ORDERS. All three have artwork now, so these three are
  // the fallback above rather than what a player sees — the frame before the
  // PNG has decoded, and whatever a browser does when it cannot decode it at
  // all. They are kept for that, and because a vector costs nothing to keep.
  //
  // Each one is a different SHAPE rather than a different detail — a line, a
  // stack and an arc — which is what it took to tell them apart at 26px on a
  // phone with a thumb over half of them. The drawn icons follow the same three
  // shapes, so the fallback is not a different set of pictures.
  //
  // An arrow running into a wall: the enemy closest to getting out.
  } else if (kind === 'aim_exit') {
    ctx.moveTo(-9, 0); ctx.lineTo(4, 0);
    ctx.moveTo(0, -5); ctx.lineTo(5, 0); ctx.lineTo(0, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, -9); ctx.lineTo(8, 9);
    ctx.stroke();
  // Three bars, and the tallest is filled in: the one with the most left in it.
  } else if (kind === 'aim_tough') {
    ctx.moveTo(-8, 9); ctx.lineTo(-8, 2);
    ctx.moveTo(0, 9); ctx.lineTo(0, -2);
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(5, -9, 6, 18);
    ctx.fill();
  // A lobbed flask on its arc, with the bottle at the top of it: the one doing
  // the throwing.
  } else if (kind === 'aim_ranged') {
    ctx.moveTo(-9, 8);
    ctx.quadraticCurveTo(0, -10, 9, 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(9, 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
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
//
// And this is the constraint the rows are laid out against rather than the other
// way round: raising it to fit a third row widens the panel too, and the panel is
// already 12px from the right edge of the board. See TITLE_BAND.
const INFO_H = Math.round(76 * INFO_SCALE);
const INFO_W = Math.round(INFO_H * aspect('plate_info'));
export const INFO_BOX = { x: 960 - INFO_W - 12, y: 9, w: INFO_W, h: INFO_H, art: 'plate_info' };

// The portrait slot, sized to the BIGGEST figure rather than the other way
// round. Every portrait is drawn at INFO_PORTRAIT * SCALE — one factor, so a
// Giant Thug is genuinely bigger than a Thug — and the largest of them is the
// heavy at 186 x 162 source, which lands at 61 x 53. 64 x 56 holds it.
const PORTRAIT = { w: 58, h: 50 };

// Everything inside the panel, at the size it came down to. These are written
// out rather than multiplied by INFO_SCALE, because a font is not a length: 11.5
// x 0.9 is 10.35, and the size that actually fits is a measurement.
//
// The binding one is the TITLE, and the string that binds it is "Trebuchet
// Engineer" — the longest name the box can be asked to show. At 700 weight in
// system-ui it measures 142.9px at 13, 115.4 at 10.5 and 110.0 at 10, against a
// text column that is now 118 wide once the portrait and the plate's own border
// are taken out. 10.5 fits with 2.6px to spare and 11 does not fit at all.
const INFO_TITLE = 10.5;
const INFO_ROW = 10;
// 12 rather than 14: the attack row carries a second icon and a second number
// now, and the two pairs have to share one line of a panel 197 wide.
const INFO_ICON = 12;

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
    const dw = sw * SCALE * INFO_PORTRAIT;
    const dh = sh * SCALE * INFO_PORTRAIT;
    ctx.drawImage(img, sx, sy, sw, sh,
      x + 10 + (PORTRAIT.w - dw) / 2,
      y + h / 2 - dh / 2,
      dw, dh);
  }

  // THE TEXT COLUMN. Every tower used to be captioned with its tier — "Archers
  // Tier I" — and the longest of those is 18px shorter than "Trebuchet
  // Engineer". Naming the MAN instead was the right call and it is what put this
  // column under pressure; the gutters either side of the portrait are as tight
  // as they read at, and the font does the rest.
  const tx = x + 10 + PORTRAIT.w + 7;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // The whole block is CENTRED in the panel rather than hung from the top, so a
  // swordsman's two rows and an archer thug's three both sit in the middle of the
  // plate instead of the last one crowding the bottom edge. That is why the rows
  // are counted before anything is drawn.
  //
  // TWO ROWS AT MOST, because reach shares the attack's line rather than taking
  // one of its own — the same row the encyclopedia prints it in, which is the
  // point: a player who learns the layout on the page reads it unchanged on the
  // board. Health is the only stat that adds a line.
  const rows = info.hp !== null ? 2 : 1;
  const top = y + (h - (TITLE_BAND + rows * ROW_PITCH)) / 2;

  // See INFO_TITLE for why it is 10.5 and not a round number.
  //
  // The check on it is the browser and not a tool: node has no canvas, so there
  // is nothing outside one that can measure a font. If a name longer than
  // "Trebuchet Engineer" is ever added, look at the box.
  ctx.fillStyle = drawn ? INK : '#F0E6D2';
  ctx.font = `700 ${INFO_TITLE}px system-ui, sans-serif`;
  ctx.fillText(info.title, tx, top + TITLE_BAND / 2);

  // The rows are ICONS, not the words "Health:", "Damage:" and "Range:". Each
  // sits in a column STAT_COL wide so the numbers beside them line up whether the
  // row above is there or not — a tower has no health row, and a damage figure
  // that shifted left on towers and right on units would read as two layouts.
  // Down with the title, so the panel still reads as a heading over two stat
  // rows rather than as three lines of the same weight.
  ctx.font = `700 ${INFO_ROW}px system-ui, sans-serif`;
  let ty = top + TITLE_BAND + ROW_PITCH / 2;

  if (info.hp !== null) {
    // Reddens as it drops, on the same thresholds as the health bars over their
    // heads, so the two readings agree at a glance.
    const frac = info.maxHp ? info.hp / info.maxHp : 1;
    infoStat(ctx, 'stat_health', tx, ty, `${info.hp}/${info.maxHp}`,
      !drawn ? '#F0E6D2'
      : frac > 0.5 ? INK_GREEN : frac > 0.25 ? INK_AMBER : INK_RED);
    ty += ROW_PITCH;
  }

  const ink = drawn ? INK : '#F0E6D2';
  const dx = infoStat(ctx, 'stat_damage', tx, ty, String(info.damage), ink);

  // AND HOW FAR, BESIDE THE ATTACK rather than under it. It had a line of its own
  // for one build; the owner asked for the pair to read as they do on an
  // encyclopedia card, which is the better answer — attack and reach are the two
  // halves of one question and a player comparing towers reads them together.
  //
  // Measured in the browser rather than by a tool, for the reason INFO_TITLE
  // gives: node has no canvas to set a font in. The widest row today is the
  // Combat Archer's 14 and 210, which ends 39px inside the plate. If a stat ever
  // reaches four digits, look at the box.
  if (info.range !== null) infoStat(ctx, 'stat_range', dx + STAT_GAP, ty, String(info.range), ink);
}

// ONE ICON AND ITS NUMBER, and the reason it is a function rather than two lines
// at each call site: the attack and the reach sat at different distances from
// their icons for a build, because the attack measured its gap from the ALIGNMENT
// COLUMN and the reach measured it from the icon's own edge. Both go through the
// same rule now.
//
// AND THE PAIR IS TIGHT, like the encyclopedia's. The panel used to read as an
// icon and a number that had drifted apart; the two changes that closed it are
// STAT_COL down to exactly the widest icon — see data/ui.js, that was 3.5px of
// slack the sword and the target were paying — and this 4, which is the gap the
// book's stat() uses. Same distance in both places now, so a player reading a
// card and then tapping the thing on the board sees one layout.
//
// The column is still what makes the health and attack numbers below one another
// line up: the heart is wider than the sword, and a number that shifted between
// the rows would read as two layouts.
//
// Returns the x to carry on from, like the encyclopedia's stat() does.
const STAT_PAD = 4;

function infoStat(ctx, key, x, y, text, colour) {
  drawUi(ctx, key, x + STAT_COL / 2, y, { h: INFO_ICON });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = colour;
  ctx.fillText(text, x + STAT_COL + STAT_PAD, y);
  return x + STAT_COL + STAT_PAD + ctx.measureText(text).width;
}

// How much vertical room the title takes, and the pitch between stat rows. 18 is
// a 12px icon with 6 of air, which is the tightest the hearts and swords can sit
// without touching. Both came down with the panel.
//
// STILL TWO ROWS at the most, which is why these are where they were: reach went
// in beside the attack rather than under it, so the panel never grew a third
// line. It could not have afforded one — 20 + 3x18 is 74 in a plate 68 tall, and
// the plate cannot get taller without getting wider. See INFO_H.
const TITLE_BAND = 20;
const ROW_PITCH = 18;

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
export const START_BTN = { x: 400, y: 404, w: 160, h: 48 };

// One button per level, side by side above Start. Sized for a thumb like
// everything else — 150 x 60 is well over the 44px minimum — and laid out from
// the middle so a third map would not need the numbers re-typed.
//
// IT GREW 46 -> 60 TO HOLD THE STARS, and inside rather than under. Hanging them
// below the button was the first attempt and it put them straight through the
// difficulty row: this column is full, and the only spare space on the title
// screen is inside things. It also reads better — a rating printed on the map's
// own plate belongs to that map in a way a detached row of stars under it does
// not — and it costs nothing, because the button was 46px of plate holding one
// 18px word.
const MAP_BTN_W = 150, MAP_BTN_H = 60, MAP_GAP = 16;

export function mapButtons() {
  const n = levels.length;
  const total = n * MAP_BTN_W + (n - 1) * MAP_GAP;
  return levels.map((l, i) => ({
    i,
    name: l.name,
    x: Math.round(480 - total / 2 + i * (MAP_BTN_W + MAP_GAP)),
    y: 250,
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

// The two setting rows, under the maps. Narrower buttons than the map ones and
// laid out from the middle the same way, so a third entry in either would need no
// numbers re-typed here.
//
// UNDER rather than beside, and one row each: the three choices are not the same
// kind of thing. The map is WHERE, the length is HOW LONG, the difficulty is HOW
// HARD — and a single row of seven buttons would read as seven maps. They are
// stacked in the order the player decides them, which is the order the owner
// asked for: map, then length, then difficulty.
//
// BOTH ROWS ARE CAPTIONED, which the difficulty row managed without until the
// length arrived beside it. Two rows whose left-hand button both say "Normal" are
// unreadable without a word saying what each row is choosing.
const DIFF_BTN_W = 116, DIFF_BTN_H = 34, DIFF_GAP = 14;

const settingRow = (items, y) => {
  const total = items.length * DIFF_BTN_W + (items.length - 1) * DIFF_GAP;
  return items.map((d, i) => ({
    i,
    name: d.name,
    x: Math.round(480 - total / 2 + i * (DIFF_BTN_W + DIFF_GAP)),
    y,
    w: DIFF_BTN_W,
    h: DIFF_BTN_H
  }));
};

const MODE_ROW_Y = 320;
const DIFF_ROW_Y = 364;

export const modeButtons = () => settingRow(MODES, MODE_ROW_Y);
export const difficultyButtons = () => settingRow(DIFFICULTIES, DIFF_ROW_Y);

const hitRow = (row, x, y) => {
  for (const b of row) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.i;
  }
  return null;
};

export const hitModeButton = (state, x, y) => hitRow(modeButtons(), x, y);
export const hitDifficultyButton = (state, x, y) => hitRow(difficultyButtons(), x, y);

// Generous on a thumb without being a whole-screen tap: a mis-tap on the board
// should do nothing rather than start a game you were not ready for.
const START_PAD = 16;

export function hitStart(state, x, y) {
  if (state.started) return false;
  const b = START_BTN;
  return x >= b.x - START_PAD && x <= b.x + b.w + START_PAD &&
         y >= b.y - START_PAD && y <= b.y + b.h + START_PAD;
}

// One captioned row of setting buttons. The caption sits BESIDE the row, hard
// against its left edge, and that is a space decision rather than a taste one:
// this panel runs from the title at 206 to the encyclopedia button at 508 and
// there is no room for two more lines of text between the rows — a caption above
// each row landed inside the plate above it. Beside them it costs nothing, and
// the rows stay centred on the same middle every other row uses.
const CAPTION_GAP = 12;

function settingRowUi(ctx, caption, row, chosen) {
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(240,230,210,0.55)';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText(caption, row[0].x - CAPTION_GAP, row[0].y + row[0].h / 2 + 1);
  ctx.textAlign = 'center';

  for (const b of row) {
    const on = b.i === chosen;
    ctx.fillStyle = on ? 'rgba(196,165,116,0.92)' : 'rgba(28,32,24,0.85)';
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 8);
    ctx.fill();
    ctx.strokeStyle = on ? '#F0E6D2' : 'rgba(196,165,116,0.55)';
    ctx.lineWidth = on ? 2.5 : 1.5;
    ctx.stroke();

    ctx.fillStyle = on ? '#241F17' : 'rgba(240,230,210,0.75)';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h / 2 + 1);
  }
}

function drawStart(ctx, state) {
  ctx.fillStyle = 'rgba(34,32,28,0.72)';
  ctx.fillRect(0, 0, 960, 540);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F0E6D2';
  ctx.font = '700 46px system-ui, sans-serif';
  ctx.fillText('Medieval TD', 480, 206);

  ctx.font = '17px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(240,230,210,0.72)';
  ctx.fillText('Nothing moves until you begin. Tap a plot to build.', 480, 234);

  // The board behind this overlay is already the chosen map, so picking one is
  // its own preview: the roads and the plots change under the panel as you tap.
  //
  // EACH MAP CARRIES ITS BEST RESULT, as a row of three stars under the name.
  // This is where progress belongs: it is the screen a player is on when they
  // decide which map to play next, and the whole reason to know how a map went
  // last time is to choose. It is read for the difficulty CURRENTLY SELECTED, so
  // the rows change as you tap between Normal and Hard — which is also the
  // clearest way to say that they are two separate ladders.
  const diff = DIFFICULTIES[state.difficultyIndex ?? 0];
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
    ctx.fillText(m.name, m.x + m.w / 2, m.y + 21);

    // The stars are for the map AT THE SETTINGS CURRENTLY CHOSEN — both of them
    // now. Ten waves cleared is not eight waves cleared, so the rows change as
    // you tap between the lengths exactly as they already changed between the
    // difficulties.
    starRow(ctx, m.x + m.w / 2, m.y + 44, 7,
      bestStars(levels[m.i].id, diff.id, MODES[state.modeIndex ?? 0].id), on);
  }

  // The two setting rows. Same treatment as the maps above them so the panel
  // reads as one set of choices, at a smaller size because they are the lesser
  // two of the three.
  settingRowUi(ctx, 'Length', modeButtons(), state.modeIndex ?? 0);
  settingRowUi(ctx, 'Difficulty', difficultyButtons(), state.difficultyIndex ?? 0);

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

  // Under Start rather than beside it. This is the one screen where a player has
  // time to read, and the whole reason the book exists is the decision they are
  // about to make with 220 gold — but Start is still what they came for, so it
  // keeps the middle of the panel and this sits below.
  drawBookButton(ctx, BOOK_BTN_START, 19);

  // The dashboard's door, in the bottom-right corner. Drawn quiet — a thin
  // outline and a muted label rather than the cream plate every other button on
  // this screen wears — because it is not part of the game and should not read as
  // a third thing to press before starting.
  ctx.strokeStyle = 'rgba(196,165,116,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(ADMIN_BTN.x, ADMIN_BTN.y, ADMIN_BTN.w, ADMIN_BTN.h, 8);
  ctx.stroke();
  ctx.fillStyle = 'rgba(240,230,210,0.55)';
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillText('Admin', ADMIN_BTN.x + ADMIN_BTN.w / 2, ADMIN_BTN.y + ADMIN_BTN.h / 2 + 1);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
}

// A row of up to MAX_STARS stars, `filled` of them lit. Used in two places and
// at two sizes — small under each map button on the title screen, large in the
// end-of-game summary — so the size is a parameter and nothing else is.
//
// EVERY SLOT IS DRAWN, lit or not, which is what makes it a score rather than a
// decoration: two stars only means something beside the third one you did not
// get. An unearned star is the same outline with nothing in it.
function starRow(ctx, cx, cy, r, filled, lit = true) {
  const gap = r * 2.5;
  const left = cx - (MAX_STARS - 1) * gap / 2;

  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';

  for (let i = 0; i < MAX_STARS; i++) {
    ctx.beginPath();
    for (let p = 0; p < 10; p++) {
      const a = -Math.PI / 2 + p * Math.PI / 5;
      const rr = p % 2 ? r * 0.45 : r;
      const x = left + i * gap + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      p ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    if (i < filled) {
      ctx.fillStyle = '#F2C64B';
      ctx.fill();
      ctx.strokeStyle = 'rgba(24,28,20,0.7)';
    } else {
      ctx.strokeStyle = lit ? 'rgba(24,28,20,0.45)' : 'rgba(240,230,210,0.35)';
    }
    ctx.stroke();
  }
  ctx.restore();
}

// --- the encyclopedia --------------------------------------------------------
//
// A parchment sheet over a darkened board, ruled down the middle like an open
// book. Geometry comes from src/book.js so input.js hit-tests the rects that
// actually get drawn; everything below is layout.
//
// NOTHING HERE IS STRETCHED TO FIT AND NOTHING IS CENTRED ON ITS BOUNDING BOX.
// Every building is drawn at one shared factor and every figure at another, so
// the sizes on the page mean what they mean on the board — a Militia Camp really
// is bigger than a Catapult, a Giant Thug really is bigger than a Thug. And each
// drawing is placed on its own ground shadow, so a column of towers shares one
// vertical axis and one ground line and so does a column of men. Both factors
// are downscales of art already crisp at 1x, so nothing here is upscaled.
// tools/book.mjs checks all of it.

// Parchment, and the ink that reads on it. Deliberately the same INK family the
// dashboard plates use, so the book and the box do not look like two games.
// A CARD TITLE, and it is 11 for the same reason the info box's is 11.5: the
// longest name has to fit. A unit card's text column is 125px wide once the
// figure slot is taken out, and "Trebuchet Engineer" measures 131.9px at 12 and
// 121.0 at 11. At 12 it was landing within a pixel of the card's right edge —
// which looked fine only because no name in the game is longer.
const CARD_TITLE = 11;

const SHEET_FILL = '#EFE4C8';
const SHEET_EDGE = '#8A7A56';
const CARD_FILL = 'rgba(58,48,38,0.06)';
const CARD_EDGE = 'rgba(58,48,38,0.20)';
const INK_MUTED = 'rgba(58,48,38,0.62)';

function drawBook(ctx, state) {
  ctx.fillStyle = 'rgba(20,22,18,0.88)';
  ctx.fillRect(0, 0, 960, 540);

  ctx.fillStyle = SHEET_FILL;
  ctx.beginPath();
  ctx.roundRect(SHEET.x, SHEET.y, SHEET.w, SHEET.h, 12);
  ctx.fill();
  ctx.strokeStyle = SHEET_EDGE;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText('Encyclopedia', 480, TITLE_Y);

  if (state.book === 0) drawTowerPage(ctx);
  else if (state.book === 1) drawUnitPage(ctx);
  else if (state.book === 2) drawEnemyPage(ctx);
  else drawAbilityPage(ctx);

  drawBookFooter(ctx, state);
  if (state.zoom) drawZoom(ctx, state.zoom);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
}

// The picture pop-up: one drawing, as the artist drew it, in the middle of the
// board. Opened by tapping a card, closed by tapping anything.
//
// It is drawn LAST and over its own scrim, so the page it came from is still
// visible behind it and still plainly not the thing you are looking at. A second
// dimming over an already-dimmed board is what makes the plate read as being in
// front of the parchment rather than cut out of it.
//
// The plate is sized to the picture rather than the other way round — a tall
// building gets a tall plate and a wide one a wide plate — because the alternative
// is one fixed frame with a musketeer stranded in the middle of it.
//
// NO CAPTION. It carried a "Tap anywhere to close" line for one build, on the
// reasoning that nothing else on the page opens something that has to be closed.
// The artist took it out, and the page is better for it: a picture with a
// sentence under it reads as a diagram with a label, and this is neither.
const POP_PAD = 22;
const POP_TITLE = 30;

// Clear air between the name and the picture, asked for by the artist. The title
// band is only as deep as its own line, so without this the drawing starts on the
// text's descenders and the two read as one block.
const POP_GAP = 14;

// --- how big the canvas actually is -------------------------------------------
//
// The board is 960x540 logical units and the canvas behind it is drawn at up to
// three times that — see fitToDisplay in src/main.js, which is the only thing that
// sets this. One logical pixel is `device` real ones, so a drawing shown at "1:1"
// in logical units is being blown up `device` times on the glass.
//
// It exists for exactly one caller: the pop-up, which is the one place in the game
// that promises to show art at its own resolution and cannot keep that promise
// without knowing what the glass is doing. Everything else on the board is
// deliberately sized in logical units and checked against the worst case of 3.
//
// A SETTER RATHER THAN AN IMPORT, and that is the direction that matters: main.js
// already imports this module, so render.js importing main.js back would be a
// cycle. The number is pushed in from where it is computed.
let device = 1;
export const setDeviceScale = k => { device = Math.max(1, k); };

// The width of the prose column beside an ability's picture, and the type in it.
// 340 at 12px is about 56 characters a line, which is inside the 45-75 a line of
// body text wants and leaves the whole plate under 700px wide.
const POP_TEXT_W = 340;
const POP_TEXT = 12;
const POP_LEAD = 17;

// The deepest the prose may run. It is a CEILING rather than a measurement so the
// plate has a height that can be checked without a canvas — tools/book.mjs
// estimates the wrap and fails if any `detail` in data/abilities.js would need
// more than this many lines.
const POP_LINES = 12;
const POP_BODY = POP_LINES * POP_LEAD;

function drawZoom(ctx, z) {
  const [sx, sy, sw, sh] = z.trim;
  // The SLOT is the same for every drawing of this kind — see popSlot in book.js —
  // and the drawing is placed inside it rather than the plate being fitted to the
  // drawing. That is what keeps every tower's box the same size as every other's.
  //
  // 1 / device is the cap that keeps it crisp: at most one source pixel per screen
  // pixel, whatever the canvas is being drawn at. On a laptop at 1x this is the
  // 1:1 it always was; on a wide monitor the plate comes in so that nothing is
  // invented. See the note on popSlot for what that costs.
  const slot = popSlot(z.kind, 1 / device);
  const w = sw * slot.k;
  const h = sh * slot.k;

  // Two shapes of plate. An ability opens with its description beside the picture
  // — it is a rule rather than a thing, so a picture of it says almost nothing on
  // its own — and everything else opens as the picture alone.
  const lines = z.detail ? wrapped(ctx, z.detail, POP_TEXT_W) : null;
  const bodyH = lines ? Math.max(slot.h, POP_BODY) : slot.h;
  const pw = lines
    ? POP_PAD * 2 + slot.w + POP_GAP + POP_TEXT_W
    : Math.max(slot.w + POP_PAD * 2, 240);
  const ph = POP_PAD * 2 + POP_TITLE + POP_GAP + bodyH;
  const px = 480 - pw / 2;
  const py = 270 - ph / 2;

  ctx.fillStyle = 'rgba(20,22,18,0.78)';
  ctx.fillRect(0, 0, 960, 540);

  ctx.fillStyle = SHEET_FILL;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 12);
  ctx.fill();
  ctx.strokeStyle = SHEET_EDGE;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  ctx.font = '700 18px system-ui, sans-serif';
  ctx.fillText(z.title, 480, py + POP_PAD + POP_TITLE / 2);

  const bodyY = py + POP_PAD + POP_TITLE + POP_GAP;
  // The picture's own column: the middle of the plate when it is alone, and the
  // left of it when there is prose to its right.
  const cx = lines ? px + POP_PAD + slot.w / 2 : 480;

  const img = z.sprite && art[z.sprite];
  if (img) {
    // Centred in the slot both ways, so a short wide tent and a tall thin turret
    // sit in the middle of the same frame instead of one of them hugging an edge.
    const top = bodyY + (bodyH - h) / 2;

    // ROUND PICTURES ARE CLIPPED, and only the ability buttons are round. The
    // artist draws them as a disc, and a disc shown in a square frame wants the
    // corners taken off whether or not there is ink in them — the same clip the
    // menu button uses, for the same reason. See plateFace().
    ctx.save();
    if (z.round) {
      ctx.beginPath();
      ctx.arc(cx, top + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
      ctx.clip();
    }
    ctx.drawImage(img, sx, sy, sw, sh, cx - w / 2, top, w, h);
    ctx.restore();

    // The machine on a turret, over the stone it stands on and through the same
    // geometry the board and the cards use — see machineBox. Unmirrored, like
    // every other picture in the book: this is the tower at rest.
    const mimg = z.machine && art[z.machine.sprite];
    if (mimg) {
      const m = machineBox(z.machine.def, { left: cx - w / 2, top, w, h });
      const [mx, my, mw, mh] = z.machine.trim;
      ctx.drawImage(mimg, mx, my, mw, mh, m.left, m.top, m.w, m.h);
    }
  }

  if (!lines) return;

  // The prose, top-aligned rather than centred against the picture: a block of
  // text hung off the middle of a disc drifts up and down as the text changes
  // length, and the eye reads a paragraph from its first line.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK_MUTED;
  ctx.font = `500 ${POP_TEXT}px system-ui, sans-serif`;
  const tx = px + POP_PAD + slot.w + POP_GAP;
  lines.forEach((line, i) => {
    if (line) ctx.fillText(line, tx, bodyY + POP_LEAD * (i + 0.5));
  });
}

// Break a paragraph into lines that fit `width`, measured in the font the caller
// has already set on the context.
//
// A BLANK LINE IS A PARAGRAPH BREAK and survives as an empty entry, so the gap
// between two paragraphs is one line of leading rather than a second constant. A
// word longer than the column is left on a line of its own and allowed to overrun
// rather than being cut — there are none, and silently losing characters is the
// worse failure of the two.
function wrapped(ctx, text, width) {
  ctx.font = `500 ${POP_TEXT}px system-ui, sans-serif`;
  const out = [];

  for (const para of text.split('\n\n')) {
    if (out.length) out.push('');
    let line = '';
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > width) { out.push(line); line = word; }
      else line = next;
    }
    if (line) out.push(line);
  }

  return out;
}

// Page 1: every tower in the game, one family per column across the spread.
//
// NO GUTTER RULE, and it went with the layout change. A line down the fold used to
// say "towers on this side, their men on that" — two halves of one spread. The
// towers now have the whole spread and their men have the next page, so a rule
// through the middle of one list would divide something that is not divided. The
// enemy page has never had one, for the same reason.
function drawTowerPage(ctx) {
  heading(ctx, 'Tower', PAGE_X);

  for (const { def, tiers, col, row } of shelf()) {
    towerCard(ctx, shelfRect(col, row), towerEntry(def, tiers));
  }
}

// Page 2: the man each of those towers puts on the board, IN THE SAME CELL as his
// tower on page 1. That is the whole trick of splitting them: flipping the page
// keeps your place, so the third card down the first column is a Crossbow Tower on
// one page and the Elite Archer inside it on the next.
function drawUnitPage(ctx) {
  heading(ctx, 'Unit', PAGE_X);

  for (const { def, col, row } of shelf()) {
    unitCard(ctx, shelfRect(col, row), unitEntry(def));
  }
}

function heading(ctx, text, x) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK_MUTED;
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.fillText(text, x, HEAD_Y);
}

function card(ctx, b) {
  ctx.fillStyle = CARD_FILL;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 8);
  ctx.fill();
  ctx.strokeStyle = CARD_EDGE;
  ctx.lineWidth = 1;
  ctx.stroke();
}

// A drawing standing on its own shadow inside a card's picture slot.
//
// `art` comes from towerArt() or figureSlot() and carries four things: the drawn
// size, the anchor as a fraction of it, and where in the slot that anchor goes.
// Every card in a column passes the same anchor, which is what lines the column
// up — see the note on anchored() in src/book.js for why a bounding box will not
// do it.
function drawArt(ctx, sprite, trim, b, slot) {
  const img = sprite && art[sprite];
  if (!img || !trim || !slot.a) return;

  const [sx, sy, sw, sh] = trim;
  const dw = slot.w * slot.k;
  const dh = slot.h * slot.k;
  ctx.drawImage(img, sx, sy, sw, sh,
    b.x + slot.anchor.x - slot.a[0] * dw,
    b.y + slot.anchor.y - slot.a[1] * dh,
    dw, dh);
}

function towerCard(ctx, b, e) {
  card(ctx, b);
  drawArt(ctx, e.sprite, e.trim, b, e.art);
  if (e.machine) drawCardMachine(ctx, b, e);

  const tx = b.x + TOWER_BOX.x + TOWER_BOX.w + 8;
  const [r1, r2, r3] = rowsIn(b, 3);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = INK;
  ctx.font = `700 ${CARD_TITLE}px system-ui, sans-serif`;
  ctx.fillText(e.title, tx, r1);

  ctx.fillStyle = INK_MUTED;
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText(e.occupier, tx, r2);

  // Price on the left of the row, refund on the right and in the green the game
  // already uses for gold coming back to you — the same colour the refund button
  // prints its own figure in.
  const x = stat(ctx, 'stat_gold_cost', tx, r3, String(e.cost), INK);
  stat(ctx, 'glyph_refund', x + 14, r3, String(e.refund), INK_GREEN);
}

// The ballista on its turret, in a card. The base has already been drawn into
// the slot; this works out the box that drawing occupies and hands it to the
// same machineBox the board uses, so the machine sits on the same spot of the
// same roof at whatever scale the page happens to be drawn at.
//
// Never mirrored here. A card is a portrait of the tower at rest, and the
// drawing's own direction is the one the artist chose.
function drawCardMachine(ctx, b, e) {
  const img = art[e.machine.sprite];
  const slot = e.art;
  if (!img || !slot.a) return;

  const dw = slot.w * slot.k;
  const dh = slot.h * slot.k;
  const box = {
    left: b.x + slot.anchor.x - slot.a[0] * dw,
    top: b.y + slot.anchor.y - slot.a[1] * dh,
    w: dw,
    h: dh
  };
  const m = machineBox(e.machine.def, box);
  const [sx, sy, sw, sh] = e.machine.trim;
  ctx.drawImage(img, sx, sy, sw, sh, m.left, m.top, m.w, m.h);
}

// The air between one stat and the next icon. Was 14 when a row held two of
// them; a third needs the space back and the icons are what separate the
// numbers anyway, so a narrower gap still reads as three pairs rather than as
// one run of digits.
export const STAT_GAP = 10;

function unitCard(ctx, b, e) {
  card(ctx, b);
  drawArt(ctx, e.sprite, e.trim, b, e.art);

  const tx = b.x + FIGURE_BOX.x + FIGURE_BOX.w + 8;
  const [r1, r2] = rowsIn(b, 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = INK;
  ctx.font = `700 ${CARD_TITLE}px system-ui, sans-serif`;
  ctx.fillText(e.title, tx, r1);

  // Health, attack, reach — in that order, and each one skipped by the men it
  // does not apply to rather than printed as a blank. An archer on his deck
  // cannot be reached to be hurt and has no health; a swordsman walks up to
  // what he hits and has no reach. So every man on the page shows two figures
  // and none shows three — it is the ENEMIES opposite, who can be hurt AND
  // shoot, that the third column had to be found for.
  let x = tx;
  if (e.hp !== null) x = stat(ctx, 'stat_health', x, r2, String(e.hp), INK) + STAT_GAP;
  x = stat(ctx, 'stat_damage', x, r2, String(e.damage), INK) + STAT_GAP;
  if (e.range !== null) stat(ctx, 'stat_range', x, r2, String(e.range), INK);
}

// One icon and its number, returning the x to carry on from. The icon is drawn
// through the same uiSize/drawUi path as the dashboard's, so a re-exported file
// of a different shape lands on its baseline here too instead of being squashed.
//
// Falls back to nothing at all rather than to a word: an icon that failed to
// load leaves its number, which still reads, where a stray "Cost:" in a row
// designed without room for it would push the next figure off the card.
function stat(ctx, key, x, y, text, colour, h = BOOK_ICON_H) {
  const { w } = uiSize(key, { h });
  drawUi(ctx, key, x + w / 2, y, { h });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = colour;
  ctx.font = `700 ${h - 2}px system-ui, sans-serif`;
  ctx.fillText(text, x + w + 4, y);
  return x + w + 4 + ctx.measureText(text).width;
}

// Page 2: the enemies, in the same cards as everything else.
//
// Three lines, laid out exactly like a tower's: a name, then two stat rows. What
// it is worth to kill and what it costs to let through are the two facts a
// player can otherwise only learn by losing, and they fit because the row above
// them is icons rather than a sentence.
function drawEnemyPage(ctx) {
  heading(ctx, 'Enemy', PAGE_X);

  for (const c of enemyCards()) {
    const d = c.def;
    card(ctx, c);
    drawArt(ctx, d.sprite, d.spriteTrim, c, figureSlot(d.spriteTrim, d.pivot));

    const tx = c.x + FIGURE_BOX.x + FIGURE_BOX.w + 8;
    const [r1, r2, r3] = rowsIn(c, 3);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.font = `700 ${CARD_TITLE}px system-ui, sans-serif`;
    ctx.fillText(d.name, tx, r1);

    // Health, attack and — for the two who fight at a distance — how far. The
    // archer's 200 and the doctor's 130 are the whole difference between them
    // and everything else on the page, and a player who cannot see the number
    // learns it by watching a tower fail to answer.
    let sx = stat(ctx, 'stat_health', tx, r2, String(d.hp), INK) + STAT_GAP;
    sx = stat(ctx, 'stat_damage', sx, r2, String(shownDamage(d)), INK) + STAT_GAP;
    if (shownRange(d) !== null) stat(ctx, 'stat_range', sx, r2, String(shownRange(d)), INK);

    // THE BOOK'S OWN COST ICONS, not the dashboard's gold and lives. On an enemy
    // card the coin means a bounty you are paid and the heart means damage to the
    // keep — the opposite sense from the same two pictures at the top of the
    // screen, where they are what you HAVE. The broken heart carries that
    // difference without a caption, and it is the same coin the tower cards
    // charge you with on the page opposite.
    const gold = stat(ctx, 'stat_gold_cost', tx, r3, String(d.bounty), INK_GREEN);
    stat(ctx, 'stat_life_cost', gold + 12, r3, String(d.leak), INK_RED);
  }
}

// Page 4: what a topped-out tier 4 can be taught.
//
// THE SAME CARD AS A TOWER'S, and that is the change the artist asked for. It
// carried two lines of prose in a smaller face for one build, which was the one
// card in the book laid out differently from the rest — and a reference page whose
// boxes are two shapes reads as two kinds of thing however well the grid lines up.
//
// So it is a tower card exactly: three rows, centred by rowsIn like every other
// card, with the name on top, the tower that teaches it underneath in the row a
// tower gives to the man it musters, and the price on an icon row at the bottom.
// The explaining moved to the pop-up, where there is room for it.
function drawAbilityPage(ctx) {
  heading(ctx, 'Ability', PAGE_X);

  for (const c of abilityCards()) {
    abilityCard(ctx, c, abilityEntry(c.def));
  }
}

function abilityCard(ctx, b, e) {
  card(ctx, b);
  drawRound(ctx, e.sprite, b.x + ICON_BOX.x + ICON_BOX.w / 2, b.y + b.h / 2, ABILITY_ICON);

  const tx = b.x + ICON_BOX.x + ICON_BOX.w + 8;
  const [r1, r2, r3] = rowsIn(b, 3);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = INK;
  ctx.font = `700 ${CARD_TITLE}px system-ui, sans-serif`;
  ctx.fillText(e.title, tx, r1);

  ctx.fillStyle = INK_MUTED;
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText(e.of, tx, r2);

  // The price alone, with no refund beside it. An ability is folded into the
  // tower's own `spent` when it is bought, so it does come back at the same 60% —
  // but only by taking the whole tower down, and a refund figure on a line of its
  // own would read as something you can sell separately.
  stat(ctx, 'stat_gold_cost', tx, r3, String(e.cost), INK);
}

// A UI disc drawn to a diameter and clipped to a circle. The four ability files
// are drawn as a disc rather than a rectangle — see plateFace() for the whole
// story, including the white corners this clip used to be hiding — so they are the
// only pictures in the book that are not simply drawn to a rect.
function drawRound(ctx, key, cx, cy, d) {
  if (!art[key] || !ui[key]) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, d / 2, 0, Math.PI * 2);
  ctx.clip();
  drawUi(ctx, key, cx, cy, d);
  ctx.restore();
}

function drawBookFooter(ctx, state) {
  bookButton(ctx, BOOK_CLOSE, 'Close', 15);
  bookButton(ctx, BOOK_PREV, '\u2039', 22);
  bookButton(ctx, BOOK_NEXT, '\u203a', 22);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK_MUTED;
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.fillText(`Page ${state.book + 1} / ${PAGES}`, FOLD, FOOT_Y + BOOK_PREV.h / 2);
}

// Dark on the parchment, which is the reverse of the buttons everywhere else in
// the game — those sit on grass. Same shape and the same cream lettering, so
// they still read as the same kind of control.
function bookButton(ctx, b, label, size) {
  ctx.fillStyle = 'rgba(40,36,28,0.88)';
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 8);
  ctx.fill();
  ctx.strokeStyle = SHEET_EDGE;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F0E6D2';
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 1);
}

// --- what a paused game puts on the board -------------------------------------
//
// Three controls under the "Paused" label, and no dimming veil: the whole point
// of pausing here is to STUDY the board, and a game that greys out the thing you
// paused to look at has answered the wrong question. So the row sits in the
// strip the dashboard already owns rather than over the middle of the map.
//
// THE GAPS BETWEEN THEM ARE THE POINT. Restart and Quit both throw work away, and
// they sit beside the button a player presses to read something — so no two
// padded tap boxes may touch. 30px of drawn gap puts 4px of clear air between
// them at PAUSE_PAD each side; at the 12 that looked right on screen they
// overlapped by 14 and the loop would have handed the overlap to whichever came
// first.
//
// LEFT TO RIGHT BY WHAT THEY COST YOU: the harmless one first, then the one that
// throws the board away and gives you another, then the one that just throws it
// away. A thumb travelling from the Encyclopedia has to pass Restart before it
// can reach Quit, which is the right order for the mis-tap that would hurt most.
const PAUSE_ROW_Y = 94;
const PAUSE_H = 38;
const PAUSE_GAP = 30;
const PAUSE_BOOK_W = 170;
const PAUSE_RESTART_W = 120;
const PAUSE_QUIT_W = 110;
const PAUSE_ROW_W = PAUSE_BOOK_W + PAUSE_GAP + PAUSE_RESTART_W + PAUSE_GAP + PAUSE_QUIT_W;
const PAUSE_ROW_X = Math.round(480 - PAUSE_ROW_W / 2);

export const PAUSE_ROW = {
  book: { x: PAUSE_ROW_X, y: PAUSE_ROW_Y, w: PAUSE_BOOK_W, h: PAUSE_H },
  restart: { x: PAUSE_ROW_X + PAUSE_BOOK_W + PAUSE_GAP, y: PAUSE_ROW_Y,
             w: PAUSE_RESTART_W, h: PAUSE_H },
  quit: { x: PAUSE_ROW_X + PAUSE_BOOK_W + PAUSE_GAP + PAUSE_RESTART_W + PAUSE_GAP,
          y: PAUSE_ROW_Y, w: PAUSE_QUIT_W, h: PAUSE_H }
};

// Drawn 38 deep, tapped 64, the same trick every other control in the game uses:
// 64 logical px is 44 real ones on the narrowest canvas this game targets.
const PAUSE_PAD = 13;

export function hitPauseButton(state, x, y) {
  for (const [id, b] of Object.entries(PAUSE_ROW)) {
    if (x >= b.x - PAUSE_PAD && x <= b.x + b.w + PAUSE_PAD &&
        y >= b.y - PAUSE_PAD && y <= b.y + b.h + PAUSE_PAD) return id;
  }
  return null;
}

function drawPauseRow(ctx, state) {
  // The other place the book opens from, and the more useful of the two: this is
  // where a player stops mid-wave to work out whether the Mangonel is worth 115
  // gold, and neither it nor the tier below it is selected — so the info box
  // cannot answer and the radial menu only quotes a price.
  drawBookButton(ctx, PAUSE_ROW.book, 15);

  // ARMED OR NOT, and the label is the only thing that says which. Both of these
  // throw away a board that may be half an hour old, so the first tap asks and
  // the second does it — see tapPaused in input.js. Amber while it waits, because
  // the button is a question rather than a label for those few seconds.
  const armed = state.armed && performance.now() < state.armed.until
    ? state.armed.id : null;

  askButton(ctx, PAUSE_ROW.restart, 'Restart', armed === 'restart');
  askButton(ctx, PAUSE_ROW.quit, 'Quit', armed === 'quit');
}

// One of the two buttons that ask before they act, drawn plain or as a question.
//
// THE QUESTION IS SMALLER THAN THE WORD, because it is three times as long and
// the plate does not grow: "Quit — sure?" measures about 86px at 13 against a
// 110px plate, where at 15 it would be 99 and crowd both ends. "Restart — sure?"
// is longer again, which is what the wider plate is for.
function askButton(ctx, b, word, armed) {
  ctx.fillStyle = 'rgba(28,32,24,0.85)';
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 9);
  ctx.fill();
  ctx.strokeStyle = armed ? '#E0B24C' : '#C4A574';
  ctx.lineWidth = armed ? 2.5 : 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = armed ? '#E0B24C' : '#F0E6D2';
  ctx.font = armed ? '700 12px system-ui, sans-serif' : '700 15px system-ui, sans-serif';
  ctx.fillText(armed ? `${word} — sure?` : word, b.x + b.w / 2, b.y + b.h / 2 + 1);
}

// The button that opens the book, drawn in two places and in two styles. On the
// title screen it is a full-sized panel button beside Start; on a paused game it
// is a small plate in the row above.
function drawBookButton(ctx, b, size) {
  ctx.fillStyle = 'rgba(28,32,24,0.85)';
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 9);
  ctx.fill();
  ctx.strokeStyle = '#C4A574';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F0E6D2';
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.fillText('Encyclopedia', b.x + b.w / 2, b.y + b.h / 2 + 1);
}

// The end-of-game summary.
//
// It used to be a headline and "Tap to play again", which answered the one
// question a player already knew the answer to and none of the others. What is
// here now is the run: what it was rated, what that rating cost, and where it
// sits against the best you have managed on this map at this difficulty.
//
// THE THRESHOLDS ARE PRINTED, and that is the part that earns its space. A star
// rating nobody can see the rules of is a number that happens to you; "18 lives
// for three stars" is a target to play for next time, and it is the reason the
// panel says how many lives were left rather than only how many stars they were
// worth. The two figures come from starCuts() rather than being typed, so they
// cannot drift from the ones score.js actually applies.
function drawResult(ctx, state) {
  const s = state.summary;

  ctx.fillStyle = 'rgba(34,32,28,0.86)';
  ctx.fillRect(0, 0, 960, 540);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F0E6D2';
  ctx.font = '700 44px system-ui, sans-serif';
  ctx.fillText(state.result === 'won' ? 'Waves cleared' : 'The keep has fallen', 480, 148);

  if (!s) {
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Tap to play again', 480, 300);
    ctx.textAlign = 'left';
    return;
  }

  ctx.font = '17px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(240,230,210,0.66)';
  // The three settings the run was played at, in the order the title screen asks
  // for them. The length belongs here for the same reason the difficulty does:
  // two records are kept per map and a panel that named only one of the two
  // settings would be the same panel for two different achievements.
  ctx.fillText(`${s.map}  ·  ${s.mode}  ·  ${s.difficulty}`, 480, 186);

  starRow(ctx, 480, 244, 26, s.stars);

  // What the rating was earned with, and what the next one up would take. The
  // second line is only worth saying while there is a rating left to reach.
  const [three, two] = starCuts(s.startLives);
  ctx.font = '700 21px system-ui, sans-serif';
  ctx.fillStyle = '#F0E6D2';
  ctx.fillText(
    s.won
      ? `${s.lives} of ${s.startLives} lives held  ·  ${s.ofWaves} waves`
      : `The keep fell on wave ${s.waves + 1} of ${s.ofWaves}`,
    480, 314);

  // WHAT THE NEXT RATING WOULD TAKE, and a loss is not a thin version of a win:
  // there is no number of lives that earns a star on a run that did not finish,
  // so the line says the thing that actually stands between them and one.
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(240,230,210,0.62)';
  const want = s.stars === 1 ? two : s.stars === 2 ? three : null;
  ctx.fillText(
    !s.won ? `Hold the keep to the end of wave ${s.ofWaves} for a star.`
      : want === null ? 'Nothing left to prove on this one.'
      : `${want} lives for ${s.stars === 2 ? 'three' : 'two'} stars.`,
    480, 348);

  // The record line. "You beat it" is worth its own colour; matching it or
  // falling short both just report where the bar is.
  ctx.font = '700 17px system-ui, sans-serif';
  ctx.fillStyle = s.beat ? '#E0B24C' : 'rgba(240,230,210,0.62)';
  ctx.fillText(
    s.beat ? 'A new best on this map.'
           : `Best here: ${s.best} of ${MAX_STARS} stars.`,
    480, 386);

  ctx.font = '20px system-ui, sans-serif';
  ctx.fillStyle = '#F0E6D2';
  ctx.fillText('Tap to play again', 480, 440);
  ctx.textAlign = 'left';
}

// --- the admin dashboard -------------------------------------------------------
//
// Geometry comes from src/admin.js so input.js hit-tests the rects that actually
// get drawn — the same split as the radial menu and the encyclopedia, and for the
// same reason.
//
// It is drawn in the game's own palette rather than as a settings screen, because
// it is opened over the title screen and a grey form dropped on a parchment game
// reads as a different application.
const ADMIN_INK = '#F0E6D2';
const ADMIN_DIM = 'rgba(240,230,210,0.55)';
const ADMIN_EDGE = 'rgba(196,165,116,0.55)';

function panelButton(ctx, b, label, { on = false, live = true, size = 15, r = 8 } = {}) {
  ctx.save();
  ctx.globalAlpha = live ? 1 : 0.35;
  ctx.fillStyle = on ? 'rgba(196,165,116,0.92)' : 'rgba(28,32,24,0.85)';
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, r);
  ctx.fill();
  ctx.strokeStyle = on ? ADMIN_INK : ADMIN_EDGE;
  ctx.lineWidth = on ? 2.5 : 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = on ? '#241F17' : ADMIN_INK;
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 1);
  ctx.restore();
}

// One editable number: [-] value [+].
//
// THE VALUE IS COLOURED WHEN IT HAS BEEN CHANGED, amber against cream, and the
// shipped figure is printed under it. That is the whole reason this panel is
// usable at all — without it there is no way to tell a number somebody set from a
// number the game came with, and no way back to the second one except by
// remembering it.
// SAVE AND RESTORE, and it is not tidiness. This centres its text, and the row
// labels beside it are drawn left-aligned in a loop — so without the restore
// every row after the first drew its name centred on the left margin and half of
// it fell off the panel. Two rows of "nt Thug" on the first screenshot.
function stepperRow(ctx, s, value, base) {
  const moved = value !== base;

  panelButton(ctx, s.minus, '−', { size: 22, r: 7 });
  panelButton(ctx, s.plus, '+', { size: 22, r: 7 });

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = moved ? '#E0B24C' : ADMIN_INK;
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText(String(value), s.value.x + s.value.w / 2, s.value.y + s.value.h / 2 - (moved ? 5 : 0));

  if (moved) {
    ctx.fillStyle = ADMIN_DIM;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`was ${base}`, s.value.x + s.value.w / 2, s.value.y + s.value.h / 2 + 12);
  }
  ctx.restore();
}

function columnHead(ctx, x, w, label) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ADMIN_DIM;
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText(label, x + w / 2, ADMIN_PANEL.y + 78);
  ctx.restore();
}

function drawAdmin(ctx, state) {
  const a = state.admin;

  ctx.fillStyle = 'rgba(20,22,18,0.92)';
  ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = 'rgba(36,40,32,0.96)';
  ctx.beginPath();
  ctx.roundRect(ADMIN_PANEL.x, ADMIN_PANEL.y, ADMIN_PANEL.w, ADMIN_PANEL.h, 12);
  ctx.fill();
  ctx.strokeStyle = ADMIN_EDGE;
  ctx.lineWidth = 2;
  ctx.stroke();

  if (a.stage === 'pin') { drawPinPad(ctx, a); return; }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ADMIN_INK;
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText(a.tab === 'waves' ? 'Admin — waves and gold' : 'Admin — unit stats',
    ADMIN_PANEL.x + 16, ADMIN_TITLE_Y);

  for (const t of ADMIN_TABS) panelButton(ctx, t, t.label, { on: a.tab === t.id });
  panelButton(ctx, ADMIN_CLOSE, 'Close');

  if (a.tab === 'waves') drawAdminWaves(ctx, a);
  else drawAdminUnits(ctx, a);

  // Reset is the one control here that throws work away, so it is drawn dead
  // when there is nothing to throw — a button that does nothing when you press
  // it reads as the panel having stopped listening.
  panelButton(ctx, RESET_BTN, 'Reset all', { live: touched() });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
}

function drawAdminWaves(ctx, a) {
  const lv = levels[a.map];

  for (const m of mapTabs()) panelButton(ctx, m, m.label, { on: m.i === a.map });
  for (const w of waveTabs(a.map)) {
    panelButton(ctx, w, String(w.i + 1), { on: w.i === a.wave, r: 7 });
  }

  // The chosen map's starting purse, on the map row's own line. Labelled, unlike
  // every other stepper in this panel: the rows below all sit under a column head
  // that says what they are, and this one is out on its own beside three buttons
  // with map names on them.
  const purse = goldStepper();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ADMIN_DIM;
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.fillText('Start gold', purse.minus.x - 14, purse.minus.y + purse.minus.h / 2);
  stepperRow(ctx, purse, adminGold(lv), shipped(`${lv.id}|gold`));

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const rows = groupRows(a.map, a.wave);
  let total = 0;

  for (const r of rows) {
    const count = waveCount(lv.id, a.wave, r.j);
    total += count;

    ctx.fillStyle = ADMIN_INK;
    ctx.font = '700 19px system-ui, sans-serif';
    ctx.fillText(enemyTypes[r.group.type].name, ADMIN_PANEL.x + 16, r.y + 16);

    ctx.fillStyle = ADMIN_DIM;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`one every ${r.group.gap.toFixed(2)}s`, ADMIN_PANEL.x + 16, r.y + 34);

    stepperRow(ctx, stepper('damage', r.y, 'count'), count,
      shipped(`${lv.id}|${a.wave}|${r.j}`));
  }

  // The total, because the count that matters to a player is the wave's, and it
  // is the one number in this panel nobody can work out at a glance once a wave
  // has three groups in it.
  ctx.textAlign = 'left';
  ctx.fillStyle = ADMIN_DIM;
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText(
    `Wave ${a.wave + 1} of ${lv.waves.length} on ${lv.name} — ${total} enemies` +
    `${a.wave === lv.waves.length - 1 ? ', the last one' : ''}`,
    ADMIN_PANEL.x + 16, rows[rows.length - 1].y + 84);

  ctx.fillStyle = 'rgba(240,230,210,0.40)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Difficulty is applied on top of these: Normal thins a wave, Hard swells it.',
    ADMIN_PANEL.x + 16, rows[rows.length - 1].y + 106);
}

function drawAdminUnits(ctx, a) {
  const rows = unitRows(a.page);
  const pages = unitPages();

  columnHead(ctx, COLS.hp, 200, 'HEALTH');
  columnHead(ctx, COLS.damage, 200, 'ATTACK DAMAGE');

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  for (const u of rows) {
    ctx.fillStyle = ADMIN_INK;
    ctx.font = '700 19px system-ui, sans-serif';
    ctx.fillText(u.name, ADMIN_PANEL.x + 16, u.y + 16);

    ctx.fillStyle = ADMIN_DIM;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(u.of, ADMIN_PANEL.x + 16, u.y + 34);

    if (u.hp) {
      stepperRow(ctx, stepper('hp', u.y, 'hp'), u.def.hp, shipped(`${u.id}|hp`));
    } else {
      // A tower's man cannot be hurt, so there is no health to edit — said in
      // words rather than left blank, because an empty column reads as a bug.
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(240,230,210,0.28)';
      ctx.font = '14px system-ui, sans-serif';
      ctx.fillText('out of reach', COLS.hp + 100, u.y + 20);
      ctx.restore();
    }

    stepperRow(ctx, stepper('damage', u.y, 'damage'), u.def.damage, shipped(`${u.id}|damage`));
  }

  // How far one tap moves a number, said once for the page rather than on every
  // row. It is worth saying at all because the step is PROPORTIONAL — a tap on
  // the giant's health moves 75 and a tap on a spearman's damage moves 1 — and a
  // panel whose buttons do different things on different rows without saying so
  // reads as broken.
  ctx.fillStyle = 'rgba(240,230,210,0.40)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Each tap moves a stat by about a twentieth of where it already is.',
    ADMIN_PANEL.x + 16, FOOT_Y - 14);

  panelButton(ctx, PREV_BTN, '◀', { size: 16 });
  panelButton(ctx, NEXT_BTN, '▶', { size: 16 });

  ctx.textAlign = 'center';
  ctx.fillStyle = ADMIN_DIM;
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText(`Page ${a.page + 1} / ${pages}`,
    (PREV_BTN.x + PREV_BTN.w + NEXT_BTN.x) / 2, PREV_BTN.y + PREV_BTN.h / 2 + 1);
  ctx.textAlign = 'left';
}

// The keypad. Four rings for the digits, twelve keys, and no submit — the code is
// checked the moment the fourth digit lands, so a correct PIN is exactly four
// taps and a wrong one says so and empties itself.
function drawPinPad(ctx, a) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ADMIN_INK;
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText('Admin', 480, 78);

  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = a.wrong ? '#D4453A' : ADMIN_DIM;
  ctx.fillText(a.wrong ? 'Wrong code.' : `Enter the ${PIN.length}-digit code.`, 480, 108);

  const left = 480 - (PIN.length - 1) * PIN_DOTS.gap / 2;
  for (let i = 0; i < PIN.length; i++) {
    ctx.beginPath();
    ctx.arc(left + i * PIN_DOTS.gap, PIN_DOTS.y, PIN_DOTS.r, 0, Math.PI * 2);
    if (i < a.typed.length) { ctx.fillStyle = '#E0B24C'; ctx.fill(); }
    ctx.strokeStyle = ADMIN_EDGE;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (const k of keys()) {
    const label = k.k === 'clear' ? 'C' : k.k === 'back' ? '⌫' : k.k;
    panelButton(ctx, k, label, { size: k.k.length > 1 ? 20 : 24, r: 9 });
  }

  panelButton(ctx, PIN_CANCEL, 'Cancel');
}

export { PLOT_R };
