# UI artwork

The dashboard across the top and the radial menu that opens on a plot. Nothing
here is on the board — it is the layer between the player and the board.

**Thirty-five files in, and two things still vector.** Everything below that is not in the table
of what landed is still drawn in code, in `src/render.js`, and those vectors are
also the fallback for every file here — a UI PNG that fails to load leaves a
usable button rather than a blank disc.

| file                     | replaces          | drawn        |
|--------------------------|-------------------|--------------|
| `Gold_Icon.png`          | the gold icon     | 51 x 24      |
| `Life_Icon.png`          | the lives icon    | 30 x 24      |
| `Button_Plate_Icon.png`  | the menu disc     | 60 diameter  |
| `Confirm_Icon.png`       | the tick a purchase is confirmed with | 30 box |
| `Cancel_Button_Icon.png` | the centre cancel | 36 diameter  |
| `Archery_Icon.png`       | `bow`             | 27 x 32 box  |
| `Barracks_Icon.png`      | `swords`          | 26 box       |
| `Artillery_Icon.png`     | `catapult`        | 26 box       |
| `Upgrade_Icon.png`       | `up`              | 26 box       |
| `Musketeer_Post_Icon.png`| `musket`          | 34 box       |
| `Paladin_Keep_Icon.png`  | `keep`            | 26 box       |
| `Ballista_Turret_Icon.png` | `ballista`      | 26 box       |
| `High_Altar_Icon.png` | `altar`       | 26 box       |
| `Judgement_Temple_Icon.png` | `temple`, the fork's other face | 26 box |
| `Refund_Icon.png`        | `refund`          | 26 box, and 14 in the book |
| `Rally_Point_Icon.png`   | `flag`            | 30 box, and 20 tall on the board |
| `Speed_Box.png`          | the 1x plate      | 54 x 24      |
| `Next_Wave_Box.png`      | the wave plate    | 127 x 24     |
| `Description_Box.png`    | the info panel    | 220 x 76     |
| `Physical_Damage_Icon.png` | a physical attack | 16 tall    |
| `Magic_Damage_Icon.png`  | a magic attack    | 16 tall      |
| `Physical_Armor_Icon.png`| physical armour   | 16 tall      |
| `Magic_Armor_Icon.png`   | magic armour      | 16 tall      |
| `Pierce_Physical_Armor_Icon.png` | ranks of physical armour an attack breaks | 16 tall, same baseline as the whole shield |
| `Pierce_Magic_Armor_Icon.png` | ranks of magic armour an attack breaks | 16 tall, same baseline as the whole shield |
| `Area_of_Damage_Icon.png`| how wide a blast is | 16 tall — the one wide icon in the set |
| `Health_Icon.png`        | the word "Health" | 16 tall      |
| `Gold_Cost_Icon.png`     | a tier's price, and an enemy's bounty | 14 tall |
| `Life_Cost_Icon.png`     | lives an enemy costs if it gets past | 14 tall |
| `Monastery_Icon.png`     | `cross`           | 26 box       |
| `Crossbow_Sentry_Icon.png` | `sentry`        | 26 box       |
| `Assassin_Guild_Icon.png`| `assassin`        | 26 box       |
| `Cannon_Outpost_Icon.png`| `cannon`          | 34 box       |
| `Maxed_Icon.png`         | `max`, on a ladder with nothing left to buy | 26 box |
| `Range_Icon.png`         | the word "Reach"  | 16 tall      |
| `Aim_Near_Exit_Icon.png` | `aim_exit`, the standing order | 30 box |
| `Aim_Most_Health_Icon.png` | `aim_tough`     | 30 box       |
| `Aim_Ranged_Enemies_Icon.png` | `aim_ranged` | 30 box       |
| `Favicon.png`            | the browser tab icon | 64 x 64, and read at 16 |
| `Apple_Touch_Icon.png`   | the iPhone home screen icon | 180 x 180, opaque |
| `High_Altar_Holy_Wrath.png`       | the badge over every tower it buffs   | 20 tall |
| `High_Altar_Divine_Fortitude.png` | the badge over every barracks it buffs | 20 tall |

