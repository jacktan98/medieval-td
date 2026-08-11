import { level, useLevel } from './level.js';
import { PLOT_R, hitHudButton, hitStart, hitMapButton } from './render.js';
import { openMenu, closeMenu, hitMenu, hitCancel, canUse, sellValue, RING_R } from './menu.js';
import { makeUnits, moveUnits, removeUnits } from './units.js';
import { clampToRange } from './ground.js';
import { callWaveEarly } from './waves.js';
import { pickFigure } from './select.js';
import { solo, unlock, selectionCue, familyCue, CUE } from './audio.js';

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

    // Every tap, not just the first. A phone will not let sound out until the
    // screen has been touched, and it takes that permission back whenever the
    // context is suspended — the phone locking, a call, the tab going to the
    // background. Asking again on each tap is free when it is already running
    // and is the difference between coming back to the game and coming back to
    // a silent game. It sits above the title-screen gate on purpose, so the
    // Start button is itself the tap that unlocks.
    unlock();

    // The title screen owns the whole board: nothing under it may act on a tap,
    // including a plot the Start button happens to be sitting over.
    if (!state.started) {
      const pick = hitMapButton(state, x, y);
      if (pick !== null) {
        // Switching maps rebuilds the game rather than just remembering the
        // choice, because the board behind the title screen is the chosen map:
        // its roads, its plots, its purse. Anything already placed belonged to
        // the other map's plots and cannot come along.
        state.levelIndex = pick;
        useLevel(pick);
        restart();
        return;
      }
      if (hitStart(state, x, y)) state.started = true;
      return;
    }

    if (state.result) { restart(); return; }

    // The HUD sits above everything and is not part of the board, so it is
    // asked first — otherwise a button that happens to overlap a plot's menu
    // would lose to it.
    const hud = hitHudButton(state, x, y);
    if (hud === 'pause') { togglePause(state); return; }

    // PAUSED SWALLOWS EVERYTHING ELSE. Not just the board — the speed toggle and
    // the early wave call go too, because "paused" has to mean the game is not
    // moving in any respect. Half a pause, where you can still queue the next
    // wave or spend gold with the clock stopped, is not a pause; it is free
    // thinking time with the shop open.
    //
    // Only the button that undoes it still answers, which is why it is tested
    // first.
    if (state.paused) return;

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

    const plot = level.plots.find(p => Math.hypot(p.x - x, p.y - y) <= PLOT_R + 8);
    if (plot) {
      const tower = state.towers.find(t => t.plot === plot) || null;
      openMenu(state, plot, tower);
      // Opened deliberately, so moving the mouse away must not take it back.
      state.menu.viaHover = false;
      // A built tower fills the info box the moment its menu opens: you are
      // deciding whether to upgrade it, which is the one moment its numbers
      // matter. An empty plot has nothing to describe.
      //
      // AND IT DOES SO SILENTLY. Selecting a tower is how you read its numbers,
      // and it is done constantly — every time you weigh an upgrade, every time
      // you check what is already there. A line on each of those taps is the
      // same clip several times a minute, which is exactly what the Category A
      // share rules exist to stop, and this was slipping past them by being a
      // different event each time. Building and upgrading still speak; those
      // happen once each.
      state.selected = tower ? { kind: 'tower', ref: tower } : null;
      return;
    }

    // Nothing to build on here, so this is a look. A figure under the tap gets
    // selected; bare ground clears whatever was.
    //
    // AFTER the plot check, deliberately: soldiers stand on the road and plots
    // sit off it, so the two rarely overlap — but where they do, building is the
    // action and looking is the fallback.
    closeMenu(state);
    state.selected = pickFigure(state, x, y);
    solo(selectionCue(state.selected));
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

    // A paused game does not follow the mouse either. Hovering an empty plot
    // opens its build menu on desktop, so without this the one input that needs
    // no tap at all would walk straight through the pause.
    if (state.paused) { state.hoverTower = null; state.ghost = null; return; }

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

    const plot = level.plots.find(p => Math.hypot(p.x - x, p.y - y) <= PLOT_R + 8);
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

// Stopping the game also puts away anything the player was in the middle of.
//
// A radial menu left open across a pause is the worst of both: it is the one
// thing on screen that looks like it should still answer a tap, and every one of
// its buttons is dead. Same for a rally point half-placed — the board is armed
// for a tap that will now be ignored. Both are cleared, so a paused game shows
// nothing that invites an action it will refuse.
function togglePause(state) {
  state.paused = !state.paused;
  if (!state.paused) return;
  closeMenu(state);
  state.placing = null;
  state.ghost = null;
}

// 1x and 2x only. A third speed sounds generous and mostly produces a setting
// nobody can tell apart from the one next to it.
function toggleSpeed(state) {
  state.speed = state.speed === 2 ? 1 : 2;
}

// The rally is clamped to the tower's reach here as well as in stations(), so
// the stored point is always one the barracks could actually use — otherwise
// dragging far away and then upgrading would silently teleport the squad.
//
// moveUnits, not makeUnits: the squad walks to the new flag. Rebuilding it here
// is what used to make a rally change replace three wounded men with three fresh
// ones standing back at the barracks.
function setRally(state, tower, x, y) {
  tower.rally = clampToRange(tower.x, tower.y, x, y, tower.def.range);
  moveUnits(state, tower);
  // The squad answering the order. Here rather than on the menu button, because
  // the button only arms the placement — this is the tap that actually moves
  // them, and a voice on the earlier tap would answer an order not yet given.
  solo(CUE.barracks);
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
      // Which drawing an animated building is showing, and how long is left of
      // it. Only artillery uses them; every other family has one frame and never
      // touches these. Set here rather than defaulted in the update, because
      // `undefined - dt` is NaN and a NaN clock never reaches a beat boundary —
      // the catapult would stand still forever with no error anywhere.
      beat: 0,
      beatT: 0,
      spent: def.cost,
      rally: null
    });
    const built = state.towers[state.towers.length - 1];
    makeUnits(state, built);
    // Show what you just bought. The menu closes on a build, so without this the
    // one moment you most want its numbers is the one moment nothing is selected.
    state.selected = { kind: 'tower', ref: built };
    solo(selectionCue(state.selected));
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
    solo(familyCue(t.fam.id));
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
