// The encyclopedia: every box description in the game, gathered onto three pages.
//
// It exists because the info box can only ever describe ONE thing, and only
// while that thing is in front of you. A player deciding between a Guard Post
// and a Mangonel cannot select either — neither is built yet — so the numbers
// they need to compare are the one set of numbers the game had no way to show.
//
// Three pages, flipped at the bottom:
//
//   0   TOWERS, every tier of every family, across the whole page.
//   1   UNITS: the MAN each of those towers puts on the board, in the SAME CELL
//       as his tower on page 1. Third card down the first column is a Barracks
//       Tier I there and the Spearman it musters here.
//   2   ENEMIES, with room for the two stats a tower entry has no space for:
//       what a kill pays and what a leak costs.
//   3   ABILITIES, the last page: what a topped-out tier 4 can be taught, its
//       button, its price and a sentence about what it does.
//
// IT WAS TWO PAGES, towers on the left half of a spread and their men on the
// right. The tier 4 Musketeer Post is what ended that: thirteen tiers do not fit
// in the six rows by two columns that one half of a spread held, and the shelf
// silently ran off the page when it was twelve. Giving the towers a whole page
// and their men the next one has room for two more tier 4s before the same
// question comes back, and the "same cell on both pages" rule keeps what the old
// side-by-side layout was for.
//
// The geometry lives here and the drawing lives in render.js, the same split as
// menu.js — so input.js hit-tests exactly the rects that get drawn. Two copies of
// a button's position is how a tap target drifts off the picture it belongs to.

import { archery, barracks, siege, monastery, SCALE } from './data/towers.js';
import { ABILITIES } from './data/abilities.js';
import { enemyTypes } from './data/waves.js';
import { refundOf } from './menu.js';
import { occupant, shownRange, attackIcon, statLines } from './select.js';
import { PORTRAIT_SCALE, ui } from './data/ui.js';

export const PAGES = 4;

// --- the shelf ---------------------------------------------------------------

// The tower ladders, in build-menu order. Read from the same arrays the game
// builds from, so a tier whose cost or damage changes changes here too and there
// is no second table to forget.
const LADDERS = [archery, barracks, siege, monastery];

// Which cell each tier sits in, across the FOUR columns of the page.
//
// ONE FAMILY PER COLUMN while the page has a column for each of them, which is
// what the page wants to say: a column IS a ladder, read top to bottom, and the
// four sit side by side to be compared rung for rung. Four families, four columns,
// and six rows of room for a ladder that is currently four tiers at its longest.
//
// The flow rule underneath is the fallback for a FIFTH family: families stay whole
// and a ladder that does not fit in what is left of a column starts the next one.
// That was the only rule before, and it is what quietly overflowed when a
// thirteenth tier landed — tools/book.mjs now fails if any card falls off the
// page, so the next family will say so rather than vanish.
export function shelf() {
  const out = [];
  const perColumn = LADDERS.length <= COLUMNS;
  let col = 0, row = 0;

  for (const tiers of LADDERS) {
    if (row > 0 && (perColumn || row + tiers.length > ROWS)) { col++; row = 0; }
    for (const def of tiers) {
      out.push({ def, tiers, col, row });
      row++;
    }
  }

  return out;
}

// A shelf cell as a rect. One grid across the whole page — see `GAP` below for
// why there is no longer a half to pick first.
export function shelfRect(col, row) {
  return {
    x: PAGE_X + col * (CARD_W + GAP),
    y: TOP + row * (CARD_H + GAP),
    w: CARD_W,
    h: CARD_H
  };
}

// --- page geometry -----------------------------------------------------------
//
// ONE MARGIN, everywhere. The parchment sheet is inset from the board and every
// piece of the page is inset from the sheet by the same `PAD` — the first card's
// left edge, the last card's right edge, the Close button and the bottom of the
// footer all sit exactly PAD from the parchment. Bands between them use the same
// number again, so the gap above the footer is the gap around the outside.
//
// It was not this before, and the failure is the kind you only see once it is
// pointed out: cards were 2px inside the sheet, the Close button was 12, and the
// footer's bottom edge was flush with the parchment. Every one of those numbers
// was chosen on its own and looked fine on its own.
export const SHEET = { x: 8, y: 8, w: 944, h: 524 };
const PAD = 16;

// The usable rectangle: what the page may draw in.
const INNER = {
  x: SHEET.x + PAD,
  y: SHEET.y + PAD,
  r: SHEET.x + SHEET.w - PAD,
  b: SHEET.y + SHEET.h - PAD
};

