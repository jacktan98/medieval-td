// THE STORY, in four short pieces.
//
// Three chapters — one before each map — and an ending after the last one is
// held. It is a birthday present rather than a novel, so each piece is a few
// short paragraphs: long enough that the maps are about something, short enough
// that a five-year-old sits through it before the fighting starts.
//
// WHEN THEY APPEAR: a chapter is shown when a map is entered FROM THE PICKER,
// before the family panel, and it is skipped by Play again on the result screen.
// That is the rule rather than a "seen it" flag in storage, and it is the right
// one: choosing a map is choosing to start it, and losing on wave 8 and going
// again is not. Nothing here is remembered, so a grown-up who wants to read the
// whole thing again just goes back to the map screen.
//
// Nothing else in the game imports this file, and it imports nothing itself.

// A chapter per map, in the order they are unlocked.
export const CHAPTERS = [
  {
    title: 'Chapter One — The Bend',
    lines:
      'Nobody knows where the thugs came from. One morning they were simply ' +
      'everywhere in Singapore — turning over bins, marching up the ' +
      'expressways — until the whole island had gone quiet behind locked ' +
      'doors.\n\n' +
      'By the afternoon they had found our road.\n\n' +
      'Mommy called Papa. No answer. She called again. Rei was not in his cot ' +
      'and Papa\'s shoes were gone from the rack.\n\n' +
      'So it is the two of them: Mommy, with the shotgun from the storeroom, ' +
      'and Ella, who has been saving slime for exactly this. The bend in the ' +
      'road is the only way in. Hold it, and we can reach Papa.',
    go: 'Hold the bend'
  },
  {
    title: 'Chapter Two — The Fork',
    lines:
      'Papa came up the road at a run, both swords out and a very long story ' +
      'to tell.\n\n' +
      'He had been two streets away the whole time, pinned against the wall of ' +
      'the void deck by six of them, fighting his way home a metre at a time. ' +
      'He got here. He did not get Rei.\n\n' +
      '"He was not at the childcare. He was not at Ah Ma\'s." Mommy is already ' +
      'reloading.\n\n' +
      'There is no time to go and look. The next lot are coming up the fork, ' +
      'both sides of it at once, and if we lose the road we lose the house.',
    go: 'Hold the fork'
  },
  {
    title: 'Chapter Three — Two Rivers',
    lines:
      'We heard him before we saw him — a thin, furious wail from the back of ' +
      'the house.\n\n' +
      'Rei. Lying on his pee pad by the sliding door, perfectly fine, ' +
      'perfectly furious, and surrounded by a stench that made Papa\'s eyes ' +
      'water from the kitchen doorway.\n\n' +
      'There is no time to change him. The road splits twice out there and ' +
      'every thug left on the island is coming down both halves of it.\n\n' +
      'Pick him up, put him by the road, and let him do what he does.',
    go: 'Hold both rivers'
  }
];

// After the last map is held. Shown before the stars rather than instead of
// them — the result screen still comes, with whatever was earned on it.
export const ENDING = {
  title: 'The house is ours',
  lines:
    'The last of them went down at the top of the road, and then there was ' +
    'nothing out there at all but the crickets and somebody\'s car alarm.\n\n' +
    'The house held. Not one of us could have held it alone — Mommy on the ' +
    'road, Ella\'s slime slowing them to a crawl, Papa standing in front of ' +
    'everything too big to shoot, and Rei being completely unbearable at ' +
    'exactly the right moment.\n\n' +
    'We defended the house together, as a family.\n\n' +
    'Now somebody go and change that baby.',
  go: 'See how we did'
};

export const chapterFor = mapIndex => CHAPTERS[mapIndex] || null;
