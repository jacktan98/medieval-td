# Death artwork

One dead-pose PNG per man who can die on the road, and that is the only new
drawing each of them needs — see "Why only one file" below. All three are in:

| file                        | who dies                       | drawn as    |
|-----------------------------|--------------------------------|-------------|
| `Enemies_Man_Dead_T1.png`   | the militia, every wave        | 27 x 18 px  |
| `Enemies_Man_Dead_T2.png`   | the heavy, waves 4-8           | 53 x 30 px  |
| `Barracks_Man_Dead_T1.png`  | your spearman, tier 1          | 43 x 21 px  |
| `Barracks_Man_Dead_T2.png`  | your spearman, tiers 2 and 3   | 41 x 24 px  |

The tier comes last in these names, matching how they were exported. `assets.js`
was changed to suit rather than the files being renamed — renaming an upload
only means renaming it again after the next one.

## Blood

Two more files here, plus two in `assets/projectiles`:

| file                             | when                        | lasts        |
|----------------------------------|-----------------------------|--------------|
| `Blood_Dead_1.png`, `_2.png`     | the pool a body lies in     | with the body |
| `../projectiles/Blood_1.png`, `_2.png` | every hit that lands  | 0.35s        |

One of each pair is picked at random, so no two hits and no two deaths are the
same picture. The pool's image and its small offset are chosen **once**, when
the body is created, and stored on it — picking either at draw time would make
the pool flicker between the two pictures and crawl about every frame. It has no
lifetime of its own either: it fades with the body, so there is one number to get
right instead of two to keep in step.

**The body is always drawn on top of its pool.** Pools are painted before the
depth pass rather than inside it, which is what guarantees it — sorting a pool by
depth would put it over the body's feet as soon as the random offset pushed it a
few pixels nearer the camera.

Blood is drawn at **`BLOOD_SCALE`, which is 2x the shared `SCALE`** — the one
place in the project where art is not sized by the single scale factor, and the
reasoning is on that constant in `src/data/towers.js`. Short version: the shared
scale exists so figures are sized against each other truthfully, and a splash of
blood has no such truth to respect.

**Drawn size is settled and should not grow.** Spatter about 14px beside a 23px
militia, pools about 40-46px under a 27px body:

| file               | trim                  | drawn   |
|--------------------|-----------------------|---------|
| `Blood_1`          | `[241, 240, 33, 32]`  | 14 x 13 |
| `Blood_2`          | `[238, 239, 36, 20]`  | 15 x 8  |
| `Blood_Dead_1`     | `[207, 241, 98, 30]`  | 40 x 12 |
| `Blood_Dead_2`     | `[200, 243, 112, 26]` | 46 x 11 |

The multiplier was **4x** against the first export and is **2x** now, and the
blood is the same size on screen either way — the art was redrawn at twice the
pixels, so the multiplier came down by the same factor. That is exactly what the
constant is for: how many pixels the drawing has and how big it appears are two
separate decisions, one yours and one the code's, and neither has to disturb the
other.

That re-export bought back most of the sharpness — the upscale at 3x device
pixels went from **2.46x to 1.23x**. `tools/trim.mjs` still prints SOFT, because
it flags anything upscaled at all, but 1.23x on a red blob is not something you
will see. It is not worth another redraw.

The spearman's body is scenery and nothing else. **A dead soldier stops blocking
the instant he falls**: the enemy he was holding is released that same frame and
walks straight over him while the body is still on the ground. There is a check
for exactly this, because "the body still blocks" is the kind of bug that would
look like the barracks being stronger than it is.

## Why only one file

A man on the road has three states, and you only have to draw the third:

| state    | art                          |
|----------|------------------------------|
| standing | the existing PNG             |
| attacking| the existing PNG, moved      |
| dead     | **the new PNG in this folder** |

The attack is not a drawing. The figure lunges toward whatever it is hitting and
settles back, in code, on every swing — **6 game px, the same for both sides of
a fight**. (The enemy's was 4 and read as a flinch next to the spearman's 6.)
That is why there is no `_Attack.png` in the table: adding one would mean
throwing the lunge away and building a frame system, and a single pose cannot
show a swing the way the movement already does.

## How to draw it

**Open the standing PNG, draw the dead pose on top of it, then delete the
standing figure.** That one habit gets the placement right for free, and
placement is the only thing that can go wrong here.

