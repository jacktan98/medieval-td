# Map artwork

Hand-drawn files live here, all authored, never generated:

- **`Map_1.svg`** — the first board at 1920 x 1080: sky strip, grass, road,
  scenery, and a marker on each of the nine build plots. It was `Map_1.svg`
  until an early upload; the tool follows the artist's filename rather than the
  other way round.
- **`Map_2.svg`** — the second stage, the same size and the same conventions.
- **`Map_3.svg`** — the third: **two roads that never meet**, each with its own
  entry on the left and its own exit on the right, and **eleven markers** as of
  the latest upload. Six ways in altogether, three lanes on each road.
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
The two HUD icons that once sat here are in `assets/ui` now, under the names
`Gold_Icon.png` and `Life_Icon.png`, which is where the rest of the dashboard
lives. Nothing in this folder is drawn over the board's edge any more: it holds
the hand-drawn boards and the files derived from them, and nothing else.

One derived file per board is generated from them and committed:

- **`Map_1_base.svg`**, **`Map_2_base.svg`**, **`Map_3_base.svg`** — the board
  with its markers cut out.

`node tools/split-map.mjs assets/map/Map_2.svg` writes one, and never touches the
hand-drawn files. With no argument it does map 1. The tool finds which level a
file belongs to by matching the `src` recorded in `src/data/level*.js`, so a new
map needs its level file to exist first, even with an empty plot list.

### A board may be drawn in layers instead of one file

Stage 1 is, and any board may be. Name the files `<Board>_Layer_1.svg`,
`_Layer_2.svg` and so on — the **same 1920x1080 artboard** in each, so stacking
them is stacking, with no offsets — and set the level's `src` to the **stem** with
no extension:

    src: 'assets/map/Stage_1_Map',

Every tool that reads a board goes through `readArtwork` in `tools/svg.mjs`, which
reads one file or stacks the layers as needed. Nothing else in the game or the
tools knows the difference, and `node tools/split-map.mjs assets/map/Stage_1_Map`
runs exactly as it does for a single-file board.

**The road and the plot markers may live in any layer** — the tool finds them by
what they are, not by which file they are in: the markers by matching
`Plot_Marker.svg`'s proportions, the road by its fill. On both Oakland boards they
are in **layer 1**, along with the ground colour.

**The road may be drawn in several overlapping pieces.** Stage 2's is: a junction
of two arms, four shapes with the join painted over twice. They are unioned, not
XORed — an earlier version even-odded every ring at once, which read each overlap
as a hole and reported a road that reached no edge of the map.

**A road may enter from any edge, and it exits on the right.** Stage 2 has one arm
coming down from the **top** and one in from the west; they merge at the junction
and leave east. Every mouth that is not on the right-hand edge is a way in, and the
level gets one route per entry. The right edge is the keep, always — that is the
convention the tracer is built on, and the thing to revisit if a board ever wants
its keep somewhere else.

**The layers stack in numeric order, so a higher number draws on top.** That is
the only thing the order decides, and it is worth getting right in the drawing
rather than in code: stage 1 shipped once with the road above the buildings, and
two houses beside the road came out with the road paved across their walls.
Ground first, then the road and its markers, then everything that stands on
them.

### What a figure can walk behind

**The top layer is the one that stands up**, and the tool treats it specially. It
copies the WHOLE layer onto a transparent sheet, `<Board>_front.svg`, and prints
the box of every shape in it taller than 30 game px, to paste into the level file.
The game draws those boxes a second time, sorted into the same depth pass the
towers and the soldiers are in, at the bottom of each box.

That is what makes a soldier standing behind a house get covered by its roof
instead of drawn on it, and what makes him show through it at a third alpha rather
than vanishing — the same way a barracks already treats anyone standing behind it.
**The bottom of a thing's box is its shadow**, and its shadow is what decides which
side of it a figure is on, so a drawing whose shadow does not sit at the bottom of
its box will sort at the wrong depth.

**Nothing is cut out of the base and nothing is re-sorted.** The sheet is the whole
layer in your own drawing order, so a slice of it carries whatever you drew on top
of that building — the little man at the tavern door comes with the tavern and
stays in front of it. Between two pieces of artwork the second draw changes
nothing; the only thing it can get in front of is a figure the game is drawing.

