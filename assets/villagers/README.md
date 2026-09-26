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

And stage 4's villagers at work, one drawing each (no front and back):

| drawing | used for |
|---------|----------|
| `Villager_Carrying_Wood_Plank.png` | TWO villagers carrying one plank between them, walking it to the stack |
| `Villager_Throwing_Wood_Plank.png` | the same two, throwing it onto the stack |
| `Villager_Wood_Plank.png` | the plank on its own, flying from their hands onto the stack |
| `Villager_Holding_Steel_Pipe_1.png` | the smith, pipe drawn back from the fire |
| `Villager_Holding_Steel_Pipe_2.png` | the smith, pipe pushed into the fire |

And stage 5's:

| drawing | used for |
|---------|----------|
| `Villager_Carrying_Ballista_Parts.png` | one villager carrying a ballista part to the broken ballista |
| `Villager_Throwing_Ballista_Parts.png` | throwing it on |
| `Villager_Ballista_Parts.png` | the part on its own, flying onto the ballista |
| `Villager_Hammering_1.png` | hammer raised |
| `Villager_Hammering_2.png` | hammer struck down |
| `Villager_Carrying_Box.png` | stage 5's villager 7 carrying a box to the crates |
| `Villager_Throwing_Box.png` | tossing it onto the pile |
| `Villager_Box.png` | the box on its own, flying onto the crates |

And stage 6's:

| drawing | used for |
|---------|----------|
| `Villager_Fishing_1.png` | the angler, rod and line in the water, waiting |
| `Villager_Fishing_2.png` | tugging at it, the rod bent |
| `Villager_Helmet_Stuck_1.png` | a villager with a helmet stuck on his head |
| `Villager_Helmet_Stuck_2.png` | heaving at it |

The fishing drawings stand on (324.5, 318) and carry the rod, so the rod painted in
the angler's hands is cut out of the board with him (`props` in level08.js); the
helmet ones stand on (256, 312).

The ballista-part drawings stand on (236, 311); the hammering ones on (276.5, 305).

The carrying and throwing drawings stand on the back-end villager's shadow, centred
on (124.5, 341.5); the front-end villager's is at (386.5, 268.5). The steel pipe
drawings stand on (257, 305).

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
  long part: thirteen seconds in every eighteen. As the runners set off, they shout
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

- **Before the first wave:** villager 1 (front, mirrored so they face right) and 2
  (front) stand and greet by turns. Villager 3 (front) drinks: holding the mug, then
  tipping it up, by turns. Villager 4 (front), beside him, stands and greets by turns.
- **When the first enemy of wave 1 appears:** villagers 1 and 2 stand and pray by
  turns. Villager 3 keeps drinking. Villager 4 runs up over the stepping stones and
  into the tavern through the door in its right-hand wall, and is gone.
- **Every 10 enemies killed:** villagers 1 and 2 hop twice.
- **Tapping a villager:** the same as on stage 1. Villager 1 stays mirrored, so
  their greeting is mirrored too.
- **A star lost** (lives dropping below 18, then below 10): the village cries "nooo",
  ahead of every other sound. (No "runnn" here.) Soft birdsong plays under the stage.

## Stage 3's script

Numbered left to right: 1 and 2 on the statue's plaza, 3 on the green below it, 4
between the two bottom-right houses, 5 at the top (the most right).

- **Before the first wave:** all five stand and greet by turns — 1, 2 and 5 facing
  the player, 3 and 4 with their backs to the player.
- **When the first enemy of wave 1 appears:** villagers 1, 2 and 4 stand and pray by
  turns. Villager 3 walks up onto the plaza to stand beside villager 2, turns to face
  the player and prays by turns. Villager 5 runs round the right-hand end of the
  barricade (over the top of it, out past its end, behind a tower on the plot
  there, and back in front of the wall) to stand in its shade, and prays by turns.
