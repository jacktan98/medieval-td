// THE PEOPLE WHO LIVE ON THE BOARD, and the one figure in this game with no part
// in the fight. Nothing shoots him, he blocks nobody, he costs nothing. Tapping him
// opens his card and that is all he does.
//
// HE IS NOT DRAWN BY THIS FILE, AND THAT IS THE WHOLE DESIGN. He is painted into
// every stage's artwork and stays there — the base the game loads has him in it, in the
// pose the artist drew, exactly, forever. What this file holds is WHERE he is, so a
// tap can find him, and WHO he is, so the panel can say.
//
// IT WAS THE OTHER WAY ROUND FOR ONE BUILD and the owner's verdict was "it's bad".
// He was cut out of the base, drawn live, and would run to a doorway and vanish
// when tapped. The running is gone at his word — "remove the running completely but
// the player can still select each villager... Do not change the villager original
// 'pose'" — and once nothing about him moves, cutting him out is all cost: a second
// copy of a drawing, a mirror that can be the wrong way round, an anchor that can
// drift, and a cutting window that took a log out of the campfire the first time it
// ran. A painted figure has none of those failures available to it.
//
// SO THE LIVE HALF IS A POINT AND A NAME. Four fields and no update loop.
import { SCALE } from './data/towers.js';
import { solo, play, slice, VILLAGER_RUN, VILLAGER_NOOO, VILLAGER_WAVE, LANDED, HAMMER, CHOP, BELL, FACTORY, SPLASH } from './audio.js';
import { starsFor } from './score.js';
import { level } from './level.js';
import { nearestOn } from './route.js';
import { enemyTypes } from './data/waves.js';

// THE MAN HIMSELF, as a def, because that is the shape the rest of the game expects
// a figure to be: `pickFigure` reads `def.r` and `def.spriteTrim`, and the info
// panel reads `def.name` and `def.sprite`. A villager with a def is a figure those
// two already know how to handle.
//
// `sprite` and `spriteTrim` ARE FOR THE CARD AND NOTHING ELSE. The panel draws its
// portrait from the same PNG every other portrait comes from; the board draws him
// from the artwork. There is no third place to keep in step.
//
// Trim and pivot measured by tools/trim.mjs and tools/shadow.mjs on the shared 512
// canvas, like every other figure. The pivot is the centre of his ground shadow, so
// the anchors in the level file mean the same thing they mean for a soldier — which
// is what lets the tap box be built off them.
export const VILLAGER = {
  name: 'Villager',
  sprite: 'villager',
  spriteTrim: [213, 198, 86, 116],
  pivot: [0.581, 0.905],
  // His body radius, for the tap box only. Nothing collides with him.
  r: 9
};

// HOW BIG A TAP BOX HE GETS, added either side of his radius. Bigger than a
// soldier's because he is smaller than one and, unlike a soldier, tapping him is the
// ONLY thing he is for — a miss costs the player the whole interaction rather than
// just a card they can open another way.
export const TAP_PAD = 10;

// AND HOW TALL HIS BOX IS, in game px: his own drawing at the shared scale. Derived
// rather than typed, so a re-export of the PNG moves the box with the picture.
export const VILLAGER_H = VILLAGER.spriteTrim[3] * SCALE;

// Built from the level, once, at the start of a game. A board with no `villagers`
// gets an empty list and nothing anywhere else has to ask whether it has any.
//
// NOTHING BUT A POSITION. No facing, no speed, no destination and no flag — every
// one of those was here a build ago and every one of them was a thing that could be
// wrong about a man who does not move.
export function makeVillagers(state, level) {
  const play = level.villagerPlay && PLAYS[level.villagerPlay];
  state.villagers = (level.villagers || []).map((v, i) => {
    if (!play) return { def: VILLAGER, x: v.x, y: v.y };
    // ON A BOARD THAT LETS THEM MOVE, each carries what it is doing. See PLAYS.
    // `g`, when the level gives one, is the depth he is drawn at in place of where
    // he stands: stage 10's lumberjack, in front of the tree he is felling.
    const b = play.before[i] || {};
    return { def: VILLAGER, x: v.x, y: v.y, g: v.g, live: true, n: i, side: b.side || 'front',
             act: b.act || null, hidden: !!b.hidden, pose: 'standing', flip: !!b.flip,
             mode: 'idle', path: null, leg: 0, greetUntil: -1 };
  });
  state.villagerPlay = play ? { plan: play, started: false, t: 0, hops: play.hops.map(() => ({ n: 0, at: null })),
    startLives: level.startLives, stars: null, shouted: false } : null;
}

// --- villagers who move ----------------------------------------------------------
//
// ON THE BOARDS THAT SET `villagerPlay`, and only there: the painted villagers are
// cut out of the artwork (tools/split-map.mjs) and drawn by the game from the
// owner's drawings in assets/villagers — six poses, each facing the player
// ("front") or turned away ("back"). Every drawing faces LEFT, like every figure in
// the game; one facing right is the same drawing mirrored.
export const VILLAGER_POSE = {
  // One shared box for every pose, so a change of pose never moves the figure: every
  // drawing stands on a ground shadow centred at (258, 305) on the 512 canvas — all
  // but the two drinking ones, which the artist drew 14px further right, mug and all.
  // `foot` is where each pose's shadow is when it is not (258, 305), and the game
  // stands that point on the villager's anchor, so the drinker does not slide when
  // he lifts the mug and does not stand 3 px off his painted spot.
  trim: [200, 176, 110, 142],
  foot: [258, 305],
  feet: { drinking_1: [272, 305], drinking_2: [272, 305],
          pipe_1: [257, 305], pipe_2: [257, 305],
          // Stage 4's plank carriers are ONE drawing of TWO villagers and their plank,
          // stood on the back-end man's shadow; the front-end man's is PAIR further on.
          carry: [124.5, 341.5], throw: [124.5, 341.5],
          // Stage 5's porter, one villager with a ballista part, and the hammerer.
          carry_parts: [236, 311.5], throw_parts: [236, 311],
          hammer_1: [276.5, 305], hammer_2: [276.5, 305],
          // And its box carrier, the two drawings stood on the same shadow.
          carry_box: [268.5, 305], throw_box: [268.5, 305],
          // Stage 6's angler, rod and line in his drawing, and the man in a helmet.
          fish_1: [324.5, 318], fish_2: [324.5, 318],
          helmet_1: [256, 312], helmet_2: [256, 312],
          // Stage 7's cook, his skewer out to the left in both.
          cook_1: [297.5, 305], cook_2: [297.5, 305],
          // Stage 8's congregation, kneeling up and bowed down, turned right.
          kneel_1: [254, 280.5], kneel_2: [250, 290],
          // Stage 10's lumberjack, the axe in the tree and drawn back, turned right.
          chop_1: [216, 305], chop_2: [216, 305],
          // Stage 11's cannonball carrier, the ball held in both arms — his back to
          // the player, or facing the player — and bent to pick one up.
          ball_back: [263, 305], ball_front: [263, 305], pick_up: [248, 305],
          // Stage 12's torch-lighter, his lit pole held up, and the villager who
          // goes into the castle and comes out a musketeer.
          pole_front: [259.5, 344], pole_back: [259.5, 344],
          vm_front: [259.5, 310], vm_back: [259.5, 310], musk_front: [258, 305] },
  // And the poses whose drawing does not fit the shared box.
  trims: { pipe_1: [200, 176, 140, 142], pipe_2: [200, 176, 140, 142],
           carry: [85, 155, 340, 200], throw: [85, 155, 340, 200],
           carry_parts: [195, 185, 120, 140], throw_parts: [195, 185, 120, 140],
           hammer_1: [195, 185, 120, 135], hammer_2: [195, 185, 120, 135],
           carry_box: [200, 185, 115, 135], throw_box: [200, 185, 115, 135],
           fish_1: [145, 165, 220, 165], fish_2: [145, 165, 220, 165],
           helmet_1: [215, 188, 80, 137], helmet_2: [215, 188, 80, 137],
           cook_1: [172, 188, 165, 130], cook_2: [172, 188, 165, 130],
           kneel_1: [200, 200, 110, 110], kneel_2: [200, 200, 110, 110],
           chop_1: [170, 190, 170, 145], chop_2: [170, 190, 170, 145],
           ball_back: [195, 185, 115, 135], ball_front: [195, 185, 115, 135],
           pick_up: [195, 185, 115, 135],
           pole_front: [195, 70, 110, 310], pole_back: [195, 70, 110, 310],
           vm_front: [205, 190, 105, 135], vm_back: [205, 190, 105, 135],
           musk_front: [180, 185, 150, 140] },
  // The greeting hand, which waves: a circle round it on the 512 canvas, and the
  // shoulder it swings from.
  //
  // A CIRCLE BIG ENOUGH FOR THE WHOLE HAND, outline and all, and nothing right of
  // `cut`, where the shoulder's outline runs. It was a hair too small and too far
  // right, and a sliver of the hand's black outline stayed on the body, showing as a
  // stripe by the shoulder whenever the hand swung away (the owner, on stage 6).
  //
  // What was behind the raised hand comes from the standing drawing down to `seam`,
  // the last row above the standing drawing's own hand; below it the body's edge is
  // carried on down, leaning, to where the greeting drawing's outline is clear of the
  // hand again at `resume`. See greetLayers in src/render.js.
  hand: { x: 229, y: 249, r: 14, cut: 240, seam: 253, resume: 262, px: 241, py: 256 }
};

// Where the front-end carrier stands against the back-end one, in game px — the two
// shadows in the carrying drawing, (124.5, 341.5) and (386.5, 268.5), at SCALE.
export const PAIR = [(386.5 - 124.5) * SCALE, (268.5 - 341.5) * SCALE];
// WHAT GETS THROWN: the drawing it flies as (`key`, the box of it `src` and its
// middle `mid`), where it is in the carrying drawing (`held`, its middle there), and
// how far it turns in the air. Stage 4's plank and stage 5's ballista part.
export const PIECES = {
  // The plank turns CLOCKWISE in the air, from rising to the right as it is carried
  // to lying the way the stack's planks lie, falling to the right, as it lands.
  plank: { key: 'vill_wood_plank', src: [115, 195, 283, 122], mid: [256, 255], held: [265, 241], spin: 0.43 },
  part:  { key: 'vill_ballista_parts', src: [231, 205, 50, 102], mid: [255.5, 255], held: [285, 241], spin: 1.4 },
  // Stage 5's box, which tumbles a little on its way onto the crates.
  box:   { key: 'vill_box', src: [222, 229, 68, 54], mid: [256, 255.5], held: [242.5, 250.5], spin: -0.8 }
};

// WHAT A VILLAGER DOES WHILE STANDING, each on their own beat: `pose` for `for`
// seconds in every `every`, and `rest` the rest of the time.
//   greet  — now and then (stage 1, before the first wave).
//   greets — standing and greeting by turns (stage 2).
//   pray   — the long part is the praying, thirteen seconds in eighteen, so they are
//            not forever bobbing up between prayers.
//   drink  — the mug held, then tipped up; no standing drawing at all. Four seconds
//            holding and two and a half drinking.
// Both were half as long again as this until the owner asked for them to last
// longer.
const ACTS = {
  greet:  { rest: 'standing',   pose: 'greeting',   every: 8,  for: 1.6 },
  greets: { rest: 'standing',   pose: 'greeting',   every: 5,  for: 2 },
  pray:   { rest: 'standing',   pose: 'praying',    every: 18, for: 13 },
  drink:  { rest: 'drinking_1', pose: 'drinking_2', every: 6.5, for: 2.5 }
};

