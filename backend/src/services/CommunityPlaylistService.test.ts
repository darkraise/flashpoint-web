import { describe, it, expect } from 'vitest';

import { ALLOWED_DOWNLOAD_DOMAINS, CommunityPlaylistService } from './CommunityPlaylistService';

const service = new CommunityPlaylistService();

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_DOWNLOAD_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
}

describe('CommunityPlaylistService.getCommunityPlaylists', () => {
  it('exposes the wiki sections as categories, each holding playlists', () => {
    const { categories } = service.getCommunityPlaylists();

    expect(categories.map((category) => category.name)).toEqual(
      expect.arrayContaining(['Animations', 'Games - Community favorites', 'NSFW'])
    );
    expect(categories.every((category) => category.playlists.length > 0)).toBe(true);
  });

  it('resolves wiki-relative download links to absolute URLs', () => {
    const playlists = service.getCommunityPlaylists().categories.flatMap((c) => c.playlists);

    const animalSchool = playlists.find((playlist) => playlist.name === 'Animal School');

    expect(animalSchool?.author).toBe('Ekul');
    expect(animalSchool?.downloadUrl).toBe(
      'https://flashpointarchive.org/w/images/b/bf/Animal_school_playlist.json'
    );
  });

  it('only offers playlists the download endpoint will accept', () => {
    const playlists = service.getCommunityPlaylists().categories.flatMap((c) => c.playlists);

    expect(playlists.length).toBeGreaterThan(100);
    for (const playlist of playlists) {
      const url = new URL(playlist.downloadUrl);
      expect(url.protocol).toBe('https:');
      expect(isAllowedHost(url.hostname)).toBe(true);
    }
  });

  it('omits the legacy default playlists, which no longer import', () => {
    const { categories } = service.getCommunityPlaylists();

    expect(categories.map((category) => category.name)).not.toContain('Old Default Playlists');
  });

  it('reports the date the wiki snapshot was captured', () => {
    expect(service.getCommunityPlaylists().lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
