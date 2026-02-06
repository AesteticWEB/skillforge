import { calcExamReward, calcScenarioReward, calcScenarioXp } from '@/entities/rewards';

describe('reward engine', () => {
  it('applies reputation and buffs to scenario reward', () => {
    const reward = calcScenarioReward({
      reputation: 10,
      techDebt: 0,
      baseCoins: 10,
      buffs: {
        coinMultiplier: 0.25,
      },
    });

    expect(reward).toBe(15);
  });

  it('applies percentage coin bonus from buffs', () => {
    const reward = calcScenarioReward({
      reputation: 0,
      techDebt: 0,
      baseCoins: 10,
      buffs: {
        coinsBonusPct: 0.1,
      },
    });

    expect(reward).toBe(11);
  });

  it('applies tech debt penalty to scenario reward', () => {
    const reward = calcScenarioReward({
      reputation: 0,
      techDebt: 10,
      baseCoins: 10,
    });

    expect(reward).toBe(7);
  });

  it('applies combo multiplier to coins', () => {
    const reward = calcScenarioReward({
      reputation: 0,
      techDebt: 0,
      baseCoins: 20,
      comboMultiplier: 1.25,
    });

    expect(reward).toBe(25);
  });

  it('caps combo multiplier at max', () => {
    const reward = calcScenarioReward({
      reputation: 0,
      techDebt: 0,
      baseCoins: 10,
      comboMultiplier: 5,
    });

    expect(reward).toBe(15);
  });

  it('scales exam reward with score ratio', () => {
    const reward = calcExamReward({
      reputation: 0,
      techDebt: 0,
      baseCoins: 10,
      score: 100,
      maxScore: 100,
    });

    expect(reward).toBe(14);
  });

  it('applies rating multiplier to exam reward', () => {
    const reward = calcExamReward({
      reputation: 0,
      techDebt: 0,
      baseCoins: 10,
      score: 100,
      maxScore: 100,
      playerSkillRating: 90,
    });

    expect(reward).toBe(16);
  });

  it('returns zero reward for failed exam', () => {
    const reward = calcExamReward({
      reputation: 0,
      techDebt: 0,
      baseCoins: 10,
      score: 10,
      maxScore: 100,
      passed: false,
    });

    expect(reward).toBe(0);
  });

  it('applies xp bonus to scenario xp', () => {
    const rewardXp = calcScenarioXp({
      baseXp: 10,
      buffs: {
        xpBonusPct: 0.2,
      },
    });

    expect(rewardXp).toBe(12);
  });

  it('never drops below minimum coins', () => {
    const reward = calcScenarioReward({
      reputation: -100,
      techDebt: 100,
      baseCoins: 1,
    });

    expect(reward).toBe(1);
  });
});
