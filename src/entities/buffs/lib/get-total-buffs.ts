import { BALANCE, PROFESSION_PERKS, SPECIALIZATIONS } from '@/shared/config';
import type { ProfessionPerk, Specialization } from '@/shared/config';
import { BuffSource, TotalBuffs } from '../model/buffs.model';

const normalizeNumber = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }
  return value;
};

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const resolvePerkSources = (professionId?: string | null): BuffSource[] => {
  if (!professionId) {
    return [];
  }
  const perks = (PROFESSION_PERKS as Record<string, ProfessionPerk[]>)[professionId] ?? [];
  return perks.map((perk) => ({ id: perk.id, effects: perk.effects }));
};

const resolveSpecializationSource = (
  professionId?: string | null,
  specializationId?: string | null,
): BuffSource[] => {
  if (!professionId || !specializationId) {
    return [];
  }
  const specs = (SPECIALIZATIONS as Record<string, Specialization[]>)[professionId] ?? [];
  const match = specs.find((spec) => spec.id === specializationId);
  return match ? [{ id: match.id, effects: match.effects }] : [];
};

export const getTotalBuffs = (
  sources: BuffSource[] = [],
  professionId?: string | null,
  specializationId?: string | null,
): TotalBuffs => {
  let coinMultiplier = 0;
  let coinBonus = 0;
  let xpBonusPct = 0;
  let repBonusFlat = 0;
  let techDebtReduceFlat = 0;
  let cashIncomeBonusPct = 0;
  let incidentReducePct = 0;
  let candidateQualityBonusPct = 0;

  const allSources = [
    ...sources,
    ...resolvePerkSources(professionId),
    ...resolveSpecializationSource(professionId, specializationId),
  ];

  for (const source of allSources) {
    const effects = source?.effects;
    if (!effects) {
      continue;
    }
    coinMultiplier += normalizeNumber(effects.coinMultiplier);
    coinMultiplier += normalizeNumber(effects.coinMultiplierPercent) / 100;
    coinMultiplier += normalizeNumber(effects.coinsBonusPct);
    coinBonus += normalizeNumber(effects.coinBonus);
    xpBonusPct += normalizeNumber(effects.xpBonusPct);
    repBonusFlat += normalizeNumber(effects.repBonusFlat);
    techDebtReduceFlat += normalizeNumber(effects.techDebtReduceFlat);
    cashIncomeBonusPct += normalizeNumber(effects.cashIncomeBonusPct);
    incidentReducePct += normalizeNumber(effects.incidentReducePct);
    candidateQualityBonusPct += normalizeNumber(effects.candidateQualityBonusPct);
  }

  const caps = BALANCE.caps;
  const incidentCap =
    BALANCE.company?.tick?.incident?.reduceCapPct ?? caps.incidentReducePctMax ?? 0.8;

  return {
    coinMultiplier: clampNumber(coinMultiplier, 0, caps.coinsBonusPctMax),
    coinBonus,
    xpBonusPct: clampNumber(xpBonusPct, 0, caps.xpBonusPctMax),
    repBonusFlat,
    techDebtReduceFlat: clampNumber(
      techDebtReduceFlat,
      -caps.techDebtReduceFlatMaxAbs,
      caps.techDebtReduceFlatMaxAbs,
    ),
    cashIncomeBonusPct: clampNumber(cashIncomeBonusPct, 0, caps.cashIncomeBonusPctMax),
    incidentReducePct: clampNumber(incidentReducePct, 0, incidentCap),
    candidateQualityBonusPct,
  };
};
