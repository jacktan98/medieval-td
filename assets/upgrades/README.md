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
| `Upgrade_Archery_Icon.png` | the Archery ladder's own button, at its foot |
| `Upgrade_Archery_1_Icon.png` | Eagle Eye: range +5% |
| `Upgrade_Archery_2_Icon.png` | Barbed Heads: damage +5% |
| `Upgrade_Archery_3_Icon.png` | Quick Draw: attack speed +5% |
| `Upgrade_Archery_4_Icon.png` | Sharpshooter: 10% chance of +50% damage |
| `Upgrade_Barracks_Icon.png` | the Barracks ladder's own button, at its foot |
| `Upgrade_Barracks_1_Icon.png` | Hardy Recruits: health +5% |
| `Upgrade_Barracks_2_Icon.png` | Quick Muster: respawn 2s sooner |
| `Upgrade_Barracks_3_Icon.png` | Honed Blades: damage +10% |
| `Upgrade_Barracks_4_Icon.png` | Last Stand: 10% chance to survive on 1 health |
| `Upgrade_Artillery_Icon.png` | the Artillery ladder's own button, at its foot |
| `Upgrade_Artillery_1_Icon.png` | Spotter's Glass: range +5% |
| `Upgrade_Artillery_2_Icon.png` | Heavy Loads: damage +5% |
| `Upgrade_Artillery_3_Icon.png` | Wide Blast: blast area +10% |
| `Upgrade_Artillery_4_Icon.png` | Concussion: 10% chance to stun for 0.5s |
| `Upgrade_Monastery_Icon.png` | the Monastery ladder's own button, at its foot |
| `Upgrade_Monastery_1_Icon.png` | Far Sight: range +5% |
| `Upgrade_Monastery_2_Icon.png` | Divine Zeal: damage +5% |
| `Upgrade_Monastery_3_Icon.png` | Swift Prayers: attack speed +5% |
| `Upgrade_Monastery_4_Icon.png` | Sands of Time: 10% chance to slow for 2s |

## How to draw them

- **PNG, 512 × 512, transparent background.**
- **A whole round button**: the artist's own coloured disc and black rim, **248 px
  across, centred** (the trim is `[132, 132, 248, 248]` in `src/data/ui.js`). The
  game draws it as it is, with nothing under it.
- **The picture centred in the disc.** The star price is in the panel on the right
  of the screen, not on the button.
- **One picture per upgrade, in full colour.** Full colour on the screen means
  BOUGHT: the game shows every upgrade not yet bought faded and in black and
  white, and gives it back its colour while it is selected.
- Drawn at 72 px across, which keeps the 248 px disc sharp on a 3× screen.