// The two title bands, by the centre-line their text sits on.
export const TITLE_Y = INNER.y + 15;
export const HEAD_Y = INNER.y + 48;

// The footer, hung off the bottom margin so its own bottom edge is PAD from the
// parchment — the same PAD as the sides.
const FOOT_H = 38;
export const FOOT_Y = INNER.b - FOOT_H;

// The grid. Both card sizes are DERIVED from what is left inside the margins
// rather than chosen, so the margins are the fixed thing and the cards give way —
// which is the right way round when the complaint is about gaps.
const TOP = INNER.y + 58;

// Exported for tools/book.mjs, which checks the GRID rather than the cards that
// happen to be in it: the shelf no longer fills every cell — thirteen tiers in
// twenty-four — so "the bottom card sits on the margin" has to be asked of the
// last row that exists rather than of the last one used.
export const ROWS = 6;
export const COLUMNS = 4;

// Where the grid starts across. The name is not `HALVES[0]` any more, and the
// reason is the whole of the note below.
export const PAGE_X = INNER.x;

// ONE GAP, BOTH WAYS, AND THE SAME GAP EVERYWHERE ACROSS.
//
// This used to be a spread: two halves of two columns each, with a 12px gutter
// held clear on either side of the fold so the halves did not touch it. The
// arithmetic was fine and the page was not. A reader looking at four columns of
// tower cards sees three gaps between them, and they were 6, 24 and 6 — so the
// middle pair read as belonging to different lists, which is exactly the thing
// the fold used to mean and no longer does. The towers took the whole spread
// when their men moved to a page of their own; the gutter was the last piece of
// the old two-sided layout still being drawn, and nothing was left for it to
// separate.
//
// So: one grid of four columns on one gap, and the same number down the page, so
// no gap on the sheet is bigger than any other. 4 is the number that also DIVIDES
// — 912px of usable width across four columns and three gaps is 225 exactly, and
// 380px of height across six rows and five gaps is 60 exactly. The floors below
// are therefore no-ops today and a tripwire tomorrow: change a margin so the
// division stops coming out whole and tools/book.mjs fails on the margin the
// remainder eats, rather than the page quietly drifting a pixel off its edge.
const GAP = 4;
const CARD_W = Math.floor((INNER.r - PAGE_X - (COLUMNS - 1) * GAP) / COLUMNS);
const CARD_H = Math.floor((FOOT_Y - PAD - TOP - (ROWS - 1) * GAP) / ROWS);

// The centre-line of the sheet. It is no longer a fold in the layout sense —
// nothing is divided by it — but the footer is still built symmetrically about
// it, and a card must not sit ON it: with a 4px gap between columns 2 and 3 the
// line falls in that gap, which tools/book.mjs checks.
export const FOLD = 480;

// --- what goes in a card's picture slot --------------------------------------

// EVERY DRAWING IN THE BOOK IS ANCHORED ON ITS SHADOW, never centred on its
// bounding box, and that is the same rule the board itself follows.
//
// A bounding box is not where a thing is. The tier 2 watchtower's flagpole leans
// out one side, so box-centring stands it 7px off its own axis; the barracks
// tent's stakes hang 35px below its shadow, so box-bottoming lifts the whole
// tent off the ground line. Among the men it is worse, because they carry
// things: a spearman's spear and a pikeman's pike stick out by different amounts
// on different sides, so three soldiers centred by their boxes stand in three
// different places while their shadows say they are all standing still.
//
// So each drawing is placed by the anchor it already carries — `groundFrac` for
// a building, `pivot` / `gunnerPivot` / `portraitPivot` for a figure — and every
// card puts that anchor at the SAME point in its slot. A column of towers then
// shares one vertical axis and one ground line, and so does a column of men.
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

// The shape of a tier's building and of the man inside it, both in the form
// anchored() wants. Read through occupant() so the book and the info box cannot
// disagree about which drawing a tower's man is.
const buildingOf = d => ({ w: d.w, h: d.h, a: d.groundFrac });

function figureOf(def) {
  const man = occupant(def);
  return figureArt(man.trim, man.pivot);
}

