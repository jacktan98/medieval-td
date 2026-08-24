# Enemy artwork

**Two drawings per enemy**, exactly like the soldiers they fight — a Default
they walk in and an Attack for the blow — plus a death pose in `assets/dead/`:

| Default                            | Attack                            | type key     | notes                                  |
|------------------------------------|-----------------------------------|--------------|----------------------------------------|
| `Enemies_Thug_Default.png`         | `Enemies_Thug_Attack.png`         | `light_inf`  | the militia, in all 8 waves            |
| `Enemies_Giant_Thug_Default.png`   | `Enemies_Giant_Thug_Attack.png`   | `heavy_inf`  | the heavy, waves 4-8, in growing packs |

## Two enemies fight at both distances, and they carry two pairs

An enemy that shoots and also gets caught needs a drawing for each. The suffixes
say which is which, and the code reads them as one rule: the **ranged** pair is
what he walks and works in, the **melee** pair is shown the moment a soldier has
hold of him — `e.foe`, not "he is nearby".

| Ranged Default                            | Ranged Attack                            | Melee Default                            | Melee Attack                            | type key     |
|-------------------------------------------|------------------------------------------|------------------------------------------|-----------------------------------------|--------------|
| `Enemies_Archer_Thug_Ranged_Default.png`  | `Enemies_Archer_Thug_Ranged_Attack.png`  | `Enemies_Archer_Thug_Melee_Default.png`  | `Enemies_Archer_Thug_Melee_Attack.png`  | `archer_inf` |
| `Enemies_Plague_Thug_Default.png`         | `Enemies_Plague_Thug_Ranged_Attack.png`  | *(shares the one Default)*               | `Enemies_Plague_Thug_Melee_Attack.png`  | `plague_inf` |

**The melee Default is optional and the doctor does without one.** He stands the
same way whichever he is about to do, so one drawing serves both stances; the
archer holds a drawn bow one way and a club another, so he has two. A def takes
only the halves it has — see `melee` in `src/data/waves.js` and `enemyStance` in
`src/render.js`.

**All four poses must share one ground point.** He swaps between them mid-fight,
so a pivot out by two pixels makes him hop the instant a soldier reaches him.
`node tools/shadow.mjs` checks every one of them against its own grey blob, and
`node tools/facing.mjs` checks that each state resolves to the drawing it should.

One thing to watch when redrawing: the **taller** of the two Defaults decides
where the health bar floats and how big the tap box is, in both stances — a bar
that jumped up his body when he was caught would be a bar that moves for a reason
other than health.

**The tiers are gone from these names.** They were `Enemies_Man_T1a` and `T1b`,
from an upload that numbered them; each is now named after what it is, and the
`art` keys in `src/assets.js` followed. The type keys above did not, because
what these enemies DO did not change and `heavy_inf` is what the rules call it.

Adding a new enemy means adding both the files and the `enemyTypes` entry, so
tell me the intended hp / speed / bounty when you upload one and I will wire it
and re-run `tools/sim.mjs` to see what it does to the balance. Expect that to
move other numbers — adding the plague doctor did.

Their **death poses** live in `assets/dead/`, one per type, and that folder's
README has the drawing rules. They are separate files because a body is a
different drawing, not a different state of this one.

## Export

Same square canvas as everything else: **512 x 512** — see
`assets/map/README.md` for why. Whatever the size, **every asset in the
game must use the same one**, because a single `SCALE` in `src/data/towers.js`
converts all of them to game pixels. Draw an enemy at its true size relative to
a soldier on that shared canvas; never scale one to "look right" on its own.

Draw it **standing upright and facing left or right**, not top-down. Enemies
mirror to face the way they are walking and are never rotated — a standing
figure rotated to face north is a standing figure lying down.

The thug draws 20 x 24 game px, the archer 33 x 25 with the bow drawn, the
plague doctor 27 x 27 and the giant 37 x 37, against a spearman's 34 x 24. That reads correctly: a lighter troop, an oddity,
and a heavier one around your own soldier.

The giant's Default was redrawn shorter after the first animated upload held his
club straight up and made the box 212 source px tall against a body of about
160. It cost two things that are worth knowing about because they will happen
again to the next tall pose: his health bar hung above the club rather than his
head, and every figure in the encyclopedia had to shrink 4% to keep him inside a
card. **A weapon raised above the head is charged for twice.**

The heavy was redrawn 1.16x bigger, and its collision radius went 12 -> 14 with
it rather than being left behind — the hitbox is meant to match the body you can
see. That was checked before the change, not after: the whole sim comes out
identical either way, so it is a picture change and not a balance one. Do not
assume the next size change is free; run `node tools/sim.mjs` and look.

## The two poses

The Attack drawing shows for a quarter of a second each time the enemy lands a
blow, on top of the 6px lunge it already had — the movement and the pose are one
gesture. On the plague doctor the same field is set by a flask leaving his hand,
so he lunges into his throw.

**Only the shadow has to line up between the two.** Everything else may differ
freely, because each pose carries its own trim and its own pivot; the Giant
Thug's box goes from 148 wide to 232 between them and nothing has to be padded
to match. `node tools/shadow.mjs` checks every pair and fails if one drifts more
than 6 source px.

**Keep the resting pose no taller than the figure.** `artHeight` in render.js
and select.js reads the Default's trim to place the health bar and the tap box,
and the encyclopedia sizes every figure on the page so that the tallest still
fits a 60px card. A pose that sticks a weapon up in the air pays for it in both
places — see the giant's `spriteTrim` note in `src/data/waves.js`. The Attack
pose has no such limit: reach as wide as you like.

## After uploading

The PNG is used with a trim rect rather than being cropped: `spriteTrim` in
`src/data/waves.js` is an `[x, y, w, h]` window into the source image, so your
export is never modified. Run `node tools/trim.mjs` to print the rect straight
from the alpha channel — do not type it by hand, a few pixels out shifts the
sprite and the error looks like a bad pivot rather than a bad number.

`pivot` is `[across, down]` as a fraction of the trim, and the convention is
**the centre of the figure's ground shadow**. Not his feet, and definitely not
the middle of the bounding box, which a weapon pulls off-centre — the militia's
mace dragged the old box centre 21% of his width off his body.

The shadow is **dark brown, 54,36,7** on a figure and **dark green, 55,66,47**
under a building. It was flat grey on every sprite before the last upload. If a
shadow is recoloured again, `tools/shadow.mjs` has to be told: it matches the
colour exactly, so it will report NO SHADOW COLOUR FOUND rather than quietly
measuring the wrong thing — which is the behaviour you want, because the same
brown is also the club and the boots on some of these figures.

Run `node tools/shadow.mjs` for it. Do not measure it by eye: the artist decides
where a figure stands by drawing the ellipse, and the code reads it.

Because it is a fraction of the trim rather than a pixel count, a pivot survives
a re-export at a different canvas size untouched. The trim rect does not — that
is absolute source pixels, and it is the one thing that has to be re-pasted.

A death pose no longer has to be drawn against this one's foot point — it
carries its own shadow and is measured on its own. Still worth opening
`corpse-test.html` after a redraw, but the two files are independent now.