// A board's script, villager by villager in the level's order. `before` is how each
// stands until the first enemy of the first wave appears — which way they face, what
// they do, and whether they are out of sight — and `after` is the same from then on.
// At that moment `run` sends some of them off along a path of points (from `from`,
// if they were out of sight), each `delay` seconds after it. `hops` is who hops and
// lands, twice, one after another, each time `every` more enemies have fallen.
// `flip` mirrors a villager, facing right instead of left, in everything they do —
// the greeting a tap asks for included. `cries` is which of the village's shouts the
// board has: "runnn" as the first runner sets off, "nooo" as a star is lost, and
// `wave`, what it shouts as the first wave comes (VILLAGER_WAVE in src/audio.js).
const front = act => ({ side: 'front', act }), back = act => ({ side: 'back', act });
const mirrored = act => ({ side: 'front', act, flip: true });
const backMirrored = act => ({ side: 'back', act, flip: true });
// The congregation's round on the mat, step by step: see `kneel` in work().
const KNEEL_STEPS = ['pray', 'rise', 'bow', 'rise'];
// STAGE 5'S BOX CARRIER'S WAY, from the right edge of the board to where he stands
// to throw onto the crates — the owner's line, drawn on a screenshot, in board px.
// STAGE 8'S BOX CARRIER'S WAY, from the church door — the step just in front of it —
// down to where he stands to toss his box onto the pile, where he is painted.
const CHURCH_WAY = [[389.5, 226.5], [393.5, 233.5], [399.3, 242.3]];
// STAGE 11'S BOX CARRIER'S WAY, the owner's line: in over the top of the board, down
// past where he is painted, and right — under the plank, in front of it — to the
// factory's door.
const FACTORY_WAY = [[397, -8], [396.8, 77], [400, 118], [418, 134], [450, 141], [479, 141]];
// AND THE CANNONBALL CARRIER'S, the owner's line: from beside the pile, past where he
// is painted, round to the right and back up to the Cannon Outpost's door.
const AMMO_WAY = [[681, 318], [692.3, 310.3], [700, 300], [695, 289], [685, 283], [677, 280]];
// And his way home when the tower is sold: down round the pile and left along the
// stepping stones to the lower house's door.
const HOUSE_WAY = [[686, 332], [660, 345], [610, 355], [560, 361], [507, 362]];
const BOX_WAY = [[953, 295], [921.5, 306], [889.5, 318], [857.5, 326], [817.5, 329],
  [769.5, 331], [729.5, 336], [697.5, 346], [674, 361]];

// DARK HOLLOW'S BOX CARRIER'S WAY, the owner's line (redrawn): in over the top of the
// board, down and bending left past the thug, down to the left of where he is painted,
// and round to the right along the stepping stones to the top hut's door, on its
// left-hand wall — his shadow in the middle of the door's floor as he goes in, at the
// owner's word (the floor runs from (209, 138) to (219, 147) in the drawing).
const HOLLOW_WAY = [[195, -12], [188, 35], [178, 63], [168, 82], [159, 105], [157, 122],
  [162, 138], [178, 145], [196, 146], [214, 142.5]];

