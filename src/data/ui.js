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

// --- HOW MANY REAL PIXELS A LOGICAL ONE IS WORTH ---------------------------------
//
// The game is drawn in a fixed 960x540 space and the canvas behind it is sized in
// real pixels. These two numbers are the bracket that sizing is held inside, and
// the FLOOR is the one with a story.
//
// THE CEILING, first, because it has always been here: 3 caps the fill rate on a
// dense display. Everything drawn is checked against it — see the sharpness
// section in tools/book.mjs — and 2880x1620 is as much canvas as this game will
// ever ask a machine to paint.
export const MAX_SCALE = 3;

// AND THE FLOOR, which was 1, and 1 was too low.
//
// The rule was "one canvas pixel per real screen pixel" — no waste, and no
// supersampling either. On a 1280-wide window at dpr 1 that is a scale of 1.333,
// so a 12-unit stat icon was rasterised into SIXTEEN PIXELS. Sixteen pixels is not
// enough for a shield with an outline, a rim and three studs: the armour icons
// came out as grey blobs, and the heart and the sword were soft next to them.
//
// The text beside them stayed crisp the whole time, which is what made it look
// like a drawing problem rather than a resolution one — a font rasteriser hints
// and subpixel-positions every glyph at 12px, and `drawImage` does neither.
//
// IT IS NOT A FILTERING PROBLEM, and that was the first thing ruled out. Measured
// against a true box filter, Chrome's own downscale of these icons is already
// within an RMS of 4-9 of ideal at every size the game draws them, and both an
// explicit `imageSmoothingQuality: 'high'` and a hand-built mip chain scored the
// same or worse. There was nothing left to win in HOW the pixels were chosen. The
// problem was how few of them there were.
//
// So the canvas is never rasterised below 1920x1080, whatever the window is doing,
// and the browser downsamples to the display — which is supersampling, and is why
// the icons come back.
//
// WHAT IT COSTS, measured interleaved on a busy board — every plot built, a squad
// out of each barracks, thirty enemies walking — at 1280x720 CSS on a software
// renderer, which is the pessimistic end of what anybody will play on:
//
//   floor 1   1280x720    median 16.7 / 16.7 / 16.7ms      (pinned to vsync)
//   floor 2   1920x1080   median 19.2 / 17.4 / 17.8ms
//   floor 3   2880x1620   median 39.8ms
//
// One frame in sixty at the floor, and a quarter of the frame rate at 3. That is
// the whole argument for where the two ends sit: the ceiling is the expensive one,
// and this is not.
export const MIN_SCALE = 2;

// The two answers a canvas needs, which are NOT the same number any more:
//
//   shown    real screen pixels per logical unit. What the glass actually has.
//   backing  what the canvas is rasterised at. At least MIN_SCALE.
//
// They were one number until the floor went up, and the pop-up is why they had to
// come apart: it promises to show artwork at its own resolution and caps itself at
// `1 / device` to keep that promise (see popSlot in book.js). Handed the BACKING
// scale it would read a supersampled canvas as a denser screen and shrink the
// picture — the promise kept against the wrong surface. It gets `shown`.
export function canvasScale(cssWidth, dpr) {
  const shown = Math.min(MAX_SCALE, Math.max(1, (cssWidth / 960) * dpr));
  return { shown, backing: Math.min(MAX_SCALE, Math.max(MIN_SCALE, shown)) };
}

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

// The size the two stat icons are MEASURED at, which is no longer the size the
// info box draws them: the panel shrank and `INFO_ICON` in render.js is 14 now.
// This is what the `h` on each entry below means — the default drawn height for
// a caller that does not override it — and `uiSize(key, { h })` is how the two
// places that do ask for their own.
//
// It stays 16 because the trims below are keyed to it and a redraw at a
// different shape should land against something stable. A picture standing in
// for a word has to be read at a glance and has no cap height to sit on, which
// is why it is bigger than the text beside it in both places.
//
// Health has a heart of its own now — `Health Icon.png`, not the dashboard's
// `Life Icon.png`. It borrowed the lives icon for one build, on the reasoning
// that a heart is a heart; the artist drew a second one, so the two are two
// files and two keys. They are different questions anyway: lives are the keep's
// and this is a figure's.
export const STAT_ICON_H = 16;

