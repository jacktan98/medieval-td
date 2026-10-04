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

import { archery, barracks, siege, monastery, SCALE } from '../src/data/towers.js';
import { enemyTypes } from '../src/data/waves.js';
import { occupant } from '../src/select.js';
import { refundValue, REFUND_RATE } from '../src/menu.js';
import { ui, PORTRAIT_SCALE, BOOK_ICON_H,
         canvasScale, MIN_SCALE, MAX_SCALE } from '../src/data/ui.js';
import { ABILITIES } from '../src/data/abilities.js';
import {
  PAGES, shelf, pageItems, pageEntry, towerEntry, unitEntry, towerArt, figureArt, figureFit,
  COLUMNS, ROWS, CELL_W, CELL_H, AIR, ABILITY_ICON, BOOK_TOWER_K, BOOK_FIGURE_SCALE,
  SHEET, FOLD, LEFT, RIGHT, TITLE_Y, FOOT_Y, FRAME, FRAME_SMALL, frameFor, frameSlot, FRAME_AIR,
  BAND_X, BAND_W, BAND_H, BAND_GAP, BAND_COLUMNS, STAGE_BTN, staged,
  BOOK_CLOSE, BOOK_PREV, BOOK_NEXT, BOOK_ICON_HIT, popSlot
} from '../src/book.js';
// The paused game's own row — the book's second entrance and the Quit beside it
// — belongs to the HUD rather than to the book, so it is checked from there.
import { PAUSE_ROW, ENTRY_NAME, ENTRY_SUB, ENTRY_TEXT, ENTRY_LEAD, ENTRY_TEXT_W, ENTRY_ICON_H,
         ENTRY_TEXT_SMALL, ENTRY_LEAD_SMALL, PARA_GAP } from '../src/render.js';
import { uiSize } from '../src/data/ui.js';

let bad = 0;
const ok = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'}  ${label.padEnd(54)} ${detail}`);
  if (!cond) bad++;
};

const LADDERS = [archery, barracks, siege, monastery];
const TIERS = LADDERS.flat();

