// THE FAMILY, THE MAPS AND THE THUGS. Everything this mini-game is made of that
// is not a rule or a drawing.
//
// --- what is borrowed and what is not -----------------------------------------
//
// TWO THINGS COME FROM THE BIG GAME, both read-only and both because the artist
// asked for them: the three MAPS and the THUGS. A road is a list of waypoints and
// a thug is a row of numbers with a picture; copying either would mean two copies
// to fix the next time a map is redrawn, and there is nothing in them to disagree
// with. This game keeps its own view of a handful of the thugs' numbers — see the
// block below — but it never writes any of it back.
//
// EVERYTHING ELSE IS THIS FOLDER'S OWN. The towers, the fight, the drawing, the
// loop, the screens. Nothing in `../src` imports anything from here, so this
// project cannot break that one — the only line of medieval-td that knows this
// exists is the 2208 branch on the admin keypad.

import { level01 } from '../../src/data/level01.js';
import { level02 } from '../../src/data/level02.js';
import { level03 } from '../../src/data/level03.js';
import { enemyTypes as bigGameEnemies } from '../../src/data/waves.js';

// --- the thugs, as THIS game wants them -------------------------------------------
//
// The pictures, the speeds and the behaviour are still the big game's — they are
// imported above and nothing is written back. What is different here is three
// numbers, and each is a thing the owner asked for after playing it:
//
//   NO PLAGUE THUG AT ALL. He is dropped from the roster rather than merely left
//   out of the wave tables, so nothing in this folder can accidentally bring him
//   back — and so the stats panel's one portrait scale is worked out from the
//   thugs that actually turn up.
//
//   A THUG PAYS LESS. Gold from bodies is cut by a third across the board. It is
//   the difficulty lever that costs nothing in fairness: the same thugs arrive at
//   the same time, and the board fills a little slower behind them. The wave
//   bonus in `purse` below is untouched, so a player who holds the line still
//   gets paid for holding it.
//
//   A GIANT IS HALF AS TOUGH AGAIN. 1000 to 1500 health. He was the one enemy
//   the family could burn down about as fast as an ordinary thug once two of them
//   were levelled, which made "a giant is coming" a sentence with nothing behind
//   it. He is now what he looks like.
const BOUNTY = 2 / 3;
const GIANT_HP = 1.5;

export const enemyTypes = Object.fromEntries(
  Object.entries(bigGameEnemies)
    .filter(([type]) => type !== 'plague_inf')
    .map(([type, def]) => [type, {
      ...def,
      bounty: Math.round(def.bounty * BOUNTY),
      hp: type === 'heavy_inf' ? Math.round(def.hp * GIANT_HP) : def.hp
    }])
);

// THE PURSE YOU OPEN WITH, and it is per map for the same reason the wave bonus
// is: what a board costs to get started on depends on the board.
//
// 300 rather than the big game's 220 to begin with — the pop-up introduces the
// family, and it is a nicer birthday present if two of them can be on the board
// before the first thug arrives.
//
// TWO RIVERS OPENS WITH NEARLY TWICE AS MUCH, and that is the single most useful
// thing the sim found. Counting where the lives actually went on that map: waves
// 1, 2 and 3 leaked 3.1, 4.3 and 5.3 of them, and waves 4 to 10 leaked NOTHING.
// It was never an endgame problem — it has two roads and eleven plots, so 300
// gold covers one road and the first three waves walk down the other one. Every
// attempt to fix it by thinning the late waves made it worse, because a thug is
// 10 gold and thinning them starved the board further.
//
// ALL THREE WERE RAISED AGAIN when the thugs' bounty was cut by a third. That cut
// is a difficulty change and it is meant to be one; what it must NOT do is put
// the leaks back at the front of the map, where the board is empty and the player
// has nothing to do about them. The opening purse pays for the opening, and the
// difficulty lives in the last three waves of each table.
export const START_LIVES = 20;
const START_GOLD = [300, 340, 560];

