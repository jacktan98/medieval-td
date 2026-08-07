# Map backgrounds

Upload the level 1 background here as **`Level01.png`** or `Level01.svg` (the
name matches `src/data/level01.js`, which owns that level's road and plots).

`Map_1.svg` is the level. The game draws it as the whole board — ground, road
and plot markers — and `src/data/level01.js` is traced from it.

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

**Plot markers are the exception, and they must be painted.** They cannot be
left in the background, because a marker painted into the board cannot be taken
away when a tower is built on it, and the signpost would poke out through the
tower's legs. So paint all nine as you already do, and
`node tools/split-map.mjs` cuts them out for you, writing two derived files that
are both committed:

- `Map_1_base.svg` — the board with the markers removed, drawn once per frame
- `Plot_Marker.svg` — one marker on its own, stamped on each plot that is empty

`Map_1.svg` is never modified. Re-run the tool after any redraw.

The tool finds the markers by looking for the largest set of groups that draw
the *same shape* in different places, then checks that it found exactly as many
as the level has plots. Keep the nine markers identical to each other and it
will keep working; it does not care how the export nests or transforms them.

## Two things that will break if the artwork ignores them

**The top of the board is the HUD.** `Map_1.svg` paints a dark strip across the
top 100 map units (50 game px) and the gold/lives/wave text is drawn straight
onto it — the game no longer paints a bar of its own, so keep that strip, and
keep it dark enough for cream text to read on.

**The road has to run edge to edge.** Enemies walk the polyline in
`src/data/level01.js`, which is traced from the painted road, so the drawing
decides the level. The road must reach both the left and the right edge of the
canvas — enemies spawn off-screen at one end and leak off-screen at the other. A
road that stops in the middle of the board has nowhere for them to come from.

Draw plot markers wherever you want towers. Their positions are read straight
out of the drawing, so they line up exactly. One rule binds: a plot painted
above **y=127** has its archer's head clipped by the HUD, because a tower is
drawn 97 tall from 12 below the plot. The top-left marker is painted at 116 and
the game places it at 127.

## Re-tracing after a redraw

The level data is derived, not hand-written, so a redraw does not mean editing
coordinates. Rasterise the map, isolate the road colour, drop the plot markers,
and walk the ridge of the distance transform from one end of the road to the
other — that is the centreline. `ROAD_W` in `src/render.js` is twice the largest
distance from any road pixel to the grass.

Expect to re-check the balance afterwards: `node tools/sim.mjs`. Tracing this
map made the road longer and better covered by the plots, which was enough to
let a pure-archery build win, and enemy speed had to go from 72 to 88 to put
that back. The invariant to protect is that neither family wins alone.

`Level01_template.svg` shows the old hand-authored layout, kept for reference.
