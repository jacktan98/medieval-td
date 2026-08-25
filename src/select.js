// What the player is looking at, and what the info box should say about it.
//
// One selection at a time, held as a direct reference to the live thing rather
// than as an index or an id. That is what makes the health readout live: the box
// re-reads `hp` off the same object the fight is damaging, every frame, with
// nothing to keep in step. The cost of a direct reference is that it can outlive
// what it points at, which is what validate() is for.
//
// Three kinds can be selected and they are not symmetrical:
//
//   an enemy    walks, fights, dies         name, live health, damage
//   a soldier   walks, fights, respawns     name, live health, damage
//   a tower     stands there                name, damage — and no health,
//                                           because a tower cannot be hurt
//
// A tower shows the MAN, not the building. That is the player's call and it is
// the right one: the building is already on the board in front of you at the
// size the game draws it, and what you actually want to compare between tiers is
// the soldier or the archer it puts on the road.

import { SCALE } from './data/towers.js';
import { boost, rangeOf } from './towers.js';

// How tall a figure's artwork is in game px, so the tap box covers the drawing
// rather than the collision circle. A def with no sprite yet falls back to its
// radius, the same way render.js does.
//
// The tallest drawing the figure has, for the same reason render.js takes the
// max: an archer thug is a head taller with the bow up, and a tap box that
// shrank the moment he was caught would be a target that moves while you are
// reaching for it.
const artHeight = def => {
  if (!def.spriteTrim) return def.r * 2;
  const close = def.melee && def.melee.default;
  return Math.max(def.spriteTrim[3], close ? close.trim[3] : 0) * SCALE;
};

// Slack around a figure's drawn box, in game px. A militiaman is 23px tall and
// 12 across; without the padding he is a target roughly 4mm square on a phone,
// which is under half the 44px minimum. This does not have to be exact — it is a
// look-at, not a fire button — so it errs generous.
const PAD = 8;

// The figure under a tap, or null. Nearest the camera wins: `y` is the ground
// anchor, so the largest y is the one drawn last and on top, which is the one
// the player believes they tapped.
export function pickFigure(state, x, y) {
  let best = null;

  for (const [kind, list] of [['unit', state.units], ['enemy', state.enemies]]) {
    for (const f of list) {
      // A soldier waiting to respawn is a muster ring, not a man. There is
      // nothing on the board to have tapped.
      if (kind === 'unit' && f.respawn > 0) continue;

      const half = Math.max(f.def.r, 8) + PAD;
      const top = f.y - artHeight(f.def) - PAD;
      if (x < f.x - half || x > f.x + half || y < top || y > f.y + PAD) continue;
      if (!best || f.y > best.ref.y) best = { kind, ref: f };
    }
  }

  return best;
}

// Drop a selection whose subject has left the game — a killed enemy, a sold
// tower, a soldier cut down. Called once a frame from main.js rather than from
// the draw, so the renderer stays a pure reader of state.
//
// A soldier who is merely DEAD stays selected: he respawns into the same object,
// so the box keeps his slot and shows him coming back. It is only removal from
// the list that ends a selection.
export function validate(state) {
  const s = state.selected;
  if (!s) return;

  const list = s.kind === 'unit' ? state.units
             : s.kind === 'enemy' ? state.enemies
             : state.towers;

  if (!list.includes(s.ref)) state.selected = null;
}

// THE ATTACK NUMBER A CARD SHOWS, which is not always the one the rules use.
//
// Almost everything in the game does one kind of damage and `damage` is it. The
// plague doctor does two — a feeble melee if he is caught, and a flask that
// poisons — and the melee is the one the rules read while the flask is the one
// the player needs to know about. `listedDamage` is how a def says so, and it is
// derived from the ammunition rather than typed, so the two cannot drift.
//
// Here rather than in render.js because this file already owns the question of
// what the UI should say about a thing, and the book and the info box must not
// answer it differently.
export const shownDamage = def => def.listedDamage ?? def.damage;

// HOW FAR A CARD SAYS SOMETHING REACHES, or null for anything that fights at
// arm's length. The three kinds keep their reach in three different places and
// this is the one question that untangles them, exactly as `occupant` untangles
// where a tower keeps its man:
//
//   an ENEMY who throws or looses    `ranged.range` — the doctor's 130, the
//                                    archer's 200
//   a TOWER that fires               its own `range`, which is also the reach of
//                                    the man standing on it
//   a BARRACKS                       null, and this is the one worth naming: its
//                                    `range` is how far its men may be rallied,
//                                    not how far anything shoots. Printing it
//                                    beside a swordsman would be a number that
//                                    means something else entirely.
//   anybody else                     null: a thug, a giant, a spearman
//
// A tower that has bought Far Shot reaches further than its def says — see
// rangeOf() in towers.js, which the info box asks instead. This is the question
// about a tier as it is SOLD, which is what the encyclopedia is for.
export const shownRange = def =>
  def.ranged ? def.ranged.range
  : def.soldier ? null
  : def.cooldown ? def.range
  : null;

