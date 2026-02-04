import type { SkillStageId } from '@/shared/config';

export type QuestObjectiveType = 'scenario' | 'exam' | 'purchase';

export type QuestObjective = {
  type: QuestObjectiveType;
  target: number;
  current: number;
};

export type QuestReward = {
  coins: number;
  badgeId: string;
};

export type QuestStatus = 'active' | 'completed' | 'claimed';

export interface Quest {
  id: string;
  title: string;
  description: string;
  objective: QuestObjective;
  reward: QuestReward;
  status: QuestStatus;
  issuedAtIso: string;
  sessionId: string;
}

export type QuestProgressEvent =
  | { type: 'ScenarioCompleted'; scenarioId?: string; category?: string }
  | { type: 'ExamPassed'; examId?: string; stage?: SkillStageId | string }
  | { type: 'PurchaseMade'; itemId?: string; currency?: 'coins' | 'cash' };
