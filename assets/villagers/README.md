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
| `Box_on_ground.png` | the same box lying on the ground with its shadow — Dark Hollow's box carrier drops it when tapped |

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

And stage 7's:

| drawing | used for |
|---------|----------|
| `Villager_Cooking_1.png` | the cook, his skewer held out over the fire |
| `Villager_Cooking_2.png` | the skewer drawn back out of it |

Both stand on (297.5, 305) and carry the skewer, so the skewer painted in the cook's
hands is cut out of the board with him (`props` in level09.js); the fish stays on
the fire.

And stage 8's:

| drawing | used for |
|---------|----------|
| `Villager_Kneeling_1.png` | a villager on the praying mat, bowed down, turned right |
| `Villager_Kneeling_2.png` | kneeling up, on the way down to that and back |
| `Villager_Church_Bell_Middle.png` | the church bell hanging still |
| `Villager_Church_Bell_Left.png` | swung to the left |
| `Villager_Church_Bell_Right.png` | swung to the right |

And stage 9's:

| drawing | used for |
|---------|----------|
| `Villager_Tumbleweed_1.png` | a tumbleweed blowing across the sand |
| `Villager_Tumbleweed_2.png` | another, each tumbleweed taking one or the other |

And stage 10's:

| drawing | used for |
|---------|----------|
| `Villager_Cutting_Tree_1.png` | the lumberjack, his axe in the tree |
| `Villager_Cutting_Tree_2.png` | the axe drawn back |

Both stand on (216, 305) and carry the axe, so the axe painted in the tree is cut out
of the board with him (`props` in level12.js).

And stage 11's:

| drawing | used for |
|---------|----------|
| `Villager_Back_Carrying_Cannonball.png` | the cannonball carrier, a ball in his arms, his back to the player — carrying it up to the tower, mirrored while he goes up to the right |
| `Villager_Front_Carrying_Cannonball.png` | the same facing the player — holding it up a moment, facing the pile |
| `Villager_Picking_Up.png` | bent over the pile, picking one up |

The carrying drawings stand on (263, 305), the picking-up one on (248, 305).

And stage 12's:

| drawing | used for |
|---------|----------|
| `Villager_Back_Lighting_Pole.png` | the torch-lighter, his lit pole held up, his back to the player — walking up to the first torch and lighting both (mirrored) |
| `Villager_Front_Lighting_Pole.png` | the same facing the player — walking down to the second torch (mirrored) |
| `Villager_Dimmed_Lighting_Pole.png` | the pole thrown down and burnt out: taken apart by colour into the pole, its green shadow and the brown scorch, and put back together as it falls and burns out (see `drawThrownPole` in src/render.js); its flame is the live one it burned with in his hands |
| `Villager_Musketeer_Front_Standing.png` | the villager who becomes a musketeer, standing about before the war |
| `Villager_Musketeer_Back_Standing.png` | the same walking into the castle |
| `Musketeer_Front_Standing.png` | him again in a musketeer's gear, walking out to his post |

The pole drawings stand on (259.5, 344), the villager-musketeer ones on (259.5, 310)
and the musketeer on (258, 305). The torch-lighter is cut out of the board with the
lit pole he holds up (`up` on his anchor in level14.js). Stage 11's box carrier is stage 5's `Villager_Carrying_Box.png`.

And stage 15's, both enemy villagers in the thugs' dark clothes as drawn:

| drawing | used for |
|---------|----------|
| `Villager_Enemy_Anvil_1.png` | the smith at the anvil, hammer down on the metal — sparks fly as it lands |
| `Villager_Enemy_Anvil_2.png` | the same, hammer raised |
| `Villager_Enemy_Heating_1.png` | the smith at the brazier, the blade held up |
| `Villager_Enemy_Heating_2.png` | the same, the blade in the fire |

The anvil drawings are the man and his anvil; the game stands them on (268, 281) so
the anvil lands where the painted one was, and cuts the painted anvil out with him
(`w` and `down` on his anchor in level17.js). The heating drawings stand on
(249, 318).

And stage 13's:

| drawing | used for |
|---------|----------|
| `Fish_In_Lake.png` | a fish leaping out of the lake and back in, its nose along its arc, mirrored when it leaps to the right (see `drawLakeFish` in src/render.js) |

The kneeling drawings stand on (254, 280.5) and (250, 290). The three bell drawings
share one canvas: the game lays it where the painted bell hung (`bell` in level10.js)
and draws the roof and front pillars over it again — see
`assets/map/Stage_8_Map_bell_cover.svg`.

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
  ahead of every other sound. Soft birdsong plays under the stage.
- **When the first enemy of wave 1 appears:** "hide".

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
- **When the first enemy of wave 1 appears:** "oh no".

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
- **When the first enemy of wave 1 appears:** "thugs are here", and villagers 1 and 2 run up the cobbles to
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
  each, and throws a few tiny sparks where the hammer meets the ballista's beam (in
  `Villager_Hammering_1`, its head down at the beam on his left).
- **Every 10 enemies killed:** villager 5 hops twice. **Every 12:** villager 6.
- **A star lost:** "nooo".

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
- **Every 10 enemies killed:** villager 1 hops twice. **Every 12:** villager 4.
  **Every 14:** villager 2. (The owner counts the right-hand two left to right, as 4
  and 5.) The angler and the man in the helmet are at work and never hop — no
  villager with something to do does.
- **A star lost:** "nooo". Birdsong and the river under the bridge play softly
  throughout, and the river runs — currents and spray at its banks, as on stage 5.

## Stage 7's script

Left to right as the owner numbers them: 1 by the left-hand huts, 2, 3 and 4 at the
fountain from the top down, 5 behind the cooking fire — and the cook, last in the
level's list.

- **Before the first wave:** villagers 1 to 5 stand and greet by turns — 1, 2 and 3
  facing the player turned right, 4 with his back to the player turned right, and 5
  facing the player turned left.
- **When the first enemy of wave 1 appears:** "hide", and the five start
  standing and praying by turns, each facing as before.
- **Every 10 enemies down** villagers 1 and 2 hop twice; **every 12**, 3 and 4;
  **every 14**, 5.
- **All game long:** the cook holds his skewer over the fire for three seconds, the
  fish sizzling while he does, then draws it back out for six seconds, and again.
  The fire burns live, over the fish on its spit and under the cook's skewer, and
  flares up — taller and brighter — while he holds the fish in it, and burns low as
  he draws it back. No sparks.
- **A star lost:** "nooo". Birdsong, the fountain and the fire crackling play softly
  throughout, and the fountain runs the way the world map's waterfall does, in long streaks along the
  owner's arrows: up the middle jet and down over both its arms, up out of each side
  jet's inner foot, over and down to the basin, and straight down the sheets over
  the tiers — a few streaks now and then running over the black line round a jet,
  droplets breaking away from the jets and falling, glints on its pools and rings
  and spray where the water lands.

## Stage 8's script

As the owner numbers them: 1 by the praying mat, 2 to 7 on it, 8 carrying boxes out
of the church, 9 at the church's right-hand end.

- **Before the first wave:** villager 1 stands and greets by turns, his back to the
  player, turned right; villager 9 stands and greets facing the player, turned left.
- **When the first enemy of wave 1 appears:** "oh no". Villager 1 runs off the board
  to the left and is gone; villager 9 turns to standing and praying by turns.
- **All game long, 2 to 7 on the mat** each go round on their own: praying with
  their backs to the player, turned right (five and a half to ten and a half
  seconds), then kneeling up (about a second), bowed down (four and a half to nine),
  kneeling up again, and
  praying — each started at a different point, so no two do the same thing
  together. They take no notice of a tap.
- **All game long, villager 8** carries a box — stage 5's box carrier, mirrored —
  out of the church door, slowly down to the pile in front of it, tosses it on (the
  landing thuds, softly), walks back up and in at the door, fading as he goes, and
  after ten seconds inside comes out with the next. The first time he starts from
  where he is painted, at the pile.
