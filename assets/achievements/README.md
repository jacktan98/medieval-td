# Achievement icons

The pictures for the game's achievements: one icon per achievement, shown on the
achievements page and in the pop-up when one is earned, and the trophy that opens
the page from the world map. Until an achievement's own icon is uploaded, the page
and the pop-up draw the trophy in its place. Each icon is listed in the table below
as it is wired in (its `icon` in `src/data/achievements.js`).

The 20 achievements, in the order the page shows them, which is the name each
icon's file takes: Fast Learner, Seasoned General, Legend of the Realm, Master
Smith, Shield of Winchester, Light of Dawnford, Steel of Ironforge, Dawn over the
Hollow, Patron of the Arts, Friend of the People, No Stone Unturned, Grand Arsenal,
Rain of Quarrels, Heavy Hitter, Saving Grace, Divine Judgment, Knives Out, One Shot,
One Kill (its file drops the comma), Playing with Fire, Time Stands Still.

## Names

`Achievement_<Name>_Icon.svg` (or `.png`), where `<Name>` is the achievement's name
in words joined by underscores: "Flawless Victory" would be
`Achievement_Flawless_Victory_Icon`, with `.svg` or `.png` on the end.
One file per achievement. A file named this way can be matched to its achievement
without anything else to look up.

| File | What it is |
|------|------------|
| `Achievements_Icon.png` | the world map's Achievements button, left of the Upgrades hammer, with the word under it (61 x 55: 0.3 per source px, the same scale as the Encyclopedia book and the hammer); also the stand-in on every achievement until its own icon arrives |

## How to draw them

- **SVG on a 512 × 512 canvas is best**, as the upgrade icons are (see
  `assets/upgrades/README.md`): it stays sharp at any size and its edges stay clean.
  A PNG at 512 × 512 works too.
- **Fill the canvas the same way in every icon**, the picture centred with a
  similar margin all round, so a row of them reads as a set.
- **Transparent background.** The game draws its own plate or medallion behind each
  icon, and greys it out while the achievement is still locked, so there is no need
  for a separate "locked" drawing. If you would rather draw one, name it
  `Achievement_<Name>_Locked_Icon.svg` and it will be used instead.

## Uploading

Upload into this folder (`assets/achievements/`) on GitHub, as with the other art.
To replace an icon, upload a file with the same name.
