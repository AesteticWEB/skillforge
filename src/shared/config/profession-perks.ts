export type ProfessionKey =
  | 'frontend'
  | 'backend'
  | 'fullstack'
  | 'mobile'
  | 'qa'
  | 'devops'
  | 'data-engineer'
  | 'data-scientist-ml'
  | 'security'
  | 'gamedev';

export type PerkEffects = {
  coinsBonusPct?: number;
  xpBonusPct?: number;
  repBonusFlat?: number;
  techDebtReduceFlat?: number;
  cashIncomeBonusPct?: number;
  incidentReducePct?: number;
  candidateQualityBonusPct?: number;
};

export type ProfessionPerk = {
  id: string;
  title: string;
  desc: string;
  effects: PerkEffects;
};

export const PROFESSION_PERKS: Record<ProfessionKey, ProfessionPerk[]> = {
  frontend: [
    {
      id: 'perk_frontend_ui_flow',
      title: 'Поток интерфейса',
      desc: 'Ускоряет итерации и улучшает восприятие интерфейса.',
      effects: { xpBonusPct: 0.06 },
    },
    {
      id: 'perk_frontend_quality_signal',
      title: 'Сигналы качества',
      desc: 'Повышает доверие пользователей и репутацию продукта.',
      effects: { repBonusFlat: 0.5 },
    },
    {
      id: 'perk_frontend_component_care',
      title: 'Уход за компонентами',
      desc: 'Единые компоненты снижают техдолг и ускоряют работу.',
      effects: { techDebtReduceFlat: 0.5 },
    },
  ],
  backend: [
    {
      id: 'perk_backend_throughput',
      title: 'Пропускная способность',
      desc: 'Сервисы обрабатывают больше запросов и приносят больше монет.',
      effects: { coinsBonusPct: 0.06 },
    },
    {
      id: 'perk_backend_stability',
      title: 'Стабильность сервисов',
      desc: 'Меньше сбоев и ниже техдолг.',
      effects: { techDebtReduceFlat: 1 },
    },
    {
      id: 'perk_backend_cashflow',
      title: 'Стабильный поток',
      desc: 'Инфраструктура поддерживает рост дохода.',
      effects: { cashIncomeBonusPct: 0.05 },
    },
  ],
  fullstack: [
    {
      id: 'perk_fullstack_breadth',
      title: 'Широкий охват',
      desc: 'Быстрое развитие продукта по всему стеку.',
      effects: { xpBonusPct: 0.04 },
    },
    {
      id: 'perk_fullstack_value',
      title: 'Ценность фич',
      desc: 'Фокус на продукт дает больше монет.',
      effects: { coinsBonusPct: 0.04 },
    },
    {
      id: 'perk_fullstack_trust',
      title: 'Доверие команды',
      desc: 'Стабильные релизы усиливают репутацию.',
      effects: { repBonusFlat: 0.4 },
    },
  ],
  mobile: [
    {
      id: 'perk_mobile_store_ready',
      title: 'Готовность к сторам',
      desc: 'Быстрые релизы повышают доход.',
      effects: { coinsBonusPct: 0.05 },
    },
    {
      id: 'perk_mobile_polish',
      title: 'Полировка интерфейса',
      desc: 'Качество интерфейса повышает оценки и репутацию.',
      effects: { repBonusFlat: 0.5 },
    },
    {
      id: 'perk_mobile_stability',
      title: 'Стабильность приложений',
      desc: 'Меньше инцидентов и падений.',
      effects: { incidentReducePct: 0.08 },
    },
  ],
  qa: [
    {
      id: 'perk_qa_bug_catch',
      title: 'Отлов багов',
      desc: 'Снижаыет техдолг и стоимость ошибок.',
      effects: { techDebtReduceFlat: 1 },
    },
    {
      id: 'perk_qa_risk_reduce',
      title: 'Снижение рисков',
      desc: 'Меньше инцидентов на проде.',
      effects: { incidentReducePct: 0.1 },
    },
    {
      id: 'perk_qa_quality_rep',
      title: 'Репутация качества',
      desc: 'Качество релизов укрепляет доверие.',
      effects: { repBonusFlat: 0.4 },
    },
  ],
  devops: [
    {
      id: 'perk_devops_resilience',
      title: 'Устойчивость инфраструктуры',
      desc: 'Снижает вероятность инцидентов.',
      effects: { incidentReducePct: 0.15 },
    },
    {
      id: 'perk_devops_cashflow',
      title: 'Надежный доход',
      desc: 'Инфраструктура поддерживает денежный поток.',
      effects: { cashIncomeBonusPct: 0.07 },
    },
    {
      id: 'perk_devops_discipline',
      title: 'Инженерная дисциплина',
      desc: 'Контроль процессов снижает техдолг.',
      effects: { techDebtReduceFlat: 0.5 },
    },
  ],
  'data-engineer': [
    {
      id: 'perk_data_engineer_pipelines',
      title: 'Пайплайны данных',
      desc: 'Потоки данных стабилизируют доход.',
      effects: { cashIncomeBonusPct: 0.08 },
    },
    {
      id: 'perk_data_engineer_quality',
      title: 'Качество данных',
      desc: 'Меньше сбоев из-за плохих данных.',
      effects: { incidentReducePct: 0.1 },
    },
    {
      id: 'perk_data_engineer_cost',
      title: 'Оптимизация стоимости',
      desc: 'Економия ресурсов приносит монеты.',
      effects: { coinsBonusPct: 0.04 },
    },
  ],
  'data-scientist-ml': [
    {
      id: 'perk_ml_insights',
      title: 'Инсайты из данных',
      desc: 'Аналитика усиливает репутацию решений.',
      effects: { repBonusFlat: 0.6 },
    },
    {
      id: 'perk_ml_value',
      title: 'Бизнес-ценность моделей',
      desc: 'Модели дают прирост монет.',
      effects: { coinsBonusPct: 0.05 },
    },
    {
      id: 'perk_ml_experiments',
      title: 'Експерименты',
      desc: 'Быстрые експерименты повышают техдолг.',
      effects: { techDebtReduceFlat: -0.5 },
    },
  ],
  security: [
    {
      id: 'perk_security_hardening',
      title: 'Укрепление засчиты',
      desc: 'Снижает вероятность атак.',
      effects: { incidentReducePct: 0.2 },
    },
    {
      id: 'perk_security_trust',
      title: 'Доверие безопасности',
      desc: 'Повышает репутацию команды.',
      effects: { repBonusFlat: 0.7 },
    },
    {
      id: 'perk_security_hygiene',
      title: 'Гигиена безопасности',
      desc: 'Процессы снижают техдолг.',
      effects: { techDebtReduceFlat: 0.5 },
    },
  ],
  gamedev: [
    {
      id: 'perk_gamedev_retention',
      title: 'Удержание игроков',
      desc: 'Рост удержания увеличивает доход.',
      effects: { coinsBonusPct: 0.06 },
    },
    {
      id: 'perk_gamedev_iteration',
      title: 'Быстрые итерации',
      desc: 'Частые релизы дают больше опыта.',
      effects: { xpBonusPct: 0.06 },
    },
    {
      id: 'perk_gamedev_crunch',
      title: 'Режим кранча',
      desc: 'Ускоряет выпуск, но увеличивает техдолг.',
      effects: { techDebtReduceFlat: -0.5 },
    },
  ],
};
