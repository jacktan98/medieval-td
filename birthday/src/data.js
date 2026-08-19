// THE FAMILY, THE MAPS AND THE THUGS. Everything this mini-game is made of that
// is not a rule or a drawing.
//
// --- what is borrowed and what is not -----------------------------------------
//
// TWO THINGS COME FROM THE BIG GAME, both read-only and both because the artist
// asked for them: the three MAPS and the three THUGS. A road is a list of
// waypoints and a thug is a row of numbers with a picture; copying either would
// mean two copies to fix the next time a map is redrawn, and there is nothing in
// them to disagree with.
//
// EVERYTHING ELSE IS THIS FOLDER'S OWN. The towers, the fight, the drawing, the
// loop, the screens. Nothing in `../src` imports anything from here, so this
// project cannot break that one — the only line of medieval-td that knows this
// exists is the 2208 branch on the admin keypad.

import { level01 } from '../../src/data/level01.js';
import { level02 } from '../../src/data/level02.js';
import { level03 } from '../../src/data/level03.js';
import { enemyTypes } from '../../src/data/waves.js';

export { enemyTypes };

// The three maps, in the order they are offered. Each carries its own road, its
// own plots and its own wave table — all of it the big game's, all of it
// untouched — with the PURSE overridden, because this game's towers cost
// different money and there is no upgrade ladder to spend it on.
//
// 300 rather than 220: the pop-up introduces four people and it is a nicer
// birthday present if two of them can be on the board before the first thug
// arrives.
export const START_GOLD = 300;
export const START_LIVES = 20;

export const maps = [level01, level02, level03];

// --- the family ---------------------------------------------------------------
//
// FOUR CHARACTERS, THREE LEVELS EACH. The levels are the same person with better
// numbers and the same picture, badged Lv1/Lv2/Lv3 — which is the cheapest thing
// that keeps the wave tables playable, because those tables were written for a
// game where a plot's output triples over eight waves. Without them the last wave
// of map 1 (thirty-four thugs and six giants) would be unwinnable however many
// plots were filled.
//
// TWO OF THEM STAND ON THE ROAD and two of them work from a plot, which is the
// split the artist asked for and it is also what makes the four of them a team:
//
//   Papa    one man, two swords. Stops a thug dead and cuts it down.
//   Mommy   one woman, a shotgun. Stops a thug and sprays whatever is behind it.
//   Ella    throws slime from her plot. Little damage; it is the SLOW that
//           matters, because it doubles the time everybody else gets.
//   Rei     sits on his plot and stinks. Every thug inside the smell loses
//           health continuously, all of them at once, with no aiming at all.
//
// --- where the numbers come from -----------------------------------------------
//
// They are reasoned against the thugs, which are the big game's and are not being
// retuned. A Thug is 80 health at 70px/s and hits for 10 a second; a Giant Thug is
// 1000 at 52 and hits for 25; a Plague Thug is 150 and throws from a distance.
//
// The reference points are the towers those thugs were balanced against: a
// Watchtower is 70 gold for 10 damage a second, a Crossbow Tower 140 for 31.3, and
// a Militia Camp 70 for three men of 100 health doing 9.5 between them.
//
// So the shape below is: about a Watchtower's worth of output per 100 gold at
// level 1, roughly tripling by level 3, and the two road characters carrying most
// of their value in health rather than damage — a blocker's job is to stop things,
// and stopping ignores how hard the thing hits.
//
// THEY ARE A FIRST GUESS and are meant to be played rather than trusted. Every
// number is on one line here; change it, reload, see.
//
// --- the drawings ---------------------------------------------------------------
//
// Every `art` block below is MEASURED, by `node birthday/tools/art.mjs`, and
// pasted. Two numbers per pose:
//
//   trim    the box of the 512x512 export that actually has ink on it.
//   pivot   where inside that box the drawing meets the ground, as a fraction.
//           It is the centre of the flat brown ellipse the artist paints under
//           each of them, NOT the bottom of the box — Papa holding his swords out
//           has a box 26px taller than Papa holding them up, and anchoring to the
//           box would make him bob every time he swings.
//
// `faces` is which way a drawing looks, and only the two on the road have one:
// Papa's swords and Mommy's shotgun point LEFT, so the sprite is mirrored when
// they turn. Ella and Rei face the camera from their plots and never turn, so
// there is nothing to mirror and they carry no `faces` at all.
//
// `plate` is the NAMEPLATE — a flat sign lying on the plot with the person's
// name on it. All four have one and it is drawn the same way for all four; what
// differs is what stands on it. It lies on the ground rather than standing on
// it, so its anchor is simply the middle of the box.
const FLAT = [0.5, 0.5];