// --- the waves are THIS GAME'S now ------------------------------------------------
//
// They used to be the big game's, imported with the map. They cannot be any more,
// because the story the owner asked for changes what the player HAS on each map:
//
//   The Bend      5 waves, and only Mommy and Ella to hold it
//   The Fork      8 waves, with Papa unlocked
//   Two Rivers   10 waves, with Rei unlocked — and hordes, which are his answer
//
// A table written for four towers of four tiers on a board of nine plots is the
// wrong shape for two people, whatever it is scaled by. So each map gets a table
// written against the roster it is played with, and `node birthday/tools/sim.mjs`
// is what says whether it landed.
//
// THE ROADS, THE PLOTS AND THE THUGS ARE STILL THE BIG GAME'S. Only the tables
// below are ours — `map.waves` is overridden on the way past, and nothing is
// written back into the level files.
//
// --- the shape of each one ---------------------------------------------------------
//
// NORMAL, not easy, and that is a change the owner asked for after playing the
// first cut. Every wave below is bigger or closer together than it was — The
// Bend's last wave went from 22 thugs to 50 — and it is still two stars to pass
// rather than three.
//
// THE DIFFICULTY IS IN THE BACK HALF ON PURPOSE, and that is worth stating because
// the first attempt at "harder" put it in the front half instead and measured
// worse in every way. Counting lives against the wave they were lost on: with
// bigger opening waves, The Fork leaked 3.0, 2.4, 1.3 and 2.1 in waves 1 to 4 and
// NOTHING in waves 5 to 8. That is not a hard map, it is a map that is decided
// before the player has had a turn — there is nothing to do about wave 1 except
// have started with more gold. So the openings are gentle, the purses cover them,
// and the last three waves of each table are where a map is won or lost.
//
// TWO KINDS OF THUG NOW, since the Plague Thug is gone. What he took with him was
// most of each map's ranged pressure, so the counts below carry it instead: more
// bodies, arriving closer together, which is the pressure this family is built to
// answer.
//
// NO GIANTS AT ALL ON THE BEND. A Giant Thug is 1500 health here, and against two
// people who between them do about 25 damage a second at level 1 it simply walks
// through — the answer to a giant in this game is Papa standing in front of it,
// and Papa is not unlocked yet. Putting one on the tutorial map would teach the
// player that the game is unfair rather than that giants are hard.
//
// HORDES ON TWO RIVERS, and that is the whole point of the last map. Rei damages
// everything in his reach at once, so his value is exactly the number of thugs
// standing in it; a wave of forty is worth forty times a wave of one to him and
// nothing at all to anybody else. The counts below climb far faster than the big
// game's while the giants climb slower.
const thugs = (count, gap) => ({ type: 'light_inf', count, gap });
const giants = (count, gap) => ({ type: 'heavy_inf', count, gap });

const bendWaves = [
  { groups: [thugs(5, 1.5)] },
  { groups: [thugs(14, 1.10)] },
  { groups: [thugs(24, 0.85)] },
  { groups: [thugs(34, 0.70)] },
  { groups: [thugs(50, 0.50)] }
];

const forkWaves = [
  { groups: [thugs(4, 1.6)] },
  { groups: [thugs(7, 1.4)] },
  { groups: [thugs(10, 1.2)] },
  { groups: [thugs(13, 1.05), giants(1, 2)] },
  { groups: [thugs(17, 0.95), giants(1, 2)] },
  { groups: [thugs(21, 0.85), giants(2, 1.9)] },
  { groups: [thugs(24, 0.78), giants(2, 1.7)] },
  { groups: [thugs(30, 0.68), giants(3, 1.5)] }
];

const riverWaves = [
  { groups: [thugs(4, 1.5)] },
  { groups: [thugs(6, 1.35)] },
  { groups: [thugs(10, 1.15)] },
  { groups: [thugs(15, 1.00)] },
  { groups: [thugs(20, 0.90), giants(1, 2)] },
  { groups: [thugs(25, 0.80), giants(1, 1.9)] },
  { groups: [thugs(30, 0.70), giants(2, 1.7)] },
  { groups: [thugs(34, 0.62), giants(3, 1.6)] },
  { groups: [thugs(38, 0.58), giants(3, 1.5)] },
  { groups: [thugs(44, 0.52), giants(4, 1.5)] }
];

// WHAT A CLEARED WAVE PAYS, per map, as `base + step per wave cleared`.
//
// It is per map rather than one number for the game, and finding that out was the
// most useful thing the sim did all evening. Two Rivers kept failing however much
// its waves were thinned — and thinning them made it WORSE, which is the shape of
// a money problem rather than a difficulty one. A thug is 10 gold, so cutting
// thirty of them out of the back half quietly removes 300 gold from a map that
// has ELEVEN plots to fill and ten waves to fill them in. The board could not be
// finished, so the last waves met a half-built map.
//
// So the money is set against the board rather than against the danger: nine
// plots over five waves on The Bend, nine over eight on The Fork, eleven over ten
// on Two Rivers. Turn these BEFORE touching anybody's damage — they lift or drop
// every build on one map equally, and so do not change which of the four is worth
// having there.
const purse = (base, step) => ({ base, step });

// The three maps, in the order they are offered and unlocked. Each is the big
// game's level object with this game's wave table and purse on it — a shallow
// copy, so the level files themselves are never touched and the big game cannot
// notice this folder exists.
export const maps = [
  { ...level01, waves: bendWaves, gold: START_GOLD[0], purse: purse(95, 26) },
  { ...level02, waves: forkWaves, gold: START_GOLD[1], purse: purse(105, 30) },
  { ...level03, waves: riverWaves, gold: START_GOLD[2], purse: purse(155, 46) }
];

// Their names, for the screens and for the sentence that says what unlocks what.
export const mapNames = maps.map(m => m.name);

