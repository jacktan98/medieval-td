// THE ACHIEVEMENTS, their names and their words, kept apart from how they are earned
// (src/achievements.js) so they can be rewritten without touching anything else.
// Digits, not words, for numbers, and no contractions, as everywhere in the game.
//
// LISTED IN THE ORDER THE PAGE SHOWS THEM, left to right and top to bottom, 4 to a
// row. `goal` is the number the progress line counts up to; an achievement with
// no `goal` is earned all at once and shows no progress.
//
// `icon` is the artist's picture for it, a key in src/assets.js, once it has been
// drawn — see assets/achievements/README.md. Until then the page and the pop-up
// draw the trophy in its place.
//
// {Click} and {click} read "Tap" and "tap" on a touch screen, as the tutorial's do.
export const ACHIEVEMENTS = [
  { id: 'tutorial', name: 'Fast Learner', icon: null,
    text: 'Complete the tutorial (stage 1) with 3 stars.' },
  { id: 'normal', name: 'Seasoned General', icon: null, goal: 16,
    text: 'Complete every stage with 3 stars on Normal difficulty.' },
  { id: 'hard', name: 'Legend of the Realm', icon: null, goal: 16,
    text: 'Complete every stage with 3 stars on Hard difficulty. This also earns Seasoned General.' },
  { id: 'upgrades', name: 'Master Smith', icon: null, goal: 16,
    text: 'Buy every upgrade.' },

  { id: 'winchester', name: 'Shield of Winchester', icon: null, goal: 3,
    text: 'Complete every Winchester stage with 3 stars.' },
  { id: 'dawnford', name: 'Light of Dawnford', icon: null, goal: 3,
    text: 'Complete every Dawnford stage with 3 stars.' },
  { id: 'ironforge', name: 'Steel of Ironforge', icon: null, goal: 3,
    text: 'Complete every Ironforge stage with 3 stars.' },
  { id: 'hollow', name: 'Dawn over the Hollow', icon: null, goal: 3,
    text: 'Complete every Dark Hollow stage with 3 stars.' },

  { id: 'book', name: 'Patron of the Arts', icon: null, goal: 70,
    text: '{Click} on every picture in the Encyclopedia to see it up close.' },
  { id: 'villagers', name: 'Friend of the People', icon: null, goal: 100,
    text: '{Click} on villagers 100 times. Thugs do not count.' },
  { id: 'offroad', name: 'No Stone Unturned', icon: null, goal: 17,
    text: '{Click} on every enemy waiting off the road on stages 14, 15 and 16.' },
  { id: 'tier4', name: 'Grand Arsenal', icon: null, goal: 8,
    text: 'Build all 8 tier 4 towers in one stage.' },

  { id: 'quarrels', name: 'Rain of Quarrels', icon: null, goal: 10000,
    text: 'Have your crossbowmen deal 10,000 damage in total.' },
  { id: 'heavykill', name: 'Heavy Hitter', icon: null, goal: 100,
    text: 'Have your ballista engineers kill 100 enemies with Heavy Bolt.' },
  { id: 'holylight', name: 'Saving Grace', icon: null, goal: 200,
    text: 'Have your paladins heal themselves fully with Holy Light 200 times.' },
  { id: 'blessing', name: 'Divine Blessing', icon: null, goal: 30,
    text: 'Have a pope learn both Holy Wrath and Divine Fortitude 30 times.' },

  { id: 'knife', name: 'Knives Out', icon: null, goal: 100,
    text: 'Have your assassins kill 100 enemies with Knife Throw.' },
  { id: 'deadeye', name: 'One Shot, One Kill', icon: null, goal: 100,
    text: 'Have your musketeers kill 100 enemies with Deadeye.' },
  { id: 'fiery', name: 'Playing with Fire', icon: null, goal: 2000,
    text: 'Have your cannoneers deal 2,000 burn damage with Fiery Shot.' },
  { id: 'monks', name: 'Time Stands Still', icon: null, goal: 300,
    text: 'Have your monks slow 300 enemies.' }
];

// The page's title and the pop-up's heading.
export const ACHIEVEMENTS_TITLE = 'Achievements';
export const UNLOCKED_TITLE = 'Achievement unlocked!';
