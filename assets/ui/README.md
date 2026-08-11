# UI artwork

The dashboard across the top and the radial menu that opens on a plot. Nothing
here is on the board — it is the layer between the player and the board.

**Sixteen files in, three still vector.** Everything below that is not in the table
of what landed is still drawn in code, in `src/render.js`, and those vectors are
also the fallback for every file here — a UI PNG that fails to load leaves a
usable button rather than a blank disc.

| file                     | replaces          | drawn        |
|--------------------------|-------------------|--------------|
| `Gold_Icon.png`          | the gold icon     | 51 x 24      |
| `Life_Icon.png`          | the lives icon    | 30 x 24      |
| `Button_Plate_Icon.png`  | the menu disc     | 60 diameter  |
| `Cancel_Button_Icon.png` | the centre cancel | 36 diameter  |
| `Archery_Icon.png`       | `bow`             | 27 x 32 box  |
| `Barracks_Icon.png`      | `swords`          | 26 box       |
| `Upgrade_Icon.png`       | `up`              | 26 box       |
| `Refund_Icon.png`        | `refund`          | 26 box, and 14 in the book |
| `Rally_Point_Icon.png`   | `flag`            | 30 box, and 20 tall on the board |
| `Speed_Box.png`          | the 1x plate      | 54 x 24      |
| `Next_Wave_Box.png`      | the wave plate    | 127 x 24     |
| `Description_Box.png`    | the info panel    | 220 x 76     |
| `Damage_Icon.png`        | the word "Damage" | 16 tall      |
| `Health_Icon.png`        | the word "Health" | 16 tall      |
| `Cost_Icon.png`          | a tier's price in the book | 14 tall |

`Sell_Icon.png` became **`Refund_Icon.png`** and the code followed all the way
down: the sprite key is `glyph_refund`, the menu act is `refund`, the helper is
`refundValue()` and the rate is `REFUND_RATE`. The key used to be `glyph_coin`,
which named the picture; `glyph_refund` names the job, and the job is the thing
that can now change without the drawing being redrawn.

`Cost_Icon.png` is new and is used **only in the encyclopedia**, beside what a
tier costs, with the refund icon beside what it gives back. The two sit in one
row so the pair reads as a price and a resale value rather than as two unrelated
figures.

Still vector, still wanted: **`catapult`** (siege), **`cross`** (monastery) and
**`max`** — the chevrons on a tower with nothing left to buy. Siege and the
monastery have no tiers yet, so their buttons are drawn dim in any case.

**`Rally Point Icon.png` is the one file here that is also drawn on the board.**
The flag marking where a squad stands, and the ghost that follows a rally drag,
used to be a vector pole and triangle drawn in `render.js` — so tapping a drawn
flag produced a different flag. It is the same picture now, at 20px tall, and the
two uses are told apart by dimming: the squad's current stand is drawn at 60%
because it is a reminder, and the ghost under a live drag at full because it is
what you are doing.

It is the one icon **not** centred on its point. A flag is planted, so `FLAG_FOOT`
in `src/data/ui.js` hangs it off the bottom of its pole, at x 0.111 of the trim —
measured from the bottom row of the art, where the pole spans x 2..14 of 72.
Centring it would float the marker half a flag above the spot and lean it right,
because the pennant is all on one side.

It is also the one glyph with a **`nudge`**, 3px right inside its button. The
pole is a thin dark bar and the pennant a pale triangle filling the rest, so the
ink the eye weights is not where the bounding box says the middle is, and box-
centring reads as the flag sitting slightly left. Only asymmetric art needs this;
nothing else here has it.

Trims and drawn boxes are in `src/data/ui.js`; paths in `src/assets.js`. These
filenames used to have spaces and `assets.js` encoded them as `%20`, because a
raw space is not legal in a URL. They are underscored now and there is no `%20`
left anywhere in the project. The rule that produced the encoding still stands
for the next upload: bend the code to the artist's filenames rather than renaming
their files.

## The one rule that makes this folder different

**UI is sized to its slot. It is NOT sized by the shared `SCALE`.**

