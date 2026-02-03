export const BALANCE = {
  rewards: {
    scenarioXp: 5,
  },
  skills: {
    upgradeCostPerLevel: 1,
    defaultLevel: 0,
    defaultMaxLevel: 5,
  },
  effects: {
    reputation: {
      gain: 1,
      loss: 1,
    },
    techDebt: {
      gain: 1,
      relief: 1,
    },
    skill: {
      gain: 1,
    },
  },
  sandbox: {
    steps: 50,
    starting: {
      coins: 0,
      cash: 100,
      reputation: 0,
      techDebt: 0,
    },
    outcomes: {
      positive: 55,
      neutral: 25,
      negative: 20,
    },
    coins: {
      gainMin: 2,
      gainMax: 8,
      lossMin: 0,
      lossMax: 4,
    },
    cash: {
      gainMin: 5,
      gainMax: 20,
      lossMin: 0,
      lossMax: 12,
    },
    reputation: {
      gainMin: 0,
      gainMax: 2,
      lossMin: 0,
      lossMax: 2,
    },
    techDebt: {
      gainMin: 0,
      gainMax: 2,
      reliefMin: 0,
      reliefMax: 1,
    },
  },
} as const;
