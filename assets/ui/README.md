# UI artwork

The dashboard across the top and the radial menu that opens on a plot. Nothing
here is on the board — it is the layer between the player and the board.

**Nine files in, three still vector.** Everything below that is not in the table
of what landed is still drawn in code, in `src/render.js`, and those vectors are
also the fallback for every file here — a UI PNG that fails to load leaves a
usable button rather than a blank disc.

| file                     | replaces          | drawn        |
|--------------------------|-------------------|--------------|
| `Gold Icon.png`          | the gold icon     | 51 x 24      |
| `Life Icon.png`          | the lives icon    | 30 x 24      |
| `Button Plate Icon.png`  | the menu disc     | 60 diameter  |
| `Cancel Button Icon.png` | the centre cancel | 36 diameter  |
| `Archers Icon.png`       | `bow`             | 27 x 32 box  |
| `Barracks Icon.png`      | `swords`          | 26 box       |
| `Upgrade Icon.png`       | `up`              | 26 box       |
| `Sell Icon.png`          | `coin`            | 26 box       |
| `Rally Point Icon.png`   | `flag`            | 30 box       |

Still vector, still wanted: **`catapult`** (siege), **`cross`** (monastery) and
**`max`** — the chevrons on a tower with nothing left to buy. Siege and the
monastery have no tiers yet, so their buttons are drawn dim in any case.

Trims and drawn boxes are in `src/data/ui.js`; paths in `src/assets.js`. The
filenames have spaces, so `assets.js` encodes them as `%20` for the same reason
`Plot%20Marker.svg` does — a raw space is not legal in a URL, and the artist's
names are left alone.

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

The header strip itself is painted in `Map.svg` (126 map units, 63 game px) and
the code deliberately paints no bar of its own. See the trap below before drawing
a panel.

| element             | drawn     | needs at 3x | states       |
|---------------------|-----------|-------------|--------------|
| speed button plate  | 56 x 24   | 168 x 72    | one          |
| "Next wave" plate   | 136 x 24  | 408 x 72    | lit / dimmed |
| gold icon           | 24 tall   | 72          | done         |
| lives icon          | 24 tall   | 72          | done         |

**Both controls are 24 tall now, the same height as the icons beside them**, so
the dashboard sits on one band instead of the controls being twice the depth of
the readouts. They were 88 x 44 and 168 x 44.

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

**There are no words on these buttons.** "Barracks", "Sell", "Upgrade" and the
`T1` in front of every price all came out. What is left is the glyph and the
gold — `70g` to build, `90g` to upgrade, `+42g` to sell — which is the whole
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
| `coin`     | sell                                   |

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
was removed from `Map.svg` and no panel replaced it, so the readouts and the two
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