Every other folder obeys one scale factor, because the artist sized a soldier
against a tower on the same canvas and the game must not break that. A button has
no such truth to respect: it is 88 x 44 because that is what the layout gives it,
and a coin icon is 24px tall because the number beside it is 20px.

The two HUD icons already work this way — see `HUD_ICON_H` in `src/render.js`,
24px against a 20px font so the icon's cap height lands on the digits'. That rule
now covers the whole folder.

Blood is the other exception (`BLOOD_SCALE`, in `assets/effects`), and it is a
different kind: blood is sized to read, this is sized to fit.

## Export at 512 square, like everything else

512 is exactly enough and nothing here should be smaller. The canvas backing
store goes to **3x device pixels** (`MAX_SCALE` in `src/main.js`), so a thing
drawn N logical px wide is rasterised at up to 3N. The widest item below is the
"Next wave" plate at 168 px drawn — 504 at 3x — which fits 512 with 8 to spare.

Transparent background, no baked-in shadow that assumes a particular backdrop.

## What to draw

### Top dashboard

The header strip itself is painted in `Map_1.svg` (126 map units, 63 game px) and
the code deliberately paints no bar of its own. See the trap below before drawing
a panel.

All four dashboard pieces are drawn now.

| element             | art         | drawn    | 3x needs |
|---------------------|-------------|----------|----------|
| speed plate         | 174 x 78    | 54 x 24  | 162      |
| "Next wave" plate   | 414 x 78    | 127 x 24 | 381      |
| description panel   | 678 x 234   | 220 x 76 | 660      |
| gold icon           | 278 x 132   | 51 x 24  | 152      |
| lives icon          | 192 x 156   | 30 x 24  | 89       |
| damage sword        | 148 x 148   | 16 x 16  | 48       |
| health heart        | 198 x 160   | 20 x 16  | 59       |

**A plate's HEIGHT is chosen and its WIDTH follows from the drawing.** 24 ties
the two controls to the icons beside them and 76 holds the panel's title and two
stat rows next to a 56px portrait; the widths are then whatever the art's own
proportions ask for, computed in `render.js` from the trims. So nothing is ever
squashed, and **a redrawn plate of a different shape resizes its slot instead of
being stretched into the old one**. The spec asked for 168 x 72, 408 x 72 and
672 x 228; the drawings came in a little taller in proportion, and the slots
moved to suit rather than the pictures being flattened.

Redraw them at whatever size you like above the 3x column. Canvas size is free —
a trim is absolute source pixels into whatever image it names, which is how the
towers sit on 1024 while every figure sits on 512. The panel is on 1024 because
it does not fit 512; the two buttons are on 512.

**The pair of controls is centred on the board**, x 383 to 578. The readouts end
around x=324 and the info box starts at 728, so there is room either side, but a
wider pair eats into both — and the centring is computed, so it re-centres itself
if either plate is redrawn wider.

**Every colour on these plates is dark, because the plates are pale.** The
dashboard and the info box used to be dark translucent panels with cream text; on
cream art all of that inverted. The five inks live together in `render.js` —
`INK`, `INK_GREEN`, `INK_AMBER`, `INK_RED` — so a plate redrawn dark is one edit,
not a hunt.

The HUD's drop shadow stops before the buttons now. It is there because the
readouts sit straight on grass with nothing behind them; on dark text on a pale
plate it was a dirty halo rather than legibility.

**Both controls are 24 tall, the same height as the icons beside them**, so the
dashboard sits on one band instead of the controls being twice the depth of the
readouts. They were 88 x 44 and 168 x 44.

That does not weaken the touch target, because the drawn box was never the
target. `hitHudButton` takes the full 63px depth of the strip plus `HUD_PAD` each
side, and 63 logical px is 44 real ones on the smallest canvas this game aims at.
Shrinking the picture did not shrink the tap. The one thing that had to move with
it was `HUD_PAD`, from 12 to 7: the gap between the buttons is 14, so 7 a side
fills it exactly and no tap falls in both padded boxes at once. At 12 they
overlapped and the loop silently gave the overlap to whichever came first.

