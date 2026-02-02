import { IsoDateString } from '@/entities/user';

export type MetricKey = 'reputation' | 'techDebt';

export interface ProgressSnapshot {
  skillLevels: Record<string, number>;
  reputation: number;
  techDebt: number;
  scenarioOverrides: Record<string, boolean>;
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
  reputation: number;
  techDebt: number;
  scenarioOverrides: Record<string, boolean>;
}
