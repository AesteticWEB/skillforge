import { BALANCE } from '@/shared/config';
import type { Candidate } from '@/features/hiring';
import type { CandidateRole } from '@/features/hiring';
import type { Employee } from '../model/company.model';

const DEFAULT_HIRE_COST_BY_ROLE: Record<CandidateRole, number> = {
  junior: 1000,
  middle: 2500,
  senior: 6000,
};

const hashStringToInt = (seed: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const randomInt = (rng: () => number, min: number, max: number): number => {
  const safeMin = Math.ceil(min);
  const safeMax = Math.floor(max);
  if (safeMax <= safeMin) {
    return safeMin;
  }
  return Math.floor(rng() * (safeMax - safeMin + 1)) + safeMin;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const resolveHireCostCash = (role: CandidateRole): number => {
  const configured = BALANCE.company?.hiringBaseCostCashByRole;
  const base = configured?.[role] ?? DEFAULT_HIRE_COST_BY_ROLE[role];
  return Math.max(0, Math.floor(base));
};

export const resolveHireCostForCandidate = (candidate: Candidate): number =>
  resolveHireCostCash(candidate.role);

export const resolveMoraleFromSeed = (seed: string): number => {
  const min = BALANCE.company?.moraleStartMin ?? 80;
  const max = BALANCE.company?.moraleStartMax ?? 100;
  const rng = mulberry32(hashStringToInt(seed));
  return clamp(randomInt(rng, min, max), 0, 100);
};

export const createEmployeeFromCandidate = (candidate: Candidate, hiredAtIso: string): Employee => {
  const morale = resolveMoraleFromSeed(`${candidate.seed}:morale`);
  const salaryCash = resolveHireCostForCandidate(candidate);
  return {
    id: candidate.id,
    name: candidate.name,
    role: candidate.role,
    quality: Math.max(0, Math.min(100, Math.round(candidate.quality))),
    morale,
    traits: candidate.traits.map((trait) => ({
      ...trait,
      effects: { ...trait.effects },
    })),
    hiredAtIso,
    salaryCash,
  };
};
