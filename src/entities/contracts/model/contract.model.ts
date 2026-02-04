import type { SkillStageId } from '@/shared/config';

export type Stage = SkillStageId;

export type ContractType = 'scenario' | 'exam' | 'purchase' | 'debt';

export type ContractDifficulty = 'легко' | 'нормально' | 'сложно';

export type ContractObjective = {
  type: ContractType;
  targetValue: number;
  currentValue: number;
  meta?: {
    category?: string;
    stage?: string;
  };
};

export type ContractReward = {
  coins: number;
  cash?: number;
  reputationDelta?: number;
  techDebtDelta?: number;
};

export type ContractRequirements = {
  minStage?: Stage;
  minReputation?: number;
  maxTechDebt?: number;
};

export interface Contract {
  id: string;
  title: string;
  description: string;
  difficulty: ContractDifficulty;
  expiresInActions?: number;
  objectives: ContractObjective[];
  reward: ContractReward;
  requirements?: ContractRequirements;
  seed: string;
}

export type CompletedContractEntry = {
  id: string;
  title: string;
  completedAtIso: string;
  reward: ContractReward;
};

export type RewardSummary = {
  coins: number;
  cash: number;
  reputationDelta: number;
  techDebtDelta: number;
};

export type ContractProgressEvent =
  | { type: 'ScenarioCompleted'; scenarioId?: string; category?: string }
  | { type: 'ExamPassed'; examId?: string; stage?: string }
  | { type: 'PurchaseMade'; itemId?: string; currency?: 'coins' | 'cash' };
