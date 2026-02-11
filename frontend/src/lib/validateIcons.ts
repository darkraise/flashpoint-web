import { PLAYLIST_ICONS } from './playlistIcons';
import { logger } from '@/lib/logger';

function validateIconsNoDuplicates(): {
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

if (import.meta.env.DEV) {
  const result = validateIconsNoDuplicates();
  if (!result.isValid) {
    logger.warn(
      `⚠️  Icon validation failed: ${result.duplicates.length} duplicates, ${result.warnings.length} warnings`
    );
  } else {
    logger.info(`✅ Icon validation passed: ${result.totalIcons} unique icons`);
  }
}
