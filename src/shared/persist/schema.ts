import type { Progress } from '@/entities/progress';
import type { User } from '@/entities/user';
import type { FeatureFlags } from '@/shared/config';

export const PERSIST_SCHEMA_VERSION = 3;
export const PERSIST_STORAGE_KEY = 'skillforge.state.v3';
export const PERSIST_BACKUP_KEY = 'skillforge.backup.v3';
export const PERSIST_LEGACY_KEYS = ['skillforge.state.v2', 'skillforge.state.v1'] as const;
export const PERSIST_LEGACY_BACKUP_KEYS = ['skillforge.backup.v2', 'skillforge.backup.v1'] as const;

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

export type PersistedStateLatest = {
  version: typeof PERSIST_SCHEMA_VERSION;
  user: Partial<User>;
  progress: Partial<Progress>;
  featureFlags?: Partial<FeatureFlags>;
  auth?: Partial<PersistedAuth>;
  xp?: number;
};

export type PersistedState = PersistedStateV1 | PersistedStateV2 | PersistedStateLatest;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeProgress = (progress: Partial<Progress> | undefined): Partial<Progress> => {
  const base = progress ?? {};
  const coins =
    typeof base.coins === 'number' && Number.isFinite(base.coins)
      ? Math.max(0, Math.floor(base.coins))
      : 0;

  return {
    ...base,
    coins,
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
    };
  }

  if (version === 2 || version === 1 || version === undefined) {
    return {
      version: PERSIST_SCHEMA_VERSION,
      user: (raw['user'] as PersistedStateV1['user']) ?? {},
      progress: normalizeProgress(raw['progress'] as PersistedStateV1['progress']),
      featureFlags: raw['featureFlags'] as PersistedStateV1['featureFlags'],
      auth: raw['auth'] as PersistedStateV1['auth'],
      xp: raw['xp'] as PersistedStateV1['xp'],
    };
  }

  return null;
};