The early-call bonus moved from a second line under the label to the same line
after it, in green, because 24px of height has room for one row of text.

### Radial menu

Opens on the tapped plot, up to four buttons on a ring 68px from the centre, with
a cancel target in the middle. Geometry is in `src/menu.js` — `BTN_R`, `RING_R`,
`CANCEL_R` — and `input.js` hit-tests those same constants, so the drawn size and
the tappable size are related but not equal.

**There are no words on these buttons.** "Barracks", "Refund", "Upgrade" and the
`T1` in front of every price all came out. What is left is the glyph and the
gold — `70g` to build, `90g` to upgrade, `+42g` to refund — which is the whole
decision: the picture says what it is and the number says what it costs. A
button with nothing to say (rally, and a tower already at tier 3) carries no text
at all and draws its glyph bigger to fill the space the price would have used.

| element              | drawn         | needs at 3x | count |
|----------------------|---------------|-------------|-------|
| button plate, circle | 60 diameter   | 180         | 1     |
| cancel target        | 36 diameter   | 108         | 1     |
| glyphs               | ~22 x 22 each | 66          | 8     |

The eight glyphs, with the code names they replace:

| glyph      | what it means                          |
|------------|----------------------------------------|
| `bow`      | Archery, on an empty plot              |
| `swords`   | Barracks, on an empty plot             |
| `catapult` | Siege — locked, drawn dim with "soon"  |
| `cross`    | Monastery — locked, same               |
| `up`       | upgrade this tower                     |
| `max`      | already at tier 3, nothing to buy      |
| `flag`     | move the barracks rally point          |
| `refund`   | take the tower down for gold           |

## Four things that will cost you a redraw if ignored

**One file per element, not one per state.** Every plate and glyph has a lit and a
dimmed look — unaffordable, unavailable, locked. Draw each once, lit, on
transparency, and the code dims it; that is how the vector version already works
(one glyph, two colours). Drawing both states doubles twelve files to twenty-four
and buys nothing.

**No text or numbers in the art.** Gold, lives, `Wave 3 / 8`, `T2 90g`, `+42g`,
`+38g` and every family name are drawn by the code, change every frame, and the
names are auto-shrunk to fit their button. The art is plates and pictures only.

**Nothing owns the dashboard background at the moment.** The blue header strip
was removed from `Map_1.svg` and no panel replaced it, so the readouts and the two
controls now sit straight on grass and road. They survive it — the text carries a
drop shadow for exactly this reason, and `node tools/hud-clear.mjs` checks no
tower can push a building up behind a number — but "survives" is not "designed".
If a dashboard panel is wanted it is the next file, and it goes here rather than
back into the map: a panel painted into the board cannot dim, move or be hidden.

**The glyph slot is 22 x 22 game px** — about 4mm on a phone — and it shares its
60px circle with a 9px name and a 9px price. Silhouette only; interior detail will
not survive. If the picture needs more room, the thing squeezing it is the text
*inside* the circle. That text is inside for a reason (labels hung underneath
collided with each other and with the ground behind them), so it can be moved, but
it is a layout change rather than a free one — ask before drawing to a size that
will not fit.

## The menu is drawn on the board, not over a panel

Unlike the dashboard, the radial menu appears wherever a plot is, so its
background can be grass, road, a plot marker's dirt, or the roof of a tower. That
is why the current version is a dark translucent disc with a light rim. Anything
drawn here has to stay readable on all four.

## After uploading

1. `node tools/trim.mjs` — it measures this folder along with the rest. It needs
   `ui` in its `dirs` list and an entry in `scaleFor`, or it will measure these
   against the world `SCALE` and report every one of them as blurry when they are
   fine. That is a code change, not something you do.
2. The trims land in a new `src/data/ui.js`, the same way sprite trims live in
   `src/data/towers.js`.
3. `src/assets.js` gets the keys, and `src/render.js` swaps each vector for its
   image with the vector kept as the fallback — a UI file that fails to load must
   leave a usable button, not an invisible one.

Name the files whatever you like. The code follows the artist's filenames rather
than the other way round, which is why the enemies are `T1a`/`T1b` and the corpses
put the tier last. One file per element and a note saying which is which is
enough.

