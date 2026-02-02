import { Scenario } from '@/entities/scenario';

export const SCENARIOS_MOCK: Scenario[] = [
  {
    id: 'scenario-1',
    title: 'Legacy Refactor',
    description: 'A critical UI module is due for a refactor ahead of a major release.',
    availabilityEffects: [
      {
        type: 'unlock',
        scenarioId: 'scenario-2',
      },
    ],
    decisions: [
      {
        id: 'decision-1a',
        text: 'Ship a minimal refactor with a rollback plan.',
        effects: {
          'skill-architecture': 1,
          'skill-performance': 1,
          reputation: 1,
          techDebt: 2,
        },
      },
      {
        id: 'decision-1b',
        text: 'Freeze features and rewrite the module with tests.',
        effects: {
          'skill-architecture': 2,
          'skill-mentorship': 1,
          reputation: 2,
          techDebt: -1,
        },
      },
    ],
  },
  {
    id: 'scenario-2',
    title: 'Stakeholder Alignment',
    description: 'Leadership requests evidence for prioritizing skills investment.',
    requirements: [
      {
        type: 'skill',
        skillId: 'skill-architecture',
        minLevel: 2,
      },
      {
        type: 'metric',
        metric: 'reputation',
        min: 1,
      },
    ],
    decisions: [
      {
        id: 'decision-2a',
        text: 'Present a skill-impact dashboard with weekly metrics.',
        effects: {
          'skill-research': 1,
          'skill-mentorship': 1,
          reputation: 2,
          techDebt: 0,
        },
      },
      {
        id: 'decision-2b',
        text: 'Run discovery interviews and map risks to skills.',
        effects: {
          'skill-research': 2,
          reputation: 1,
          techDebt: -1,
        },
      },
    ],
  },
];
