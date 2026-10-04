// The encyclopedia: every box description in the game, gathered into a book.
//
// AN OPEN BOOK, at the owner's word, after Kingdom Rush Frontiers' own: the LEFT
// page is a grid of pictures and nothing else, and the RIGHT page describes the one
// picked — a large framed picture, the name, a line or a paragraph, and the numbers
// in a column of bands. Four pages, flipped under the grid:
//
//   0   TOWERS, every tier of every family, one family per column.
//   1   UNITS: the MAN each of those towers puts on the board, in the SAME CELL
//       as his tower on page 0, so flipping the page keeps your place.
//   2   ABILITIES: what a topped-out tier 4 can be taught, under its family.
//   3   ENEMIES, and the boss on a row of his own under them.
//
// The geometry lives here and the drawing lives in render.js, the same split as
// menu.js — so input.js hit-tests exactly the rects that get drawn.

import { archery, barracks, siege, monastery, SCALE } from './data/towers.js';
import { ABILITIES } from './data/abilities.js';
import { enemyTypes, BOOK_ORDER, FOE_NOTES } from './data/waves.js';
import { refundOf } from './menu.js';
import { occupant, shownRange, shownDamage, attackIcon, traitRow, strikes } from './select.js';
import { PORTRAIT_SCALE, ui } from './data/ui.js';

export const PAGES = 4;

// --- the shelf ---------------------------------------------------------------

// The tower ladders, in build-menu order. Read from the same arrays the game
// builds from, so a tier whose cost or damage changes changes here too.
const LADDERS = [archery, barracks, siege, monastery];
const TIERS = LADDERS.flat();

// Which cell each tier sits in: ONE FAMILY PER COLUMN, read top to bottom, the four
// side by side to be compared rung for rung. A fifth family would start a fifth
// column, which the grid does not have — tools/book.mjs fails if a cell falls off.
export function shelf() {
  const out = [];
  LADDERS.forEach((tiers, col) => tiers.forEach((def, row) => out.push({ def, tiers, col, row })));
  return out;
}

// IN THE OWNER'S READING ORDER rather than the order the game defines them — see
// BOOK_ORDER in data/waves.js. The filter is kept as well as the list, so a boss
// named in BOOK_ORDER by mistake still cannot end up among the roster.
const roster = BOOK_ORDER.map(id => enemyTypes[id]).filter(d => d && !d.boss);
const bosses = Object.values(enemyTypes).filter(d => d.boss);

// --- the spread ----------------------------------------------------------------
//
// ONE SHEET OF OLD PAPER, the Upgrades screen's, with a fold down the middle. Every
// piece of either page is inset from the sheet by PAD, and the two pages stand
// FOLD_GAP either side of the fold.
export const SHEET = { x: 8, y: 8, w: 944, h: 524 };
const PAD = 16;
export const FOLD = 480;
const FOLD_GAP = 20;

// The two pages, as the rects they may draw in.
export const LEFT = { x: SHEET.x + PAD, y: SHEET.y + PAD, r: FOLD - FOLD_GAP, b: SHEET.y + SHEET.h - PAD };
export const RIGHT = { x: FOLD + FOLD_GAP, y: LEFT.y, r: SHEET.x + SHEET.w - PAD, b: LEFT.b };
LEFT.w = LEFT.r - LEFT.x;
RIGHT.w = RIGHT.r - RIGHT.x;
LEFT.cx = LEFT.x + LEFT.w / 2;
RIGHT.cx = RIGHT.x + RIGHT.w / 2;

// The left page's title — what the page is a list of — on this line.
export const TITLE_Y = LEFT.y + 15;
export const PAGE_TITLES = ['Towers', 'Units', 'Abilities', 'Enemies'];

// The footer, hung off the bottom margin: the page flip under the grid, and Close
// at the foot of the right page where the Upgrades screen keeps its Done.
const FOOT_H = 38;
export const FOOT_Y = LEFT.b - FOOT_H;