// MAX_SCALE is the device-pixel ceiling, imported above rather than copied: art is
// crisp iff drawn x MAX_SCALE fits in the source, which is the same rule
// tools/trim.mjs prints its verdict from, and a second 3 typed in here is a second
// thing to change.

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
  //
  // NON-DECREASING RATHER THAN 1,2,3,4, because archery forks: it runs
  // 1,2,3,4,4, with the Musketeer Post and the Crossbow Sentry stacked at the
  // bottom of one column. What has to hold is that a reader going down a column
  // never goes backwards, and that the rows are consecutive.
  const ordered = LADDERS.every(tiers => {
    const mine = rows.filter(r => tiers.includes(r.def));
    return mine[0].def.tier === 1 && mine.every((r, i) =>
      i === 0 || (r.def.tier >= mine[i - 1].def.tier && r.row === mine[i - 1].row + 1));
  });
  ok(ordered, 'and each ladder runs down its column without going backwards');

  // AND A FORK IS ONLY EVER AT THE TOP, which is load-bearing rather than tidy:
  // refundOf in menu.js prices a tier by summing every rung BELOW it, and that
  // sum is only a ladder if there is one rung per tier down there. A family given
  // a choice at tier 2 would quote a refund that added both branches together.
  const forkedLow = LADDERS.flatMap(tiers => {
    const top = Math.max(...tiers.map(d => d.tier));
    const count = new Map();
    for (const d of tiers) count.set(d.tier, (count.get(d.tier) || 0) + 1);
    return [...count].filter(([tier, n]) => n > 1 && tier < top).map(([tier]) => tier);
  });
  ok(forkedLow.length === 0, 'and any fork in a ladder is at its top rung',
    LADDERS.map(t => t.map(d => d.tier).join('')).join(' / '));

  // EVERY CREATURE HAS A PICTURE on the enemy page, the boss included — a check
  // that counted only the roster would quietly stop covering him.
  const foes = pageItems(3);
  ok(foes.length === Object.keys(enemyTypes).length,
    'every enemy has a picture, the boss among them',
    `${foes.filter(c => !c.boss).length} + ${foes.filter(c => c.boss).length} boss`);

  ok(pageItems(2).length === ABILITIES.length,
    'and every ability has one', `${pageItems(2).length}`);

  // THE BOSS STARTS A ROW OF HIS OWN, under the roster rather than among it.
  const lastFoe = Math.max(...foes.filter(c => !c.boss).map(c => c.y));
  ok(foes.filter(c => c.boss).every(c => c.y > lastFoe && c.x === LEFT.x + (c.x - LEFT.x)),
    'and the boss stands on a row below the roster');

  // EVERY ABILITY A TIER OFFERS IS ON THE PAGE, and nothing on the page is
  // offered by nobody. Both halves matter: an ability wired to a tower and left
  // out of the book is undiscoverable, and one in the book that no tower teaches
  // is a promise the game does not keep.
  const offered = new Set(TIERS.flatMap(d => d.abilities || []));
  ok(ABILITIES.every(a => offered.has(a.id)) && offered.size === ABILITIES.length,
    'and the page lists exactly what the towers offer',
    `${offered.size} offered, ${ABILITIES.length} listed`);
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
  //
  // SUMMED BY TIER, not by walking the array, because a forked ladder's array
  // order is not a path any player takes: nobody buys a Musketeer Post and then a
  // Crossbow Sentry. What each one costs to reach is every rung below it plus
  // itself, which is exactly what refundOf does and what this re-derives
  // independently.
  const priced = LADDERS.every(tiers => tiers.every(def => {
    const spent = tiers.reduce((sum, d) => sum + (d.tier < def.tier ? d.cost : 0), 0) + def.cost;
    const e = towerEntry(def, tiers);
    return e.cost === def.cost && e.refund === refundValue({ spent });
  }));
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

  // AND EVERY QUANTITY IS A NUMERAL. A standing instruction from the owner, first
  // given about the tower cards — "ensure encyclopedia description is in numbers
  // (e.g. two and a half in sneak attack is 2.5x)" — and repeated about the
  // ability cards, which is what this holds.
  //
  // WHY IT IS WORTH A CHECK RATHER THAN A HABIT: a card is prose, so the natural
  // thing to type is "two chevrons" and "slowing him twice", and prose is exactly
  // what nothing else in this repository measures. Both of those shipped.
  //
  // THE LIST IS DELIBERATELY SHORT. `one` and the ordinals are not in it and must
  // not be: "the one tower with no dead zone" and "the first blow of a fight" are
  // pronouns and prose rather than counts, and a rule that flagged them would be
  // noise, and a noisy check is a check that gets ignored. What is here is the
  // spelled cardinals from two up and the multiplier words, which in this file's
  // vocabulary are always a quantity that has a digit.
  const SPELLED = /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twice|thrice|half|quarter)\b/gi;
  const wordy = ABILITIES
    .map(a => [a.name, [...new Set([...(a.detail || '').matchAll(SPELLED)].map(m => m[0]))]])
    .filter(([, hits]) => hits.length);
  ok(wordy.length === 0, 'and every quantity on an ability card is a numeral',
    wordy.length ? wordy.map(([n, h]) => `${n}: ${h.join(', ')}`).join('; ')
                 : `${ABILITIES.length} cards checked`);
}

console.log('\nThe left page\n');

