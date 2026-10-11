# Achievement icons

The pictures for the game's achievements: one icon per achievement, shown on the
achievements page and in the pop-up when one is earned. Nothing in the game loads
from this folder yet; the achievements themselves come next, and each icon here will
be listed in the table below as it is wired in.

## Names

`Achievement_<Name>_Icon.svg` (or `.png`), where `<Name>` is the achievement's name
in words joined by underscores, for example `Achievement_Flawless_Victory_Icon.svg`.
One file per achievement. A file named this way can be matched to its achievement
without anything else to look up.

| File | What it is |
|------|------------|
| (none yet) | |

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