// A figure on the page is drawn at 90% of the size the info box draws it —
// OR AS MUCH LESS AS IT TAKES TO FIT, which is the second half and it is new.
//
// The info box shows ONE man, big, on a plate of his own; the book shows twenty
// in a grid, and at the box's own scale they crowded their cards — a Giant Thug
// reached 45px left of where he stands and left the name beside him a column
// barely wide enough for it. 0.9 is the artist's number, asked for by eye.
//
// The cap exists because that eye was looking at a drawing that has since been
// redrawn. The Giant Thug now rests with his club shouldered above his head, and
// his box went from 162 source px to 212 — at a flat 0.9 he is 62.6px tall in a
// 60px card and his club is sawn off by the outline. So the factor is the
// artist's number OR whatever fits, whichever is smaller, exactly as
// BOOK_TOWER_SCALE is already derived from the buildings' own span rather than
// typed. The number nobody has to remember to change is the one that is right
// after the next upload.
//
// Fitted to the SHADOW-ANCHORED span, not to the tallest single box: the men all
// stand on one line, so what has to fit in the card is the tallest reach above
// that line plus the deepest below it, and no one figure has both.
//
// It stays a fraction of PORTRAIT_SCALE so the two remain tied: raise the info
// box's portraits and the book's follow. And it is still a downscale of art
// already sharp at 1x, so it cannot cost sharpness — only the ceiling on
// PORTRAIT_SCALE itself matters, and tools/book.mjs checks that.
const FIGURE_WANT = PORTRAIT_SCALE * 0.9;

const TIERS = LADDERS.flat();

// Every figure at the plain board scale, which is what the fit has to be
// measured against — the factor cannot be derived from a span that already has
// the factor in it.
const figureAtBoard = (trim, pivot) => ({
  w: trim[2] * SCALE,
  h: trim[3] * SCALE,
  a: pivot
});
const BOARD_SPAN = anchored([
  ...TIERS.map(d => { const m = occupant(d); return figureAtBoard(m.trim, m.pivot); }),
  ...Object.values(enemyTypes).map(d => figureAtBoard(d.spriteTrim, d.pivot))
]);

export const BOOK_FIGURE_SCALE = Math.min(FIGURE_WANT, CARD_H / BOARD_SPAN.h);

const figureArt = (trim, pivot) => ({
  w: trim[2] * SCALE * BOOK_FIGURE_SCALE,
  h: trim[3] * SCALE * BOOK_FIGURE_SCALE,
  a: pivot
});

const FIGURES = [
  ...TIERS.map(figureOf),
  ...Object.values(enemyTypes).map(d => figureArt(d.spriteTrim, d.pivot))
];

// How much clear card a building keeps above and below itself. The span is
// fitted to the slot MINUS this, and anchorIn centres it, so the air comes out
// evenly at both ends.
//
// It is here because of the archery flag. The tallest thing on the shelf is a
// watchtower's pennant, and with the span filling the slot edge to edge that
// pennant touched the card's outline — a spike of blue ink resting on the
// border, which reads as the drawing being too big for its box rather than as a
// tower being tall.
//
// The cost is real and worth stating: this is a 13% cut to every building on the
// page, not just archery, because there is ONE factor for all of them and that
// is the point of it. A Militia Camp is bigger than a Catapult here because it
// is bigger on the board, and shrinking only the family that happens to have the
// tallest spike would throw that away to save 4px.
export const AIR = 4;

const TOWER_SPAN = anchored(TIERS.map(buildingOf));
const FIGURE_SPAN = anchored(FIGURES);

// The two picture slots. They are DIFFERENT WIDTHS on purpose: a building
// shrinks to fit its slot, so it can be given a narrow one, while a figure is
// drawn at the fixed PORTRAIT_SCALE and its slot has to be wide enough for the
// widest man in the game — the Giant Thug, whose club reaches 45px left of the
// spot he stands on. One slot sized for both would either crop him or waste
// 30px of every tower card's text.
//
// Height is shared, and it is the WHOLE card. The slot used to be inset 3px top
// and bottom like a margin, and that inset was pure loss: it made every building
// 11% smaller and stood the shared ground line 2px higher, which showed up as
// archery towers floating with a gap under them. There is nothing above or below
// a picture slot to keep clear of — the text sits beside it, not under it — so
// the art gets the full 60px and the deepest building's stakes reach the card's
// bottom edge exactly.
const SLOT_H = CARD_H;
export const TOWER_BOX = { x: 6, y: 0, w: 48, h: SLOT_H };
export const FIGURE_BOX = { x: 6, y: 0, w: Math.ceil(FIGURE_SPAN.w) + 2, h: SLOT_H };