{
  const pages = [0, 1, 2, 3].map(pageItems);
  const all = pages.flat();

  // THE OVERFLOW CHECK: a fifth family or a twenty-first enemy has nowhere to go,
  // and nothing would complain — the cell would simply be drawn off the page.
  const inLeft = c => c.x >= LEFT.x && c.x + c.w <= LEFT.r && c.y >= TITLE_Y && c.y + c.h <= FOOT_Y;
  ok(all.every(inLeft), 'every picture sits on the left page, above the footer',
    `${CELL_W}x${CELL_H} cells, ${COLUMNS} by ${ROWS}`);
  ok(all.every(c => c.x + c.w <= FOLD), 'and nothing crosses the fold', `fold at ${FOLD}`);

  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  let clashes = 0;
  for (const items of pages)
    for (let i = 0; i < items.length; i++)
      for (let j = i + 1; j < items.length; j++) if (overlap(items[i], items[j])) clashes++;
  ok(clashes === 0, 'and no two pictures on a page overlap', `${clashes} clash(es)`);

  // EVERY GAP THE SAME, across and down, measured off the cells the towers page
  // draws rather than off the constant.
  const towers = pages[0];
  const at = (c, r) => towers.find(t => t.x === towers.find(u => u.col === c)?.x);
  const xs = [...new Set(towers.map(c => c.x))].sort((a, b) => a - b);
  const ys = [...new Set(towers.map(c => c.y))].sort((a, b) => a - b);
  const gaps = new Set([
    ...xs.slice(1).map((x, i) => x - (xs[i] + CELL_W)),
    ...ys.slice(1).map((y, i) => y - (ys[i] + CELL_H))
  ]);
  ok(gaps.size === 1, 'and every gap between pictures is the same', [...gaps].join(', '));

  // THE GRID IS CENTRED ON ITS PAGE, so the left page reads as a page.
  const left = xs[0] - LEFT.x, right = LEFT.r - (xs[xs.length - 1] + CELL_W);
  ok(Math.abs(left - right) <= 1, 'and the grid is centred on the left page',
    `${left}px and ${right}px either side`);

  ok(ABILITY_ICON + 2 * AIR <= CELL_H, 'the ability disc fits its cell', `${ABILITY_ICON}px in ${CELL_H}`);
}

console.log('\nEverything stands on its shadow\n');

{
  // A bounding box is not where a thing is. Every building is placed by its own
  // shadow at one shared point, and has to fit its cell from there.
  const inCell = (s) => {
    const x = s.anchor.x - s.a[0] * s.w, y = s.anchor.y - s.a[1] * s.h;
    return x >= -0.01 && y >= -0.01 && x + s.w <= CELL_W + 0.01 && y + s.h <= CELL_H + 0.01;
  };
  ok(TIERS.every(d => inCell(towerArt(d))), 'every building fits its cell, anchored on its shadow',
    `${BOOK_TOWER_K.toFixed(3)}x`);
  const lines = new Set(TIERS.map(d => towerArt(d).anchor.y.toFixed(3)));
  ok(lines.size === 1, 'and every tower stands on the same line', [...lines][0]);

  const men = [
    ...TIERS.map(d => { const m = occupant(d); return figureArt(m.trim, m.pivot, figureFit(d)); }),
    ...Object.values(enemyTypes).map(d => figureArt(d.spriteTrim, d.pivot, figureFit(d)))
  ];
  ok(men.every(inCell), 'every figure fits its cell, the boss shrunk to fit if he must',
    `boss at ${figureFit(Object.values(enemyTypes).find(d => d.boss)).toFixed(2)}x`);
  const anchors = new Set(men.map(m => `${m.anchor.x.toFixed(2)},${m.anchor.y.toFixed(2)}`));
  ok(anchors.size === 1, 'and every man stands on the same point', [...anchors][0]);
  ok(TIERS.every(d => occupant(d).pivot), 'and no figure is missing a shadow anchor');
}

console.log('\nThe right page\n');

