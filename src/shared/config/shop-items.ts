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
  | 'security';

export type ShopItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

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
  effects: ShopItemEffect;
};

export const SHOP_ITEMS = [
  {
    id: 'shop-focus-timer',
    name: 'Focus Timer',
    description: 'Short cycles improve consistency.',
    rarity: 'common',
    category: 'productivity',
    price: 40,
    effects: { reputation: 1 },
  },
  {
    id: 'shop-timebox-cards',
    name: 'Timebox Cards',
    description: 'Clear limits keep tasks on track.',
    rarity: 'common',
    category: 'productivity',
    price: 55,
    effects: { xp: 2, reputation: 1 },
  },
  {
    id: 'shop-deep-work-kit',
    name: 'Deep Work Kit',
    description: 'Fewer distractions, better output.',
    rarity: 'uncommon',
    category: 'productivity',
    price: 120,
    effects: { reputation: 2, techDebt: -1 },
  },
  {
    id: 'shop-task-prioritizer',
    name: 'Task Prioritizer',
    description: 'Keeps the backlog tidy.',
    rarity: 'uncommon',
    category: 'productivity',
    price: 110,
    effects: { techDebt: -1, xp: 3 },
  },
  {
    id: 'shop-course-pass',
    name: 'Course Pass',
    description: 'Access to structured learning.',
    rarity: 'common',
    category: 'learning',
    price: 70,
    effects: { xp: 6 },
  },
  {
    id: 'shop-mentor-session',
    name: 'Mentor Session',
    description: 'Expert feedback with real impact.',
    rarity: 'rare',
    category: 'learning',
    price: 220,
    effects: { xp: 10, reputation: 2 },
  },
  {
    id: 'shop-practice-sandbox',
    name: 'Practice Sandbox',
    description: 'Safe place to experiment.',
    rarity: 'uncommon',
    category: 'learning',
    price: 130,
    effects: { xp: 7, techDebt: -1 },
  },
  {
    id: 'shop-code-review-checklist',
    name: 'Code Review Checklist',
    description: 'Catch mistakes before they ship.',
    rarity: 'common',
    category: 'quality',
    price: 50,
    effects: { techDebt: -2 },
  },
  {
    id: 'shop-testing-suite',
    name: 'Testing Suite',
    description: 'Confidence with every change.',
    rarity: 'rare',
    category: 'quality',
    price: 200,
    effects: { techDebt: -3, reputation: 1 },
  },
  {
    id: 'shop-static-analysis',
    name: 'Static Analysis',
    description: 'Prevent regressions early.',
    rarity: 'uncommon',
    category: 'quality',
    price: 140,
    effects: { techDebt: -2, reputation: 1 },
  },
  {
    id: 'shop-ergonomic-chair',
    name: 'Ergonomic Chair',
    description: 'Comfort helps consistency.',
    rarity: 'uncommon',
    category: 'health',
    price: 150,
    effects: { xp: 2, reputation: 1 },
  },
  {
    id: 'shop-standing-desk',
    name: 'Standing Desk',
    description: 'Energy stays high all day.',
    rarity: 'rare',
    category: 'health',
    price: 240,
    effects: { xp: 3, reputation: 2 },
  },
  {
    id: 'shop-sleep-tracker',
    name: 'Sleep Tracker',
    description: 'Recovery boosts focus.',
    rarity: 'common',
    category: 'health',
    price: 60,
    effects: { xp: 2, techDebt: -1 },
  },
  {
    id: 'shop-ci-pipeline',
    name: 'CI Pipeline',
    description: 'Automation for stable releases.',
    rarity: 'rare',
    category: 'automation',
    price: 260,
    effects: { techDebt: -2, xp: 4 },
  },
  {
    id: 'shop-release-bot',
    name: 'Release Bot',
    description: 'Faster and safer deployments.',
    rarity: 'epic',
    category: 'automation',
    price: 420,
    effects: { reputation: 3, techDebt: -2 },
  },
  {
    id: 'shop-auto-formatter',
    name: 'Auto Formatter',
    description: 'No more style debates.',
    rarity: 'common',
    category: 'automation',
    price: 45,
    effects: { techDebt: -1 },
  },
  {
    id: 'shop-conference-ticket',
    name: 'Conference Ticket',
    description: 'Fresh ideas and momentum.',
    rarity: 'rare',
    category: 'career',
    price: 280,
    effects: { reputation: 3, xp: 4 },
  },
  {
    id: 'shop-portfolio-boost',
    name: 'Portfolio Boost',
    description: 'Sharper story for your work.',
    rarity: 'uncommon',
    category: 'career',
    price: 160,
    effects: { reputation: 2 },
  },
  {
    id: 'shop-personal-branding',
    name: 'Personal Branding',
    description: 'Stand out in the market.',
    rarity: 'epic',
    category: 'career',
    price: 380,
    effects: { reputation: 4 },
  },
  {
    id: 'shop-pairing-session',
    name: 'Pairing Session',
    description: 'Better decisions together.',
    rarity: 'common',
    category: 'team',
    price: 75,
    effects: { reputation: 1, xp: 2 },
  },
  {
    id: 'shop-team-offsite',
    name: 'Team Offsite',
    description: 'Alignment and energy boost.',
    rarity: 'epic',
    category: 'team',
    price: 450,
    effects: { reputation: 3, techDebt: -1 },
  },
  {
    id: 'shop-onboarding-playbook',
    name: 'Onboarding Playbook',
    description: 'New hires ship faster.',
    rarity: 'uncommon',
    category: 'team',
    price: 130,
    effects: { techDebt: -1, xp: 3 },
  },
  {
    id: 'shop-monitoring-dashboard',
    name: 'Monitoring Dashboard',
    description: 'Visibility keeps incidents low.',
    rarity: 'rare',
    category: 'ops',
    price: 210,
    effects: { techDebt: -2, reputation: 1 },
  },
  {
    id: 'shop-incident-playbook',
    name: 'Incident Playbook',
    description: 'Clear steps under pressure.',
    rarity: 'uncommon',
    category: 'ops',
    price: 140,
    effects: { techDebt: -2 },
  },
  {
    id: 'shop-backup-automation',
    name: 'Backup Automation',
    description: 'Recovery without drama.',
    rarity: 'rare',
    category: 'ops',
    price: 230,
    effects: { techDebt: -2, reputation: 1 },
  },
  {
    id: 'shop-meetup-pass',
    name: 'Meetup Pass',
    description: 'New connections every week.',
    rarity: 'common',
    category: 'networking',
    price: 65,
    effects: { reputation: 1 },
  },
  {
    id: 'shop-community-sponsorship',
    name: 'Community Sponsorship',
    description: 'Goodwill and visibility.',
    rarity: 'epic',
    category: 'networking',
    price: 400,
    effects: { reputation: 3, coins: 5 },
  },
  {
    id: 'shop-referral-bonus',
    name: 'Referral Bonus',
    description: 'The network pays back.',
    rarity: 'legendary',
    category: 'networking',
    price: 600,
    effects: { coins: 25, reputation: 4 },
  },
  {
    id: 'shop-threat-modeling',
    name: 'Threat Modeling Workshop',
    description: 'Prevent issues before they happen.',
    rarity: 'rare',
    category: 'security',
    price: 220,
    effects: { techDebt: -2, reputation: 2 },
  },
  {
    id: 'shop-security-scanner',
    name: 'Security Scanner',
    description: 'Continuous protection checks.',
    rarity: 'epic',
    category: 'security',
    price: 420,
    effects: { techDebt: -3, reputation: 2 },
  },
] as const;

export type ShopItemId = (typeof SHOP_ITEMS)[number]['id'];