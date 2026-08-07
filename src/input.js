import { plots } from './data/level01.js';
import { PLOT_R, hitHudButton } from './render.js';
import { openMenu, closeMenu, hitMenu, hitCancel, canUse, sellValue, RING_R } from './menu.js';
import { makeUnits, removeUnits } from './units.js';
import { callWaveEarly } from './waves.js';

// How far outside the menu ring the mouse may stray before a menu that opened
// itself on hover closes again. Without the slack, the gap between the ring and
// a button's edge is enough to make the menu flicker as you cross it.
const HOVER_SLACK = 26;

export function attachInput(canvas, state, restart) {
  const at = e => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (960 / rect.width),
      y: (e.clientY - rect.top) * (540 / rect.height)
    };
  };

  canvas.addEventListener('pointerdown', e => {
    const { x, y } = at(e);

    if (state.result) { restart(); return; }

    // The HUD sits above everything and is not part of the board, so it is
    // asked first — otherwise a button that happens to overlap a plot's menu
    // would lose to it.
    const hud = hitHudButton(state, x, y);
    if (hud === 'speed') { toggleSpeed(state); return; }
    if (hud === 'wave') { callWaveEarly(state); return; }

    // Placing a rally point swallows the tap: the whole board is the target,
    // so nothing underneath may act on it.
    if (state.placing) {
      setRally(state, state.placing, x, y);
      state.placing = null;
      return;
    }

    // A menu button wins over anything underneath it, including the plot ring
    // the menu is anchored to.
    const item = hitMenu(state, x, y);
    if (item) {
      if (canUse(state, item)) run(state, item);
      return;   // an unaffordable button absorbs the tap rather than closing
    }

    // Clicking the plot whose menu opened itself on hover PINS that menu rather
    // than dismissing it. Without this, the most natural thing a mouse user does
    // — point at a plot, then click it — lands in the cancel hole at the middle
    // of the ring and closes the menu the hover just opened, so the game looks
    // like it ignored the click.
    if (state.menu && state.menu.viaHover &&
        Math.hypot(state.menu.plot.x - x, state.menu.plot.y - y) <= PLOT_R + 8) {
      state.menu.viaHover = false;
      return;
    }

    if (hitCancel(state, x, y)) { closeMenu(state); return; }

    const plot = plots.find(p => Math.hypot(p.x - x, p.y - y) <= PLOT_R + 8);
    if (!plot) { closeMenu(state); return; }

    openMenu(state, plot, state.towers.find(t => t.plot === plot) || null);
    // Opened deliberately, so moving the mouse away must not take it back.
    state.menu.viaHover = false;
  });

  // --- desktop hover ---------------------------------------------------------
  //
  // Layered ON TOP of the tap behaviour, never replacing it: every one of these
  // handlers is gated on pointerType === 'mouse', so a phone never sees any of
  // it and nothing the game can only do on hover exists. A touch device gets
  // exactly the game it had before.
  //
  // Two separate things happen here. Hovering a BUILT tower shows its range and
  // its next tier's range, which used to need the menu open. Hovering an EMPTY
  // plot opens the build menu outright, which is the thing you want on a mouse
  // and would be unusable on a thumb.
  canvas.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const { x, y } = at(e);

    if (state.placing) { state.ghost = { x, y }; return; }

    state.hoverTower = state.towers.find(t =>
      Math.hypot(t.plot.x - x, t.plot.y - y) <= PLOT_R + 8) || null;

    const menu = state.menu;

    // A menu the player opened by clicking is theirs to close. Only ones that
    // opened themselves follow the pointer.
    if (menu && menu.viaHover) {
      const onRing = Math.hypot(menu.cx - x, menu.cy - y) <= RING_R + HOVER_SLACK;
      const onPlot = Math.hypot(menu.plot.x - x, menu.plot.y - y) <= PLOT_R + HOVER_SLACK;
      if (!onRing && !onPlot) closeMenu(state);
    }

    if (state.menu) return;   // never steal a menu that is already up

    const plot = plots.find(p => Math.hypot(p.x - x, p.y - y) <= PLOT_R + 8);
    if (plot && !state.towers.some(t => t.plot === plot)) {
      openMenu(state, plot, null);
      state.menu.viaHover = true;
    }
  });

  canvas.addEventListener('pointerleave', e => {
    if (e.pointerType !== 'mouse') return;
    state.hoverTower = null;
    state.ghost = null;
    if (state.menu && state.menu.viaHover) closeMenu(state);
  });
}

// 1x and 2x only. A third speed sounds generous and mostly produces a setting
// nobody can tell apart from the one next to it.
function toggleSpeed(state) {
  state.speed = state.speed === 2 ? 1 : 2;
}

// The rally is clamped to the tower's reach here as well as in makeUnits, so
// the stored point is always one the barracks could actually use — otherwise
// dragging far away and then upgrading would silently teleport the squad.
function setRally(state, tower, x, y) {
  const d = Math.hypot(x - tower.x, y - tower.y);
  const k = d > tower.def.range ? tower.def.range / d : 1;
  tower.rally = { x: tower.x + (x - tower.x) * k, y: tower.y + (y - tower.y) * k };
  makeUnits(state, tower);
}

function run(state, item) {
  const menu = state.menu;

  if (item.act === 'build') {
    const def = item.family.tiers[0];
    state.gold -= def.cost;
    state.towers.push({
      plot: menu.plot,
      fam: item.family,
      def,
      x: menu.plot.x,
      y: menu.plot.y,
      aim: 0,
      cd: 0,
      recoil: 0,
      spent: def.cost,
      rally: null
    });
    makeUnits(state, state.towers[state.towers.length - 1]);
  }

  if (item.act === 'upgrade') {
    const t = menu.tower;
    const next = t.fam.tiers[t.def.tier];
    state.gold -= next.cost;
    t.def = next;
    t.spent += next.cost;
    t.cd = 0;
    // Rebuilt rather than patched: the new tier has its own soldier stats and
    // a longer reach, so the rally point moves too.
    makeUnits(state, t);
  }

  if (item.act === 'sell') {
    const t = menu.tower;
    state.gold += sellValue(t);
    removeUnits(state, t);
    state.towers = state.towers.filter(other => other !== t);
    if (state.hoverTower === t) state.hoverTower = null;
  }

  // Arming the placement rather than doing it: the next tap on the board is the
  // rally point. render.js draws the reach and a ghost flag while this is set.
  if (item.act === 'rally') {
    state.placing = menu.tower;
  }

  closeMenu(state);
}
