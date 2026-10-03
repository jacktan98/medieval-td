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

// The world map's button, beside the encyclopedia's — the two sit as a pair under
// the map. See BOOK_BTN_MAP in book.js.
export const UPGRADES_BTN = { x: 270, y: 460, w: 200, h: 46 };

export const UP_SHEET = { x: 8, y: 8, w: 944, h: 524 };
export const UP_TITLE_Y = 40;
export const UP_STARS = { x: 806, y: 20, w: 124, h: 38 };

// The four columns, left to right in the build menu's order, and the four rungs in
// each, the first at the BOTTOM — a ladder is climbed.
const COL_X = 46;
const COL_W = 132;
export const UP_BOX = 64;
const BOTTOM_Y = 362;
const STEP_Y = 84;

export const upBox = (col, i) => ({
  x: COL_X + col * COL_W + (COL_W - UP_BOX) / 2,
  y: BOTTOM_Y - i * STEP_Y,
  w: UP_BOX, h: UP_BOX
});

// The family's name plate under its column.
export const upLabel = col => ({ x: COL_X + col * COL_W + 10, y: 440, w: COL_W - 20, h: 30 });

export const UP_PANEL = { x: 600, y: 84, w: 330, h: 340 };
export const UP_BUY = { x: UP_PANEL.x + 45, y: UP_PANEL.y + UP_PANEL.h - 66, w: UP_PANEL.w - 90, h: 44 };
export const UP_RESET = { x: 40, y: 482, w: 130, h: 40 };
export const UP_DONE = { x: 790, y: 482, w: 130, h: 40 };

// How long a half-pressed Reset waits for its second press, in ms.
export const RESET_WINDOW = 3000;

const inside = (b, x, y, p = 4) => x >= b.x - p && x <= b.x + b.w + p && y >= b.y - p && y <= b.y + b.h + p;

export const hitUpgradesButton = (x, y) => inside(UPGRADES_BTN, x, y, 6);

// Which rung is under a point, as { fam, i }, or null.
export function boxAt(x, y) {
  for (const [col, fam] of UPGRADE_FAMILIES.entries())
    for (let i = 0; i < UPGRADES[fam].length; i++)
      if (inside(upBox(col, i), x, y)) return { fam, i };
  return null;
}

// What the panel is describing: the rung under the mouse if there is one, else the
// one last tapped.
export const shownRung = state => state.upHover || state.upPick || null;

export function openUpgrades(state) {
  state.upgrades = true;
  state.upPick = null;
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
  if (rung) { state.upPick = rung; return 'tap'; }

  const shown = shownRung(state);
  if (shown && inside(UP_BUY, x, y) && canBuy(shown.fam, shown.i)) {
    buy(shown.fam, shown.i);
    state.upPick = shown;
    return 'bought';
  }
  return null;
}

// The mouse over a rung shows it in the panel without a tap.
export function hoverUpgrades(state, x, y) {
  state.upHover = boxAt(x, y);
}
