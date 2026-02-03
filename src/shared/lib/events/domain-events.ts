import { User } from '@/entities/user';
import type { SkillStageId } from '@/shared/config';

export type DomainEventBase<Type extends string, Payload> = {
  type: Type;
  payload: Payload;
  occurredAt: string;
};

export type ProfileCreatedEvent = DomainEventBase<
  'ProfileCreated',
  {
    user: User;
  }
>;

export type SkillUpgradedEvent = DomainEventBase<
  'SkillUpgraded',
  {
    skillId: string;
    skillName?: string;
    previousLevel: number;
    level: number;
    maxLevel: number;
    cost?: number | null;
    skillStage?: SkillStageId;
    profession?: string;
  }
>;

export type ScenarioCompletedEvent = DomainEventBase<
  'ScenarioCompleted',
  {
    scenarioId: string;
    decisionId: string;
  }
>;

export type StagePromotedEvent = DomainEventBase<
  'StagePromoted',
  {
    fromStage: SkillStageId;
    toStage: SkillStageId;
  }
>;

export type DomainEvent =
  | ProfileCreatedEvent
  | SkillUpgradedEvent
  | ScenarioCompletedEvent
  | StagePromotedEvent;
export type DomainEventType = DomainEvent['type'];

const createEvent = <Type extends DomainEventType, Payload>(
  type: Type,
  payload: Payload,
): DomainEventBase<Type, Payload> => ({
  type,
  payload,
  occurredAt: new Date().toISOString(),
});

export const createProfileCreatedEvent = (user: User): ProfileCreatedEvent =>
  createEvent('ProfileCreated', { user });

export const createSkillUpgradedEvent = (
  skillId: string,
  previousLevel: number,
  level: number,
  maxLevel: number,
  meta: {
    skillName?: string;
    cost?: number | null;
    skillStage?: SkillStageId;
    profession?: string;
  } = {},
): SkillUpgradedEvent =>
  createEvent('SkillUpgraded', { skillId, previousLevel, level, maxLevel, ...meta });

export const createScenarioCompletedEvent = (
  scenarioId: string,
  decisionId: string,
): ScenarioCompletedEvent => createEvent('ScenarioCompleted', { scenarioId, decisionId });

export const createStagePromotedEvent = (
  fromStage: SkillStageId,
  toStage: SkillStageId,
): StagePromotedEvent => createEvent('StagePromoted', { fromStage, toStage });
