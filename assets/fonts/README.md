# Fonts

| file | what it is | used for |
|------|------------|----------|
| `Lobster-Regular.woff2` | Lobster, by Pablo Impallari — Google Fonts' Latin subset (v32) | the world map's region names and its two door labels, Encyclopedia and Upgrades — a test, at the owner's word |

Loaded by `src/overview.js` through the FontFace API, from this folder rather than
from Google, so the game carries everything it draws and works offline. Until it has
arrived, the text is drawn in the system font and redrawn once it is ready.

## Licence

Lobster is Copyright (c) 2010 Pablo Impallari (www.impallari.com,
impallari@gmail.com), with Reserved Font Name "Lobster". It is licensed under the
SIL Open Font License, Version 1.1 — https://openfontlicense.org — which allows it
to be bundled and redistributed with this game, but not sold on its own.
