import { PLAYLIST_ICONS, type PlaylistIconName } from './playlistIcons';

/**
 * Validates that there are no duplicate icon components in PLAYLIST_ICONS
 * This is a development-only utility to ensure icon uniqueness
 *
 * Checks:
 * 1. No two icon keys point to the same Lucide component
 * 2. All icons are valid Lucide components
 * 3. Icon count matches expected (600 icons)
 *
 * @returns Object with validation results
 *
 * @example
 * // In development console
 * import { validateIconsNoDuplicates } from '@/lib/validateIcons';
 * validateIconsNoDuplicates();
 */
export function validateIconsNoDuplicates(): {
  isValid: boolean;
  totalIcons: number;
  duplicates: Array<{ iconKeys: string[]; componentName: string }>;
  warnings: string[];
} {
  const componentMap = new Map<string, string[]>();
  const warnings: string[] = [];

  // Build a map of component names to icon keys that use them
  for (const [iconKey, IconComponent] of Object.entries(PLAYLIST_ICONS)) {
    // Get the component's display name or name
    const componentName = IconComponent.displayName || IconComponent.name || 'Unknown';

    if (!componentMap.has(componentName)) {
      componentMap.set(componentName, []);
    }
    componentMap.get(componentName)!.push(iconKey);
  }

  // Find duplicates (multiple keys using the same component)
  const duplicates: Array<{ iconKeys: string[]; componentName: string }> = [];
  for (const [componentName, iconKeys] of componentMap.entries()) {
    if (iconKeys.length > 1) {
      duplicates.push({ componentName, iconKeys });
    }
  }

  // Check icon count
  const totalIcons = Object.keys(PLAYLIST_ICONS).length;
  const expectedIconCount = 600;

  if (totalIcons !== expectedIconCount) {
    warnings.push(`Icon count mismatch: Expected ${expectedIconCount}, got ${totalIcons}`);
  }

  // Check for invalid icons (components that are null or undefined)
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

/**
 * Logs validation results to console with formatting
 * Use this during development to check icon integrity
 * DEV-only function - only logs in development mode
 *
 * @example
 * import { logIconValidation } from '@/lib/validateIcons';
 * logIconValidation();
 */
export function logIconValidation(): void {
  if (!import.meta.env.DEV) {
    return; // Only log in development mode
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

/**
 * Checks if an icon name is valid
 * @param iconName - Icon name to check
 * @returns True if icon exists in PLAYLIST_ICONS
 */
export function isValidIconName(iconName: string): iconName is PlaylistIconName {
  return iconName in PLAYLIST_ICONS;
}

/**
 * Development-only: Validate icons on module load (DEV only)
 * This will log warnings to console if duplicates are detected
 */
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