// --- the grid of pictures --------------------------------------------------------
//
// FOUR COLUMNS, FIVE ROWS: the towers need both — four families, and archery's
// ladder is five rungs with its fork — and every other page fits inside them. The
// cells are DERIVED from what is left between the title and the footer, so the
// margins are the fixed thing and the cells give way.
export const COLUMNS = 4;
export const ROWS = 5;
const GRID_TOP = LEFT.y + 38;
const GRID_BOTTOM = FOOT_Y - 12;
const GAP = 8;
export const CELL_W = Math.floor((LEFT.w - (COLUMNS - 1) * GAP) / COLUMNS);
export const CELL_H = Math.floor((GRID_BOTTOM - GRID_TOP - (ROWS - 1) * GAP) / ROWS);
// The grid is centred on its page, so a remainder from the floors is split.
const GRID_X = LEFT.x + Math.floor((LEFT.w - (COLUMNS * CELL_W + (COLUMNS - 1) * GAP)) / 2);

export const cellRect = (col, row) => ({
  x: GRID_X + col * (CELL_W + GAP),
  y: GRID_TOP + row * (CELL_H + GAP),
  w: CELL_W,
  h: CELL_H
});

// EVERYTHING ON A PAGE, in reading order, each with its cell.
//
// Abilities sit under their own family's column, as on the towers page, so a
// player who has learned that the third column is artillery finds artillery's
// abilities there too. Enemies flow across four to a row, and the BOSS starts a
// row of his own under them: he is not a heavier thug, and a row of him among the
// thugs would say he was.
export function pageItems(page) {
  if (page === 0 || page === 1) {
    return shelf().map(({ def, tiers, col, row }) =>
      ({ kind: page === 0 ? 'tower' : 'unit', def, tiers, ...cellRect(col, row) }));
  }
  if (page === 2) {
    const used = new Map();
    return ABILITIES.map(def => {
      const col = LADDERS.findIndex(tiers => tiers.some(d => d.name === def.of));
      const row = used.get(col) || 0;
      used.set(col, row + 1);
      return { kind: 'ability', def, ...cellRect(col, row) };
    });
  }
  const bossRow = Math.ceil(roster.length / COLUMNS);
  return [
    ...roster.map((def, i) => ({ kind: 'enemy', def, ...cellRect(i % COLUMNS, Math.floor(i / COLUMNS)) })),
    ...bosses.map((def, i) => ({ kind: 'enemy', def, boss: true,
      ...cellRect(i % COLUMNS, bossRow + Math.floor(i / COLUMNS)) }))
  ];
}

// The item the right page is describing on this page. Remembered per page, so
// flipping away and back keeps your place.
export function picked(state, page = state.book) {
  const items = pageItems(page);
  return items[Math.min((state.bookPick && state.bookPick[page]) || 0, items.length - 1)];
}

// --- a picture in its cell ---------------------------------------------------------

// EVERY DRAWING IS ANCHORED ON ITS SHADOW, never centred on its bounding box — the
// rule the board itself follows. A bounding box is not where a thing is: a tier 2
// watchtower's flagpole leans out one side and a tent's stakes hang below its
// shadow. So each drawing is placed by the anchor it carries (`groundFrac` for a
// building, `pivot` for a figure) and every cell puts that anchor at the SAME
// point, which stands a page of them on one ground line.
function anchored(items) {
  let left = 0, right = 0, above = 0, below = 0;
  for (const { w, h, a } of items) {
    left = Math.max(left, a[0] * w);
    right = Math.max(right, (1 - a[0]) * w);
    above = Math.max(above, a[1] * h);
    below = Math.max(below, (1 - a[1]) * h);
  }
  return { left, right, above, below, w: left + right, h: above + below };
}

const buildingOf = d => ({ w: d.w, h: d.h, a: d.groundFrac });
const figureAtBoard = (trim, pivot) => ({ w: trim[2] * SCALE, h: trim[3] * SCALE, a: pivot });

