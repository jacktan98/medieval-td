# Achievement icons

The pictures for the game's achievements: one icon per achievement, shown on the
Achievements screen and in the pop-up when one is earned, and the trophy that opens
the screen from the world map. Each is wired in by its `icon` in
`src/data/achievements.js`; an achievement without one is drawn with the trophy.

## Names

`Achievements_<number>.png`, numbered in the order the screen shows them, left to
right and top to bottom, 4 to a row. Moving an achievement on the screen means
renumbering its file too, or changing its `icon`.

| File | What it is |
|------|------------|
| `Achievements_Icon.png` | the world map's Achievements button, left of the Upgrades hammer, with the word under it (61 x 55: 0.3 per source px, the same scale as the Encyclopedia book and the hammer); also the stand-in for any achievement without an icon of its own |
| `Achievements_1.png` | Fast Learner |
| `Achievements_2.png` | Seasoned General |
| `Achievements_3.png` | Legend of the Realm |
| `Achievements_4.png` | Master Smith |
| `Achievements_5.png` | Shield of Winchester |
| `Achievements_6.png` | Light of Dawnford |
| `Achievements_7.png` | Steel of Ironforge |
| `Achievements_8.png` | Dawn over the Hollow |
| `Achievements_9.png` | Rain of Quarrels |
| `Achievements_10.png` | Heavy Hitter |
| `Achievements_11.png` | Saving Grace |
| `Achievements_12.png` | Divine Blessing |
| `Achievements_13.png` | Knives Out |
| `Achievements_14.png` | One Shot, One Kill |
| `Achievements_15.png` | Playing with Fire |
| `Achievements_16.png` | Time Stands Still |
| `Achievements_17.png` | Patron of the Arts |
| `Achievements_18.png` | Friend of the People |
| `Achievements_19.png` | No Stone Unturned |
| `Achievements_20.png` | Grand Arsenal |

## How to draw them

- **512 × 512, with the button a 248px disc in the middle**, its own colour and rim,
  as the upgrade faces are (see `assets/upgrades/README.md`). It is drawn 72 across,
  whole, so nothing is drawn under it.
- **Transparent outside the disc.** The game shows a not-yet-earned achievement in
  black and white, faded, so there is no need for a separate "locked" drawing.
- Run `node tools/trim.mjs` after uploading: it measures each disc and says if the
  trim no longer matches.

## Uploading

Upload into this folder (`assets/achievements/`) on GitHub, as with the other art.
To replace an icon, upload a file with the same name.
