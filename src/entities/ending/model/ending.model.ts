export const ENDING_IDS = ['ipo', 'acq', 'oss', 'scandal', 'bankrupt'] as const;

export type EndingId = (typeof ENDING_IDS)[number];

export type EndingStats = {
  cash: number;
  reputation: number;
  techDebt: number;
  avgMorale?: number;
  companyLevel?: string;
  completedContracts?: number;
  incidentsResolved?: number;
  finaleFlags?: Record<string, boolean>;
  score?: number;
};

export type EndingResult = {
  endingId: EndingId;
  title: string;
  summary: string;
  stats: EndingStats;
};

export type ResolveEndingInput = {
  cash: number;
  reputation: number;
  techDebt: number;
  avgMorale?: number;
  companyLevel?: string;
  finale: {
    finished: boolean;
    endingHint?: string;
    branchFlags?: Record<string, boolean>;
  };
  counters?: {
    completedContracts?: number;
    incidents?: number;
    incidentsResolved?: number;
  };
};
