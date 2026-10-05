// THE UPGRADES SCREEN: where stars are spent. Opened from the world map.
//
// The owner's picture is Kingdom Rush's: a column per family, the rungs stacked so
// the first is at the bottom and each one above it waits for the one below, a
// panel to the side that says what the one under the pointer does, and Reset and
// Done along the foot. "Descriptions of the upgrade will be shown when players
// hover it" — and on a phone, where nothing hovers, when it is tapped.
//
// BUYING TAKES TWO PRESSES, the box and then the panel's Buy button, which is the
// rule every purchase in this game follows — see NEEDS_CONFIRM in menu.js. A tap
// on a box is how a phone reads it, and reading must never cost a star.
//
// The geometry lives here and the drawing in render.js, the same split as book.js,
// so input.js hit-tests exactly the rects that get drawn.
import { UPGRADES, UPGRADE_FAMILIES } from './data/upgrades.js';
import { canBuy, buy, resetUpgrades } from './upgrades.js';

// THE WORLD MAP'S WAY IN: the artist's hammer, at the bottom middle of the map, with
// "Upgrades" under it — laid out as the book is at the bottom left. See BOOK_ICON in
// book.js. UPGRADES_BTN is the whole of the hammer and its label, for the tap.
export const UPGRADES_ICON = { cx: 480, foot: 492 };
export const UPGRADES_BTN = { x: 432, y: 428, w: 96, h: 94 };

export const UP_SHEET = { x: 8, y: 8, w: 944, h: 524 };
export const UP_TITLE_Y = 40;
// The star counter's slot: its RIGHT edge and its height are fixed here; render.js
// sizes its width to the number it holds, so the padding is even either side.
// 30 DOWN, AND IT WAS 20: as far below the sheet's top as its right edge stands in
// from the sheet's right side, so the margin is the same both ways — and the same
// as under Reset and Done.
export const UP_STARS = { x: 852, y: 30, w: 78, h: 38 };

// The four columns, left to right in the build menu's order, and the four rungs in
// each, the first at the BOTTOM — a ladder is climbed.
//
// ROUND, AS THE RING'S BUTTONS ARE, at the owner's word: "make the upgrades round
// just like radial menu style". Each is the artist's own face for that rung — see
// the `up_` entries in data/ui.js — drawn whole, with the price in the panel.
const COL_X = 46;
const COL_W = 132;
// 36, AND IT WAS 28: the owner drew the faces bigger and asked for the circles to
// follow. 72 across is as large as a 248px source disc stays sharp on a 3x screen.
export const UP_R = 36;
const BOTTOM_CY = 356;
const STEP_Y = 84;

// A rung's circle, as its centre and radius, with the square round it as x/y/w/h
// for the hit test.
export function upBox(col, i) {
  const cx = COL_X + col * COL_W + COL_W / 2, cy = BOTTOM_CY - i * STEP_Y;
  return { cx, cy, r: UP_R, x: cx - UP_R, y: cy - UP_R, w: UP_R * 2, h: UP_R * 2 };
}

// THE FAMILY'S OWN BUTTON at the foot of its ladder: the build menu's plate and
// the build menu's picture of the tower, the one a player has tapped every time
// they built one. It replaced a name plate, at the owner's word.
export const upFamily = col => ({ cx: COL_X + col * COL_W + COL_W / 2, cy: BOTTOM_CY + STEP_Y, r: UP_R });

export const UP_PANEL = { x: 600, y: 84, w: 330, h: 340 };
export const UP_BUY = { x: UP_PANEL.x + 45, y: UP_PANEL.y + UP_PANEL.h - 66, w: UP_PANEL.w - 90, h: 44 };
// RESET BESIDE DONE at the bottom right, at the owner's word, and it was at the
// bottom left. 20px of drawn gap keeps their padded tap boxes apart.
//
// DONE'S RIGHT EDGE IS THE COLUMN'S: the star counter and the panel both end at
// 930, so it does too. And the row stands as far above the sheet's foot as that
// edge stands in from the sheet's right side, so the margin is the same both ways.
const UP_RIGHT = UP_STARS.x + UP_STARS.w;
const UP_MARGIN = UP_SHEET.x + UP_SHEET.w - UP_RIGHT;
export const UP_DONE = { x: UP_RIGHT - 130, y: UP_SHEET.y + UP_SHEET.h - UP_MARGIN - 38, w: 130, h: 38 };
export const UP_RESET = { x: UP_DONE.x - 20 - 130, y: UP_DONE.y, w: 130, h: 38 };

