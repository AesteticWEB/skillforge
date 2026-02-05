export type AchievementCategory = 'shop' | 'company' | 'debt' | 'streak' | 'ending';

export type AchievementId =
  | 'shop_first_purchase'
  | 'shop_collect_5'
  | 'shop_collect_20'
  | 'company_first_hire'
  | 'company_hire_3'
  | 'company_hire_6'
  | 'debt_zero_once'
  | 'streak_3'
  | 'streak_10'
  | 'ending_any'
  | 'ending_ipo'
  | 'ending_acq'
  | 'ending_oss'
  | 'ending_scandal'
  | 'ending_bankrupt';

export type AchievementDefinition = {
  id: AchievementId;
  title: string;
  description: string;
  category: AchievementCategory;
};

export type UnlockedAchievement = {
  id: string;
  unlockedAt: string;
  meta?: Record<string, unknown>;
};

export type AchievementsState = {
  unlocked: Record<string, UnlockedAchievement>;
};

export const createEmptyAchievementsState = (): AchievementsState => ({
  unlocked: {},
});

export const ACHIEVEMENTS_CATALOG: AchievementDefinition[] = [
  {
    id: 'shop_first_purchase',
    title: 'Первая покупка',
    description: 'Купи любой предмет в магазине.',
    category: 'shop',
  },
  {
    id: 'shop_collect_5',
    title: 'Коллекция 5',
    description: 'Собери 5 предметов в магазине.',
    category: 'shop',
  },
  {
    id: 'shop_collect_20',
    title: 'Коллекция 20',
    description: 'Собери 20 предметов в магазине.',
    category: 'shop',
  },
  {
    id: 'company_first_hire',
    title: 'Первый найм',
    description: 'Найми первого сотрудника.',
    category: 'company',
  },
  {
    id: 'company_hire_3',
    title: 'Команда из 3',
    description: 'Найми 3 сотрудников.',
    category: 'company',
  },
  {
    id: 'company_hire_6',
    title: 'Команда из 6',
    description: 'Найми 6 сотрудников.',
    category: 'company',
  },
  {
    id: 'debt_zero_once',
    title: 'Чистый техдолг',
    description: 'Сведи техдолг к нулю хотя бы раз.',
    category: 'debt',
  },
  {
    id: 'streak_3',
    title: 'Серия 3 дня',
    description: 'Поддержи серию активности 3 дня подряд.',
    category: 'streak',
  },
  {
    id: 'streak_10',
    title: 'Серия 10 дней',
    description: 'Поддержи серию активности 10 дней подряд.',
    category: 'streak',
  },
  {
    id: 'ending_any',
    title: 'Любая концовка',
    description: 'Заверши историю и получи любую концовку.',
    category: 'ending',
  },
  {
    id: 'ending_ipo',
    title: 'IPO',
    description: 'Доведи компанию до IPO.',
    category: 'ending',
  },
  {
    id: 'ending_acq',
    title: 'Поглощение',
    description: 'Продай компанию стратегу.',
    category: 'ending',
  },
  {
    id: 'ending_oss',
    title: 'Open Source',
    description: 'Открой продукт миру.',
    category: 'ending',
  },
  {
    id: 'ending_scandal',
    title: 'Скандал',
    description: 'История закончилась скандалом.',
    category: 'ending',
  },
  {
    id: 'ending_bankrupt',
    title: 'Банкрот',
    description: 'Компания обанкротилась.',
    category: 'ending',
  },
];

export const ACHIEVEMENTS_BY_ID = new Map(
  ACHIEVEMENTS_CATALOG.map((achievement) => [achievement.id, achievement]),
);
