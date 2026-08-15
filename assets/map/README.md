# Map artwork

Hand-drawn files live here, all authored, never generated:

- **`Map_1.svg`** — the first board at 1920 x 1080: sky strip, grass, road,
  scenery, and a marker on each of the nine build plots. It was `Map_1.svg`
  until an early upload; the tool follows the artist's filename rather than the
  other way round.
- **`Map_2.svg`** — the second stage, the same size and the same conventions.
- **`Map_3.svg`** — the third: **two roads that never meet**, each with its own
  entry on the left and its own exit on the right, and ten markers. Six ways in
  altogether, three lanes on each road.
  Two roads come in from the west and merge before the keep, and it has nine
  markers of its own.
- **`Plot_Marker.svg`** — one plot marker on its own, on a 1024 square canvas as
  of the last redraw. The space in the name is fine; `src/assets.js` asks for it
  as `Plot_Marker.svg`, because a raw space is illegal in a URL.

  This file is quietly the most useful one in the project, because it is the only
  asset whose correct game size is known independently: the same marker is
  painted into `Map_1.svg`, which is authored at the board's own scale. When the
  towers moved to a 1024 canvas and it was not obvious whether they should be
  read at the shared `SCALE` or half of it, this is what settled it — at the
  shared `SCALE` the standalone marker lands within 2.5% of the painted one, so
  1024-at-`SCALE` is the artist's convention. `tools/split-map.mjs` prints that
  percentage on every run. **If it ever drifts far from zero, the canvases have
  stopped agreeing and every 1024 asset is the wrong size.**
- **`Gold.png`, `Life.png`** — the two HUD icons, at the top of the screen.

One derived file per board is generated from them and committed:

- **`Map_1_base.svg`**, **`Map_2_base.svg`**, **`Map_3_base.svg`** — the board
  with its markers cut out.

`node tools/split-map.mjs assets/map/Map_2.svg` writes one, and never touches the
hand-drawn files. With no argument it does map 1. The tool finds which level a
file belongs to by matching the `src` recorded in `src/data/level*.js`, so a new
map needs its level file to exist first, even with an empty plot list.

> **THE GAME DRAWS `Map_1_base.svg`, NOT `Map_1.svg`** — and `Map_2_base.svg`, not
> `Map_2.svg`. Uploading a redrawn
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
  either — it has no fixed resolution. `Map_1.svg` is 1920 x 1080 with a
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

**The top of the board is the HUD, and there is nothing behind it any more.**
`Map_1.svg` used to paint a sky-blue strip across the top — 126 map units, 63 game
px — with the gold/lives/wave text drawn onto it. That strip has been removed and
the board is grass to the top edge, so the readouts and the two controls now sit
directly on grass and road.

They survive it. The text carries a dark drop shadow for exactly this case, the
control plates are translucent dark, and `node tools/hud-clear.mjs` checks that
no plot can push a building up behind a number. But nothing owns that background
now, and if a dashboard panel is wanted it belongs in `assets/ui` rather than
back in the map: a panel painted into the board cannot be dimmed, moved or
hidden, and the title screen dims everything else.

If a strip does come back here, keep it dark. Pale would fight the text.

`tools/hud-clear.mjs` had a stale fourth text run in it — the "Tap a plot to
build" hint, deleted when the dashboard controls arrived — which was reporting a
plot as sitting behind text that had not been drawn for weeks. The runs are
measured from the real layout now.

**The road has to run edge to edge.** Enemies walk the polyline in
`src/data/level01.js`, which is traced from the painted road, so the drawing
decides the level. The road must reach both the left and the right edge of the
canvas — enemies spawn off-screen at one end and leak off-screen at the other. A
road that stops in the middle of the board has nowhere for them to come from.

Draw plot markers wherever you want towers. Their positions are read straight
out of the drawing, so they line up exactly, and there is no longer any nudging
between what you paint and where the game puts them.