- **As each wave starts** the church bell swings to the left with a stroke and holds
  there nearly two seconds, back to the middle as the stroke dies, to the right with
  a second stroke for as long, and back — the roof and pillars over it, as drawn.
- **Every 10 enemies killed:** villager 9 hops twice.
- **A star lost:** "nooo". Birdsong plays softly throughout.
- The church's two banners sway, the cross and the shield on them with the cloth.

## Stage 9's script

Left to right: 1 and 2 by the left-hand houses, 3 at the middle house.

- **Before the first wave:** all three stand and greet by turns — 1 and 2 facing the
  player turned right, 3 turned left.
- **When the first enemy of wave 1 appears:** "here they come", and the three start
  standing and praying by turns, each facing as before.
- **Every 10 enemies killed:** villagers 2 and 3 hop twice. **Every 12:** villager 1.
- **A star lost:** "nooo". The desert wind blows softly throughout: now and then a
  tumbleweed rolls in off the left edge, bouncing and spinning, and fades out along
  the way; grains of sand stream east over the board and gusts of dust sweep across
  (`src/desert.js`).

## Stage 10's script

As the owner numbers them: 1 the lumberjack at the tree, bottom left; 2 by the tools
and crates; 3 at the front of the houses; 4 by the Ironforge sign; 5 on the
top-right steps.

- **Before the first wave:** 2 to 5 stand and greet by turns — 2 with his back to the
  player turned right, 3 facing the player turned right, 4 facing the player turned
  left, 5 with his back to the player turned left.
- **When the first enemy of wave 1 appears:** "thugs are here", and 2 to 5 start standing and
  praying by turns, each facing as before.
- **All game long:** the lumberjack chops at the tree as stage 5's hammerer hammers,
  but slower — two chops, the axe in the tree a third of a second each and drawn back
  three quarters of a second between them, a chop sounding each time it goes in,
  then a rest of nearly three seconds with the axe drawn back, and again. At each
  chop the tree rocks a little about the foot of its trunk and a few small leaves
  come down from its crown, tumbling and fading as they fall. He is drawn in front of the tree's trunk, as painted.
- **Every 10 enemies killed:** 4 and 5 hop twice. **Every 12:** 2 and 3.
- **A star lost:** "nooo". Crows caw softly throughout, and grey smoke rises from the
  chimneys of all five houses.

## Stage 11's script

As the owner numbers them: 1 by the top-left house; 2 carrying boxes to the factory;
3 carrying cannonballs to the Cannon Outpost standing beside the pile.

- **Before the first wave:** 1 stands and greets by turns, facing the player, turned
  left.
- **When the first enemy of wave 1 appears:** "runnn", and 1 starts standing and
  praying by turns.
- **All game long, villager 2:** stage 5's box carrier, mirrored as painted. Down from
  the top of the board, past where he is painted and right to the factory door, and
  in (faded out on the step). A second later the factory runs — `Factory_sound`, its
  door and window lit and its two chimneys' black smoke thicker — for as long as the
  sound; three seconds' quiet and it runs again; a second later he comes out
  empty-handed, back up the way he came and off the top of the board, and three
  seconds later he is back with the next box. The first time he starts where he is
  painted.
- **All game long, villager 3:** carries a cannonball from the pile, his back to
  the player, up to the right (mirrored) and then up to the left to the tower's door
  (as drawn), and in; three seconds later out empty-handed the same way to the pile;
  bent over it picking one up; a second holding it facing the pile (the front
  carrying drawing); then round, and back to the tower with it. The first time he starts where he is painted.
- **If the Cannon Outpost is sold:** villager 3 stops what he is doing for two
  seconds, drops the cannonball if he has one (it stays on the grass), and walks to
  the lower house's door and is gone, for good — whatever is built there after. In
  the tower when it is sold, he is gone with it.
- **Every 10 enemies killed:** 1 hops twice. The two carriers never hop.
- **A star lost:** "nooo". Crows caw softly throughout; black smoke rises from the
  factory's two chimneys and grey from the three houses'.

## Stage 12's script

