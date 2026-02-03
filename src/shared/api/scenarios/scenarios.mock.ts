import { Scenario } from '@/entities/scenario';

export const SCENARIOS_MOCK: Scenario[] = [
  {
    id: 'scenario-1',
    title: 'Онбординг и окружение',
    description: 'Нужно быстро настроить рабочее окружение и стандарты команды.',
    decisions: [
      {
        id: 'decision-1a',
        text: 'Настроить линтеры и форматирование перед началом работы.',
        effects: {
          'skill-frontend-foundations': 1,
          reputation: 1,
          techDebt: -1,
        },
      },
      {
        id: 'decision-1b',
        text: 'Пропустить настройку и сразу начать кодить.',
        effects: {
          'skill-git-basics': 1,
          reputation: -1,
          techDebt: 1,
        },
      },
    ],
  },
  {
    id: 'scenario-2',
    title: 'Верстка формы входа',
    description: 'Нужно сверстать форму логина с валидацией и подсказками.',
    decisions: [
      {
        id: 'decision-2a',
        text: 'Сделать семантичную разметку с доступностью.',
        effects: {
          'skill-html-semantic': 1,
          reputation: 1,
        },
      },
      {
        id: 'decision-2b',
        text: 'Сфокусироваться на быстром визуальном результате.',
        effects: {
          'skill-css-layout': 1,
          techDebt: 1,
        },
      },
    ],
  },
  {
    id: 'scenario-3',
    title: 'Работа с Git',
    description: 'Нужно подготовить чистый PR и провести самопроверку.',
    decisions: [
      {
        id: 'decision-3a',
        text: 'Разбить изменения на логичные коммиты.',
        effects: {
          'skill-git-basics': 1,
          reputation: 1,
        },
      },
      {
        id: 'decision-3b',
        text: 'Отправить один большой коммит без описания.',
        effects: {
          'skill-git-basics': 1,
          reputation: -1,
          techDebt: 1,
        },
      },
    ],
  },
  {
    id: 'scenario-4',
    title: 'Мини-рефакторинг',
    description: 'Старый компонент нужно привести к новым стандартам.',
    decisions: [
      {
        id: 'decision-4a',
        text: 'Провести рефакторинг и убрать дубли.',
        effects: {
          'skill-frontend-foundations': 1,
          techDebt: -1,
        },
      },
      {
        id: 'decision-4b',
        text: 'Оставить как есть, чтобы не рисковать сроками.',
        effects: {
          reputation: -1,
          techDebt: 1,
        },
      },
    ],
  },
  {
    id: 'scenario-5',
    title: 'Синхронизация состояния',
    description: 'Форма сложная, данные приходят частями, нужен единый стор.',
    decisions: [
      {
        id: 'decision-5a',
        text: 'Выделить стор и единый источник правды.',
        effects: {
          'skill-state-management': 1,
          reputation: 1,
        },
      },
      {
        id: 'decision-5b',
        text: 'Хранить всё локально в компонентах.',
        effects: {
          techDebt: 1,
        },
      },
    ],
  },
  {
    id: 'scenario-6',
    title: 'Навигация по продукту',
    description: 'Добавляется новый раздел и переходы между шагами.',
    decisions: [
      {
        id: 'decision-6a',
        text: 'Сформировать чистую структуру роутов.',
        effects: {
          'skill-routing': 1,
          reputation: 1,
        },
      },
      {
        id: 'decision-6b',
        text: 'Добавить редиректы прямо в компоненте.',
        effects: {
          'skill-routing': 1,
          techDebt: 1,
        },
      },
    ],
  },
  {
    id: 'scenario-7',
    title: 'Дизайн компонентов',
    description: 'Нужно унифицировать карточки и кнопки.',
    decisions: [
      {
        id: 'decision-7a',
        text: 'Собрать библиотеку компонентов.',
        effects: {
          'skill-component-design': 1,
          reputation: 1,
        },
      },
      {
        id: 'decision-7b',
        text: 'Сделать быстро, без общей системы.',
        effects: {
          'skill-component-design': 1,
          techDebt: 1,
        },
      },
    ],
  },
  {
    id: 'scenario-8',
    title: 'Покрытие UI тестами',
    description: 'Критическая форма требует автотестов.',
    decisions: [
      {
        id: 'decision-8a',
        text: 'Покрыть ключевые сценарии.',
        effects: {
          'skill-testing-ui': 1,
          reputation: 1,
        },
      },
      {
        id: 'decision-8b',
        text: 'Отложить тесты до следующего спринта.',
        effects: {
          techDebt: 1,
        },
      },
    ],
  },
  {
    id: 'scenario-9',
    title: 'Оптимизация производительности',
    description: 'Страницы стали медленнее после релиза.',
    decisions: [
      {
        id: 'decision-9a',
        text: 'Провести профилирование и устранить узкие места.',
        effects: {
          'skill-performance': 1,
          reputation: 1,
        },
      },
      {
        id: 'decision-9b',
        text: 'Добавить кэш без анализа причин.',
        effects: {
          'skill-performance': 1,
          techDebt: 1,
        },
      },
    ],
  },
  {
    id: 'scenario-10',
    title: 'Архитектурный выбор',
    description: 'Команда обсуждает новый подход к модульности.',
    decisions: [
      {
        id: 'decision-10a',
        text: 'Подготовить ADR и согласовать с командой.',
        effects: {
          'skill-architecture': 1,
          reputation: 1,
        },
      },
      {
        id: 'decision-10b',
        text: 'Просто внедрить решение без документации.',
        effects: {
          'skill-architecture': 1,
          techDebt: 1,
        },
      },
    ],
  },
  {
    id: 'scenario-11',
    title: 'Наблюдаемость',
    description: 'Нужно улучшить мониторинг и алерты.',
    decisions: [
      {
        id: 'decision-11a',
        text: 'Настроить метрики и алерты для ключевых потоков.',
        effects: {
          'skill-observability': 1,
          reputation: 1,
        },
      },
      {
        id: 'decision-11b',
        text: 'Положиться на ручную проверку после релиза.',
        effects: {
          'skill-observability': 1,
          techDebt: 1,
        },
      },
    ],
  },
  {
    id: 'scenario-12',
    title: 'Системное решение',
    description: 'Нужно согласовать стратегию работы нескольких сервисов.',
    decisions: [
      {
        id: 'decision-12a',
        text: 'Спроектировать контракты и синхронизацию.',
        effects: {
          'skill-system-design': 1,
          reputation: 1,
        },
      },
      {
        id: 'decision-12b',
        text: 'Действовать точечно без общей схемы.',
        effects: {
          'skill-system-design': 1,
          techDebt: 1,
        },
      },
    ],
  },
  {
    id: 'scenario-13',
    title: 'Распределенная архитектура',
    description: 'Проект масштабируется и требует распределенных компонентов.',
    decisions: [
      {
        id: 'decision-13a',
        text: 'Внедрить слои и коммуникацию через события.',
        effects: {
          'skill-distributed-systems': 1,
          reputation: 1,
        },
      },
      {
        id: 'decision-13b',
        text: 'Увеличить монолит без дополнительных слоев.',
        effects: {
          'skill-distributed-systems': 1,
          techDebt: 1,
        },
      },
    ],
  },
  {
    id: 'scenario-14',
    title: 'Инцидент в проде',
    description: 'Нужно быстро восстановить сервис и провести разбор.',
    decisions: [
      {
        id: 'decision-14a',
        text: 'Организовать постмортем и улучшить процессы.',
        effects: {
          'skill-reliability': 1,
          reputation: 1,
        },
      },
      {
        id: 'decision-14b',
        text: 'Сфокусироваться только на срочном исправлении.',
        effects: {
          'skill-reliability': 1,
          techDebt: 1,
        },
      },
    ],
  },
  {
    id: 'scenario-15',
    title: 'Security review',
    description: 'Обнаружены потенциальные уязвимости в API.',
    decisions: [
      {
        id: 'decision-15a',
        text: 'Провести аудит и закрыть уязвимости.',
        effects: {
          'skill-security-backend': 1,
          reputation: 1,
        },
      },
      {
        id: 'decision-15b',
        text: 'Отложить исправления до следующего релиза.',
        effects: {
          'skill-security-backend': 1,
          techDebt: 1,
        },
      },
    ],
  },
  {
    id: 'scenario-16',
    title: 'Планирование емкости',
    description: 'Сервису нужен план роста на квартал вперёд.',
    decisions: [
      {
        id: 'decision-16a',
        text: 'Сделать прогноз и согласовать бюджет.',
        effects: {
          'skill-capacity-planning': 1,
          reputation: 1,
        },
      },
      {
        id: 'decision-16b',
        text: 'Действовать реактивно по мере роста.',
        effects: {
          'skill-scalability': 1,
          techDebt: 1,
        },
      },
    ],
  },
];
