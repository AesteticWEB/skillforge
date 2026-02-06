export type ShopCategory =
  | 'productivity'
  | 'learning'
  | 'quality'
  | 'health'
  | 'automation'
  | 'career'
  | 'team'
  | 'ops'
  | 'networking'
  | 'security'
  | 'luxury';

export type ShopItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type ShopItemCurrency = 'coins' | 'cash';

export type ShopItemEffect = {
  reputation?: number;
  techDebt?: number;
  coins?: number;
  cash?: number;
  xp?: number;
};

export type ShopItem = {
  id: string;
  name: string;
  description: string;
  rarity: ShopItemRarity;
  category: ShopCategory;
  price: number;
  currency: ShopItemCurrency;
  effects: ShopItemEffect;
};

export const SHOP_ITEMS = [
  {
    id: 'shop-focus-timer',
    name: 'Фокус-таймер',
    description: 'Короткие циклы повышают концентрацию.',
    rarity: 'common',
    category: 'productivity',
    price: 40,
    currency: 'coins',
    effects: { reputation: 1 },
  },
  {
    id: 'shop-timebox-cards',
    name: 'Карточки таймбоксов',
    description: 'Четкие рамки удерживают задачи в сроках.',
    rarity: 'common',
    category: 'productivity',
    price: 55,
    currency: 'coins',
    effects: { xp: 2, reputation: 1 },
  },
  {
    id: 'shop-deep-work-kit',
    name: 'Набор для глубокой работы',
    description: 'Меньше отвлечений — выше качество.',
    rarity: 'uncommon',
    category: 'productivity',
    price: 120,
    currency: 'coins',
    effects: { reputation: 2, techDebt: -1 },
  },
  {
    id: 'shop-task-prioritizer',
    name: 'Приоритизатор задач',
    description: 'Держит бэклог в порядке.',
    rarity: 'uncommon',
    category: 'productivity',
    price: 110,
    currency: 'coins',
    effects: { techDebt: -1, xp: 3 },
  },
  {
    id: 'shop-course-pass',
    name: 'Доступ к курсам',
    description: 'Структурное обучение без хаоса.',
    rarity: 'common',
    category: 'learning',
    price: 70,
    currency: 'coins',
    effects: { xp: 6 },
  },
  {
    id: 'shop-mentor-session',
    name: 'Сессия с ментором',
    description: 'Экспертная обратная связь с эффектом.',
    rarity: 'rare',
    category: 'learning',
    price: 220,
    currency: 'coins',
    effects: { xp: 10, reputation: 2 },
  },
  {
    id: 'shop-practice-sandbox',
    name: 'Песочница практики',
    description: 'Безопасное место для экспериментов.',
    rarity: 'uncommon',
    category: 'learning',
    price: 130,
    currency: 'coins',
    effects: { xp: 7, techDebt: -1 },
  },
  {
    id: 'shop-code-review-checklist',
    name: 'Чек-лист код-ревью',
    description: 'Ловит ошибки до релиза.',
    rarity: 'common',
    category: 'quality',
    price: 50,
    currency: 'coins',
    effects: { techDebt: -2 },
  },
  {
    id: 'shop-testing-suite',
    name: 'Набор тестирования',
    description: 'Уверенность в каждом изменении.',
    rarity: 'rare',
    category: 'quality',
    price: 200,
    currency: 'coins',
    effects: { techDebt: -3, reputation: 1 },
  },
  {
    id: 'shop-static-analysis',
    name: 'Статический анализ',
    description: 'Предотвращает регрессии заранее.',
    rarity: 'uncommon',
    category: 'quality',
    price: 140,
    currency: 'coins',
    effects: { techDebt: -2, reputation: 1 },
  },
  {
    id: 'shop-ergonomic-chair',
    name: 'Эргономичное кресло',
    description: 'Комфорт поддерживает стабильность.',
    rarity: 'uncommon',
    category: 'health',
    price: 150,
    currency: 'coins',
    effects: { xp: 2, reputation: 1 },
  },
  {
    id: 'shop-standing-desk',
    name: 'Премиум-стол для работы стоя',
    description: 'Больше энергии и фокуса каждый день.',
    rarity: 'rare',
    category: 'luxury',
    price: 240,
    currency: 'cash',
    effects: { xp: 3, reputation: 2 },
  },
  {
    id: 'shop-sleep-tracker',
    name: 'Трекер сна',
    description: 'Восстановление усиливает концентрацию.',
    rarity: 'common',
    category: 'health',
    price: 60,
    currency: 'coins',
    effects: { xp: 2, techDebt: -1 },
  },
  {
    id: 'shop-ci-pipeline',
    name: 'CI-пайплайн',
    description: 'Автоматизация для стабильных релизов.',
    rarity: 'rare',
    category: 'automation',
    price: 260,
    currency: 'coins',
    effects: { techDebt: -2, xp: 4 },
  },
  {
    id: 'shop-release-bot',
    name: 'Релиз-бот',
    description: 'Быстрее и безопаснее выкладки.',
    rarity: 'epic',
    category: 'automation',
    price: 420,
    currency: 'coins',
    effects: { reputation: 3, techDebt: -2 },
  },
  {
    id: 'shop-auto-formatter',
    name: 'Автоформаттер',
    description: 'Больше никаких споров о стиле.',
    rarity: 'common',
    category: 'automation',
    price: 45,
    currency: 'coins',
    effects: { techDebt: -1 },
  },
  {
    id: 'shop-conference-ticket',
    name: 'Билет на конференцию',
    description: 'Новые идеи и мощный импульс.',
    rarity: 'rare',
    category: 'luxury',
    price: 280,
    currency: 'cash',
    effects: { reputation: 3, xp: 4 },
  },
  {
    id: 'shop-portfolio-boost',
    name: 'Усиление портфолио',
    description: 'Ясная история твоих кейсов.',
    rarity: 'uncommon',
    category: 'career',
    price: 160,
    currency: 'coins',
    effects: { reputation: 2 },
  },
  {
    id: 'shop-personal-branding',
    name: 'Персональный бренд',
    description: 'Выделяет тебя на рынке.',
    rarity: 'epic',
    category: 'luxury',
    price: 380,
    currency: 'cash',
    effects: { reputation: 4 },
  },
  {
    id: 'shop-pairing-session',
    name: 'Парная сессия',
    description: 'Лучшие решения вместе.',
    rarity: 'common',
    category: 'team',
    price: 75,
    currency: 'coins',
    effects: { reputation: 1, xp: 2 },
  },
  {
    id: 'shop-team-offsite',
    name: 'Командный оффсайт',
    description: 'Синхронизация и заряд энергии.',
    rarity: 'epic',
    category: 'luxury',
    price: 450,
    currency: 'cash',
    effects: { reputation: 3, techDebt: -1 },
  },
  {
    id: 'shop-onboarding-playbook',
    name: 'Плейбук онбординга',
    description: 'Новые люди быстрее включаются.',
    rarity: 'uncommon',
    category: 'team',
    price: 130,
    currency: 'coins',
    effects: { techDebt: -1, xp: 3 },
  },
  {
    id: 'shop-monitoring-dashboard',
    name: 'Дашборд мониторинга',
    description: 'Прозрачность снижает инциденты.',
    rarity: 'rare',
    category: 'ops',
    price: 210,
    currency: 'coins',
    effects: { techDebt: -2, reputation: 1 },
  },
  {
    id: 'shop-incident-playbook',
    name: 'Плейбук инцидентов',
    description: 'Четкие шаги под давлением.',
    rarity: 'uncommon',
    category: 'ops',
    price: 140,
    currency: 'coins',
    effects: { techDebt: -2 },
  },
  {
    id: 'shop-backup-automation',
    name: 'Автоматизация бэкапов',
    description: 'Восстановление без драмы.',
    rarity: 'rare',
    category: 'ops',
    price: 230,
    currency: 'coins',
    effects: { techDebt: -2, reputation: 1 },
  },
  {
    id: 'shop-meetup-pass',
    name: 'Абонемент на митапы',
    description: 'Новые связи каждую неделю.',
    rarity: 'common',
    category: 'networking',
    price: 65,
    currency: 'coins',
    effects: { reputation: 1 },
  },
  {
    id: 'shop-community-sponsorship',
    name: 'Спонсорство сообщества',
    description: 'Репутация и видимость.',
    rarity: 'epic',
    category: 'luxury',
    price: 400,
    currency: 'cash',
    effects: { reputation: 3, coins: 5 },
  },
  {
    id: 'shop-referral-bonus',
    name: 'Реферальная программа',
    description: 'Нетворк возвращает дивиденды.',
    rarity: 'legendary',
    category: 'luxury',
    price: 600,
    currency: 'cash',
    effects: { coins: 25, reputation: 4 },
  },
  {
    id: 'shop-threat-modeling',
    name: 'Воркшоп по threat modeling',
    description: 'Проблемы предотвращаются заранее.',
    rarity: 'rare',
    category: 'security',
    price: 220,
    currency: 'coins',
    effects: { techDebt: -2, reputation: 2 },
  },
  {
    id: 'shop-security-scanner',
    name: 'Сканер безопасности',
    description: 'Постоянные проверки защиты.',
    rarity: 'epic',
    category: 'security',
    price: 420,
    currency: 'coins',
    effects: { techDebt: -3, reputation: 2 },
  },
] as const;

export type ShopItemId = string;
