// The encyclopedia: what is on its pages, whether it all fits, and whether any
// of it is a lie. Node only.
//
//   node tools/book.mjs
//
// Four kinds of thing go wrong in a reference page, and only one of them is
// visible in a screenshot.
//
// WHAT IS MISSING. The book lists every tower tier and every enemy in the game,
// and it builds those lists from the same arrays the game builds from — so the
// failure mode is not a stale number, it is a tier that quietly stops appearing
// because a fourth family pushed it off the grid, or a name field a new family
// forgot to fill in and which draws as "undefined" on a cream plate.
//
// WHAT IS WRONG. Every figure the book quotes comes through occupant(), the same
// function the info box uses, and every price comes through the same refund rate
// the radial menu pays out. A book that disagrees with the game about what a
// tower costs to take down is worse than no book, because it will be believed.
//
// WHAT DOES NOT FIT. Cards are laid out from constants, on a fixed 960x540
// board, so nothing clips at runtime and nothing warns you either — a card that
// overhangs the sheet by 4px just draws off the parchment onto the veil.
//
// WHAT IS SOFT. This page draws more art at once than any other screen in the
// game, and all of it is being downscaled from files sized for the board. A
// sprite is crisp while its drawn size times the 3x device-pixel cap fits inside
// its source pixels; the book has two scale factors and two icon heights, and
// any of the four can be nudged past that line without looking wrong on a laptop.

import { archery, barracks, siege, SCALE } from '../src/data/towers.js';
import { enemyTypes } from '../src/data/waves.js';
import { occupant } from '../src/select.js';
import { refundValue, REFUND_RATE } from '../src/menu.js';
import { ui, PORTRAIT_SCALE, BOOK_ICON_H, FOE_ICON_H } from '../src/data/ui.js';
import {
  PAGES, shelf, cardRect, enemyCards, towerEntry, unitEntry, figureSlot,
  SHEET, FOLD, HALVES, TITLE_Y, HEAD_Y, FOOT_Y, TOWER_BOX, FIGURE_BOX,
  BOOK_TOWER_SCALE, BOOK_CLOSE, BOOK_PREV, BOOK_NEXT,
  BOOK_BTN_START, BOOK_BTN_PAUSE
} from '../src/book.js';

