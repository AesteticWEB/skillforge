import { BALANCE } from '@/shared/config';
import { CONTRACT_TEMPLATES, type ContractTemplate } from '@/shared/config/contract-templates';
import type {
  Contract,
  ContractObjective,
  ContractReward,
  ContractType,
  Stage,
} from '../model/contract.model';

export type GenerateAvailableContractsParams = {
  stage: Stage;
  reputation: number;
  techDebt: number;
  seed: string;
  count?: number;
};

type WeightedTemplate = {
  template: ContractTemplate;
  weight: number;
};

const DEFAULT_COUNT = 5;
const HIGH_REP_THRESHOLD = 8;
const HIGH_DEBT_THRESHOLD = 6;

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeNumber = (value: number): number => (Number.isFinite(value) ? value : 0);

const hashStringToInt = (seed: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const randomInt = (rng: () => number, min: number, max: number): number => {
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  if (safeMax <= safeMin) {
    return Math.floor(safeMin);
  }
  return Math.floor(rng() * (safeMax - safeMin + 1)) + safeMin;
};

const buildContractId = (templateId: string, stage: Stage, seed: string, index: number): string =>
  `contract:${templateId}:${stage}:${seed}:${index}`;

const resolveWeightByStage = (template: ContractTemplate, stage: Stage): number => {
  const weight = template.weightByStage?.[stage];
  return typeof weight === 'number' && Number.isFinite(weight) ? weight : 1;
};

const hasTag = (template: ContractTemplate, tag: string): boolean =>
  template.tags.some((value) => value.toLowerCase().includes(tag));

const computeTemplateWeight = (
  template: ContractTemplate,
  stage: Stage,
  reputation: number,
  techDebt: number,
): number => {
  let weight = resolveWeightByStage(template, stage);
  if (!Number.isFinite(weight) || weight <= 0) {
    return 0;
  }

  const repFactor = clampNumber(normalizeNumber(reputation) / 10, 0, 1);
  const debtFactor = clampNumber(Math.max(0, normalizeNumber(techDebt)) / 10, 0, 1);

  if (template.difficulty === 'сложно') {
    weight *= 1 + repFactor * 0.9;
  } else if (template.difficulty === 'нормально') {
    weight *= 1 + repFactor * 0.25;
  } else {
    weight *= 1 - repFactor * 0.5;
  }

  if (template.type === 'debt') {
    weight *= 1 + debtFactor * 1.2;
  }

  if (template.type === 'purchase') {
    weight *= 1 - debtFactor * 0.3;
  }

  if (hasTag(template, 'рефактор') || hasTag(template, 'оптим')) {
    weight *= 1 + debtFactor * 0.6;
  }

  return Math.max(0, weight);
};

const pickWeightedIndex = (weights: number[], rng: () => number): number | null => {
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0) {
    return null;
  }
  let roll = rng() * total;
  for (let index = 0; index < weights.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) {
      return index;
    }
  }
  return weights.length - 1;
};

const pickDeterministicTemplate = (templates: ContractTemplate[], seed: string): ContractTemplate =>
  templates[Math.floor(mulberry32(hashStringToInt(seed))() * templates.length)];

const pickTemplates = (
  weightedTemplates: WeightedTemplate[],
  count: number,
  rng: () => number,
): ContractTemplate[] => {
  const result: ContractTemplate[] = [];
  let pool = [...weightedTemplates];

  while (result.length < count && pool.length > 0) {
    const weights = pool.map((item) => item.weight);
    const index = pickWeightedIndex(weights, rng);
    if (index === null) {
      break;
    }
    result.push(pool[index].template);
    pool.splice(index, 1);

    if (pool.length === 0 && result.length < count) {
      pool = [...weightedTemplates];
    }
  }

  return result;
};

const resolveOptionalRange = (
  rng: () => number,
  min: number | undefined,
  max: number | undefined,
): number | undefined => {
  if (typeof min !== 'number' && typeof max !== 'number') {
    return undefined;
  }
  const safeMin = typeof min === 'number' ? min : (max ?? 0);
  const safeMax = typeof max === 'number' ? max : safeMin;
  return randomInt(rng, safeMin, safeMax);
};

const applyRewardModifiers = (
  reward: ContractReward,
  reputation: number,
  techDebt: number,
): ContractReward => {
  const caps = BALANCE.caps ?? { coinsBonusPctMax: 0.3, cashIncomeBonusPctMax: 0.3 };
  const repValue = normalizeNumber(reputation);
  const debtValue = Math.max(0, normalizeNumber(techDebt));
  const coinsCap = caps.coinsBonusPctMax ?? 0.3;
  const cashCap = caps.cashIncomeBonusPctMax ?? coinsCap;
  const bonusPct = clampNumber(repValue * 0.01 - debtValue * 0.005, -coinsCap, coinsCap);

  reward.coins = Math.max(0, Math.floor(reward.coins * (1 + bonusPct)));

  if (typeof reward.cash === 'number') {
    const cashBonusPct = clampNumber(repValue * 0.01 - debtValue * 0.005, -cashCap, cashCap);
    reward.cash = Math.max(0, Math.floor(reward.cash * (1 + cashBonusPct)));
  }

  return reward;
};

