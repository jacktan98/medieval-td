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
//
// Which of the two a glyph gets is a fixed fact of the menu rather than a
// decision made at draw time: an upgrade button always shows a cost, a rally
// button never does. So each entry below carries its own `fit`, and these two
// constants are what those fits are chosen from. The vector fallbacks — siege,
// the monastery, `max` — have no entry, so drawButton picks between them there.
export const GLYPH_BOX = 26;

// 30 rather than 32, and the two extra pixels are worth the sentence. Glyph art
// runs 88 to 112 source px on its longest side, and 3x device pixels of a 32px
// box wants 96 — so 32 upscales the smaller files by 1.04x. Nobody would see 4%,
// but tools/trim.mjs correctly flags it, and a permanent SOFT you have decided
// to ignore is how you stop reading the tool at all.
export const GLYPH_BOX_BARE = 30;

// The rally flag is the one UI file also drawn ON THE BOARD, as the marker
// showing where a squad stands and as the ghost that follows a rally drag. It
// used to be a vector flag drawn in code; it is the same picture as the menu
// button now, so the button and the thing the button does look like each other.
//
// 20 tall, against the vector's 17 — a drawn flag needs a little more room than
// two strokes and a triangle before the pennant reads.
export const RALLY_FLAG_H = 20;

// Where the flag's POLE FOOT sits inside its trim. A flag on the board is
// planted, not centred: the pole's bottom is the point it marks. Measured off
// the bottom row of the art, where the pole spans x 2..14 of 72.
export const FLAG_FOOT = [0.111, 1];

// The two stat icons in the info box, which replaced the words "Health:" and
// "Damage:". 16 tall against the 11px rows beside them — bigger than the text,
// because a picture standing in for a word has to be read at a glance and has no
// cap height to sit on.
//
// Health has a heart of its own now — `Health Icon.png`, not the dashboard's
// `Life Icon.png`. It borrowed the lives icon for one build, on the reasoning
// that a heart is a heart; the artist drew a second one, so the two are two
// files and two keys. They are different questions anyway: lives are the keep's
// and this is a figure's.
export const STAT_ICON_H = 16;

// The column the two icons sit in, so the numbers beside them line up. The
// widest of the pair is the heart at 19.8 drawn, so 22 clears it.
export const STAT_COL = 22;

// The encyclopedia's icon height. ONE size, because there is one card: a row is
// 17px deep and holds a 14px icon beside a 12px number, on a tower card and an
// enemy card alike. There used to be a second, bigger size for an enemies page
// that had full-width rows of its own; the page uses the same box as everything
// else now, so the second size went with it.
//
// It lives here rather than in render.js because this is where an icon's drawn
// size is decided, and because tools/book.mjs checks it against the source
// files: an icon is sharp while its drawn height times the 3x device-pixel cap
// fits in its trim, so 14 needs 42 source px and every file in the book has at
// least 97. Raise this and run the tool.
export const BOOK_ICON_H = 14;

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

  // Glyphs. Four sit on buttons that show a price and get the smaller box; the
  // rally flag is the only one on a button with nothing to say.
  glyph_bow:    { trim: [208, 200, 96, 112], fit: GLYPH_BOX },
  glyph_swords: { trim: [210, 212, 92, 88],  fit: GLYPH_BOX },
  glyph_up:     { trim: [223, 212, 66, 88],  fit: GLYPH_BOX },
  glyph_refund: { trim: [233, 207, 55, 97],  fit: GLYPH_BOX },
  // Nudged right inside its button. The pole is a thin dark bar at x 2..14 of 72
  // and the pennant is a pale triangle filling the rest, so the ink the eye
  // weights is not where the bounding box says the middle is — centring the box
  // reads as the flag sitting slightly left. 3px puts it back.
  //
  // This is the only glyph that needs it, because it is the only asymmetric one.
  glyph_flag:   { trim: [220, 207, 72, 98],  fit: GLYPH_BOX_BARE, nudge: [3, 0] },

  // The heart and the sword that replaced the words "Health:" and "Damage:".
  stat_health:  { trim: [157, 176, 198, 160], h: STAT_ICON_H },
  stat_damage:  { trim: [182, 182, 148, 148], h: STAT_ICON_H },

  // The encyclopedia's two costs: gold to build a tier, and lives when an enemy
  // gets past. They are drawn as a stack of coins and a BROKEN heart, which is
  // what lets them sit beside the dashboard's own gold and lives without being
  // read as the same fact — see the note in src/assets.js.
  //
  // The refund figure beside the gold one has no entry here: it is the menu's
  // `glyph_refund`, the same file drawn at two sizes — 26 on a button,
  // STAT_ICON_H in a book row — which is exactly the case uiSize's { h }
  // override exists for. A second entry would be a second rect to re-paste after
  // a re-export.
  stat_gold_cost: { trim: [116, 189, 280, 134], h: STAT_ICON_H },
  stat_life_cost: { trim: [157, 176, 198, 160], h: STAT_ICON_H },

  // The three plates. These are drawn to a RECT rather than fitted to a box, so
  // the entry carries no size: the rect comes from HUD_BTN and INFO_BOX in
  // render.js, whose widths are derived from these trims' aspects at a fixed
  // height. That is the way round that matters — the height ties the controls to
  // the icon band beside them and the panel to its three rows of text, and the
  // width is then whatever the drawing's proportions ask for. Nothing is
  // stretched, and a redrawn plate of a different shape resizes its slot instead
  // of being squashed into the old one.
  plate_speed:  { trim: [169, 217, 174, 78] },
  plate_wave:   { trim: [49, 217, 414, 78] },
  plate_info:   { trim: [173, 395, 678, 234] }
};

