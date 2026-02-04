export type BuffEffects = {
  coinMultiplier?: number;
  coinMultiplierPercent?: number;
  coinBonus?: number;
  coinsBonusPct?: number;
  xpBonusPct?: number;
  repBonusFlat?: number;
  techDebtReduceFlat?: number;
  cashIncomeBonusPct?: number;
  incidentReducePct?: number;
  candidateQualityBonusPct?: number;
};

export type BuffSource = {
  id?: string;
  effects?: BuffEffects | null;
};

export type TotalBuffs = {
  coinMultiplier: number;
  coinBonus: number;
  xpBonusPct: number;
  repBonusFlat: number;
  techDebtReduceFlat: number;
  cashIncomeBonusPct: number;
  incidentReducePct: number;
  candidateQualityBonusPct: number;
};