const PLAYS = {
  oakhaven: {
    before: [front('greet'), back('greet'), back('greet'), front('greet'), front('greet')],
    // VILLAGERS 1 AND 2 RUN TO THE ROAD, to the grass just under it beside the
    // exit flag, at the owner's word: down past the log, along the bottom of the
    // village below both houses and the plot, then up to the road's edge.
    //
    // ROUND THE ROCK, not over it: the grey boulder by the plot at the left
    // (about x 270-297, y 455-471) is passed underneath by both, the first a
    // dozen pixels below it and the second further out. Grass tufts they step over.
    run: [
      { who: 0, delay: 0,
        path: [[205, 400], [238, 448], [262, 478], [300, 486], [330, 492], [430, 497], [525, 514], [630, 512],
               [790, 498], [840, 482], [872, 468]] },
      { who: 1, delay: 0.35,
        path: [[190, 432], [228, 475], [270, 494], [330, 503], [430, 505], [530, 520], [630, 518],
               [790, 506], [850, 490], [895, 478]] }
    ],
    // The road is above them all but villagers 4 and 5, who have it below.
    after: [back('pray'), back('pray'), back('pray'), front('pray'), front('pray')],
    hops: [{ every: 10, who: [2, 3, 4] }, { every: 12, who: [0, 1] }],
    cries: { runnn: false, nooo: true, wave: 'runnn' }
  },
  // STAGE 2, Oakhaven Outskirts, left to right: 1 at the well, 2 by the tavern wall,
  // 3 with his mug by the tavern steps and 4 beside him.
  outskirts: {
    // Villager 1 faces the player, mirrored, at the owner's word.
    before: [mirrored('greets'), front('greets'), front('drink'), front('greets')],
    // VILLAGER 4 RUNS INTO THE TAVERN when the first wave comes, up over the stepping
    // stones to the door in its right-hand wall, and is gone through it (`vanish`).
    // He was the other way round once — indoors until the wave, then out.
    run: [
      { who: 3, delay: 0.3, path: [[760, 283], [734, 272], [716, 260]], vanish: true }
    ],
    after: [mirrored('pray'), front('pray'), front('drink'), {}],
    hops: [{ every: 10, who: [0, 1] }],
    cries: { runnn: false, nooo: true, wave: 'hide' }
  },
  // STAGE 3, Winchester Entrance, left to right: 1 and 2 on the statue's plaza, 3 on
  // the green below it, 4 between the two bottom-right houses, 5 at the top behind
  // the barricade.
  winchester: {
    before: [front('greets'), front('greets'), back('greets'), back('greets'), front('greets')],
    run: [
      // VILLAGER 3 GOES UP ONTO THE PLAZA, over its front corner, to stand beside
      // villager 2 by the statue — turning to face the player.
      { who: 2, delay: 0, path: [[490, 352], [462, 322], [447, 305]] },
      // VILLAGER 5 GOES WIDE ROUND THE BARRICADE'S RIGHT-HAND END, along the owner's
      // arrow: over the top of it, out past its end — clear of the wall, so he never
      // seems to walk through it, and behind a tower on the plot there, which is
      // drawn over him — then down and back in on its near side, in front of the wall,
      // to stand in its shade.
      { who: 4, delay: 0.25, path: [[800, 128], [835, 134], [856, 153], [857, 176], [842, 192], [818, 191]] }
    ],
    after: [front('pray'), front('pray'), front('pray'), back('pray'), front('pray')],
    hops: [{ every: 10, who: [0, 1, 3] }, { every: 12, who: [2, 4] }],
    cries: { runnn: false, nooo: true, wave: 'oh_no' }
  },
  // STAGE 4, the lumber yard: villagers AT WORK, who take no notice of the waves at
  // all — no greeting, praying or hopping. See work() below.
  lumberyard: {
    work: true,
    // The smith at the forge, pushing a steel pipe into the fire and drawing it
    // back: pipe_1 (drawn back) and pipe_2 (in the fire) by turns. He stands `at`,
    // up to the fire and behind the workbench, rather than where he was painted.
    smith: { who: 0, at: [578, 431], back: 3.2, in: 2,
      // His hands and pipe, held out over the workbench (which is drawn over the
      // rest of him), the furnace's front and the fire itself: drawn again after the
      // bench (440), his hands and pipe alone (see toolLayer in render.js — none of
      // his body, so none of his outline lands on the bench as a speck). Only the
      // sparks are drawn over it.
      tool: { g: 440.5 } },
    // The two plank carriers, `lead` the back end (whose feet the carrying drawing
    // stands on) and `mate` the front end.
    crew: {
      lead: 2, mate: 1,
      // The carrying and throwing drawings (both men in one), and what flies.
      art: { carry: 'carry', throw: 'throw', piece: 'plank' },
      // They carry the plank up to the stack, stopping in front of it...
      stack: [476, 452],
      // ...throw it, and it lands on the top of the stack...
      landing: [508, 384],
      // ...then walk off, each on their own, towards the cut trees at the bottom and
      // off the board between them — the back end left of the middle stump gap, the
      // front end right of it...
      // The back end heads down and a little right, so he walks mirrored.
      away: { lead: [[478, 500], [482, 570]], mate: [[522, 478], [522, 570]] },
      // ...and after `gone` seconds come back, carrying the next plank, from where
      // they left: the back end's feet from here.
      enter: [480, 582],
      gone: 3
    },
    before: [], after: [], run: [], hops: [],
    cries: { runnn: false, nooo: true, wave: 'here' }
  },
  // STAGE 6, Dawnford Bridge, in the level's order: 1 by his rod planted on the bank,
  // 2 by the top-right hut, 3 fishing with his rod in hand, 4 between the bottom-right
  // huts, and 5 stuck in a helmet by the armour stand.
  dawnford: {
    // The three who are not busy greet by turns, and pray by turns once the wave is
    // on them. Villager 1, by the fishing spot, faces the player mirrored — turned
    // right — in both.
    before: [mirrored('greets'), front('greets'), {}, front('greets'), {}],
    after: [mirrored('pray'), front('pray'), {}, front('pray'), {}],
    run: [],
    // Two hops each, the owner counting left to right: the villager by the planted
    // rod every tenth enemy down, the one between the bottom-right huts every
    // twelfth, and the one by the top-right hut every fourteenth. Only those who
    // stand and pray hop — never the angler or the man in the helmet, at work.
    hops: [{ every: 10, who: [0] }, { every: 12, who: [3] }, { every: 14, who: [1] }],
    // THE ANGLER waits with his line in the water for `wait` seconds, then tugs at it
    // for `tug` — the reel whirring while he does (main.js, `reeling`) — and back.
    angler: { who: 2, wait: [4, 7.5], tug: [1.6, 2.6] },
    // THE MAN IN THE HELMET heaves at it: his two drawings by turns every `beat`,
    // shaking, for `struggle` seconds, then stands still for `rest`, and again.
    // Toned down at the owner's word: slower heaves, a shorter bout, a smaller shake
    // and a longer rest between.
    stuck: { who: 4, beat: 0.32, struggle: 1.3, rest: 2.4, shake: 0.4, flip: true },
    // The village's "runnn" as the first wave comes, and its "nooo" for a lost star.
    cries: { runnn: false, nooo: true, wave: 'runnn' }
  },
  // STAGE 7, Dawnford Fountain, left to right as the owner numbers them: 1 by the
  // left-hand huts, 2, 3 and 4 at the fountain from the top down, 5 behind the
  // cooking fire — and the cook, last in the level's list.
  fountain: {
    // Greeting by turns until the first wave, praying by turns after it. All but 4
    // and 5 turned to the right: 1, 2 and 3 facing the player, 4 with his back to
    // the player; 5 faces the player, turned left, as every drawing is.
    before: [mirrored('greets'), mirrored('greets'), mirrored('greets'), backMirrored('greets'), front('greets'), {}],
    after: [mirrored('pray'), mirrored('pray'), mirrored('pray'), backMirrored('pray'), front('pray'), {}],
    run: [],
    // Two hops each, 1 and 2 every tenth enemy down, 3 and 4 every twelfth, and 5
    // every fourteenth.
    hops: [{ every: 10, who: [0, 1] }, { every: 12, who: [2, 3] }, { every: 14, who: [4] }],
    // THE COOK holds his skewer over the fire for `cook` seconds — the fish sizzling
    // while he does (main.js, `cooking`) — then draws it back out for `out`, and
    // again. Over the fire for half as long as drawn back, at the owner's word.
    cook: { who: 5, cook: [3, 3], out: [6, 6] },
    cries: { runnn: false, nooo: true, wave: 'hide' }
  },
  // STAGE 8, Dawnford Church, as the owner numbers them: 1 by the praying mat, 2 to 7
  // on it, 8 carrying boxes out of the church, 9 at its right-hand end.
  church: {
    // Villager 1 greets by turns, his back to the player, turned right; 9 greets
    // facing the player, turned left, as every drawing is.
    before: [backMirrored('greets'), {}, {}, {}, {}, {}, {}, {}, front('greets')],
    // VILLAGER 1 RUNS OFF THE BOARD to the left when the first wave comes, and is gone;
    // 9 turns to standing and praying by turns.
    run: [{ who: 0, delay: 0, path: [[40, 322], [-16, 324]], vanish: true }],
    after: [{}, {}, {}, {}, {}, {}, {}, {}, front('pray')],
    // Villager 9 hops twice every tenth enemy down.
    hops: [{ every: 10, who: [8] }],
    // THE SIX ON THE MAT pray and kneel on a round of their own — see work(). Seconds
    // for each step: praying, kneeling up (`rise`, on the way down and on the way
    // back up) and bowed down. Praying and bowed down half as long again as they
    // were, at the owner's word; kneeling up is only the way between, as it was.
    kneel: { who: [1, 2, 3, 4, 5, 6], pray: [5.5, 10.5], rise: [0.9, 1.6], bow: [4.5, 9] },
    // VILLAGER 8 CARRIES BOXES out of the church: stage 5's box carrier, mirrored. Out
    // of the door, slowly down to the pile in front of the church, a toss onto it,
    // back up and in at the door — and ten seconds inside before the next box. The
    // first time he starts from where he is painted, at the pile.
    crews: [{
      lead: 7,
      art: { carry: 'carry_box', throw: 'throw_box', piece: 'box' },
      flip: true,
      door: true,
      path: CHURCH_WAY,
      from: CHURCH_WAY.length - 1,
      stack: CHURCH_WAY[CHURCH_WAY.length - 1],
      landing: [436, 243],
      lob: 9,
      away: { lead: CHURCH_WAY.slice(0, -1).reverse() },
      enter: CHURCH_WAY[0],
      gone: 10
    }],
    // The bell: each side for as long as its stroke rings, the middle between. Each
    // side held longer, at the owner's word.
    bell: { swing: [['middle', 0.15], ['left', 1.8], ['middle', 0.3], ['right', 1.8], ['middle', 0.2]] },
    cries: { runnn: false, nooo: true, wave: 'oh_no' }
  },
  // STAGE 10, Ironforge Town, as the owner numbers them: 1 the lumberjack at the tree,
  // 2 by the tools and crates, 3 at the front of the houses, 4 by the Ironforge sign,
  // 5 on the top-right steps.
  ironforge: {
    // Greeting by turns before the first wave and praying by turns after it: 2 with
    // his back to the player turned right, 3 facing the player turned right, 4 facing
    // the player turned left, 5 with his back to the player turned left.
    before: [{}, backMirrored('greets'), mirrored('greets'), front('greets'), back('greets')],
    after: [{}, backMirrored('pray'), mirrored('pray'), front('pray'), back('pray')],
    run: [],
    // Two hops each: 4 and 5 every tenth enemy down, 2 and 3 every twelfth.
    hops: [{ every: 10, who: [3, 4] }, { every: 12, who: [1, 2] }],
    // THE LUMBERJACK chops at the tree as stage 5's hammerer hammers: the axe drawn
    // back, into the tree, back, into the tree — two chops, a chop sounding each time
    // the axe goes in — then a long rest drawn back, and again. Slower than the
    // hammer, at the owner's word: the axe stays in a moment, and he takes his time
    // drawing it back between the two chops and after them.
    hammer: { who: 0, strike: 'chop_1', sound: 'chop',
      beats: [['chop_2', 0.5], ['chop_1', 0.35], ['chop_2', 0.75], ['chop_1', 0.35], ['chop_2', 2.4]] },
    cries: { runnn: false, nooo: true, wave: 'thugs' }
  },
  // STAGE 11, Ironforge Factory, as the owner numbers them: 1 by the top-left house,
  // 2 carrying boxes to the factory, 3 carrying cannonballs to the Cannon Outpost.
  factory: {
    // Villager 1 greets by turns facing the player, turned left, until the first wave,
    // and stands and prays by turns after it.
    before: [front('greets'), {}, {}],
    after: [front('pray'), {}, {}],
    run: [],
    // Villager 1 hops twice every tenth enemy down; the two carriers are at work.
    hops: [{ every: 10, who: [0] }],
    // VILLAGER 2 CARRIES A BOX INTO THE FACTORY — stage 5's box carrier, mirrored, as
    // he is painted — along the owner's line, and in at the door. Inside, nothing for
    // `idle` seconds; then the factory runs (FACTORY in src/audio.js), its door and
    // window lit and its chimneys smoking black, for as long as the sound; `between`
    // seconds' quiet, and it runs again; `idle` more, and he comes out empty-handed
    // the way he came, off the top of the board, and after `gone` seconds is back with
    // the next box. The first time he starts from where he is painted.
    porter: { who: 1, path: FACTORY_WAY, from: 1, idle: 1, runs: 2, between: 3, gone: 3 },
    // VILLAGER 3 CARRIES CANNONBALLS INTO THE CANNON OUTPOST standing on `tower`: in at
    // its door, `inside` seconds there, out empty-handed back to the pile, bent over
    // it picking one up for `pick`, a moment (`heave`) with it in his arms facing the
    // pile, then round and back to the tower with it. The first time he starts from
    // where he is painted.
    //
    // IF THE TOWER IS SOLD he stops where he is for `pause` seconds, drops the ball if
    // he has one, and walks off to the lower house (`home`) and is gone for good —
    // whatever is built there afterwards. Inside the tower when it goes, he goes too.
    ammo: { who: 2, path: AMMO_WAY, from: 1, tower: [656, 274], inside: 3, pick: 0.9, heave: 1,
            pause: 2, home: HOUSE_WAY },
    cries: { runnn: false, nooo: true, wave: 'runnn' }
  },
  // STAGE 12, Ironforge Castle: the torch-lighter left of the gate, the villager below
  // it who will be a musketeer, and villagers 1 and 2 to the right of the barricade.
  ironcastle: {
    // Villagers 1 and 2 greet by turns facing the player, turned left, until the first
    // wave, and stand and pray by turns after it.
    before: [{}, {}, front('greets'), front('greets')],
    after: [{}, {}, front('pray'), front('pray')],
    run: [],
    // Two hops: villager 1 every tenth enemy down, villager 2 every twelfth.
    hops: [{ every: 10, who: [2] }, { every: 12, who: [3] }],
    // THE TORCHES ARE LIT as the board opens. He walks up to the first torch with his
    // lit pole, his back to the player and turned right, and lights it; turns to face
    // the player and walks down to the second, and lights that with his back turned
    // again; then throws the pole down — it falls still burning and burns out on the
    // grass (drawn by render.js from `vp.pole`) — and walks back into the castle.
    // `at` is where he stands for each torch: the pole's flame at its cup.
    lighter: { who: 0, start: 0, torches: [[604.5, 253], [657, 266]], hold: 1.0, lightAt: 0.45,
               rest: 1.2, door: [651, 247], homeWalk: 7 },
    // THE VILLAGER WHO BECOMES A MUSKETEER: standing about, now and then turning to
    // the right, knowing nothing of any war; at the first enemy he walks into the
    // castle, his back to the player (turned right for the last step in at the
    // door); as the second wave comes he walks back out in a musketeer's gear, down,
    // right to the barricade, a quick turn left; stands there `ready` second, then is
    // a musketeer at his post, the same as the one at the bottom right, from then on —
    // first holding his aim `aim` seconds before his first shot. Tapped, he answers
    // with the Musketeer Post's voice all along, gear or no gear (`voice`).
    recruit: { who: 1, in: [[664, 285], [647, 262], [645, 255], [651, 246]],
               out: [[651, 262], [700, 287], [745, 301], [782, 315], [773, 321]],
               post: { x: 773, y: 321, unit: 'Musketeer' }, ready: 1, aim: 2, voice: 'musketeer',
               // "Musketeer, reporting for duty", as he steps out of the castle in his gear.
               report: ['musketeer_3'],
               // And stands in the doorway this long while he says it, before he walks.
               pause: 1.5,
               // His card before his gear: his own name and picture.
               card: { title: 'Villager (Musketeer)', sprite: 'vill_musketeer_front_standing',
                       trim: [213, 200, 88, 119] } },
    cries: { runnn: false, nooo: true, wave: 'hide' }
  },
  // STAGE 13, Serene Peak Lake, left to right as the owner numbers them: 1 and 2 by
  // the lake, 3 at the top hut's steps, 4 between the two right-hand huts.
  serene: {
    // Greeting by turns before the first wave and praying by turns after it: 1, 2 and
    // 3 facing the player turned right, 4 with his back to the player turned left.
    before: [mirrored('greets'), mirrored('greets'), mirrored('greets'), back('greets')],
    after: [mirrored('pray'), mirrored('pray'), mirrored('pray'), back('pray')],
    run: [],
    // Two hops each: 1 and 4 every tenth enemy down, 2 every twelfth, 3 every
    // fourteenth.
    hops: [{ every: 10, who: [0, 3] }, { every: 12, who: [1] }, { every: 14, who: [2] }],
    // A FISH JUMPS in the lake now and then — out of the water with a splash, over in
    // a little arc and back in (src/render.js, drawLakeFish): from one of `spots`,
    // well away from the banks, every `gap` seconds or so — half as often as it
    // first did, at the owner's word — `span` px along and
    // `height` px up, for `dur` seconds.
    fish: { spots: [[35, 165], [80, 170], [125, 175], [30, 220], [25, 290], [45, 330], [70, 370],
                    [40, 420], [75, 455], [40, 490], [100, 480]],
            gap: [8, 18], span: [14, 24], height: [10, 17], dur: 0.9 },
    cries: { runnn: false, nooo: true, wave: 'oh_no' }
  },
  // STAGE 14, Dark Hollow Woods, as the level lists them: 1 the thug between the two
  // top huts, 2 carrying a box to the top hut, 3 below the top-left hut, 4 by the
  // bottom hut, 5 the thug beside him. NOBODY HERE IS
  // ON YOUR SIDE — see hollowRound below. They are at work from the first frame to the
  // last (no greeting, praying or hopping, and no village cries), and a tap on any of
  // them sets him on the road as a creature like any other.
  hollow: {
    work: true,
    before: [], after: [], run: [], hops: [],
    // WHAT THEY SAY WHEN TAPPED, one of the owner's two at random.
    voice: 'enemy_villager',
    // THE TWO THUGS turn left and right where they stand, all game. Tapped, each marches
    // down along `road` and on to the nearest point of the road proper, and is a Thug
    // there — one that can be shot, and costs a life if he gets out.
    //
    // TAPPED, EVERY ONE OF THEM STANDS `still` SECONDS where he is first — the box
    // carrier with the box dropped at his feet — and then walks, slowly (`walk` px a
    // second), to the road or to his hut to arm.
    still: 2, walk: 14,
    thugs: [{ who: 0, road: [[140, 112], [134, 165]] }, { who: 4, road: [[228, 470]] }],
    // THE BOX CARRIER: the box down from the north and in at the top hut's door; three
    // seconds inside; out empty-handed, back up off the top of the board; three
    // seconds gone; back with the next box. The first time from where he is painted.
    // Tapped, he drops what he is carrying, goes into the hut, and three seconds later
    // comes out a Tough Thug and makes for the road.
    //
    // THE FIRST TIME, from where he is painted, he takes `first`: a natural curve
    // straight down and round to the door rather than stepping onto his usual line.
    // Carrying, he faces the player — turned left coming down, mirrored turning right.
    boxman: { who: 1, path: HOLLOW_WAY, first: [[168, 128], [178, 139], [193, 144], [214, 142.5]],
              inside: 3, gone: 3, arm: 3, road: [[196, 170]] },
    // THE TWO WHO ARM IN A HUT turn left and right where they stand. Tapped, each walks
    // up to his hut's door, his back to the player (`side`) — the man below the
    // top-left hut up and to the left, the drawing as it is; the man by the bottom hut
    // up and to the right, mirrored — and in; three seconds later he comes back out
    // of it armed, as `type`, and makes for the road.
    hideouts: [
      { who: 2, type: 'archer_inf', side: 'back', way: [[100, 118], [86, 105.5]], arm: 3,
        road: [[100, 124], [108, 150]] },
      { who: 3, type: 'tough_inf', side: 'back', way: [[267, 491], [282, 479]], arm: 3,
        road: [[268, 490], [246, 470]] }
    ],
    // The village's cries are the enemy's here: "get rid of these intruders,
    // brothers!" as the first wave comes, and "nooo" still as a star is lost.
    cries: { runnn: false, nooo: true, wave: 'intruders' }
  },
  // STAGE 9, Sandshroud Settlement, left to right: 1 by the left-hand houses, 2 below
  // him, 3 at the middle house.
  sandshroud: {
    // Greeting by turns before the first wave and praying by turns after it: 1 and 2
    // facing the player turned right, 3 turned left.
    before: [mirrored('greets'), mirrored('greets'), front('greets')],
    after: [mirrored('pray'), mirrored('pray'), front('pray')],
    run: [],
    // Two hops each: 2 and 3 every tenth enemy down, 1 every twelfth.
    hops: [{ every: 10, who: [1, 2] }, { every: 12, who: [0] }],
    cries: { runnn: false, nooo: true, wave: 'here' }
  },
  // STAGE 5, Winchester Castle, left to right: 1 and 2 on the path up to the castle
  // gate, 3 carrying a part to the broken ballista, 4 hammering at it, and 5, 6 and 7
  // by the bridge.
  castle: {
    before: [front('greets'), front('greets'), {}, {}, back('greets'), back('greets'), {}],
    // VILLAGERS 1 AND 2 RUN INTO THE CASTLE, up the cobbles to the gate between the
    // two torches — right of the left one's pole the whole way — and are gone
    // through it (`vanish`).
    run: [
      { who: 1, delay: 0, path: [[410, 248], [403, 224], [401, 212]], vanish: true },
      { who: 0, delay: 0.35, path: [[393, 292], [405, 256], [403, 226], [401, 213]], vanish: true }
      // Villager 7 ran to the river and prayed there, on a loop, until the owner
      // redrew him carrying a box — see `crews` below. `trip` in updateVillagers is
      // what that was, and stays for the next villager who wants it.
    ],
    // Villagers 5 and 6 turn to praying by turns once the wave is on them; 3, 4 and 7
    // keep working throughout.
    after: [{}, {}, {}, {}, back('pray'), back('pray'), {}],
    // Villager 3 carries a part up to the broken ballista, throws it on, walks down
    // off the board for the next one and comes back with it — stage 4's loop, one
    // man and a part rather than two and a plank.
    crews: [{
      lead: 2,
      art: { carry: 'carry_parts', throw: 'throw_parts', piece: 'part' },
      stack: [508, 505],
      landing: [540, 483],
      away: { lead: [[505, 538], [502, 572]] },
      enter: [502, 580],
      gone: 3
    }, {
      // AND VILLAGER 7 CARRIES BOXES to the crates by the crossbowmen's barricade,
      // along the owner's line: in from the right edge of the board, left above
      // villagers 5 and 6, and down to the pile — the same loop as the porter's.
      // The first time he joins the line from where he is painted, at `from`.
      lead: 6,
      art: { carry: 'carry_box', throw: 'throw_box', piece: 'box' },
      path: BOX_WAY,
      from: 4,
      stack: BOX_WAY[BOX_WAY.length - 1],
      landing: [654, 366],
      // A short toss rather than a heave: the pile is a step away.
      lob: 9,
      away: { lead: [...BOX_WAY.slice(0, -1).reverse(), [978, 289]] },
      enter: [978, 289],
      gone: 3
    }],
    // Villager 4 hammers at it: two quick blows, then a long rest with the hammer
    // down, and again.
    hammer: { who: 3, beats: [['hammer_1', 0.26], ['hammer_2', 0.2], ['hammer_1', 0.26], ['hammer_2', 0.2], ['hammer_2', 1.9]] },
    // Two hops each: villager 5 every tenth enemy down, 6 every twelfth.
    hops: [{ every: 10, who: [4] }, { every: 12, who: [5] }],
    cries: { runnn: false, nooo: true, wave: 'thugs' }
  }
};