**The board is painted in perspective, and one rule now follows it.** A REACH —
tower range, barracks rally leash — is a patch of ground, so it is an ellipse
flattened to 62%, both drawn and measured. `src/ground.js` holds the shape once
and the drawing, the targeting test and the rally clamp all go through it.

Everything else is still flat screen pixels: path lengths, unit speeds, collision
radii, melee reach. Those are distances between two things standing on the
ground rather than areas of it, and they read fine unforeshortened.

That 62% is deliberately rounder than the ground you paint. The dirt ellipse
under a plot marker is 193 x 89, so the artwork's own foreshortening is about
46%, and the tower shadows agree with it. A ring at 46% was tried and is not
playable: it leaves plot 0 covering **0%** of the road at tier 1 range and needs
150 range before a barracks there can reach the road at all, which kills the
vertical axis of the whole level. 62% reads as the same ground and still lets a
plot above the road be worth building on.

The history is worth keeping, because both halves were reported as bugs. First
the ring was drawn squashed while the rules used plain round distance, which left
a 57px band above and below every tier 1 tower that was outside the ring and shot
at anyway — an enemy there had its head inside the ring and its shadow outside,
so the tower read as aiming at heads. Making the ring round fixed that and lost
the 3D. Squashing the rule instead is the version that keeps it, and it cost a
rebalance: see below.

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

**That knob had almost run out of room, and then got a lot of it back.** The band
where the invariant holds was 745 to 765 — 20 wide, where the previous one was 80
— with the best build scraping home on 2 lives out of 20. Making reach elliptical
and letting barracks men gang up widened it to 755..2200 and beyond, because the
two changes push the level's two failure modes apart: the ellipse costs archery
38% of its covered area, which puts "archery alone wins" far out of reach, while
the assist makes a mix stronger. The heavy sits at 1500 in the middle of that.

The same widening shows up in how many builds work. Before those changes **4 of
448** six-tower builds cleared the level, which is a puzzle with one answer and
is why a single marker moving 150px once took it to zero. It is **33 of 448**
now: still 7%, still a level you have to think about, no longer a level one
redraw can delete. Run `node tools/sweep.mjs` after any map change and read that
count as well as the invariant.

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


## Two things every new map needs extracted

A board is not playable until two lists have been read off it. Both have tools,
and both should be re-run after any redraw rather than hand-edited.

**The road**, by `node tools/trace-road.mjs assets/map/Map_2.svg`. It reads the
single filled road shape straight out of the SVG — no rasteriser, there is no
image decoder in this project — builds a mask, and walks the ridge of the
clearance field from each entry to the exit. One route per entry, so a forked
road comes out as two routes that agree about the stretch they share.

It also prints how much road there is either side of the line at its narrowest,
which is the number the lane offsets in `src/route.js` have to fit inside: 32px
on map 1, 40px on map 2.

**The plots**, by `node tools/split-map.mjs assets/map/Map_2.svg`, which is the
same command that writes the base. They come out in road order — on a forked map
that means by how far each still is from the keep — because a plot index has to
mean something: `tools/sim.mjs` picks plots by number.

## The exporter does not always write transforms the same way

Map 1 has its shapes' coordinates baked in; **map 2 puts a `transform` on each
`<path>` element**. The reader in `tools/svg.mjs` handles both, and did not at
first — reading only group transforms put map 2's road at x -1935..154 on a
1920-wide canvas, and the tracer reported a road that never reached the right
edge. If a new map produces geometry that is wildly off the canvas, this is the
first thing to check.

## A shorter road is a much easier map, and it has to be paid for

Map 1's road is 1804px long. Map 2's are about 1060 each and map 3's about 1060
too. The same enemy is under fire for 59% as long on the short maps, and the six
towers that hold map 1 lose map 2 by wave 4.

**This used to be settled by `march`** — a per-level multiplier on every enemy's
speed, which map 2 carried at 0.62 so that one shared wave table could serve two
maps. `march` is gone. A Thug walks at 70px/s on every map now, because a unit's
speed should be a fact about the unit, and each map carries **its own wave
table** in `src/data/waves.js` instead: `waves`, `wavesFork`, `wavesLong`.