// Clear paper kept round every drawing inside its cell.
export const AIR = 6;
const INNER_W = CELL_W - 2 * AIR;
const INNER_H = CELL_H - 2 * AIR;

// ONE FACTOR FOR EVERY BUILDING and one for every figure, never each drawing
// fitted to its own cell: that would draw a Militia Camp and a Catapult the same
// size, which is a lie about the two buildings a player is choosing between.
const TOWER_SPAN = anchored(TIERS.map(buildingOf));
export const BOOK_TOWER_K = Math.min(INNER_W / TOWER_SPAN.w, INNER_H / TOWER_SPAN.h);

// A figure is drawn at 90% of the info box's portrait — or as much less as fits.
// THE BOSS IS NOT IN THE SPAN: the army sizes the furniture and he is fitted into
// it (see BOSS_FIT), rather than every card in the book shrinking for one creature.
const BOARD_SPAN = anchored([
  ...TIERS.map(d => { const m = occupant(d); return figureAtBoard(m.trim, m.pivot); }),
  ...roster.map(d => figureAtBoard(d.spriteTrim, d.pivot))
]);
export const BOOK_FIGURE_SCALE =
  Math.min(PORTRAIT_SCALE * 0.9, INNER_H / BOARD_SPAN.h, INNER_W / BOARD_SPAN.w);
const FIGURE_SPAN = (() => {
  const k = BOOK_FIGURE_SCALE;
  return { left: BOARD_SPAN.left * k, right: BOARD_SPAN.right * k,
           above: BOARD_SPAN.above * k, below: BOARD_SPAN.below * k,
           w: BOARD_SPAN.w * k, h: BOARD_SPAN.h * k };
})();

// Where the shared anchor sits in a cell: the span centred, the anchor at its own
// offset inside that.
const anchorIn = span => ({
  x: (CELL_W - span.w) / 2 + span.left,
  y: (CELL_H - span.h) / 2 + span.above
});
const TOWER_ANCHOR = anchorIn({
  left: TOWER_SPAN.left * BOOK_TOWER_K, w: TOWER_SPAN.w * BOOK_TOWER_K,
  above: TOWER_SPAN.above * BOOK_TOWER_K, h: TOWER_SPAN.h * BOOK_TOWER_K
});
const FIGURE_ANCHOR = anchorIn(FIGURE_SPAN);

// HOW MUCH A BOSS IS SHRUNK to stand in a cell from the shared anchor, as a
// multiplier — 1 when he already fits. Derived from every boss in the game.
const BOSS_FIT = (() => {
  if (!bosses.length) return 1;
  const s = anchored(bosses.map(d => figureAtBoard(d.spriteTrim, d.pivot)));
  const k = BOOK_FIGURE_SCALE;
  return Math.min(1,
    (FIGURE_ANCHOR.x - AIR) / (s.left * k),
    (CELL_W - AIR - FIGURE_ANCHOR.x) / (s.right * k),
    (FIGURE_ANCHOR.y - AIR) / (s.above * k),
    (CELL_H - AIR - FIGURE_ANCHOR.y) / (s.below * k));
})();
export const figureFit = def => (def && def.boss ? BOSS_FIT : 1);

// A drawing's place in a cell, as render.js wants it: the drawn size, the anchor
// as a fraction of it, and where in the cell that anchor goes.
export function towerArt(def) {
  const k = BOOK_TOWER_K;
  return { w: def.w * k, h: def.h * k, a: def.groundFrac, anchor: TOWER_ANCHOR };
}
export function figureArt(trim, pivot, fit = 1) {
  const k = SCALE * BOOK_FIGURE_SCALE * fit;
  return { w: trim[2] * k, h: trim[3] * k, a: pivot, anchor: FIGURE_ANCHOR };
}

// The ability's disc in its cell, a size rather than a fit: a disc is centred.
export const ABILITY_ICON = Math.min(CELL_H, CELL_W) - 2 * AIR - 8;