// A board's script, for the checks in tools/ that ask what it does.
export function playOf(level) {
  return (level.villagerPlay && PLAYS[level.villagerPlay]) || {};
}

const WORK_WALK = 11;         // px a second carrying — "slowly"
const DOOR_FADE = 0.5;        // seconds to step out of, or into, a doorway
// And empty-handed, walking off for the next load, nearly twice that: they are no
// longer carrying anything.
const WORK_WALK_FREE = 20;
// THE THROW IS A HEAVE AND A LANDING: the throwing drawing (the pair up off the
// ground) for THROW_FOR, then back down on their feet, standing, while the plank is
// still in the air — they used to hang up there until it landed — and off once it
// has, THROW_REST after the throw began.
const THROW_FOR = 0.3;
const THROW_REST = 1.0;
const PLANK_AT = 0.12;        // into the throw when the plank leaves their hands
const PLANK_FLIGHT = 0.75;    // and how long it is in the air
const PLANK_LOB = 22;         // how high it rises above the straight line

// Along a list of points at `speed`, from wherever `v` is. True when there.
function walkTo(v, pts, speed, dt) {
  let step = speed * dt;
  while (step > 0 && v.leg < pts.length) {
    const [tx, ty] = pts[v.leg];
    const dx = tx - v.x, dy = ty - v.y, d = Math.hypot(dx, dy);
    // FACING WHICH WAY THEY GO: the drawings face left, so one heading right is
    // mirrored. A leg straight up or down keeps whichever way they were facing.
    if (Math.abs(dx) > 0.5) v.flip = dx > 0;
    if (d <= step) { v.x = tx; v.y = ty; v.leg++; step -= d; continue; }
    v.x += dx / d * step; v.y += dy / d * step; step = 0;
  }
  return v.leg >= pts.length;
}

// THE WORK LOOP, from the first frame to the last, whatever the waves are doing.
//   carry — the crew walks its load up to where it goes (from the painted spot the
//           first time, from off the bottom of the board every time after);
//   throw — a heave, and the load flies in a lob onto the pile and is gone;
//   away  — they walk off, standing, and off the board;
//   gone  — out of sight for `gone` seconds, and round again.
// The villagers it moves are marked `work`, and the rest of this file leaves them be.
function work(state, vp, dt) {
  const { smith, crew, hammer, angler, stuck, cook, kneel, bell } = vp.plan;
  const span = ([lo, hi]) => lo + Math.random() * (hi - lo);

  // THE CONGREGATION ON THE MAT, each on a round of his own: praying with his back to
  // the player, turned right; then kneeling up, bowed down, kneeling up again; and
  // praying — each step for a while drawn afresh, and each man started at a
  // different place in it, so no two are ever doing the same thing together. At
  // prayer they take no notice of a tap.
  if (kneel) {
    vp.kneel = vp.kneel || kneel.who.map(() => {
      const step = (Math.random() * KNEEL_STEPS.length) | 0;
      return { step, until: vp.t + Math.random() * span(kneel[KNEEL_STEPS[step]]) };
    });
    kneel.who.forEach((who, i) => {
      const v = state.villagers[who];
      if (!v) return;
      v.work = true;
      const c = vp.kneel[i];
      if (vp.t >= c.until) {
        c.step = (c.step + 1) % KNEEL_STEPS.length;
        c.until = vp.t + span(kneel[KNEEL_STEPS[c.step]]);
      }
      const at = KNEEL_STEPS[c.step];
      if (at === 'pray') { v.pose = 'praying'; v.side = 'back'; v.flip = true; }
      else { v.pose = at === 'bow' ? 'kneel_1' : 'kneel_2'; v.flip = false; }
    });
  }

  // THE CHURCH BELL, rung twice as each wave comes: swung to the left, a stroke, and
  // back to the middle as the stroke dies away; then to the right, a second stroke,
  // and back. Out of step with nothing else, and not a villager — render.js draws it
  // from `vp.bellPose`.
  if (bell) {
    if (state.spawned > 0 && vp.rung !== state.waveIndex) { vp.rung = state.waveIndex; vp.bellAt = vp.t; }
    const k = vp.bellAt === undefined ? Infinity : vp.t - vp.bellAt;
    let pose = 'middle', t0 = 0;
    for (const [p, d] of bell.swing) {
      if (k >= t0 && k < t0 + d) { pose = p; break; }
      t0 += d;
    }
    // A stroke as it reaches each side, cut off as it swings back.
    if (pose !== 'middle' && vp.bellPose === 'middle') {
      const d = bell.swing.find(([p]) => p === pose)[1];
      slice(BELL.key, 0, d, 1, BELL.fade);
    }
    vp.bellPose = pose;
  }

  // THE COOK: his skewer over the fire, then drawn back out, and over again.
  const ck = cook && state.villagers[cook.who];
  if (ck) {
    ck.work = true;
    const c = vp.cook || (vp.cook = { over: true, until: vp.t + span(cook.cook) });
    if (vp.t >= c.until) { c.over = !c.over; c.until = vp.t + span(c.over ? cook.cook : cook.out); }
    ck.pose = c.over ? 'cook_1' : 'cook_2';
    vp.cooking = c.over;
    // THE FIRE FLARES UNDER THE FISH while he holds it there (the level's `flare`
    // fire), quick to rise and slower to settle, so it swells rather than blinks.
    const target = c.over ? 1 : 0, rate = c.over ? 4 : 2;
    vp.heat = (vp.heat || 0) + (target - (vp.heat || 0)) * Math.min(1, rate * dt);
  }

  // THE ANGLER: waiting, then tugging at his line, and back, each for a while of its
  // own drawn afresh every time.
  const a = angler && state.villagers[angler.who];
  if (a) {
    a.work = true;
    const c = vp.angling || (vp.angling = { tug: false, until: vp.t + span(angler.wait) });
    if (vp.t >= c.until) { c.tug = !c.tug; c.until = vp.t + span(c.tug ? angler.tug : angler.wait); }
    a.pose = c.tug ? 'fish_2' : 'fish_1';
    vp.reeling = c.tug;
  }

  // THE MAN STUCK IN A HELMET: heaving at it — his two drawings by turns, shaking —
  // then a rest, and at it again.
  const st = stuck && state.villagers[stuck.who];
  if (st) {
    st.work = true;
    st.flip = !!stuck.flip;
    const k = vp.t % (stuck.struggle + stuck.rest);
    const heaving = k < stuck.struggle;
    st.pose = heaving && Math.floor(k / stuck.beat) % 2 ? 'helmet_2' : 'helmet_1';
    st.shake = heaving ? stuck.shake * Math.sin(vp.t * 41) : 0;
  }

  // THE SMITH: drawn back, then in the fire; the fire flares while the pipe is in.
  const s = smith && state.villagers[smith.who];
  if (s) {
    s.work = true;
    const k = vp.t % (smith.back + smith.in);
    const inFire = k >= smith.back;
    s.pose = inFire ? 'pipe_2' : 'pipe_1';
    // The weld sounds for as long as the pipe is in — main.js keeps the loop to it.
    vp.welding = inFire;
    [s.x, s.y] = smith.at;
    s.tool = smith.tool;
    // THE FIRE FOLLOWS THE PIPE: small while it is drawn back, roaring while it is
    // in. Quick to flare and slower to die down, so it swells rather than blinks.
    const target = inFire ? 1 : 0;
    const rate = inFire ? 6 : 3;
    vp.heat = (vp.heat || 0) + (target - (vp.heat || 0)) * Math.min(1, rate * dt);
  }

  // THE HAMMERER, on the beat he is given, round and round.
  const h = hammer && state.villagers[hammer.who];
  if (h) {
    h.work = true;
    const cycle = hammer.beats.reduce((n, [, d]) => n + d, 0);
    let k = (vp.t + h.n * 0.7) % cycle;
    const was = h.pose;
    for (const [pose, d] of hammer.beats) { if (k < d) { h.pose = pose; break; } k -= d; }
    // A KNOCK AS THE HAMMER COMES DOWN — the first blow's, then the second's. Or a
    // chop as the lumberjack's axe goes into the tree (`strike`, `sound`).
    const strike = hammer.strike || 'hammer_2', knocks = hammer.sound === 'chop' ? CHOP : HAMMER;
    if (was !== strike && h.pose === strike) {
      const [from, dur] = knocks.knocks[(vp.knock = ((vp.knock ?? -1) + 1) % knocks.knocks.length)];
      slice(knocks.key, from, dur);
      // And when it is an axe going into a tree, the tree shakes and a few leaves
      // come down — render.js reads the last few seconds' chops from here.
      if (hammer.sound === 'chop') vp.chops = [...(vp.chops || []).filter(c => vp.t - c < 4), vp.t];
    }
  }

  // STAGE 13'S FISH, jumping now and then.
  if (vp.plan.fish) fishJumps(vp, vp.plan.fish);

  // STAGE 12'S TORCH-LIGHTER AND RECRUIT, each once.
  if (vp.plan.lighter) lighterRound(state, vp, vp.plan.lighter, dt);
  if (vp.plan.recruit) recruitRound(state, vp, vp.plan.recruit, dt);

  // STAGE 14'S FOUR, none of them friends.
  if (vp.plan.thugs) hollowRound(state, vp, dt);

  // STAGE 11'S TWO CARRIERS, each on a loop of his own.
  if (vp.plan.porter) porterLoop(state, vp, vp.plan.porter, dt);
  if (vp.plan.ammo) ammoLoop(state, vp, vp.plan.ammo, dt);

  // EVERY CREW ON ITS OWN LOOP: stage 4's pair with a plank, and stage 5's porter
  // and box carrier. What is in the air is one list for the renderer.
  const crews = vp.plan.crews || (crew ? [crew] : []);
  vp.crews = vp.crews || [];
  vp.planks = [];
  crews.forEach((cr, i) => carryLoop(state, vp, cr, vp.crews[i] || (vp.crews[i] = {}), dt));
  // A box dropped on the ground stays there, drawn among the flying ones.
  if (vp.dropped) vp.planks.push(...vp.dropped);
}