// The column the three icons sit in, so the numbers beside them line up whether
// the rows above are there or not — a tower has no health, a swordsman has no
// reach, and a damage figure that shifted about between them would read as three
// layouts rather than one.
//
// EXACTLY THE WIDEST ICON, and not a pixel more. That is the whole change from
// the 19 it was: a column wider than its contents is air the narrow icons pay
// for, and the sword — 12 across against the heart's 14.9 — ended 3.5px short of
// the column edge and then took the gap on top of that. It is why the panel's
// numbers drifted away from their icons while the encyclopedia's, which measures
// from the icon itself, sat tight against them. 15 holds the heart at the
// panel's 12px icons with nothing spare, so the gap after the column is the gap
// you see.
//
// It was 22 against 16px icons and 19 against 14. Re-measure it if INFO_ICON
// moves again: it is a measurement, not a taste.
export const STAT_COL = 15;

// The encyclopedia's icon height. ONE size, because there is one card: a row is
// 17px deep and holds a 12px icon beside a 10px number, on a tower card and an
// enemy card alike. There used to be a second, bigger size for an enemies page
// that had full-width rows of its own; the page uses the same box as everything
// else now, so the second size went with it.
//
// It lives here rather than in render.js because this is where an icon's drawn
// size is decided, and because tools/book.mjs checks it against the source
// files: an icon is sharp while its drawn height times the 3x device-pixel cap
// fits in its trim, so 12 needs 36 source px and every file in the book has at
// least 97. Raise this and run the tool.
//
// 12 RATHER THAN 14 since a ranged card carries three figures on the same row.
// Health, attack and reach at the old size came to 146px of a 141px card and the
// last number ran off the edge; the row is a set of icons read at a glance, not
// body text, and a couple of px off each of them buys the space back without
// anything on the page reading as smaller.
// 14, AND IT WAS 12. Twelve was chosen against a 17px row; the row is 20 now — see
// ROW in book.js — and the owner's reason for growing the cards at all was "so that
// the icons have more space to have their full resolution".
//
// 14 AND NOT 15, and the binding row is the archer thug's: health, attack and reach
// is three icons and three numbers in a text column 141px wide, and tools/book.mjs
// costs it pessimistically at 8.2px per unit of icon height plus 22. 14 comes to
// 137 and 15 to 145, so this is the last size that fits. The other pages have room
// to spare; that one card is the ceiling.
export const BOOK_ICON_H = 14;

