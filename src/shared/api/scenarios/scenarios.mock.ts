import { Scenario } from '@/entities/scenario';

export const SCENARIOS_MOCK: Scenario[] = [
  {
    id: 'scenario-1',
    title: 'Рефакторинг легаси',
    description: 'Критический UI-модуль нужно обновить перед большим релизом.',
    availabilityEffects: [
      {
        type: 'unlock',
        scenarioId: 'scenario-2',
      },
    ],
    decisions: [
      {
        id: 'decision-1a',
        text: 'Сделать минимальный рефакторинг с планом отката.',
        effects: {
          'skill-architecture': 1,
          'skill-performance': 1,
          reputation: 1,
          techDebt: 2,
        },
      },
      {
        id: 'decision-1b',
        text: 'Заморозить фичи и переписать модуль с тестами.',
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
    title: 'Согласование со стейкхолдерами',
    description: 'Руководство просит обоснование инвестиций в развитие навыков.',
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
        text: 'Показать дашборд влияния навыков с недельными метриками.',
        effects: {
          'skill-research': 1,
          'skill-mentorship': 1,
          reputation: 2,
          techDebt: 0,
        },
      },
      {
        id: 'decision-2b',
        text: 'Провести интервью и связать риски с навыками.',
        effects: {
          'skill-research': 2,
          reputation: 1,
          techDebt: -1,
        },
      },
    ],
  },
];
