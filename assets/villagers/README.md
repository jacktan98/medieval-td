# Villagers

The animations for the people who live on each stage. Nothing here is loaded by the
game yet. When the first set arrives it gets wired in, and this page is updated to
say which files are in use.

## Where villagers stand today

Every villager is painted into their stage's artwork and never moves. The game only
knows where each one stands so a tap can open their card (see `villagers` in each
`src/data/levelNN.js`, and `src/villagers.js`). Their card picture is
`assets/units/Villager_Default.png`, which stays where it is.

To animate a villager on a board, the game will cut the painted figure out of that
stage's artwork, then draw the frames from this folder in its place. Draw frames so
the villager could stand in for the painted one without looking out of place.

## How to draw the frames

- **Canvas and scale:** the same 512 × 512 canvas and the same scale as every other
  figure in `assets/units`, so a villager is the same size as a soldier.
- **Ground shadow:** the same dark brown flat ellipse under the feet (`#362407`),
  in the **same place in every frame** of an animation. The shadow's centre is where
  the villager stands, so a shadow that moves between frames makes the figure slide.
- **Facing:** draw them facing the way the painted villager faces. The game can
  mirror a whole animation if one needs to face the other way.
- **Frames:** 2 to 4 frames is plenty for a looping action.

## How to name them

Villager_<Action>_<frame>, as PNG, frames numbered from 1 in the order they play.
For example:

| action        | files                                          |
|---------------|------------------------------------------------|
| chopping wood | Villager_Chop_1, Villager_Chop_2, Villager_Chop_3 |
| fishing       | Villager_Fish_1, Villager_Fish_2               |
| waving        | Villager_Wave_1, Villager_Wave_2               |

(These are examples, not files already here. Once real ones arrive they are listed
here by name.)

When you upload, say which stage and which villager each animation is for, such as
"the two by the Oakhaven campfire", and how fast it should play.
