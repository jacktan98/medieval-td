# Map artwork

Four hand-drawn files live here, all authored, never generated:

- **`Map.svg`** — the whole board at 1920 x 1080: sky strip, grass, road,
  scenery, and a marker on each of the nine build plots. It was `Map_1.svg`
  until the last upload; the tool follows the artist's filename rather than the
  other way round.
- **`Plot Marker.svg`** — one plot marker on its own, on a 1024 square canvas as
  of the last redraw. The space in the name is fine; `src/assets.js` asks for it
  as `Plot%20Marker.svg`, because a raw space is illegal in a URL.

  This file is quietly the most useful one in the project, because it is the only
  asset whose correct game size is known independently: the same marker is
  painted into `Map.svg`, which is authored at the board's own scale. When the
  towers moved to a 1024 canvas and it was not obvious whether they should be
  read at the shared `SCALE` or half of it, this is what settled it — at the
  shared `SCALE` the standalone marker lands within 2.5% of the painted one, so
  1024-at-`SCALE` is the artist's convention. `tools/split-map.mjs` prints that
  percentage on every run. **If it ever drifts far from zero, the canvases have
  stopped agreeing and every 1024 asset is the wrong size.**
- **`Gold.png`, `Life.png`** — the two HUD icons, at the top of the screen.

One derived file is generated from them and committed:

- **`Map_base.svg`** — the board with the nine markers cut out.

`node tools/split-map.mjs` writes it, and never touches the hand-drawn files.

> **THE GAME DRAWS `Map_base.svg`, NOT `Map.svg`.** Uploading a redrawn
> board changes nothing on screen until that command is run. This has caught us
> out on four of the last five map uploads — three times because the upload
> deleted the derived file, once because it left a stale one in place. If a
> change to the board does not appear, this is why, before anything else.

## The HUD icons are not world art

`Gold.png` and `Life.png` are the only artwork in the project deliberately NOT
sized by the shared `SCALE`. An icon's job is to sit beside a number and be read,
so it is sized to the text — 24px tall against the 20px HUD font, which puts its
cap height on the digits'. Their aspect comes from their measured trims, so a
redrawn icon of a different shape still lands on its baseline rather than being
squashed to fit. The trims are in `src/render.js` beside the other UI numbers.

If either file goes missing the HUD falls back to the words "Gold" and "Lives",
so a failed load leaves something readable rather than a bare number.

## Export size

The game draws in a fixed 960 x 540 space, and the canvas backing store is sized
to real device pixels up to 3x (`MAX_SCALE` in `src/main.js`). So:

- **Map: 2880 x 1620** preferred, 1920 x 1080 acceptable. An SVG is better than
  either — it has no fixed resolution. `Map.svg` is 1920 x 1080 with a
  matching `viewBox`, which is exactly right.
- **Sprites: 512 x 512.** This is the one that bit us, and it is settled now.
  At 200 x 200 the tallest sprite had 185 source pixels and needed 291 on a 3x
  phone, so it was blown up 1.57x — which is why the art was soft on a phone and
  crisp on a laptop. A laptop asks for 1x and never upscales. At 512 every
  sprite has pixels to spare.

Run `node tools/trim.mjs` to see the upscale factor for every sprite. Anything
that says SOFT will look blurry on a phone.

Changing the export size costs one number: `EXPORT_PX` in `src/data/towers.js`.
Every drawn size stays identical — re-run `tools/trim.mjs` and paste the trims.

## What to paint, and what to leave out

Paint everything that sits on the ground: the grass, the road, the rocks, the
grass tufts, and a keep at the end of the road when you draw one. Nothing on the
ground is drawn in code any more — the vector trees, rocks and keep that used to
stand in have been deleted, so whatever is not in the artwork is not on the
board. There is no keep in the drawing yet, so the road currently just runs off
the right-hand edge.

**Plot markers are the exception, and they still have to be painted into the
map even though a separate marker file exists.** They cannot stay in the
background — a marker painted into the board cannot be taken away when a tower
is built on it, and the signpost would poke out through the tower's legs. But
they cannot be left out either, because **where you paint them is how you say
where the plots are**. So paint all nine, and the tool cuts them back out.

It finds them by looking for the largest set of groups that draw the *same
shape* in different places, then checks it found exactly as many as the level
has plots. Keep the nine identical to each other and it keeps working; it does
not care how the export nests or transforms them. It also prints the plot
positions in road order, ready to paste into `src/data/level01.js`.

## Two things that will break if the artwork ignores them

**The top of the board is the HUD.** `Map.svg` paints a strip across the top —
currently sky blue, 126 map units (63 game px) — and the gold/lives/wave text is
drawn straight onto it. The game paints no bar of its own, so keep a strip
there. The text carries a dark shadow so it survives most backgrounds, but a
pale strip would still be a bad idea.

**The road has to run edge to edge.** Enemies walk the polyline in
`src/data/level01.js`, which is traced from the painted road, so the drawing
decides the level. The road must reach both the left and the right edge of the
canvas — enemies spawn off-screen at one end and leak off-screen at the other. A
road that stops in the middle of the board has nowhere for them to come from.

Draw plot markers wherever you want towers. Their positions are read straight
out of the drawing, so they line up exactly, and there is no longer any nudging
between what you paint and where the game puts them.

### There is a hard ceiling now, and one marker is above it