## The info box is not made of UI art

**Top right**, when a tower, a soldier or an enemy is selected: a portrait, a
name, live health and damage per hit. `src/select.js` decides what it says and
`drawInfo` in `render.js` lays it out. It was bottom-right, which put it over
plot 5's marker; up here it sits beside the readouts and no plot is near it.

**The portraits come from `assets/units` and `assets/enemies`, not from here.**
A tower shows its MAN rather than its building — the building is already on the
board in front of you at the size the game draws it, and what you want to compare
between tiers is the soldier or archer it puts on the road. So there is nothing
to draw for this box: it reads the same sprite trims the board does, and a
re-export moves the portrait with the figure automatically.

### Portraits are sized by a MULTIPLE, not fitted to a box

This is the fix for the blur, and it is worth understanding rather than copying.

The box used to fit every portrait into a 68px square. That is wrong twice. It
drew a 114-source-pixel sprite at 68 game px, which at the 3x device-pixel cap
wants 204 source pixels that do not exist — a 1.2x upscale on every figure, which
is exactly what "blurry" looked like. And it drew a Giant Thug and a Thug the
same size, which is a lie about the only thing that separates them.

Portraits are now drawn at `PORTRAIT_SCALE` times the board's own `SCALE`. One
factor for all of them, so they stay in proportion to each other exactly as they
are on the board — the giant is genuinely bigger.

`PORTRAIT_SCALE` is 1.6, and it is not an eyeballed number. A sprite stays crisp
while its drawn size times the 3x cap fits inside its source pixels, so the
largest honest multiple is `1 / (3 * SCALE)` = 512/315 = **1.625** — and it is
the same ceiling for every figure, because a sprite's source pixels and its drawn
size scale together. `node tools/trim.mjs` prints that comparison on every run.

The slot is then sized to the biggest portrait rather than the other way round:
the heavy is 186 x 162 source, which lands at 61 x 53, so the slot is 64 x 56 and
the whole panel is 224 x 76.

### The rest of it

**The rows are icons, not words.** "Health:" and "Damage:" are a heart and a
sword, both 16 tall. The heart is `Health Icon.png`, its own file — it borrowed
the dashboard's `Life Icon.png` for one build on the reasoning that a heart is a
heart, and then got drawn properly. Keeping them separate is right anyway: the
dashboard heart is the keep's lives and this one is a figure's health.

Both icons sit in a 22px column so the numbers line up whether the health row is
there or not — a tower has no health, and a damage figure that shifted left on
towers and right on units would read as two different layouts.

**The whole block is centred in the panel**, not hung from the top. The number of
rows is counted before anything is drawn, so a tower's two lines and a figure's
three both sit in the middle of the plate — hanging them from the top put the
last row four pixels off the bottom edge.

Health is read off the live object every frame, so the number in the box and the
bar over the figure's head are the same fact twice. If they ever disagree, one of
them is reading a copy.

A tower has no health row at all rather than a blank one, because a tower cannot
be hurt — a row answering a question the game never asks is worse than no row.

Taps fall straight through the panel; it is a reader and never takes one.
`node tools/hud-clear.mjs` includes it alongside the two buttons, so a plot that
could push a building up behind it would be reported.

The panel is `Description Box.png`, 220 x 76. The rounded rectangle it replaced is
still in the code as the fallback, for the same reason every other file here has
one: a UI PNG that fails to load must leave a readable panel, not a hole.

## The tier stars came back, but only where the artwork cannot say it

Every tower used to carry one small star per tier over its roof. They came out
when every tier got a drawing of its own: timber becomes stone, so the building
says its own tier and two indicators for one fact was one too many.

Artillery's three tiers are **one drawing**, so nothing about a Trebuchet on the
board distinguishes it from a Catapult. Those tiers get their stars back and
nothing else does — `tierMarks` in `render.js` asks whether another tier in the
same family shares this sprite, so the stars **remove themselves** the moment the
tier 2 and tier 3 machines are drawn. Nothing has to be deleted.

## The encyclopedia