function carryLoop(state, vp, crew, c, dt) {
  const lead = state.villagers[crew.lead];
  if (!lead) return;
  const mate = crew.mate !== undefined ? state.villagers[crew.mate] : null;
  const team = mate ? [lead, mate] : [lead];
  for (const v of team) v.work = true;
  const art = crew.art;
  const piece = PIECES[art.piece];
  // THE WAY TO THE PILE: a straight walk to `stack`, or along `path` to it — joined
  // the first time at `from`, from wherever the villager is painted.
  const route = crew.path || [crew.stack];
  if (!c.phase) Object.assign(c, { phase: 'carry', at: vp.t, planks: [], first: true });
  const stick = () => { if (mate) { mate.x = lead.x + PAIR[0]; mate.y = lead.y + PAIR[1]; } };

  if (c.phase === 'carry') {
    for (const v of team) v.hidden = false;
    if (mate) mate.ride = true;
    lead.pose = art.carry;
    if (c.first) { lead.leg = crew.from || 0; c.first = false; }
    if (walkTo(lead, route, WORK_WALK, dt)) { c.phase = 'throw'; c.at = vp.t; c.thrown = false; }
    // The carrying drawing is the way round the artist drew it, whichever way they go
    // — or mirrored, for a crew that says so (stage 8's carrier).
    for (const v of team) v.flip = !!crew.flip;
    // OUT OF A DOOR: faded in as he steps out of it — not the first time, when he
    // starts from where he is painted.
    if (crew.door) lead.alpha = c.outOfDoor ? Math.min(1, (vp.t - c.at) / DOOR_FADE) : 1;
    stick();
  } else if (c.phase === 'throw') {
    stick();
    const k = vp.t - c.at;
    // Up for the heave, then down on their feet, standing.
    if (crew.door) lead.alpha = 1;
    if (k < THROW_FOR) { lead.pose = art.throw; lead.flip = !!crew.flip; }
    else if (lead.pose !== 'standing') {
      if (mate) mate.ride = false;
      for (const v of team) { v.pose = 'standing'; v.side = 'front'; }
    }
    if (!c.thrown && k >= PLANK_AT) {
      c.thrown = true;
      const [fx, fy] = VILLAGER_POSE.feet[art.carry];
      const side = crew.flip ? -1 : 1;
      c.planks.push({ piece, x0: lead.x + (piece.held[0] - fx) * SCALE * side, y0: lead.y + (piece.held[1] - fy) * SCALE,
                      x1: crew.landing[0], y1: crew.landing[1], at: vp.t, depth: lead.y,
                      lob: crew.lob ?? PLANK_LOB, spin: side });
    }
    if (k >= THROW_REST) {
      c.phase = 'away'; c.at = vp.t;
      for (const v of team) v.leg = 0;
    }
  } else if (c.phase === 'away') {
    const done = walkTo(lead, crew.away.lead, WORK_WALK_FREE, dt) & (mate ? walkTo(mate, crew.away.mate, WORK_WALK_FREE, dt) : true);
    if (done && crew.door) { c.phase = 'fade'; c.at = vp.t; }
    else if (done) {
      c.phase = 'gone'; c.at = vp.t;
      for (const v of team) v.hidden = true;
    }
  } else if (c.phase === 'fade') {
    // INTO A DOOR: faded out on its step, then gone.
    lead.alpha = Math.max(0, 1 - (vp.t - c.at) / DOOR_FADE);
    if (lead.alpha <= 0) { c.phase = 'gone'; c.at = vp.t; lead.hidden = true; }
  } else if (c.phase === 'gone' && vp.t - c.at >= crew.gone) {
    // BACK FROM WHERE THEY LEFT, with the next load.
    [lead.x, lead.y] = crew.enter;
    lead.leg = 0;
    c.phase = 'carry'; c.at = vp.t; c.outOfDoor = !!crew.door;
    stick();
  }

  // WHAT IS IN THE AIR: a lob from their hands onto the pile, gone the moment it lands.
  for (const p of c.planks) {
    const q = (vp.t - p.at) / PLANK_FLIGHT;
    p.q = q;
    p.x = p.x0 + (p.x1 - p.x0) * q;
    p.y = p.y0 + (p.y1 - p.y0) * q - p.lob * 4 * q * (1 - q);
    p.rot = p.piece.spin * (p.spin ?? 1) * q;
  }
  // A THUD AS EACH ONE LANDS, soft, under the battle.
  for (const p of c.planks) if (p.q >= 1) play(LANDED);
  c.planks = c.planks.filter(p => p.q < 1);
  vp.planks.push(...c.planks);
}

// Along `pts` empty-handed, standing, faced the way they go: their back to the player
// heading up the board, their front otherwise.
function stroll(v, pts, dt, speed = WORK_WALK_FREE) {
  const x = v.x, y = v.y;
  const there = walkTo(v, pts, speed, dt);
  const dx = v.x - x, dy = v.y - y, d = Math.hypot(dx, dy);
  if (d > 0) v.side = dy < -RUN_UP * d ? 'back' : 'front';
  v.pose = 'standing';
  return there;
}

// STAGE 11'S BOX CARRIER: down to the factory with a box, in at its door, the factory
// run twice while he is inside, and out and away for the next. `vp.factory` is how
// lit the factory is, 0 to 1, eased — render.js lights its door and window and
// thickens its chimneys' smoke by it.
//   carry  — the box, along the way to the door;
//   in     — faded out on the step;
//   inside — out of sight while the factory runs;
//   out    — faded in on the step, and back up the way he came, empty-handed;
//   gone   — off the top of the board, and back with the next box.
function porterLoop(state, vp, pl, dt) {
  const v = state.villagers[pl.who];
  if (!v) return;
  v.work = true;
  const c = vp.porter || (vp.porter = { phase: 'carry', at: vp.t, first: true });
  const k = vp.t - c.at;
  // When each run of the factory starts, counted from the moment he is inside.
  const runAt = n => pl.idle + n * (FACTORY.dur + pl.between);
  let lit = 0;
  if (c.phase === 'carry') {
    v.hidden = false;
    v.alpha = 1;
    v.pose = 'carry_box';
    if (c.first) { v.leg = pl.from; c.first = false; }
    // The box on his right, as he is painted, whichever way he goes.
    if (walkTo(v, pl.path, WORK_WALK, dt)) { c.phase = 'in'; c.at = vp.t; }
    v.flip = true;
  } else if (c.phase === 'in') {
    v.alpha = Math.max(0, 1 - k / DOOR_FADE);
    if (v.alpha <= 0) { v.hidden = true; c.phase = 'inside'; c.at = vp.t; c.runs = 0; }
  } else if (c.phase === 'inside') {
    // THE FACTORY RUNNING: a second after he goes in, and again `between` seconds
    // after the first run ends — a run as long as its sound.
    if (c.runs < pl.runs && k >= runAt(c.runs)) { c.runs++; slice(FACTORY.key, 0, FACTORY.len, 1, 0.15); }
    for (let n = 0; n < pl.runs; n++) if (k >= runAt(n) && k < runAt(n) + FACTORY.dur) lit = 1;
    // Out a second after the last run.
    if (k >= runAt(pl.runs - 1) + FACTORY.dur + pl.idle) {
      c.phase = 'out'; c.at = vp.t;
      [v.x, v.y] = pl.path[pl.path.length - 1];
      v.leg = 0; v.hidden = false; v.alpha = 0; v.side = 'front';
    }
  } else if (c.phase === 'out') {
    v.alpha = Math.min(1, k / DOOR_FADE);
    if (stroll(v, pl.path.slice(0, -1).reverse(), dt)) { c.phase = 'gone'; c.at = vp.t; v.hidden = true; }
  } else if (c.phase === 'gone' && k >= pl.gone) {
    [v.x, v.y] = pl.path[0];
    v.leg = 0; v.side = 'front';
    c.phase = 'carry'; c.at = vp.t;
  }
  // Quick to light, a little slower to go dark.
  const rate = lit ? 5 : 2.5;
  vp.factory = (vp.factory || 0) + (lit - (vp.factory || 0)) * Math.min(1, rate * dt);
}

