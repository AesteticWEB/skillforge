import type { CompletedContractEntry, Contract, ContractReward } from '../model/contract.model';
import type { SkillStageId } from '@/shared/config';

export const QUICK_FIX_CONTRACT_ID = 'micro_quick_fix';
export const QUICK_FIX_REWARD_COINS = 20;

export const isQuickFixContract = (
  contract: { id: string } | null | undefined,
): contract is { id: typeof QUICK_FIX_CONTRACT_ID } => contract?.id === QUICK_FIX_CONTRACT_ID;

export const createQuickFixContract = (params?: {
  rewardCoins?: number;
  stage?: SkillStageId;
  seed?: string;
  title?: string;
  description?: string;
}): Contract => {
  const rewardCoins =
    typeof params?.rewardCoins === 'number' && Number.isFinite(params.rewardCoins)
      ? Math.max(1, Math.floor(params.rewardCoins))
      : QUICK_FIX_REWARD_COINS;
  const stage = params?.stage ?? 'internship';
  const seed = params?.seed ?? 'safety-net';
  const title = params?.title?.trim().length ? params.title.trim() : 'Quick Fix';
  const description = params?.description?.trim().length
    ? params.description.trim()
    : 'Небольшая подработка, чтобы выбраться из тупика.';

  return {
    id: QUICK_FIX_CONTRACT_ID,
    title,
    description,
    difficulty: 'легко',
    objectives: [
      {
        type: 'scenario',
        targetValue: 1,
        currentValue: 0,
        meta: {
          category: 'Safety Net',
          stage,
        },
      },
    ],
    reward: {
      coins: rewardCoins,
    },
    seed,
  };
};

export const ensureQuickFixContract = (params: {
  available: Contract[];
  active: Contract[];
  stuck: boolean;
  stage?: SkillStageId;
  seed?: string;
  rewardCoins?: number;
  title?: string;
  description?: string;
}): { available: Contract[]; active: Contract[]; added: boolean } => {
  const available = Array.isArray(params.available) ? params.available : [];
  const active = Array.isArray(params.active) ? params.active : [];
  if (!params.stuck) {
    return { available, active, added: false };
  }

  const alreadyHas =
    available.some((contract) => isQuickFixContract(contract)) ||
    active.some((contract) => isQuickFixContract(contract));
  if (alreadyHas) {
    return { available, active, added: false };
  }

  const quickFix = createQuickFixContract({
    rewardCoins: params.rewardCoins,
    stage: params.stage,
    seed: params.seed,
    title: params.title,
    description: params.description,
  });
  return { available: [quickFix, ...available], active, added: true };
};

export const resolveQuickFixCompletion = (params: {
  available: Contract[];
  active: Contract[];
  completedAtIso: string;
}): {
  available: Contract[];
  active: Contract[];
  completedEntry: CompletedContractEntry;
  reward: ContractReward;
} | null => {
  const available = Array.isArray(params.available) ? params.available : [];
  const active = Array.isArray(params.active) ? params.active : [];
  const contract =
    available.find((item) => isQuickFixContract(item)) ??
    active.find((item) => isQuickFixContract(item));
  if (!contract) {
    return null;
  }

  const completedEntry: CompletedContractEntry = {
    id: contract.id,
    title: contract.title,
    completedAtIso: params.completedAtIso,
    reward: contract.reward,
  };

  return {
    available: available.filter((item) => !isQuickFixContract(item)),
    active: active.filter((item) => !isQuickFixContract(item)),
    completedEntry,
    reward: contract.reward,
  };
};