// ONE FACTOR FOR EVERY BUILDING, exactly as PORTRAIT_SCALE is one factor for
// every figure, and for the same reason: fitting each drawing to its own slot
// would draw a Militia Camp and a Catapult the same size, which is a lie about
// the two buildings the player is choosing between.
//
// Derived from the defs, and from the SHADOW-ANCHORED span rather than the
// bounding box — the span is what actually has to fit once everything shares a
// ground line, and it is 171px tall against the tallest single building's 153
// because the tent hangs below the line the towers stand on.
//
// It is always well under 1, so a thumbnail is a downscale of art already sharp
// at 1x; the crispness question PORTRAIT_SCALE has to answer carefully does not
// arise on this side of the page.
export const BOOK_TOWER_SCALE =
  SCALE * Math.min(TOWER_BOX.w / TOWER_SPAN.w, (TOWER_BOX.h - 2 * AIR) / TOWER_SPAN.h);

// Where the shared anchor sits inside a slot: the span centred, with the anchor
// at its own offset within that. Returned as a function of the box so render.js
// has one thing to ask and no arithmetic of its own.
const anchorIn = (box, span, k) => ({
  x: box.x + (box.w - span.w * k) / 2 + span.left * k,
  y: box.y + (box.h - span.h * k) / 2 + span.above * k
});

export function towerArt(def) {
  const k = BOOK_TOWER_SCALE / SCALE;
  return { ...buildingOf(def), k, box: TOWER_BOX, anchor: anchorIn(TOWER_BOX, TOWER_SPAN, k) };
}

export function figureSlot(trim, pivot) {
  return { ...figureArt(trim, pivot), k: 1, box: FIGURE_BOX,
           anchor: anchorIn(FIGURE_BOX, FIGURE_SPAN, 1) };
}

// WHERE A CARD'S ROWS SIT, and the answer is not a list of fixed offsets.
//
// They were +16, +33, +50 in a 60px card, which hangs the block from the top and
// leaves the last row 3px off the bottom edge while the first has 10px of air
// above it. Nobody types a layout like that on purpose; it is what you get when
// each row is nudged until it looks right on its own.
//
// So the block is measured and CENTRED, exactly the way drawInfo already treats
// the info box's own two-or-three rows: count the rows first, then place them. A
// tower card has three and a unit card has two, and both sit in the middle of
// the plate rather than one of them crowding the floor.
export const ROW = 17;

export function rowsIn(b, n) {
  const top = b.y + (b.h - n * ROW) / 2;
  return Array.from({ length: n }, (_, i) => top + ROW * (i + 0.5));
}

// --- the enemies page --------------------------------------------------------

// THE SAME CARD, in the same grid. Enemies used to get full-width rows of their
// own because two of them side by side left most of the page blank — which was
// solving the wrong problem: a reference page whose boxes are three sizes reads
// as three different kinds of thing, and an enemy is exactly as much "a box
// description" as a tower is. Empty space on a short page is fine; boxes that do
// not match are not.
//
// They flow across all four columns of the page and then down, so a third and
// fourth enemy fill the row before anything starts a second one.
export function enemyCards() {
  return Object.values(enemyTypes).map((def, i) => ({
    def, ...shelfRect(i % COLUMNS, Math.floor(i / COLUMNS))
  }));
}

// --- the abilities page -------------------------------------------------------

// THE SAME CARD AGAIN, in the same grid, flowing across the columns exactly as
// the enemies do. Four abilities today, so one row of four; a fifth would start
// the second row without anything here changing.
//
// AND WHAT IS INSIDE IT IS THE SAME SHAPE TOO. It carried two lines of prose for
// one build and the artist asked for it to match the rest of the book instead, so
// it is now a tower card exactly: a name, the thing it belongs to underneath, and
// a price on an icon row. Four pages of one card is the whole point of the layout,
// and a page whose boxes are laid out differently reads as a different kind of
// thing however well the grid lines up.
//
// The explaining moved to the POP-UP, which is where there is room for it — see
// `detail` in data/abilities.js.
export function abilityCards() {
  const col = new Map();   // family index -> how many of its cards are placed
  return ABILITIES.map(def => {
    const c = LADDERS.findIndex(tiers => tiers.some(d => d.name === def.of));
    const row = col.get(c) || 0;
    col.set(c, row + 1);
    return { def, ...shelfRect(c, row) };
  });
}

