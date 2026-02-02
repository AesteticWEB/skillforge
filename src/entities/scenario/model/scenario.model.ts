import { Decision } from '../../decision/model/decision.model';

export interface Scenario {
  id: string;
  title: string;
  description: string;
  decisions: Decision[];
}