// A blocker on the road. `hp`, `damage`, `cd` are his; `respawn` is how long he
// takes to walk back after being cut down, `regen` is health a second out of
// combat, and `speed` is how fast he walks to where he is sent.
const PAPA = {
  id: 'papa',
  name: 'Papa',
  kind: 'road',
  colour: '#3E6BA8',
  art: {
    faces: -1,
    idle:   { sprite: 'papa',        trim: [184, 172, 144, 168], pivot: [0.708, 0.924] },
    attack: { sprite: 'papa_attack', trim: [115, 198, 213, 142], pivot: [0.803, 0.910] },
    plate:  { sprite: 'papa_plot',   trim: [133, 208, 246, 96],  pivot: FLAT }
  },
  blurb: 'Papa plants himself on the road with a sword in each hand. ' +
         'Nothing gets past him while he is standing, and he hits harder than ' +
         'anyone in the family.',
  detail: 'He blocks ONE thug at a time and fights it until one of them falls. ' +
          'That is the whole trick of him: a blocked thug is not walking, ' +
          'whatever its speed, so a giant is stopped as easily as a small one.\n\n' +
          'He is the toughest of the four and the hardest hitting, and he is only ' +
          'one man — build a second Papa somewhere else and the road is held in ' +
          'two places.',
  // Where the player may send him from his plot, as a reach. Not a weapon range.
  levels: [
    { cost: 180, range: 190, hp: 320, damage: 12, cd: 0.55, speed: 80, respawn: 7, regen: 6 },
    { cost: 170, range: 205, hp: 460, damage: 18, cd: 0.50, speed: 84, respawn: 6, regen: 8 },
    { cost: 230, range: 220, hp: 650, damage: 26, cd: 0.45, speed: 88, respawn: 5, regen: 11 }
  ]
};

// The other road character. She blocks like Papa and her shot sprays.
const MOMMY = {
  id: 'mommy',
  name: 'Mommy',
  kind: 'road',
  colour: '#A8436B',
  art: {
    faces: -1,
    idle:   { sprite: 'mommy',        trim: [150, 179, 212, 154], pivot: [0.656, 0.917] },
    attack: { sprite: 'mommy_attack', trim: [141, 179, 221, 154], pivot: [0.670, 0.917] },
    plate:  { sprite: 'mommy_plot',   trim: [89, 196, 334, 120],  pivot: FLAT }
  },
  blurb: 'Mommy holds the road with a shotgun. She stops a thug like Papa does, ' +
         'but every shot also catches whatever is crowding in behind it.',
  detail: 'She blocks one thug and shoots it — and the same blast hits up to two ' +
          'more thugs standing near it. Against one enemy she does less than ' +
          'Papa; against a queue of them she does far more.\n\n' +
          'She is lighter than he is, so she is best put where the road is busy ' +
          'rather than where the giants come through.',
  // `splash` is how far from her target the spray reaches, `extra` how many more
  // it may catch.
  splash: 80,
  extra: 2,
  levels: [
    { cost: 150, range: 190, hp: 250, damage: 11, cd: 0.95, speed: 78, respawn: 7, regen: 6 },
    { cost: 140, range: 205, hp: 360, damage: 16, cd: 0.90, speed: 82, respawn: 6, regen: 8 },
    { cost: 200, range: 220, hp: 500, damage: 23, cd: 0.85, speed: 86, respawn: 5, regen: 10 }
  ]
};

