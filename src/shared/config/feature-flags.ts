export type FeatureFlagKey = 'simulatorV2';

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  simulatorV2: false,
};
