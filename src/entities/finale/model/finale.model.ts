export const FINALE_CHAIN_IDS = ['board_meeting'] as const;
export const FINALE_STEP_IDS = ['bm_1', 'bm_2', 'bm_3', 'bm_4', 'bm_5'] as const;
export const FINALE_CHOICE_IDS = ['a', 'b', 'c'] as const;

export type FinaleChainId = (typeof FINALE_CHAIN_IDS)[number];
export type FinaleStepId = (typeof FINALE_STEP_IDS)[number];
export type FinaleChoiceId = (typeof FINALE_CHOICE_IDS)[number];

export type FinaleChoiceEffects = {
  cashDelta?: number;
  reputationDelta?: number;
  techDebtDelta?: number;
  moraleDelta?: number;
};

export type FinaleChoice = {
  id: FinaleChoiceId;
  title: string;
  description?: string;
  effects?: FinaleChoiceEffects;
  nextStep?: FinaleStepId;
};

export type FinaleStepRequirements = {
  minCash?: number;
  minReputation?: number;
  maxTechDebt?: number;
};

export type FinaleStep = {
  id: FinaleStepId;
  title: string;
  narrative: string;
  choices: FinaleChoice[];
  required?: FinaleStepRequirements;
  defaultNext: FinaleStepId | null;
};

export type FinaleHistoryEntry = {
  stepId: FinaleStepId;
  choiceId: FinaleChoiceId;
  atIso: string;
};

export type FinaleState = {
  unlocked: boolean;
  active: boolean;
  chainId: FinaleChainId;
  currentStepId: FinaleStepId;
  completedStepIds: FinaleStepId[];
  history: FinaleHistoryEntry[];
  branchFlags: Record<string, boolean>;
  finished: boolean;
  endingId?: string;
};