Two earlier versions each broke that man, and both are worth knowing because both
looked right until he was looked at. The first redrew the building alone and put
its wall back over him. The second lifted the layer out of the base and sorted
every piece of it by its own shadow, which put him behind the tavern — his shadow
is four pixels further back than its, true to the rule and not to the drawing.

What this asks of the drawing:

- **Put anything that stands up in the top layer.** Flat things may live there too
  — road stones, dirt, the buckets by a door — and they simply do not get a box;
  they stay part of the board and ride along on whatever building they were drawn
  over. What must NOT be there is a flat thing taller than 30px, which would get a
  box and become a wall a soldier could hide behind.
- **Keep a clear gap around 30px.** The tool refuses rather than guesses if the
  shortest standing thing and the tallest flat one both sit near that line, since a
  threshold picked in the middle of a crowd will silently take a rock or drop a
  house. Stage 1's is 44 against 21, stage 2's 65 against 21, stage 3's 56 against
  21 and stage 4's 51 against 23.
- **A standing thing may be drawn as several overlapping pieces.** The tool groups
  them: a cluster grows from a shape OVER the line and swallows anything overlapping
  it, so the stack of planks at stage 4's forge — four sibling paths, two just under
  30px and two just over — comes through as the one 51px object a player sees, and
  the props leaning on a building come through inside the building's box.

  **Flat things that overlap each other stay flat.** A cluster only ever grows from
  a standing seed, so no pile of road stones can add up to a wall. The first version
  of this merged any two overlapping boxes and did exactly that on stage 3 — two
  22px props became a 34px "building" — which is the mistake this whole section
  exists to prevent, made geometrically instead of by threshold.

> **THE GAME DRAWS `Map_1_base.svg`, NOT `Map_1.svg`** — and `Map_2_base.svg`, not
> `Map_2.svg`. Uploading a redrawn
> board changes nothing on screen until that command is run. This has caught us
> out on four of the last five map uploads — three times because the upload
> deleted the derived file, once because it left a stale one in place. If a
> change to the board does not appear, this is why, before anything else.

## The HUD icons are not world art

`Gold_Icon.png` and `Life_Icon.png` — in `assets/ui`, see above — are the only
artwork in the project deliberately NOT
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
of it, and the text carries a shadow.

**A control is a failure; a panel is a note.** Those are the two kinds of HUD a
tall tower can reach, and they are not the same problem. The pause, speed and
wave plates are things the player taps, and a building standing inside one with
its border drawn across it has no reading that looks intended. The info panel is
not tapped: it appears while something is selected, describes it, and goes away.
So `node tools/hud-clear.mjs` fails on the first and reports the second with the
depth in pixels.

That line was drawn where it is because of what the alternative costs. **A marker
is where the artist painted it, and the game does not get to nudge it.** Map 3's
plot 8 was pushed 14px down the board to keep a watchtower's roof out of the info
panel; the marker's dirt patch is 46px deep, so 14px put its lower edge on the
road's kerb, and that was reported from a screenshot within a day — where nobody
had ever mentioned a roof behind a panel. Where the HUD *can* move it moves
instead: the button row now starts at 415 rather than 405, which is what let map
3's plot 3 go back to its painted y as well.

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

Three of map 3's markers were painted at y 159 to 163 in game space, which is
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

## A marker added or removed is a re-extraction, not an edit

`tools/split-map.mjs` refuses to run when the number of repeated shapes in the
artwork does not match the number of plots in the level file. That is deliberate
and it is the right way round: the artwork is the source of truth, so a mismatch
means the DATA is stale, and the tool would rather stop than write a base map
whose markers do not line up with the game's plot list.

So the order for an upload that gains or loses a marker is:

1. Put a placeholder into the level's `plots` array so the counts agree — any
   coordinates at all; they are about to be overwritten.
2. `node tools/split-map.mjs assets/map/Map_N.svg`. It rewrites `Map_N_base.svg`
   and prints every plot in ROAD ORDER, ready to paste.
3. Paste the whole list. **Do not merge it into the old one by hand.** Plots are
   stored in road order, so a marker inserted in the middle shifts every index
   after it — the eleventh marker went in at index 2 and moved eight of the other
   ten down one. Every plot index in `tools/sim.mjs` points somewhere else after
   that, which reads exactly like a balance collapse and is not one.
4. `node tools/trace-road.mjs` too, if the roads moved. On the eleven-marker
   upload they had not: 1049 and 1068px against 1049 and 1069 before it.
