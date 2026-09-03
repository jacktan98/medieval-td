# Death artwork

One dead-pose PNG per man who can die on the road, and that is the only new
drawing each of them needs — see "Why only one file" below:

| file                          | who dies                     | drawn as    |
|-------------------------------|------------------------------|-------------|
| `Enemies_Thug_Dead.png`       | the thug, every wave         | 31 x 16 px  |
| `Enemies_Tough_Thug_Dead.png` | the tough thug               | 33 x 16 px  |
| `Enemies_Blocker_Thug_Dead.png`| the blocker thug            | 33 x 16 px  |
| `Enemies_Giant_Thug_Dead.png` | the giant                    | 57 x 25 px  |
| `Enemies_Plague_Thug_Dead.png`| the plague thug              | 57 x 20 px  |
| `Enemies_Archer_Thug_Dead.png`| the archer thug              | 44 x 16 px  |
| `Soldiers_Spearman_Dead.png`  | your spearman, tier 1        | 49 x 17 px  |
| `Soldiers_Pikeman_Dead.png`   | your pikeman, tier 2         | 49 x 16 px  |
| `Soldiers_Swordsman_Dead.png` | your swordsman, tier 3       | 40 x 18 px  |
| `Paladin_Dead.png`            | your paladin, tier 4         | 42 x 17 px  |
| `Assassin_Dead.png`           | your assassin, the barracks' OTHER tier 4 | 38 x 16 px |

Every file is named after the MAN, matching his living drawings in
`assets/units` — `Soldiers_Spearman_Dead` beside `Soldiers_Spearman_Default`,
`Paladin_Dead` beside `Paladin_Default`. `assets.js` is where a name and a key
meet, and it is changed to suit each upload rather than the files being renamed:
renaming an upload only means renaming it again after the next one.

## One body per man, still

Every soldier has two LIVING drawings now — a Default and an Attack — but only
one dead pose, and that is right. A body is a body; what he was doing a moment
before he fell is not visible in it. Nothing in this folder needs to grow when a
new pose lands in `assets/units`.

## Blood lives in `assets/effects` now

All four blood files — the two spatters and the two pools — moved out of here and
out of `assets/projectiles`. See `assets/effects/README.md`. A pool is not a body
and a spatter is not a projectile; they were only ever in those folders because
that is where they happened to be uploaded.

What still belongs here is how a body and its pool go together: **the body is
always drawn on top of its pool**, and the pool's image and small offset are
chosen once when the body is created and stored on it, rather than picked at draw
time — otherwise the pool flickers between the two pictures and crawls about
every frame. It has no lifetime of its own either; it fades with the body, so
there is one number to keep right instead of two to keep in step.

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

It is working: the last redraw touched all four of these files and not one anchor
moved — every trim and every pivot came out identical to the pixel.

The reason used to be that the game found the death spot by locating the LIVING
figure's feet inside the dead export, so a pose drawn anywhere else on its canvas
landed in the wrong place. **That is no longer true, and it is the shadow that
freed it.** A death pose now carries its own shadow ellipse, and the centre of that
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

"Backwards" means opposite the way the BODY faces, and **the body faces whatever
killed it** — not the way the man was walking. A militiaman heading left who
takes an arrow from a tower on his right falls looking right, and is thrown left.

That is a change, and the old rule was visibly wrong in exactly that case: the
body kept its travel facing, so it lay with its back to the arrow AND flew toward
the archer that shot it. Both halves came from one number, so both were fixed by
one change — the throw is derived from the facing, not chosen separately.

The side the blow came from is recorded as `struckFrom` wherever damage is dealt.
An arrow uses the TOWER's x rather than its own, because at the moment it lands
the arrow is on top of what it hit and its position says nothing about where it
was fired from. `node tools/facing.mjs` checks all four combinations of heading
and blow side.

Nothing here ever moves up and down; sideways is the only axis a body has.

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
you want when checking a new drawing. It has five columns now: tier 3 stopped
sharing tier 2's body when the knight arrived.

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
| `Enemies_Thug_Dead.png`      | `[180, 217, 152, 78]` | `[0.207, 0.901]` |
| `Enemies_Tough_Thug_Dead.png`| `[175, 217, 162, 78]` | `[0.213, 0.888]` |
| `Enemies_Blocker_Thug_Dead.png`| `[175, 217, 161, 78]`| `[0.211, 0.875]` |
| `Enemies_Archer_Thug_Dead.png`| `[149, 218, 214, 76]`| `[0.161, 0.875]` |
| `Enemies_Giant_Thug_Dead.png`| `[117, 195, 278, 122]`| `[0.171, 0.783]` |
| `Enemies_Plague_Thug_Dead.png`| `[116, 207, 280, 97]`| `[0.118, 0.826]` |
| `Soldiers_Spearman_Dead.png` | `[135, 215, 241, 82]` | `[0.118, 0.841]` |
| `Soldiers_Pikeman_Dead.png`  | `[138, 217, 237, 77]` | `[0.120, 0.896]` |
| `Soldiers_Swordsman_Dead.png`| `[159, 211, 193, 90]` | `[0.148, 0.770]` |
| `Paladin_Dead.png`           | `[153, 214, 206, 84]` | `[0.160, 0.875]` |
| `Assassin_Dead.png`          | `[164, 218, 185, 77]` | `[0.178, 0.886]` |

The two rows that used to head this table were the first two corpses the game
ever had, drawn before the enemies were named — Enemies_Man_Dead_T1a and T1b.
Neither file has existed for a long time; the table outlived them because
nothing checked it. `node tools/readme.mjs` does now.

`deadPivot` is **the centre of the corpse's own shadow**, from
`node tools/shadow.mjs`. Both numbers now come from this file and nothing else.

The shadow is dark brown, exactly `54,36,7`. It was flat grey `150,150,150` until
the last upload and the tool matches the colour exactly, so a recolour reports
NO SHADOW COLOUR FOUND rather than measuring something else. Note the same brown
is the club on the dead militia and the boots on the dead heavy, which is why the
tool checks the anchor you give it instead of picking a blob for you.

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
