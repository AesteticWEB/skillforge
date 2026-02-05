import type { BadgeId, EarnedBadge } from '../model/badge.model';
import { BADGES_CATALOG } from '../config/badges';

const BADGE_MAP = new Map(BADGES_CATALOG.map((badge) => [badge.id, badge]));

export const normalizeBadgeId = (id: string | null | undefined): string => {
  if (typeof id !== 'string') {
    return '';
  }
  return id.trim();
};

export const getBadgeById = (badgeId: string | null | undefined) => {
  const normalized = normalizeBadgeId(badgeId);
  if (!normalized) {
    return undefined;
  }
  return BADGE_MAP.get(normalized);
};

export const hasBadge = (earned: EarnedBadge[], badgeId: BadgeId): boolean => {
  return earned.some((entry) => entry.id === badgeId);
};

export const grantBadgeOnce = (
  earned: EarnedBadge[],
  badgeId: BadgeId,
  source: EarnedBadge['source'],
  nowIso: string,
): EarnedBadge[] => {
  if (!badgeId || hasBadge(earned, badgeId)) {
    return earned;
  }
  const next = [{ id: badgeId, earnedAtIso: nowIso, source }, ...earned];
  return next.slice(0, 200);
};
