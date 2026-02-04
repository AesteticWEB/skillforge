import type { SkillStageId } from '@/shared/config';

export const INCIDENT_SEVERITIES = ['minor', 'major', 'critical'] as const;
export const INCIDENT_DECISION_IDS = ['a', 'b', 'c'] as const;
export const INCIDENT_SOURCES = ['tick'] as const;

export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];
export type IncidentDecisionId = (typeof INCIDENT_DECISION_IDS)[number];
export type IncidentSource = (typeof INCIDENT_SOURCES)[number];

export type IncidentDecisionEffects = {
  cashDelta: number;
  reputationDelta: number;
  techDebtDelta?: number;
  moraleDelta?: number;
};

export type IncidentDecision = {
  id: IncidentDecisionId;
  title: string;
  description: string;
  effects: IncidentDecisionEffects;
};

export type IncidentTemplate = {
  id: string;
  titleRu: string;
  descRu: string;
  severity: IncidentSeverity;
  decisions: [IncidentDecision, IncidentDecision, IncidentDecision];
  weightByStage?: Record<SkillStageId, number>;
  tags?: string[];
};

export type ActiveIncident = {
  instanceId: string;
  templateId: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  decisions: IncidentDecision[];
  createdAtIso: string;
  source: IncidentSource;
  seed: string;
  resolvedAtIso?: string;
  chosenDecisionId?: IncidentDecisionId;
};

export type IncidentHistoryEntry = {
  instanceId: string;
  templateId: string;
  chosenDecisionId: IncidentDecisionId;
  resolvedAtIso: string;
  effects: IncidentDecisionEffects;
};