// DOWN THE COLUMN, NOT ACROSS THE ROW, and that is the owner's change: a family's
// abilities sit under one another in the family's OWN column, the same column it
// occupies on the towers page and in the same left-to-right order the build menu
// uses — archery, barracks, artillery, monastery.
//
// It flowed across before, which put Burst Fire and Deadeye side by side in row 1
// and the artillery pair side by side in row 2. That reads as rows of unrelated
// pairs; every other page in the book reads as four columns of families, and this
// one now does too — so a player who has learned that the third column is
// artillery finds artillery's abilities in the third column.
//
// THE COLUMN IS THE FAMILY'S, not a running count divided by two, and that is
// what a second tier 4 forced. Archery teaches FOUR now — two on the Musketeer
// Post and two on the Crossbow Sentry — so a fixed two rows per column would have
// flowed archery's third card into the barracks' column and pushed the monastery
// off the page. Looked up from the ladders instead: `of` names the tower, the
// tower belongs to a ladder, and the ladder's position is the column. Six rows of
// room means a family could teach six before this has to be thought about again.
//
// It still assumes ABILITIES is GROUPED by tower — two towers interleaved down
// one column would read as one list — which tools/book.mjs checks.

// The picture slot on an ability card. A button rather than a figure or a
// building, so it is neither anchored on a shadow nor scaled against anything —
// it is a disc, and a disc is drawn at a size and centred.
//
// 44 against the card's 60 leaves 8px of air above and below, which is the same
// air AIR keeps around a building on the towers page. It sits in a box the width
// of TOWER_BOX so the text column starts in the same place on every page.
export const ABILITY_ICON = 44;
export const ICON_BOX = { x: 6, y: 0, w: 48, h: SLOT_H };

// --- controls ----------------------------------------------------------------

// The footer. Close on the left where a thumb rests, the flip in the middle.
//
// EVERY NUMBER HERE IS DERIVED. Close starts on the page's own left margin, so
// it lines up with the first card above it and sits PAD from the parchment like
// everything else; the two arrows are placed symmetrically about the fold with
// a fixed reading gap for the "Page 1 / 2" between them; all three hang off
// FOOT_Y, whose bottom edge is PAD from the parchment. Type any of these as a
// literal and it drifts the next time a margin moves.
const FLIP_W = 56;
const LABEL_HALF = 62;   // room for "Page 1 / 2" between the arrows

export const BOOK_CLOSE = { x: INNER.x, y: FOOT_Y, w: 110, h: FOOT_H };
export const BOOK_PREV = { x: FOLD - LABEL_HALF - FLIP_W, y: FOOT_Y, w: FLIP_W, h: FOOT_H };
export const BOOK_NEXT = { x: FOLD + LABEL_HALF, y: FOOT_Y, w: FLIP_W, h: FOOT_H };

// The drawn boxes are 38 deep and the tap targets are 64, the same trick the
// dashboard and the radial menu both use: 64 logical px is 44 real ones on the
// narrowest canvas this game targets, and shrinking the picture never shrinks
// the target.
const BOOK_PAD = 13;

const inside = (b, x, y) =>
  x >= b.x - BOOK_PAD && x <= b.x + b.w + BOOK_PAD &&
  y >= b.y - BOOK_PAD && y <= b.y + b.h + BOOK_PAD;

// Where the book is opened from on the TITLE SCREEN. There is a second way in,
// from a paused game, and that button does not live here: it shares a row with
// Quit, so the row owns both and render.js lays it out. See PAUSE_ROW there.
// UNDER the Start button, and it moved down 46px when the difficulty row was
// added between the maps and Start. It used to sit at y 414 against a Start
// button at 344; Start is at 390 now and the two overlapped by 24px — with the
// book tested first in input.js, every tap on Start opened the encyclopedia
// instead. The title column reads, top to bottom: title, hint, maps at 272,
// difficulty at 328, Start at 390, this at 460.
export const BOOK_BTN_START = { x: 380, y: 460, w: 200, h: 46 };

export function hitBookButton(state, x, y) {
  return inside(BOOK_BTN_START, x, y);
}

export function openBook(state) {
  state.book = 0;
  state.zoom = null;
}

