import type { SkillStageId } from '@/shared/config';
import { hashStringToInt, mulberry32 } from '@/entities/exam';
import { INCIDENT_TEMPLATES } from '../config/incident-templates';
import type {
  ActiveIncident,
  IncidentDecision,
  IncidentTemplate,
  IncidentSeverity,
} from '../model/incident.model';
import type { CompanyTickReason } from '@/entities/company';

type CreateIncidentParams = {
  seed: string;
  tickIndex: number;
  reason: CompanyTickReason;
  stage: SkillStageId;
  reputation: number;
  techDebt: number;
  templates?: IncidentTemplate[];
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const resolveCreatedAtIso = (tickIndex: number): string => {
  const base = Date.UTC(2026, 0, 1, 0, 0, 0);
  const offsetMs = Math.max(0, Math.floor(tickIndex)) * 1000;
  return new Date(base + offsetMs).toISOString();
};

const resolveSeverityFallback = (): IncidentSeverity => 'minor';

const getTemplateWeight = (
  template: IncidentTemplate,
  stage: SkillStageId,
  techDebt: number,
): number => {
  const stageWeight = template.weightByStage?.[stage] ?? 1;
  const tags = template.tags ?? [];
  const techMultiplier =
    tags.includes('tech') || tags.includes('debt') ? 1 + clamp(techDebt / 10, 0, 1) : 1;
  return Math.max(0, stageWeight * techMultiplier);
};

const selectTemplate = (
  templates: IncidentTemplate[],
  rng: () => number,
  stage: SkillStageId,
  techDebt: number,
): IncidentTemplate | null => {
  const weighted = templates
    .map((template) => ({
      template,
      weight: getTemplateWeight(template, stage, techDebt),
    }))
    .filter((entry) => entry.weight > 0);

  if (weighted.length === 0) {
    return null;
  }

  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * total;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.template;
    }
  }

  return weighted[weighted.length - 1]?.template ?? null;
};

const cloneDecisions = (decisions: IncidentDecision[]): IncidentDecision[] =>
  decisions.map((decision) => ({
    id: decision.id,
    title: decision.title,
    description: decision.description,
    effects: { ...decision.effects },
  }));

export const createIncidentFromRoll = (params: CreateIncidentParams): ActiveIncident => {
  const seed = `${params.seed}:incident:${params.tickIndex}:${params.reason}`;
  const rng = mulberry32(hashStringToInt(seed));
  const templates =
    Array.isArray(params.templates) && params.templates.length > 0
      ? params.templates
      : INCIDENT_TEMPLATES;
  const template = selectTemplate(templates, rng, params.stage, params.techDebt) ?? templates[0];

  const fallbackSeverity = template?.severity ?? resolveSeverityFallback();
  const decisions = template?.decisions?.length
    ? cloneDecisions(template.decisions)
    : ([] as IncidentDecision[]);

  const templateId = template?.id ?? 'fallback';

  return {
    instanceId: `inc_${templateId}_${params.tickIndex}`,
    templateId,
    title: template?.titleRu ?? 'Неизвестный инцидент',
    description: template?.descRu ?? 'Произошёл инцидент, требуется решение.',
    severity: fallbackSeverity,
    decisions,
    createdAtIso: resolveCreatedAtIso(params.tickIndex),
    source: 'tick',
    seed,
  };
};