The torch-lighter left of the gate with his lit pole; below the gate, the villager
who becomes a musketeer; villagers 1 and 2 to the right of the barricade.

- **As the board opens:** the gate's two torches are drawn unlit. The torch-lighter
  sets off at once, his pole's flame burning live (the painted flame on his drawings
  is the guide to its size and place, and is taken off for it), and walks up to the first with his back to the player (turned right) and lights it; turns
  to face the player and walks down to the second, and lights it with his back turned
  again. He throws the pole down: it falls still lit, its shadow stretching out along
  the grass as it comes down, and lies there burning a while; then its fire dies away
  and the scorch spreads under its end. He walks back into the castle and is gone; the
  pole stays where it fell.
- **Before the first wave:** 1 and 2 stand and greet by turns, facing the player,
  turned left. The villager below the gate stands about, now and then turned to the
  right — he knows nothing of any war.
- **When the first enemy of wave 1 appears:** "hide", and 1 and 2 start standing and praying by
  turns. The villager below the gate walks up into the castle, his back to the player,
  turned right for the last step in at the door.
- **When the first enemy of wave 2 appears:** he comes back out in a musketeer's gear
  — down off the step onto the middle of the stepping-stone path in front of the
  gate, where he stops and says "Musketeer, reporting for duty" (`Musketeer_3`),
  standing there 1.5 seconds; then round to the right below the tower, along above
  the barricade, and down onto his post (the owner's line). He stands there a second, then takes aim for two, and then fires — a
  musketeer there from then on, the same as the one at the bottom right (`recruit` in
  src/villagers.js). Tapped at any time, gear or not, he answers with the Musketeer
  Post's voice. His card is "Villager (Musketeer)" in his villager-musketeer picture
  until he comes out in his gear, and a musketeer's card from then on.
- **Every 10 enemies killed:** 1 hops twice. **Every 12:** 2.
- **A star lost:** "nooo". Crows caw softly throughout, and grey smoke rises from the
  cottage's chimney at the top left.

## Stage 13's script

Left to right: 1 and 2 by the lake, 3 at the top hut's steps, 4 between the two
right-hand huts.

- **Before the first wave:** 1, 2 and 3 stand and greet by turns facing the player,
  turned right; 4 with his back to the player, turned left.
- **When the first enemy of wave 1 appears:** "oh no", and they start standing and praying by
  turns, each facing as before.
- **Every 10 enemies killed:** 1 and 4 hop twice. **Every 12:** 2. **Every 14:** 3.
- **All game long:** every eight to eighteen seconds a fish leaps out of the lake with a
  splash, arcs over and dives back in, rings spreading where it leaves the water and
  where it goes back. The lake itself is still: ripple lines in a deeper blue
  drifting and fading on it, a few glints of sun, and now and then a ring spreading from nothing
  (`lake` in level15.js, `drawBoardLake` in src/motion.js).
- **A star lost:** "nooo". Birdsong, soft, and the lake lapping throughout.

## Stage 14's script

Nobody here is on your side. As the level lists them: 1 the thug between the two
top huts, 2 carrying a box to the top hut, 3 below the top-left hut, 4 by the bottom
hut, 5 the thug beside him. None of them greets, prays or hops. As the first wave
comes the village shouts "get rid of these intruders, brothers!", and it still cries
"nooo" as a star is lost. A tap on any of them plays one of the
`Villager_enemy_selected` lines and, all but the box carrier, sets him on the road
(`hollow` in src/villagers.js).

- **Tapped, every one of them** answers first (the voice takes priority over anything
  else speaking), stands where he is for **2 seconds**, and then walks **slowly** to
  where he is going. Once armed and at the edge of the road, he quickens as he
  crosses it, reaching the creature's own pace in its middle, where he joins it.
- **The two thugs** turn left and right where they stand, all game. **Tapped**, each
  marches to the nearest point of the road and is a **Thug** there: shot at like any
  other, and a life lost if he gets out.
- **The box carrier** brings a box down from the top of the board, bending left down
  past where he is painted and right along below the stepping stones (the owner's
  line), and in at the top hut's door, facing the player — turned left coming down
  (the carrying drawing as it is), mirrored once he turns right. The first time, from where he is painted, he just
  curves down to the door; three seconds inside; out empty-handed and
  back up off the top; three seconds gone; back with the next box.
  **Tapped**, he answers and carries on carrying, at the owner's word. (He used to
  drop the box, go into the hut and come out a Tough Thug; that is kept in the code,
  unused — `keepWorking` on `boxman`.)