5. `node tools/hud-clear.mjs`, `node tools/formation.mjs`, `node tools/siege.mjs`
   — all three walk every plot of every map and all three answer questions a new
   marker can break.
6. Re-sweep and re-paste `tools/sim.mjs`'s scenario list for that map.

## The world map is a different kind of file, and it comes in layers

`Overview_Map_Layer_1.svg` up to `Overview_Map_Layer_9.svg` are the campaign map —
the world the player picks a stage from before any game starts — and almost
nothing above applies to them. There are no plots on them and nothing is ever
taken away.

**They are layers, not tiles.** Every one is the same 1920x1080 artboard, so
stacking them is stacking: no offsets, no arithmetic, and a shape never has to
move when the split is reorganised. They exist because the map got detailed enough
to make Graphite struggle, and the split costs the game nothing. Add another by drawing
it and giving it the next number in the sequence; the tool sorts by that number
rather than by the string, so a tenth layer lands after the ninth rather than
after the first.

**Layer 1 is the guide and is not part of the picture.** It holds the road and the
ten stage markers on a plain green field. All the geometry is read off it, then it
is dropped — everything except its background, which is the grass every other
layer sits on and the only opaque ground in the stack.

**The names layer is not part of the picture either.** It is found by its colour
rather than by its number: a layer every shape of which is `#fff5e1` is lettering.
It is pulled out and written to its own file, because the game multiplies a sheet
of parchment over the map and the names have to be *exactly* as drawn — no grain,
no stain, and above all no vignette, which had one name sitting in the dark corner
of the map looking like a different colour from the rest. The only place a name can
be untouched by the sheet is on top of it, and the only way to be on top of it is
not to be in the picture underneath. Draw the names in that colour and in a layer
of their own and nothing else is needed.

**One colour is held out of the recolour: `#ffd700`, gold leaf.** The muting exists
to put every surface on the map into one range under one light, and gold is not a
surface being lit — it is a thing that shines. The cross on the temple at Dawnford
came through the same desaturation as one more shade of the tan roof it stands on.
Draw anything meant to catch the light in that exact gold, as a fill or a stroke,
and it reaches the player untouched.

Everything else is the picture, drawn in the order it is numbered.

Files beside them are **DERIVED and committed**, and none should ever be edited by
hand:

- `Stage_1_Map_base.svg`, `Stage_2_Map_base.svg`, `Stage_3_Map_base.svg` and
  `Stage_4_Map_base.svg` — the four drawn boards with their plot markers cut out,
  written by `node tools/split-map.mjs assets/map/Stage_1_Map` and the same for the
  other three. Note the **stem**: all four are drawn in layers, so the command names
  `Stage_1_Map` rather than a file. Same pipeline as `Map_N_base.svg` otherwise.
- `Stage_1_Map_front.svg`, `Stage_2_Map_front.svg`, `Stage_3_Map_front.svg` and
  `Stage_4_Map_front.svg` — **the things on those boards that stand up**, on a
  transparent sheet of the same artboard. The same command writes them. See "What a
  figure can walk behind" below.
- `Overview_Map_merged.svg` — every layer stacked into one, in colour, guides
  included. Nothing loads it; it is there to look at.
- `Overview_Map_sepia.svg` — the picture layers in browns, with the guide and the
  names dropped. **This is the one the game loads**, under the key `overview` in
  `src/assets.js`.
- `Overview_Map_names.svg` — the names alone, in the colour they were drawn, on no
  ground at all. The game draws it over the parchment, under the key
  `overviewNames`.
- `Rally_Flag_pole.svg` and `Rally_Flag_cloth.svg` — the flag planted on the
  furthest stage reached, cut out of `Rally_Flag.svg` by `node
  tools/split-flag.mjs`. Two files because **the pole does not wave with the
  cloth**: whatever transform makes a drawing flutter applies to all of it, so the
  pennant is bent about the mast and the pole is drawn flat. Both carry the SAME
  viewBox, cropped to the two paths together, which is what puts the cloth back on
  the mast with no numbers lining them up.

  The tool finds the two paths **by colour** — `#74592e` is the pole and `#055dab`
  is the cloth — so a redraw may reorder them freely but must keep those two fills.
  It prints the anchors `src/overview.js` holds as constants, and
  `node tools/campaign.mjs` re-measures the drawing and fails if they drift.

Run the tool after every redraw of any layer:

    node tools/overview.mjs

