// Taps. Five screens, and each one owns every tap while it is up — the same rule
// the big game's input follows, and for the same reason: a panel covering the
// board must not let the board answer.

import { PLOT_R, BTN_R, menuItems, MAP_BTN, BOOK_ROW, BOOK_START, BOOK_BACK,
         RESULT_AGAIN, RESULT_MAPS, HUD_H, HUD_BTN, PAUSE_ROW } from './render.js';
import { family, maps, build, upgrade, sell, towerAt, moveUnit, clampReach, newGame,
         callWaveEarly, pickFigure } from './rules.js';
import { unlock, solo, voiceCue } from './audio.js';

// Every box in this file is padded before it is tested. The drawn controls are
// small — this is a 960-unit board on a phone — and shrinking the picture must
// never shrink the target.
const inside = (b, x, y, pad = 8) =>
  x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad;

export function attach(canvas, state, restart) {
  canvas.addEventListener('pointerdown', e => {
    // EVERY TAP, not just the first. A phone locking, a call arriving or the tab
    // going to the background all suspend the audio context again, and without
    // this the game comes back mute. It is also what starts the music, which
    // cannot begin before a real touch however much the page would like it to.
    unlock();
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
    // Straight back into the same map rather than through the picker, which is
    // what somebody who has just lost actually wants.
    if (inside(RESULT_AGAIN, x, y)) { restart(state.mapIndex, true); return; }
    if (inside(RESULT_MAPS, x, y)) state.screen = 'maps';
    return;
  }

  // THE FAMILY POP-UP SWALLOWS EVERYTHING while it is up, and it is a pause in
  // itself — main.js only steps the fight on the 'play' screen. Tapping one of the
  // four opens their long description in the same panel.
  if (state.screen === 'family') {
    if (inside(BOOK_START, x, y)) {
      state.screen = 'play';
      state.begun = true;
      state.reading = null;
      return;
    }
    if (state.reading && inside(BOOK_BACK, x, y)) { state.reading = null; return; }
    family.forEach((m, i) => { if (inside(BOOK_ROW(i), x, y)) state.reading = m; });
    return;
  }

  // THE DASHBOARD IS ABOVE THE BOARD, so it is asked first — otherwise a button
  // that happens to sit over a plot's menu would lose to it. 14px of padding takes
  // the 34px-tall controls to 62 tapped.
  if (inside(HUD_BTN.pause, x, y, 14)) { state.paused = !state.paused; return; }
  if (inside(HUD_BTN.chars, x, y, 14)) {
    // Reading is not playing. Going back for a reminder stops the clock, which is
    // the whole reason the pop-up is a screen rather than an overlay.
    state.screen = 'family';
    state.reading = null;
    state.menu = null;
    state.placing = null;
    return;
  }
  if (inside(HUD_BTN.wave, x, y, 14)) { callWaveEarly(state); return; }

  // PAUSED SWALLOWS THE BOARD. Only the three buttons it puts on screen answer, so
  // a paused game cannot be built on, sold from or ordered about — "paused" has to
  // mean the game is not moving in any respect, not just that the thugs are still.
  if (state.paused) {
    if (inside(PAUSE_ROW.resume, x, y)) { state.paused = false; return; }
    if (inside(PAUSE_ROW.restart, x, y)) { restart(state.mapIndex, true); return; }
    if (inside(PAUSE_ROW.quit, x, y)) { restart(state.mapIndex); state.screen = 'maps'; }
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
    // A plot with somebody on it fills the panel as well as opening the ring; an
    // empty one clears it, because four build buttons are open at once there and
    // the panel can only describe one of them.
    select(state, tower ? { kind: 'tower', ref: tower } : null);
    return;
  }

  // THE PLOTS ARE ASKED FIRST and the figures second, which is the right way
  // round: a plot is a control and a figure is a thing to look at, and Papa
  // standing over his own plot must not swallow the ring that sells him.
  const figure = pickFigure(state, x, y);
  if (figure) {
    state.menu = null;
    select(state, figure);
    return;
  }

  state.menu = null;
  select(state, null);
}

// Put somebody in the panel, and let them say so. The voice is the big game's
// habit and worth keeping: tapping one of the four should answer, and Category A
// means four taps in a row are four lines rather than four at once.
//
// Only a FAMILY member speaks. A thug has no line recorded, and `voiceCue`
// answering null for anything it does not know is what keeps that from being a
// branch here.
function select(state, sel) {
  const same = state.selected && sel && state.selected.ref === sel.ref;
  state.selected = sel;
  if (!sel || same) return;
  // A plot and the person it sent out both carry `member`; a thug carries `def`
  // and has no line recorded.
  if (sel.kind !== 'enemy') solo(voiceCue(sel.ref.member.id));
}

// Keep the ring off the dashboard and off the bottom edge. The plot itself stays
// where it is; only the ring moves, which is the same trick the big game plays,
// minus the leader line — with four buttons on a 74px ring there is never much of
// a gap to explain.
const clampY = y => Math.max(HUD_H + 74 + BTN_R, Math.min(540 - 74 - BTN_R, y));

function run(state, it) {
  const menu = state.menu;

  // Building and upgrading select what they just paid for, so the numbers the
  // player was choosing between are still on screen once they have chosen. Both
  // already play their own line inside rules.js, which is why neither goes
  // through select() — it would be the same voice twice.
  if (it.act === 'build') {
    if (!build(state, menu.plot, it.member)) return;
    state.selected = { kind: 'tower', ref: towerAt(state, menu.plot) };
    state.menu = null;
    return;
  }
  if (it.act === 'upgrade') {
    upgrade(state, menu.tower);
    state.selected = { kind: 'tower', ref: menu.tower };
    state.menu = null;
    return;
  }
  if (it.act === 'sell') {
    sell(state, menu.tower);
    state.selected = null;
    state.menu = null;
    return;
  }
  if (it.act === 'rally') { state.placing = menu.tower; state.menu = null; }
}

export { newGame };