The reason: the game drops the body at the spot the man was standing, and it
finds that spot by looking at where his feet are inside the 512x512 export. So
the body has to be drawn lying **across the point his feet were on**, not
centred on a fresh canvas. Those foot points are:

| file                | feet at, in the 512 canvas |
|---------------------|----------------------------|
| `Enemies_Man_T1`    | x 244, y 293               |
| `Enemies_Man_T2`    | x 228, y 320               |
| `Barracks_Man_T1`   | x 264, y 294               |
| `Barracks_Man_T2`   | x 281, y 313               |

`Barracks_Man_Dead_T2` was drawn about 13px high against that point, which is
why its `deadPivot` sits at the very bottom edge of its own trim and the body
lands ~3 game px further above the death spot than tier 1's does. Small enough
to leave; worth knowing if the next pose drifts further.

Everything else is the same as every other sprite in this project:

- **512 x 512**, transparent background, same as all the other art. One `SCALE`
  in `src/data/towers.js` converts every asset to game pixels, so a body drawn
  on a different canvas size comes out the wrong size relative to everything.
- **Same size as the living man.** A body lying down is about as long as the man
  was tall — roughly 23 game px for the militia, 33 for the heavy.
- **Facing left**, like every other figure. The game mirrors it to match the way
  he was facing when he died, so draw one direction only.
- **No rotation is applied.** Draw him already lying down; the code will not tip
  a standing figure over.

## What the game does with it

The body appears **5 game px behind where he fell**, stays **2 seconds**, then
goes. The last half second fades out — that fade is inside the 2 seconds, not
added to it, and it is there because a body that pops out of existence pulls
your eye to the exact frame it vanishes.

Those 5px are the killing blow throwing him over backwards, and "backwards"
means opposite the way he was FACING — which is where the blow came from, since
both sides of a fight stand nose to nose. It is the same axis the attack lunge
uses; nothing here ever moves up and down. The pool of blood goes back with him,
because the blood under a body belongs to the body. The spatter thrown at the
moment of the hit stays at the fight.

`corpse-test.html` places its bodies directly rather than killing anything, so
the crosshairs there are the pose anchor with no knockback in it — which is what
you want when checking a new drawing. The 5px only happens in play.

Two seconds is *game* time. On 2x from the dashboard a body lasts one real
second, which is deliberate: fast-forward speeds up the whole simulation, and a
body that ignored it would pile up exactly when the road is busiest.

Bodies are decoration and nothing else. Towers do not shoot them, soldiers do not
block on them, enemies walk straight over them, and no rule in the game reads
the list. Balance is untouched.

An enemy that reaches the end of the road leaks rather than dying, so it leaves
no body. That is on purpose — the body is the reward for killing something.

## After uploading

Run `node tools/trim.mjs`, which measures this folder along with everything else,
and paste the rect in as `deadTrim`. As shipped:

| file                       | `deadTrim`            | `deadPivot`      |
|----------------------------|-----------------------|------------------|
| `Enemies_Man_Dead_T1.png`  | `[189, 211, 134, 90]` | `[0.412, 0.906]` |
| `Enemies_Man_Dead_T2.png`  | `[159, 199, 256, 148]`| `[0.270, 0.818]` |
| `Barracks_Man_Dead_T1.png` | `[150, 206, 212, 100]`| `[0.538, 0.884]` |
| `Barracks_Man_Dead_T2.png` | `[169, 198, 201, 116]`| `[0.557, 0.995]` |

`deadPivot` is **not measured off the corpse** — nothing about a body's own
outline knows which end the man was standing on. It is the LIVING figure's feet
located inside the dead trim:

    deadPivot = (livingTrim origin + pivot x livingTrim size - deadTrim origin)
                / deadTrim size

which means it has to be recomputed if **either** export is redrawn, not just the
dead one. All three currently land well inside their own body, which is the quick
sanity check that the pose was drawn in the right place.

Until a file has been measured the game draws the whole 512 canvas instead, which
is already correct if you followed the placement rule — that fallback is what
makes an upload work on its own. Measuring only tightens it.

Then open `corpse-test.html`: every pose, both facings, one mid-fade, with the
living figure of each above it for scale and a crosshair on the spot each man
died. The body must lie **across** its cross.
