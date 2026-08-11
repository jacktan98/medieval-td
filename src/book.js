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

export const PAGES = 2;

// --- the shelf ---------------------------------------------------------------

// The tower ladders, in build-menu order. Read from the same arrays the game
// builds from, so a tier whose cost or damage changes changes here too and there
// is no second table to forget.
const LADDERS = [archery, barracks, siege];

const ROWS = 6;          // per column, per half

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

const TOP = 72;          // under the page heading
const CARD_H = 65;
const CARD_GAP = 6;
const CARD_W = 226;
const SIDE = 10;         // margin at each edge of a half
const COL_GAP = 8;

// The left half is towers and the right half is men. 480 is the fold.
//
// Named FOLD rather than HALF because render.js already has a HALF — the [0.5,
// 0.5] anchor every centred icon is drawn from — and two of them in one module
// is a redeclaration the browser reports as a blank page.
export const FOLD = 480;

export function cardRect(col, row, fold) {
  return {
    x: fold + SIDE + col * (CARD_W + COL_GAP),
    y: TOP + row * (CARD_H + CARD_GAP),
    w: CARD_W,
    h: CARD_H
  };
}

// The picture slot inside a card, on its left. Everything else in the card is
// text, laid out from the right-hand edge of this box.
export const ART_BOX = { x: 6, w: 60, h: CARD_H - 8 };

// ONE FACTOR FOR EVERY BUILDING, exactly as PORTRAIT_SCALE is one factor for
// every figure, and for the same reason: fitting each drawing to the slot would
// draw a Militia Camp and a Catapult the same size, which is a lie about the two
// buildings the player is choosing between. Sized so the LARGEST tower fits and
// the rest come out in proportion to it.
//
// Derived from the defs rather than typed, so a redrawn building that is taller
// than anything before it shrinks the whole shelf by itself instead of hanging
// over the card above.
//
// It is always well under 1, so a thumbnail is always a downscale of art that is
// already sharp at 1x — the crispness question that PORTRAIT_SCALE has to answer
// carefully does not arise on this side of the page.
const tallest = Math.max(...LADDERS.flat().map(d => d.h));
const widest = Math.max(...LADDERS.flat().map(d => d.w));
export const BOOK_TOWER_SCALE = SCALE * Math.min(ART_BOX.w / widest, ART_BOX.h / tallest);

// --- the enemies page --------------------------------------------------------

// FULL-WIDTH ROWS, stacked, rather than two cards side by side. There are only
// two enemies in the game, and side by side they left two thirds of the page
// blank while each card's own contents were crammed into a 2x2 grid. Across the
// page instead, the four stats sit in ONE row — which is also how they read: hp,
// damage, what killing it pays, what letting it through costs, in that order.
//
// A third and fourth enemy will fit the same way. A fifth will not, and the
// answer then is a third page rather than shrinking these.
const ENEMY_W = 904, ENEMY_H = 172, ENEMY_GAP = 24;

export function enemyCards() {
  const list = Object.values(enemyTypes);
  const total = list.length * ENEMY_H + (list.length - 1) * ENEMY_GAP;
  const top = TOP + Math.round((492 - TOP - total) / 2);

  return list.map((def, i) => ({
    def,
    x: Math.round((960 - ENEMY_W) / 2),
    y: top + i * (ENEMY_H + ENEMY_GAP),
    w: ENEMY_W,
    h: ENEMY_H
  }));
}

// Inside an enemy card: the picture slot, and where the stat row starts.
//
// The slot is as tall as the tallest enemy is DRAWN, so bottom-anchoring both
// figures stands them on one line with no dead air above the smaller one. That
// shared line is the whole point of the page: a Giant Thug is nearly twice a
// Thug, and two portraits floating in boxes of their own would throw that away.
export const FOE_BOX = { x: 24, w: 130 };
export const FOE_TEXT = 172;   // from the card's left edge

// --- controls ----------------------------------------------------------------

// The footer. Close on the left where a thumb rests, the flip in the middle.
export const BOOK_CLOSE = { x: 20, y: 494, w: 110, h: 38 };
export const BOOK_PREV = { x: 372, y: 494, w: 56, h: 38 };
export const BOOK_NEXT = { x: 532, y: 494, w: 56, h: 38 };

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
    w: def.w * (BOOK_TOWER_SCALE / SCALE),
    h: def.h * (BOOK_TOWER_SCALE / SCALE),
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
    hp: man.hp,
    damage: man.damage
  };
}