The tallest tower is the tier 2 archery post: 153px tall standing 136px above
its own plot. So a plot at y=136 puts the roof's top pixel on the top edge of the
board, and anything higher is **cut off** — not drawn in front of the HUD, cut
off, because the canvas edge does not care what is behind what. The tier stars
sit 11px higher again, so they are the first thing to go: they vanish while the
roof still looks fine, and the stars are the only thing on the board that says
which tier a tower is.

This has already bitten once. A marker sat at (721, 128), which was over the
ceiling AND directly under the speed button — 677..765 against the button's
676..764, as exact an overlap as you could arrange on purpose — so even a tier 1
watchtower there put its deck, its archer and its flag inside the "1x" control.
It has since moved to (809, 262) and both faults are gone.

`node tools/hud-clear.mjs` reports the strictest fix rather than the first fault
it finds, because that plot failed two rules at once and fixing the smaller one
first would have meant moving the same marker twice.

Below the ceiling, a plot high enough to reach the HUD **text** is a much
smaller problem — the header is part of the map, so a tall tower stands in front
of it, and the text carries a shadow. `node tools/hud-clear.mjs` reports both
kinds and says by how much: cut-off is a failure, behind-the-text is a note.

## Re-tracing after a redraw

The level data is derived, not hand-written, so a redraw does not mean editing
coordinates. Rasterise the map, isolate the road colour, drop the plot markers,
and walk the ridge of the distance transform from one end of the road to the
other — that is the centreline. `ROAD_W` in `src/render.js` is twice the largest
distance from any road pixel to the grass.

**Moving the markers is a balance change.** Expect to re-check it every time:
`node tools/sim.mjs`. The plots decide how much of the road the archers can
reach, and that is the single biggest lever in the game. An earlier redraw moved
the markers by up to 36px, which raised coverage from 81% to 83.6% and was
enough to let a pure-archery build win outright — enemy speed went 88 -> 94 to
put it back. Before that it had gone 72 -> 88 for the same reason.

**And moving one marker can renumber all of them,** because the plots are stored
in road order. One redraw is the clean example of how little it takes: the road
did not move at all, and the total reach of the nine markers actually went DOWN
(their union covers 89.1% of the road where it covered 93.0%). But one marker
moved from (462, 130) to (557, 185), taking it from covering 10.6% of the road to
17.0% — and it is a plot the best all-archery build takes. That single plot was
the whole margin: all-archery went from losing on wave 7 to winning with 4 lives.
The heavy's hp went 620 -> 780 to put it back.

**The redraw after that one is the other half of the same lesson.** Making the
plot marker bigger slid all nine to make room. Nothing was renumbered, the union
went 89.1% -> 89.0%, and the heavy's hp did not have to move at all — but every
scenario in `tools/sim.mjs` went from winning to losing on wave 7, because
plots 3 and 4 each gained about three points of coverage while plot 6 lost two,
and that was enough to change **which six plots the best build takes** and which
family goes on each. The fix was re-sweeping the shopping lists, not re-tuning
the game.

**And the one after THAT is the sharpest of the three, because it moved a single
marker and the marker got better.** Plot 8 went from (721, 128) to (809, 262) to
clear the HUD. Its own coverage rose from 13.3% to 15.3% of the road, the part no
other plot reaches rose from 4.1% to 8.5%, the union rose from 89.0% to 93.4%,
nothing was renumbered and the road is identical to the pixel. **Nothing cleared
the level afterwards** — the first time this has needed the heavy's hp brought
DOWN, 780 to 755.

The reason is that the build it broke used that plot as a barracks, and a
blocker is worth what the archers behind it can shoot. Its squad's stand moved
from 85% along the road to 89%, which took it from 102px off the nearest other
tower to about 145px, the outer edge of tier 1 range. **Coverage measures where a
tower can shoot; it says nothing about whether anything can shoot the place a
blocker stands.**

So do not read "coverage barely changed" as "balance barely changed", and do not
read "coverage went up" as "the level got easier". Which plots are good matters
more than how good they are in total, good-for-archery and good-for-blocking are
different questions about the same spot, the indices shift underneath anything
that hard-codes them, and the answer to all of it is the sweep: `node
tools/sweep.mjs`, 448 six-tower builds, 20 seconds. Run it before `sim.mjs`, not
after.

Speed is no longer that lever. The game was deliberately slowed down afterwards
(militia 94 -> 70, archery cooldown 0.75 -> 1.00) and the archers' reach raised
to 150, which made archery strong again; the repair was the heavy's hp, because
heavies first appear in wave 4 and so raise the ceiling without touching the
opening. Militia hp is the wrong knob for that — at 110 every build died on
wave 2.

**That knob is running out of room.** The hp values where the invariant holds are
745 to 765, a band 20 wide where the previous one was 80, and every value inside
it has the best build scraping home with 2 lives out of 20 where it used to have
7. All the difficulty now lands in wave 8. If the next map change breaks this
again, the honest repair is probably the wave curve rather than one enemy's hp.

The invariant to protect is that **neither family wins alone**: the best
all-archery build must lose, the best all-barracks build must lose, and a mix
must win. `tools/sim.mjs` checks exactly that.

Two traps worth knowing when you re-tune:

- Plots are stored **in road order**, so moving a marker can renumber them. The
  scenarios in `tools/sim.mjs` pick plots by index, and after the last redraw
  the old indices silently put the barracks on the two best archery plots. Every
  mix "lost" and it looked like a balance collapse; it was a bad shopping list.
- Test the **best** build of each family, not a typical one. "Archery alone
  cannot win" is a claim about the strongest all-archery build that exists.