// Where the ball is in his arms, against his feet, in board px, the way he faces: the
// middle of the ball in the carrying drawings, front and back alike.
const BALL_HELD = [(241 - 263) * SCALE, (249 - 305) * SCALE];
export const BALL_R = 22 * SCALE;
const BALL_DROP = 0.35;       // seconds for a dropped ball to reach the ground

// STAGE 11'S CANNONBALL CARRIER, a round of his own:
//   carry  — a ball, from the pile to the tower's door;
//   in     — faded out on the step;
//   inside — in the tower, out of sight;
//   out    — faded in on the step, and back to the pile empty-handed;
//   pick   — bent over the pile, facing it;
//   heave  — up with it, still facing the pile, a moment — it is heavy;
// and round to carry it again. And once the tower is sold:
//   stop   — standing where he was, doing what he was, for `pause` seconds;
//   home   — the ball dropped, if he had one, and off to the lower house;
//   gone   — faded out at its door, for good.
function ammoLoop(state, vp, am, dt) {
  const v = state.villagers[am.who];
  if (!v) return;
  v.work = true;
  const c = vp.ammo || (vp.ammo = {
    phase: 'carry', at: vp.t, first: true,
    // THE TOWER HE SERVES, the one standing on its plot when the board starts. Asked
    // after by the object rather than the plot, so one built there after it is sold
    // does not bring him back.
    tower: (state.towers || []).find(t => Math.hypot(t.plot.x - am.tower[0], t.plot.y - am.tower[1]) < 1) || null
  });
  if (c.phase === 'lost') return;
  // THE TOWER SOLD. In it, he goes with it; outside, he stops.
  if (!c.sold && !(state.towers || []).includes(c.tower)) {
    c.sold = true;
    if (c.phase === 'in' || c.phase === 'inside') { v.hidden = true; c.phase = 'lost'; return; }
    c.phase = 'stop'; c.at = vp.t;
  }
  const k = vp.t - c.at;
  if (c.phase === 'carry') {
    v.hidden = false;
    v.alpha = 1;
    // HIS BACK TO THE PLAYER, the whole way up to the door: turned right — the
    // drawing mirrored — while he goes up to the right, and as drawn once he turns
    // up to the left for the door (walkTo faces him the way he goes).
    v.pose = 'ball_back';
    if (c.first) { v.leg = am.from; c.first = false; }
    if (walkTo(v, am.path, WORK_WALK, dt)) { c.phase = 'in'; c.at = vp.t; }
  } else if (c.phase === 'in') {
    v.alpha = Math.max(0, 1 - k / DOOR_FADE);
    if (v.alpha <= 0) { v.hidden = true; c.phase = 'inside'; c.at = vp.t; }
  } else if (c.phase === 'inside') {
    if (k >= am.inside) {
      c.phase = 'out'; c.at = vp.t;
      [v.x, v.y] = am.path[am.path.length - 1];
      v.leg = 0; v.hidden = false; v.alpha = 0; v.side = 'front';
    }
  } else if (c.phase === 'out') {
    v.alpha = Math.min(1, k / DOOR_FADE);
    if (stroll(v, am.path.slice(0, -1).reverse(), dt)) { c.phase = 'pick'; c.at = vp.t; }
  } else if (c.phase === 'pick') {
    // Bent over the pile, which is on his left: the drawing as it is.
    v.pose = 'pick_up'; v.flip = false; v.side = 'front';
    if (k >= am.pick) { c.phase = 'heave'; c.at = vp.t; }
  } else if (c.phase === 'heave') {
    // Up with it in his arms, still facing the pile, which is on his left: the
    // front carrying drawing as it is.
    v.pose = 'ball_front'; v.flip = false;
    if (k >= am.heave) { c.phase = 'carry'; c.at = vp.t; v.leg = 0; }
  } else if (c.phase === 'stop') {
    // As he was. Then the ball dropped at his feet, if he had one.
    if (k >= am.pause) {
      if (v.pose === 'ball_back' || v.pose === 'ball_front') {
        const side = v.flip ? -1 : 1;
        vp.balls = [...(vp.balls || []), { x: v.x + BALL_HELD[0] * side, y0: v.y + BALL_HELD[1] + BALL_R,
          y: v.y + 1.5, at: vp.t }];
      }
      c.phase = 'home'; c.at = vp.t; v.leg = 0; v.alpha = 1;
    }
  } else if (c.phase === 'home') {
    v.alpha = 1;
    if (stroll(v, am.home, dt)) { c.phase = 'gone'; c.at = vp.t; v.side = 'back'; }
  } else if (c.phase === 'gone') {
    v.alpha = Math.max(0, 1 - k / DOOR_FADE);
    if (v.alpha <= 0) { v.hidden = true; c.phase = 'lost'; }
  }
  // A DROPPED BALL falls to the ground and stays there, with a thud as it lands.
  for (const b of vp.balls || []) {
    const q = Math.min(1, (vp.t - b.at) / BALL_DROP);
    b.q = q;
    if (q >= 1 && !b.landed) { b.landed = true; play(LANDED); }
  }
}

// STAGE 14, DARK HOLLOW WOODS: two thugs and two enemy villagers, and a tap on any of
// them puts him on the road. Each is in one of these, in `vp.hollow[who].phase`:
//   idle    — a thug or the man by the bottom hut, turning left and right where he
//             stands, now and then;
//   carry / in / inside / out / gone — the box carrier's round (see `boxman`);
//   drop    — tapped with a box: it falls at his feet, and he stands a moment;
//   house   — to the hut and in at its door (or round behind it), faded out;
//   arming  — inside, `arm` seconds;
//   march   — out, as a Thug or a Tough Thug, to the road: `vp.turned` asks main.js
//             for the creature where he reaches it, and he is gone from the villagers.
// What he LOOKS like is `v.look`: 'enemy' (a villager in the thugs' dark clothes),
// 'thug' or 'tough' (the creature's own drawing) — see drawVillager in src/render.js.
const TURN_EVERY = [2.5, 6];
const ROAD_EDGE = 40;         // px from the middle of a road to its edge, near enough
function hollowRound(state, vp, dt) {
  const plan = vp.plan;
  const span = ([lo, hi]) => lo + Math.random() * (hi - lo);
  vp.hollow = vp.hollow || {};
  const cardOf = type => ({ title: enemyTypes[type].name, sprite: enemyTypes[type].sprite,
                            trim: enemyTypes[type].spriteTrim });
  const ENEMY_CARD = { title: 'Enemy Villager', sprite: 'evill_front_standing', trim: VILLAGER.spriteTrim };

  // Turning where he stands, one way and then the other, on no beat of his own.
  const fidget = (v, c) => {
    if (c.turn === undefined) c.turn = vp.t + span(TURN_EVERY);
    if (vp.t >= c.turn) { v.flip = !v.flip; c.turn = vp.t + span(TURN_EVERY); }
  };
  // Off to the road: along `road`, and on to the nearest point of it — where he joins.
  const march = (v, c, type, road) => {
    const last = road[road.length - 1];
    const j = nearestOn(level.routes, last[0], last[1]);
    Object.assign(c, { phase: 'march', type, join: j, way: [...road, [j.x, j.y]] });
    v.leg = 0; v.look = 'thug'; v.lookType = type; v.card = cardOf(type);
  };
  // SLOWLY UP TO THE ROAD, AND UP TO SPEED ACROSS IT: from its edge (`ROAD_EDGE` from
  // its middle) he quickens, eased, until he is walking at the creature's own pace as
  // he reaches the middle of it — where he is that creature — so there is no step
  // from a stroll to a march.
  const marching = (v, c) => {
    const d = nearestOn(level.routes, v.x, v.y).d;
    const k = Math.min(1, Math.max(0, 1 - d / ROAD_EDGE));
    const pace = plan.walk + (enemyTypes[c.type].speed - plan.walk) * k * k * (3 - 2 * k);
    if (walkTo(v, c.way, pace, dt)) {
      c.phase = 'done';
      v.hidden = true; v.live = false;
      (vp.turned = vp.turned || []).push({ who: v.n, type: c.type, route: c.join.route, s: c.join.s });
    }
  };
  // Faded out at a door, `arm` seconds inside, and out faded in as a Tough Thug.
  const house = (v, c, way, arm, road, type = 'tough_inf', side = null) => {
    const k = vp.t - c.at;
    if (c.phase === 'house') {
      v.pose = 'standing';
      if (walkTo(v, way, plan.walk, dt)) { c.phase = 'into'; c.at = vp.t; }
      // His back to the player on the way to a door above him — or as he is told.
      v.side = side || (way[way.length - 1][1] < v.y + 1 ? 'back' : 'front');
    } else if (c.phase === 'into') {
      v.alpha = Math.max(0, 1 - k / DOOR_FADE);
      if (v.alpha <= 0) { v.hidden = true; c.phase = 'arming'; c.at = vp.t; }
    } else if (c.phase === 'arming' && k >= arm) {
      v.hidden = false; v.alpha = 0; c.at = vp.t;
      march(v, c, type, road);
      c.fadeIn = true;
    }
  };

  for (const th of plan.thugs) {
    const v = state.villagers[th.who];
    if (!v || !v.live) continue;
    v.work = true; v.voice = plan.voice;
    const c = vp.hollow[th.who] || (vp.hollow[th.who] = { phase: 'idle' });
    if (c.phase === 'idle') {
      v.look = 'thug'; v.lookType = 'light_inf'; v.card = cardOf('light_inf');
      fidget(v, c);
      if (c.tapped) { c.phase = 'still'; c.at = vp.t; }
    }
    if (c.phase === 'still' && vp.t - c.at >= plan.still) march(v, c, 'light_inf', th.road);
    if (c.phase === 'march') marching(v, c);
  }

  for (const hd of plan.hideouts) {
    const hv = state.villagers[hd.who];
    if (!hv || !hv.live) continue;
    hv.work = true; hv.voice = plan.voice;
    const c = vp.hollow[hd.who] || (vp.hollow[hd.who] = { phase: 'idle' });
    if (c.phase === 'idle') {
      hv.look = 'enemy'; hv.card = ENEMY_CARD; hv.pose = 'standing'; hv.side = 'front';
      fidget(hv, c);
      if (c.tapped) { c.phase = 'still'; c.at = vp.t; }
    }
    if (c.phase === 'still' && vp.t - c.at >= plan.still) { c.phase = 'house'; c.at = vp.t; hv.leg = 0; }
    house(hv, c, hd.way, hd.arm, hd.road, hd.type, hd.side);
    if (c.phase === 'march') { if (c.fadeIn) hv.alpha = Math.min(1, (vp.t - c.at) / DOOR_FADE); marching(hv, c); }
  }

  const bx = plan.boxman, bv = bx && state.villagers[bx.who];
  if (bv && bv.live) {
    bv.work = true; bv.voice = plan.voice;
    const c = vp.hollow[bx.who] || (vp.hollow[bx.who] = { phase: 'carry', at: vp.t, first: true });
    const k = vp.t - c.at;
    // TAPPED, whatever he is doing that can see a tap: the box dropped if he has one,
    // and into the hut.
    if (c.tapped && !c.turning && ['carry', 'out'].includes(c.phase)) {
      c.turning = true;
      if (c.phase === 'carry') {
        const [fx, fy] = VILLAGER_POSE.feet.carry_box;
        const side = bv.flip ? -1 : 1, piece = PIECES.box;
        // Where it comes to rest: sitting on its shadow, whose centre is on the ground in
        // front of him — the owner's drawing of it on the ground (BOX_GROUND) says where
        // the box stands on its shadow.
        const ground = bv.y + 2;
        const rest = ground - BOX_GROUND.shadow[1] * SCALE;
        c.box = { piece, x0: bv.x + (piece.held[0] - fx) * SCALE * side, y0: bv.y + (piece.held[1] - fy) * SCALE,
                  rest, ground, x: 0, y: 0, rot: 0, at: vp.t, depth: ground, onGround: BOX_GROUND };
        c.phase = 'drop';
      } else c.phase = 'drop';
      c.at = vp.t; bv.leg = 0; bv.alpha = 1;
      // TO THE DOOR along the rest of the way he was on, from the point of it he is
      // nearest.
      const way = c.firstWay ? bx.first : bx.path;
      let near = 0;
      way.forEach(([x, y], i) => {
        if (Math.hypot(x - bv.x, y - bv.y) < Math.hypot(way[near][0] - bv.x, way[near][1] - bv.y)) near = i;
      });
      c.door = way.slice(Math.min(near + 1, way.length - 1));
    }
    if (c.phase === 'carry') {
      bv.hidden = false; bv.alpha = 1; bv.look = 'enemy'; bv.card = ENEMY_CARD;
      bv.pose = 'carry_box';
      if (c.first) { bv.leg = 0; c.firstWay = true; c.first = false; bv.flip = false; }
      if (walkTo(bv, c.firstWay ? bx.first : bx.path, WORK_WALK, dt)) { c.phase = 'in'; c.at = vp.t; c.firstWay = false; }
      // Facing the player: turned left, the drawing as it is, coming down; mirrored once
      // he turns right along below the stepping stones (walkTo turns him the way he goes).
    } else if (c.phase === 'in') {
      bv.alpha = Math.max(0, 1 - k / DOOR_FADE);
      if (bv.alpha <= 0) { bv.hidden = true; c.phase = 'inside'; c.at = vp.t; }
    } else if (c.phase === 'inside') {
      if (k >= bx.inside) {
        c.phase = 'out'; c.at = vp.t;
        [bv.x, bv.y] = bx.path[bx.path.length - 1];
        bv.leg = 0; bv.hidden = false; bv.alpha = 0; bv.side = 'front';
      }
    } else if (c.phase === 'out') {
      bv.alpha = Math.min(1, k / DOOR_FADE);
      if (stroll(bv, bx.path.slice(0, -1).reverse(), dt)) { c.phase = 'gone'; c.at = vp.t; bv.hidden = true; }
    } else if (c.phase === 'gone' && k >= bx.gone) {
      [bv.x, bv.y] = bx.path[0];
      bv.leg = 0; bv.side = 'front'; bv.flip = false;
      c.phase = 'carry'; c.at = vp.t;
    } else if (c.phase === 'drop') {
      // STANDING THERE with empty hands, the box at his feet, and then to the hut.
      bv.pose = 'standing'; bv.side = 'front';
      // Timed from the tap itself — `k` above was read before it.
      if (vp.t - c.at >= plan.still) { c.phase = 'house'; c.at = vp.t; bv.leg = 0; }
    }
    if (['house', 'into', 'arming'].includes(c.phase)) house(bv, c, c.door, bx.arm, bx.road);
    if (c.phase === 'march') { if (c.fadeIn) bv.alpha = Math.min(1, (vp.t - c.at) / DOOR_FADE); marching(bv, c); }
    // THE DROPPED BOX falls from his arms to the ground and stays there.
    if (c.box) {
      const b = c.box, q = Math.min(1, (vp.t - b.at) / BOX_DROP);
      b.x = b.x0; b.y = b.y0 + (b.rest - b.y0) * q * q;
      if (q >= 1 && !b.landed) { b.landed = true; play(LANDED); }
      vp.dropped = [b];
    }
  }
}
const BOX_DROP = 0.3;         // seconds for a dropped box to reach the ground
// THE OWNER'S DRAWING OF THE BOX ON THE GROUND, shadow and all (Box_on_ground.png),
// which is what a dropped box is once it lands. Its box is the carried one's drawing
// a pixel right and two up, so `mid` is where the flying box's middle lands in it;
// `shadow` is the centre of its shadow from there, and `r` its two radii — the
// shadow render.js grows from nothing under the falling box to exactly this.
export const BOX_GROUND = { key: 'vill_box_on_ground', src: [208, 227, 96, 58], mid: [257, 253.5],
                            shadow: [-1.5, 14], r: [47.5, 16.5], fill: '#595959' };