// A plot that throws. The slime is the point rather than the damage.
const ELLA = {
  id: 'ella',
  name: 'Ella',
  kind: 'thrower',
  colour: '#4FA85A',
  art: {
    idle:   { sprite: 'ella',        trim: [219, 203, 74, 106], pivot: [0.534, 0.913] },
    attack: { sprite: 'ella_attack', trim: [219, 203, 74, 106], pivot: [0.534, 0.913] },
    plate:  { sprite: 'ella_plot',   trim: [135, 209, 242, 94], pivot: FLAT }
  },
  // The slime in flight. Drawn a little larger than the board's scale would put
  // it — see SHOT_SCALE in render.js.
  shot: { sprite: 'slime', trim: [231, 244, 50, 25], pivot: FLAT },
  blurb: 'Ella throws slime from her plot. It does not hurt much — but ' +
         'anything it lands on is stuck to the road and crawls for a while.',
  detail: 'Every hit slows a thug to about half speed for two seconds. That is ' +
          'worth more than it sounds: everything else in the family is measured ' +
          'in damage a second, so a thug that spends twice as long on the road ' +
          'takes twice as much of it.\n\n' +
          'Put her where the road is long and straight, and put Rei where ' +
          'her slime has already done its work.',
  // What a hit does besides damage: `slow` is the fraction of its speed the thug
  // keeps, `slowFor` how many seconds it keeps it.
  slow: 0.55,
  slowFor: 2,
  speed: 300,        // how fast the slime flies
  levels: [
    { cost: 110, range: 210, damage: 11, cd: 0.85 },
    { cost: 110, range: 225, damage: 18, cd: 0.75 },
    { cost: 160, range: 240, damage: 27, cd: 0.68 }
  ]
};

// The aura. No projectile, no target, no cooldown: everything inside the smell
// simply loses health.
const REI = {
  id: 'rei',
  name: 'Rei',
  kind: 'aura',
  colour: '#B98B2E',
  art: {
    idle:   { sprite: 'rei',        trim: [232, 221, 48, 71],  pivot: [0.490, 0.894] },
    attack: { sprite: 'rei_attack', trim: [197, 200, 118, 91], pivot: [0.496, 0.926] },
    plate:  { sprite: 'rei_plot',   trim: [160, 216, 192, 80], pivot: FLAT }
  },
  // The smell where it lands, which is ON THE ROAD rather than around him — see
  // smellSpots in rules.js for how few of them there are and why.
  cloud: { sprite: 'smell', trim: [223, 226, 66, 60], pivot: FLAT },
  blurb: 'Rei does what babies do, and it is unbearable. Every thug inside ' +
         'the smell loses health the whole time it is in there.',
  detail: 'He hits EVERYTHING in range at once and never has to aim. Against one ' +
          'giant that is not very much; against a wave of twenty thugs it is ' +
          'twenty times as much, which makes him the answer to a crowd and ' +
          'useless against a single big thing.\n\n' +
          'His reach is the shortest in the family, so he wants a plot right ' +
          'against the road — ideally a bend, where thugs spend longest inside it.',
  levels: [
    { cost: 120, range: 150, damage: 13 },
    { cost: 110, range: 168, damage: 22 },
    { cost: 170, range: 186, damage: 35 }
  ]
};

export const family = [PAPA, MOMMY, ELLA, REI];

export const memberById = id => family.find(f => f.id === id);

// What a level costs to reach from nothing, which is what a refund is worked out
// from — the same rule the big game uses, and the same 60%.
export const REFUND_RATE = 0.6;
export const spentTo = (member, level) =>
  member.levels.slice(0, level).reduce((sum, l) => sum + l.cost, 0);
