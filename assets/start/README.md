# Start page

The artwork for the start page: the first screen a player sees, before the world
map, with the game's logo and the Start button (like Kingdom Rush 1's).

The start page itself is not in the game yet. The name already is: the loading
screen draws `Start_Page_Name.svg` in place of the words "Medieval TD" (see NAME_SRC
in src/main.js), so a new upload of it shows there at once.

## The layers

Each one 1920 × 1080 over the whole screen, laid down in this order, back to front:

| File | What it is |
|------|------------|
| `Start_Page_1.svg` | the scene: sky, clouds, birds, mountains, trees and the road |
| `Start_Page_2.svg` | the fight on the road |
| `Start_Page_3.svg` | the archery tower and the villager with his box |
| `Start_Page_4.svg` | the tent and its flag, in front |
| `Start_Page_Name.svg` | the name, Medieval Tower Defense, with its arrow, shield, sword and torch, over everything |

THE NAME IS LETTERED AS THE WORLD MAP'S AREA NAMES ARE, at the owner's word: cream
(#FFEFD4) with a black edge (a 17px stroke drawn behind the fill, so about 8px of it
shows). And the whole of it, lettering and pictures together, casts a dark shadow
— a soft dark glow all round it and a crisper one offset down and to the right —
made by the `shadow` filter in the file rather than drawn, so redraw the name and
the shadow follows it. Both were added to the uploaded file; an upload that
replaces it needs them again (or ask for them).

Drawn in layers so the page can move a little (flags waving, birds circling, the
name dropping in) and so one part can be redrawn without the rest.

## Sizes

- **1920 × 1080**, the same as the stage maps, for the background and any layer
  meant to be laid over the whole screen.
- **Leave room for the buttons**: the Start button goes under the logo in the
  middle, the music and sound buttons in a corner, and "Created by Jack Tan" along
  the bottom. Nothing important under those.

The drafts to draw over are the three title page mockups (A Castle Gate, B Old Map,
C Dark Hollow).
