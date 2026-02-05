import { BALANCE } from '@/shared/config';

export type RewardBuffs = {
  coinMultiplier?: number;
  coinBonus?: number;
  coinsBonusPct?: number;
  xpBonusPct?: number;
  repBonusFlat?: number;
  techDebtReduceFlat?: number;
  cashIncomeBonusPct?: number;
  incidentReducePct?: number;
  candidateQualityBonusPct?: number;
};

export type ScenarioRewardInput = {
  reputation: number;
  techDebt: number;
  buffs?: RewardBuffs;
  baseCoins?: number;
  difficultyMultiplier?: number;
};

export type ExamRewardInput = ScenarioRewardInput & {
  score: number;
  maxScore?: number;
};

export type ScenarioXpInput = {
  baseXp?: number;
  buffs?: RewardBuffs;
};

const clampNumber = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const normalizeNumber = (value: number): number => (Number.isFinite(value) ? value : 0);

const resolveBaseCoins = (value: number | undefined, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, value);
};

const resolveBuffs = (buffs?: RewardBuffs): Required<RewardBuffs> => {
  const multiplier = buffs?.coinMultiplier ?? 0;
  const bonus = buffs?.coinBonus ?? 0;
  const coinsBonusPct = buffs?.coinsBonusPct ?? 0;
  const xpBonusPct = buffs?.xpBonusPct ?? 0;
  const repBonusFlat = buffs?.repBonusFlat ?? 0;
  const techDebtReduceFlat = buffs?.techDebtReduceFlat ?? 0;
  const cashIncomeBonusPct = buffs?.cashIncomeBonusPct ?? 0;
  const incidentReducePct = buffs?.incidentReducePct ?? 0;
  const candidateQualityBonusPct = buffs?.candidateQualityBonusPct ?? 0;

  return {
    coinMultiplier: Number.isFinite(multiplier) ? Math.max(0, multiplier) : 0,
    coinBonus: Number.isFinite(bonus) ? Math.max(0, bonus) : 0,
    coinsBonusPct: Number.isFinite(coinsBonusPct) ? Math.max(0, coinsBonusPct) : 0,
    xpBonusPct: Number.isFinite(xpBonusPct) ? Math.max(0, xpBonusPct) : 0,
    repBonusFlat: Number.isFinite(repBonusFlat) ? repBonusFlat : 0,
    techDebtReduceFlat: Number.isFinite(techDebtReduceFlat) ? techDebtReduceFlat : 0,
    cashIncomeBonusPct: Number.isFinite(cashIncomeBonusPct) ? Math.max(0, cashIncomeBonusPct) : 0,
    incidentReducePct: Number.isFinite(incidentReducePct) ? Math.max(0, incidentReducePct) : 0,
    candidateQualityBonusPct: Number.isFinite(candidateQualityBonusPct)
      ? Math.max(0, candidateQualityBonusPct)
      : 0,
  };
};

const calcRewardCoins = (
  baseCoins: number,
  reputation: number,
  techDebt: number,
  buffs: RewardBuffs | undefined,
  scoreMultiplier: number,
  difficultyMultiplier: number,
): number => {
  const { rewards } = BALANCE;
  const repConfig = rewards.reputation;
  const debtConfig = rewards.techDebt;
  const resolvedBuffs = resolveBuffs(buffs);
  const safeBase = resolveBaseCoins(baseCoins, rewards.minCoins);
  const safeRep = normalizeNumber(reputation);
  const safeDebt = Math.max(0, normalizeNumber(techDebt));

  const repMultiplier = clampNumber(
    1 + safeRep * repConfig.perPoint,
    repConfig.minMultiplier,
    repConfig.maxMultiplier,
  );

  const debtPenalty = Math.min(debtConfig.maxPenalty, safeDebt * debtConfig.perPoint);
  const debtMultiplier = Math.max(0, 1 - debtPenalty);
  const buffMultiplier = 1 + resolvedBuffs.coinMultiplier + resolvedBuffs.coinsBonusPct;
  const rawCoins =
    safeBase * repMultiplier * debtMultiplier * scoreMultiplier * buffMultiplier +
    resolvedBuffs.coinBonus;

  const difficulty =
    Number.isFinite(difficultyMultiplier) && difficultyMultiplier > 0 ? difficultyMultiplier : 1;

  return Math.max(rewards.minCoins, Math.floor(rawCoins / difficulty));
};

export const calcScenarioReward = (input: ScenarioRewardInput): number => {
  const { rewards } = BALANCE;
  const baseCoins = resolveBaseCoins(input.baseCoins, rewards.scenarioCoins);
  return calcRewardCoins(
    baseCoins,
    input.reputation,
    input.techDebt,
    input.buffs,
    1,
    input.difficultyMultiplier ?? 1,
  );
};

export const calcScenarioXp = (input: ScenarioXpInput): number => {
  const { rewards } = BALANCE;
  const baseXp =
    typeof input.baseXp === 'number' && Number.isFinite(input.baseXp)
      ? Math.max(0, input.baseXp)
      : rewards.scenarioXp;
  const buffs = resolveBuffs(input.buffs);
  const total = baseXp * (1 + buffs.xpBonusPct);
  return Math.max(0, Math.floor(total));
};

export const calcExamReward = (input: ExamRewardInput): number => {
  const { rewards } = BALANCE;
  const baseCoins = resolveBaseCoins(input.baseCoins, rewards.examCoins);
  const maxScore =
    typeof input.maxScore === 'number' && Number.isFinite(input.maxScore) ? input.maxScore : 1;
  const score = normalizeNumber(input.score);
  const scoreRatio = maxScore > 0 ? clampNumber(score / maxScore, 0, 1) : 0;
  const scoreMultiplier =
    rewards.exam.minScoreMultiplier +
    (rewards.exam.maxScoreMultiplier - rewards.exam.minScoreMultiplier) * scoreRatio;

  return calcRewardCoins(
    baseCoins,
    input.reputation,
    input.techDebt,
    input.buffs,
    scoreMultiplier,
    input.difficultyMultiplier ?? 1,
  );
};
