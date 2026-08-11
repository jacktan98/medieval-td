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
  PAGES, shelf, cardRect, enemyCards, towerEntry, unitEntry,
  ART_BOX, FOLD, BOOK_TOWER_SCALE, FOE_BOX, FOE_TEXT,
  BOOK_CLOSE, BOOK_PREV, BOOK_NEXT, BOOK_BTN_START, BOOK_BTN_PAUSE
} from '../src/book.js';

let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(54)} ${detail}`);
  if (!cond) bad++;
};

const LADDERS = [archery, barracks, siege];
const TIERS = LADDERS.flat();

// The parchment sheet, from render.js. Repeated rather than imported because
// importing render.js into a node tool drags in the whole draw path; it is one
// rect and the check below is what keeps it honest.
const SHEET = { x: 8, y: 8, w: 944, h: 524 };

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
    cards.push(cardRect(col, row, 0));
    cards.push(cardRect(col, row, FOLD));
  }

  const inSheet = b =>
    b.x >= SHEET.x && b.y >= SHEET.y &&
    b.x + b.w <= SHEET.x + SHEET.w && b.y + b.h <= SHEET.y + SHEET.h;

  ok(cards.every(inSheet), 'every shelf card sits on the parchment');
  ok(enemyCards().every(inSheet), 'and so does every enemy card');

  // The footer is drawn over the sheet, so cards must stop above it.
  const foot = Math.min(BOOK_CLOSE.y, BOOK_PREV.y, BOOK_NEXT.y);
  ok(cards.every(b => b.y + b.h <= foot) && enemyCards().every(b => b.y + b.h <= foot),
    'and clear of the footer', `cards end by ${Math.max(...cards.map(b => b.y + b.h))}, footer at ${foot}`);

  // Towers on one side of the fold, men on the other.
  const left = cards.filter(b => b.x < FOLD);
  ok(left.every(b => b.x + b.w <= FOLD), 'nothing crosses the fold',
    `fold at ${FOLD}`);

  const overlap = (a, b) =>
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  let clashes = 0;
  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++)
      if (overlap(cards[i], cards[j])) clashes++;
  ok(clashes === 0, 'and no two cards overlap', `${clashes} clash(es)`);

  // A tower drawn taller than its slot hangs into the card above it. This is
  // the check that BOOK_TOWER_SCALE is actually derived from the defs rather
  // than typed in and left behind by a redraw.
  const k = BOOK_TOWER_SCALE / SCALE;
  const fits = TIERS.every(d => d.w * k <= ART_BOX.w + 0.01 && d.h * k <= ART_BOX.h + 0.01);
  ok(fits, 'every building fits its picture slot',
    `${k.toFixed(3)}x board scale, tallest ${Math.max(...TIERS.map(d => d.h * k)).toFixed(1)} of ${ART_BOX.h}`);

  // One factor for all of them, which is the reason a Militia Camp reads as
  // bigger than a Catapult here as well as on the board.
  const biggest = TIERS.reduce((a, d) => (d.h > a.h ? d : a));
  ok(Math.abs(biggest.h * k - ART_BOX.h) < 0.5 || Math.abs(biggest.w * k - ART_BOX.w) < 0.5,
    'and the largest one actually fills it', `${biggest.name}`);

  // Enemy portraits stand on a shared line inside a full-width row.
  const foeW = Math.max(...Object.values(enemyTypes)
    .map(d => d.spriteTrim[2] * SCALE * PORTRAIT_SCALE));
  ok(foeW <= FOE_BOX.w, 'the widest enemy fits its slot',
    `${foeW.toFixed(1)} of ${FOE_BOX.w}`);
  ok(FOE_BOX.x + FOE_BOX.w <= FOE_TEXT, 'and the picture never runs into the text',
    `slot ends ${FOE_BOX.x + FOE_BOX.w}, text at ${FOE_TEXT}`);
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