Two pages behind an **Encyclopedia** button on the title screen and under the
"Paused" label, holding every box description in the game at once. Geometry is in
`src/book.js`, drawing in `render.js`, and `node tools/book.mjs` checks it.

There is **no new art for it** beyond `Cost_Icon.png`. The page is a parchment
sheet drawn in code, and every picture on it is the board's own — buildings from
`assets/towers`, men from `assets/units`, enemies from `assets/enemies`.

### One margin, everywhere, inside the cards too

The sheet is inset from the board and everything on it is inset from the sheet by
the same 16px: the first card's left edge, the last card's right edge, the Close
button, the bottom of the footer, and the gap between the last row and the
footer. **The margins are the fixed thing and the card height is derived from
what is left**, which is the right way round — a card that has to be a pixel
shorter is invisible, a margin that is 4px out is the first thing you see.

It was not this at first, and the failure is worth knowing because none of it
looked wrong in isolation: cards sat 2px inside the sheet, Close sat 12, and the
footer's bottom edge was flush with the parchment. Three numbers, each chosen on
its own, each fine on its own. `tools/book.mjs` now measures every one of those
edges against the same constant.

The same fault was inside each card: the rows were at +16, +33 and +50 of 60, so
the last one sat 3px off the floor while the first had 10px of air over it. They
are **counted and centred** now, the way `drawInfo` already treats the info box's
own two-or-three rows — three rows on a tower or enemy card, two on a unit card,
both blocks in the middle of the plate.

And the picture slot gets the **whole** card height rather than a 3px inset. That
inset was pure loss: it made every building 11% smaller and stood the shared
ground line 2px higher, which is what made the archery towers look like they were
floating. There is nothing above or below a picture slot to keep clear of — the
text sits beside it, not under it.

### Every box is the same size

A tower, a man and an enemy all get the identical card. Enemies briefly had
full-width rows of their own, because two of them side by side left most of the
page blank — which was solving the wrong problem. **A reference page whose boxes
are three sizes reads as three different kinds of thing.** Empty space on a short
page is fine; boxes that do not match are not.

### Everything stands on its shadow

**Nothing on the page is centred on its bounding box.** Every drawing is placed by
the anchor it already carries — `groundFrac` for a building, `pivot` /
`gunnerPivot` / `portraitPivot` for a figure — and every card puts that anchor at
the same point in its slot, so a column of towers shares one vertical axis and
one ground line and so does a column of men.

That is the same rule the board follows, and for the same reason: a bounding box
is not where a thing is. The tier 2 watchtower's flagpole leans out one side; the
barracks tent's stakes hang 35px below its shadow. Among the men it is worse,
because they carry things — a spearman's spear and a pikeman's pike stick out by
different amounts on different sides, so three soldiers centred by their boxes
stand in three visibly different places while their shadows say they are all
standing still.

This is what needed `catapult.portraitPivot`. The crewman never stands on the
board, so he had never been given a shadow anchor, and he was the one figure on
the page floating by his box while the row beside him stood on a line.

### Both scale factors are one-per-kind

Chosen the way `PORTRAIT_SCALE` is, and for the same reason: **one factor per
kind, never fitted per item.** Figures use `PORTRAIT_SCALE` itself, so a man is
the same size in the book as in the info box; buildings use `BOOK_TOWER_SCALE`,
derived from the defs so the tallest span exactly fills its slot and every other
building comes out in proportion. A Militia Camp reads as bigger than a Catapult
on the page because it is bigger on the board.

It is derived from the **shadow-anchored span**, not from the tallest single
drawing: 171px against the tallest building's 153, because the tent hangs below
the line the towers stand on. Redraw a taller tower and the factor shrinks by
itself and the whole shelf follows. Nothing here needs re-typing after a redraw.

The two picture slots are **different widths** on purpose. A building shrinks to
fit, so it can have a narrow one; a figure is drawn at a fixed scale and its slot
has to hold the widest man in the game — the Giant Thug, whose club reaches 45px
left of the spot he stands on. One slot sized for both would either crop him or
waste 30px of every tower card's text.
