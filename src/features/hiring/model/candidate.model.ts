export type CandidateRole = 'junior' | 'middle' | 'senior';

export type CandidateTraitEffects = {
  cashIncomeBonusPct?: number;
  incidentReducePct?: number;
  techDebtDeltaPerTick?: number;
  productivityPct?: number;
};

export type CandidateTrait = {
  id: string;
  title: string;
  desc: string;
  effects: CandidateTraitEffects;
};

export interface Candidate {
  id: string;
  name: string;
  role: CandidateRole;
  quality: number;
  expectedSalaryCash?: number;
  traits: CandidateTrait[];
  summary: string;
  seed: string;
}
