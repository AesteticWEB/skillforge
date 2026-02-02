import { Progress } from '@/entities/progress';
import { Skill } from '@/entities/skill';
import { Scenario, ScenarioAvailabilityEffect, ScenarioRequirement } from '../model/scenario.model';

export type ScenarioGateResult = {
  available: boolean;
  reasons: string[];
};

export type ScenarioGateContext = {
  skillById: Map<string, Skill>;
  completedScenarios: Set<string>;
  progress: Progress;
};

export const createScenarioGateContext = (
  skills: Skill[],
  progress: Progress,
): ScenarioGateContext => ({
  skillById: new Map(skills.map((skill) => [skill.id, skill])),
  completedScenarios: new Set(progress.decisionHistory.map((entry) => entry.scenarioId)),
  progress,
});

export const getScenarioGateResultWithContext = (
  scenario: Scenario,
  context: ScenarioGateContext,
): ScenarioGateResult => {
  const override = context.progress.scenarioOverrides[scenario.id];
  if (override === true) {
    return { available: true, reasons: [] };
  }
  if (override === false) {
    return { available: false, reasons: ['Locked by scenario rule.'] };
  }

  const requirements = scenario.requirements ?? [];
  const reasons: string[] = [];

  for (const requirement of requirements) {
    const reason = getRequirementBlockReason(
      requirement,
      context.skillById,
      context.completedScenarios,
      context.progress,
    );
    if (reason) {
      reasons.push(reason);
    }
  }

  return {
    available: reasons.length === 0,
    reasons,
  };
};

export const getScenarioGateResult = (
  scenario: Scenario,
  skills: Skill[],
  progress: Progress,
): ScenarioGateResult =>
  getScenarioGateResultWithContext(scenario, createScenarioGateContext(skills, progress));

export const applyScenarioAvailabilityEffects = (
  progress: Progress,
  effects: ScenarioAvailabilityEffect[] = [],
): Progress => {
  if (effects.length === 0) {
    return progress;
  }

  const overrides = { ...progress.scenarioOverrides };
  for (const effect of effects) {
    overrides[effect.scenarioId] = effect.type === 'unlock';
  }

  return {
    ...progress,
    scenarioOverrides: overrides,
  };
};

const getRequirementBlockReason = (
  requirement: ScenarioRequirement,
  skillById: Map<string, Skill>,
  completed: Set<string>,
  progress: Progress,
): string | null => {
  if (requirement.type === 'skill') {
    const skill = skillById.get(requirement.skillId);
    const name = skill?.name ?? requirement.skillId;
    const level = skill?.level ?? 0;
    if (level < requirement.minLevel) {
      return `Requires ${name} level ${requirement.minLevel}`;
    }
    return null;
  }

  if (requirement.type === 'metric') {
    const value = progress[requirement.metric] ?? 0;
    if (requirement.min !== undefined && value < requirement.min) {
      return `Requires ${requirement.metric} >= ${requirement.min}`;
    }
    if (requirement.max !== undefined && value > requirement.max) {
      return `Requires ${requirement.metric} <= ${requirement.max}`;
    }
    return null;
  }

  if (!completed.has(requirement.scenarioId)) {
    return `Complete scenario ${requirement.scenarioId}`;
  }

  return null;
};
