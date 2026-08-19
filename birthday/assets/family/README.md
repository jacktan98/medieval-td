# Family artwork

The fourteen drawings this game is made of. 512 x 512, transparent background,
the same canvas as the big game's units so a drawing made for one is the right
size for the other.

**Two things the code reads out of the pixels rather than being told:** the trim
box (what part of the 512 has ink on it) and the pivot (the centre of the flat
brown ellipse under a figure, which is where they stand). Re-export a file and
run `node birthday/tools/art.mjs` — it prints both, plus whether the file has the
pixels to stay sharp. Paste what it says into `../../src/data.js`.

The shadow brown has to stay exactly **54, 36, 7**; that is the colour the tool
looks for, and a near-miss is reported rather than guessed at.