// Tapping the book's own controls. Every tap while the book is open comes here
// and none of them go anywhere else: the page covers the whole board, so nothing
// underneath may act on one — including the plot a card happens to be drawn over.
// A tap that hits none of the controls does nothing, which is the right answer
// for a page you are reading.
export function tapBook(state, x, y) {
  // THE POP-UP SWALLOWS EVERYTHING while it is up, on the same terms the book
  // itself swallows the board — and ANY tap dismisses it, including one that
  // lands on the Close button underneath. A picture you opened by tapping is a
  // picture you expect to close by tapping, and a first tap that flipped the page
  // behind the thing you are looking at would be the worst of both.
  if (state.zoom) { state.zoom = null; return true; }

  if (inside(BOOK_CLOSE, x, y)) { state.book = null; return true; }
  // BOTH ARROWS ALWAYS WORK, wrapping round. With two pages a disabled arrow
  // would be dead half the time it is on screen, and a control that does nothing
  // when you press it reads as the game having stopped listening.
  if (inside(BOOK_PREV, x, y)) { state.book = (state.book + PAGES - 1) % PAGES; return true; }
  if (inside(BOOK_NEXT, x, y)) { state.book = (state.book + 1) % PAGES; return true; }

  const art = artAt(state, x, y);
  if (art) { state.zoom = art; return true; }
  return false;
}

// --- the picture pop-up -------------------------------------------------------

// THE WHOLE CELL OPENS THE PICTURE, not just the 48px slot the drawing sits in.
//
// The ask was "tapping an image shows it big", and the image is a thumbnail 48
// wide — under the 44 real px this game holds every target to, and a miss on it
// lands on the card's own text, which does nothing. So the target is the CELL:
// the card grown by half a gap on every side, which tiles the grid exactly and
// makes the whole entry the handle for its own drawing. 229x64 is a thumb-sized
// target, and a tap that misses one card hits its neighbour rather than nothing.
const half = GAP / 2;
const cell = b => ({ x: b.x - half, y: b.y - half, w: b.w + GAP, h: b.h + GAP });

const within = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

// What a tap on the open page is pointing at, as the pop-up wants it: a sprite,
// the rect of it to show, and what it is called. Read from the same entry
// builders the cards themselves draw from, so the picture in the pop-up cannot
// be a different drawing from the picture that was tapped.
function artAt(state, x, y) {
  if (state.book === 3) {
    for (const c of abilityCards()) {
      if (within(cell(c), x, y)) {
        // `round` is the one thing an ability's picture needs that nothing else
        // does: the file is an opaque disc on an opaque white square, so the
        // pop-up has to clip it exactly as the menu button does. See the `plate`
        // entries in data/ui.js.
        return { sprite: c.def.icon, trim: ui[c.def.icon].trim,
                 title: c.def.name, kind: 'ability', round: true,
                 // The paragraphs that go beside the picture. An ability is a RULE
                 // rather than a thing, so its drawing says almost nothing on its
                 // own — a tower opens as a portrait and this opens as an
                 // explanation with a badge next to it.
                 detail: c.def.detail };
      }
    }
    return null;
  }

  if (state.book === 2) {
    for (const c of enemyCards()) {
      if (within(cell(c), x, y)) {
        // AND THE PROSE. An enemy card shows health, attack and reach and has no
        // room for a damage KIND or two armour ranks — so they open with the
        // picture, which is the surface that has a column of room for them.
        return { sprite: c.def.sprite, trim: c.def.spriteTrim, title: c.def.name,
                 kind: 'figure', detail: statLines(c.def) };
      }
    }
    return null;
  }

  for (const { def, tiers, col, row } of shelf()) {
    if (!within(cell(shelfRect(col, row)), x, y)) continue;
    const e = state.book === 0 ? towerEntry(def, tiers) : unitEntry(def);
    return { sprite: e.sprite, trim: e.trim, title: e.title,
             kind: state.book === 0 ? 'tower' : 'figure',
             // The unit page's entry already carries it; the tower page's is built
             // from the same def, so both open with what the card had no room for.
             detail: e.detail || statLines(def),
             // AND THE MACHINE ON TOP, for the two tiers that are two drawings.
             // The pop-up opened on the bare stone before this, which is not the
             // tower — half of a Ballista Turret is the ballista, and the man
             // standing beside it is the only place in the game he is drawn big
             // enough to look at. The Cannon Outpost needed nothing added here:
             // the rule is `def.machine`, not a tier number, so artillery's
             // second fourth rung arrived already drawn.
             machine: e.machine || null };
  }
  return null;
}

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
export const POP_GROUPS = {
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
    art: figureSlot(man.trim, man.pivot),
    hp: man.hp,
    damage: man.damage,
    // WHICH ATTACK ICON HE SHOWS — the sword or the wand. Off the def, so the
    // three monastery tiers and the two monks come out with the wand and everyone
    // else with the sword, and a new magic tower needs nothing here. See
    // attackIcon in select.js.
    attack: attackIcon(def),
    // The prose the pop-up opens with, which is where the armour and the damage
    // kind live — there is no room for them on a card. See statLines.
    detail: statLines(def),
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
