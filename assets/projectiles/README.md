# Projectile artwork

Anything that leaves a tower, a man or an enemy and travels. Seventeen files,
all **512 x 512 with a transparent background**, like every other sprite in the
game.

They are the smallest drawings here — a musket ball is 4 x 3 game px — so the
rule that matters most in this folder is about which way they point.

## Draw it pointing RIGHT

**Everything that has a nose points right on the canvas.** The game rotates a
projectile to its flight angle, and it does that from the drawing's own
direction: an arrow drawn pointing up flies sideways all game.

The ones with no nose — a rock, a cannonball, a flask — are round or tumbling and
have no direction to get wrong. They are the entries with `faces: 0` in
`src/data/towers.js`; everything else is `faces: -1`, which means "drawn pointing
right".

## What is in here

| file | flies for | speed | flight |
|------|-----------|-------|--------|
| `Archer_Arrows.png` | the whole archery ladder to tier 3 | 360 | flat |
| `Musketeer_Bullet.png` | Musketeer Post | 560 | flat, the fastest thing in the game |
| `Musketeer_Deadeye_Bullet.png` | its Deadeye shot | 560 | flat |
| `Crossbow_Sentry_Bolt.png` | Crossbow Sentry | 440 | flat |
| `Ballista_Turret_Bolt.png` | Ballista Turret | 520 | flat |
| `Ballista_Turret_Heavy_Bolt.png` | its Heavy Bolt | 520 | flat, and it kicks up earth |
| `Artillery_Rock_T1.png` | Catapult | 300 | lobbed, rises 0.22 |
| `Artillery_Rock_T2.png` | Mangonel | 300 | lobbed |
| `Artillery_Rock_T3.png` | Trebuchet | 300 | lobbed |
| `Cannonball.png` | Cannon Outpost, and its Fiery Shot | 480 | **flat, though it is artillery** |
| `Soldiers_Priest_Arcane_Missle.png` | Wayside Shrine | 330 | flat |
| `Soldiers_Bishop_Arcane_Missle.png` | Chapel | 330 | flat |
| `Soldiers_Cardinal_Arcane_Missle.png` | Abbey | 330 | flat |
| `Pope_Arcane_Missle.png` | High Altar | 330 | flat, and a third longer than the others |
| `Assassin_Knife.png` | an assassin who has learned Knife Throw | 300 | flat |
| `Assassin_Knife_Sneak_Attack.png` | the first knife of his volley | 300 | flat |
| `Enemies_Plague_Thug_Flask.png` | the plague thug | 150 | lobbed, and it breaks on a man |

**A Judgement Temple's monks fire the Abbey's missile**, not one of their own.
`Monk_Magic_Shot.graphite` is in this folder and is a working file rather than a
sprite — the game does not load it and `node tools/readme.mjs` does not ask about
it, because that check only covers what `src/assets.js` names. When it is exported
as a PNG, wiring it is a trim and one line: give the monk's ammunition its own
`sprite` in `src/data/towers.js` instead of spreading `missile3`. Nothing else
moves — the speed, the kind and both sounds already belong to the monk.

## Lobbed is not the same as high

Two separate things, and they were one field until the cannon arrived:

- **lobbed** — the shot is committed to a patch of ground when it leaves, with
  lead, and lands there whatever the target does afterwards.
- **arc** — how high it rises on the way.

A cannonball is **lobbed with no arc**: it is thrown at a spot like a rock, and it
gets there flat and fast like a bolt, because the owner asked for a straight shot
from a gun. A flask is lobbed and arcs. An arrow is neither — it chases.

## One family, one drawing, until it is not

The archery ladder fires the same `Archer_Arrows.png` from tiers 1 to 3, and the
artillery ladder has a rock per tier because the rocks visibly grow — 12px, 15px
then 18px across. Neither is a rule. Whichever way the artist draws it, the
sprite is named once in `src/assets.js` and the tiers point at it.

The pattern for a tier 4 ability is different and worth knowing before drawing
one: **the ability's projectile is a redraw of the tower's own**. `Heavy_Bolt` is
`Bolt` on fire, `Deadeye_Bullet` is the musket ball with a trail, and
`Knife_Sneak_Attack` is a heavier blade. They fly at exactly the same speed and
carry the same kill line — what changes is only the picture and how loud it
leaves.

## After uploading

```
node tools/trim.mjs
```

It prints the trim rect measured off the file, and it will tell you if the
drawing is too small to stay sharp. Paste the rect into the ammunition's `trim`
in `src/data/towers.js` — or `src/data/abilities.js` for an ability's — then:

```
node tools/facing.mjs        # it points the way it flies
node tools/siege.mjs         # artillery only: it leaves the machine's muzzle
node tools/families.mjs      # it still does what its tower's card says
```

`grip` is the other number in the entry, and it is the fraction along the drawing
that sits on the flight point — 0.08 for an arrow means the game holds it near
the tip. It is hand-set from watching the shot, not measured, and it is the one
number in this folder a tool cannot give you.
