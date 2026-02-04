import type { Company, CompanyLevel } from '@/entities/company';
import { COMPANY_LEVELS } from '@/entities/company';
import type { Inventory } from '@/entities/inventory';
import { normalizeOwnedItemIds } from '@/entities/inventory';
import type { Progress } from '@/entities/progress';
import type { User } from '@/entities/user';
import type { FeatureFlags } from '@/shared/config';

export const PERSIST_SCHEMA_VERSION = 5;
export const PERSIST_STORAGE_KEY = 'skillforge.state.v5';
export const PERSIST_BACKUP_KEY = 'skillforge.backup.v5';
export const PERSIST_LEGACY_KEYS = [
  'skillforge.state.v4',
  'skillforge.state.v3',
  'skillforge.state.v2',
  'skillforge.state.v1',
] as const;
export const PERSIST_LEGACY_BACKUP_KEYS = [
  'skillforge.backup.v4',
  'skillforge.backup.v3',
  'skillforge.backup.v2',
  'skillforge.backup.v1',
] as const;

export type PersistedAuth = {
  login: string;
  profession: string;
  isRegistered: boolean;
};

export type PersistedStateV1 = {
  version: 1;
  user: Partial<User>;
  progress: Partial<Progress>;
  featureFlags?: Partial<FeatureFlags>;
  auth?: Partial<PersistedAuth>;
  xp?: number;
};

export type PersistedStateV2 = {
  version: 2;
  user: Partial<User>;
  progress: Partial<Progress>;
  featureFlags?: Partial<FeatureFlags>;
  auth?: Partial<PersistedAuth>;
  xp?: number;
};

export type PersistedStateV3 = {
  version: 3;
  user: Partial<User>;
  progress: Partial<Progress>;
  featureFlags?: Partial<FeatureFlags>;
  auth?: Partial<PersistedAuth>;
  xp?: number;
};

export type PersistedStateV4 = {
  version: 4;
  user: Partial<User>;
  progress: Partial<Progress>;
  company: Partial<Company>;
  featureFlags?: Partial<FeatureFlags>;
  auth?: Partial<PersistedAuth>;
  xp?: number;
};

export type PersistedStateLatest = {
  version: typeof PERSIST_SCHEMA_VERSION;
  user: Partial<User>;
  progress: Partial<Progress>;
  company: Partial<Company>;
  inventory: Partial<Inventory>;
  featureFlags?: Partial<FeatureFlags>;
  auth?: Partial<PersistedAuth>;
  xp?: number;
};

export type PersistedState =
  | PersistedStateV1
  | PersistedStateV2
  | PersistedStateV3
  | PersistedStateV4
  | PersistedStateLatest;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeProgress = (progress: Partial<Progress> | undefined): Partial<Progress> => {
  const base = progress ?? {};
  const coins =
    typeof base.coins === 'number' && Number.isFinite(base.coins)
      ? Math.max(0, Math.floor(base.coins))
      : 0;
  const activeContracts = Array.isArray(base.activeContracts) ? base.activeContracts : [];

  return {
    ...base,
    coins,
    activeContracts,
  };
};

const normalizeCompany = (company: Partial<Company> | undefined): Partial<Company> => {
  const base = company ?? {};
  const cash =
    typeof base.cash === 'number' && Number.isFinite(base.cash)
      ? Math.max(0, Math.floor(base.cash))
      : 0;
  const level =
    typeof base.level === 'string' && (COMPANY_LEVELS as readonly string[]).includes(base.level)
      ? (base.level as CompanyLevel)
      : 'none';
  const unlocked = typeof base.unlocked === 'boolean' ? base.unlocked : false;

  return {
    ...base,
    cash,
    level,
    unlocked,
  };
};

const normalizeInventory = (inventory: Partial<Inventory> | undefined): Partial<Inventory> => {
  const base = inventory ?? {};
  return {
    ...base,
    ownedItemIds: normalizeOwnedItemIds(base.ownedItemIds),
  };
};

export const migratePersistedState = (raw: unknown): PersistedStateLatest | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const version = raw['version'];
  if (version === PERSIST_SCHEMA_VERSION) {
    const current = raw as PersistedStateLatest;
    return {
      ...current,
      progress: normalizeProgress(current.progress),
      company: normalizeCompany(current.company),
      inventory: normalizeInventory(current.inventory),
    };
  }

  if (version === 4) {
    return {
      version: PERSIST_SCHEMA_VERSION,
      user: (raw['user'] as PersistedStateV4['user']) ?? {},
      progress: normalizeProgress(raw['progress'] as PersistedStateV4['progress']),
      company: normalizeCompany(raw['company'] as PersistedStateV4['company']),
      inventory: normalizeInventory(raw['inventory'] as PersistedStateLatest['inventory']),
      featureFlags: raw['featureFlags'] as PersistedStateV4['featureFlags'],
      auth: raw['auth'] as PersistedStateV4['auth'],
      xp: raw['xp'] as PersistedStateV4['xp'],
    };
  }

  if (version === 3) {
    return {
      version: PERSIST_SCHEMA_VERSION,
      user: (raw['user'] as PersistedStateV3['user']) ?? {},
      progress: normalizeProgress(raw['progress'] as PersistedStateV3['progress']),
      company: normalizeCompany(raw['company'] as PersistedStateLatest['company']),
      inventory: normalizeInventory(raw['inventory'] as PersistedStateLatest['inventory']),
      featureFlags: raw['featureFlags'] as PersistedStateV3['featureFlags'],
      auth: raw['auth'] as PersistedStateV3['auth'],
      xp: raw['xp'] as PersistedStateV3['xp'],
    };
  }

  if (version === 2 || version === 1 || version === undefined) {
    return {
      version: PERSIST_SCHEMA_VERSION,
      user: (raw['user'] as PersistedStateV1['user']) ?? {},
      progress: normalizeProgress(raw['progress'] as PersistedStateV1['progress']),
      company: normalizeCompany(raw['company'] as PersistedStateLatest['company']),
      inventory: normalizeInventory(raw['inventory'] as PersistedStateLatest['inventory']),
      featureFlags: raw['featureFlags'] as PersistedStateV1['featureFlags'],
      auth: raw['auth'] as PersistedStateV1['auth'],
      xp: raw['xp'] as PersistedStateV1['xp'],
    };
  }

  return null;
};
