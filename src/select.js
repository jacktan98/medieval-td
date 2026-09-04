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
import { boost, damageK, rangeOf, reachOf } from './towers.js';
import { typeOf, pierceOf, RANK_SHORT, wornBy, stageOf } from './data/armour.js';

// How tall a figure's artwork is in game px, so the tap box covers the drawing
// rather than the collision circle. A def with no sprite yet falls back to its
// radius, the same way render.js does.
//
// The tallest drawing the figure has, for the same reason render.js takes the
// max: an archer thug is a head taller with the bow up, and a tap box that
// shrank the moment he was caught would be a target that moves while you are
// reaching for it. The Blocker's guard stance counts for the same reason — a man
// you are reaching for must not get smaller because something shot him.
const artHeight = def => {
  if (!def.spriteTrim) return def.r * 2;
  const close = def.melee && def.melee.default;
  return Math.max(def.spriteTrim[3],
                  close ? close.trim[3] : 0,
                  def.guard ? def.guard.trim[3] : 0,
                  def.heal ? def.heal.trim[3] : 0) * SCALE;
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

// WHICH ATTACK ICON A CARD SHOWS — the sword or the wand — off the def's own
// `damageType` rather than off its family. A barracks reads its SOLDIER'S kind,
// because a barracks does no damage itself and the man is what swings.
//
// One line, and it is the whole of the wiring the owner asked for: "ensure units
// that use magic use the magic attack icon".
export const attackIcon = def =>
  typeOf(def.soldier || def) === 'magic' ? 'stat_damage_magic' : 'stat_damage';

// WHAT PLATE A FIGURE WEARS, as a card prints it — a word beside an icon, in the
// row under health and attack. The owner's own layout, before the `None`s came out
// of it:
//
//     Pikeman
//     Health: 125,        Attack: 4
//     Physical Armor: Low, Magic Armor: None
//
// NO GATE ON `hp` ANY MORE, and none is needed: only a barracks soldier and an
// enemy carry `armour` in the data at all, and those are exactly the figures that
// can be reached to be hurt. An archer on his deck and a crewman behind his machine
// come out empty because they wear nothing, which is the same answer the gate gave
// and one fewer rule to keep true.
//
// ONLY WHAT HE ACTUALLY WEARS. `None` used to be printed, on the argument that a
// row which appears and vanishes reads as a card that forgot to say. The owner
// looked at it and disagreed — "I want those with None for Armor removed so that
// it is cleaner" — and on a page where every card carries the pair, they are
// right: four of the five men in a barracks wear no magic plate, so `None` was
// the most common word in the book and it said nothing.
//
// RANK_SHORT rather than RANK_NAME, and see the note beside it in data/armour.js:
// "Medium" is 4px wider than the description panel has left for it.
//
// Returns PAIRS, in the shape every stat row in this game is built from — an icon
// key and the text beside it — rather than an object the two call sites would each
// have to turn into a row. That is what keeps the encyclopedia's copy of this line
// and the description panel's copy identical: there is one line.
// WHAT IT IS WEARING, and there are two right answers depending on who is asking.
//
// A BOOK asks about a creature — "what is a Blocker Thug" — and the answer is the
// plate on his card, which is what he walks in. It has to be stable: a reference
// page whose numbers changed while you read it would be useless.
//
// THE PANEL asks about a MAN, one particular one, standing on the road right now,
// with a health bar over his head counting down. There the live answer is the only
// useful one — a Blocker behind his shield reads High/High, and the moment a
// spearman gets hold of him he reads Low, which is the player watching the
// mechanic work rather than being told about it afterwards.
//
// So `fig` is optional and its presence is the question being asked. Absent, the
// def; present, whatever wornBy says he has on this frame. Everything else in the
// game answers the same either way, because nothing else changes its plate.
function armourRow(def, fig) {
  const a = (fig ? wornBy(fig) : (def.soldier || def).armour) || {};
  const out = [];
  if (a.physical && a.physical !== 'none') out.push(['stat_armour', RANK_SHORT[a.physical]]);
  if (a.magic && a.magic !== 'none') out.push(['stat_armour_magic', RANK_SHORT[a.magic]]);
  return out;
}

// HOW WIDE A BLAST IS, or null for the great majority that hit one thing. Two
// places keep it and this is what untangles them, the way `shownRange` untangles
// reach:
//
//   a TOWER      its own `splash` — a catapult's 75, the Cannon Outpost's 85
//   an ENEMY     the AMMUNITION's, because the plague doctor's spread belongs to
//                the flask rather than to the man: he swings a fist for 20 and it
//                hits one soldier.
//
// ZERO IS NOT A NUMBER TO PRINT. `splash: 0` is how data/towers.js says "a pure
// single-target catapult" — a real setting with a comment of its own — and an
// area-of-damage icon with a 0 beside it would be a card advertising the absence
// of the thing the icon is for.
export function shownSplash(def) {
  const d = def.soldier || def;
  const wide = d.splash ?? (d.ranged && d.ranged.ammo && d.ranged.ammo.splash);
  return wide ? wide : null;
}

// THE SECOND LINE OF EVERY STAT BLOCK IN THE GAME: what a figure is wearing, and
// what its attack does to what the other man is wearing.
//
// ONE FUNCTION FOR FOUR SURFACES — a unit card, an enemy card, and the description
// panel's two shapes — which is the whole reason it returns pairs rather than a
// shape each caller unpacks. The owner asked for these icons in the encyclopedia
// AND the panel, and the way to guarantee a book and a board that agree is not to
// write the row twice carefully.
//
// THE ORDER IS DEFENCE THEN OFFENCE, and it reads left to right as the sentence a
// player is actually asking: what does this thing survive, and what does it get
// through. A Paladin is High/Low and breaks nothing; a Cannoneer wears nothing and
// breaks two ranks over an 85-wide blast.
//
// PIERCE TAKES THE COLOUR OF THE ATTACK IT BELONGS TO — the grey shield for a
// cannonball, the blue one for a monk — because a break only ever applies to its
// own kind of armour. That is the rule in data/armour.js, said in a picture.
// `fig` is the LIVE figure when there is one, and it only reaches the armour
// half — see armourRow. Pierce and blast are facts about a weapon and do not
// change while a man is holding it.
export function traitRow(def, fig = null) {
  const man = def.soldier || def;
  const out = armourRow(def, fig);

  const p = pierceOf(man);
  if (p) out.push([typeOf(man) === 'magic' ? 'stat_pierce_magic' : 'stat_pierce', p]);

  const wide = shownSplash(def);
  if (wide) out.push(['stat_splash', wide]);

  return out;
}

// NO PROSE ANY MORE, and this is where a `statLines` used to be.
//
// It wrote out what each rank was worth — "Medium physical armour, takes 50% of
// physical damage" — and opened under the picture when a card was tapped. The
// owner took it out: "replace the description text with these icons to make it
// minimalistic, remove all text in Units and Enemies and just leave icons and
// numbers, as I think I have all the icons to describe the stats for now."
//
// Which is the right call once the icons exist. The paragraph was a gloss on a row
// the player was already looking at, in a pop-up they had to open to read it, and
// it said the same thing about every unarmoured figure in the game — most of the
// book. An armour icon with `Med` beside it is the fact; the percentage behind it
// is a rule a player learns once, not something a reference page should repeat
// twenty times.
//
// ABILITIES KEPT THEIRS, and that is not an inconsistency. An ability is a RULE
// rather than a thing — there is no number to put beside a picture of it — which
// is the same reason its pop-up has always been the only one laid out as prose.

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
    // HOW MANY OF HIM. A barracks says so on its squad; every tower said one, and
    // that was true of every tower until the Judgement Temple put two monks on one
    // floor. `pair` is the list of where they stand, so its length is the count —
    // read from there rather than from a second field, because a number that had
    // to be kept in step with the list would be a number that eventually was not.
    count: man ? man.count : (def.pair ? def.pair.length : 1),
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
    // TWO MULTIPLIERS, and both of them for the same reason. `boost` is the map's
    // — Holy Wrath, a fact about the other towers on the board — and `damageK` is
    // this tower's own, which today is the Judgement Temple's Inner Strength.
    //
    // The aura half has been here since Holy Wrath shipped and the argument was
    // written down then: a player who has bought it and reads 60 would think it
    // had not worked. Inner Strength is worse, because it is bought ON this tower
    // and the box is the only place its 30% is ever shown — the owner asked for
    // exactly this: "ensure description panel is updated if inner strength is
    // owned". shoot() multiplies by both, in this order, and rounds once.
    const k = damageK(s.ref) * boost(state, 'damage', s.ref.fam.id);
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
      // ROUNDED, NOT CEILED, and this is the one number in the box that does not
      // follow the health rows. It has to agree with the SHOT: towers.js rounds
      // by exactly this when it creates one, and a card claiming 28 where the
      // arrow does 27 is the card lying. Holy Wrath is 5%, so the two differ
      // wherever a base damage times 1.05 lands past a half — 26 becomes 27.3,
      // which is 27 fired and would be 28 printed. The health rows have no such
      // partner to agree with; this one does.
      //
      // ONE ROUNDING, over the product of both multipliers, which is what makes
      // that agreement hold with two of them. A temple with Inner Strength under
      // a Holy Wrath fires round(40 x 1.30 x 1.05) = 55; rounding the ability in
      // first and the aura onto the result would print 55 too here and 54 or 56
      // somewhere else the day either number moves.
      damage: Math.round(man.damage * k),
      // The sword or the wand, off this tower's own kind — the panel is the one
      // place a player sees it while a fight is happening.
      attack: attackIcon(s.ref.def),
      // NO ARMOUR ROW ON A TOWER, and it is the same reason there is no health row:
      // a building cannot be hurt, and neither can the archer standing on it. The
      // one tower whose man wears plate is a barracks, and that man is on the road
      // — tapping HIM is the question armour answers.
      //
      // Which is what leaves the reach row where it has always been. The owner drew
      // the line here: "remove range for units in description panels as there is no
      // space, only leave the range for units in towers".
      //
      // BUT A TOWER DOES GET THE REST OF THE ROW, and that is the owner's ask:
      // "add all 3 where applicable in encyclopedia and description panel". A
      // Cannon Outpost breaks two ranks over an 85-wide blast, and the panel is
      // where a player looks while deciding what to build next.
      //
      // A LIST RATHER THAN NULL, so the panel's second row is one shape everywhere:
      // pairs, possibly none of them. See drawInfo — an empty row is drawn as an
      // empty row and the block above it does not move.
      traits: traitRow(s.ref.def),
      // HOW FAR IT ACTUALLY REACHES, ring included — rangeOf() is the number
      // the targeting reads, so a tower that has bought Far Shot shows the
      // wider figure here rather than the one it was sold at. The book shows
      // the sold figure; this box shows THIS tower, and the two differ on
      // purpose.
      //
      // Null for a barracks: shownRange says why, and rangeOf would answer with
      // its rally radius, which is not a reach at all.
      //
      // UNLESS ITS MEN THROW. An Assassin Guild that has bought Knife Throw has a
      // real reach to print — 100px, the distance a knife carries — and that row
      // is otherwise blank on this family, so the ability arrives as a stat
      // appearing rather than a number changing. reachOf is null for every other
      // tower and for an untaught Guild, so the branch is the same one line for
      // everybody: whatever this tower can hurt somebody at, or nothing.
      range: shownRange(s.ref.def) === null ? reachOf(s.ref) : rangeOf(s.ref)
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
  // THE PICTURE FOLLOWS THE STAGE, at the owner's word: "the description panel in
  // the game also updates to this image". Every figure in this game is portrayed by
  // its def's own Default, and the enraged Captain is the first that is not the
  // creature its def describes — he has thrown away the shield and the bow the
  // walking drawing shows him carrying.
  //
  // Through the same `stageOf` that answers for his armour two rows down, so the
  // panel cannot show one stage's picture beside the other stage's plate.
  const shown = stageOf(f);
  return {
    sprite: shown.sprite || f.def.sprite,
    trim: shown.trim || f.def.spriteTrim,
    title: f.def.name,
    // WHOLE NUMBERS, BOTH OF THEM, and rounded UP. Display only — the fight goes
    // on using the fractions.
    //
    // The ceiling is the one that made this necessary. Divine Fortitude is 10%
    // and a paladin's 275 is not a multiple of 10, so a buffed keep read
    // "302.5" — and a box quoting a stat to one decimal place is quoting a
    // number the player cannot do anything with. Soldiers regen fractionally
    // too, so the live half was already rounded; this makes the pair agree.
    //
    // UP RATHER THAN NEAREST, which is the owner's word and is also the right
    // one twice over: 302.5 becomes 303 as asked, and a man on his last splinter
    // of health reads 1 rather than 0. A living figure showing 0 health is the
    // worst thing this box could say.
    //
    // THE SAME FUNCTION FOR BOTH or a man at full health reads 302/303. That is
    // the trap here: it is not two roundings, it is one applied twice.
    hp: Math.max(0, Math.ceil(f.hp)),
    maxHp: Math.ceil(f.maxHp),
    // AND SO DOES THE BLADE. His sword is enchanted in stage 2 — magic where it
    // was physical — so the icon beside the number has to change with it or the
    // panel would promise a player that a paladin's plate still answers him.
    damage: shownDamage(f.def),
    // THE SWORD OR THE WAND, off this figure's own kind. The panel had no `attack`
    // at all until the armour row arrived, so it fell through to the sword for
    // everybody — which was a wrong picture rather than a missing one, and the one
    // figure it was wrong about is the plague doctor, whose whole point is that he
    // is the magic on this board. The encyclopedia's enemy card has always shown
    // his wand; the two surfaces disagreed.
    attack: attackIcon(shown),
    // The two ranks, on the row where the reach used to be — HIS, not his kind's.
    // Every figure in the game but one reads the same either way; the Blocker
    // Thug is why the live one is asked for. See armourRow.
    traits: traitRow(f.def, f),
    // AND NO REACH, which is what armour cost. The panel is 68px tall and holds a
    // title over two stat rows at the most — see ROW_PITCH in render.js — so a
    // third line was never available, and the owner chose which of the two goes in
    // it: "remove range for units in description panels as there is no space".
    //
    // It is the right way round. An archer thug's 200 says why a tower is not
    // answering him, which a player works out in about a second by watching; his
    // armour says whether the tower they are about to build can hurt him at all,
    // which nothing on the board shows. And the number is not lost — his card in
    // the encyclopedia still prints it, on a page with room for three figures.
    range: null
  };
}
