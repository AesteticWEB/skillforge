export type BadgeId = string;

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type Badge = {
  id: BadgeId;
  title: string;
  description: string;
  rarity: BadgeRarity;
  icon?: string;
  tags: string[];
};

export type EarnedBadge = {
  id: BadgeId;
  earnedAtIso: string;
  source: 'quest' | 'ending' | 'streak' | 'admin';
};

export type CosmeticsState = {
  earnedBadges: EarnedBadge[];
};
