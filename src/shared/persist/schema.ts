import type { Progress } from '@/entities/progress';
import type { User } from '@/entities/user';
import type { FeatureFlags } from '@/shared/config';

export const PERSIST_SCHEMA_VERSION = 2;
export const PERSIST_STORAGE_KEY = 'skillforge.state.v2';
export const PERSIST_LEGACY_KEYS = ['skillforge.state.v1'] as const;

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

export type PersistedStateLatest = {
  version: typeof PERSIST_SCHEMA_VERSION;
  user: Partial<User>;
  progress: Partial<Progress>;
  featureFlags?: Partial<FeatureFlags>;
  auth?: Partial<PersistedAuth>;
  xp?: number;
};

export type PersistedState = PersistedStateV1 | PersistedStateLatest;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const migratePersistedState = (raw: unknown): PersistedStateLatest | null => {
  if (!isRecord(raw)) {
    return null;
  }

  const version = raw['version'];
  if (version === PERSIST_SCHEMA_VERSION) {
    return raw as PersistedStateLatest;
  }

  if (version === 1 || version === undefined) {
    return {
      version: PERSIST_SCHEMA_VERSION,
      user: (raw['user'] as PersistedStateV1['user']) ?? {},
      progress: (raw['progress'] as PersistedStateV1['progress']) ?? {},
      featureFlags: raw['featureFlags'] as PersistedStateV1['featureFlags'],
      auth: raw['auth'] as PersistedStateV1['auth'],
      xp: raw['xp'] as PersistedStateV1['xp'],
    };
  }

  return null;
};
