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
  role: 'Demo Engineer',
  goal: 'Explore SkillForge in 30 seconds',
  selectedSkillIds: ['skill-architecture', 'skill-performance', 'skill-research'],
  decisions: [
    { scenarioId: 'scenario-1', decisionId: 'decision-1a' },
    { scenarioId: 'scenario-2', decisionId: 'decision-2a' },
    { scenarioId: 'scenario-1', decisionId: 'decision-1b' },
    { scenarioId: 'scenario-2', decisionId: 'decision-2b' },
    { scenarioId: 'scenario-1', decisionId: 'decision-1a' },
  ],
};