{
  // THE DEEPEST PAGE FITS ABOVE THE FOOTER. There is no canvas out here to measure
  // the prose with, so it is estimated at 0.45em a character — measured in the
  // browser, the widest whole description in Lobster sets at 0.40em, so this is
  // the pessimistic side of true and counts MORE lines than the page draws.
  // Lines and paragraph breaks, separately: a break is PARA_GAP of a line.
  const wrapLines = (text, size) => {
    const EM = 0.45 * size;
    let n = 0, breaks = 0;
    for (const para of text.split('\n\n')) {
      if (n) breaks++;
      let line = '';
      for (const word of para.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (line && next.length * EM > ENTRY_TEXT_W) { n++; line = word; } else line = next;
      }
      if (line) n++;
    }
    return { n, breaks };
  };
  // The same walk drawBookEntry makes down the page: frame, name, line, the bands,
  // and then the words.
  const bottomOf = (item, state) => {
    const e = pageEntry(state, item);
    const f = frameFor(item.kind);
    let y = f.y + f.h + 26 + ENTRY_NAME / 2 + 6;
    if (e.sub) y += ENTRY_SUB + 8;
    y += 4;
    const rows = Math.ceil(e.bands.length / BAND_COLUMNS);
    y += rows * BAND_H + Math.max(0, rows - 1) * BAND_GAP + 14;
    if (e.prose) {
      const small = item.kind === 'ability';
      const { n, breaks } = wrapLines(e.prose, small ? ENTRY_TEXT_SMALL : ENTRY_TEXT);
      const lead = small ? ENTRY_LEAD_SMALL : ENTRY_LEAD;
      y += n * lead + breaks * lead * PARA_GAP;
    }
    return { y, name: e.title };
  };
  let deepest = { y: 0 };
  for (const page of [0, 1, 2, 3]) {
    for (const item of pageItems(page)) {
      for (const stage of [1, 2]) {
        const b = bottomOf(item, { bookStage: stage });
        if (b.y > deepest.y) deepest = b;
      }
    }
  }
  ok(deepest.y <= FOOT_Y - 6, 'every page\'s words and numbers end above the footer',
    `deepest is ${deepest.name}, to ${deepest.y.toFixed(0)} of ${FOOT_Y}`);

  // THE FRAME, THE BANDS AND THE BOSS'S SWITCH ARE ON THE RIGHT PAGE.
  const onRight = b => b.x >= RIGHT.x && b.x + b.w <= RIGHT.r;
  ok([FRAME, FRAME_SMALL, ...STAGE_BTN].every(onRight) &&
     BAND_X >= RIGHT.x && BAND_X + BAND_COLUMNS * BAND_W + (BAND_COLUMNS - 1) * BAND_GAP <= RIGHT.r,
    'and the frame, the bands and the stage switch sit on the right page');
  ok(STAGE_BTN.every(b => b.x >= FRAME.x + FRAME.w),
    'and the switch stands clear of the frame', `${STAGE_BTN[0].x - (FRAME.x + FRAME.w)}px`);

  // EVERY DRAWING OF A KIND FITS ITS FRAME at one factor, at both ends of the range
  // the game is drawn at, and never more than its own pixels.
  const kinds = {
    tower: TIERS.map(d => d.spriteTrim),
    figure: [...TIERS.map(d => occupant(d).trim), ...Object.values(enemyTypes).map(d => d.spriteTrim)]
  };
  for (const [label, cap] of [['1x', 1], ['3x', 1 / MAX_SCALE]]) {
    for (const [kind, trims] of Object.entries(kinds)) {
      const k = frameSlot(kind, FRAME, cap);
      const fits = trims.every(t => t[2] * k <= FRAME.w - 2 * FRAME_AIR + 0.01 &&
                                     t[3] * k <= FRAME.h - 2 * FRAME_AIR + 0.01);
      ok(fits && k <= cap + 0.001, `at ${label}, every ${kind} fits its frame`, `${k.toFixed(3)}x`);
    }
  }

  // EVERY CREATURE WITH TWO STAGES has the switch; nothing else does.
  ok(pageItems(3).every(c => pageEntry({ bookStage: 1 }, c).staged === staged(c.def)),
    'and only a two-stage boss has a stage switch');
}

console.log('\nWhat you can hit\n');

