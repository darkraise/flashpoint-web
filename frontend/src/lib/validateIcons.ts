import { PLAYLIST_ICONS, type PlaylistIconName } from './playlistIcons';

export function validateIconsNoDuplicates(): {
  isValid: boolean;
  totalIcons: number;
  duplicates: Array<{ iconKeys: string[]; componentName: string }>;
  warnings: string[];
} {
  const componentMap = new Map<string, string[]>();
  const warnings: string[] = [];

  for (const [iconKey, IconComponent] of Object.entries(PLAYLIST_ICONS)) {
    const componentName = IconComponent.displayName || IconComponent.name || 'Unknown';

    if (!componentMap.has(componentName)) {
      componentMap.set(componentName, []);
    }
    componentMap.get(componentName)!.push(iconKey);
  }

  const duplicates: Array<{ iconKeys: string[]; componentName: string }> = [];
  for (const [componentName, iconKeys] of componentMap.entries()) {
    if (iconKeys.length > 1) {
      duplicates.push({ componentName, iconKeys });
    }
  }

  const totalIcons = Object.keys(PLAYLIST_ICONS).length;
  const expectedIconCount = 600;

  if (totalIcons !== expectedIconCount) {
    warnings.push(`Icon count mismatch: Expected ${expectedIconCount}, got ${totalIcons}`);
  }

  for (const [iconKey, IconComponent] of Object.entries(PLAYLIST_ICONS)) {
    if (!IconComponent) {
      warnings.push(`Invalid icon: ${iconKey} is null or undefined`);
    }
  }

  const isValid = duplicates.length === 0 && warnings.length === 0;

  return {
    isValid,
    totalIcons,
    duplicates,
    warnings,
  };
}

export function logIconValidation(): void {
  if (!import.meta.env.DEV) {
    return;
  }

  const result = validateIconsNoDuplicates();

  console.group('🔍 Icon Validation Results');
  console.log(`Total Icons: ${result.totalIcons}`);
  console.log(`Valid: ${result.isValid ? '✅' : '❌'}`);

  if (result.warnings.length > 0) {
    console.group('⚠️  Warnings');
    result.warnings.forEach((warning) => console.warn(warning));
    console.groupEnd();
  }

  if (result.duplicates.length > 0) {
    console.group('🔴 Duplicate Icons Found');
    result.duplicates.forEach(({ componentName, iconKeys }) => {
      console.log(`\n${componentName}:`);
      iconKeys.forEach((key) => console.log(`  - ${key}`));
    });
    console.groupEnd();
  } else {
    console.log('✅ No duplicates found');
  }

  console.groupEnd();
}

export function isValidIconName(iconName: string): iconName is PlaylistIconName {
  return iconName in PLAYLIST_ICONS;
}

if (import.meta.env.DEV) {
  const result = validateIconsNoDuplicates();
  if (!result.isValid) {
    console.warn(
      `⚠️  Icon validation failed: ${result.duplicates.length} duplicates, ${result.warnings.length} warnings`
    );
    console.warn('Run logIconValidation() for details');
  } else {
    console.log(`✅ Icon validation passed: ${result.totalIcons} unique icons`);
  }
}
