# Death artwork

Drop the dead-pose PNGs here. **One file per man who can die on the road**, and
that is the only new drawing each of them needs — see "Why only one file" below.

| file                        | who dies                        | required? |
|-----------------------------|---------------------------------|-----------|
| `Enemies_Man_T1_Dead.png`   | the militia, every wave         | yes       |
| `Enemies_Man_T2_Dead.png`   | the heavy, waves 4-8            | yes       |
| `Barracks_Man_T1_Dead.png`  | your own spearman               | optional  |

The names are the living file's name with `_Dead` on the end. The code is
already wired to all three: a file that is not here simply produces no body, and
the game behaves exactly as it does today. Nothing to change when you upload —
put the PNG in this folder and the bodies appear.

The spearman is marked optional because he is not an enemy: he dies, leaves a
body, and then musters again from the barracks after his respawn timer. If you
draw him, that body reads as the cost of holding the road. If you do not, he
just vanishes as he does now.

## Why only one file

A man on the road has three states, and you only have to draw the third:

| state    | art                          |
|----------|------------------------------|
| standing | the existing PNG             |
| attacking| the existing PNG, moved      |
| dead     | **the new PNG in this folder** |

The attack is not a drawing. The figure lunges toward whatever it is hitting and
settles back, in code, on every swing — 4 game px for an enemy and 6 for a
spearman. That is why there is no `_Attack.png` in the table: adding one would
mean throwing the lunge away and building a frame system, and a single pose
cannot show a swing the way the movement already does.

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
| `Enemies_Man_T2`    | x 256, y 304               |
| `Barracks_Man_T1`   | x 264, y 294               |

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

The body appears where he fell, stays **2 seconds**, then goes. The last half
second fades out — that fade is inside the 2 seconds, not added to it, and it is
there because a body that pops out of existence pulls your eye to the exact
frame it vanishes.

Two seconds is *game* time. On 2x from the dashboard a body lasts one real
second, which is deliberate: fast-forward speeds up the whole simulation, and a
body that ignored it would pile up exactly when the road is busiest.

Bodies are decoration and nothing else. Towers do not shoot them, soldiers do not
block on them, enemies walk straight over them, and no rule in the game reads
the list. Balance is untouched.

An enemy that reaches the end of the road leaks rather than dying, so it leaves
no body. That is on purpose — the body is the reward for killing something.

## After uploading

The game draws the whole 512 canvas until the file has been measured, which is
correct as long as you followed the placement rule above. Run

    node tools/trim.mjs

and I will paste the tight rect in as `deadTrim` / `deadPivot`, the same way
every other sprite in the project works. That step is an optimisation and a
safety net — if the body did end up somewhere unexpected on the canvas, the
measured rect is what puts it back on the right spot.
