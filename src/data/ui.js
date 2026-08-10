// The dashboard and the radial menu, in artwork.
//
// THIS IS THE ONE FOLDER NOT SIZED BY THE SHARED `SCALE`, and deliberately.
// Every other asset obeys one scale factor because the artist sized a soldier
// against a tower on the same canvas and the game must not break that. A button
// has no such truth to respect: it is 60px across because that is what a thumb
// needs, and a coin icon is 24px tall because the number beside it is 20px.
// See assets/ui/README.md.
//
// So each entry says what BOX it is allowed to fill, and the aspect comes out of
// its own trim. A redrawn icon of a different shape lands correctly instead of
// being squashed to fit, which is the same rule the HUD icons already had.
//
// Trims are absolute source pixels from `node tools/trim.mjs`, exactly like the
// sprite trims in data/towers.js — the one thing that must be re-pasted after a
// re-export at a different size.

// A HUD icon's height. 24 against the 20px HUD font puts its cap height on the
// digits' cap height, which is what makes an icon read as part of the number
// rather than as a picture beside it.
export const HUD_ICON_H = 24;

// The square a menu glyph fits inside. 26 when the button also shows a price,
// bigger when it does not — the labels came out of these buttons, so the picture
// gets the room the words used to take.
export const GLYPH_BOX = 26;

// 30 rather than 32, and the two extra pixels are worth the sentence. The
// smallest glyph art is 92 source px on its longest side, and 3x device pixels
// of a 32px box wants 96 — so 32 is a 1.04x upscale on two of the nine files.
// Nobody would see 4%, but tools/trim.mjs correctly flags it, and a permanent
// SOFT you have decided to ignore is how you stop reading the tool at all. 30
// needs 90 and every file is sharp.
export const GLYPH_BOX_BARE = 30;

export const ui = {
  // Dashboard. `h` rather than `fit`: these are sized by HEIGHT, because they
  // sit on a text baseline. The gold icon is 2.11 wide to 1 tall, and fitting
  // that in a square would draw it 24 wide and 11 tall — a third of the size.
  hud_gold:     { trim: [117, 190, 278, 132], h: HUD_ICON_H },
  hud_life:     { trim: [160, 178, 192, 156], h: HUD_ICON_H },

  // Radial menu. The plate is BTN_R * 2 and the cancel target CANCEL_R * 2, both
  // from src/menu.js — input.js hit-tests those same constants, so the drawn
  // size and the tappable size cannot drift apart.
  btn_plate:    { trim: [163, 163, 186, 186], fit: 60 },
  btn_cancel:   { trim: [199, 199, 114, 114], fit: 36 },

  // Glyphs. `fit` is filled in at draw time, because the same glyph is drawn at
  // two sizes depending on whether its button carries a price.
  glyph_bow:    { trim: [208, 200, 96, 112] },
  glyph_swords: { trim: [210, 212, 92, 88] },
  glyph_up:     { trim: [228, 210, 56, 92] },
  glyph_coin:   { trim: [233, 207, 55, 97] },
  glyph_flag:   { trim: [218, 207, 76, 98] }
};

// Which drawn glyph replaces which vector one. A glyph with no entry — siege's
// catapult, the monastery's cross, and the `max` chevrons on a tower that has
// nothing left to buy — keeps the vector in render.js, so a family with no art
// still gets a button rather than a blank disc.
export const GLYPH_ART = {
  bow: 'glyph_bow',
  swords: 'glyph_swords',
  up: 'glyph_up',
  coin: 'glyph_coin',
  flag: 'glyph_flag'
};

// Drawn size in game px, aspect preserved. `h` drives from the height, `fit`
// from whichever side is longer, and `override` lets a caller ask for a
// different box than the table's default without a second entry.
export function uiSize(key, override) {
  const e = ui[key];
  const [, , w, h] = e.trim;
  const box = override ?? e.fit;
  if (box) {
    const k = box / Math.max(w, h);
    return { w: w * k, h: h * k };
  }
  return { w: (w / h) * e.h, h: e.h };
}
