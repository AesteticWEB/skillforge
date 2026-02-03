import { calcExamReward, calcScenarioReward } from '@/entities/rewards';

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

  it('applies tech debt penalty to scenario reward', () => {
    const reward = calcScenarioReward({
      reputation: 0,
      techDebt: 10,
      baseCoins: 10,
    });

    expect(reward).toBe(7);
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

  it('never drops below minimum coins', () => {
    const reward = calcScenarioReward({
      reputation: -100,
      techDebt: 100,
      baseCoins: 1,
    });

    expect(reward).toBe(1);
  });
});
