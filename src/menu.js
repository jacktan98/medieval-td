import { families } from './data/towers.js';

// Radial menu around the tapped plot. Four families map to four quadrants;
// a built tower shows upgrade and sell in two of them.
//
// Sized for touch: a button is BTN_R * 2 = 52 logical px. A 960-wide canvas
// shows at roughly 800 CSS px on a landscape phone, so 52 logical lands at
// about 44 real px — the minimum target. Do not shrink these without
// re-checking that ratio.
//
// The geometry lives here rather than in render.js so input.js hit-tests
// exactly what gets drawn. Two copies of these numbers is how the muzzle
// offsets drifted apart.
export const BTN_R = 26;
export const RING_R = 62;   // plot centre to button centre
export const HIT_R = 32;    // forgiving tap radius; buttons sit 88px apart
export const CANCEL_R = 18; // drawn size of the centre cancel target

const MARGIN = RING_R + BTN_R + 16;   // room for the label under each button
const HUD_H = 40;

// Fraction of everything spent on a tower that selling gives back. Low enough
// that repositioning costs something: a tier 3 archery tower is 300 spent,
// so it refunds 180 and rebuilding elsewhere is 120 out of pocket.
export const SELL_RATE = 0.6;

export function sellValue(t) {
  return Math.floor(t.spent * SELL_RATE);
}

const N = -Math.PI / 2;
const E = 0;
const S = Math.PI / 2;
const W = Math.PI;

// Plots near an edge would push buttons off-canvas or under the HUD — (332,54)
// sits 14px clear of the HUD and (596,476) is 64px off the bottom. Anchor the
// menu at a clamped point instead and let render.js draw a leader to the plot.
function centre(plot) {
  return {
    cx: Math.min(Math.max(plot.x, MARGIN), 960 - MARGIN),
    cy: Math.min(Math.max(plot.y, HUD_H + MARGIN), 540 - MARGIN)
  };
}

export function openMenu(state, plot, tower) {
  const { cx, cy } = centre(plot);
  const items = tower ? towerItems(tower) : buildItems();

  for (const it of items) {
    it.x = cx + Math.cos(it.angle) * RING_R;
    it.y = cy + Math.sin(it.angle) * RING_R;
  }

  state.menu = { plot, tower, cx, cy, items };
}

export function closeMenu(state) {
  state.menu = null;
}

// Affordability is checked live rather than baked in at open time — gold moves
// while the menu is up, from kills and the wave clear bonus.
export function canUse(state, item) {
  return item.available && (item.cost === null || state.gold >= item.cost);
}

export function hitMenu(state, x, y) {
  if (!state.menu) return null;
  for (const it of state.menu.items) {
    if (Math.hypot(it.x - x, it.y - y) <= HIT_R) return it;
  }
  return null;
}

// The hole in the middle of the ring cancels. This is the only dismiss target
// that works on every plot: on a clamped menu the north button sits over the
// plot, so tapping the plot again is not available there.
export function hitCancel(state, x, y) {
  if (!state.menu) return false;
  return Math.hypot(state.menu.cx - x, state.menu.cy - y) <= RING_R - BTN_R;
}

function buildItems() {
  const angles = [N, E, S, W];

  return families.map((fam, i) => {
    const t1 = fam.tiers && fam.tiers[0];
    return {
      angle: angles[i],
      act: 'build',
      family: fam,
      glyph: fam.glyph,
      label: t1 ? `${fam.name} T1` : fam.name,
      cost: t1 ? t1.cost : null,
      gain: null,
      available: !!t1
    };
  });
}

// Upgrade and sell sit on the horizontal axis, not the vertical. Towers are
// 44px wide and 68 tall, so N/S buttons bury the building and its gunner —
// exactly what you want to look at while deciding whether to upgrade it.
function towerItems(t) {
  const next = t.fam.tiers[t.def.tier];

  return [
    {
      angle: E,
      act: 'upgrade',
      glyph: next ? 'up' : 'max',
      label: next ? `Upgrade T${next.tier}` : 'Max tier',
      cost: next ? next.cost : null,
      gain: null,
      available: !!next
    },
    {
      angle: W,
      act: 'sell',
      glyph: 'coin',
      label: 'Sell',
      cost: null,
      gain: sellValue(t),
      available: true
    }
  ];
}
