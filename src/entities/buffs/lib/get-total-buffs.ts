import { BuffSource, TotalBuffs } from '../model/buffs.model';

const normalizeNumber = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }
  return value;
};

export const getTotalBuffs = (sources: BuffSource[] = []): TotalBuffs => {
  let coinMultiplier = 0;
  let coinBonus = 0;

  for (const source of sources) {
    const effects = source?.effects;
    if (!effects) {
      continue;
    }
    coinMultiplier += normalizeNumber(effects.coinMultiplier);
    coinMultiplier += normalizeNumber(effects.coinMultiplierPercent) / 100;
    coinBonus += normalizeNumber(effects.coinBonus);
  }

  return {
    coinMultiplier,
    coinBonus,
  };
};
