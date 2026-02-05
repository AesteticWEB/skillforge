import { User } from '@/entities/user';
import type { SkillStageId } from '@/shared/config';
import type { CompanyTickReason } from '@/entities/company';
import type { EndingResult } from '@/entities/ending';

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
    rewardXp?: number;
    reputationDelta?: number;
    techDebtDelta?: number;
    coinsDelta?: number;
  }
>;

export type PurchaseMadeEvent = DomainEventBase<
  'PurchaseMade',
  {
    itemId: string;
    itemName?: string;
    price: number;
    currency?: 'coins' | 'cash';
    coinsBefore?: number;
    coinsAfter?: number;
    cashBefore?: number;
    cashAfter?: number;
  }
>;

export type EmployeeHiredEvent = DomainEventBase<
  'EmployeeHired',
  {
    employeeId: string;
    name?: string;
    role?: string;
  }
>;

export type CompanyTickedEvent = DomainEventBase<
  'CompanyTicked',
  {
    reason: CompanyTickReason;
    tickIndex?: number;
    reputationDelta?: number;
    techDebtDelta?: number;
  }
>;

export type ExamPassedEvent = DomainEventBase<
  'ExamPassed',
  {
    examId: string;
    stage?: SkillStageId;
    score?: number;
  }
>;

export type ExamFailedEvent = DomainEventBase<
  'ExamFailed',
  {
    examId: string;
    stage?: SkillStageId;
    score?: number;
  }
>;

export type IncidentDeferredEvent = DomainEventBase<
  'IncidentDeferred',
  {
    incidentId?: string;
    templateId?: string;
    decisionId?: string;
  }
>;

export type StagePromotedEvent = DomainEventBase<
  'StagePromoted',
  {
    fromStage: SkillStageId;
    toStage: SkillStageId;
  }
>;

export type EndingResolvedEvent = DomainEventBase<
  'EndingResolved',
  {
    endingId: EndingResult['endingId'];
  }
>;

export type ProgressResetEvent = DomainEventBase<
  'ProgressReset',
  {
    reason?: string;
  }
>;

export type DomainEvent =
  | ProfileCreatedEvent
  | SkillUpgradedEvent
  | ScenarioCompletedEvent
  | PurchaseMadeEvent
  | EmployeeHiredEvent
  | CompanyTickedEvent
  | ExamPassedEvent
  | ExamFailedEvent
  | IncidentDeferredEvent
  | StagePromotedEvent
  | EndingResolvedEvent
  | ProgressResetEvent;
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
  meta: {
    rewardXp?: number;
    reputationDelta?: number;
    techDebtDelta?: number;
    coinsDelta?: number;
  } = {},
): ScenarioCompletedEvent => createEvent('ScenarioCompleted', { scenarioId, decisionId, ...meta });

export const createPurchaseMadeEvent = (
  itemId: string,
  price: number,
  meta: {
    itemName?: string;
    currency?: 'coins' | 'cash';
    coinsBefore?: number;
    coinsAfter?: number;
    cashBefore?: number;
    cashAfter?: number;
  } = {},
): PurchaseMadeEvent => createEvent('PurchaseMade', { itemId, price, ...meta });

export const createEmployeeHiredEvent = (
  payload: EmployeeHiredEvent['payload'],
): EmployeeHiredEvent => createEvent('EmployeeHired', payload);

export const createCompanyTickedEvent = (
  payload: CompanyTickedEvent['payload'],
): CompanyTickedEvent => createEvent('CompanyTicked', payload);

export const createExamPassedEvent = (
  examId: string,
  meta: {
    stage?: SkillStageId;
    score?: number;
  } = {},
): ExamPassedEvent => createEvent('ExamPassed', { examId, ...meta });

export const createExamFailedEvent = (
  examId: string,
  meta: {
    stage?: SkillStageId;
    score?: number;
  } = {},
): ExamFailedEvent => createEvent('ExamFailed', { examId, ...meta });

export const createIncidentDeferredEvent = (
  payload: IncidentDeferredEvent['payload'],
): IncidentDeferredEvent => createEvent('IncidentDeferred', payload);

export const createStagePromotedEvent = (
  fromStage: SkillStageId,
  toStage: SkillStageId,
): StagePromotedEvent => createEvent('StagePromoted', { fromStage, toStage });

export const createEndingResolvedEvent = (
  endingId: EndingResult['endingId'],
): EndingResolvedEvent => createEvent('EndingResolved', { endingId });

export const createProgressResetEvent = (reason?: string): ProgressResetEvent =>
  createEvent('ProgressReset', { reason });