## The favicon is the one file here judged at 16px

`Favicon.png` is not a 512 sprite and is not sized by `SCALE`. It is 64 x 64, and
every browser that shows it will shrink it: 16px on a tab, 32 on a bookmark bar.
That is a smaller box than anything else in this project has to survive.

It is composited rather than drawn — the barracks' crossed swords laid on
`Button_Plate_Icon.png` at 52% of the disc — so it is the artist's own artwork
without a new file to keep in step. The plate is what makes it work: a filled
cream disc with a black rim holds a silhouette on a white tab and a dark one
alike, where a bare transparent glyph disappeared into both.

**If you replace it, the test is the only one that matters here: shrink your
drawing to 16 x 16 and look at it.** Every candidate in this folder was tried
that way before this one was picked, and most of them turned to mud — the
catapult, the bow and the cannon all lost their shape entirely. What survived
were the ones with a bold outer silhouette and one mark inside it. So:

- a **solid shape that reaches the edges**, not a small mark on transparency
- **one** idea, not a scene — a building with a roof, a door and a flag is three
- **high contrast inside it**, because anti-aliasing at 16px eats thin lines
- test it on white AND on dark; browser tabs are both

512 x 512 is fine to draw at, as everything else here is. Save it as
`Favicon.png` at 64 x 64 as well, or leave the composite in place and the game
keeps using it.

## And a SECOND icon, because a phone does not read the first

`Apple_Touch_Icon.png` is the one an iPhone puts on a home screen, and it is a
different file rather than the same one scaled up. Three reasons, and each of
them would have spoiled the favicon if it had been reused:

- **iOS ignores `rel="icon"` completely.** It looks for `apple-touch-icon`, and
  with none of it falls back to the first letter of the `<title>` — so this game
  sat on a home screen as a letter **M** while its favicon worked perfectly in
  every desktop browser. Nothing you can open on a laptop shows you that.
- **It must be opaque, edge to edge.** iOS composites transparency onto black
  and then applies its own rounded mask, so the favicon's cream disc on a clear
  ground would arrive as a disc in a black box. This one fills the square with
  the board's own grass, `rgb(50, 58, 40)`, read off the running game rather
  than typed.
- **The corners are cut off.** iOS rounds them at about 22%, so the swords sit
  inside 14% of every edge and nothing of them is lost.

180 x 180 is the largest size iOS asks for and it scales the rest itself, so one
file is enough. `node tools/check-modules.mjs` checks that both icons are wired
on the pages a player opens and that the files they name exist.

**iOS caches a home-screen icon hard.** After changing this file, delete the
shortcut from the home screen and add it again — reloading the page in Safari
will not update an icon that is already sitting on a home screen.

## The ability buttons moved to `assets/abilities`

All fourteen of them, and this folder used to hold the first eight. They left
because they are a different KIND of thing: everything above is a transparent
mark drawn on top of `Button_Plate_Icon.png`, and an ability button arrives as
the whole button, disc included, and is drawn instead of the plate. Read
`assets/abilities/README.md` before drawing one — it carries the size the disc
has to trim to.

**Four stat icons where there were two.** The old damage icon became
`Physical_Damage_Icon.png` when magic damage arrived: a sword is not "damage" any
more, it is one of two kinds, and a file named for the general case would have to
be the picture of both. Which of the two a card shows is decided by the def's
`damageType` in `src/data/towers.js`, so a new magic tower needs no wiring here.

The two ARMOUR shields are one drawing in two colours — they measure to the same
`[170, 167, 172, 178]` to the pixel — and they are read side by side, so the
colour is the only thing telling a player which rank a shot is up against.

The altar's two BADGES stayed, and they are the two rows at the foot of the
table above. They are not buttons: they are marks hung over every tower an aura
reaches, so they are board furniture like the rally flag rather than interface.