It also writes `src/data/overview.js`, and `node tools/campaign.mjs` checks the
whole lot against the layers afterwards.

### What the tool reads out of the guide

- **The ten stage markers**, the paths filled `#d30000`. Bounding-box centres
  become the stage positions.
- **The road**, the stroked paths — on the guide, a path with no fill is road.
  One line per stage.
- **Which road leads to which marker**, by matching line ends to marker centres.

### Three things the guide has to keep doing

**A road leg is one stroked line, drawn end to end.** Ten lines for ten stages,
each running from one marker to the next. Nothing is measured off its width and
nothing is stitched: the tool flattens the curve and that is the road. Draw it as
a single path per leg and it will be followed exactly.

*This is worth knowing because it used to be the hardest part of this tool.* The
road was a filled ribbon — which is what a road looks like on a map — so the line
down the middle had to be recovered by pairing the two sides of the outline and
averaging them. The ribbon came in pieces, so the pieces were chained end to end.
The chains overlapped where they joined, and an overlap sends the line backwards,
and the trail is spaced by arc length, so a backwards stretch dropped two dots on
top of each other. That needed a pass to remove reversals — which then could not
tell an overlap from a switchback the artist meant, and ate one. Four hundred lines
and five tuned constants, all answering a question one stroke of a pen answers
better. **Do not go back to ribbons.**

**A line's end counts as arriving at a marker within 36px.** Every end in the
current drawing lands within 24. Nothing else has to line up.

**Exactly one line may have a loose end going nowhere.** That is the road arriving
from off the left edge, and it is what the game draws before stage 1 exists — the
animation a brand-new player sees. The tool identifies it by elimination and stops
if there is more or less than one.

### What has not been reached is drained of colour

The game shows the drawing **in colour only where the army has been**. The country
beyond the road keeps most of its brightness and loses its greens and greys to a
flat brown, and every stage cleared pulls more of the map back into colour.

Two things follow, and both are about the drawing rather than the code:

- **The whole map is visible from the first load unless something holds it back.**
  Every mountain and every name is drawn before the campaign starts, so a player on
  stage 1 could otherwise see the corner they reach ten stages later. This is what
  turns that into something to earn.
- **It is a colour drain, not a shadow.** The first version was a dark wash and it
  was too heavy; halving its strength halved the only signal it had, and the lit
  pocket stopped being findable. Draining the colour instead means the difference is
  what KIND of picture the far country is rather than how much light is on it, so
  brightness is free to be whatever reads best. The unexplored land is plainly still
  a place — you can see it is a desert, you can see the forest.

- **It fades, it does not stop.** The colour leaves the drawing over about 120px,
  which is wider than the 69px the light reaches from the road. A shorter fade puts
  a rim around the explored land and turns the whole thing into a spotlight.

Nothing has to be drawn for it. It follows the road, so a leg drawn anywhere brings
its own surroundings back into colour.

### The map moves a little

`src/motion.js` holds three ambient effects, each with its own switch at the top of
that file:

- **The water running.** The river round Dawnford flows **east to west**; Serene
  Peak runs **south, eleven degrees west**. Both are single constants in degrees
  (`RIVER_FLOW`, `FALLS_FLOW`, canvas reckoning: 0 east, 90 south), so redirecting a
  body of water is one number.
- **Birds**, a pair drifting across every so often and gone again.
- **A road pulse**, a light running up the last leg to the flag every few seconds.
  This one is not decoration: it says which way to go.

Removing the lot is deleting the file plus one import and three calls in
`src/overview.js`.

**There were cloud shadows and they are gone.** Four soft brown ellipses drifting
across the land — the map had to be diffed frame against frame to prove they were
working, which is its own verdict on a shadow drawn over a drawing this dense.

What it asks of the drawing: **nothing**. The water is found by its colour in the
muted map, so rivers and waterfalls drawn anywhere shimmer without being marked up.
Two things follow that are worth knowing:

- Anything **drawn on top of the water** — the four bridges — is correctly left
  alone, because the colour key only finds water that is still visible.
- The **waterfall** is the exception to motion staying inside explored country. It
  is at Serene Peak, which the road never reaches, so under the fog it would be
  frozen for every player for ever. Water is drawn over the fog instead; see
  `WATER_THROUGH_FOG` in `src/motion.js` to put it back under.

### Sun on one side of the edge, dark on the other

