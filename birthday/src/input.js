// Taps. Four screens, and each one owns every tap while it is up — the same rule
// the big game's input follows, and for the same reason: a panel covering the
// board must not let the board answer.

import { PLOT_R, BTN_R, menuItems, MAP_BTN, BOOK, BOOK_ROW, BOOK_START, BOOK_BACK,
         RESULT_BTN } from './render.js';
import { family, maps, build, upgrade, sell, towerAt, moveUnit, clampReach, newGame }
  from './rules.js';

const inside = (b, x, y, pad = 8) =>
  x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;

export function attach(canvas, state, restart) {
  canvas.addEventListener('pointerdown', e => {
    const r = canvas.getBoundingClientRect();
    tap(state, (e.clientX - r.left) * (960 / r.width), (e.clientY - r.top) * (540 / r.height),
        restart);
  });
}

function tap(state, x, y, restart) {
  if (state.screen === 'maps') {
    maps.forEach((m, i) => { if (inside(MAP_BTN(i), x, y)) restart(i); });
    return;
  }

  if (state.screen === 'won' || state.screen === 'lost') {
    if (inside(RESULT_BTN, x, y)) state.screen = 'maps';
    return;
  }

  // THE FAMILY POP-UP SWALLOWS EVERYTHING while it is up. Tapping one of the four
  // opens their long description in the same panel; Back closes it again; Start
  // begins the game.
  if (state.screen === 'family') {
    if (inside(BOOK_START, x, y)) { state.screen = 'play'; state.reading = null; return; }
    if (state.reading && inside(BOOK_BACK, x, y)) { state.reading = null; return; }
    family.forEach((m, i) => { if (inside(BOOK_ROW(i), x, y)) state.reading = m; });
    return;
  }

  // Sending Papa or Mommy somewhere: the whole board is the target, so the tap
  // goes nowhere else.
  if (state.placing) {
    const t = state.placing;
    t.rally = clampReach(t.x, t.y, x, y, t.level.range);
    moveUnit(state, t);
    state.placing = null;
    return;
  }

  if (state.menu) {
    for (const it of menuItems(state, state.menu)) {
      if (Math.hypot(it.x - x, it.y - y) > BTN_R + 4) continue;
      if (!it.on) return;
      run(state, it);
      return;
    }
    // The hole in the middle closes it, the same as the big game's.
    if (Math.hypot(state.menu.cx - x, state.menu.cy - y) <= 40) { state.menu = null; return; }
  }

  const plot = state.map.plots.find(p => Math.hypot(p.x - x, p.y - y) <= PLOT_R + 8);
  if (plot) {
    const tower = towerAt(state, plot);
    state.menu = { plot, tower, cx: plot.x, cy: clampY(plot.y) };
    return;
  }

  state.menu = null;
}

// Keep the ring off the dashboard and off the bottom edge. The plot itself stays
// where it is; only the ring moves, which is the same trick the big game plays,
// minus the leader line — with four buttons on a 74px ring there is never much of
// a gap to explain.
const clampY = y => Math.max(34 + 74 + BTN_R, Math.min(540 - 74 - BTN_R, y));

function run(state, it) {
  const menu = state.menu;

  if (it.act === 'build') {
    if (build(state, menu.plot, it.member)) state.menu = null;
    return;
  }
  if (it.act === 'upgrade') { upgrade(state, menu.tower); state.menu = null; return; }
  if (it.act === 'sell') { sell(state, menu.tower); state.menu = null; return; }
  if (it.act === 'rally') { state.placing = menu.tower; state.menu = null; }
}

export { newGame };
