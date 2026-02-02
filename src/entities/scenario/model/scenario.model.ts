import { Decision } from '@/entities/decision';

export interface Scenario {
  id: string;
  title: string;
  description: string;
  decisions: Decision[];
}