So the treatment for a new map is: trace it, sweep it with
`node tools/sweep.mjs <n>`, and tune **its own table** until the share of builds
that clear it matches the others. Not starting gold, which was tried from 220 up
to 620 on map 2 and never bought a single win — and on map 3 moves the share by
only 6 points across a 40-gold swing. The lever that works on a short road is
the HEAVIES: they are slow, so they are the part of a wave that a short road
gives the least time to shoot at, and one step on the heavy ramp is worth more
than a fifth off every militia group. Both short maps have now said so.


## A map with separate roads

Map 3 is the first with two roads that do not join. Almost nothing in the code
needed to know — a route is a list of waypoints and the game already had a list
of routes — but two tools did:

**`tools/trace-road.mjs` pairs each entry with its own exit.** It used to grow
one cost field from `exits[0]` and walk every entry down to it, which is right
for a single road and right for two that merge. On two roads that never touch,
a field grown from one road's exit cannot reach the other road at all, and the
tool reported "an entry cannot reach the exit" on a map whose roads are both
perfectly connected. The pairing is by vertical order and it is exact rather
than a guess: two roads that do not cross cannot swap which one is the upper.
**If a map ever has roads that DO cross, this is what will be wrong**, and it
will say so rather than trace something plausible.

**`tools/formation.mjs` reads the road out of this file now.** It used to
compare each soldier's distance from `routes[0]` against a `ROAD_W / 2` constant
in render.js — a fossil from when the road was drawn in code. That number is map
1's width, so maps 2 and 3 were being checked against the wrong road and only
ever against the first of them. It tests the artwork directly now, with the same
point-in-polygon `trace-road.mjs` uses, over every map and every route.

Keep the roads the same **colour** (`#ffde9e`) whatever their shape: both tools
find the road by that fill and neither guesses.

## Markers have a ceiling, and map 3 had three at it

Three of map 3's ten markers were painted at y 159 to 163 in game space, which is
8 to 12px above the highest marker on either other map — and map 1's highest
already clears the HUD by exactly one pixel. A tier 2 archery tower on any of
them reaches up behind a HUD control.

`node tools/hud-clear.mjs` checks every plot of every map and prints the minimum
y each one needs. Two were nudged down 11px and 7px in `src/data/level03.js`,
which is invisible on the board. The third, at (804, 163), **could not be fixed
in the data at all**: it needed y >= 214 to clear the description panel, 214 was
tarmac, and every sideways move either stayed under the panel or landed within a
marker's width of its neighbour.

**The redraw fixed it, and how is the useful part.** The marker itself only
moved to (853, 200), which is still 14px short. What made it fixable is that the
NORTH ROAD MOVED OUT FROM UNDER IT — the tarmac at that column now starts at
y 237 instead of around 190 — so y 214 is grass with the marker's dirt patch
ending flush against the kerb. When a marker is boxed in near the HUD, moving
the road can be the easier fix than moving the marker.

**So keep new markers at y >= 170**, and further down still if they sit under the
description panel in the top right — that one needs y >= 214, which also means
leaving that column of road low enough to make room. It is worth re-running
`hud-clear.mjs` after any map redraw for exactly this reason.

## Re-running the splitter is not optional after a redraw

`assets/map/Map_N.svg` is the artist's file, markers and all.
`assets/map/Map_N_base.svg` is what the game draws — the same picture with the
plot markers removed — and it is **generated**, by
`node tools/split-map.mjs assets/map/Map_N.svg`.

Uploading a new `Map_N.svg` without re-running the splitter leaves the game
drawing the old board. Deleting `Map_N_base.svg` without re-running it leaves the
game drawing **nothing**: `src/assets.js` points at the base file, and a missing
map falls back to flat green.

The same command prints the plot positions to paste into the level file, so
there is no version of "redraw a map" that does not start here.