// --- THE RIGHT PAGE ----------------------------------------------------------------
//
// From the top: the picture in a frame of photo paper, the name, a line under it
// (who is inside a tower, which tower a man or an ability belongs to), a paragraph
// where there is one, and the numbers in bands two to a row.
export const FRAME = { w: 230, h: 164 };
FRAME.x = Math.round(RIGHT.cx - FRAME.w / 2);
FRAME.y = RIGHT.y + 6;
// An ability's picture is a button and says little on its own; its paragraph is
// the long one in the book, so its frame is shorter and gives the words the room.
export const FRAME_SMALL = { w: 140, h: 108 };
FRAME_SMALL.x = Math.round(RIGHT.cx - FRAME_SMALL.w / 2);
FRAME_SMALL.y = FRAME.y;
export const frameFor = kind => (kind === 'ability' ? FRAME_SMALL : FRAME);

// The air kept round a picture inside its frame.
export const FRAME_AIR = 14;

// The stat bands: two to a row across the page, below the words.
export const BAND_COLUMNS = 2;
export const BAND_H = 28;
export const BAND_GAP = 8;
export const BAND_X = RIGHT.x + 6;
export const BAND_W = Math.floor((RIGHT.w - 12 - (BAND_COLUMNS - 1) * BAND_GAP) / BAND_COLUMNS);

// The boss's two halves, as two small buttons beside his frame.
// Drawn 38 deep like every book button and 26 apart, so their padded tap boxes
// never meet.
export const STAGE_BTN = [1, 2].map(n => ({
  n, x: FRAME.x + FRAME.w + 12, y: FRAME.y + 8 + (n - 1) * 64, w: 84, h: 38
}));

// --- what the right page says --------------------------------------------------------

// A BOSS WITH TWO STAGES is one creature that changes, so his page carries a
// switch rather than the book carrying two of him. Stage 2 is `rage` merged over
// the def — the drawing, the plate, the damage type and the pierce — and two fields
// are CLEARED: `ranged`, because he threw the bow away, and `melee`, because
// `rage` brings its own attack.
export const staged = def => !!(def && def.rage);
export function stageOfCard(def, stage) {
  if (stage !== 2 || !staged(def)) return def;
  const r = def.rage;
  return { ...def, ...r,
    name: r.name || def.name,
    sprite: r.sprite,
    spriteTrim: r.trim,
    pivot: r.pivot,
    ranged: undefined,
    melee: undefined };
}
export const shown = (state, def) => stageOfCard(def, state.bookStage);

// What each stat icon is called, for the tip over a band under the mouse — the
// owner's names, word for word. The book prints icons and numbers only.
export const STAT_LABEL = {
  stat_health: 'Health',
  stat_damage: 'Physical Attack',
  stat_damage_magic: 'Magic Attack',
  stat_range: 'Range',
  stat_armour: 'Physical Armor',
  stat_armour_magic: 'Magic Armor',
  stat_pierce: 'Pierce Physical Armor',
  stat_pierce_magic: 'Pierce Magic Armor',
  stat_splash: 'Area of Effect (AOE)',
  stat_life_cost: 'Lives Lost'
};
// A creature's key in enemyTypes, which is what FOE_NOTES is keyed by.
const idOf = def => Object.keys(enemyTypes).find(k => enemyTypes[k] === def);
const band = (key, value, label = STAT_LABEL[key], tone = null) => ({ key, value, label, tone });

