import type { PerkEffects, ProfessionKey } from './profession-perks';

export type SpecializationId = string;

export type Specialization = {
  id: SpecializationId;
  professionId: ProfessionKey;
  title: string;
  desc: string;
  effects: PerkEffects;
};

export const SPECIALIZATIONS: Record<ProfessionKey, Specialization[]> = {
  frontend: [
    {
      id: 'spec_frontend_performance',
      professionId: 'frontend',
      title: 'Производительность интерфейса',
      desc: 'Оптимизация рендера и скорости загрузки.',
      effects: { xpBonusPct: 0.05, coinsBonusPct: 0.02 },
    },
    {
      id: 'spec_frontend_accessibility',
      professionId: 'frontend',
      title: 'Доступность и семантика',
      desc: 'Лучший опыт и доступность для всех пользователей.',
      effects: { repBonusFlat: 0.5, techDebtReduceFlat: 0.4 },
    },
    {
      id: 'spec_frontend_design_system',
      professionId: 'frontend',
      title: 'Дизайн-системы',
      desc: 'Единые компоненты ускоряют развитие интерфейса.',
      effects: { techDebtReduceFlat: 0.5, coinsBonusPct: 0.02 },
    },
  ],
  backend: [
    {
      id: 'spec_backend_architecture',
      professionId: 'backend',
      title: 'Архитектура сервисов',
      desc: 'Надежная архитектура и масштабирование.',
      effects: { coinsBonusPct: 0.04, techDebtReduceFlat: 0.5 },
    },
    {
      id: 'spec_backend_api',
      professionId: 'backend',
      title: 'Интеграции и интерфейсы',
      desc: 'Чистые контракты и удобные интеграции.',
      effects: { repBonusFlat: 0.4, xpBonusPct: 0.03 },
    },
    {
      id: 'spec_backend_data',
      professionId: 'backend',
      title: 'Данные и хранилища',
      desc: 'Потоки данных поддерживают доход.',
      effects: { cashIncomeBonusPct: 0.04 },
    },
  ],
  fullstack: [
    {
      id: 'spec_fullstack_product',
      professionId: 'fullstack',
      title: 'Продуктовый фокус',
      desc: 'Связывает интерфейс и бекенд ради ценности.',
      effects: { coinsBonusPct: 0.03, repBonusFlat: 0.3 },
    },
    {
      id: 'spec_fullstack_platform',
      professionId: 'fullstack',
      title: 'Платформа и устойчивость',
      desc: 'Стабильность и меньше инцидентов.',
      effects: { techDebtReduceFlat: 0.4, incidentReducePct: 0.05 },
    },
    {
      id: 'spec_fullstack_growth',
      professionId: 'fullstack',
      title: 'Рост и експерименты',
      desc: 'Быстрые гипотезы дают больше опыта.',
      effects: { xpBonusPct: 0.05 },
    },
  ],
  mobile: [
    {
      id: 'spec_mobile_release',
      professionId: 'mobile',
      title: 'Релизы и сторы',
      desc: 'Быстрые релизы и меньше инцидентов.',
      effects: { coinsBonusPct: 0.04, incidentReducePct: 0.05 },
    },
    {
      id: 'spec_mobile_ux',
      professionId: 'mobile',
      title: 'Качество интерфейса',
      desc: 'Полировка интерфейса повышает оценки.',
      effects: { repBonusFlat: 0.5 },
    },
    {
      id: 'spec_mobile_performance',
      professionId: 'mobile',
      title: 'Производительность устройства',
      desc: 'Оптимизация батареи и скорости.',
      effects: { xpBonusPct: 0.03, techDebtReduceFlat: 0.3 },
    },
  ],
  qa: [
    {
      id: 'spec_qa_automation',
      professionId: 'qa',
      title: 'Автоматизация тестов',
      desc: 'Больше покрытия, меньше техдолга.',
      effects: { techDebtReduceFlat: 0.8, xpBonusPct: 0.03 },
    },
    {
      id: 'spec_qa_risk',
      professionId: 'qa',
      title: 'Управление рисками',
      desc: 'Снижение инцидентов на проде.',
      effects: { incidentReducePct: 0.1 },
    },
    {
      id: 'spec_qa_quality',
      professionId: 'qa',
      title: 'Качество релизов',
      desc: 'Укрепляет репутацию продукта.',
      effects: { repBonusFlat: 0.3, coinsBonusPct: 0.02 },
    },
  ],
  devops: [
    {
      id: 'spec_devops_sre',
      professionId: 'devops',
      title: 'Надежность и експлуатация',
      desc: 'Меньше инцидентов и стабильный доход.',
      effects: { incidentReducePct: 0.12, cashIncomeBonusPct: 0.04 },
    },
    {
      id: 'spec_devops_platform',
      professionId: 'devops',
      title: 'Платформенная инженерия',
      desc: 'Ускоряет поставки и снижает техдолг.',
      effects: { cashIncomeBonusPct: 0.05, techDebtReduceFlat: 0.4 },
    },
    {
      id: 'spec_devops_security',
      professionId: 'devops',
      title: 'Безопасность инфраструктуры',
      desc: 'Снижение рисков и рост репутации.',
      effects: { incidentReducePct: 0.08, repBonusFlat: 0.3 },
    },
  ],
  'data-engineer': [
    {
      id: 'spec_data-engineer_pipelines',
      professionId: 'data-engineer',
      title: 'Пайплайны данных',
      desc: 'Стабильные потоки данных повышают доход.',
      effects: { cashIncomeBonusPct: 0.06 },
    },
    {
      id: 'spec_data-engineer_quality',
      professionId: 'data-engineer',
      title: 'Качество данных',
      desc: 'Меньше сбоев и техдолга.',
      effects: { incidentReducePct: 0.08, techDebtReduceFlat: 0.3 },
    },
    {
      id: 'spec_data-engineer_cost',
      professionId: 'data-engineer',
      title: 'Оптимизация стоимости',
      desc: 'Економия инфраструктуры приносит монеты.',
      effects: { coinsBonusPct: 0.03 },
    },
  ],
  'data-scientist-ml': [
    {
      id: 'spec_data-scientist-ml_research',
      professionId: 'data-scientist-ml',
      title: 'Исследования и експерименты',
      desc: 'Больше опыта и репутации.',
      effects: { xpBonusPct: 0.05, repBonusFlat: 0.4 },
    },
    {
      id: 'spec_data-scientist-ml_product',
      professionId: 'data-scientist-ml',
      title: 'Модели для продукта',
      desc: 'Ценность для бизнеса и монеты.',
      effects: { coinsBonusPct: 0.04, repBonusFlat: 0.3 },
    },
    {
      id: 'spec_data-scientist-ml_mlop',
      professionId: 'data-scientist-ml',
      title: 'Поставка моделей',
      desc: 'Стабильные релизы и меньше инцидентов.',
      effects: { incidentReducePct: 0.06, techDebtReduceFlat: 0.3 },
    },
  ],
  security: [
    {
      id: 'spec_security_appsec',
      professionId: 'security',
      title: 'Безопасность приложений',
      desc: 'Снижение уязвимостей и рост репутации.',
      effects: { incidentReducePct: 0.12, repBonusFlat: 0.4 },
    },
    {
      id: 'spec_security_audit',
      professionId: 'security',
      title: 'Аудит и соотвецтвие',
      desc: 'Больше доверия и дохода.',
      effects: { repBonusFlat: 0.5, cashIncomeBonusPct: 0.03 },
    },
    {
      id: 'spec_security_response',
      professionId: 'security',
      title: 'Реагирование на инциденты',
      desc: 'Быстрое восстановление, меньше ущерба.',
      effects: { incidentReducePct: 0.1, techDebtReduceFlat: 0.3 },
    },
  ],
  gamedev: [
    {
      id: 'spec_gamedev_gameplay',
      professionId: 'gamedev',
      title: 'Геймплей и прогрессия',
      desc: 'Улучшает удержание и монетизацию.',
      effects: { coinsBonusPct: 0.05, xpBonusPct: 0.04 },
    },
    {
      id: 'spec_gamedev_liveops',
      professionId: 'gamedev',
      title: 'Онлайн-операции и монетизация',
      desc: 'Стабильный доход и меньше инцидентов.',
      effects: { cashIncomeBonusPct: 0.04, incidentReducePct: 0.05 },
    },
    {
      id: 'spec_gamedev_tech',
      professionId: 'gamedev',
      title: 'Технический фундамент',
      desc: 'Меньше техдолга и больше репутации.',
      effects: { techDebtReduceFlat: 0.4, repBonusFlat: 0.3 },
    },
  ],
};
