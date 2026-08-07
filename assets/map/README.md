# Map backgrounds

Upload the level 1 background here as **`Level01.png`** or `Level01.svg` (the
name matches `src/data/level01.js`, which owns that level's road and plots).

`Map_1.svg` is the level. The game draws it as the whole board — ground, road
and plot markers — and `src/data/level01.js` is traced from it.

## Export size, and why 200 was too small

The game draws in a fixed 960 x 540 space, and the canvas backing store is sized
to real device pixels up to 3x (`MAX_SCALE` in `src/main.js`). So:

- **Map: 2880 x 1620** preferred, 1920 x 1080 acceptable. An SVG is better than
  either — it has no fixed resolution. `Map_1.svg` is 1920 x 1080 with a
  matching `viewBox`, which is exactly right.
- **Sprites: 512 x 512.** This is the one that bit us. At 200 x 200 the tallest
  sprite has 185 source pixels and needs 291 on a 3x phone, so it is blown up
  1.57x — which is why the art is soft on a phone and crisp on a laptop. A
  laptop asks for 1x and never upscales. 320 clears it; 512 leaves headroom.

Run `node tools/trim.mjs` to see the upscale factor for every sprite. Anything
that says SOFT will look blurry on a phone.

Changing the export size costs one number: `EXPORT_PX` in `src/data/towers.js`.
Every drawn size stays identical — re-run `tools/trim.mjs` and paste the trims.

## What to paint, and what to leave out

Paint: the ground, the road, the keep, the trees and rocks. Those are drawn in
code today and the background replaces them.

**Do not paint the build plots.** They are drawn per-frame and skipped when a
tower is built or a menu is open, so a painted plot shows through a built tower.
`Map_1.svg` has nine of them painted in, each with a signpost.

## Two things that will break if the artwork ignores them

**The top 40px is covered.** The HUD bar paints over `y 0..40` at 75% opacity.

**The road has to run edge to edge.** Enemies walk the polyline in
`src/data/level01.js`, which is traced from the painted road, so the drawing
decides the level. The road must reach both the left and the right edge of the
canvas — enemies spawn off-screen at one end and reach the keep at the other. A
road that stops in the middle of the board has nowhere for them to come from.

Draw plot markers wherever you want towers. They are read straight out of the
SVG's group transforms, so they line up exactly. One rule binds: a plot painted
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
