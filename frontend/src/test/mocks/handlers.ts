import { http, HttpResponse } from 'msw';

// Note: apiClient uses '/api' as baseURL, so we don't need the full localhost:3100 URL

// Mock data
export const mockUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  roleName: 'user',
  permissions: ['games.play', 'playlists.create', 'playlists.update'],
};

export const mockAdminUser = {
  id: 'admin-1',
  username: 'adminuser',
  email: 'admin@example.com',
  roleName: 'admin',
  permissions: ['games.play', 'users.manage', 'settings.update', 'playlists.create'],
};

export const mockGame = {
  id: 'game-1',
  title: 'Test Game',
  developer: 'Test Developer',
  publisher: 'Test Publisher',
  platformName: 'Flash',
  library: 'arcade',
  releaseDate: '2020-01-01',
  tagsStr: 'action;adventure',
  presentOnDisk: 1,
};

export const mockPlaylist = {
  id: 'playlist-1',
  title: 'Test Playlist',
  description: 'A test playlist',
  icon: 'star',
  gameCount: 5,
  isPublic: false,
  shareToken: null,
};

// API handlers
export const handlers = [
  // Auth endpoints
  http.post(`/api/auth/login`, async ({ request }) => {
    const body = (await request.json()) as any;

    if (body.username === 'testuser' && body.password === 'password123') {
      return HttpResponse.json({
        user: mockUser,
        tokens: {
          accessToken: 'mock-access-token',
          expiresIn: 3600,
        },
      });
    }

    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),

  http.post(`/api/auth/logout`, () => {
    return HttpResponse.json({});
  }),

  http.post(`/api/auth/refresh`, () => {
    return HttpResponse.json({
      accessToken: 'new-mock-access-token',
      expiresIn: 3600,
    });
  }),

  http.get(`/api/auth/me`, () => {
    return HttpResponse.json(mockUser);
  }),

  // Games endpoints
  http.get(`/api/games`, () => {
    return HttpResponse.json({
      games: [mockGame],
      total: 1,
      page: 1,
      limit: 20,
    });
  }),

  http.get(`/api/games/:id`, ({ params }) => {
    return HttpResponse.json({ ...mockGame, id: params.id });
  }),

  http.get(`/api/games/:id/related`, () => {
    return HttpResponse.json([mockGame]);
  }),

  http.get(`/api/games/random`, () => {
    return HttpResponse.json(mockGame);
  }),

  http.get(`/api/games/:id/launch`, ({ params }) => {
    return HttpResponse.json({
      gameId: params.id,
      title: 'Test Game',
      platform: 'Flash',
      launchCommand: 'test.swf',
      contentUrl: `/game-proxy/http://example.com/test.swf`,
      canPlayInBrowser: true,
      downloading: false,
    });
  }),

  // Playlists endpoints
  http.get(`/api/user-playlists`, () => {
    return HttpResponse.json([mockPlaylist]);
  }),

  http.post(`/api/user-playlists`, async ({ request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json({
      id: 'new-playlist-id',
      title: body.title,
      description: body.description,
      icon: body.icon,
      gameCount: 0,
      isPublic: false,
      shareToken: null,
    });
  }),

  http.delete(`/api/user-playlists/:id`, () => {
    return HttpResponse.json({});
  }),

  // Settings endpoints
  http.get(`/api/settings/public`, () => {
    return HttpResponse.json({
      app: {
        maintenance_mode: false,
        allow_registration: true,
      },
    });
  }),

  // User settings endpoints
  http.get(`/api/users/me/settings`, () => {
    return HttpResponse.json({
      theme: 'dark',
      preferences: {},
    });
  }),
];