The High Altar's two abilities are the only ones that need a **second**
drawing each. Every other ability shows itself where it happens — three balls in
the air, a kneeling paladin, a machine rebuilt in iron — but Holy Wrath and
Divine Fortitude do their work on OTHER towers and change nothing about the
altar or about the shots. The badge is the whole feedback, so it is drawn small
and without the button's disc behind it, floating over the top of every building
the aura reaches. See `drawBadges` in src/render.js.

Two things about that badge are worth knowing before either file is redrawn.
It hangs above the top of the **whole drawing** rather than of the building —
a Ballista Turret's machine stands 7px above its own stone and a Musketeer 3.6px
above his deck, which `node tools/hud-clear.mjs` prints per tier — so a taller
badge eats into that gap rather than into the roof. And when more than one altar
has bought the same ability, the badge does not double: it takes a **x2** beside
it, because the two compound into one bigger number rather than into two marks.

Some ability buttons are drawn on a WHITE disc and the rest on a blue one. The
price under a button is white, so on the pale ones it disappeared entirely until
`pale: true` in `src/data/ui.js` taught `buttonPrice` to print gold there
instead. That flag now lives beside the entries in `src/data/ui.js` rather than
here, because the buttons themselves do.

The sell button became **`Refund_Icon.png`** and the code followed all the way
down: the sprite key is `glyph_refund`, the menu act is `refund`, the helper is
`refundValue()` and the rate is `REFUND_RATE`. The key used to be `glyph_coin`,
which named the picture; `glyph_refund` names the job, and the job is the thing
that can now change without the drawing being redrawn.

The two **cost** icons are used only in the encyclopedia, and they are a pair on
purpose: a stack of coins for what a tier costs to build, and a **broken heart**
for what letting an enemy past costs the keep.

The broken heart is the reason they exist rather than reusing the dashboard's
`Gold_Icon` and `Life_Icon`. On an enemy card the coin means a bounty you are
paid and the heart means damage done to you — the opposite sense from the same
two pictures at the top of the screen, where they are what you HAVE. Two drawings
that say *cost* carry that without a caption, and the enemy page used to need one.

`Gold_Cost_Icon.png` is the old cost icon renamed. It does double duty: a tier's
price on the tower cards, paired with the refund icon beside what that tier gives
back, and an enemy's bounty on the facing page.

Still vector, still wanted: **`cross`** (monastery) and **`max`** — the chevrons
on a tower with nothing left to buy. The monastery has no tiers yet, so its
button is drawn dim in any case.

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

## The four ability buttons are the exception, and they are a whole button

Everything else in this folder is a **mark** that gets drawn on top of
`Button_Plate_Icon.png`. The four ability icons are not: the artist drew each one
on a blue disc, so the file **is** the button, and `src/render.js` draws it
*instead of* the cream plate rather than over it.

That is fine, and it is what `plate: true` says on those four entries in
`src/data/ui.js`. It comes with two conditions, and both are checked by
`node tools/trim.mjs`:

**The disc must be the same disc.** All four measure `[163, 163, 186, 186]` — the
plate's own trim, to the pixel — so an ability button is exactly the size of every
other button in the ring and lands in the same place. A re-export at a different
size would be a button that does not match the ones beside it.

**It must be square, centred and round.** The renderer clips these to a circle of
the button's radius, and that clip only lands correctly while the disc fills a
centred square. Off-centre, oblong, or smaller than its box, and the clip either
eats the drawing or leaves the corners hanging outside it.

**And transparent, like everything else here.** Three of the four arrived on an
**opaque white square** and were re-exported clear. While that was true the clip
was doing real work — it is what kept four white corners off the grass — and
`tools/trim.mjs` had to find the disc by colour rather than by alpha, because
every pixel of the canvas was solid. Both are fixed at the source now: the tool
measures by alpha, the transparency rule covers all four rather than exempting
them, and the clip stays as the guard against the next export that brings a
background back.

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