let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(54)} ${detail}`);
  if (!cond) bad++;
};

const LADDERS = [archery, barracks, siege];
const TIERS = LADDERS.flat();

// The device-pixel cap in main.js. Art is crisp iff drawn x MAX_SCALE fits in
// the source, which is the same rule tools/trim.mjs prints its verdict from.
const MAX_SCALE = 3;

console.log('\nWhat is on the pages\n');

{
  const rows = shelf();
  ok(rows.length === TIERS.length,
    'every tower tier has a card', `${rows.length} of ${TIERS.length}`);

  const seen = new Set(rows.map(r => r.def));
  ok(seen.size === TIERS.length, 'and no tier is listed twice');

  // Families are kept whole. A ladder split across two columns reads as two
  // half-families rather than one, which is the layout's whole job.
  const spread = LADDERS.map(tiers => {
    const cols = new Set(rows.filter(r => tiers.includes(r.def)).map(r => r.col));
    return cols.size;
  });
  ok(spread.every(n => n === 1), 'and no family straddles two columns',
    spread.join('/'));

  // Consecutive rows within a family, in tier order. Otherwise tier 3 can sit
  // above tier 1 and the page reads as an unsorted list.
  const ordered = LADDERS.every(tiers => {
    const mine = rows.filter(r => tiers.includes(r.def));
    return mine.every((r, i) =>
      r.def.tier === i + 1 && (i === 0 || r.row === mine[i - 1].row + 1));
  });
  ok(ordered, 'and each ladder runs tier 1 to 3 down its column');

  ok(enemyCards().length === Object.keys(enemyTypes).length,
    'every enemy has a card', `${enemyCards().length}`);
}

console.log('\nWhat the cards say\n');

{
  // A blank string draws as nothing and `undefined` draws as the word. Both are
  // what a family wired up ahead of its names looks like.
  const named = shelf().every(({ def, tiers }) => {
    const t = towerEntry(def, tiers), u = unitEntry(def);
    return t.title && u.title && !/undefined/.test(t.occupier);
  });
  ok(named, 'every card has a title and an occupier');

  // The book quotes what the game would actually pay. Built the way input.js
  // builds one — cumulative spend up the ladder — and refunded the way the
  // radial menu refunds one.
  const priced = LADDERS.every(tiers => {
    let spent = 0;
    return tiers.every(def => {
      spent += def.cost;
      const e = towerEntry(def, tiers);
      return e.cost === def.cost && e.refund === refundValue({ spent });
    });
  });
  ok(priced, 'and its two prices are the ones the game charges and pays',
    `refund rate ${REFUND_RATE}`);

  // The upgrade path must never be worth more taken down than it cost, which is
  // a free-gold bug rather than a display one — and the book is where anyone
  // would notice it first.
  const honest = shelf().every(({ def, tiers }) =>
    towerEntry(def, tiers).refund <=
      tiers.slice(0, def.tier).reduce((n, d) => n + d.cost, 0));
  ok(honest, 'and refunding never pays more than the tower cost');

  // One source for who is inside a tower, so the book and the info box cannot
  // drift. If this ever fails, one of them has grown its own copy.
  const agrees = TIERS.every(def => unitEntry(def).title === occupant(def).name);
  ok(agrees, 'and the man named is the man the info box names');

  const counted = shelf().every(({ def, tiers }) =>
    towerEntry(def, tiers).occupier === `${occupant(def).count} x ${occupant(def).name}`);
  ok(counted, 'and the squad size is the one the barracks musters',
    `barracks ${occupant(barracks[0]).count}, everyone else ${occupant(archery[0]).count}`);
}

console.log('\nWhat fits\n');

{
  const cards = [];
  for (const { col, row } of shelf()) {
    for (const half of HALVES) cards.push(cardRect(col, row, half));
  }
  const all = [...cards, ...enemyCards()];

  const inSheet = b =>
    b.x >= SHEET.x && b.y >= SHEET.y &&
    b.x + b.w <= SHEET.x + SHEET.w && b.y + b.h <= SHEET.y + SHEET.h;

  ok(all.every(inSheet), 'every card sits on the parchment');

  // Towers on one side of the fold, men on the other.
  ok(cards.filter(b => b.x < FOLD).every(b => b.x + b.w <= FOLD),
    'nothing crosses the fold', `fold at ${FOLD}`);

  const overlap = (a, b) =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  let clashes = 0;
  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++)
      if (overlap(cards[i], cards[j])) clashes++;
  ok(clashes === 0, 'and no two cards overlap', `${clashes} clash(es)`);

  // EVERY BOX THE SAME SIZE. An enemy is exactly as much "a box description" as
  // a tower is, and a page whose boxes are three sizes reads as three different
  // kinds of thing. This is the check that keeps that true when the enemies
  // page is next given something a shelf card has no room for.
  const shape = b => `${b.w}x${b.h}`;
  const sizes = new Set(all.map(shape));
  ok(sizes.size === 1, 'and every box on both pages is the same size',
    [...sizes].join(', '));
}

console.log('\nOne margin, everywhere\n');

{
  // The complaint this section exists for: cards were 2px inside the sheet, the
  // Close button was 12, and the footer's bottom edge was flush with the
  // parchment — three numbers each chosen on its own and each fine on its own.
  // Every edge below is now measured against the SAME pad.
  const PAD = 16;
  const inner = { x: SHEET.x + PAD, y: SHEET.y + PAD,
                  r: SHEET.x + SHEET.w - PAD, b: SHEET.y + SHEET.h - PAD };

  const cards = [];
  for (const { col, row } of shelf()) {
    for (const half of HALVES) cards.push(cardRect(col, row, half));
  }

  ok(Math.min(...cards.map(b => b.x)) === inner.x,
    'the first card starts on the left margin', `${Math.min(...cards.map(b => b.x))} of ${inner.x}`);
  ok(Math.max(...cards.map(b => b.x + b.w)) === inner.r,
    'and the last one ends on the right margin', `${Math.max(...cards.map(b => b.x + b.w))} of ${inner.r}`);

  ok(BOOK_CLOSE.x === inner.x, 'Close lines up under the first card',
    `${BOOK_CLOSE.x} of ${inner.x}`);
  ok(BOOK_CLOSE.y + BOOK_CLOSE.h === inner.b,
    'and the footer sits on the bottom margin', `${BOOK_CLOSE.y + BOOK_CLOSE.h} of ${inner.b}`);

  // All three footer controls on one line, so no button is a pixel proud of its
  // neighbours.
  const feet = [BOOK_CLOSE, BOOK_PREV, BOOK_NEXT];
  ok(feet.every(b => b.y === FOOT_Y && b.h === BOOK_CLOSE.h),
    'and all three footer buttons share a baseline', `y ${FOOT_Y}`);

  // The two arrows equidistant from the fold, so "Page 1 / 2" is centred in a
  // gap of the same width on both sides rather than looking centred.
  ok(FOLD - (BOOK_PREV.x + BOOK_PREV.w) === BOOK_NEXT.x - FOLD,
    'and the two arrows are equidistant from the fold',
    `${FOLD - (BOOK_PREV.x + BOOK_PREV.w)}px each side`);

  const bottom = Math.max(...cards.map(b => b.y + b.h));
  ok(FOOT_Y - bottom === PAD, 'the gap above the footer is the outer margin',
    `${FOOT_Y - bottom} of ${PAD}`);

  ok(TITLE_Y > inner.y && HEAD_Y > TITLE_Y && Math.min(...cards.map(b => b.y)) > HEAD_Y,
    'and the two headings sit above the grid in order',
    `title ${TITLE_Y}, heading ${HEAD_Y}, cards ${Math.min(...cards.map(b => b.y))}`);
}

console.log('\nEverything stands on its shadow\n');

{
  // A bounding box is not where a thing is. Both slots are sized from the
  // SHADOW-ANCHORED span, so this is the check that a redrawn building or a man
  // carrying something longer has not quietly started hanging out of its card.
  const k = BOOK_TOWER_SCALE / SCALE;
  const fits = TIERS.every(d => {
    const a = towerEntry(d, archery).art;
    const x = a.anchor.x - d.groundFrac[0] * d.w * k;
    const y = a.anchor.y - d.groundFrac[1] * d.h * k;
    return x >= TOWER_BOX.x - 0.01 && y >= TOWER_BOX.y - 0.01 &&
      x + d.w * k <= TOWER_BOX.x + TOWER_BOX.w + 0.01 &&
      y + d.h * k <= TOWER_BOX.y + TOWER_BOX.h + 0.01;
  });
  ok(fits, 'every building fits its slot once anchored on its shadow',
    `${k.toFixed(3)}x board scale`);

  // The largest one actually filling its slot is what proves the factor is
  // derived rather than typed and left behind by a redraw.
  const spanH = Math.max(...TIERS.map(d => d.groundFrac[1] * d.h)) +
                Math.max(...TIERS.map(d => (1 - d.groundFrac[1]) * d.h));
  ok(Math.abs(spanH * k - TOWER_BOX.h) < 0.6, 'and the shelf fills the height it is given',
    `${(spanH * k).toFixed(1)} of ${TOWER_BOX.h}`);

  // Figures are drawn at the FIXED PORTRAIT_SCALE — they never shrink to fit —
  // so their slot has to be wide enough for the widest man in the game rather
  // than the other way round.
  const men = [
    ...TIERS.map(d => unitEntry(d)),
    ...Object.values(enemyTypes).map(d => ({ trim: d.spriteTrim, art: figureSlot(d.spriteTrim, d.pivot) }))
  ];
  const inBox = men.every(m => {
    const x = m.art.anchor.x - m.art.a[0] * m.art.w;
    const y = m.art.anchor.y - m.art.a[1] * m.art.h;
    return x >= FIGURE_BOX.x - 0.01 && y >= FIGURE_BOX.y - 0.01 &&
      x + m.art.w <= FIGURE_BOX.x + FIGURE_BOX.w + 0.01 &&
      y + m.art.h <= FIGURE_BOX.y + FIGURE_BOX.h + 0.01;
  });
  ok(inBox, 'every figure fits its slot at the fixed portrait scale',
    `${FIGURE_BOX.w}x${FIGURE_BOX.h}`);

  // The whole point: one anchor point per slot, so a column lines up. If any
  // drawing were placed by its box instead, its anchor would land somewhere
  // else and this would differ.
  const anchors = new Set(men.map(m => `${m.art.anchor.x.toFixed(2)},${m.art.anchor.y.toFixed(2)}`));
  ok(anchors.size === 1, 'and every man in a column stands on the same point',
    [...anchors][0]);

  // Nobody may be missing a pivot: a figure with none would be centred by its
  // box while the row beside it stood on a line, which is exactly the fault the
  // catapult crewman had before he was measured.
  ok(TIERS.every(d => unitEntry(d).art.a), 'and no figure is missing a shadow anchor');
}

console.log('\nWhat you can hit\n');

{
  // 44 REAL px is the touch minimum, and the narrowest canvas this game targets
  // is 667 CSS px across a 960-unit board — so a target needs 44 * 960 / 667 =
  // 63.3 logical px. Every control below is drawn smaller than that and padded
  // out to it in the hit test, the same trick the dashboard uses.
  const MIN = 44 * 960 / 667;
  const PAD = 13;   // BOOK_PAD in src/book.js

  const targets = {
    Close: BOOK_CLOSE, Prev: BOOK_PREV, Next: BOOK_NEXT,
    'open (title)': BOOK_BTN_START, 'open (paused)': BOOK_BTN_PAUSE
  };

  for (const [name, b] of Object.entries(targets)) {
    const w = b.w + 2 * PAD, h = b.h + 2 * PAD;
    ok(w >= MIN && h >= MIN, `${name} is thumb-sized`,
      `${w}x${h} of ${MIN.toFixed(1)} needed`);
  }

  // Two footer buttons whose padded boxes touch would give the overlap to
  // whichever was tested first, silently.
  ok(BOOK_PREV.x + BOOK_PREV.w + PAD < BOOK_NEXT.x - PAD,
    'and the two arrows do not share a pixel',
    `${BOOK_NEXT.x - PAD - (BOOK_PREV.x + BOOK_PREV.w + PAD)}px apart`);

  // Everything the footer draws has to be on the sheet to be pressed.
  const onSheet = Object.values(targets).slice(0, 3).every(b =>
    b.x >= SHEET.x && b.x + b.w <= SHEET.x + SHEET.w &&
    b.y + b.h <= SHEET.y + SHEET.h);
  ok(onSheet, 'and the footer is inside the page it belongs to');

  ok(PAGES >= 2, 'there is more than one page to flip between', `${PAGES}`);
}

console.log('\nWhat stays sharp at 3x\n');

{
  // Figures, at the same factor the info box uses.
  const ceiling = 1 / (MAX_SCALE * SCALE);
  ok(PORTRAIT_SCALE <= ceiling, 'portraits',
    `${PORTRAIT_SCALE}x board scale, ceiling ${ceiling.toFixed(3)}x`);

  // Buildings. Always a downscale, so this can only fail if the slot grows.
  const k = BOOK_TOWER_SCALE / SCALE;
  ok(k <= ceiling, 'building thumbnails', `${k.toFixed(3)}x board scale`);

  // Icons, which are NOT sized by any board scale — a book row's icon is 14px
  // because the number beside it is 12. So each one is checked against its own
  // source height.
  const icons = [
    ['stat_cost', BOOK_ICON_H], ['glyph_refund', BOOK_ICON_H],
    ['stat_health', BOOK_ICON_H], ['stat_damage', BOOK_ICON_H],
    ['stat_health', FOE_ICON_H], ['stat_damage', FOE_ICON_H],
    ['hud_gold', FOE_ICON_H], ['hud_life', FOE_ICON_H]
  ];

  let soft = 0;
  for (const [key, h] of icons) {
    const src = ui[key].trim[3];
    if (h * MAX_SCALE > src) { soft++; console.log(`      ${key} at ${h}px needs ${h * MAX_SCALE} source px, has ${src}`); }
  }
  ok(soft === 0, 'every icon on the page', `${icons.length} checked at ${BOOK_ICON_H}px and ${FOE_ICON_H}px`);
}

console.log(bad ? `\n${bad} problem(s) with the encyclopedia.` : '\nThe encyclopedia holds together.');
process.exit(bad ? 1 : 0);
