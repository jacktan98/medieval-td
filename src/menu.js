import { families, AIM_MODES, upgradesFrom } from './data/towers.js';
import { abilitiesOf, owns } from './data/abilities.js';

// Radial menu around the tapped plot. Four families map to four quadrants;
// a built tower shows upgrade and refund in two of them.
//
// Sized for touch AND for text: a button is BTN_R * 2 = 60 logical px, which a
// 960-wide canvas shows at about 50 real px on a landscape phone — comfortably
// over the 44px minimum. The extra size over the old 52 is what lets the name
// sit inside the circle; labels hung underneath collided with each other and
// with whatever was on the ground behind them.
//
// The geometry lives here rather than in render.js so input.js hit-tests
// exactly what gets drawn. Two copies of these numbers is how the muzzle
// offsets drifted apart.
export const BTN_R = 30;
export const RING_R = 68;   // plot centre to button centre; buttons sit 96 apart
export const HIT_R = 34;    // forgiving tap radius
export const CANCEL_R = 18; // drawn size of the centre cancel target

// A SECOND, WIDER ARC, for the ability buttons and only for them.
//
// The four compass points are taken: upgrade east, refund west, and rally or
// standing order south. A tier 4 tower brings two more buttons and there is no
// room for them on the ring — eight buttons at 68 would sit 52 apart and the discs
// are 60 across, so they would overlap.
//
// So the two go up and out, on the diagonals, at a radius chosen rather than
// picked: 96 puts an ability button 67.9px from the upgrade or refund button
// beside it, which clears the 60px discs with room and is a hair over the 68 that
// two 34px tap circles would need to touch. 88 is the tightest that works at all
// and leaves 2px; 96 leaves 8.
//
// The cost is a wider clamp — see centre() — and it is paid only by the towers
// that have abilities. Everything else keeps exactly the ring it had.
export const ABILITY_R = 96;

// North-west and north-east. North itself is left empty on purpose: on a clamped
// menu it is the direction the plot is most likely to be under, and a button
// sitting on the plot it acts on is the thing the leader line exists to avoid.
const ABILITY_ANGLES = [-3 * Math.PI / 4, -Math.PI / 4];

const HUD_H = 40;

// Fraction of everything spent on a tower that taking it down gives back. Low
// enough that repositioning costs something: a tier 3 archery tower is 300
// spent, so it refunds 180 and rebuilding elsewhere is 120 out of pocket.
//
// SPENT, NOT LISTED. `t.spent` is the cumulative price of the whole ladder that
// got the tower here — 70 + 90 + 140 for a tier 3 archery tower — so upgrading
// never loses you the earlier tiers' money. The encyclopedia has to work that
// sum out for a tier nobody has built yet, which is what refundOf below is for.
export const REFUND_RATE = 0.6;

export function refundValue(t) {
  return Math.floor(t.spent * REFUND_RATE);
}

// What a tier refunds when it was reached the normal way: by buying every tier
// below it. The book quotes this beside the tier's own price, so the two numbers
// answer the two questions a player actually has — what does the next step cost,
// and what do I get back if I change my mind.
// TAKES THE DEF, NOT THE TIER NUMBER, and that changed when archery forked.
//
// It used to slice the array — `tiers.slice(0, tier)` — which quietly assumed
// index n holds tier n+1. Two tier 4s in one array breaks that: slicing to 4 for
// the Crossbow Sentry would have summed the Musketeer Post's price instead of
// its own and quoted the wrong refund on the card.
//
// So it sums the rungs BELOW this one by their tier number and adds this def's
// own cost. That reads the same on a straight ladder and stays right on a forked
// one — as long as the fork is at the top, which is the assumption
// tools/families.mjs is there to hold.
export function refundOf(tiers, def) {
  const spent = tiers.reduce((sum, d) => sum + (d.tier < def.tier ? d.cost : 0), 0) + def.cost;
  return Math.floor(spent * REFUND_RATE);
}

const N = -Math.PI / 2;
const E = 0;
const S = Math.PI / 2;
const W = Math.PI;

// Plots near an edge would push buttons off-canvas or under the HUD — (332,54)
// sits 14px clear of the HUD and (596,476) is 64px off the bottom. Anchor the
// menu at a clamped point instead and let render.js draw a leader to the plot.
//
// `margin` is passed in rather than fixed, because the menu is no longer one size:
// a ring with ability buttons on it reaches 96 from the middle instead of 68, and
// clamping every menu by the widest one would drag ordinary build menus 28px
// further from their own plots for nothing.
function centre(plot, margin) {
  return {
    cx: Math.min(Math.max(plot.x, margin), 960 - margin),
    cy: Math.min(Math.max(plot.y, HUD_H + margin), 540 - margin)
  };
}

export function openMenu(state, plot, tower) {
  // The items first, because how far this menu reaches depends on what is in it.
  const items = tower ? towerItems(tower) : buildItems();
  const reach = Math.max(...items.map(it => it.ring || RING_R)) + BTN_R;
  const { cx, cy } = centre(plot, reach);

  for (const it of items) {
    const r = it.ring || RING_R;
    it.x = cx + Math.cos(it.angle) * r;
    it.y = cy + Math.sin(it.angle) * r;
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
      label: fam.name,
      cost: t1 ? t1.cost : null,
      tier: t1 ? 1 : null,
      gain: null,
      available: !!t1
    };
  });
}

