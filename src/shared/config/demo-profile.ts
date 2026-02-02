export type DemoDecision = {
  scenarioId: string;
  decisionId: string;
};

export type DemoProfile = {
  role: string;
  goal: string;
  selectedSkillIds: string[];
  decisions: DemoDecision[];
};

export const DEMO_PROFILE: DemoProfile = {
  role: 'Демо-инженер',
  goal: 'Проверить SkillForge за 30 секунд',
  selectedSkillIds: [
    'skill-architecture',
    'skill-performance',
    'skill-backend',
    'skill-system-design',
    'skill-research',
    'skill-communication',
  ],
  decisions: [
    { scenarioId: 'scenario-1', decisionId: 'decision-1a' },
    { scenarioId: 'scenario-2', decisionId: 'decision-2a' },
    { scenarioId: 'scenario-1', decisionId: 'decision-1b' },
    { scenarioId: 'scenario-2', decisionId: 'decision-2b' },
    { scenarioId: 'scenario-1', decisionId: 'decision-1a' },
  ],
};
