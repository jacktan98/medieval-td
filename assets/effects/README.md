# Effects artwork

Things that are neither a figure nor a building: marks the fight leaves on the
ground. Four files, all 512 x 512 with a transparent background like every other
sprite.

| file                         | when                    | lasts         |
|------------------------------|-------------------------|---------------|
| `Blood_1.png`, `Blood_2.png` | every hit that lands    | 0.35s         |
| `Blood_Dead_1.png`, `_2.png` | the pool a body lies in | with the body |

One of each pair is picked at random, so no two hits and no two deaths are the
same picture.

These used to be split across two folders — the spatters in `assets/projectiles`
with the arrows, the pools in `assets/dead` with the corpses — because that is
where they were uploaded. Neither is a projectile and neither is a body. Put the
next ones straight in here.

Nothing about the move touched a number: `tools/trim.mjs` keys the blood
exception on the FILENAME, not the folder, and re-measured all four to the same
trims they had before. Keep it that way — a folder says where something was
uploaded, a name says what it is.

## They are the one thing not drawn at the shared SCALE

Blood is drawn at **`BLOOD_SCALE`, which is 2x the shared `SCALE`**, and it is the
only exception in the project. The reasoning is on that constant in
`src/data/towers.js`. Short version: the shared scale exists so that figures are
sized against each other truthfully — a soldier is small next to a tower because
that is how tall a soldier is — and a splash of blood has no such truth to
respect. How big it should be is a question about how well it reads.

The multiplier was **4x** against the first export and is **2x** now, and the
blood is the same size on screen either way: the art was redrawn at twice the
pixels, so the multiplier came down by the same factor. That is exactly what the
constant is for. How many pixels the drawing has and how big it appears are two
separate decisions, one yours and one the code's, and neither has to disturb the
other.

## Drawn size is settled and should not grow

Spatter about 14px beside a 23px militia, pools about 40-46px under a 27px body.
Big enough to read, small enough not to be the loudest thing on the board.

| file           | trim                  | drawn   |
|----------------|-----------------------|---------|
| `Blood_1`      | `[241, 240, 33, 32]`  | 14 x 13 |
| `Blood_2`      | `[238, 239, 36, 20]`  | 15 x 8  |
| `Blood_Dead_1` | `[207, 241, 98, 30]`  | 40 x 12 |
| `Blood_Dead_2` | `[200, 243, 112, 26]` | 46 x 11 |

`tools/trim.mjs` prints SOFT for all four because it flags anything upscaled at
all, but the re-export brought that from **2.46x down to 1.23x** and 1.23x on a
red blob is not something you will see. It is not worth another redraw.

## Where they end up on the board

A **spatter** is thrown at the moment of the hit and stays at the fight, at the
wound rather than at the feet — but it is sorted into the depth pass by the
victim's FEET, so a splash never draws over a building the victim is standing in
front of.

A **pool** forms where the body comes to rest, not along the path it was thrown,
and is painted before the depth pass so the body is always on top of it. Sorting
a pool by depth would put it over the body's feet as soon as the random offset
pushed it a few pixels nearer the camera.

`corpse-test.html` shows both against every death pose.
