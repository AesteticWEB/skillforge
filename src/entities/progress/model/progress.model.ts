import type { ExamAttempt, ExamRun } from '@/entities/exam';
import type { Certificate } from '@/entities/certificates';
import { IsoDateString } from '@/entities/user';
import type { SkillStageId } from '@/shared/config';

export type MetricKey = 'reputation' | 'techDebt' | 'coins';

export interface ProgressSnapshot {
  skillLevels: Record<string, number>;
  reputation: number;
  techDebt: number;
  coins: number;
  scenarioOverrides: Record<string, boolean>;
  spentXpOnSkills: number;
}

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
  specializationId: string | null;
  reputation: number;
  techDebt: number;
  coins: number;
  scenarioOverrides: Record<string, boolean>;
  spentXpOnSkills: number;
  careerStage: SkillStageId;
}
