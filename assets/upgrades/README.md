# Upgrade icons

The pictures for the star upgrades on the Upgrades screen (opened from the world
map): one per upgrade, sixteen in all, and one per family for the foot of its
ladder. If a file is missing, its round button shows the rung's number, I to IV,
instead.

## Names

Named by family and rung (1 is the bottom of the ladder) rather than by the
upgrade's name, so a renamed upgrade keeps its file. Each family also has a face of
its own, drawn at the foot of its ladder.

| File | What it is |
|------|------------|
| `Upgrade_Hammer_Icon.png` | the world map's Upgrades button, bottom middle, with the word under it (36 x 49: 0.3 per source px, the same scale as the Encyclopedia book) |
| `Upgrade_Archery_Icon.svg` | the Archery ladder's own button, at its foot |
| `Upgrade_Archery_1_Icon.svg` | Eagle Eye: range +5% |
| `Upgrade_Archery_2_Icon.svg` | Barbed Heads: damage +5% |
| `Upgrade_Archery_3_Icon.svg` | Quick Draw: attack speed +5% |
| `Upgrade_Archery_4_Icon.svg` | Sharpshooter: 10% chance of +50% damage |
| `Upgrade_Barracks_Icon.svg` | the Barracks ladder's own button, at its foot |
| `Upgrade_Barracks_1_Icon.svg` | Hardy Recruits: health +5% |
| `Upgrade_Barracks_2_Icon.svg` | Honed Blades: damage +10% |
| `Upgrade_Barracks_3_Icon.svg` | Call to Arms: respawn 2s sooner |
| `Upgrade_Barracks_4_Icon.svg` | Last Stand: 10% chance to survive on 1 health |
| `Upgrade_Artillery_Icon.svg` | the Artillery ladder's own button, at its foot |
| `Upgrade_Artillery_1_Icon.svg` | Spotter's Glass: range +5% |
| `Upgrade_Artillery_2_Icon.svg` | Heavy Loads: damage +5% |
| `Upgrade_Artillery_3_Icon.svg` | Wide Blast: blast area +10% |
| `Upgrade_Artillery_4_Icon.svg` | Concussion: 10% chance to stun for 0.5s |
| `Upgrade_Monastery_Icon.svg` | the Monastery ladder's own button, at its foot |
| `Upgrade_Monastery_1_Icon.svg` | Far Sight: range +5% |
| `Upgrade_Monastery_2_Icon.svg` | Divine Zeal: damage +5% |
| `Upgrade_Monastery_3_Icon.svg` | Swift Scripture: attack speed +5% |
| `Upgrade_Monastery_4_Icon.svg` | Sands of Time: 10% chance to slow for 2s |

## How to draw them

- **SVG, on a 512 × 512 canvas.** They were PNGs; a PNG's soft edge left small
  white specks round the disc on the dark screen, and a vector has no soft edge to
  leave. Only the Hammer, which sits on the world map, is still a PNG.
- **A whole round button**: the artist's own coloured disc and black rim, **248 px
  across, centred** (the trim is `[132, 132, 248, 248]` in `src/data/ui.js`). The
  game draws it as it is, with nothing under it.
- **The picture centred in the disc.** The star price is in the panel on the right
  of the screen, not on the button.
- **One picture per upgrade, in full colour.** Full colour on the screen means
  BOUGHT: the game shows every upgrade not yet bought faded and in black and
  white, and gives it back its colour while it is selected.
- Drawn at 72 px across, which keeps the 248 px disc sharp on a 3× screen.
