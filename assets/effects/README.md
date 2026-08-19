# Effects artwork

Things that are neither a figure nor a building: marks the fight leaves on the
ground, and one it puts in the air. Nine files, all 512 x 512 with a transparent
background like every other sprite.

| file                                 | when                     | lasts         |
|--------------------------------------|--------------------------|---------------|
| `Blood_1.png`, `Blood_2.png`         | every hit that lands     | 0.35s         |
| `Blood_Dead_1.png`, `_2.png`         | the pool a body lies in  | with the body |
| `Artillery_Impact_1.png`, `_2.png`   | every rock that lands    | 0.45s         |
| `Enemies_Plague_Thug_Spill.png`      | every flask that breaks  | 3s            |
| `Construction_Smoke.png`             | a plot is built on, upgraded or cleared | 0.6s |
| `Musketeer_Target_Locked.png`        | a Post picks its Deadeye man | until the ball lands |

## The target mark is the one that is not a stain

Everything else here is something the fight LEFT. The crosshair is something the
fight is about to do: a Musketeer Post that has bought Deadeye picks its man a
second before it fires and paints this over his head, and it stays there until
the ball arrives. See `lock` in `src/data/abilities.js`.

It is drawn at the board's own `SCALE` — 90 source px lands 18 on screen, sharp
at 3x with room — and it floats 12px above the drawn top of the figure, which
clears the health bar that sits at 4 above the head and is 4 deep. It is drawn
after the health bars rather than before, because a warning that can be stood in
front of is not one.

Its life needs no timer, which is worth knowing before adding a second effect
like it: the mark has two owners in turn — the tower during the second of
wind-up, and then the shot itself — and a shot that lands is a shot off the
list, so the mark goes with it.

One of each PAIR is picked at random, so no two hits, no two deaths and no two
rocks are the same picture. Three pairs, three reasons to have two: a catapult
fires at the same bend every three seconds, and one drawing repeated on that
cadence reads as a stamp rather than an event.

The spill is the exception and is a single file, because a plague doctor throws
five flasks in his whole life and no two of them land in the same place. Give it
a second drawing if that ever stops being true.

## The spill lies flat

It is the only mark in this folder anchored at its MIDDLE rather than at the
bottom of its trim. Earth thrown up by a rock is in the air above the point of
impact, so it hangs upward from it; a spill of plague is on the ground the
bottle broke on, like a pool of blood. `IMPACT_LIE` in `src/impacts.js` is which
is which.

**It lasts exactly as long as its poison does — three seconds — and that is not
a look, it is the contract.** While there is plague on the road it is still
working, and when it stops working it is gone. A puddle that outlived its effect
would be a patch of ground that looks dangerous and is not, and the player would
learn to walk their squad around nothing. If the poison duration in
`src/data/waves.js` changes, this changes with it automatically; do not pin it.

These used to be split across two folders — the spatters in `assets/projectiles`
with the arrows, the pools in `assets/dead` with the corpses — because that is
where they were uploaded. Neither is a projectile and neither is a body. Put the
next ones straight in here.

Nothing about the move touched a number: `tools/trim.mjs` keys the blood
exception on the FILENAME, not the folder, and re-measured all four to the same
trims they had before. Keep it that way — a folder says where something was
uploaded, a name says what it is.

## Blood is the one thing not drawn at the shared SCALE

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

## The artillery impact

Earth thrown up where a rock comes down, drawn at **1.6x the shared `SCALE`** —
`IMPACT_SCALE` in `src/impacts.js`.

| file                  | trim                   | drawn   |
|-----------------------|------------------------|---------|
| `Artillery_Impact_1`  | `[198, 221, 116, 70]`  | 39 x 23 |
| `Artillery_Impact_2`  | `[222, 233, 68, 47]`   | 23 x 16 |

That 1.6 is **not** a taste decision like `BLOOD_SCALE`; it is the sharpness
ceiling. A sprite is crisp while its drawn size times the 3x device-pixel cap
fits in its source pixels, so the largest honest multiple is
`1 / (3 * SCALE) = 1.625` — the same number `PORTRAIT_SCALE` is chosen against.
Both files are `sharp` in `tools/trim.mjs` at it. **Do not raise it**: past 1.625
the impact starts being upscaled, and unlike the blood it is drawn on bare road
where softness shows.

It is deliberately **not** the size of the splash. A rock damages everything in
an ellipse 150 to 196 game px across, and drawing earth over all of that would be
a picture of the damage rather than of the impact. The player is told where the
patch is by the shadow under the falling rock, which arrives in time to matter;
this arrives afterwards and only says *it landed here*.

Anchored at the **bottom** of its trim, not the middle — the artist drew a clump
of soil sitting on a line with specks flying above it, so the bottom edge is the
ground and the picture hangs up from the point of impact. Centre it and half the
spray is underground.

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
