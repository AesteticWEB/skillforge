export type BuffEffects = {
  coinMultiplier?: number;
  coinMultiplierPercent?: number;
  coinBonus?: number;
};

export type BuffSource = {
  id?: string;
  effects?: BuffEffects | null;
};

export type TotalBuffs = {
  coinMultiplier: number;
  coinBonus: number;
};
