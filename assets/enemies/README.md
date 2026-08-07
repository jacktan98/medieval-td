# Enemy artwork

One file per entry in `enemyTypes` in `src/data/waves.js`. Only one type exists
today:

| file                  | type key    | notes                          |
|-----------------------|-------------|--------------------------------|
| `Light_Infantry.png`  | `light_inf` | the only enemy in all 8 waves  |

Adding a new enemy means adding both the file and the `enemyTypes` entry, so
tell me the intended hp / speed / bounty when you upload one and I will wire it
and re-run `tools/sim.mjs` to see what it does to the balance.

## Export

- **1000 x 1000**, PNG, transparent background — the same canvas as the tower
  and soldier art. That shared canvas is what keeps every figure at one scale;
  a single `SCALE` in `src/data/towers.js` converts all of it to game pixels.
  Do not scale an enemy to "look right" on its own — draw it at its true size
  relative to a soldier on the same 1000 x 1000 canvas.
- Draw it **standing upright and facing left or right**, not top-down. Enemies
  mirror to face their direction of travel; they are never rotated, because a
  standing figure rotated to face north is a standing figure lying down.

For reference, a light infantryman is currently a circle of radius 8 game px,
and a barracks spearman drawn from `Barracks_Soldier_T1.png` is about 18 px
across the body. Enemies should read as comparable in size to that spearman.

## After uploading

The PNG is used with a trim rect rather than being cropped — `src/data/towers.js`
carries `[x, y, w, h]` into the source image so the exported file is never
modified. I measure that rect from the alpha channel of the file you upload, so
upload first and I will wire it.