// A TAP ON ONE OF DARK HOLLOW'S FOUR: noted, and his round does the rest.
function hollowTap(vp, v) {
  vp.hollow = vp.hollow || {};
  const c = vp.hollow[v.n];
  if (c) c.tapped = true;
}

// STAGE 13'S FISH: every few seconds one leaps from a spot on the lake, turned
// either way, with a splash as it breaks the water — `vp.fishJump` for render.js to
// draw the leap from, and `vp.splashes` for the rings where it leaves the water and
// where it goes back in.
function fishJumps(vp, fs) {
  const span = ([lo, hi]) => lo + Math.random() * (hi - lo);
  if (vp.fishNext === undefined) vp.fishNext = vp.t + span(fs.gap) * 0.5;
  if (vp.t >= vp.fishNext) {
    const [x, y] = fs.spots[(Math.random() * fs.spots.length) | 0];
    const dir = Math.random() < 0.5 ? -1 : 1;
    const j = { x, y, dir, at: vp.t, span: span(fs.span), height: span(fs.height), dur: fs.dur };
    vp.fishJump = j;
    vp.fishNext = vp.t + fs.dur + span(fs.gap);
    vp.splashes = [...(vp.splashes || []), { x, y, at: vp.t }];
    // THE SPLASH as it comes out of the water.
    slice(SPLASH.key, 0, SPLASH.dur, 1, SPLASH.fade);
  }
  const j = vp.fishJump;
  if (j && !j.landed && vp.t - j.at >= j.dur) {
    j.landed = true;
    vp.splashes = [...(vp.splashes || []), { x: j.x + j.dir * j.span, y: j.y, at: vp.t, small: true }];
  }
  if (vp.splashes) vp.splashes = vp.splashes.filter(s => vp.t - s.at < 1.6);
}

// STAGE 12'S TORCH-LIGHTER, once, as the board opens:
//   wait   — a moment where he is painted;
//   walk   — up to a torch with his pole held up, his back to the player (turned
//            right) — or, going down to the second, facing the player;
//   light  — the pole's flame at its cup; the torch catches (`vp.litAt`, read by the
//            torch fires in render.js);
//   throw  — the pole thrown down, falling still lit and burning out on the grass
//            (`vp.pole`, drawn by render.js); he stands watching it land;
//   home   — back to the castle door, faded out there, gone.
const POLE_WALK = 14;         // px a second, carrying the pole up
function lighterRound(state, vp, lt, dt) {
  const v = state.villagers[lt.who];
  if (!v) return;
  v.work = true;
  const c = vp.lighter || (vp.lighter = { phase: 'wait', at: vp.t, n: 0 });
  vp.litAt = vp.litAt || [];
  const k = vp.t - c.at;
  if (c.phase === 'wait') {
    v.pose = 'pole_back'; v.flip = true;
    if (k >= lt.start) { c.phase = 'walk'; c.at = vp.t; v.leg = 0; }
  } else if (c.phase === 'walk') {
    // Up to the first his back turned; down to the second facing the player; turned
    // right both times.
    v.pose = c.n === 0 ? 'pole_back' : 'pole_front';
    if (walkTo(v, [lt.torches[c.n]], POLE_WALK, dt)) { c.phase = 'light'; c.at = vp.t; }
    v.flip = true;
  } else if (c.phase === 'light') {
    v.pose = 'pole_back'; v.flip = true;
    if (k >= lt.lightAt && vp.litAt[c.n] === undefined) vp.litAt[c.n] = vp.t;
    if (k >= lt.hold) {
      c.n++;
      c.at = vp.t;
      if (c.n < lt.torches.length) { c.phase = 'walk'; v.leg = 0; }
      else {
        c.phase = 'throw';
        // THE POLE LEAVES HIS HANDS where he held it and falls to his right.
        vp.pole = { x: v.x, y: v.y, at: vp.t };
      }
    }
  } else if (c.phase === 'throw') {
    v.pose = 'standing'; v.side = 'front'; v.flip = true;
    if (k >= lt.rest) { c.phase = 'home'; c.at = vp.t; v.leg = 0; }
  } else if (c.phase === 'home') {
    // Unhurried, his work done: at `homeWalk`, slower than he came.
    if (stroll(v, [lt.door], dt, lt.homeWalk)) { c.phase = 'fade'; c.at = vp.t; }
  } else if (c.phase === 'fade') {
    v.alpha = Math.max(0, 1 - k / DOOR_FADE);
    if (v.alpha <= 0) { v.hidden = true; c.phase = 'gone'; }
  }
}

// STAGE 12'S RECRUIT, once:
//   idle   — standing about, now and then turned to the right;
//   in     — at the first enemy, up to the castle door, his back to the player;
//   fade   — faded out on the step, and inside;
//   inside — until the second wave's first enemy appears;
//   out    — faded in on the step in a musketeer's gear, and down and along to his
//            post behind the barricade;
//   ready  — standing there a moment;
//   posted — gone from the villagers: `vp.recruit` asks main.js for a garrison
//            musketeer where he stands, the same as the board's other one, who holds
//            his aim a moment before his first shot.
function recruitRound(state, vp, rc, dt) {
  const v = state.villagers[rc.who];
  if (!v) return;
  v.work = true;
  const c = vp.recruitee || (vp.recruitee = { phase: 'idle', at: vp.t, turn: vp.t + 3 + Math.random() * 3 });
  const k = vp.t - c.at;
  v.voice = rc.voice;
  // His card: a villager of his own until he comes out in his gear, a musketeer's
  // from then on (see selectionInfo in src/select.js).
  v.card = rc.card;
  v.asUnit = ['out', 'report', 'march', 'ready', 'posted'].includes(c.phase) ? rc.post.unit : null;
  if (c.phase === 'idle') {
    v.pose = 'vm_front';
    // Turned to the right a while, and back, on no beat of his own.
    if (vp.t >= c.turn) { v.flip = !v.flip; c.turn = vp.t + (v.flip ? 1.5 + Math.random() * 1.5 : 3 + Math.random() * 3); }
    if (state.enemies.length) { c.phase = 'in'; c.at = vp.t; v.leg = 0; }
  } else if (c.phase === 'in') {
    // His back to the player; walkTo turns him right for the last step to the door.
    v.pose = 'vm_back';
    if (walkTo(v, rc.in, WORK_WALK_FREE, dt)) { c.phase = 'fade'; c.at = vp.t; }
  } else if (c.phase === 'fade') {
    v.alpha = Math.max(0, 1 - k / DOOR_FADE);
    if (v.alpha <= 0) { v.hidden = true; c.phase = 'inside'; c.at = vp.t; }
  } else if (c.phase === 'inside') {
    if (state.waveIndex >= 1 && state.spawned > 0) {
      c.phase = 'out'; c.at = vp.t;
      [v.x, v.y] = rc.in[rc.in.length - 1];
      v.leg = 0; v.hidden = false; v.alpha = 0; v.flip = false;
    }
  } else if (c.phase === 'out') {
    // A FEW STEPS OUT OF THE DOOR FIRST, straight down to the first point of his way
    // out, faded in as he comes...
    v.alpha = Math.min(1, k / DOOR_FADE);
    v.pose = 'musk_front';
    if (walkTo(v, rc.out.slice(0, 1), WORK_WALK_FREE, dt)) {
      c.phase = 'report'; c.at = vp.t; v.alpha = 1;
      // ...then REPORTING FOR DUTY, a voice like any other (Category A), standing
      // still for `pause` seconds while he says it — at the owner's word, so the
      // voice comes from a man who has stopped to announce himself.
      if (rc.report) solo(rc.report, true);
    }
  } else if (c.phase === 'report') {
    v.pose = 'musk_front'; v.alpha = 1;
    if (k >= (rc.pause || 0)) { c.phase = 'march'; c.at = vp.t; v.leg = 0; }
  } else if (c.phase === 'march') {
    // And on, turned right along to the barricade and a quick turn left onto his
    // post: walkTo faces him the way he goes.
    v.pose = 'musk_front';
    if (walkTo(v, rc.out.slice(1), WORK_WALK_FREE, dt)) { c.phase = 'ready'; c.at = vp.t; v.flip = false; }
  } else if (c.phase === 'ready') {
    if (k >= rc.ready) {
      c.phase = 'posted';
      v.hidden = true;
      v.live = false;
      vp.recruit = { ...rc.post, aim: rc.aim, who: rc.who };
    }
  }
}