The reached country is drawn **brighter than the artwork** and the unreached
**much darker**, from one lit shape: the sun is a brightened copy of the map cut to
it, the fog a drained copy with it punched out. Opening the gap from both ends is
what stops either half having to carry the whole distinction — the trap this fell
into twice, once when darkness was the only signal and again when one brightness had
to be both dim enough to read as unexplored and bright enough to look at.

The names are in the fog but not in the sun. A region nobody has reached should not
announce itself, but in lit country a name is still the artist's own pixels.

The edge **fades** rather than stopping: the colour leaves the drawing over about
120px, wider than the 96px the light reaches from the road. A shorter fade puts a
rim around the explored land and turns the whole thing into a spotlight.

### Stage 1 is a tutorial and has its own rules

Stage 1 — `Stage_1_Map_Layer_1.svg`, `Stage_1_Map_Layer_2.svg` and
`Stage_1_Map_Layer_3.svg` — is the first board a player sees, and everything about
it is the simplest version of itself: one road with no fork, five plots, five
waves, and two kinds of enemy in the whole level. `maxTier: 2` in `src/data/level00.js` caps the
tower ladder — the rungs above tier 2 are drawn and priced as normal and simply
have nowhere to go, so they read as "Maxed", which is already how the menu says a
tower has topped out.

It also runs the **same five waves at either length**. Every other board's Extended
table is at least two waves longer; a longer tutorial would be the same lesson
twice, and `tools/preview.mjs` and `tools/admin.mjs` both know about the exception.

### Stage 4 is the workshop, and three ways to reach it

`Stage_4_Map_Layer_1.svg`, `Stage_4_Map_Layer_2.svg` and
`Stage_4_Map_Layer_3.svg`. **Three roads in and one out**: two down out of the trees
at the top and one in from the west, meeting above the workshop. The road is 55px at
the median, the widest of the four boards, which is why five of its nine plots read
`FAR` at the splitter's 95px threshold — a plot set the same distance back from the
kerb is further from the centreline a tower measures against. All nine cover a real
share of the road; `tools/siege.mjs` is what says so.

**Half the wave comes up the west road** and the two top roads share the rest, dealt
from a shuffled bag rather than rolled per enemy — see `entryMix` in
`src/data/level06.js`. The north-east road reaches the gate 315px sooner than the
west one, so an even three-way split is not an even fight.

