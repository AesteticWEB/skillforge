export type DecisionEffects = Record<string, number>;

export interface Decision {
  id: string;
  text: string;
  effects: DecisionEffects;
}