{
  // 44 REAL px is the touch minimum, and the narrowest canvas this game targets
  // is 667 CSS px across a 960-unit board — so a target needs 44 * 960 / 667 =
  // 63.3 logical px. Every control below is drawn smaller than that and padded
  // out to it in the hit test, the same trick the dashboard uses.
  const MIN = 44 * 960 / 667;
  const PAD = 13;   // BOOK_PAD in src/book.js; a picture's cell is padded by half a gap

  const targets = {
    Close: BOOK_CLOSE, Prev: BOOK_PREV, Next: BOOK_NEXT,
    'Stage 1': STAGE_BTN[0], 'Stage 2': STAGE_BTN[1],
    'a picture': { x: 0, y: 0, w: CELL_W - 2 * PAD + 8, h: CELL_H - 2 * PAD + 8 },
    'open (map)': BOOK_ICON_HIT,
    'restart (paused)': PAUSE_ROW.restart, 'quit (paused)': PAUSE_ROW.quit
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

  // THE ONE THAT MATTERS MOST: the paused row puts Quit beside Restart, and both
  // throw work away. Their padded boxes touching would hand a mis-tap to whichever
  // was tested first. (The book's button left this row — the Encyclopedia opens
  // from the world map only.)
  const PAUSE_PAD = 13;
  const gap = (PAUSE_ROW.quit.x - PAUSE_PAD) -
              (PAUSE_ROW.restart.x + PAUSE_ROW.restart.w + PAUSE_PAD);
  ok(gap > 0, 'and Quit does not share a pixel with Restart beside it',
    `${gap}px of clear air`);

  // THE TWO STAGE BUTTONS, one above the other, must not share a pixel either.
  ok(STAGE_BTN[0].y + STAGE_BTN[0].h + PAD <= STAGE_BTN[1].y - PAD,
    'and the two stage buttons do not share a pixel', `${STAGE_BTN[1].y - (STAGE_BTN[0].y + STAGE_BTN[0].h)}px drawn gap`);

  // The footer: the flip centred under the grid, Close at the foot of the right
  // page, all three on one line on the bottom margin.
  ok([BOOK_CLOSE, BOOK_PREV, BOOK_NEXT].every(b => b.y === FOOT_Y && b.y + b.h === LEFT.b),
    'and the footer sits on the bottom margin', `y ${FOOT_Y}`);
  ok(Math.abs((LEFT.x + LEFT.w / 2) - (BOOK_PREV.x + BOOK_PREV.w) - (BOOK_NEXT.x - (LEFT.x + LEFT.w / 2))) < 0.01,
    'and the arrows are centred under the grid');
  ok(BOOK_CLOSE.x >= RIGHT.x && BOOK_CLOSE.x + BOOK_CLOSE.w === RIGHT.r,
    'and Close stands at the right margin of the right page');

  ok(PAGES >= 2, 'there is more than one page to flip between', `${PAGES}`);
}

console.log('\nThe picture pop-up\n');

{
  const towers = TIERS.map(d => d.spriteTrim);
  const figures = [...TIERS.map(d => occupant(d).trim),
                   ...Object.values(enemyTypes).map(d => d.spriteTrim)];
  const abilities = ABILITIES.map(a => ui[a.icon].trim);

  // THE PLATE IS A FUNCTION OF THE DISPLAY NOW, so every check below is asked at
  // both ends of the range the game can be drawn at: cap 1 is a laptop at one real
  // pixel per logical one, and 1/3 is the densest canvas fitToDisplay will ever
  // build. Checking one of them would leave the other free to be wrong, and the
  // wrong one would be whichever the artist happened not to be sitting at — which
  // is exactly how this was reported: crisp on a laptop, soft on a big monitor.
  const CAPS = [['1x', 1], ['3x', 1 / MAX_SCALE]];

  // ONE PLATE PER KIND. The pop-up used to be sized to whatever it held, so every
  // tower opened a different box and tapping down a column made the frame jump
  // about. This is the check for the fix, and it is the strong form: not "the
  // plates are similar" but "every drawing of a kind fits the one plate that kind
  // has", which is what makes them identical rather than merely close.
  const fits = (trims, slot) => trims.every(t =>
    t[2] * slot.k <= slot.w + 0.001 && t[3] * slot.k <= slot.h + 0.001);

  // And the plate is sized to the LARGEST drawing of its kind, so at least one
  // member has to reach an edge of it. A plate bigger than everything in it is a
  // frame with a permanent margin nobody chose.
  const touches = (trims, slot) =>
    trims.some(t => Math.abs(t[2] * slot.k - slot.w) < 0.001) &&
    trims.some(t => Math.abs(t[3] * slot.k - slot.h) < 0.001);

  for (const [label, cap] of CAPS) {
    const kinds = {
      tower: [towers, popSlot('tower', cap)],
      figure: [figures, popSlot('figure', cap)],
      ability: [abilities, popSlot('ability', cap)]
    };

    for (const [kind, [trims, slot]] of Object.entries(kinds)) {
      ok(fits(trims, slot) && touches(trims, slot),
        `at ${label}, every ${kind} fits its one plate`,
        `${slot.w.toFixed(0)}x${slot.h.toFixed(0)} at ${slot.k.toFixed(3)}x`);
    }

    // NOTHING IS EVER INVENTED, and this is the rule the artist reported against.
    // A drawing shown at 1:1 in logical units is blown up by whatever the canvas
    // is scaled to, so the cap has to come off the SCREEN rather than off the
    // board: at 3x the largest honest factor is a third, and no plate may exceed
    // whatever the display allows.
    const worst = Math.max(...Object.values(kinds).map(([, slot]) => slot.k));
    ok(worst <= cap + 0.001, `and nothing at ${label} is bigger than its own pixels`,
      `worst ${worst.toFixed(3)}x of ${cap.toFixed(3)}x`);
  }

  // THE ABILITY BUTTONS ARE A CIRCLE IN A SQUARE, and the pop-up clips them to
  // one because the artist draws them round. That only works
  // while the plate is square: a rectangular plate would clip to the shorter side
  // and eat the disc. tools/trim.mjs checks the FILES are square; this checks the
  // plate they are shown in is.
  const disc = popSlot('ability', 1);
  ok(Math.abs(disc.w - disc.h) < 0.001,
    'and the ability plate is square, so its clip is a circle',
    `${disc.w.toFixed(0)}x${disc.h.toFixed(0)}`);

  ok(ABILITIES.every(a => a.detail && a.detail.length > 80),
    'every ability has a description for its page',
    ABILITIES.map(a => (a.detail || '').length).join('/') + ' chars');

  // NOTHING BUT AN ABILITY AND AN ENEMY SAYS ANYTHING: a tower and a man are
  // icons and numbers, at the owner's word.
  const worded = shelf().filter(({ def, tiers }) =>
    pageEntry({}, { kind: 'tower', def, tiers }).prose != null ||
    pageEntry({}, { kind: 'unit', def }).prose != null);
  ok(worded.length === 0, 'no tower and no man has a paragraph',
    worded.map(({ def }) => def.name).join(', ') || `${shelf().length} tiers and their men`);
}

console.log('\nWhat stays sharp at 3x\n');

{
  // Figures. The book draws them a tenth smaller than the info box, so the box
  // is the one that has to clear the ceiling — but check both, because the book
  // is where the sizing is decided and a change there must not overtake it.
  const ceiling = 1 / (MAX_SCALE * SCALE);
  ok(PORTRAIT_SCALE <= ceiling, 'portraits, in the info box',
    `${PORTRAIT_SCALE}x board scale, ceiling ${ceiling.toFixed(3)}x`);
  ok(BOOK_FIGURE_SCALE <= PORTRAIT_SCALE, 'and smaller again in the book',
    `${BOOK_FIGURE_SCALE.toFixed(3)}x, ${Math.round(100 * BOOK_FIGURE_SCALE / PORTRAIT_SCALE)}% of the box's`);

  // Buildings. Always a downscale, so this can only fail if the slot grows.
  ok(BOOK_TOWER_K <= ceiling, 'building thumbnails', `${BOOK_TOWER_K.toFixed(3)}x board scale`);

  // Icons, which are NOT sized by any board scale — a book row's icon is 12px
  // because the number beside it is 10. So each one is checked against its own
  // source height.
  const icons = ['stat_gold_cost', 'glyph_refund', 'stat_health', 'stat_damage', 'stat_damage_magic',
    'stat_range', 'stat_armour', 'stat_armour_magic', 'stat_pierce', 'stat_pierce_magic', 'stat_splash',
    'stat_life_cost'].map(key => [key, ENTRY_ICON_H]);

  let soft = 0;
  for (const [key, h] of icons) {
    const src = ui[key].trim[3];
    if (h * MAX_SCALE > src) { soft++; console.log(`      ${key} at ${h}px needs ${h * MAX_SCALE} source px, has ${src}`); }
  }
  ok(soft === 0, 'every icon on the page', `${icons.length} checked at ${ENTRY_ICON_H}px`);

  // AND THE OTHER END OF THE BRACKET, which is the one that was wrong.
  //
  // Everything above asks whether the artist gave us enough source pixels. This
  // asks whether the canvas ever gets around to using them — and until the floor
  // went up it did not: a 1280-wide window at dpr 1 rasterised at 1.333, which put
  // a 12-unit armour icon into sixteen pixels and turned it into a grey blob.
  //
  // Checked here rather than in a tool of its own because this section is already
  // the game's one place that reasons about resolution against source pixels — it
  // checks the info box's portraits, which are not the book either.
  //
  // THE WORST CASE IS THE SMALLEST WINDOW, so that is what is asked: the narrowest
  // board this game is played on, at the least dense screen anybody has.
  const NARROW = 960, PLAIN = 1;
  const worst = canvasScale(NARROW, PLAIN);
  ok(worst.backing >= MIN_SCALE,
    'the canvas is never rasterised below its floor',
    `${(960 * worst.backing).toFixed(0)}x${(540 * worst.backing).toFixed(0)} at ${NARROW}px, dpr ${PLAIN}`);

  // AND NEVER ABOVE THE CEILING, which is the fill rate. 2880x1620 was measured at
  // a median 39.8ms a frame on a busy board — a quarter of the rate the floor
  // costs — so the cap is not a formality.
  const dense = canvasScale(2560, 3);
  ok(dense.backing <= MAX_SCALE && dense.shown <= MAX_SCALE,
    'and never above its ceiling, however dense the glass',
    `${dense.backing}x on a 2560px board at dpr 3`);

  // THE TWO NUMBERS ARE NOT THE SAME NUMBER, and the pop-up is what would notice.
  // `shown` is the glass and `backing` is the canvas; where the floor lifts the
  // canvas above the glass, only `backing` moves. Handed `backing`, popSlot would
  // read a supersampled canvas as a denser screen and shrink the picture.
  const lifted = canvasScale(1280, 1);
  ok(lifted.backing > lifted.shown && lifted.shown === (1280 / 960),
    'and the glass is still reported as the glass, not as the canvas',
    `shown ${lifted.shown.toFixed(3)}x, backing ${lifted.backing.toFixed(3)}x`);

  // A WIDE SCREEN IS ALREADY PAST THE FLOOR and must not be dragged down to it —
  // `max`, not a replacement. This is the half a careless clamp gets wrong.
  const wide = canvasScale(2400, 1);
  ok(wide.backing === Math.min(MAX_SCALE, 2400 / 960) && wide.backing > MIN_SCALE,
    'while a screen already past the floor keeps what it had',
    `${wide.backing.toFixed(3)}x at 2400px, dpr 1`);
}

console.log(bad ? `\n${bad} problem(s) with the encyclopedia.` : '\nThe encyclopedia holds together.');
process.exit(bad ? 1 : 0);