// Upgrade and refund sit on the horizontal axis, not the vertical. Towers are
// 44px wide and 68 tall, so N/S buttons bury the building and its gunner —
// exactly what you want to look at while deciding whether to upgrade it.
//
// A barracks gets a third button, south, for moving its rally point. South
// rather than north because north is where the roof and the muster rings are.

// A FORKED UPGRADE SITS WHERE THE ABILITIES SIT — the wider arc above the ring,
// north-west and north-east — and it is the same two angles and the same radius
// rather than a pair chosen to look like them.
//
// It was north-east and south-east on the ordinary ring for one build, on the
// reasoning that upgrade is east and a fork is east splitting in two. On the
// board that put the south-east button hard against the standing-order button
// due south, which every archery tower carries: two discs overlapping, and the
// order button drawn over the tower you were trying to buy. The owner asked for
// the abilities' placement instead, and it is the better answer twice over —
// the arc above is empty on a tier 3, and a player who has topped out one ladder
// already knows to look up there for the big choices.
//
// THE TWO NEVER APPEAR TOGETHER, which is what makes sharing the angles safe: a
// tower with a choice left has no abilities yet, and one with abilities has no
// choice left.
//
// `ring: ABILITY_R` widens the menu's clamp on its own — see the reach line in
// openTower — so nothing else has to know these buttons are further out.

function towerItems(t) {
  // ONE ENTRY, TWO, OR NONE. Archery forks at tier 3 — a Crossbow Tower buys
  // either a Musketeer Post or a Crossbow Sentry — so what follows a tower is a
  // LIST now. See upgradesFrom in data/towers.js for why it is asked by tier
  // number rather than by array index.
  const next = upgradesFrom(t.fam, t.def);

  const items = next.length
    ? next.map((n, i) => ({
        // One button due east while there is only one thing to buy, which is
        // every ladder but archery and archery below tier 3. A fork moves both of
        // them up to the ability arc instead.
        angle: next.length === 1 ? E : ABILITY_ANGLES[i],
        ring: next.length === 1 ? undefined : ABILITY_R,
        act: 'upgrade',
        // WHICH TIER THIS BUTTON BUYS, carried on the item rather than looked up
        // again when it is pressed. With one answer the lookup was harmless; with
        // two, the button is the only thing that knows which of them the player
        // aimed at.
        to: n,
        // A TIER MAY BRING ITS OWN PICTURE, which is what `glyph` on a def is for.
        // Every rung of every ladder uses the generic arrow, because "one better
        // than what you have" is what the button means. Both tier 4s on the
        // archery fork name their own, and they have to: a fork whose two buttons
        // wore the same arrow would be a coin toss.
        glyph: n.glyph || 'up',
        label: 'Upgrade',
        cost: n.cost,
        tier: n.tier,
        gain: null,
        available: true
      }))
    : [{
        angle: E,
        act: 'upgrade',
        to: null,
        glyph: 'max',
        label: 'Max',
        cost: null,
        tier: null,
        gain: null,
        available: false
      }];

  items.push(
    {
      angle: W,
      act: 'refund',
      glyph: 'refund',
      label: 'Refund',
      tier: null,
      cost: null,
      gain: refundValue(t),
      available: true
    });

  if (t.def.soldier) {
    items.push({
      angle: S,
      act: 'rally',
      glyph: 'flag',
      label: 'Rally',
      tier: null,
      cost: null,
      gain: null,
      available: true
    });
  }

  // The archer's standing order, in the slot a barracks uses for its flag. No
  // family has both, so the south button means one thing per family.
  //
  // THE GLYPH IS THE STATE. This is the only button in the game that changes
  // what it does to itself, and menu buttons carry no words — so the picture on
  // it has to be the current order rather than a label for the act. Tapping
  // cycles, the drawing changes under your finger, and the ring stays open so
  // three taps is three taps rather than three trips through the menu.
  if (t.def.targeting) {
    items.push({
      angle: S,
      act: 'target',
      glyph: AIM_MODES[t.aimMode || 0].glyph,
      label: AIM_MODES[t.aimMode || 0].label,
      tier: null,
      cost: null,
      gain: null,
      available: true
    });
  }

  // WHAT THIS TOWER CAN STILL BE TAUGHT, on the wider arc above the ring. Empty
  // for every tier that offers nothing, which is every tier below 4 — so the menu
  // is the same menu it always was until a ladder is topped out, and then it grows
  // two buttons at the moment the Upgrade button goes dead.
  //
  // ONE BUTTON PER ABILITY, OWNED OR NOT, rather than a list of what is left to
  // buy. A ring whose buttons moved as you bought them would put the second
  // ability where the first one used to be, under a thumb that is already coming
  // down — and an ability you have paid for should still be on the menu, because
  // "what is this tower doing" is a question the ring is the natural place to
  // answer.
  abilitiesOf(t.def).forEach((a, i) => {
    const has = owns(t, a.id);
    items.push({
      angle: ABILITY_ANGLES[i % ABILITY_ANGLES.length],
      ring: ABILITY_R,
      act: 'ability',
      ability: a,
      // The whole button, not a mark to put on one — see the `plate` entries in
      // data/ui.js. drawButton draws it instead of the cream disc.
      face: a.icon,
      label: a.name,
      tier: null,
      // An owned ability quotes no price, because there is nothing left to pay.
      cost: has ? null : a.cost,
      gain: null,
      owned: has,
      available: !has
    });
  });

  return items;
}
