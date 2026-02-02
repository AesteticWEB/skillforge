export type FeatureFlagKey = 'simulatorV2' | 'demoMode';

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  simulatorV2: false,
  demoMode: false,
};
