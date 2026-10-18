// THE ACHIEVEMENTS SCREEN: every achievement, earned or not, and what each asks.
// Opened from the world map, beside the Upgrades.
//
// Laid out as the Upgrades screen is, at the owner's word — the same sheet, the same
// round buttons on the same rows, a panel down the right that describes the one
// picked — but the buttons are not joined: 4 to a row, left to right, 5 rows. No
// Reset and no Buy; Done alone at the foot.
//
// The geometry lives here and the drawing in render.js, the same split as
// upgradepage.js, so input.js hit-tests exactly the rects that get drawn.
import { ACHIEVEMENTS } from './data/achievements.js';
import { UP_SHEET, UP_PANEL, UP_DONE, UP_R } from './upgradepage.js';

// THE WORLD MAP'S WAY IN: the artist's trophy, right of the hammer at the bottom
// middle, with "Achievements" under it — see UPGRADES_ICON for the pair's spacing.
// ACHIEVE_BTN is the whole of the trophy and its label, for the tap.
export const ACHIEVE_ICON = { cx: 550, foot: 492 };
export const ACHIEVE_BTN = { x: 494, y: 428, w: 112, h: 94 };

export const ACH_SHEET = UP_SHEET;
export const ACH_PANEL = UP_PANEL;
export const ACH_DONE = UP_DONE;
export const ACH_R = UP_R;
// PAGE 2, THE PLAYER'S TOTALS, at the owner's word (see src/stats.js): behind a Stats
// button where the Upgrades screen keeps its Reset, which reads Achievements on page 2
// and goes back. `state.achPage` is 0 or 1.
export const ACH_STATS = { x: UP_DONE.x - 20 - 170, y: UP_DONE.y, w: 170, h: UP_DONE.h };
// The earned count's slot, where the Upgrades screen keeps its stars.
export const ACH_COUNT = { x: 852, y: 30, w: 78, h: 38 };

// THE UPGRADES SCREEN'S COLUMNS AND ROWS: four columns 132 apart from x 46, and five
// rows 84 apart, the lowest where the families' own buttons stand.
const COL_X = 46, COL_W = 132, TOP_CY = 104, STEP_Y = 84;
export const PER_ROW = 4;

export function achBox(i) {
  const col = i % PER_ROW, row = Math.floor(i / PER_ROW);
  const cx = COL_X + col * COL_W + COL_W / 2, cy = TOP_CY + row * STEP_Y;
  return { cx, cy, r: ACH_R, x: cx - ACH_R, y: cy - ACH_R, w: ACH_R * 2, h: ACH_R * 2 };
}

const inside = (b, x, y, p = 4) => x >= b.x - p && x <= b.x + b.w + p && y >= b.y - p && y <= b.y + b.h + p;

export const hitAchievementsButton = (x, y) => inside(ACHIEVE_BTN, x, y, 0);

// Which achievement is under a point, as its index, or null.
export function achAt(x, y) {
  for (let i = 0; i < ACHIEVEMENTS.length; i++) {
    const b = achBox(i);
    if (Math.hypot(x - b.cx, y - b.cy) <= ACH_R + 4) return i;
  }
  return null;
}

// What the panel describes: the one under the mouse if there is one, else the one
// last tapped. The first is picked as the screen opens, so the panel is never empty.
export const shownAchievement = state =>
  state.achHover !== null && state.achHover !== undefined ? state.achHover : state.achPick ?? 0;

export function openAchievements(state, all = false) {
  state.achievements = true;
  // EVERY ONE SHOWN AS EARNED, for the owner, from the dashboard's code 2020: a look
  // at the whole set in colour. Nothing is saved; Done puts the real ones back.
  state.achAll = all;
  state.achPick = 0;
  state.achHover = null;
  state.achPage = 0;
}

export function closeAchievements(state) {
  state.achievements = false;
  state.achAll = false;
  state.achHover = null;
}

// Every tap while the screen is up comes here and nowhere else: it covers the board.
export function tapAchievements(state, x, y) {
  if (inside(ACH_DONE, x, y)) { closeAchievements(state); return 'tap'; }
  // Turning to the other page sounds as the book's pages do.
  if (inside(ACH_STATS, x, y)) { state.achPage = state.achPage ? 0 : 1; state.achHover = null; return 'flip'; }
  if (state.achPage) return null;
  const i = achAt(x, y);
  if (i !== null) { state.achPick = i; return 'tap'; }
  return null;
}

export function hoverAchievements(state, x, y) {
  state.achHover = state.achPage ? null : achAt(x, y);
}