- **Every 10 enemies killed:** villagers 1, 2 and 4 hop twice.
- **Every 12 enemies killed:** villagers 3 and 5 hop twice.
- **A star lost:** "nooo", as on stage 2. Soft birdsong plays under the stage, and
  the two torches by the statue burn with live fire and smoke.

## Stage 4's script

Villagers at work: they take no notice of the waves — no greeting, praying or
hopping — and a tap opens their card and plays the villager sound without stopping
them.

- **The smith** stands up at the furnace, behind the workbench (his hands and pipe
  held out over it), and pushes a steel
  pipe into the fire and draws it back, by turns (3.2 seconds back, 2 in). With the
  pipe drawn back the fire burns small; with it in, the fire roars — tall, bright,
  throwing sparks. The fire is kept inside the furnace's mouth, the shape the artist
  drew, with a little smoke that stays under the forge's roof.
- **The two plank carriers**, in a loop from the start of the game to its end:
  1. carry the plank slowly and smoothly up to the stack;
  2. throw it, landing back on their feet while it is still in the air — it flies
     in a lob onto the stack and vanishes as it lands;
  3. walk off, each on their own and standing — quicker now, with nothing to
     carry — towards the cut trees and off the bottom of the board between them;
  4. three seconds later come back from where they left, carrying the next plank.
- **A star lost:** "nooo", as on stages 2 and 3.
- **When the first enemy of wave 1 appears:** "here they come".

## Paused means still

Everything villagers do, and every live fire and flag on a board, runs on the game's
own clock and stops when the game is paused.

## Stage 5's script

Numbered left to right: 1 and 2 by the path up to the castle gate, 3 carrying parts
to the broken ballista, 4 hammering at it, 5, 6 and 7 by the bridge.

- **Before the first wave:** villagers 1 and 2 (facing the player) and 5, 6 and 7
  (backs to the player) stand and greet by turns.
- **All the time:** villager 3 carries a part up to the broken ballista, throws it on
  (it flies onto the ballista and vanishes), walks down off the board for the next one
  and comes back with it — stage 4's loop for one man. Villager 4 hammers at the
  ballista: two quick blows (a quarter of a second each way), a long rest with the
  hammer down, and again.
- **When the first enemy of wave 1 appears:** villagers 1 and 2 run up the cobbles to
  the castle gate, between the torches and clear of their poles, and fade out through
  it.
  Villagers 5 and 6 start standing and praying by turns. Villagers 3, 4 and 7 keep
  working.
- **Villager 7 carries boxes, all game long:** from where he is painted he joins the
  owner's line above villagers 5 and 6 and carries his box left along it, slowly, to
  the crates by the crossbowmen's barricade; tosses it onto the pile, where it lands
  and is gone; walks back right, faster and empty-handed, along the same line and
  off the right edge of the board; and after three seconds comes back in from there
  with the next box. (He used to run to the river and pray there, until he was
  redrawn carrying a box.)
- The two torches at the gate burn with live fire and smoke. The two banners on the
  castle hang still.
- Each of villager 4's two quick blows knocks, one knock of the hammering recording
  each.

## Stage 6's script

In the level's order: 1 by his rod planted on the bank, 2 by the top-right hut, 3
fishing with his rod in hand, 4 between the two bottom-right huts, 5 stuck in a
helmet by the armour stand.

- **Before the first wave:** villagers 1, 2 and 4 stand and greet by turns — 1
  facing the player mirrored (turned right), in this and in his praying.
- **When the first enemy of wave 1 appears:** "runnn", and villagers 1, 2 and 4
  start standing and praying by turns.
- **All game long:** villager 3 waits with his line in the water for four to seven
  and a half seconds, then tugs at it for one and a half to two and a half, the reel
  whirring softly while he does, and back. Villager 5 heaves at the helmet stuck on
  his head — his two drawings by turns about three times a second, with a slight
  shake — for about a second and a quarter, then stands still for two and a half
  seconds, and again.
- **A star lost:** "nooo". Birdsong and the river under the bridge play softly
  throughout.
