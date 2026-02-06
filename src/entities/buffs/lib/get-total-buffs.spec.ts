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
      xpBonusPct: 0,
      repBonusFlat: 0,
      techDebtReduceFlat: 0,
      cashIncomeBonusPct: 0,
      incidentReducePct: 0,
      candidateQualityBonusPct: 0,
    });
  });

  it('clamps percentage bonuses by caps', () => {
    const result = getTotalBuffs([
      {
        effects: {
          coinsBonusPct: 1,
          xpBonusPct: 2,
          cashIncomeBonusPct: 5,
          incidentReducePct: 2,
          techDebtReduceFlat: 10,
        },
      },
    ]);

    expect(result.coinMultiplier).toBeLessThanOrEqual(0.3);
    expect(result.xpBonusPct).toBeLessThanOrEqual(0.3);
    expect(result.cashIncomeBonusPct).toBeLessThanOrEqual(0.3);
    expect(result.incidentReducePct).toBeLessThanOrEqual(0.8);
    expect(Math.abs(result.techDebtReduceFlat)).toBeLessThanOrEqual(5);
  });

  it('includes profession perks and specialization effects', () => {
    const result = getTotalBuffs([], 'frontend', 'spec_frontend_performance');

    expect(result.xpBonusPct).toBeCloseTo(0.11, 5);
    expect(result.coinMultiplier).toBeCloseTo(0.02, 5);
    expect(result.repBonusFlat).toBeCloseTo(0.5, 5);
  });
});
