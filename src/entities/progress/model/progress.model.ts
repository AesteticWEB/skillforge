import type { ExamAttempt, ExamRun } from '@/entities/exam';
import type { Certificate } from '@/entities/certificates';
import type { CompletedContractEntry, Contract } from '@/entities/contracts';
import type { Quest } from '@/entities/quests';
import type { Candidate } from '@/features/hiring';
import { IsoDateString } from '@/entities/user';
import type { SkillStageId } from '@/shared/config';
import type { FinaleState } from '@/entities/finale';
import type { EndingState } from '@/entities/ending';
import type { CosmeticsState } from '@/entities/cosmetics';

export type MetricKey = 'reputation' | 'techDebt' | 'coins';

export interface ProgressSnapshot {
  skillLevels: Record<string, number>;
  reputation: number;
  techDebt: number;
  coins: number;
  scenarioOverrides: Record<string, boolean>;
  spentXpOnSkills: number;
}

export type ProgressMeta = {
  isNewGamePlus: boolean;
  ngPlusCount: number;
};

export type DifficultySettings = {
  multiplier: number;
};

export type ActivityStreak = {
  lastActiveDate: string | null;
  current: number;
  best: number;
};

export interface DecisionHistoryEntry {
  scenarioId: string;
  decisionId: string;
  decidedAt: IsoDateString;
  snapshot?: ProgressSnapshot;
}

export interface Progress {
  skillLevels: Record<string, number>;
  decisionHistory: DecisionHistoryEntry[];
  examHistory: ExamAttempt[];
  activeExamRun: ExamRun | null;
  certificates: Certificate[];
  activeContracts: Contract[];
  completedContractsHistory: CompletedContractEntry[];
  sessionQuests: Quest[];
  sessionQuestSessionId: string | null;
  candidatesPool: Candidate[];
  candidatesRefreshIndex: number;
  companyTickIndex: number;
  meta: ProgressMeta;
  difficulty: DifficultySettings;
  cosmetics: CosmeticsState;
  streak: ActivityStreak;
  finale: FinaleState;
  ending: EndingState;
  specializationId: string | null;
  reputation: number;
  techDebt: number;
  coins: number;
  scenarioOverrides: Record<string, boolean>;
  spentXpOnSkills: number;
  careerStage: SkillStageId;
}
