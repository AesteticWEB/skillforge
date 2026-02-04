export const BALANCE = {
  rewards: {
    scenarioXp: 5,
    scenarioCoins: 6,
    examCoins: 12,
    minCoins: 1,
    reputation: {
      perPoint: 0.02,
      minMultiplier: 0.7,
      maxMultiplier: 1.5,
    },
    techDebt: {
      perPoint: 0.03,
      maxPenalty: 0.6,
    },
    exam: {
      minScoreMultiplier: 0.6,
      maxScoreMultiplier: 1.4,
    },
    examSpeed: {
      targetSeconds: 240,
      stepSeconds: 15,
      maxBonusRatio: 0.2,
    },
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
  caps: {
    coinsBonusPctMax: 0.3,
    xpBonusPctMax: 0.3,
    incidentReducePctMax: 0.5,
    cashIncomeBonusPctMax: 0.3,
    techDebtReduceFlatMaxAbs: 5,
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