const RUN_SPEED = 46;         // px a second
const VANISH_FOR = 0.5;       // seconds to fade out through a door
const RUN_UP = 0.05;          // how steeply up a runner must go to show their back
const HOP_GAP = 0.16;         // seconds between one villager's hop and the next's
const HOP_UP = 0.3, HOP_DOWN = 0.2;   // how long the hopping and landing drawings show
const HOPS = 2;                       // hops each time, one straight after the other
export const GREET_SECONDS = 1;       // how long a tapped villager greets the player

// A TAP ON A VILLAGER, from src/input.js. One facing the player stops what they are
// doing and greets for a second; one with their back to the player turns round to
// do it. A runner stops mid-stride and then carries on.
export function greetVillager(state, v) {
  const vp = state.villagerPlay;
  if (!vp || !v || !v.live || v.hidden) return;
  // DARK HOLLOW'S: a tap sets him on the road. See hollowRound.
  if (vp.plan.thugs) { hollowTap(vp, v); return; }
  // At work they carry on working; the tap still opens the card and plays the sound.
  if (vp.plan.work) return;
  v.greetUntil = vp.t + GREET_SECONDS;
}

export function updateVillagers(state, dt) {
  const vp = state.villagerPlay;
  if (!vp) return;
  vp.t += dt;
  const { plan } = vp;

  // A STAR LOST — lives dropping below 18 and again below 10 on stage 1's 20 — and
  // the village cries "nooo". Asked of the same rating the result screen uses, so it
  // is exactly the moment a star goes; not at zero, which the lost sound answers.
  const stars = starsFor(state.lives, vp.startLives);
  if (plan.cries.nooo && vp.stars !== null && stars < vp.stars && state.lives > 0) solo(VILLAGER_NOOO, true, true, true);
  vp.stars = stars;

  // THE VILLAGE SHOUTS AS THE FIRST ENEMY OF WAVE 1 APPEARS, on the boards that have
  // a shout — every board, in a round of five at the owner's word: "runnn" on
  // stages 1, 6 and 11, "hide" on 2, 7 and 12, "oh no" on 3, 8 and 13, "here they
  // come" on 4 and 9, "thugs are here" on 5 and 10. Once, before everything. Ahead of the work boards'
  // early return, so the lumberyard, whose villagers never stop working, shouts too.
  if (!vp.cried && state.enemies.length) {
    vp.cried = true;
    if (plan.cries.wave) solo(VILLAGER_WAVE[plan.cries.wave], true, true, true);
  }

  work(state, vp, dt);
  if (plan.work) return;

  // THE FIRST ENEMY OF THE FIRST WAVE sends the runners off, and turns everyone to
  // face the way they will watch from now on.
  if (!vp.started && state.enemies.length) {
    vp.started = true;
    for (const v of state.villagers) {
      const a = plan.after[v.n];
      if (v.live && a && !v.work) { v.side = a.side || v.side; v.act = a.act || null; v.flip = !!a.flip; }
    }
    for (const r of plan.run) {
      const v = state.villagers[r.who];
      if (!v) continue;
      v.from = r.from || null;
      v.mode = 'wait';
      v.leaveAt = vp.t + r.delay;
      v.path = r.path;
      v.vanish = !!r.vanish;
      v.trip = r.stay ? { there: r.there, stay: r.stay, home: [v.x, v.y], out: r.path, back: false,
                          loop: r.loop || 0 } : null;
      v.leg = 0;
    }
  }


  // THE HOPS, each group on its own count of the fallen.
  plan.hops.forEach((h, k) => {
    const n = Math.floor((state.slain || 0) / h.every);
    if (n > vp.hops[k].n) { vp.hops[k].n = n; vp.hops[k].at = vp.t; }
  });

  for (const v of state.villagers) {
    if (!v.live || v.work) continue;
    const greeting = vp.t < v.greetUntil;

    if (v.mode === 'wait' && vp.t >= v.leaveAt) {
      v.mode = 'run';
      // OUT OF SIGHT UNTIL NOW: they step out where `from` says — a doorway.
      if (v.from) { [v.x, v.y] = v.from; v.hidden = false; }
      // "RUNNN", once, as the first of them sets off.
      if (plan.cries.runnn && !vp.shouted) { vp.shouted = true; solo(VILLAGER_RUN, true, true, true); }
    }
    if (v.hidden) continue;

    // BACK FROM A TRIP when its time there is up.
    if (v.mode === 'idle' && v.trip && !v.trip.back && v.trip.at !== undefined && vp.t >= v.trip.at) {
      v.trip.back = true;
      v.path = [...v.trip.out.slice(0, -1).reverse(), v.trip.home];
      v.leg = 0;
      v.mode = 'run';
    }
    // AND OUT AGAIN, on a trip that loops, once its time at home is up.
    if (v.mode === 'idle' && v.trip && v.trip.back && v.trip.again !== undefined && vp.t >= v.trip.again) {
      v.trip.back = false;
      v.trip.at = v.trip.again = undefined;
      v.path = v.trip.out;
      v.leg = 0;
      v.mode = 'run';
    }

    // THROUGH A DOOR AND GONE: faded out where the path ends, then out of sight.
    if (v.mode === 'vanish') {
      v.alpha = Math.max(0, 1 - (vp.t - v.fadeAt) / VANISH_FOR);
      if (v.alpha <= 0) { v.hidden = true; v.mode = 'gone'; }
      continue;
    }

    if (v.mode === 'run') {
      if (greeting) { v.pose = 'greeting'; v.greetSide = 'front'; continue; }
      const [tx, ty] = v.path[v.leg];
      const dx = tx - v.x, dy = ty - v.y, d = Math.hypot(dx, dy);
      const stepLen = RUN_SPEED * dt;
      if (d <= stepLen) {
        v.x = tx; v.y = ty;
        v.leg++;
        if (v.leg >= v.path.length && v.vanish) {
          v.mode = 'vanish'; v.fadeAt = vp.t; v.pose = 'standing'; v.runSide = null; v.side = 'back';
          continue;
        }
        if (v.leg >= v.path.length && v.trip && !v.trip.back) {
          // THERE: stand and pray a while, then home again the way he came.
          const { there, stay } = v.trip;
          v.mode = 'idle';
          v.side = there.side; v.act = there.act; v.flip = !!there.flip;
          v.trip.at = vp.t + stay;
          continue;
        }
        if (v.leg >= v.path.length) {
          v.mode = 'idle';
          const a = plan.after[v.n];
          if (a) { v.side = a.side; v.act = a.act; }
          v.flip = !!(a && a.flip);
          // Home from a trip that loops: off again after `loop` seconds here.
          if (v.trip && v.trip.back && v.trip.loop) v.trip.again = vp.t + v.trip.loop;
        }
      } else {
        v.x += dx / d * stepLen;
        v.y += dy / d * stepLen;
        v.flip = dx > 0;                     // the drawings face left
        // HEADING UP THE SCREEN, THEIR BACKS TO THE PLAYER: once past the lower
        // houses the runners climb towards the flag, and a villager running away
        // from the camera shows their back. Going down or level, their front. Read
        // off the direction of travel, with a little slack so a leg that is level
        // but for a pixel or two does not turn them round.
        v.runSide = dy < -RUN_UP * d ? 'back' : 'front';
      }
      // THE RUNNING DRAWING AND NOTHING ELSE, the whole way.
      if (v.mode === 'run') { v.pose = 'running'; v.greetSide = null; continue; }
    }

    let pose = 'standing';
    const act = ACTS[v.act];
    if (act && v.mode === 'idle') {
      pose = (vp.t + v.n * 2.3) % act.every < act.for ? act.pose : act.rest;
    }
    const hop = hopping(vp, v);
    if (hop) pose = hop.pose;
    if (greeting) pose = 'greeting';
    v.pose = pose;
    // A TAPPED villager turns to face the player to greet them.
    v.greetSide = greeting ? 'front' : null;
  }
}

// WHETHER A VILLAGER IS IN THE MIDDLE OF A HOP, and which half: TWICE,
// hop-land-hop-land, so the player has the time to catch it — `k` is how far through
// the half it is. Null when not hopping. Asked only of villagers who stand and pray:
// one at work (the angler, the cook, the man in the helmet...) never hops.
function hopping(vp, v) {
  let out = null;
  vp.plan.hops.forEach((h, k) => {
    const at = vp.hops[k].at;
    const j = h.who.indexOf(v.n);
    if (at === null || j < 0) return;
    const t = vp.t - at - j * HOP_GAP;
    if (t < 0 || t >= HOPS * (HOP_UP + HOP_DOWN)) return;
    const q = t % (HOP_UP + HOP_DOWN);
    out = q < HOP_UP ? { pose: 'hopping', k: q / HOP_UP } : { pose: 'landing', k: (q - HOP_UP) / HOP_DOWN };
  });
  return out;
}

// Which drawing a villager is showing: their own side, or the front while a tap has
// them greeting, or the front while they run.
export function villagerKey(v) {
  // The work drawings have no front and back: one each.
  if (WORK_ART[v.pose]) return WORK_ART[v.pose];
  const side = v.greetSide || (v.mode === 'run' ? v.runSide || 'front' : v.side);
  return `vill_${side}_${v.pose}`;
}
const WORK_ART = { carry: 'vill_carrying_wood_plank', throw: 'vill_throwing_wood_plank',
                   pipe_1: 'vill_holding_steel_pipe_1', pipe_2: 'vill_holding_steel_pipe_2',
                   carry_parts: 'vill_carrying_ballista_parts', throw_parts: 'vill_throwing_ballista_parts',
                   hammer_1: 'vill_hammering_1', hammer_2: 'vill_hammering_2',
                   carry_box: 'vill_carrying_box', throw_box: 'vill_throwing_box',
                   fish_1: 'vill_fishing_1', fish_2: 'vill_fishing_2',
                   helmet_1: 'vill_helmet_stuck_1', helmet_2: 'vill_helmet_stuck_2',
                   cook_1: 'vill_cooking_1', cook_2: 'vill_cooking_2',
                   kneel_1: 'vill_kneeling_1', kneel_2: 'vill_kneeling_2',
                   chop_1: 'vill_cutting_tree_1', chop_2: 'vill_cutting_tree_2',
                   ball_back: 'vill_back_carrying_cannonball', ball_front: 'vill_front_carrying_cannonball',
                   pick_up: 'vill_picking_up',
                   pole_front: 'vill_front_lighting_pole', pole_back: 'vill_back_lighting_pole',
                   vm_front: 'vill_musketeer_front_standing', vm_back: 'vill_musketeer_back_standing',
                   musk_front: 'musketeer_front_standing' };