// The status marks' drawn height. Imported rather than repeated: what a status
// looks like and how big it is drawn belong together, and data/status.js is where
// a status is described. See the note there for what sets the ceiling — it has
// moved twice already, both times because a file was redrawn.
import { STATUS_H } from './status.js';

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

  // Glyphs. Six sit on buttons that show a price and get the smaller box; the
  // rally flag is the only one on a button with nothing to say. The musket has a
  // box of its own — see its note.
  glyph_bow:    { trim: [208, 200, 96, 112], fit: GLYPH_BOX },
  glyph_swords: { trim: [210, 212, 92, 88],  fit: GLYPH_BOX },
  glyph_catapult: { trim: [204, 211, 104, 90], fit: GLYPH_BOX },
  // The monastery's, and the only glyph in the set that is taller than it is
  // wide — 76 x 104 source, so at the 26px box it lands 19 x 26 rather than
  // filling it. That is the drawing (a standing cross), not a squash.
  glyph_cross:  { trim: [218, 204, 76, 104], fit: GLYPH_BOX },
  glyph_up:     { trim: [223, 212, 66, 88],  fit: GLYPH_BOX },
  // The Musketeer Post's icon, which replaces the arrow on the one upgrade button
  // that buys a named tower rather than a rung.
  //
  // THE ONE GLYPH WITH A BOX OF ITS OWN, because it is the one glyph that is
  // nearly flat: 126x42 source, so a box fits it by its WIDTH and the height it
  // lands at is whatever the drawing's aspect gives. At the shared 26 that was
  // 26x9 — a third of the ink every other button carries, floating in the top
  // half of a 60px disc. 34 lands it 34x11, which is still inside the sharpness
  // ceiling: 34 drawn x 3 device pixels is 102 of the 126 it has.
  //
  // And 3px down with it. A 9px-tall picture centred in the glyph zone is
  // correct arithmetic and looks wrong — the eye centres a small mark against
  // the whole plate, not against the band the taller glyphs fill — so it sits
  // between the two, level with the refund coin beside it in the ring.
  glyph_musket: { trim: [193, 235, 126, 42], fit: 34, nudge: [0, 3] },
  // The Paladin Keep's, the second tier icon and an ordinary one: 82x84 source is
  // as near square as anything in the set, so it takes the shared box and needs
  // neither a size of its own nor a nudge. The musket above is the exception here,
  // not the pattern a tier 4 icon follows.
  glyph_keep:   { trim: [215, 214, 82, 84], fit: GLYPH_BOX },
  // The Assassin Guild's, beside the Keep's. Both barracks fourth rungs name
  // their own now that the ladder forks.
  glyph_assassin: { trim: [212, 206, 88, 100], fit: GLYPH_BOX },
  // The Ballista Turret's, the third tier icon and an ordinary one like the
  // Keep's: 108x110 source is square enough for the shared box.
  glyph_ballista: { trim: [202, 201, 108, 110], fit: GLYPH_BOX },
  // The Cannon Outpost's, and it is the SECOND glyph that needs the musket's
  // treatment rather than the shared box. 112x40 source is 2.8:1 — a barrel lying
  // across the disc, near enough the musket's 3:1 — so at GLYPH_BOX it would land
  // 26x9 and float in the top half of a 60px plate with a third of the ink every
  // other button carries. `fit` 34 lands it 34x12 and the same 3px nudge puts it
  // where the eye centres a small mark, which is against the whole plate rather
  // than against the band the tall glyphs fill.
  //
  // Still inside the sharpness ceiling: 34 drawn x 3 device px is 102 of the 112
  // it has, the same margin the musket runs at.
  glyph_cannon:   { trim: [200, 236, 112, 40], fit: 34, nudge: [0, 3] },
  // The High Altar's, the fourth tier icon and the one TALL one: 76x104
  // source, half again as high as it is wide, because the drawing is the whole
  // tower with its roof and cross. `fit` is the shared box like the other two,
  // which fits the taller side — the same rule every glyph here is drawn by, so a
  // tall icon comes out narrower rather than cropped.
  glyph_altar: { trim: [218, 204, 76, 104], fit: GLYPH_BOX },
  // The Judgement Temple's, and the fork's other face: two hands raised in prayer,
  // 66 x 89 source. Taller than wide like the altar's cross beside it, so both fit
  // the box by their height and the pair reads as one choice rather than two
  // differently sized buttons.
  glyph_temple: { trim: [223, 212, 66, 89], fit: GLYPH_BOX },
  // THE MAXED BADGE, and the one glyph that is never pressable: it sits on the
  // upgrade button of a tower at the top of its ladder, dimmed like any button
  // that cannot be used. 66x90 source, an upright mark like the cross above it,
  // so it takes the shared box and lands 19x26 rather than filling it.
  glyph_max:    { trim: [223, 211, 66, 90], fit: GLYPH_BOX },
  // The Crossbow Sentry's upgrade button. Wider than it is tall, like the
  // musket's, because the drawing is a crossbow lying across the disc.
  glyph_sentry: { trim: [198, 201, 116, 110], fit: GLYPH_BOX },
  // THE FOUR ABILITY BUTTONS, and they are the only entries here that are a whole
  // BUTTON rather than a mark to put on one.
  //
  // The artist drew each of these on a blue disc, and the disc measures
  // [163, 163, 186, 186] in all four files — which is `btn_plate`'s own trim, to
  // the pixel. They are drawn INSTEAD of the plate, at the same `fit: 60`, so an
  // ability button is the same size and in the same place as every other button in
  // the ring.
  //
  // `plate: true` is what says so, and what it buys is the check in tools/trim.mjs
  // that each of the four is a centred square the size of the plate. That is the
  // property render.js depends on: it clips them to a circle of the button's own
  // radius, and the disc fills its box exactly, so the clip lands on the drawn
  // outline rather than inside it.
  //
  // THREE OF THEM ARRIVED ON AN OPAQUE WHITE SQUARE and were re-exported clear.
  // While that was true the trim above could not be the alpha bounds — every pixel
  // of the canvas passed — so it was found by colour instead, and the clip was
  // load-bearing rather than belt-and-braces: without it the buttons put four white
  // corners on the grass. All four are transparent now, both measurements agree to
  // the pixel, and the clip stays as the guard that made the white version merely
  // wrong rather than visibly broken.
  ability_burst:   { trim: [163, 163, 186, 186], fit: 60, plate: true, pale: true },
  ability_deadeye: { trim: [163, 163, 186, 186], fit: 60, plate: true },
  // `pale` MEANS DARK INK ON THIS BUTTON'S PRICE — see buttonPrice in render.js —
  // and it is on EXACTLY THE LIGHTER OF EACH TOWER'S PAIR, at the owner's ask:
  // "for each tower, the lighter background uses dark colour for price and vice
  // versa for the other ability with darker background colour."
  //
  // WHICH IS ONE RULE DOING TWO JOBS. Every price gets the ink that reads on the
  // plate under it, AND a tower's two buttons are a contrast pair rather than two
  // of the same — the light one dark-lettered, the dark one white-lettered. It
  // replaces two earlier passes that each fixed one button at a time and left the
  // set looking arbitrary.
  //
  // IT ALSO FALLS OUT OF THE ORDERING. `abilities` on a tier lists the lighter
  // disc first (see data/towers.js), so this is "the first is `pale`, the second
  // is not" — and tools/abilities.mjs checks it against the MEASURED plate colour
  // rather than against the order, so a re-export that flips a pair's lightness
  // fails here rather than shipping a price nobody can read.
  //
  // WHAT IT COSTS, measured, as a WCAG contrast ratio of the ink against the plate.
  // The rule picks the better ink on 14 of the 16:
  //
  //   Reinforced Tension  rgb(165,211,253)  dark   8.2   (white would be 1.6)
  //   Reinforced Tension  rgb(164,210,250)  dark   8.1   (white would be 1.6)
  //   Holy Light          rgb(233,233,233)  dark  10.6   (white would be 1.2)
  //   Divine Fortitude    rgb(233,233,233)  dark  10.6   (white would be 1.2)
  //   Inner Strength      rgb(255,170,54)   dark   6.8   (white would be 1.9)
  //   Knife Throw         rgb(190,159,109)  dark   5.1   (white would be 2.5)
  //   Burst Fire          rgb(176,130,210)  dark   4.3   (white would be 3.0)
  //   Fiery Shot          rgb(176,130,210)  dark   4.3   (white would be 3.0)
  //   Deadeye             rgb(98,0,171)     white 10.0   (dark would be 1.3)
  //   Swift Reload (gun)  rgb(97,0,170)     white 10.0   (dark would be 1.3)
  //   Heavy Bolt          rgb(5,93,171)     white  6.7   (dark would be 1.9)
  //   Swift Reload (bow)  rgb(5,93,170)     white  6.7   (dark would be 1.9)
  //   Sneak Attack        rgb(116,89,46)    white  6.5   (dark would be 2.0)
  //   Slowed Pulse        rgb(216,102,1)    white  3.6   (dark would be 3.6, a tie)
  //
  // AND THE TWO IT DOES NOT, which are the mid-greys — both the DARKER half of a
  // pair whose other half is a near-white disc:
  //
  //   Blinding Strike     rgb(150,150,150)  white  3.0   (dark would be 4.4)
  //   Holy Wrath          rgb(150,150,150)  white  3.0   (dark would be 4.4)
  //
  // 3.0 is the floor for text this size and they sit on it. They are white because
  // the rule is about the PAIR: a keep whose two buttons both printed dark would
  // not read as a light one and a dark one, which is the thing being organised.
  //
  ability_light:   { trim: [163, 163, 186, 186], fit: 60, plate: true, pale: true },
  ability_blinding: { trim: [163, 163, 186, 186], fit: 60, plate: true },
  // The Ballista Turret's two, measured to the same disc as the four above.
  ability_ballista_tension: { trim: [163, 163, 186, 186], fit: 60, plate: true, pale: true },
  // The Crossbow Sentry's two, on the same terms: whole buttons on the artist's
  // own disc, measured to btn_plate's trim like every other ability face.
  ability_sentry_tension: { trim: [163, 163, 186, 186], fit: 60, plate: true, pale: true },
  ability_swift:          { trim: [163, 163, 186, 186], fit: 60, plate: true },
  ability_heavy:   { trim: [163, 163, 186, 186], fit: 60, plate: true },
  // The Assassin Guild's two, measured to the same disc as every other face —
  // 163,163,186,186 again, which is now nine files in a row the artist has drawn
  // to the same circle without being asked twice.
  ability_knife: { trim: [163, 163, 186, 186], fit: 60, plate: true, pale: true },
  ability_sneak: { trim: [163, 163, 186, 186], fit: 60, plate: true },
  // The Cannon Outpost's two, on the same disc as every other ability face.
  ability_cannon_swift: { trim: [163, 163, 186, 186], fit: 60, plate: true },
  ability_fiery:        { trim: [163, 163, 186, 186], fit: 60, plate: true, pale: true },
  // The Judgement Temple's two, on the monastery's own ORANGE disc. Eleven files
  // in a row now measure to 163,163,186,186 — the artist draws every ability face
  // into the same circle, and that is worth saying out loud because it is the
  // reason a new icon needs no thought: it lands on the plate where the last ten
  // did. NOT `pale`: white price ink reads on this orange the way it reads on the
  // blue, and it is only the altar's white disc that swallowed it.
  ability_pulse:    { trim: [163, 163, 186, 186], fit: 60, plate: true },
  ability_strength: { trim: [163, 163, 186, 186], fit: 60, plate: true, pale: true },

  // THE STATUS MARKS, and they are the first entries in this table that are drawn
  // on the BOARD rather than on the interface. They are here anyway, and that is
  // the right place: what this table holds is art whose size is LOOKED UP instead
  // of derived from the board scale, and a status mark is exactly that — it is
  // 10px tall because that is what reads over a health bar, not because a flame is
  // 10px tall next to a man.
  //
  // `h` rather than `fit`, so each keeps its own aspect at a common height: the
  // flame is 28x38 and the droplets 26x30, and fitting both in a square would draw
  // the flame narrower than the drop it is meant to sit beside.
  // Both redrawn with a black outline, which is what let the cream chip behind
  // them go — see statusMarks in render.js. Redrawn twice: 28x38 and 26x30 for the
  // first pair, 24x34 and 22x27 for the outlined ones, and these.
  status_burnt:    { trim: [241, 235, 30, 42], h: STATUS_H },
  status_poisoned: { trim: [242, 238, 28, 34], h: STATUS_H },
  // AND SLOWED, which takes `fit` where the other two take `h` — the one entry in
  // this table where the difference matters rather than being a preference.
  //
  // It is 34 x 24: the first status mark WIDER than it is tall, because it is two
  // chevrons side by side where the others are a standing flame and a column of
  // droplets. Drawn to a common HEIGHT it would come out 15.6 x 11, half again the
  // width of either of its neighbours and — this is the part that decides it —
  // 47 device px of drawing rasterised out of 34 source px on a 3x phone, which is
  // the SOFT verdict tools/trim.mjs exists to catch.
  //
  // Fitted into the STATUS_H box instead it is 11 x 7.8: sharp, and the same
  // width as the flame is tall, so the row reads as a row. The other two are
  // taller than they are wide, so `fit` and `h` would give them the same answer
  // and they keep the field that says what was meant.
  status_slowed:   { trim: [239, 244, 34, 24], fit: STATUS_H },
  // AND THE DARK HEALING, which takes `h` like the first two: 32 x 42, taller than
  // it is wide, so a height and a fit give the same answer and it keeps the field
  // that says what was meant. 42 source px is the same as the flame's, which is
  // what STATUS_H's ceiling was set by — so this mark arrives with room to spare
  // and does not move the number.
  status_healing:  { trim: [240, 235, 32, 42], h: STATUS_H },
  // The High Altar's two, measured to the same disc again — but drawn on a
  // WHITE disc where the other six are blue, which is what `pale` records. The
  // price under an ability button is white, because white is what reads on a dark
  // blue disc; on these two it disappeared entirely. See buttonPrice in render.js,
  // which reads this and prints the ordinary dark ink instead — the same colour
  // every tier upgrade prints its price in. A property of the ARTWORK rather than
  // of the ability, so a re-export on a dark disc is one word to delete.
  ability_wrath:     { trim: [163, 163, 186, 186], fit: 60, plate: true },
  ability_fortitude: { trim: [163, 163, 186, 186], fit: 60, plate: true, pale: true },
  // AND THE TWO BADGES, which are not buttons: they are drawn on the BOARD over
  // every tower an aura is working on. `h` rather than `fit`, because what has to
  // match between them is their HEIGHT — a sword-and-arrow and a heart-and-arrow
  // floating over neighbouring towers at different sizes would read as two
  // different kinds of thing. 20 is the rally flag's height, which is the only
  // other piece of UI art drawn out on the board, and it is about as small as a
  // two-part mark can be and still be read at a glance.
  badge_wrath:     { trim: [198, 214, 116, 84], h: 20 },
  badge_fortitude: { trim: [202, 222, 108, 68], h: 20 },

  glyph_refund: { trim: [233, 207, 55, 97],  fit: GLYPH_BOX },
  // Nudged right inside its button. The pole is a thin dark bar at x 2..14 of 72
  // and the pennant is a pale triangle filling the rest, so the ink the eye
  // weights is not where the bounding box says the middle is — centring the box
  // reads as the flag sitting slightly left. 3px puts it back.
  //
  // This is the only glyph that needs it, because it is the only asymmetric one.
  glyph_flag:   { trim: [220, 207, 72, 98],  fit: GLYPH_BOX_BARE, nudge: [3, 0] },

  // The archer's three standing orders, on the same bare box as the flag: they
  // sit on a button with nothing to buy, so they get the bigger glyph. Wider
  // than they are tall, unlike every other glyph, so 30 lands them at 30x16 —
  // that is the shape they were drawn, not a squash.
  //
  // `aim_tough` was missing here for one upload: its first PNG came in 100%
  // opaque, a white card that would have been drawn on the cream plate, so it
  // kept its vector while the other two were art. The re-export is transparent
  // (1.1% of the canvas is ink) and it joins them. tools/trim.mjs fails on an
  // opaque UI icon now, so the gap cannot open again unnoticed.
  //
  // It is the tallest of the three — 113x70 against 107x57 and 107x52 — so at
  // the same box it lands 30x19 rather than 30x16. That is the drawing, not a
  // mistake: the box fits the longer side, and all three still sit inside the
  // button with room.
  // THE TICK A PURCHASE IS CONFIRMED WITH, and it takes the BARE box rather than
  // the priced one: an armed button prints no caption, so the glyph has the whole
  // disc and should fill it the way the three aim glyphs do. See drawButton.
  glyph_confirm:    { trim: [207, 211, 98, 91], fit: GLYPH_BOX_BARE },
  glyph_aim_exit:   { trim: [202, 227, 107, 57], fit: GLYPH_BOX_BARE },
  glyph_aim_tough:  { trim: [202, 220, 113, 70], fit: GLYPH_BOX_BARE },
  glyph_aim_ranged: { trim: [205, 230, 107, 52], fit: GLYPH_BOX_BARE },

  // The heart and the sword that replaced the words "Health:" and "Damage:".
  //
  // The heart and the BROKEN heart below it carry the same rect to the pixel,
  // which is deliberate — see the note on stat_life_cost. They are still two
  // files and tools/trim.mjs measures them apart; matching is a fact about the
  // art, not an assumption the code makes.
  stat_health:  { trim: [167, 183, 178, 146], h: STAT_ICON_H },
  // THE THIRD STAT ICON, and the first added since the heart and the sword. A
  // target, square at 168x168 source, so it takes the shared height and comes out
  // square where the heart is wider than it is tall — see STAT_COL, which is
  // sized off the widest of the three rather than off any one of them.
  stat_range:   { trim: [172, 172, 168, 168], h: STAT_ICON_H },
  stat_damage:  { trim: [182, 182, 148, 148], h: STAT_ICON_H },
  // The wand and the two shields, all measured off the files like the three above.
  // The shields are the SAME box to the pixel — [180, 177, 152, 158] — which is
  // what says they are one drawing in two colours rather than two shields.
  stat_damage_magic: { trim: [179, 179, 154, 154], h: STAT_ICON_H },
  stat_armour:       { trim: [180, 177, 152, 158], h: STAT_ICON_H },
  stat_armour_magic: { trim: [180, 177, 152, 158], h: STAT_ICON_H },
  // AND THE SAME TWO SHIELDS WITH SOMETHING THROUGH THEM, for `pierce`. Both are
  // 158 tall and start at y=177, exactly like the whole shields above — so a row
  // that shows a rank and a break beside it has all four drawings sitting on one
  // baseline, which is the thing that would have been fiddly to fix afterwards and
  // the artist got right in the file.
  //
  // WIDER THAN THE PLAIN SHIELDS, and within two pixels of each other in width —
  // the shot pokes out a shade less than the bolt. Not squared off: every entry's
  // aspect comes out of its own trim, so at a shared 14 tall they set 13.3 and
  // 13.4 wide, a difference no eye finds in a row. See uiSize.
  stat_pierce:       { trim: [145, 177, 222, 158], h: STAT_ICON_H },
  stat_pierce_magic: { trim: [144, 177, 224, 158], h: STAT_ICON_H },
  // AND THE BLAST, which is the odd shape in the set and the reason `byBox` exists.
  //
  // 188 x 98, so nearly twice as wide as it is tall, where every other stat icon is
  // between 0.97 and 1.34. A starburst drawn flat is what an area of effect looks
  // like from above, and the game's reaches are ellipses for the same reason.
  //
  // FITTED TO THE SHARED HEIGHT IT READ AS THE BIGGEST THING IN THE ROW, and the
  // owner asked why after redrawing it smaller on the canvas — which changed
  // nothing, because a drawing is scaled until it is 14 tall whatever size it was
  // exported at. Only the aspect survives. At 14 tall it came out 26.9 wide against
  // a shield's 13.6: the same height, twice the width, and width is what the eye
  // compares in a row.
  //
  // Measured, it was never carrying much more ink — 197 px2 of it against the set's
  // middle of 173, a tenth over. It was the BOX that was big. So it is fitted by the
  // geometric mean of that box instead: 19.4 x 10.1 at a requested 14, whose measure
  // is 14 exactly, the same as every square icon beside it.
  //
  // It is still the widest of them, and the description panel's fixed STAT_COL still
  // cannot hold it — the panel lets an icon overflow its column rather than widening
  // the column for the fifteen that do not need it, see infoStat in render.js — but
  // 19.4 is a peer of the pierce shield's 18.8 where 26.9 was not.
  stat_splash:       { trim: [162, 207, 188, 98], h: STAT_ICON_H, byBox: true },

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
  //
  // The broken heart IS a second file, and its rect matches the whole heart's to
  // the pixel BECAUSE THE OWNER DREW IT THAT WAY — a whole heart and the same
  // heart broken should be the same size in a row, and the only way to get that
  // is for the two exports to share a box. It came apart once, when the heart was
  // re-exported and the broken one was not, and was put back on purpose.
  //
  // So do not fold them into one entry. Two files stay two rects, each measured
  // off its own art by tools/trim.mjs; if a future export moves one of them the
  // tool says so, where a shared constant would quietly draw one from the other's
  // box.
  stat_gold_cost: { trim: [116, 189, 280, 134], h: STAT_ICON_H },
  stat_life_cost: { trim: [167, 183, 178, 146], h: STAT_ICON_H },

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
  // RE-DRAWN WIDER so the boss fits: 792 source px across against 678, at the same
  // height and the same place in the canvas. The owner's reason is the Captain —
  // 5,000 health is a digit wider than anything else in the game — and because the
  // panel's width is DERIVED from this aspect at a fixed height, that is the whole
  // change: the box gets 37 more game px of room and moves 37 further from the
  // right edge, which tools/hud-clear.mjs re-checks against the gold and lives.
  plate_info:   { trim: [116, 395, 792, 234] }
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

