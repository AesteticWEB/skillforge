import { BALANCE } from '@/shared/config';

export type RewardBuffs = {
  coinMultiplier?: number;
  coinBonus?: number;
};

export type ScenarioRewardInput = {
  reputation: number;
  techDebt: number;
  buffs?: RewardBuffs;
  baseCoins?: number;
};

export type ExamRewardInput = ScenarioRewardInput & {
  score: number;
  maxScore?: number;
};

const clampNumber = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const normalizeNumber = (value: number): number =>
  Number.isFinite(value) ? value : 0;

const resolveBaseCoins = (value: number | undefined, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, value);
};

const resolveBuffs = (buffs?: RewardBuffs): Required<RewardBuffs> => {
  const multiplier = buffs?.coinMultiplier ?? 0;
  const bonus = buffs?.coinBonus ?? 0;

  return {
    coinMultiplier: Number.isFinite(multiplier) ? Math.max(0, multiplier) : 0,
    coinBonus: Number.isFinite(bonus) ? Math.max(0, bonus) : 0,
  };
};

const calcRewardCoins = (
  baseCoins: number,
  reputation: number,
  techDebt: number,
  buffs: RewardBuffs | undefined,
  scoreMultiplier: number,
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
  const buffMultiplier = 1 + resolvedBuffs.coinMultiplier;
  const rawCoins =
    safeBase * repMultiplier * debtMultiplier * scoreMultiplier * buffMultiplier +
    resolvedBuffs.coinBonus;

  return Math.max(rewards.minCoins, Math.floor(rawCoins));
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
  );
};

export const calcExamReward = (input: ExamRewardInput): number => {
  const { rewards } = BALANCE;
  const baseCoins = resolveBaseCoins(input.baseCoins, rewards.examCoins);
  const maxScore =
    typeof input.maxScore === 'number' && Number.isFinite(input.maxScore)
      ? input.maxScore
      : 1;
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
  );
};
