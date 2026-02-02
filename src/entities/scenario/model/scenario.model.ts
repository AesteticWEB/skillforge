import { Decision } from '@/entities/decision';
import { MetricKey } from '@/entities/progress';

export type ScenarioRequirement =
  | {
      type: 'skill';
      skillId: string;
      minLevel: number;
    }
  | {
      type: 'metric';
      metric: MetricKey;
      min?: number;
      max?: number;
    }
  | {
      type: 'scenario';
      scenarioId: string;
    };

export type ScenarioAvailabilityEffect = {
  type: 'unlock' | 'lock';
  scenarioId: string;
};

export interface Scenario {
  id: string;
  title: string;
  description: string;
  decisions: Decision[];
  requirements?: ScenarioRequirement[];
  availabilityEffects?: ScenarioAvailabilityEffect[];
}