### What a paused game puts on the board

Two buttons under the "Paused" label — **Encyclopedia** and **Quit** — in the
strip the dashboard already owns rather than over the middle of the map. Nothing
dims: the whole point of pausing here is to STUDY the board, and a game that
greys out the thing you paused to look at has answered the wrong question.

**The gap between them is the design.** Quit is the one control in the game that
throws work away — a wave 7 board is half an hour — and it sits beside the button
a player presses to read something. Their padded tap boxes must not touch: 30px
of drawn gap leaves 4px of clear air at 13px of padding each side, where the 12
that looked right on screen would have overlapped by 14 and handed the mis-tap to
whichever was tested first. `node tools/book.mjs` checks it.

**Quit asks twice.** The first tap arms it and the label says so — "Quit — sure?"
in amber — and the second, within three seconds, goes back to the title screen.
The arming is cleared by anything else, including unpausing, so a half-pressed
quit can never wait around to catch a later tap. The map you chose survives;
`newGame()` keeps `levelIndex` because which map you are playing is a menu
setting rather than part of the game being thrown away.

### Radial menu

Opens on the tapped plot, up to four buttons on a ring 68px from the centre, with
a cancel target in the middle. Geometry is in `src/menu.js` — `BTN_R`, `RING_R`,
`CANCEL_R` — and `input.js` hit-tests those same constants, so the drawn size and
the tappable size are related but not equal.

**A tier 4 tower gets a second, wider arc.** The four compass points are already
spoken for — upgrade east, refund west, rally or standing order south — so the two
ability buttons go up and out on the diagonals at `ABILITY_R`, 96 from the centre.
That is a number rather than a taste: it puts an ability button 67.9px from the
button beside it, which clears the 60px discs with 8px to spare and is a hair over
the 68 that two 34px tap circles would need to touch. Eight buttons on the one ring
would sit 52 apart and overlap.

Menus with abilities on them are clamped further from the board's edges to keep the
wider arc on screen; every other menu keeps exactly the margin it had.

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
| `catapult` | Siege, on an empty plot                |
| `cross`    | Monastery — locked, drawn dim          |
| `up`       | upgrade this tower                     |
| `max`      | already at tier 3, nothing to buy      |
| `flag`     | move the barracks rally point          |
| `refund`   | take the tower down for gold           |

And the four ability buttons, which are whole buttons rather than glyphs — see the
section above. They carry `150g` in **plain white** until they are bought and a
**gold ring** round the disc afterwards, drawn 2.5px outside it so the stroke lands
on the grass rather than half under the artist's own black outline. An owned button
is not dimmed: it is on the ring to say what this tower does, and greying it would
read as *you cannot have this* when the answer is *you already do*.

The white price sat on a dark rounded plate of its own for one build, on the
reasoning that text over artwork needs something behind it. The artist took it off,
and they were right: the disc is already a flat, dark, even blue, so the plate was
solving a problem the drawing does not have and read as a label stuck on the button
rather than as part of it.

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
name, live health and damage per hit.

**The whole panel is 0.9 of what it was** — `INFO_SCALE` in `src/data/ui.js`. The
height is scaled by it and the width follows from the plate's own aspect, so
197 x 68 where it was 220 x 76, and the portrait comes down with it to
`INFO_PORTRAIT` = 1.44.

That 1.44 is the same figure scale the encyclopedia uses, and it was not planned:
the panel was shrunk by the amount the panel needed and the book had already
asked for the same tenth. A man is now the same size in the corner of the board
as he is on the page.

**The text did NOT scale — it was measured.** A font is not a length: 11.5 x 0.9
is 10.35, and the size that fits is a measurement rather than a product. The
title is **10.5px** and the stat rows **10**, and the string that binds them is
"Trebuchet Engineer", the longest name the box can be asked to show. At 700
weight in system-ui it measures 142.9px at 13, 115.4 at 10.5 and 110.0 at 10,
against a text column that is 118 wide once the portrait and the plate's own
border are out. 10.5 fits with 2.6px to spare; 11 does not fit at all.