It opens with a **Ground Ballista** standing on the middle plot — the Ballista
Turret's machine and animation with no stone under it. It is not a rung on the siege
ladder (it lives in the family's `extra`), so nothing can offer it for sale: sell it
and the plot goes back to being an ordinary one.

**This board taught the splitter to cluster.** The stack of planks by the forge is
four sibling paths lying on each other; measured one at a time, two fall just under
the 30px line that tells a building from a road stone and two fall just over it, so
the tool refused the board rather than pick a threshold inside that crowd. It groups
a building's own parts into one thing now — a cluster grows from a STANDING seed
only, so no pile of flat props can ever add up to a wall.

### Stage 3 is the approach to a town

`Stage_3_Map_Layer_1.svg`, `Stage_3_Map_Layer_2.svg` and
`Stage_3_Map_Layer_3.svg`. Eight plots, and one of them stands further back than
the rest: plot 6 is 131px off the tarmac where the splitter starts calling them FAR
at 95. That is the plot the board opens with a tower already on, and a Crossbow
Sentry out-ranges the gap.

**This section used to claim the road was "128px at the median and 384 at the
gate", three times the width of the boards before it. That was wrong** — it was the
road blob's bounding box, not the corridor. `node tools/trace-road.mjs` measures the
corridor and reports 44px at the median and 126 at its widest, against stage 1's 44
and 100 and stage 2's 48 and 141. Run the tool rather than trusting a number in
prose, this section included.

**Its road is a roundabout, and both arms are walked.** One mouth on the left, one
on the right, and a grass island with a statue painted on top of the tarmac between
them — so `tools/trace-road.mjs`, which walks the path between a pair of mouths,
found a single route and took the southern arm. That left the northern arm as road
nobody used and the four plots ringing the island covering 8% and 4% of the road,
which `tools/siege.mjs` refuses under 10%. `src/data/level05.js` carries **two
routes** now, sharing their first three points and their last three and differing
only in which side of the island they pass; an enemy picks one at random when it
spawns. Every plot on the board covers 25% to 39% of the road.

It opens with a **Crossbow Sentry** already standing on its top-right plot, with no
abilities bought — `prebuilt` in `src/data/level05.js`, named rather than numbered
because archery has two tier 4s and a number cannot say which.

### Stage 2, and the three testing boards behind it

Stage 2 — `Stage_2_Map_Layer_1.svg`, `Stage_2_Map_Layer_2.svg` and
`Stage_2_Map_Layer_3.svg` — is the first board that is a game rather than a lesson:
two roads in, one out, no tier cap. It also opens with a **tier 3 barracks already
standing** on its top-right plot, which is `prebuilt` in `src/data/level04.js` — an
ordinary tower in every other respect, sellable and rallyable, refunding what the
same ladder would have cost.

The three older boards moved down to stages 3, 4 and 5. A stage's board is the
order of the `levels` array in `src/level.js` and `LEVEL_OF` in
`tools/overview.mjs`, and nothing else.

### What the game draws on top

None of this is artwork you supply, but it is sized against yours:

- **The stage medallion** is an ellipse at **0.50**, radius 11 — its own
  foreshortening, deliberately not the game's `SQUASH` of 0.62, which is the angle
  all three battle boards are drawn at. A locked stage is a grey face and nothing
  else; the padlock that used to sit in it is gone.
- **The flag** is `Rally_Flag.svg`, split into `Rally_Flag_pole.svg` and
  `Rally_Flag_cloth.svg` so the pole can stand still while the cloth waves. Its pole
  stands in the centre of the medallion.
- **The stars** are radius 10, outlined in the map's own ink at the same weight as
  the medallion, spaced at a multiple of that radius so changing one changes both.

### The dots go on top of everything

There is no depth pass any more. There was one: it worked out which shapes stood
in front of the road, and masked and redrew them over the trail and the medallions
so a building could overlap a dot. The owner asked for the dots on top and moved
the buildings clear of the medallions in the drawing, which is the same answer
reached with a pen — so the pass, its four tuned constants and its argument about
what counts as a bridge are all deleted rather than switched off.

What this asks of the drawing: **keep the buildings off the medallions.** Nothing
in the artwork will be put back on top of anything the game draws.

### The recolour

Every fill and stroke is **muted**, not turned brown. It is two steps, and the
order is the whole trick:

1. Each colour is desaturated towards **its own grey**, which takes the same
   amount of life out of every hue rather than out of the cool ones only.
2. The result is then warmed a little towards a parchment ramp, so it reads as an
   aged map rather than as a photograph with the saturation pulled down.

Outlines are also thinned from the uniform 4px, which at the size the map is drawn
is most of what makes a drawing read as a colouring book.

**Full sepia was tried first and cost too much.** A luminance ramp separates land,
water and sand by tone alone, and on a map with this much in it that is not enough
signal — the rivers came out within a few percent of the grass they run through,
and no ramp adjustment fixed it without flattening something else.

**Blending straight towards brown does not work either.** Brown is the opposite of
blue, so a mix that mutes grass pleasantly destroys water completely: the sea came
out a warm neutral with no blue left in it at all. Desaturating first and warming
second is what keeps water blue and grass green while putting both far enough back
that the gold medallions and the blue flag are the brightest things on screen.

The sea and the waterfall are forced to the same colour on the way in, so one body
of water reads as one substance. Cool hues also get a small push darker, because
blue reads bright to a luminance formula and would otherwise float above the land
it cuts through.

`DESATURATE` and `WARMTH` in `tools/overview.mjs` are the two dials. Raising
DESATURATE walks back towards the old full-sepia map; raising WARMTH walks there
faster and takes the blues first.

### Adding a stage

Draw the marker in `#d30000` and the road to it on layer 1, then re-run the tool.
It reports the new count. The play order is the one decision in
`tools/overview.mjs` that is typed rather than measured — see `ORDER` — because
the road forks and a fork has no inherent order. `LEVEL_OF` beside it says which
markers have a playable map behind them; a marker with none is drawn locked, which
is the normal state for a stage drawn before its board.

### Scenery standing in front of a medallion

The tool also works out which shapes in the picture layers stand nearer the viewer
than each marker — feet lower on the screen — and the game redraws those over the
medallion so a tower beside a stage is not covered by it. **Finding none is normal
and not a fault**: a road running through open country has nothing in front of it,
and the number only goes up when buildings are drawn.
