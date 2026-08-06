export const enemyTypes = {
  light_inf: {
    hp: 50,
    speed: 52,      // logical px per second
    bounty: 10,
    leak: 1,        // lives lost if it reaches the keep
    damage: 6,      // per swing, once a barracks soldier has stopped it
    atkCd: 1.0,
    r: 11,
    colour: '#B98B5E'
  }
};

// gap = seconds between spawns within the wave
// rest = seconds after the wave clears before the next one starts
export const waves = [
  { type: 'light_inf', count: 6,  gap: 1.10, rest: 8 },
  { type: 'light_inf', count: 8,  gap: 1.00, rest: 8 },
  { type: 'light_inf', count: 10, gap: 0.90, rest: 8 },
  { type: 'light_inf', count: 12, gap: 0.80, rest: 8 },
  { type: 'light_inf', count: 14, gap: 0.70, rest: 8 },
  { type: 'light_inf', count: 18, gap: 0.60, rest: 8 },
  { type: 'light_inf', count: 24, gap: 0.50, rest: 8 },
  { type: 'light_inf', count: 30, gap: 0.40, rest: 0 }
];

export const waveClearBonus = 30;