const buildReward = (
  base: ContractTemplate['rewardBase'],
  rng: () => number,
  reputation: number,
  techDebt: number,
): ContractReward => {
  const reward: ContractReward = {
    coins: Math.max(0, randomInt(rng, base.coinsMin, base.coinsMax)),
  };

  const cash = resolveOptionalRange(rng, base.cashMin, base.cashMax);
  if (typeof cash === 'number') {
    reward.cash = Math.max(0, Math.floor(cash));
  }

  const reputationDelta = resolveOptionalRange(rng, base.repMin, base.repMax);
  if (typeof reputationDelta === 'number') {
    reward.reputationDelta = Math.floor(reputationDelta);
  }

  const techDebtDelta = resolveOptionalRange(rng, base.debtMin, base.debtMax);
  if (typeof techDebtDelta === 'number') {
    reward.techDebtDelta = Math.floor(techDebtDelta);
  }

  return applyRewardModifiers(reward, reputation, techDebt);
};

const buildObjective = (
  template: ContractTemplate,
  stage: Stage,
  rng: () => number,
): ContractObjective => ({
  type: template.type as ContractType,
  targetValue: randomInt(rng, template.objectiveBase.min, template.objectiveBase.max),
  currentValue: 0,
  meta: {
    category: template.tags[0] ?? template.type,
    stage,
  },
});

const buildContract = (
  template: ContractTemplate,
  stage: Stage,
  seed: string,
  index: number,
  reputation: number,
  techDebt: number,
): Contract => {
  const contractSeed = `${seed}:${stage}:${template.id}:${index}`;
  const rng = mulberry32(hashStringToInt(contractSeed));
  const objective = buildObjective(template, stage, rng);
  const reward = buildReward(template.rewardBase, rng, reputation, techDebt);

  return {
    id: buildContractId(template.id, stage, seed, index),
    title: template.titleRu,
    description: template.descRu,
    difficulty: template.difficulty,
    objectives: [objective],
    reward,
    seed: contractSeed,
  };
};

const buildFallbackContract = (stage: Stage, seed: string): Contract => {
  const fallbackSeed = `${seed}:${stage}:fallback`;
  const rng = mulberry32(hashStringToInt(fallbackSeed));

  return {
    id: `contract:fallback:${stage}:${seed}`,
    title: 'Быстрый фикс',
    description: 'Сделать минимальный фикс, чтобы снять срочность.',
    difficulty: 'легко',
    objectives: [
      {
        type: 'scenario',
        targetValue: randomInt(rng, 1, 1),
        currentValue: 0,
        meta: {
          category: 'быстрый фикс',
          stage,
        },
      },
    ],
    reward: { coins: 2 },
    seed: fallbackSeed,
  };
};

const ensureBiases = (
  templates: ContractTemplate[],
  allTemplates: ContractTemplate[],
  stage: Stage,
  reputation: number,
  techDebt: number,
  seed: string,
): ContractTemplate[] => {
  const result = [...templates];
  if (result.length === 0) {
    return result;
  }

  const highDebt = normalizeNumber(techDebt) >= HIGH_DEBT_THRESHOLD;
  const highRep = normalizeNumber(reputation) >= HIGH_REP_THRESHOLD;

  let hasDebt = result.some((item) => item.type === 'debt');
  if (highDebt && !hasDebt) {
    const debtTemplates = allTemplates.filter((item) => item.type === 'debt');
    if (debtTemplates.length > 0) {
      const debtTemplate = pickDeterministicTemplate(debtTemplates, `${seed}:${stage}:debt`);
      result[result.length - 1] = debtTemplate;
      hasDebt = true;
    }
  }

  const hasHard = result.some((item) => item.difficulty === 'сложно');
  if (highRep && !hasHard) {
    const hardTemplates = allTemplates.filter((item) => item.difficulty === 'сложно');
    if (hardTemplates.length > 0) {
      const debtRequired = highDebt && allTemplates.some((item) => item.type === 'debt');
      let candidates = hardTemplates;
      if (debtRequired) {
        const hardDebt = hardTemplates.filter((item) => item.type === 'debt');
        if (hardDebt.length > 0) {
          candidates = hardDebt;
        }
      }
      const hardTemplate = pickDeterministicTemplate(candidates, `${seed}:${stage}:hard`);
      let replaceIndex = result.findIndex((item) => !debtRequired || item.type !== 'debt');
      if (replaceIndex === -1) {
        replaceIndex = result.length - 1;
      }
      result[replaceIndex] = hardTemplate;
    }
  }

  return result;
};

export const generateAvailableContracts = (
  params: GenerateAvailableContractsParams,
): Contract[] => {
  const count =
    typeof params.count === 'number' && Number.isFinite(params.count) && params.count > 0
      ? Math.floor(params.count)
      : DEFAULT_COUNT;
  const baseSeed = `${params.seed}:${params.stage}:contracts`;
  const rng = mulberry32(hashStringToInt(baseSeed));

  const weightedTemplates = CONTRACT_TEMPLATES.map((template) => ({
    template,
    weight: computeTemplateWeight(template, params.stage, params.reputation, params.techDebt),
  })).filter((item) => item.weight > 0);

  if (weightedTemplates.length === 0) {
    return [buildFallbackContract(params.stage, params.seed)];
  }

  const selectedTemplates = pickTemplates(weightedTemplates, count, rng);
  const tunedTemplates = ensureBiases(
    selectedTemplates,
    weightedTemplates.map((item) => item.template),
    params.stage,
    params.reputation,
    params.techDebt,
    params.seed,
  );

  if (tunedTemplates.length === 0) {
    return [buildFallbackContract(params.stage, params.seed)];
  }

  return tunedTemplates.map((template, index) =>
    buildContract(template, params.stage, params.seed, index, params.reputation, params.techDebt),
  );
};