// The aspect of a plate, for deriving its drawn width from a fixed height.
export const aspect = key => ui[key].trim[2] / ui[key].trim[3];

// How big a FIGURE is drawn in the info box, as a multiple of the board's SCALE.
//
// A multiple, not a box, and that is the whole point. Fitting every portrait
// into one square would draw a Giant Thug and a Thug the same size, which is a
// lie about the only thing that distinguishes them. One factor keeps them all in
// proportion to each other, exactly as the board does.
//
// 1.6 is chosen against the sharpness ceiling rather than by eye. A sprite is
// crisp while its drawn size times the 3x device-pixel cap fits in its source
// pixels, so the largest honest multiple is 1 / (3 * SCALE) = 512 / 315 = 1.625,
// and it is the same number for every figure because both sides scale together.
// The box the portraits sit in is then sized to the biggest of them rather than
// the other way round — which is why the info box got smaller: it was drawing a
// 114px sprite at 68, needing 204 source px it did not have, and every portrait
// in it was upscaled about 1.2x. That is what "blurry" was.
export const PORTRAIT_SCALE = 1.6;

// Which drawn glyph replaces which vector one. A glyph with no entry — siege's
// catapult, the monastery's cross, and the `max` chevrons on a tower that has
// nothing left to buy — keeps the vector in render.js, so a family with no art
// still gets a button rather than a blank disc.
export const GLYPH_ART = {
  bow: 'glyph_bow',
  swords: 'glyph_swords',
  up: 'glyph_up',
  refund: 'glyph_refund',
  flag: 'glyph_flag'
};

// Drawn size in game px, aspect always preserved. Three ways to ask:
//
//   uiSize(key)            the entry's own `fit` box, or its own `h`
//   uiSize(key, 26)        fit inside a 26px box, whichever side is longer
//   uiSize(key, { h: 16 }) exactly 16 tall
//
// The third exists because the same file is drawn at two sizes in two places —
// the heart is 24 tall in the dashboard and 16 in the info box — and duplicating
// its trim to say so would mean two places to re-paste after a re-export.
export function uiSize(key, override) {
  const e = ui[key];
  const [, , w, h] = e.trim;

  if (override && typeof override === 'object') {
    return { w: (w / h) * override.h, h: override.h };
  }

  const box = override ?? e.fit;
  if (box) {
    const k = box / Math.max(w, h);
    return { w: w * k, h: h * k };
  }
  return { w: (w / h) * e.h, h: e.h };
}