// How long a half-pressed Reset waits for its second press, in ms.
export const RESET_WINDOW = 3000;

const inside = (b, x, y, p = 4) => x >= b.x - p && x <= b.x + b.w + p && y >= b.y - p && y <= b.y + b.h + p;

export const hitUpgradesButton = (x, y) => inside(UPGRADES_BTN, x, y, 0);

// Which rung is under a point, as { fam, i }, or null.
export function boxAt(x, y) {
  for (const [col, fam] of UPGRADE_FAMILIES.entries())
    for (let i = 0; i < UPGRADES[fam].length; i++)
      if (Math.hypot(x - upBox(col, i).cx, y - upBox(col, i).cy) <= UP_R + 4) return { fam, i };
  return null;
}

// What the panel is describing: the rung under the mouse if there is one, else the
// one last tapped.
export const shownRung = state => state.upHover || state.upPick || null;

// THE RUNG THE PANEL OPENS ON, at the owner's word: Eagle Eye when the game starts —
// so the panel is never an empty "tap one to see" — and after that whichever rung
// was selected last, kept across closing the screen and a new game. NOT across a
// reload: "make the selected upgrade go back to eagle eye as default if i restart the
// game", so it is held in memory only and starts again from the first rung.
// Module state rather than game state, because newGame rebuilds the latter.
const FIRST = { fam: 'archery', i: 0 };
let lastPick = FIRST;
// A pick saved by an earlier build is dropped, so it cannot come back.
try { globalThis.localStorage && globalThis.localStorage.removeItem('medieval-td/upgrade-pick'); } catch { /* refused */ }
function rememberPick(rung) {
  lastPick = { fam: rung.fam, i: rung.i };
}

export function openUpgrades(state) {
  state.upgrades = true;
  state.upPick = { ...lastPick };
  state.upHover = null;
  state.upArmed = null;
}

export function closeUpgrades(state) {
  state.upgrades = false;
  state.upPick = null;
  state.upHover = null;
  state.upArmed = null;
}

// Every tap while the screen is up comes here and nowhere else: it covers the
// whole board. Returns what happened, so input.js can make the right noise — a
// purchase is a star spent and sounds like one.
export function tapUpgrades(state, x, y, now = Date.now()) {
  if (inside(UP_DONE, x, y)) { closeUpgrades(state); return 'tap'; }

  if (inside(UP_RESET, x, y)) {
    // ASKS TWICE, as Restart and Quit do: it gives back every star at once, and
    // buying them all again is twenty taps.
    if (state.upArmed && now < state.upArmed) {
      resetUpgrades();
      state.upArmed = null;
    } else {
      state.upArmed = now + RESET_WINDOW;
    }
    return 'tap';
  }
  state.upArmed = null;

  const rung = boxAt(x, y);
  if (rung) { state.upPick = rung; rememberPick(rung); return 'tap'; }

  const shown = shownRung(state);
  if (shown && inside(UP_BUY, x, y) && canBuy(shown.fam, shown.i)) {
    buy(shown.fam, shown.i);
    // ON TO THE NEXT RUNG, at the owner's word, so Buy can be pressed again and
    // again up a ladder; the top rung stays put.
    const next = shown.i + 1 < UPGRADES[shown.fam].length ? { fam: shown.fam, i: shown.i + 1 } : shown;
    state.upPick = next;
    state.upHover = null;
    rememberPick(next);
    return 'bought';
  }
  return null;
}

// The mouse over a rung shows it in the panel without a tap.
export function hoverUpgrades(state, x, y) {
  state.upHover = boxAt(x, y);
}