// THE RIGHT PAGE FOR AN ITEM, as one shape whatever the kind: the picture, its
// name, the line under it, a paragraph, and the bands.
export function pageEntry(state, item) {
  const { def } = item;
  if (item.kind === 'tower') {
    const e = towerEntry(def, item.tiers);
    return { ...e, sub: e.occupier, prose: null,
      bands: [band('stat_gold_cost', e.cost, 'Cost'), band('glyph_refund', e.refund, 'Refund', 'green')] };
  }
  if (item.kind === 'unit') {
    const e = unitEntry(def);
    const bands = [];
    if (e.hp !== null) bands.push(band('stat_health', e.hp));
    bands.push(band(e.attack || 'stat_damage', e.damage));
    if (e.range !== null) bands.push(band('stat_range', e.range));
    for (const [key, value] of e.traits) bands.push(band(key, value));
    return { ...e, sub: def.title, prose: null, bands };
  }
  if (item.kind === 'ability') {
    const e = abilityEntry(def);
    return { ...e, sub: e.of, prose: e.detail, round: true,
      bands: [band('stat_gold_cost', e.cost, 'Cost')] };
  }
  const d = shown(state, def);
  const bands = [band('stat_health', d.hp)];
  if (strikes(d)) bands.push(band(attackIcon(d), shownDamage(d)));
  if (shownRange(d) !== null) bands.push(band('stat_range', shownRange(d)));
  for (const [key, value] of traitRow(d)) bands.push(band(key, value));
  // WHAT A KILL PAYS AND WHAT A LEAK COSTS — and nothing at all for a creature
  // that has neither, which is the boss: reaching the exit ends the run outright,
  // and a zero in a coin would say he is worth nothing to kill.
  if (d.bounty || d.leak) {
    bands.push(band('stat_gold_cost', d.bounty, 'Bounty'));
    bands.push(band('stat_life_cost', d.leak));
  }
  return { title: d.name, sprite: d.sprite, trim: d.spriteTrim, kind: 'figure',
    sub: null, prose: FOE_NOTES[idOf(def)] || null, bands, staged: staged(def) };
}

// --- controls ----------------------------------------------------------------

// The page flip, centred under the grid, with room for "Page 1 / 4" between the
// arrows; and Close at the foot of the right page, the Upgrades screen's Done.
const FLIP_W = 56;
const LABEL_HALF = 62;
export const BOOK_PREV = { x: LEFT.cx - LABEL_HALF - FLIP_W, y: FOOT_Y, w: FLIP_W, h: FOOT_H };
export const BOOK_NEXT = { x: LEFT.cx + LABEL_HALF, y: FOOT_Y, w: FLIP_W, h: FOOT_H };
export const BOOK_CLOSE = { x: RIGHT.r - 130, y: FOOT_Y, w: 130, h: FOOT_H };

// The drawn boxes are 38 deep and the tap targets are 64, the same trick the
// dashboard and the radial menu both use.
const BOOK_PAD = 13;

const inside = (b, x, y) =>
  x >= b.x - BOOK_PAD && x <= b.x + b.w + BOOK_PAD &&
  y >= b.y - BOOK_PAD && y <= b.y + b.h + BOOK_PAD;

// WHERE THE BOOK IS OPENED FROM: the artist's book icon, bottom left of the world
// map, with "Encyclopedia" under it.
export const BOOK_ICON = { cx: 66, foot: 492 };
export const BOOK_ICON_HIT = { x: 18, y: 428, w: 96, h: 94 };

export const bookBtn = () => BOOK_ICON_HIT;

export function hitBookButton(state, x, y) {
  return inside(bookBtn(state), x, y);
}

export function openBook(state) {
  state.book = 0;
  state.zoom = null;
  // The first picture of every page, and the boss's first half, every time the
  // book is opened: it is a reference, and should read the same way each time.
  state.bookPick = [0, 0, 0, 0];
  state.bookStage = 1;
  state.bookTip = null;
}

// A WHOLE CELL picks its picture — the gap between cells is split between them,
// so a tap that misses one picks its neighbour rather than nothing.
const half = GAP / 2;
const within = (b, x, y) =>
  x >= b.x - half && x <= b.x + b.w + half && y >= b.y - half && y <= b.y + b.h + half;

