# Map artwork

Two hand-drawn files live here, and both are authored, never generated:

- **`Map_1.svg`** — the whole board at 1920 x 1080: sky strip, grass, road,
  scenery, and a marker on each of the nine build plots.
- **`Plot Marker.svg`** — one plot marker on its own, on the same 512 square
  canvas as the sprites. The space in the name is fine; `src/assets.js` asks for
  it as `Plot%20Marker.svg`, because a raw space is illegal in a URL.

One derived file is generated from them and committed:

- **`Map_1_base.svg`** — the board with the nine markers cut out.

`node tools/split-map.mjs` writes it, and never touches the two hand-drawn
files. Run it after every redraw, or the game keeps drawing the previous board.

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

**The top of the board is the HUD.** `Map_1.svg` paints a strip across the top —
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

A tower is drawn 95px tall from 12px below its plot, so a marker painted above
about **y=120** puts a building behind the HUD text. That is no longer fatal —
the header is part of the map, so a tall tower stands in front of it rather than
being cut off, and the text has a shadow — but `node tools/hud-clear.mjs` will
tell you which plots reach the text and by how much. The top-left marker at
y=107 currently reaches it with its flag and tier star only, which reads fine.

## Re-tracing after a redraw

The level data is derived, not hand-written, so a redraw does not mean editing
coordinates. Rasterise the map, isolate the road colour, drop the plot markers,
and walk the ridge of the distance transform from one end of the road to the
other — that is the centreline. `ROAD_W` in `src/render.js` is twice the largest
distance from any road pixel to the grass.

**Moving the markers is a balance change.** Expect to re-check it every time:
`node tools/sim.mjs`. The plots decide how much of the road the archers can
reach, and that is the single biggest lever in the game. The last redraw moved
the markers by up to 36px, which raised coverage from 81% to 83.6% and was
enough to let a pure-archery build win outright — enemy speed went 88 -> 94 to
put it back. Before that it had gone 72 -> 88 for the same reason.

Speed is no longer that lever. The game was deliberately slowed down afterwards
(militia 94 -> 70, archery cooldown 0.75 -> 1.00) and the archers' reach raised
to 150, which made archery strong again; the repair was the tier 2 enemy's hp,
because heavies first appear in wave 4 and so raise the ceiling without touching
the opening. Militia hp is the wrong knob for that — at 110 every build died on
wave 2.

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