// What the INFO BOX draws a figure at, and what the whole panel is scaled by.
//
// 0.9 of the reference, which is the same tenth the encyclopedia takes off — so
// the two agree, and a man is the same size in the corner of the board as he is
// on the page. That was not planned; it fell out of shrinking the panel by the
// amount the panel needed and finding the book had already asked for it.
//
// The panel's HEIGHT is scaled by this and its width follows from the plate's
// own aspect, exactly as before. Every number in drawInfo that is not a plate
// dimension — the portrait slot, the two fonts, the icon height, the row pitch —
// came down with it and is written out there rather than multiplied here,
// because a font is not a length you scale: 11.5 x 0.9 is 10.35, and the size
// that actually fits is a measurement, not a product.
export const INFO_SCALE = 0.9;
export const INFO_PORTRAIT = PORTRAIT_SCALE * INFO_SCALE;

// Which drawn glyph replaces which vector one. A glyph with no entry keeps the
// vector in render.js, so a button with no art still gets a picture rather than
// a blank disc. Every glyph the game uses has a drawing now; the fallback stays
// for the next one added before its art arrives.
export const GLYPH_ART = {
  bow: 'glyph_bow',
  swords: 'glyph_swords',
  catapult: 'glyph_catapult',
  cross: 'glyph_cross',
  up: 'glyph_up',
  // The Crossbow Sentry's, beside the musket's. Archery's tier 3 shows both at
  // once, which is why neither of them can wear the generic arrow.
  sentry: 'glyph_sentry',
  // The barracks fork's second face, on the same terms as the archery one.
  assassin: 'glyph_assassin',
  // The button a tier 4 tower shows where its upgrade would be. It keeps the
  // dimming it already had — there is nothing to buy and it does not answer a
  // tap — and the drawing says WHY it is dead rather than showing a greyed-out
  // arrow that reads as an upgrade you cannot afford yet.
  max: 'glyph_max',
  musket: 'glyph_musket',
  keep: 'glyph_keep',
  ballista: 'glyph_ballista',
  // The artillery fork's second face, on the same terms as the other two forks'.
  cannon: 'glyph_cannon',
  altar: 'glyph_altar',
  temple: 'glyph_temple',
  refund: 'glyph_refund',
  flag: 'glyph_flag',
  aim_exit: 'glyph_aim_exit',
  aim_tough: 'glyph_aim_tough',
  aim_ranged: 'glyph_aim_ranged'
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
    // BY THE BOX RATHER THAN BY THE HEIGHT, where an entry asks for it — see
    // `byBox` on stat_splash below.
    //
    // For a square drawing the two are the same number, which is why this branch
    // read as "height" for as long as everything asking it was square. For a wide
    // one they are not: a 1.9:1 burst fitted to a shield's HEIGHT comes out twice
    // the shield's WIDTH, and width is what the eye compares in a row of icons.
    // Fitting the geometric mean of the box instead makes "the same size" mean the
    // same size.
    const k = e.byBox ? override.h / Math.sqrt(w * h) : override.h / h;
    return { w: w * k, h: h * k };
  }

  const box = override ?? e.fit;
  if (box) {
    const k = box / Math.max(w, h);
    return { w: w * k, h: h * k };
  }
  return { w: (w / h) * e.h, h: e.h };
}
