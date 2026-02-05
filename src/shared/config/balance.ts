export const BALANCE = {
  newGame: {
    startCoins: 100,
    startReputation: 0,
    startTechDebt: 0,
  },
  ngPlus: {
    startCoinsBonusPct: 0.2,
    difficultyMultiplier: 1.2,
    carryOver: {
      luxuryOnly: true,
      badges: true,
    },
  },
  streaks: [3, 7, 14],
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
  company: {
    startCash: 5000,
    startLevel: 'lead',
    hiringBaseCostCashByRole: {
      junior: 1000,
      middle: 2500,
      senior: 6000,
    },
    moraleStartMin: 80,
    moraleStartMax: 100,
    tick: {
      baseIncomeCash: 120,
      incomePerEmployeeCash: 80,
      salaryByRole: {
        junior: 60,
        middle: 140,
        senior: 260,
      },
      morale: {
        startMin: 80,
        startMax: 100,
        driftUpWhenProfitable: 1,
        driftDownWhenCrisis: 2,
        min: 0,
        max: 100,
      },
      incident: {
        baseChance: 0.12,
        chanceFromTechDebtPct: 0.01,
        chanceReduceCapPct: 0.8,
        reduceCapPct: 0.8,
        baseCostCash: 260,
        baseRepPenalty: 2,
        moralePenalty: 6,
      },
      crisis: {
        repPenalty: 3,
        moralePenalty: 8,
      },
    },
    assignments: {
      delivery: {
        cashIncomePct: 0.06,
        repDelta: 1,
        debtDelta: 0.4,
        incidentReducePct: 0.02,
      },
      refactor: {
        cashIncomePct: 0.02,
        repDelta: 0,
        debtDelta: -1.2,
        incidentReducePct: 0.05,
      },
      qa: {
        cashIncomePct: 0.02,
        repDelta: 0.5,
        debtDelta: -0.4,
        incidentReducePct: 0.12,
      },
      ops: {
        cashIncomePct: 0.03,
        repDelta: 0.3,
        debtDelta: -0.6,
        incidentReducePct: 0.18,
      },
      sales: {
        cashIncomePct: 0.1,
        repDelta: 0.8,
        debtDelta: 0.6,
        incidentReducePct: 0,
      },
    },
  },
  hiring: {
    refreshCostCoins: 200,
    poolSize: 6,
    maxTraitsPerCandidate: 3,
    qualityBonusPctMax: 0.5,
    traitEffectCaps: {
      cashIncomeBonusPct: 0.3,
      incidentReducePct: 0.3,
      techDebtDeltaPerTickAbs: 1.2,
      productivityPct: 0.3,
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
    incidentReducePctMax: 0.8,
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
