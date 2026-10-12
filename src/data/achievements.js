// THE ACHIEVEMENTS, their names and their words, kept apart from how they are earned
// (src/achievements.js) so they can be rewritten without touching anything else.
// Digits, not words, for numbers, and no contractions, as everywhere in the game.
//
// LISTED IN THE ORDER THE PAGE SHOWS THEM, left to right and top to bottom, 4 to a
// row. `goal` is the number the progress line counts up to; an achievement with
// no `goal` is earned all at once and shows no progress.
//
// `icon` is the artist's picture for it, a key in src/assets.js — see
// assets/achievements/README.md. Without one, the page and the pop-up draw the
// trophy in its place.
//
// {Click} and {click} read "Tap" and "tap" on a touch screen, as the tutorial's do.
export const ACHIEVEMENTS = [
  { id: 'tutorial', name: 'Fast Learner', icon: 'ach_1',
    text: 'Complete the tutorial (stage 1) with 3 stars.' },
  { id: 'normal', name: 'Seasoned General', icon: 'ach_2', goal: 16,
    text: 'Complete every stage with 3 stars on Normal difficulty.' },
  { id: 'hard', name: 'Legend of the Realm', icon: 'ach_3', goal: 16,
    text: 'Complete every stage with 3 stars on Hard difficulty. This also earns Seasoned General.' },
  { id: 'upgrades', name: 'Master Smith', icon: 'ach_4', goal: 16,
    text: 'Buy every upgrade.' },

  { id: 'winchester', name: 'Shield of Winchester', icon: 'ach_5', goal: 3,
    text: 'Complete every Winchester stage with 3 stars.' },
  { id: 'dawnford', name: 'Light of Dawnford', icon: 'ach_6', goal: 3,
    text: 'Complete every Dawnford stage with 3 stars.' },
  { id: 'ironforge', name: 'Steel of Ironforge', icon: 'ach_7', goal: 3,
    text: 'Complete every Ironforge stage with 3 stars.' },
  { id: 'hollow', name: 'Dawn over the Hollow', icon: 'ach_8', goal: 3,
    text: 'Complete every Dark Hollow stage with 3 stars.' },

  { id: 'quarrels', name: 'Rain of Quarrels', icon: 'ach_9', goal: 50000,
    text: 'Have your crossbowmen deal 50,000 damage in total.' },
  { id: 'heavykill', name: 'Heavy Hitter', icon: 'ach_10', goal: 40,
    text: 'Have your ballista engineers kill 40 enemies with Heavy Bolt.' },
  { id: 'holylight', name: 'Saving Grace', icon: 'ach_11', goal: 150,
    text: 'Have your paladins heal themselves fully with Holy Light 150 times.' },
  { id: 'blessing', name: 'Divine Blessing', icon: 'ach_12', goal: 15,
    text: 'Have a pope learn both Holy Wrath and Divine Fortitude 15 times.' },

  { id: 'knife', name: 'Knives Out', icon: 'ach_13', goal: 80,
    text: 'Have your assassins kill 80 enemies with Knife Throw.' },
  { id: 'deadeye', name: 'One Shot, One Kill', icon: 'ach_14', goal: 80,
    text: 'Have your musketeers kill 80 enemies with Deadeye.' },
  { id: 'fiery', name: 'Playing with Fire', icon: 'ach_15', goal: 3000,
    text: 'Have your cannoneers deal 3,000 burn damage with Fiery Shot.' },
  { id: 'monks', name: 'Time Stands Still', icon: 'ach_16', goal: 300,
    text: 'Have your monks slow 300 enemies.' },

  { id: 'book', name: 'Patron of the Arts', icon: 'ach_17', goal: 70,
    text: '{Click} on every picture in the Encyclopedia to see it up close.' },
  { id: 'villagers', name: 'Friend of the People', icon: 'ach_18', goal: 100,
    text: '{Click} on villagers 100 times. Thugs do not count.' },
  { id: 'offroad', name: 'No Stone Unturned', icon: 'ach_19', goal: 17,
    text: '{Click} on every enemy waiting off the road on stages 14, 15 and 16.' },
  { id: 'tier4', name: 'Grand Arsenal', icon: 'ach_20', goal: 8,
    text: 'Build all 8 tier 4 towers in one stage.' }
];

// The page's title and the pop-up's heading.
export const ACHIEVEMENTS_TITLE = 'Achievements';
export const UNLOCKED_TITLE = 'Achievement unlocked!';