// WHO A TOWER PUTS ON THE BOARD, in one shape, whichever family it belongs to.
//
// The three families hide their man in three different places: a barracks SENDS
// him out and keeps his whole stat block under `def.soldier`, an archery tower
// STANDS him on the deck as a `gunner`, and a catapult has him drawn into all
// three machine frames and carries a `portrait` file that exists only to be
// looked at. Nothing downstream should have to know that, so it is untangled
// once, here.
//
// Two callers, and they are the reason this is exported rather than inlined: the
// info box captions the selected tower with it, and the encyclopedia lists every
// tier's occupant with it. A book that disagreed with the box about what a tower
// contains would be worse than no book.
//
// `count` is how many men the tower is worth — a squad for a barracks, one for
// everyone else — and `hp` is null for anybody who cannot be reached to be hurt.
export function occupant(def) {
  const man = def.soldier;
  return {
    name: man ? man.name : def.unit,
    count: man ? man.count : 1,
    sprite: man ? man.sprite : def.portrait || def.gunner,
    trim: man ? man.spriteTrim : def.portraitTrim || def.gunnerTrim,
    // The centre of his ground shadow, as a fraction of that trim — the point he
    // STANDS on. Three names again for the same reason as the trim above, and
    // the encyclopedia is what needs it: a column of men lined up by their
    // bounding boxes stand in three different places, because a spear and a pike
    // stick out by different amounts on different sides.
    pivot: man ? man.pivot : def.portraitPivot || def.gunnerPivot,
    hp: man ? man.hp : null,
    // A barracks does no damage itself; its men do. Reading the building's own
    // (nonexistent) damage would print a 0 under a tent full of spears.
    damage: man ? man.damage : shownDamage(def)
  };
}

// Everything the info box draws, or null when there is nothing selected. Shaped
// here rather than in render.js so the three kinds are reconciled in one place
// and the drawing is just a layout.
export function selectionInfo(state) {
  const s = state.selected;
  if (!s) return null;

  if (s.kind === 'tower') {
    const man = occupant(s.ref.def);
    // WHAT THIS TOWER ACTUALLY HITS FOR, aura included. The card has to agree with
    // the shot: towers.js multiplies by exactly this when it creates one, and a
    // player who has bought Holy Wrath and reads 60 here would think it had not
    // worked. Rounded the same way the shot is, so the two are the same number.
    //
    // A barracks reads 1 whatever is on the map — Holy Wrath does not reach its
    // men — so no special case is needed for the family that shows a soldier's
    // damage rather than the building's.
    const k = boost(state, 'damage', s.ref.fam.id);
    return {
      sprite: man.sprite,
      trim: man.trim,
      title: man.name,
      // A TOWER HAS NO HEALTH — nothing in the game can hurt a building — so the
      // box shows one stat row rather than two. That is true even of the men in
      // it: an archer on his deck and a crewman behind his machine cannot be
      // reached either, and only a barracks sends anybody out to be hit. Their
      // health belongs to the soldier standing on the road, which is a selection
      // of its own.
      hp: null,
      maxHp: null,
      damage: Math.round(man.damage * k),
      // HOW FAR IT ACTUALLY REACHES, ring included — rangeOf() is the number
      // the targeting reads, so a tower that has bought Far Shot shows the
      // wider figure here rather than the one it was sold at. The book shows
      // the sold figure; this box shows THIS tower, and the two differ on
      // purpose.
      //
      // Null for a barracks: shownRange says why, and rangeOf would answer with
      // its rally radius, which is not a reach at all.
      range: shownRange(s.ref.def) === null ? null : rangeOf(s.ref)
    };
  }

  const f = s.ref;
  // A soldier's ceiling is raised by Divine Fortitude, and units.js has already
  // done it — his `maxHp` IS the buffed number, live, so the card needs no
  // arithmetic of its own here and only has to know whether to say so. Read off
  // the man rather than off the map, because a man mustered by a barracks whose
  // family an aura did not name would be unbuffed while the aura was still up.
  //
  // His damage is not buffed by anything today: the one aura that touches damage
  // names the shooting families and not the barracks, so what he hits for is what
  // his def says. If that ever changes it changes in units.js first, and this line
  // follows it — the card must never claim a boost the fight is not applying.
  return {
    sprite: f.def.sprite,
    trim: f.def.spriteTrim,
    title: f.def.name,
    // Rounded for display only. Soldiers regen fractionally out of combat and a
    // box reading "82.4/105" is noise where "82/105" is information.
    hp: Math.max(0, Math.round(f.hp)),
    maxHp: f.maxHp,
    damage: shownDamage(f.def),
    // An archer thug's 200 and a plague doctor's 130 are the two numbers that
    // explain why a tower is not answering them; everybody else on the road
    // fights at arm's length and gets no row.
    range: shownRange(f.def)
  };
}