// Tapping the book's own controls. Every tap while the book is open comes here and
// none go anywhere else: the page covers the whole board.
export function tapBook(state, x, y) {
  // THE POP-UP SWALLOWS EVERYTHING while it is up, and ANY tap dismisses it.
  if (state.zoom) { state.zoom = null; return true; }

  if (inside(BOOK_CLOSE, x, y)) { state.book = null; return true; }
  // BOTH ARROWS ALWAYS WORK, wrapping round.
  if (inside(BOOK_PREV, x, y)) { flip(state, -1); return true; }
  if (inside(BOOK_NEXT, x, y)) { flip(state, 1); return true; }

  const item = picked(state);
  if (item && item.kind === 'enemy' && staged(item.def)) {
    const b = STAGE_BTN.find(b => inside(b, x, y));
    if (b) { state.bookStage = b.n; return true; }
  }

  const items = pageItems(state.book);
  const i = items.findIndex(c => within(c, x, y));
  if (i >= 0) {
    if (!state.bookPick) state.bookPick = [0, 0, 0, 0];
    // A boss picked fresh shows his first half.
    if (state.bookPick[state.book] !== i) state.bookStage = 1;
    state.bookPick[state.book] = i;
    return true;
  }

  // THE FRAMED PICTURE OPENS LARGE, as a card used to.
  const f = item && frameFor(item.kind);
  if (f && x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h) {
    state.zoom = zoomOf(state, item);
    return !!state.zoom;
  }
  return false;
}

function flip(state, by) {
  state.book = (state.book + PAGES + by) % PAGES;
  state.bookTip = null;
}

