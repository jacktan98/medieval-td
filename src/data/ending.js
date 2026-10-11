// THE ENDING'S WORDS, kept apart from how it plays (src/ending.js) so they can be
// rewritten without touching anything else. Digits, not words, for numbers, and no
// contractions, as everywhere in the game.

// The closing words, on the paper panel, after the road has lit up.
export const ENDING_WORDS =
  'The Captain Thug and the Crow Harbinger have both fallen. Without their leader, the ' +
  'thugs have laid down their weapons and gone home in peace, and the crows have left the ' +
  'sky for good. From the Citadel to Oakhaven, every town on this road still stands because ' +
  'you held it. The people of Oakhaven are going home, General. Rest now. You have earned it.';

// The tally's heading. Its rows are the player's own numbers — see `tally` in
// src/ending.js.
export const TALLY_TITLE = 'Your campaign';

// The credits, a line each. An empty string is a gap.
export const CREDITS = [
  'Medieval TD',
  '',
  'Created by Jack Tan',
  '',
  'Thank you for playing!'
];

// The seal on the world map once the campaign is over; tapping it plays the ending again.
export const SEAL_TEXT = 'Campaign complete';