// EVERYTHING ON THE BOARD IS DRAWN AT THIS, 105/512 of the source file, and it
// is the big game's own number rather than a coincidence: the thugs on this
// board ARE the big game's thugs, so anything standing next to one has to be
// measured with the same ruler or the family come out as giants.
//
// It lives here rather than in render.js because two files need it now — the
// drawing, and the rule that decides which figure a tap landed on, which has to
// use the box the picture actually occupies.
export const SCALE = 105 / 512;

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
//   Mommy   one woman, a shotgun. Stands on the road like Papa and SHOOTS —
//           a short-ranged blast that puts a bullet into everything near
//           whatever she aimed at.
//   Ella    throws slime from her plot. Little damage; it is the SLOW that
//           matters, because it doubles the time everybody else gets.
//   Rei     sits on his plot and stinks. Every thug inside the smell loses
//           health continuously, all of them at once, with no aiming at all.
//
// --- where the numbers come from -----------------------------------------------
//
// They are reasoned against the thugs. A Thug is 80 health at 70px/s and hits for
// 10 a second; a Giant Thug is 1500 here — see the override at the top of this
// file — at 52, and hits for 25.
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
  blurb: 'Two swords, and he plants himself on the road. Nothing gets past him ' +
         'while he is standing.',
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
  blurb: 'A shotgun on the road. She shoots thugs before they reach her, and ' +
         'the blast catches whatever is beside them.',
  detail: 'She stands on the road like Papa and stops what walks into her — but ' +
          'she does not wait for it. Anything within a short reach is shot, and ' +
          'the blast puts a bullet into up to two more thugs standing near ' +
          'whatever she aimed at.\n\n' +
          'Against one enemy she does less than Papa; against a queue of them she ' +
          'does far more. She is lighter than he is, so she is best put where the ' +
          'road is busy rather than where the giants come through.',
  // HER GUN, and it is a different reach from `range` on a level below. `range`
  // is how far from her plot the player may send her; `gun` is how far she can
  // shoot from wherever she is standing. Short on purpose — the artist asked for
  // "ranged but not too far" — so she is still a road character who happens to
  // fire rather than a second tower.
  //
  // `splash` is how far from whatever she aimed at the blast reaches, and `extra`
  // how many more thugs it may catch. Every one of them gets its own bullet
  // drawn, which is the whole picture of a shotgun: one trigger pull, several
  // things hit at once.
  gun: 130,
  splash: 70,
  extra: 2,
  // The pellets. Drawn pointing LEFT, like she is, and turned to face wherever
  // they are flying — see `faces` and the rotation in render.js.
  shot: { sprite: 'bullet', trim: [246, 249, 20, 14], pivot: [0.5, 0.5], faces: -1, k: 1.6 },
  levels: [
    { cost: 150, range: 190, hp: 250, damage: 10, cd: 1.00, speed: 78, respawn: 7, regen: 6 },
    { cost: 140, range: 205, hp: 360, damage: 15, cd: 0.95, speed: 82, respawn: 6, regen: 8 },
    { cost: 200, range: 220, hp: 500, damage: 21, cd: 0.90, speed: 86, respawn: 5, regen: 10 }
  ],
  // How fast a pellet flies. Fast enough to read as a shot rather than a throw.
  speed: 620
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
  // The slime in flight. `k` is how much bigger than the board's scale it is
  // drawn: 50 source pixels across lands as a 10px blob, which is too small to
  // see coming on a phone held by somebody who is five. It carries no `faces`,
  // because a blob has no front and is not turned.
  shot: { sprite: 'slime', trim: [231, 244, 50, 25], pivot: FLAT, k: 1.4 },
  blurb: 'Slime from her plot. It barely hurts — but anything it lands on is ' +
         'stuck to the road for a while.',
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
  blurb: 'He does what babies do, and it is unbearable. Every thug inside the ' +
         'smell loses health the whole time.',
  detail: 'He hits EVERYTHING in range at once and never has to aim. Against one ' +
          'giant that is not very much; against a wave of twenty thugs it is ' +
          'twenty times as much, which makes him the answer to a crowd and ' +
          'useless against a single big thing.\n\n' +
          'His reach is the shortest in the family, so he wants a plot right ' +
          'against the road — ideally a bend, where thugs spend longest inside it.',
  // DOWN FROM 13/22/35, then down again to 8/13/20. He was the best gold in the
  // game and it was not close: damage a second against EVERYTHING in reach is
  // worth its face value times however many thugs are in there, and a wave of
  // twenty walking through a level 3 smell was 700 damage a second for 400 gold.
  //
  // The second cut is smaller than the first and is aimed at the last map rather
  // than at him — Two Rivers now sends forty at a time, and each of those forty
  // multiplies whatever this number is. He is still the answer to a horde; he is
  // no longer the answer on his own.
  levels: [
    { cost: 90, range: 150, damage: 8 },
    { cost: 85, range: 168, damage: 13 },
    { cost: 130, range: 186, damage: 20 }
  ]
};

export const family = [PAPA, MOMMY, ELLA, REI];

export const memberById = id => family.find(f => f.id === id);

// What a level costs to reach from nothing, which is what a refund is worked out
// from — the same rule the big game uses, and the same 60%.
export const REFUND_RATE = 0.6;
export const spentTo = (member, level) =>
  member.levels.slice(0, level).reduce((sum, l) => sum + l.cost, 0);
