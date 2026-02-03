import type { DecisionEffects } from '@/entities/decision';
import type { Scenario } from '@/entities/scenario';
import {
  PROFESSION_OPTIONS,
  PROFESSION_STAGE_SCENARIOS,
  PROFESSION_STAGE_SKILLS,
  SCENARIO_REWARD_XP,
  type ProfessionId,
  type SkillStageId,
} from '@/shared/config';

const STAGES: SkillStageId[] = ['internship', 'junior', 'middle', 'senior'];

type ScenarioSeed = {
  title: string;
  description: string;
  focus: string;
};

type OptionTemplate = {
  goodA: string;
  goodB: string;
  badA: string;
  badB: string;
};

type ScenarioOption = {
  text: string;
  effects: DecisionEffects;
  correct: boolean;
};

type SeedTemplate = {
  title: string;
  description: string;
  focus: string;
};

const OPTION_TEMPLATES: Record<SkillStageId, OptionTemplate> = {
  internship: {
    goodA: 'Проработать {focus} по чек-листу и показать наставнику.',
    goodB: 'Сделать {focus} аккуратно и проверить на разных устройствах.',
    badA: 'Сделать {focus} наспех без проверки.',
    badB: 'Отложить {focus} и закрыть задачу формально.',
  },
  junior: {
    goodA: 'Спроектировать {focus} и добавить тесты.',
    goodB: 'Внедрить {focus} поэтапно с метриками.',
    badA: 'Закатить {focus} без ревью и тестов.',
    badB: 'Сделать {focus} временным хотфиксом.',
  },
  middle: {
    goodA: 'Провести анализ и улучшить {focus} с командой.',
    goodB: 'Согласовать {focus} и заложить план оптимизации.',
    badA: 'Закрыть {focus} точечно, игнорируя причины.',
    badB: 'Оставить {focus} как есть до следующего квартала.',
  },
  senior: {
    goodA: 'Выстроить стратегию и правила под {focus}.',
    goodB: 'Сделать {focus} с архитектурным решением и SLA.',
    badA: 'Сделать {focus} хаками без контроля.',
    badB: 'Отложить {focus} на неопределённый срок.',
  },
};

const STAGE_SEED_TEMPLATES: Record<SkillStageId, SeedTemplate[]> = {
  internship: [
    {
      title: 'Быстрый старт: {topic}',
      description: 'Нужно быстро привести в порядок {topic} и показать результат наставнику.',
      focus: '{topic}',
    },
    {
      title: 'Чек-лист качества',
      description: 'Есть базовый чек-лист. Проверь {topic} и исправь очевидные проблемы.',
      focus: '{topic}',
    },
    {
      title: 'Мини-фиксы',
      description: 'Перед релизом всплыли мелкие ошибки в {topic}. Нужно быстро их закрыть.',
      focus: '{topic}',
    },
    {
      title: 'Подготовка к демо',
      description: 'Команда готовит демо. Нужно аккуратно довести {topic} до стабильного вида.',
      focus: '{topic}',
    },
  ],
  junior: [
    {
      title: 'Стабильность: {topic}',
      description: 'Нужно сделать {topic} устойчивой и покрыть тестами.',
      focus: '{topic}',
    },
    {
      title: 'План внедрения',
      description: 'Команда просит внедрить {topic} поэтапно с измерением эффекта.',
      focus: '{topic}',
    },
    {
      title: 'Архитектурное решение',
      description: 'Нужно спроектировать {topic} с учётом масштабирования и поддержки.',
      focus: '{topic}',
    },
    {
      title: 'Инцидент после релиза',
      description: 'После релиза появилась проблема в {topic}. Нужно разобраться и исправить.',
      focus: '{topic}',
    },
  ],
  middle: [
    {
      title: 'Оптимизация: {topic}',
      description:
        'Метрики деградировали. Требуется оптимизировать {topic} и согласовать изменения.',
      focus: '{topic}',
    },
    {
      title: 'Системный анализ',
      description: 'Нужно провести анализ и выбрать стратегию развития {topic}.',
      focus: '{topic}',
    },
    {
      title: 'Кросс-командная зависимость',
      description: 'Несколько команд зависят от {topic}. Требуется договориться о правилах.',
      focus: '{topic}',
    },
    {
      title: 'Технический долг',
      description: 'Накопился долг в {topic}. Составь план улучшений и согласуй приоритеты.',
      focus: '{topic}',
    },
  ],
  senior: [
    {
      title: 'Стратегия и SLA',
      description: 'Нужно выстроить стратегию для {topic} с метриками и SLA.',
      focus: '{topic}',
    },
    {
      title: 'Организация практик',
      description: 'Нужно внедрить стандарты и практики вокруг {topic} во всей команде.',
      focus: '{topic}',
    },
    {
      title: 'Архитектурный масштаб',
      description: 'Продукт растёт, требуется архитектурное решение для {topic}.',
      focus: '{topic}',
    },
    {
      title: 'Риск-менеджмент',
      description: 'Есть риски в {topic}. Нужен план минимизации и контроль.',
      focus: '{topic}',
    },
  ],
};

