import { getTotalBuffs } from './get-total-buffs';

describe('getTotalBuffs', () => {
  it('sums bonus and multiplier buffs', () => {
    const result = getTotalBuffs([
      { effects: { coinBonus: 5, coinMultiplier: 0.1 } },
      { effects: { coinBonus: 2, coinMultiplier: 0.05 } },
    ]);

    expect(result.coinBonus).toBe(7);
    expect(result.coinMultiplier).toBeCloseTo(0.15, 5);
  });

  it('converts percent multipliers to decimals', () => {
    const result = getTotalBuffs([
      { effects: { coinMultiplierPercent: 10 } },
      { effects: { coinMultiplierPercent: 5 } },
    ]);

    expect(result.coinMultiplier).toBeCloseTo(0.15, 5);
    expect(result.coinBonus).toBe(0);
  });

  it('treats missing effects as zero', () => {
    const result = getTotalBuffs([{}, { effects: undefined }, { effects: null }, { effects: {} }]);

    expect(result).toEqual({
      coinBonus: 0,
      coinMultiplier: 0,
    });
  });
});
