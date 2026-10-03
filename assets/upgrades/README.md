# Upgrade icons

The pictures for the star upgrades on the Upgrades screen (opened from the world
map). One icon per upgrade, sixteen in all. Until they are here, each round button
shows its number, I to IV.

## Names

Named by family and rung (1 is the bottom of the ladder) rather than by the
upgrade's name, so a renamed upgrade keeps its file. They are written here without
code marks until they arrive, so tools/readme.mjs does not report them missing; once
they are in the folder, mark them up like every other file name in these READMEs.

| File | Upgrade |
|------|---------|
| Upgrade_Archery_1.png | Eagle Eye: range +5% |
| Upgrade_Archery_2.png | Barbed Heads: damage +5% |
| Upgrade_Archery_3.png | Quick Draw: attack speed +5% |
| Upgrade_Archery_4.png | Lucky Shot: 5% chance of +50% damage |
| Upgrade_Barracks_1.png | Hardy Recruits: health +5% |
| Upgrade_Barracks_2.png | Quick Muster: respawn 2s sooner |
| Upgrade_Barracks_3.png | Whetstones: damage +10% |
| Upgrade_Barracks_4.png | Last Stand: 5% chance to survive on 1 health |
| Upgrade_Artillery_1.png | Counterweights: range +5% |
| Upgrade_Artillery_2.png | Heavy Loads: damage +5% |
| Upgrade_Artillery_3.png | Wide Blast: blast area +10% |
| Upgrade_Artillery_4.png | Great Blast: 5% chance of +50% blast area |
| Upgrade_Monastery_1.png | Far Sight: range +5% |
| Upgrade_Monastery_2.png | Holy Fervour: damage +5% |
| Upgrade_Monastery_3.png | Swift Prayers: attack speed +5% |
| Upgrade_Monastery_4.png | Binding Light: 5% chance to slow for 2s |

## How to draw them

- **PNG, 512 × 512, transparent background**, the same canvas as the ability
  buttons in `assets/abilities/` and the radial menu's plate.
- **A round disc**, in the same place and at the same size as the radial menu's
  plate (`assets/ui/Button_Plate_Icon.png`): 186 px across, centred.
- **Keep the bottom third of the disc fairly clear.** The star price, or the tick
  once bought, sits there.
- **One picture per upgrade.** The game dims the ones not yet available and marks
  the bought ones itself, so there is no need for locked or bought versions.