const PROFESSION_TOPICS: Record<ProfessionId, [string, string, string, string]> = {
  'Frontend-разработчик': [
    'адаптивность интерфейса',
    'состояние и формы',
    'производительность рендера',
    'доступность и UX',
  ],
  'Backend-разработчик': [
    'API и контракты',
    'транзакции БД',
    'авторизацию и безопасность',
    'логирование и мониторинг',
  ],
  'Fullstack-разработчик': [
    'сквозные фичи',
    'интеграцию фронт/бэк',
    'структуру данных',
    'наблюдаемость продукта',
  ],
  'Mobile-разработчик (iOS/Android)': [
    'навигацию и жизненный цикл',
    'оптимизацию памяти',
    'офлайн-режим',
    'дистрибуцию и апдейты',
  ],
  'QA Automation (автотесты)': [
    'флейки тестов',
    'покрытие регрессии',
    'стабильность CI',
    'генерацию тестовых данных',
  ],
  'DevOps / SRE': [
    'пайплайн CI/CD',
    'алерты и мониторинг',
    'инфраструктуру как код',
    'инциденты и постмортемы',
  ],
  'Data Engineer': ['ETL пайплайны', 'качество данных', 'стриминг и очереди', 'хранилище и схемы'],
  'Data Scientist / ML Engineer': [
    'подготовку датасета',
    'метрики модели',
    'воспроизводимость экспериментов',
    'деплой модели',
  ],
  'Security Engineer (AppSec)': [
    'угрозы и риск-анализ',
    'защиту API',
    'секьюрный SDLC',
    'пентест и уязвимости',
  ],
  'Game Developer': [
    'геймплей и баланс',
    'графику и оптимизацию',
    'сетевой мультиплеер',
    'производственный пайплайн',
  ],
};

const fillTemplate = (template: string, focus: string): string =>
  template.replace('{focus}', focus);

const applySeedTemplate = (template: string, topic: string, profession: ProfessionId): string =>
  template.replace(/\{topic\}/g, topic).replace(/\{profession\}/g, profession);

const buildOptions = (
  stage: SkillStageId,
  focus: string,
  skillA: string,
  skillB: string,
): ScenarioOption[] => {
  const template = OPTION_TEMPLATES[stage];
  const options: ScenarioOption[] = [
    {
      text: fillTemplate(template.goodA, focus),
      effects: { [skillA]: 1, reputation: 1 } as DecisionEffects,
      correct: true,
    },
    {
      text: fillTemplate(template.goodB, focus),
      effects: { [skillB]: 1, reputation: 1 } as DecisionEffects,
      correct: true,
    },
    {
      text: fillTemplate(template.badA, focus),
      effects: { techDebt: 1 } as DecisionEffects,
      correct: false,
    },
    {
      text: fillTemplate(template.badB, focus),
      effects: { reputation: -1, techDebt: 1 } as DecisionEffects,
      correct: false,
    },
  ];

  return options;
};

const buildSeedsForProfession = (
  profession: ProfessionId,
): Record<SkillStageId, ScenarioSeed[]> => {
  const topics = PROFESSION_TOPICS[profession];

  return STAGES.reduce(
    (acc, stage) => {
      const templates = STAGE_SEED_TEMPLATES[stage];
      acc[stage] = templates.map((template, index) => {
        const topic = topics[index % topics.length];
        return {
          title: applySeedTemplate(template.title, topic, profession),
          description: applySeedTemplate(template.description, topic, profession),
          focus: applySeedTemplate(template.focus, topic, profession),
        };
      });
      return acc;
    },
    {} as Record<SkillStageId, ScenarioSeed[]>,
  );
};

const SCENARIO_LIBRARY: Record<
  ProfessionId,
  Record<SkillStageId, ScenarioSeed[]>
> = PROFESSION_OPTIONS.reduce(
  (acc, profession) => ({
    ...acc,
    [profession]: buildSeedsForProfession(profession),
  }),
  {} as Record<ProfessionId, Record<SkillStageId, ScenarioSeed[]>>,
);

const buildScenario = (
  profession: ProfessionId,
  stage: SkillStageId,
  id: string,
  seed: ScenarioSeed,
  skillA: string,
  skillB: string,
): Scenario => {
  const options = buildOptions(stage, seed.focus, skillA, skillB);
  const decisions = options.map((option, index) => {
    const suffix = String.fromCharCode(97 + index);
    return {
      id: `decision-${id}-${suffix}`,
      text: option.text,
      effects: option.effects,
    };
  });
  const correctOptionIds = options
    .map((option, index) =>
      option.correct ? `decision-${id}-${String.fromCharCode(97 + index)}` : null,
    )
    .filter((value): value is string => Boolean(value));

  return {
    id,
    title: seed.title,
    description: seed.description,
    stage,
    profession,
    rewardXp: SCENARIO_REWARD_XP,
    correctOptionIds,
    decisions,
  };
};

const buildScenariosForProfession = (profession: ProfessionId): Scenario[] => {
  const seedsByStage = SCENARIO_LIBRARY[profession];
  const idsByStage = PROFESSION_STAGE_SCENARIOS[profession];
  const skillsByStage = PROFESSION_STAGE_SKILLS[profession];

  return STAGES.flatMap((stage) => {
    const seeds = seedsByStage[stage];
    const ids = idsByStage[stage];
    const skills = skillsByStage[stage];

    return seeds.map((seed, index) => {
      const skillA = skills[index % skills.length];
      const skillB = skills[(index + 1) % skills.length];
      return buildScenario(profession, stage, ids[index], seed, skillA, skillB);
    });
  });
};

export const SCENARIOS_MOCK: Scenario[] = PROFESSION_OPTIONS.flatMap((profession) =>
  buildScenariosForProfession(profession),
);