// The tip over a stat band under the mouse: which band, or null. The rects are the
// ones render.js last drew — see BOOK_BANDS.
export const BOOK_BANDS = [];
export function hoverBook(state, x, y) {
  if (state.zoom) { state.bookTip = null; return; }
  const i = BOOK_BANDS.findIndex(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
  state.bookTip = i >= 0 ? i : null;
}

// What the pop-up shows for the picked item: a sprite, the rect of it, and its name.
function zoomOf(state, item) {
  if (item.kind === 'ability') {
    // An ability is a RULE rather than a thing; its words are on the page beside
    // it now, so the pop-up is the disc alone.
    return { sprite: item.def.icon, trim: ui[item.def.icon].trim, title: item.def.name,
             kind: 'ability', round: true };
  }
  if (item.kind === 'enemy') {
    const d = shown(state, item.def);
    return { sprite: d.sprite, trim: d.spriteTrim, title: d.name, kind: 'figure' };
  }
  const e = item.kind === 'tower' ? towerEntry(item.def, item.tiers) : unitEntry(item.def);
  return { sprite: e.sprite, trim: e.trim, title: e.title,
           kind: item.kind === 'tower' ? 'tower' : 'figure', machine: e.machine || null };
}

// --- the picture pop-up -------------------------------------------------------

// The most room a pop-up may take on the board, which is a CEILING rather than a
// size — see POP. 400 deep leaves the plate 22px clear of the top and bottom of
// the board once the title band, the gap and the padding are added, which is the
// same air the sheet keeps.
const POP_BOX = { w: 720, h: 400 };

// ONE PLATE PER KIND, AND ONE FACTOR INSIDE IT.
//
// A pop-up used to be sized to the picture it held, so every tower opened a
// different plate — a tall monastery got a tall one, a wide tent a wide one, and
// tapping down a column of cards made the box jump about. It is a reference page:
// the frame should be the constant and the drawing the variable.
//
// So each KIND gets one plate, big enough for the largest drawing in it, and every
// member of the kind is drawn at the SAME factor inside it. That second half is
// the part worth stating, because fitting each drawing to the plate on its own
// would show a Militia Camp and a Watchtower at the same size, which is a lie
// about the two buildings a player is choosing between — the same reason
// BOOK_TOWER_SCALE is one number for the whole shelf.
//
// Two kinds, because a building and a man are not the same question. Towers run to
// 664x744 source and figures to 179x180, and one plate covering both would open a
// 286x320 frame around a 25px archer.
//
// TOWERS TAKE 0.8 OF WHAT THEY FIT, at the artist's request. Nothing else does:
// the figures are shown at 1:1 and the shrink is a per-kind number rather than a
// global one for exactly that reason.
//
// The factor is capped at 1 before the shrink, so a drawing is never blown up past
// the size the artist exported it — every pixel on the screen is one they drew.
// That is what "full resolution" means here, and it is deliberately NOT the rule
// the rest of the codebase uses: everywhere else a sprite is held to
// drawn x 3 <= source so it stays crisp on the densest display, and at that
// ceiling a musketeer would open at 51px against the 45px thumbnail he was tapped
// on. A viewer that answers "look closer" with 13% more picture is worse than no
// viewer. The cost is that a phone at 3x device pixels draws these at 3x; flat art
// with heavy outlines carries it.
//
// THREE KINDS NOW. The abilities are the third, and they need one for the reason
// this whole mechanism exists: all four are exactly 186x186, so a plate fitted to
// each picture would be the same size four times over anyway — but sizing them
// with the figures would open a 179px frame around a 186px disc and crop it, and
// sizing them with the towers would open a 286x320 one around it. A kind is a
// group of drawings that answer the same question, and "what does this button
// mean" is not "what does this man look like".
const POP_SHRINK = { tower: 0.8, figure: 1, ability: 1 };

const popGroup = (trims, shrink) => ({
  w: Math.max(...trims.map(t => t[2])),
  h: Math.max(...trims.map(t => t[3])),
  shrink
});

// The three groups, as the raw source extents of the biggest drawing in each.
// The FACTOR is not decided here — see popSlot.
const POP_GROUPS = {
  tower: popGroup(TIERS.map(d => d.spriteTrim), POP_SHRINK.tower),
  // The men and the enemies together. They are the same kind of drawing at the
  // same scale, and the enemies page is as much a card of figures as the units
  // page is — a thug opening a different-sized plate from a spearman would read as
  // two different kinds of thing.
  figure: popGroup([...TIERS.map(d => occupant(d).trim),
                    ...Object.values(enemyTypes).map(d => d.spriteTrim)], POP_SHRINK.figure),
  ability: popGroup(ABILITIES.map(a => ui[a.icon].trim), POP_SHRINK.ability)
};

// THE PLATE FOR A KIND, GIVEN WHAT THE DISPLAY CAN SHOW.
//
// `cap` is the largest factor at which one source pixel is still at least one
// SCREEN pixel, and it is the whole reason this is a function rather than a
// constant. The board is 960x540 logical units and the canvas behind it is drawn
// at up to 3x that — see fitToDisplay in src/main.js — so on a wide monitor one
// logical pixel is two or three real ones, and a drawing shown at "1:1" in logical
// units is being blown up two or three times on the glass. That is exactly what
// the artist reported: the pop-up looked crisp on a laptop and soft on a big
// screen, and the box was the same size in both.
//
// So the caller passes 1 / (the canvas scale in force) and the plate is as big as
// it can be without inventing a pixel. The cost is real and worth stating plainly:
// on a 2560-wide monitor the canvas runs at 2.67x, so the cap is 0.375 and a
// figure opens at about 67px rather than 179. The art is 512px square with a man
// filling 180 of it; there is no more resolution to show, and the only way to a
// bigger crisp pop-up is bigger source art.
//
// Everything else still applies underneath: the ceiling box, the per-kind shrink,
// and never an upscale past 1:1 even on a display that could take one.
// THE RIGHT PAGE'S FRAME, the same idea at a smaller size: one factor for every
// drawing of a kind, fitted so the largest of them fills `frame` inside its air,
// and never more than `cap` — one source pixel per screen pixel.
export function frameSlot(kind, frame, cap = 1) {
  const g = POP_GROUPS[kind] || POP_GROUPS.figure;
  return Math.min(cap, (frame.w - 2 * FRAME_AIR) / g.w, (frame.h - 2 * FRAME_AIR) / g.h);
}

export function popSlot(kind, cap = 1) {
  const g = POP_GROUPS[kind] || POP_GROUPS.figure;
  const k = Math.min(1, cap, POP_BOX.w / g.w, POP_BOX.h / g.h) * g.shrink;
  return { k, w: g.w * k, h: g.h * k };
}

// --- what a card says --------------------------------------------------------

// A tower's entry: the tier's own name, who is inside it, what it costs and what
// it gives back.
//
// THE TWO PRICES ANSWER TWO DIFFERENT QUESTIONS, and it matters that they are
// not the same sum. `cost` is what this tier alone charges — the price on the
// build or upgrade button you are about to press. `refund` is 60% of the WHOLE
// ladder up to here, because a tier 3 tower cost you tier 1 and tier 2 as well
// and taking it down gives that back too. Quoting the tier's own cost against
// its own refund would read as a 40% haircut on every tier, which is true of the
// first one and wrong about the rest.
export function towerEntry(def, tiers) {
  const man = occupant(def);
  return {
    title: def.title,
    sprite: def.sprite,
    trim: def.spriteTrim,
    // The resting frame for an animated building, which `def.sprite` already is
    // — a catapult in the book is not mid-throw.
    art: towerArt(def),
    // THE MACHINE ON TOP, for the two tiers that are drawn in two pieces. The
    // owner asked for the card to show the turret and the ballista together,
    // which is also the only honest picture of it: neither half on its own is
    // the tower. The Cannon Outpost is the second, and it needed no change —
    // the condition is `def.machine`, so a new turret is drawn on its stone the
    // day its data lands.
    //
    // The def travels with it because placing a machine on a roof is arithmetic
    // machineBox already owns, and the card has to use the same arithmetic the
    // board does or the two would drift. It is the RESTING frame, like every
    // other card — an encyclopedia is not mid-shot.
    machine: def.machine
      ? { def, sprite: def.machine.frames[0], trim: def.machine.trim }
      : null,
    occupier: `${man.count} x ${man.name}`,
    cost: def.cost,
    refund: refundOf(tiers, def)
  };
}

// The man's entry, opposite his tower. Health is null for anybody who cannot be
// reached to be hurt — an archer on his deck, a crewman behind his machine — so
// those rows show attack alone rather than a health figure that would never
// change. Only a barracks sends men out to be hit.
export function unitEntry(def) {
  const man = occupant(def);
  return {
    title: man.name,
    sprite: man.sprite,
    trim: man.trim,
    art: figureArt(man.trim, man.pivot, figureFit(def)),
    hp: man.hp,
    damage: man.damage,
    // WHICH ATTACK ICON HE SHOWS — the sword or the wand. Off the def, so the
    // three monastery tiers and the two monks come out with the wand and everyone
    // else with the sword, and a new magic tower needs nothing here. See
    // attackIcon in select.js.
    attack: attackIcon(def),
    // HIS SECOND LINE: what he wears, what he breaks, and how wide his blast is.
    // Empty for most of the page — an archer wears nothing and breaks nothing — and
    // full for a Cannoneer, who breaks two ranks over 85. See traitRow in select.js.
    //
    // A LIST RATHER THAN NULL, because the card draws three rows either way: the
    // owner asked for the `None` ranks to go WITHOUT the block sliding down to fill
    // the space they left. So this says what is IN the row, not whether there is
    // one.
    traits: traitRow(def),
    // HOW FAR HE SHOOTS, which is his TOWER's reach: the man on the card is the
    // one standing on that deck, and a bow has no range of its own. Null for a
    // barracks man, who walks up to what he hits — see shownRange in select.js.
    range: shownRange(def)
  };
}

// An ability's entry: its button, its name, which tower teaches it, what it costs
// and the two lines that say what it does.
//
// NO REFUND FIGURE beside the price, unlike a tower's. An ability is folded into
// the tower's own `spent` when it is bought, so it comes back at the same 60% —
// but only by taking the tower down, and quoting a refund on a line of its own
// would read as something you can sell separately.
export function abilityEntry(def) {
  return {
    title: def.name,
    sprite: def.icon,
    trim: ui[def.icon].trim,
    // The tower that teaches it, in the row a tower card gives to the man it
    // musters. Same slot, same question: what is this attached to.
    of: def.of,
    cost: def.cost,
    detail: def.detail
  };
}