- **The man below the top-left hut** turns left and right. **Tapped**, he walks up to
  its door with his back to the player (`Villager_Back_Standing`, as drawn), and
  three seconds later comes back out an **Archer Thug** and makes for the road.
- **The man by the bottom hut** turns left and right. **Tapped**, he walks up to its
  door with his back to the player, mirrored, and three seconds later comes back out
  a **Tough Thug** and makes for the road.
- The three enemy villagers are the ordinary villager drawings in the thugs' dark
  clothes: the game recolours the body's cream `#ffde9e` to `#362407` (`darkVillager`
  in src/render.js). The thugs, and the men once armed, are the Thug's, Tough Thug's
  and Archer Thug's own drawings.
- **Behind the log barricade**, two Elite Archers (Layer 3b) stand and shoot like the
  Crossbow Tower's man for 20 physical damage. They cannot be hurt, and answer with
  the archery voices when tapped.

## Stage 15's script

Nobody here is on your side either (`quarters` in src/villagers.js). As the first
wave comes the camp shouts "you are on forbidden ground!", and a tap on any of them
plays one of the three `Villager_enemy_selected` lines. As the level
lists them: 1 the smith at the brazier, 2 the smith at the anvil, 3–10 the eight
thugs behind the long wall, 11 the Rally Thug at its corner, 12 the thug by the left
hut and 13 the enemy villager between the huts.

- **The smith at the brazier** works as stage 4's at his forge, a little slower: the
  blade held up 4.2 seconds, then into the fire 2.6 seconds, the fire flaring while
  it is in and the weld sounding. **The smith at the anvil** brings the hammer down
  twice and rests, unhurried, a hit from `Anvil_hit_sound` and a burst of sparks each
  time it lands. Both keep working when tapped.
- **The brazier's fire** is the owner's shape: two flames, the front one lower and to
  the left overlapping the one behind (`flames` on the fire in level17.js), low and
  wide until the blade goes in. The brazier's and the two torches' painted flames are
  taken out of the board (`unpaint`) and burn live — the torches sitting down in
  their cups at stage 5's castle torches' size.
- **The dark flag** on the pole at the top left waves: its painted cloth is taken out
  of the board and drawn by the game from the artist's own outline, still at the pole
  and moving most at its free end (`flags` in level17.js).
- **The thug by the left hut** and **the villager between the huts** are stage 14's:
  tapped, each stands 2 seconds; the thug walks down onto the road and is a Thug
  there, and the villager goes into the left hut and comes out a Tough Thug three
  seconds later.
- **The camp behind the wall**, wave by wave as each one begins:
  - before wave 1 — the Rally Thug walks in from the left edge to the wall's corner;
  - waves 1 and 4 — the thugs come in from the left edge one by one, the front line
    (nearest the wall) first, to their places, until there are eight;
  - waves 3 and 6 — if all eight are standing, a war cry, and the back line marches
    up to the top road and the front line down to the bottom one, joining them as
    Thugs (one in four of the top road's down the link);
  - wave 7 — eight more come in the same way, as Tough Thugs;
  - wave 8 — a war cry, and whoever is standing goes, the Rally Thug down to the
    bottom road with the front line.

## Holy light over Dawnford

On stages 6, 7 and 8 — Dawnford's three boards — soft shafts of warm sunlight slant
down over the board and everything on it, each brightening and dimming over ten
seconds or more and wandering slowly left and right, with specks of dust drifting
slowly up inside them. One colour, nothing flashing or sweeping: see `src/holy.js`
and `holy` in the level files. Where the four shafts stand, how wide they are and how
they wander is drawn at random for each board, so no two boards share them.
