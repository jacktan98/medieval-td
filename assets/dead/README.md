# Death artwork

One dead-pose PNG per man who can die on the road, and that is the only new
drawing each of them needs — see "Why only one file" below. All three are in:

| file                        | who dies                       | drawn as    |
|-----------------------------|--------------------------------|-------------|
| `Enemies_Man_Dead_T1.png`   | the militia, every wave        | 26 x 18 px  |
| `Enemies_Man_Dead_T2.png`   | the heavy, waves 4-8           | 49 x 30 px  |
| `Barracks_Man_Dead_T1.png`  | your spearman, tier 1          | 42 x 21 px  |
| `Barracks_Man_Dead_T2.png`  | your spearman, tiers 2 and 3   | 40 x 24 px  |

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

The reason used to be that the game found the death spot by locating the LIVING
figure's feet inside the dead export, so a pose drawn anywhere else on its canvas
landed in the wrong place. **That is no longer true, and it is the shadow that
freed it.** A death pose now carries its own grey ellipse, and the centre of that
ellipse is where the body lies — measured from this file alone, by
`node tools/shadow.mjs`, with no reference to the standing sprite at all.

Draw-on-top is still the habit worth keeping, because it puts the body's shadow
where the standing figure's shadow was, and that is what makes a man drop on the
spot instead of hopping sideways as he dies. But it is now a guide rather than a
constraint, and the two exports no longer have to be recomputed together.

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

The body appears **exactly where the living figure was standing**, is **thrown
10 game px backwards over 180ms**, then lies there for the rest of its **2
seconds**. The last half second fades out — that fade is inside the 2 seconds,
not added to it, and it is there because a body that pops out of existence pulls
your eye to the exact frame it vanishes.

"Backwards" means opposite the way he was FACING — which is where the blow came
from, since both sides of a fight stand nose to nose. It is the same axis the
attack lunge uses; nothing here ever moves up and down.

The throw is what makes it read. It was 10px applied instantly and it may as
well not have been there: a body that simply *appears* 10px away has not been
thrown, it has been placed, and the jump away from the living figure is the only
thing the eye catches. The movement is the effect, so the body now starts on the
dead man's own feet and travels, easing out — fastest at the instant of the
blow. Distances and timing are `KNOCKBACK` and `KNOCKBACK_TIME` in
`src/corpses.js`; both are single numbers and safe to retune.

One consequence worth knowing: the throw is a flat distance for everyone, so it
is a smaller fraction of a big figure than a small one — 10px moves a militiaman
half his own width and a heavy barely a quarter. That reads as weight without
any per-enemy number, which is why there isn't one.

The pool of blood does **not** travel with him. It sits where he comes to rest
and fades in as he lands, because blood spreads under a body once it is down —
a stain already on the ground ahead of a body in flight gives the whole thing
away. The spatter thrown at the moment of the hit stays at the fight.

`knock-test.html` freezes one throw at five points, for three sizes of figure,
with a line on the spot each man died on. That is the page to open after
changing either number.

`corpse-test.html` places its bodies directly rather than killing anything, so
the crosshairs there are the pose anchor with no throw applied — which is what
you want when checking a new drawing.

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
| `Enemies_Man_Dead_T1.png`  | `[193, 211, 126, 90]` | `[0.163, 0.753]` |
| `Enemies_Man_Dead_T2.png`  | `[125, 182, 241, 148]`| `[0.135, 0.644]` |
| `Barracks_Man_Dead_T1.png` | `[153, 206, 206, 100]`| `[0.078, 0.697]` |
| `Barracks_Man_Dead_T2.png` | `[158, 198, 195, 116]`| `[0.131, 0.583]` |

`deadPivot` is **the centre of the corpse's own grey shadow**, from
`node tools/shadow.mjs`. Both numbers now come from this file and nothing else.

It used to be derived instead — the living figure's feet, located inside the dead
trim by arithmetic — because a corpse had no shadow and nothing about its outline
said which end the man had been standing on. That coupled the two exports: redraw
either and the number had to be recomputed from both, and forgetting was silent.

Note the shadow sits under the body's mass, which on these poses is the head end,
so the fractions are small — 0.078 across on the tier 1 spearman. That is correct
and not a mistake: the man's weight, and his shadow, end up where his torso does.

Until a file has been measured the game draws the whole 512 canvas instead, which
is roughly right if you drew on top of the standing figure — that fallback is what
makes an upload work on its own. Measuring is what makes it exact.

Then open `corpse-test.html`: every pose, both facings, one mid-fade, with the
living figure of each above it for scale and a crosshair on the spot each man
died. The body must lie **across** its cross.
