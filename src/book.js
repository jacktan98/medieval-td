// The encyclopedia: every box description in the game, gathered onto two pages.
//
// It exists because the info box can only ever describe ONE thing, and only
// while that thing is in front of you. A player deciding between a Guard Post
// and a Mangonel cannot select either — neither is built yet — so the numbers
// they need to compare are the one set of numbers the game had no way to show.
//
// Two pages, flipped at the bottom:
//
//   0   TOWERS on the left half, the MAN each one puts on the board on the
//       right, row for row. Row 3 of the left column is a Barracks Tier I and
//       row 3 of the right is the Spearman it musters, which is the whole reason
//       the two halves share a grid rather than being two independent lists.
//   1   ENEMIES, with room for the two stats a tower entry has no space for:
//       what a kill pays and what a leak costs.
//
// The geometry lives here and the drawing lives in render.js, the same split as
// menu.js — so input.js hit-tests exactly the rects that get drawn. Two copies of
// a button's position is how a tap target drifts off the picture it belongs to.

import { archery, barracks, siege, SCALE } from './data/towers.js';
import { enemyTypes } from './data/waves.js';
import { refundOf } from './menu.js';
import { occupant } from './select.js';
import { PORTRAIT_SCALE } from './data/ui.js';

export const PAGES = 2;

// --- the shelf ---------------------------------------------------------------

// The tower ladders, in build-menu order. Read from the same arrays the game
// builds from, so a tier whose cost or damage changes changes here too and there
// is no second table to forget.
const LADDERS = [archery, barracks, siege];

// Which cell each tier sits in. Families are kept WHOLE — a ladder never
// straddles two columns — so archery and barracks fill the first column exactly
// and siege starts the second. A monastery family would land under it without
// this needing a line changed, which is the point of flowing rather than
// hand-placing: the layout survives the family that has not been drawn yet.
export function shelf() {
  const out = [];
  let col = 0, row = 0;

  for (const tiers of LADDERS) {
    if (row + tiers.length > ROWS) { col++; row = 0; }
    for (const def of tiers) {
      out.push({ def, tiers, col, row });
      row++;
    }
  }

  return out;
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

// The grid. Rows are DERIVED from what is left between the heading and the
// footer rather than chosen, so the margins are the fixed thing and the cards
// give way — which is the right way round when the complaint is about gaps.
const TOP = INNER.y + 58;
const ROWS = 6;               // per column, per half
const COLS = 2;               // per half
const CARD_GAP = 4;
const CARD_H = Math.floor((FOOT_Y - PAD - TOP - (ROWS - 1) * CARD_GAP) / ROWS);

// The fold, with a gutter of its own so the two halves do not touch it.
export const FOLD = 480;
const GUTTER = 12;
const HALF_W = FOLD - GUTTER - INNER.x;
const COL_GAP = 6;
const CARD_W = Math.floor((HALF_W - (COLS - 1) * COL_GAP) / COLS);

// Where each half's first column starts. The right half is mirrored about the
// fold rather than measured from the left, so the two margins are equal by
// construction.
export const HALVES = [INNER.x, FOLD + GUTTER];

export function cardRect(col, row, fold) {
  return {
    x: fold + col * (CARD_W + COL_GAP),
    y: TOP + row * (CARD_H + CARD_GAP),
    w: CARD_W,
    h: CARD_H
  };
}

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

const figureArt = (trim, pivot) => ({
  w: trim[2] * SCALE * PORTRAIT_SCALE,
  h: trim[3] * SCALE * PORTRAIT_SCALE,
  a: pivot
});

const TIERS = LADDERS.flat();
const FIGURES = [
  ...TIERS.map(figureOf),
  ...Object.values(enemyTypes).map(d => figureArt(d.spriteTrim, d.pivot))
];

const TOWER_SPAN = anchored(TIERS.map(buildingOf));
const FIGURE_SPAN = anchored(FIGURES);

// The two picture slots. They are DIFFERENT WIDTHS on purpose: a building
// shrinks to fit its slot, so it can be given a narrow one, while a figure is
// drawn at the fixed PORTRAIT_SCALE and its slot has to be wide enough for the
// widest man in the game — the Giant Thug, whose club reaches 45px left of the
// spot he stands on. One slot sized for both would either crop him or waste
// 30px of every tower card's text.
//
// Height is shared, because it is the card that decides it.
const SLOT_H = CARD_H - 6;
const SLOT_Y = (CARD_H - SLOT_H) / 2;
export const TOWER_BOX = { x: 6, y: SLOT_Y, w: 48, h: SLOT_H };
export const FIGURE_BOX = { x: 6, y: SLOT_Y, w: Math.ceil(FIGURE_SPAN.w) + 2, h: SLOT_H };

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
  SCALE * Math.min(TOWER_BOX.w / TOWER_SPAN.w, TOWER_BOX.h / TOWER_SPAN.h);

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

// --- the enemies page --------------------------------------------------------

// THE SAME CARD, in the same grid. Enemies used to get full-width rows of their
// own because two of them side by side left most of the page blank — which was
// solving the wrong problem: a reference page whose boxes are three sizes reads
// as three different kinds of thing, and an enemy is exactly as much "a box
// description" as a tower is. Empty space on a short page is fine; boxes that do
// not match are not.
//
// They flow across all four columns of the spread and then down, so a third and
// fourth enemy fill the row before anything starts a second one.
export function enemyCards() {
  return Object.values(enemyTypes).map((def, i) => {
    const across = i % (COLS * HALVES.length);
    const row = Math.floor(i / (COLS * HALVES.length));
    return { def, ...cardRect(across % COLS, row, HALVES[Math.floor(across / COLS)]) };
  });
}

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

// Where the book is opened from. Two places, because there are two moments a
// player wants it: before the first tower goes down, and in the middle of a wave
// when the next upgrade has to be chosen.
export const BOOK_BTN_START = { x: 380, y: 414, w: 200, h: 46 };

// Under the "Paused" label rather than over the board. A paused game is paused
// to be LOOKED at — that is why nothing dims — so the one control it adds sits
// in the strip the dashboard already owns.
export const BOOK_BTN_PAUSE = { x: 395, y: 94, w: 170, h: 38 };

export function hitBookButton(state, x, y) {
  const b = state.started ? BOOK_BTN_PAUSE : BOOK_BTN_START;
  return inside(b, x, y);
}

export function openBook(state) {
  state.book = 0;
}

// Tapping the book's own controls. Every tap while the book is open comes here
// and none of them go anywhere else: the page covers the whole board, so nothing
// underneath may act on one — including the plot a card happens to be drawn over.
// A tap that hits none of the three controls does nothing, which is the right
// answer for a page you are reading.
export function tapBook(state, x, y) {
  if (inside(BOOK_CLOSE, x, y)) { state.book = null; return; }
  // BOTH ARROWS ALWAYS WORK, wrapping round. With two pages a disabled arrow
  // would be dead half the time it is on screen, and a control that does nothing
  // when you press it reads as the game having stopped listening.
  if (inside(BOOK_PREV, x, y)) state.book = (state.book + PAGES - 1) % PAGES;
  else if (inside(BOOK_NEXT, x, y)) state.book = (state.book + 1) % PAGES;
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
    occupier: `${man.count} x ${man.name}`,
    cost: def.cost,
    refund: refundOf(tiers, def.tier)
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
    damage: man.damage
  };
}
