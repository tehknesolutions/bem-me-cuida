import type { ConfigContext, ExpoConfig } from 'expo/config';

type AppVariant = 'development' | 'preview' | 'beta' | 'rc' | 'rc011' | 'production';

type VariantConfig = { name: string; scheme: string; androidPackage: string; iosBundleIdentifier: string };

const variants: Record<AppVariant, VariantConfig> = {
  development: { name: 'BemMeCuida Dev', scheme: 'bemmecuida-dev', androidPackage: 'com.tehknesolutions.bemmecuida.dev', iosBundleIdentifier: 'com.tehknesolutions.bemmecuida.dev' },
  preview: { name: 'BemMeCuida Preview', scheme: 'bemmecuida-preview', androidPackage: 'com.tehknesolutions.bemmecuida.preview', iosBundleIdentifier: 'com.tehknesolutions.bemmecuida.preview' },
  beta: { name: 'BemMeCuida Beta', scheme: 'bemmecuida-beta', androidPackage: 'com.tehknesolutions.bemmecuida.beta', iosBundleIdentifier: 'com.tehknesolutions.bemmecuida.beta' },
  rc: { name: 'BemMeCuida RC', scheme: 'bemmecuida-rc', androidPackage: 'com.tehknesolutions.bemmecuida.rc', iosBundleIdentifier: 'com.tehknesolutions.bemmecuida.rc' },
  rc011: { name: 'BemMeCuida 0.11 RC', scheme: 'bemmecuida-rc011', androidPackage: 'com.tehknesolutions.bemmecuida.rc011', iosBundleIdentifier: 'com.tehknesolutions.bemmecuida.rc011' },
  production: { name: 'BemMeCuida', scheme: 'bemmecuida', androidPackage: 'com.tehknesolutions.bemmecuida', iosBundleIdentifier: 'com.tehknesolutions.bemmecuida' },
};

function resolveVariant(): AppVariant {
  const value = process.env.APP_VARIANT;
  return value === 'development' || value === 'preview' || value === 'beta' || value === 'rc' || value === 'rc011' || value === 'production' ? value : 'development';
}

function positiveInteger(value: string | undefined): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant();
  const selected = variants[variant];
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
  const appVersion = process.env.EXPO_PUBLIC_APP_VERSION?.trim() || config.version || '0.10.0';
  const androidVersionCode = positiveInteger(process.env.EXPO_PUBLIC_ANDROID_VERSION_CODE);
  const iosBuildNumber = process.env.EXPO_PUBLIC_IOS_BUILD_NUMBER?.trim();
  const updates = projectId ? { ...config.updates, url: `https://u.expo.dev/${projectId}`, checkAutomatically: 'ON_LOAD' as const, fallbackToCacheTimeout: 0 } : config.updates;

  return {
    ...config,
    name: selected.name,
    slug: 'bem-me-cuida',
    scheme: selected.scheme,
    version: appVersion,
    runtimeVersion: { policy: 'appVersion' },
    ...(updates ? { updates } : {}),
    extra: { ...config.extra, appVariant: variant, appVersion, releaseCandidate: process.env.EXPO_PUBLIC_RELEASE_CANDIDATE?.trim() || null, productionRelease: process.env.EXPO_PUBLIC_PRODUCTION_RELEASE?.trim() || null, eas: projectId ? { projectId } : config.extra?.eas },
    ios: { ...config.ios, bundleIdentifier: selected.iosBundleIdentifier, ...(iosBuildNumber ? { buildNumber: iosBuildNumber } : {}) },
    android: { ...config.android, package: selected.androidPackage, ...(androidVersionCode ? { versionCode: androidVersionCode } : {}) },
  };
};