Every tower used to be captioned with its tier — "Archers Tier I" — and naming
the MAN instead is what put this column under pressure. It was the right call and
this is its price.

There is no tool for any of it and there cannot easily be one — node has no
canvas, so nothing outside a browser can measure a font. If a name longer than
"Trebuchet Engineer" is ever added, look at the box. `src/select.js` decides what it says and
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

Four pages behind an **Encyclopedia** button on the title screen and under the
"Paused" label, holding every box description in the game at once: towers, the man
each of them puts on the board, enemies, and — on the last page — the abilities a
tier 4 tower can be taught. Geometry is in `src/book.js`, drawing in `render.js`,
and `node tools/book.mjs` checks it.

There is **no new art for it** beyond `Gold_Cost_Icon.png`. The page is a parchment
sheet drawn in code, and every picture on it is the board's own — buildings from
`assets/towers`, men from `assets/units`, enemies from `assets/enemies`, and on the
last page the ability buttons from this folder.

**The abilities page uses the same card as everything else**: a name, the tower
that teaches it underneath, and a price on an icon row — exactly a tower card. It
carried two lines of prose in a smaller face for one build, which made it the one
box in the book laid out differently from the rest, and a reference page whose
boxes are two shapes reads as two kinds of thing however well the grid lines up.

The explaining moved to the **pop-up**, which is where there is room for it: an
ability opens with two or three paragraphs beside its picture rather than the
picture alone. That is the right way round for what an ability is — a rule rather
than a thing, whose drawing says almost nothing on its own — and the text is in
`detail` on each entry in `src/data/abilities.js`, wrapped at draw time into a
340px column at 12px on a 17px pitch. `tools/book.mjs` estimates the same wrap and
fails if any of them would need more than twelve lines.

Its pictures are clipped to a circle, for the same reason the menu buttons are: the
artist draws them round, and a disc in a square frame wants its corners taken off.

### The pop-up is as big as the screen can honestly show

Tapping a card opens the drawing on a plate of its own, one plate per kind, sized
to the biggest member of that kind. The factor it is drawn at is **capped by the
display**, and that is the part worth understanding before changing anything here.

The board is 960 x 540 logical units and the canvas behind it is drawn at up to
three times that — see `fitToDisplay` in `src/main.js`. On a laptop one logical
pixel is one real one; on a 2560-wide monitor it is 2.67. So a drawing shown at
"1:1" in logical units is being blown up 2.67 times on the glass, which is exactly
what was reported: the pop-up looked crisp on a laptop and soft on a big screen,
and the box was the same size in both.

So the plate now asks how big the canvas actually is and never draws a source pixel
smaller than a screen pixel. **The cost is real**: on that 2560-wide monitor the cap
is 0.375, so a figure opens at about 67px rather than 179 and a tower at 177 x 198
rather than 286 x 320. The art is 512px square with a man filling 180 of it — there
is no more resolution to show, and the only route to a bigger crisp pop-up is bigger
source art. `tools/book.mjs` checks every plate at both ends of the range.

### One margin, everywhere — inside the cards, and around the pictures

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

### The book's figures are a tenth smaller than the box's

`BOOK_FIGURE_SCALE` is `PORTRAIT_SCALE * 0.9`. The info box shows ONE man, big,
on a plate of his own; the book shows twenty in a grid, and at the box's own
scale they crowded their cards. It is written as a fraction of the box's factor
rather than as a number of its own so the two stay tied — raise the portraits and
the book's follow.

It cannot cost sharpness: it is a downscale of a downscale, so only the ceiling
on `PORTRAIT_SCALE` itself matters, and `tools/book.mjs` checks that one.

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

## Stars, and where progress lives

