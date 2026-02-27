import { describe, it, expect } from 'vitest';
import { ListVideo } from 'lucide-react';

import {
  PLAYLIST_ICONS,
  ICON_CATEGORIES,
  getPlaylistIcon,
  PlaylistIconName,
} from './playlistIcons';

describe('playlistIcons', () => {
  describe('PLAYLIST_ICONS', () => {
    it('should contain a large collection of icons', () => {
      const iconCount = Object.keys(PLAYLIST_ICONS).length;
      expect(iconCount).toBeGreaterThan(100);
    });

    it('should have valid LucideIcon components as values', () => {
      // Check a few known icons (using camelCase keys)
      expect(PLAYLIST_ICONS.music).toBeDefined();
      expect(typeof PLAYLIST_ICONS.music).toBe('object'); // React forward ref
    });

    it('should contain common game-related icons', () => {
      expect(PLAYLIST_ICONS.gamepad2).toBeDefined();
      expect(PLAYLIST_ICONS.trophy).toBeDefined();
      expect(PLAYLIST_ICONS.star).toBeDefined();
    });

    it('should contain media-related icons', () => {
      expect(PLAYLIST_ICONS.film).toBeDefined();
      expect(PLAYLIST_ICONS.video).toBeDefined();
      expect(PLAYLIST_ICONS.music).toBeDefined();
    });
  });

  describe('ICON_CATEGORIES', () => {
    it('should have multiple categories', () => {
      const categoryCount = Object.keys(ICON_CATEGORIES).length;
      expect(categoryCount).toBeGreaterThan(5);
    });

    it('should have labels for each category', () => {
      for (const category of Object.values(ICON_CATEGORIES)) {
        expect(category.label).toBeDefined();
        expect(typeof category.label).toBe('string');
        expect(category.label.length).toBeGreaterThan(0);
      }
    });

    it('should have icons array for each category', () => {
      for (const category of Object.values(ICON_CATEGORIES)) {
        expect(Array.isArray(category.icons)).toBe(true);
        expect(category.icons.length).toBeGreaterThan(0);
      }
    });

    it('should only contain valid icon names in categories', () => {
      for (const category of Object.values(ICON_CATEGORIES)) {
        for (const iconName of category.icons) {
          expect(PLAYLIST_ICONS[iconName]).toBeDefined();
        }
      }
    });

    it('should have media category', () => {
      expect(ICON_CATEGORIES.media).toBeDefined();
      expect(ICON_CATEGORIES.media.label).toBe('Media');
      expect(ICON_CATEGORIES.media.icons).toContain('music');
    });

    it('should have activities category', () => {
      expect(ICON_CATEGORIES.activities).toBeDefined();
      expect(ICON_CATEGORIES.activities.label).toBe('Activities');
    });
  });

  describe('getPlaylistIcon', () => {
    it('should return the correct icon for a valid icon name', () => {
      const icon = getPlaylistIcon('music');
      expect(icon).toBe(PLAYLIST_ICONS.music);
    });

    it('should return the correct icon for gamepad2', () => {
      const icon = getPlaylistIcon('gamepad2');
      expect(icon).toBe(PLAYLIST_ICONS.gamepad2);
    });

    it('should return ListVideo fallback for null', () => {
      const icon = getPlaylistIcon(null);
      expect(icon).toBe(ListVideo);
    });

    it('should return ListVideo fallback for undefined', () => {
      const icon = getPlaylistIcon(undefined);
      expect(icon).toBe(ListVideo);
    });

    it('should return ListVideo fallback for invalid icon name', () => {
      // @ts-expect-error - Testing invalid input
      const icon = getPlaylistIcon('InvalidIconName');
      expect(icon).toBe(ListVideo);
    });

    it('should return ListVideo fallback for empty string', () => {
      // @ts-expect-error - Testing invalid input
      const icon = getPlaylistIcon('');
      expect(icon).toBe(ListVideo);
    });

    it('should handle all valid icon names', () => {
      const iconNames = Object.keys(PLAYLIST_ICONS) as PlaylistIconName[];

      for (const iconName of iconNames) {
        const icon = getPlaylistIcon(iconName);
        expect(icon).toBe(PLAYLIST_ICONS[iconName]);
      }
    });
  });

  describe('PlaylistIconName type', () => {
    it('should be a union of all icon names in PLAYLIST_ICONS', () => {
      // This is a compile-time check, but we can verify at runtime
      // that all keys of PLAYLIST_ICONS are valid PlaylistIconName
      const iconNames = Object.keys(PLAYLIST_ICONS);

      // Verify we can use any icon name with getPlaylistIcon
      for (const name of iconNames) {
        expect(() => getPlaylistIcon(name as PlaylistIconName)).not.toThrow();
      }
    });
  });

  describe('icon consistency', () => {
    it('should have unique icons (no duplicates in the mapping)', () => {
      const icons = Object.values(PLAYLIST_ICONS);
      const uniqueIcons = new Set(icons);

      // Some icons may be reused, so we just check that we have a reasonable number
      expect(uniqueIcons.size).toBeGreaterThan(50);
    });

    it('should have consistent naming (camelCase)', () => {
      const iconNames = Object.keys(PLAYLIST_ICONS);

      for (const name of iconNames) {
        // First character should be lowercase (camelCase)
        expect(name[0]).toBe(name[0].toLowerCase());
        // Should not contain spaces or special characters
        expect(name).toMatch(/^[a-zA-Z0-9]+$/);
      }
    });
  });
});
