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
  state.villagers = (level.villagers || []).map(v => ({ def: VILLAGER, x: v.x, y: v.y }));
}
