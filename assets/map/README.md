# Map backgrounds

Upload the level 1 background here as **`Level01.png`** (the name matches
`src/data/level01.js`, which owns that level's road and plots).

## Export

- **2880 x 1620** preferred, or 1920 x 1080 if file size matters.
  The game draws in a fixed 960 x 540 space and its canvas backing store is
  capped at 3x device pixels (`MAX_SCALE` in `src/main.js`), so 2880 wide is
  the most that will ever be displayed. Anything larger is downloaded and
  thrown away.
- PNG. No transparency needed — this is the bottom layer.

## What to paint, and what to leave out

Paint: the ground, the road, the keep, and the trees and rocks. Those are all
drawn in code today and the background replaces them.

**Do not paint the eight build plots.** They are drawn per-frame and skipped
when a tower is built or a menu is open, so a plot painted into the background
would show through a built tower.

## Two things that will break if the artwork ignores them

- **The top 40px is covered.** The HUD bar paints over `y 0..40` at 75%
  opacity. Detail there is lost.
- **The road must sit on the centreline below.** Enemies walk this polyline
  regardless of what is painted, and barracks soldiers stand across it.

Road centreline, in 960 x 540 coordinates (multiply by 3 for a 2880-wide
export):

    -30,268 -> 176,268 -> 176,156 -> 424,156 -> 424,402 -> 700,402
    -> 700,214 -> 990,214

It runs off both edges on purpose so enemies enter and leave off-screen.

Widths, centred on that line: **52** for the walkable surface, 54 including the
rim, 64 for the ground shadow. 52 is not just visual — `ROAD_W` in
`src/render.js` is what `tools/formation.mjs` checks the barracks squad against,
so a narrower painted road puts soldiers on the grass.

The keep sits at **918,214**.
