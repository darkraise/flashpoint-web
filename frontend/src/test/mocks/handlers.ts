import { http, HttpResponse } from 'msw';

// Note: apiClient uses '/api' as baseURL, so we don't need the full localhost:3100 URL

// Mock data
export const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  permissions: ['games.play', 'playlists.create', 'playlists.update'],
};

export const mockAdminUser = {
  id: 2,
  username: 'adminuser',
  email: 'admin@example.com',
  role: 'admin',
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
    const body = (await request.json()) as { username: string; password: string };

    if (body.username === 'testuser' && body.password === 'password123') {
      return HttpResponse.json({
        user: mockUser,
        tokens: {
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
      expiresIn: 3600,
    });
  }),

  http.get(`/api/auth/me`, () => {
    return HttpResponse.json(mockUser);
  }),

  // Games endpoints
  http.get(`/api/games`, () => {
    return HttpResponse.json({
      data: [mockGame],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  }),

  // Static routes MUST come before parameterized routes
  http.get(`/api/games/random`, () => {
    return HttpResponse.json(mockGame);
  }),

  http.get(`/api/games/:id`, ({ params }) => {
    return HttpResponse.json({ ...mockGame, id: params.id });
  }),

  http.get(`/api/games/:id/related`, () => {
    return HttpResponse.json([mockGame]);
  }),

  http.get(`/api/games/:id/launch`, ({ params }) => {
    return HttpResponse.json({
      gameId: params.id,
      title: 'Test Game',
      platform: 'Flash',
      launchCommand: 'test.swf',
      contentUrl: `/game-proxy/http://example.com/test.swf`,
      applicationPath: '',
      playMode: 'Single Player',
      canPlayInBrowser: true,
      downloading: false,
    });
  }),

  // Playlists endpoints
  http.get(`/api/user-playlists`, () => {
    return HttpResponse.json([mockPlaylist]);
  }),

  http.post(`/api/user-playlists`, async ({ request }) => {
    const body = (await request.json()) as {
      title: string;
      description?: string;
      icon?: string;
    };
    return HttpResponse.json({
      id: 1,
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
        homeRecentHours: 24,
      },
      metadata: {
        flashpointEdition: 'infinity',
        flashpointVersion: '',
      },
      domains: {
        defaultDomain: 'http://localhost:5173',
      },
    });
  }),

  // User settings endpoints
  http.get(`/api/users/me/settings`, () => {
    return HttpResponse.json({
      theme_mode: 'dark',
      primary_color: 'blue',
    });
  }),
];
