# Villagers

The drawings that bring the villagers on a stage to life. On a stage that uses
them, the painted villagers are cut out of that stage's artwork and the game draws
these in their place. Stage 1 (Oakhaven Village) is the first; see `villagerPlay` in
`src/data/level00.js` and the script in `src/villagers.js`.

On every other stage the villagers stay painted in the artwork and never move. The
game only knows where each one stands, so a tap can open their card. Their card
picture is `assets/units/Villager_Default.png`.

## The sixteen drawings

Seven poses (drinking has two drawings), each drawn two ways: **Front**, with the villager's face towards the
player, and **Back**, with their back to the player. Every drawing faces **left**,
like every figure in the game; the game mirrors a drawing when the villager faces
right, for example while running to the right.

| pose     | front                         | back                         | used for |
|----------|-------------------------------|------------------------------|----------|
| standing | `Villager_Front_Standing.png` | `Villager_Back_Standing.png` | standing still |
| greeting | `Villager_Front_Greeting.png` | `Villager_Back_Greeting.png` | waving; the game waves the raised left hand |
| running  | `Villager_Front_Running.png`  | `Villager_Back_Running.png`  | running (only this drawing, no alternating): front going down or level, back going up the screen |
| praying  | `Villager_Front_Praying.png`  | `Villager_Back_Praying.png`  | praying |
| hopping  | `Villager_Front_Hopping.png`  | `Villager_Back_Hopping.png`  | in the air, during a hop |
| landing  | `Villager_Front_Landing.png`  | `Villager_Back_Landing.png`  | touching down after it |
| drinking | `Villager_Front_Drinking_1.png` | `Villager_Back_Drinking_1.png` | holding the mug |
|          | `Villager_Front_Drinking_2.png` | `Villager_Back_Drinking_2.png` | tipping it up to drink |

**Villagers face the way the enemy comes from.** Most of the time a villager
faces the direction of the enemy waves: on a board where the enemies walk from right
to left, the villagers are mirrored in everything they do. (The owner's rule, for
every stage that gets villagers from here on.)

**Which way a villager faces is which way the danger is.** A villager with the road
above them turns their back to the player to watch it; one with the road below faces
the player.

## How to draw them

- **Canvas and scale:** the same 512 × 512 canvas and scale as every figure in
  `assets/units`, so a villager is the same size as a soldier.
- **Ground shadow:** the dark brown flat ellipse under the feet (`#362407`), centred
  on (258, 305), **in the same place in every drawing**. The game stands every pose
  on that one spot, so a shadow that moved would make the villager slide when they
  change pose. All of them are drawn this way except the four drinking drawings, whose shadow
  is centred on (272, 305), 14px further right; the game knows (see `feet` in
  `src/villagers.js`) and stands that point on the villager's spot instead.
- **The hop:** draw the figure lifted off its shadow in the hopping drawing, with the
  shadow left on the ground, as it is now.

## Stage 1's script

- **Before the first wave:** villagers 2 and 3 stand with their backs to the player;
  the rest face the player. Now and then each one greets (waves).
- **When the first enemy of wave 1 appears:** villagers 1 and 2 run to the grass below
  the road by the exit flag (front running below the houses, back running once past
  them and heading up towards the flag), then pray now and then with their backs to the player.
  Villagers 3, 4 and 5 start praying now and then. Once started, praying is the
  long part: nine seconds in every twelve. As the runners set off, they shout
  "runnn", ahead of every other sound.
- **Every 10 enemies killed:** villagers 3, 4 and 5 hop and land twice, one after another.
- **Every 12 enemies killed:** villagers 1 and 2 hop and land twice.
- **Tapping a villager:** they stop, turn to face the player and greet for 1 second,
  then carry on (a runner carries on running). The tap plays the villager-selected sound.
- **A star lost** (lives dropping below 18, then below 10): the village cries "nooo", ahead of every other sound.

Their sounds are in `assets/audio/villagers`.

## Stage 2's script

Numbered left to right: 1 at the well, 2 by the tavern wall, 3 with the mug by the
tavern steps, 4 beside him.

- **Before the first wave:** villager 1 (back) and 2 (front) stand and greet by
  turns. Villager 3 (front) drinks: holding the mug, then tipping it up, by turns.
  Villager 4 is inside the tavern and cannot be seen (or tapped).
- **When the first enemy of wave 1 appears:** villagers 1 and 2 stand and pray by
  turns. Villager 3 keeps drinking. Villager 4 runs out of the tavern door and
  over the stepping stones to stand beside villager 3, then stands and prays by turns.
- **Every 10 enemies killed:** villagers 1 and 2 hop twice.
- **Every 12 enemies killed:** villager 4 hops twice.
- **Tapping a villager:** the same as on stage 1.
