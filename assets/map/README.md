# Map backgrounds

Upload the level 1 background here as **`Level01.png`** or `Level01.svg` (the
name matches `src/data/level01.js`, which owns that level's road and plots).

`Map_1.svg` is the current drawing. It is **not wired into the game yet** — see
"The road has to match the path" below.

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

**The road has to match the path.** Enemies walk the polyline in
`src/data/level01.js` no matter what is painted, and barracks soldiers stand
across it. The road in `Map_1.svg` does not follow it — it is a decorative S
that enters the left edge twice and never reaches the right edge or the keep, so
enemies would walk over grass and off the end of the drawing.

Either trace the road onto the centreline below, or say the word and the level
data gets rebuilt around the drawing instead — that is the better option if the
drawn layout is what you want, but it moves every plot and re-opens the balance,
so it is a deliberate choice rather than something to do quietly.

Current centreline, in 960 x 540 coordinates (double them for a 1920-wide
export):

    -30,268 -> 176,268 -> 176,156 -> 424,156 -> 424,402 -> 700,402
    -> 700,214 -> 990,214

It runs off both edges on purpose so enemies enter and leave off-screen.

Widths, centred on that line: **52** for the walkable surface, 54 including the
rim, 64 for the ground shadow. 52 is not just visual — `ROAD_W` in
`src/render.js` is what `tools/formation.mjs` checks the barracks squad against,
so a narrower painted road puts soldiers on the grass. The road in `Map_1.svg`
is about 125 wide, which is fine on its own but has to be matched in code.

The keep sits at **918,214**.

`Level01_template.svg` is all of the above drawn to scale, for tracing.
