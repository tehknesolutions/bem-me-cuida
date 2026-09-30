import { Platform } from 'react-native';

import appJson from '../../app.json';

export type AppMetadata = {
  version: string;
  releaseLabel: string;
  variant: string;
  platform: string;
};

function normalizedPublicValue(value: string | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

export function getAppMetadata(): AppMetadata {
  const version = normalizedPublicValue(process.env.EXPO_PUBLIC_APP_VERSION, appJson.expo.version);
  const variant = normalizedPublicValue(process.env.EXPO_PUBLIC_APP_ENV, 'development');
  const candidate = process.env.EXPO_PUBLIC_RELEASE_CANDIDATE?.trim();
  const productionRelease = process.env.EXPO_PUBLIC_PRODUCTION_RELEASE?.trim();
  const releaseLabel = candidate
    ? `${version}-rc.${candidate}`
    : productionRelease
      ? `${version}-production.${productionRelease}`
      : version;

  return {
    version,
    releaseLabel,
    variant,
    platform: `${Platform.OS}-${String(Platform.Version)}`,
  };
}