A finished game is rated out of three: **18 of 20 lives for three, 10 of 20 for
two, any win below that for one, and a loss is none.** The two cut-offs are
stored in `src/score.js` as fractions of the map's own `startLives` — 0.9 and
0.5 — which reproduce 18 and 10 exactly today and still mean "nearly untouched"
and "half of it left" if a map ever starts with a different garrison.

**The best rating per map per difficulty is kept**, in `localStorage`, and
nothing else is: not the last result, not a history. What a player wants on the
screen where they pick a map is the high-water mark, and a bad run must never
take a star away from a good one.

**It is per DIFFICULTY on purpose.** Three stars on Normal is a real thing and it
is not three stars on Hard. The title screen shows the row for whichever
difficulty is currently selected, so the stars change under the map buttons as
you tap between Normal and Hard — which is also the clearest way to say they are
two separate ladders.

**The map buttons grew from 46px to 60px to hold them, and the stars went
INSIDE.** Hanging them under the button was the first attempt and it put them
straight through the difficulty row: the title column is full, and the only spare
room on that screen is inside things. It reads better anyway — a rating printed
on the map's own plate belongs to that map in a way a detached row under it does
not.

**Every slot is drawn, lit or not.** Two stars only means something beside the
third one you did not get.

## The admin dashboard

A quiet outlined button in the bottom-right corner of the title screen, a
four-digit PIN on a drawn keypad, and behind it two tabs: **the number of enemies
in every group of every wave of every map** and **the gold that map starts you
with**, and **the health and attack damage of every fighting figure in the game**.

**The purse is a testing control before it is a tuning one.** A Musketeer Post is
500 gold of ladder and 300 more in abilities, which is most of a map's income — so
seeing one in the state it is meant to be judged in used to mean playing eight
waves first. It sits on the map row of the Waves tab, hard against the right
margin: the tabs on the left say which map, and this says what that map hands you.

**The keypad is a keypad because this game takes no keyboard input.** It is
played with a thumb in landscape, and a text field that summoned a phone keyboard
over the board would be the only one of its kind. Four taps and it checks itself;
there is no submit key.

**The PIN is not security and must not be treated as any.** The game is static
files served to a browser, so the code is in JavaScript anybody can read and
there is no server to check it against. What it buys is that a player poking at
the title screen cannot wander into the tuning panel by accident. To change it,
change `PIN` at the top of `src/admin.js`.

**Only the OVERRIDES are stored.** Setting a number back to what it shipped as
removes the entry rather than saving it, so a dashboard nobody has touched leaves
nothing behind — and a retune in the data files is never silently overwritten by
a year-old snapshot in somebody's browser. Every changed value is drawn in amber
with `was N` under it, which is the only way to tell a number somebody set from a
number the game came with.

**A tap moves a count by one, a stat by a twentieth of where it already is, and
the purse by a tenth rounded to tens.** Health in this game runs from 3 to 1500; a
fixed step is either 500 taps across the giant or one that cannot express a
spearman's damage at all. Five per cent is about fourteen taps to double or halve
anything, whatever it started at, and a tenth is eight — which is what makes one
gold control serve both jobs, nudging a shipped 220 by 20 and running it to four
figures without sixty taps. `tools/admin.mjs` measures the doubling at both ends of
the range, because a fixed step would pass at whichever end it was chosen for.

The purse is the one number here that **may be taken to zero**. A wave of no
enemies and a figure with no health are both broken; a map you have to earn every
coin on is a real thing to try.

**Difficulty is applied ON TOP of the dashboard's numbers**, not instead of them
— the panel edits the wave table, it does not sit outside it. A wave set to 20 is
17 on Normal and 22 on Hard, exactly as a 20 typed into `src/data/waves.js` would
be.

**The list of editable units is DERIVED from the game's own data.** The monastery
landed with four tiers of nothing and appeared in the panel without a line being
changed. A hand-written list is a list that silently misses the next family.
