# Request & Response Examples

Complete workflow examples demonstrating common API usage patterns with curl, JavaScript (axios), and Python.

## Table of Contents

- [User Registration & Login Flow](#user-registration--login-flow)
- [Game Search & Browse Workflow](#game-search--browse-workflow)
- [Game Launch Workflow](#game-launch-workflow)
- [Play Session Tracking](#play-session-tracking)
- [Playlist Management](#playlist-management)
- [User Settings Management](#user-settings-management)
- [Admin User Management](#admin-user-management)
- [Role-Based Access Control](#role-based-access-control)

---

## User Registration & Login Flow

### Complete Authentication Workflow

**Step 1: Register New User**

```bash
# curl
curl -X POST http://localhost:3100/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

```javascript
// JavaScript (axios)
const registerUser = async () => {
  try {
    const { data } = await axios.post('http://localhost:3100/api/auth/register', {
      username: 'john_doe',
      email: 'john@example.com',
      password: 'securepassword123'
    });

    // Store tokens
    localStorage.setItem('accessToken', data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.tokens.refreshToken);

    // Store user info
    localStorage.setItem('user', JSON.stringify(data.user));

    console.log('Registered successfully:', data.user);
    return data;
  } catch (error) {
    if (error.response?.status === 409) {
      console.error('Username or email already exists');
    } else if (error.response?.status === 403) {
      console.error('Registration is currently disabled');
    }
    throw error;
  }
};
```

```python
# Python (requests)
import requests
import json

def register_user():
    url = 'http://localhost:3100/api/auth/register'
    payload = {
        'username': 'john_doe',
        'email': 'john@example.com',
        'password': 'securepassword123'
    }

    response = requests.post(url, json=payload)

    if response.status_code == 201:
        data = response.json()
        # Store tokens
        tokens = data['tokens']
        user = data['user']
        print(f"Registered successfully: {user['username']}")
        return tokens, user
    elif response.status_code == 409:
        print("Username or email already exists")
    else:
        print(f"Registration failed: {response.text}")

    return None, None
```

**Step 2: Login with Credentials**

```bash
# curl
curl -X POST http://localhost:3100/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "securepassword123"
  }'
```

```javascript
// JavaScript (axios)
const loginUser = async (username, password) => {
  try {
    const { data } = await axios.post('http://localhost:3100/api/auth/login', {
      username,
      password
    });

    // Store tokens
    localStorage.setItem('accessToken', data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Setup axios interceptor for authenticated requests
    axios.interceptors.request.use(config => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    return data.user;
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('Invalid credentials');
    }
    throw error;
  }
};
```

**Step 3: Token Refresh**

```javascript
// Automatic token refresh with axios interceptor
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post('http://localhost:3100/api/auth/refresh', {
          refreshToken
        });

        // Update stored tokens
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

**Step 4: Logout**

```javascript
const logoutUser = async () => {
  const refreshToken = localStorage.getItem('refreshToken');

  try {
    await axios.post('http://localhost:3100/api/auth/logout', {
      refreshToken
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear local storage regardless
    localStorage.clear();
    window.location.href = '/login';
  }
};
```

---

## Game Search & Browse Workflow

### Complete Search Implementation

```javascript
class GameSearchAPI {
  constructor(baseURL = 'http://localhost:3100/api') {
    this.baseURL = baseURL;
  }

  // Search with multiple filters
  async searchGames(filters) {
    const params = {
      search: filters.searchTerm,
      platform: filters.platforms?.join(','),
      tags: filters.tags?.join(','),
      yearFrom: filters.yearFrom,
      yearTo: filters.yearTo,
      library: filters.library,
      sortBy: filters.sortBy || 'title',
      sortOrder: filters.sortOrder || 'asc',
      page: filters.page || 1,
      limit: filters.limit || 50,
      showBroken: filters.showBroken || false,
      showExtreme: filters.showExtreme || false
    };

    // Remove undefined values
    Object.keys(params).forEach(key =>
      params[key] === undefined && delete params[key]
    );

    const { data } = await axios.get(`${this.baseURL}/games`, { params });
    return data;
  }

  // Get filter options
  async getFilterOptions() {
    const { data } = await axios.get(`${this.baseURL}/games/filter-options`);
    return data;
  }

  // Get random game
  async getRandomGame(library) {
    const params = library ? { library } : {};
    const { data } = await axios.get(`${this.baseURL}/games/random`, { params });
    return data;
  }
}

// Usage example
const gameAPI = new GameSearchAPI();

// Complex search
const results = await gameAPI.searchGames({
  searchTerm: 'platformer',
  platforms: ['Flash', 'HTML5'],
  tags: ['Action', 'Retro'],
  yearFrom: 2005,
  yearTo: 2010,
  library: 'arcade',
  sortBy: 'releaseDate',
  sortOrder: 'desc',
  page: 1,
  limit: 20
});

console.log(`Found ${results.pagination.total} games`);
results.games.forEach(game => {
  console.log(`- ${game.title} (${game.platformName}, ${game.releaseDate})`);
});
```

### Pagination Example

```javascript
async function loadAllPages(filters) {
  const allGames = [];
  let currentPage = 1;
  let hasMore = true;

  while (hasMore) {
    const results = await gameAPI.searchGames({
      ...filters,
      page: currentPage,
      limit: 100
    });

    allGames.push(...results.games);

    hasMore = currentPage < results.pagination.totalPages;
    currentPage++;

    console.log(`Loaded page ${currentPage - 1}/${results.pagination.totalPages}`);
  }

  return allGames;
}
```

---

## Game Launch Workflow

### Complete Game Launch Implementation

```javascript
class GameLauncher {
  constructor(gameId) {
    this.gameId = gameId;
    this.game = null;
    this.launchData = null;
  }

  // Step 1: Get game details
  async loadGameDetails() {
    const { data } = await axios.get(
      `http://localhost:3100/api/games/${this.gameId}`
    );
    this.game = data;
    return data;
  }

  // Step 2: Get launch configuration
  async getLaunchData() {
    const { data } = await axios.get(
      `http://localhost:3100/api/games/${this.gameId}/launch`
    );
    this.launchData = data;
    return data;
  }

  // Step 3: Check if playable
  canPlayInBrowser() {
    return this.launchData?.canPlayInBrowser || false;
  }

  // Step 4: Launch game
  async launch(containerElement) {
    if (!this.game) await this.loadGameDetails();
    if (!this.launchData) await this.getLaunchData();

    if (!this.canPlayInBrowser()) {
      throw new Error('Game cannot be played in browser');
    }

    if (this.game.platformName === 'Flash') {
      return this.launchFlashGame(containerElement);
    } else if (this.game.platformName === 'HTML5') {
      return this.launchHTML5Game(containerElement);
    } else {
      throw new Error(`Unsupported platform: ${this.game.platformName}`);
    }
  }

  // Launch Flash game with Ruffle
  launchFlashGame(container) {
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';

    // Create player HTML
    const playerHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="/ruffle/ruffle.js"></script>
        <style>
          body { margin: 0; padding: 0; overflow: hidden; }
          #player { width: 100%; height: 100vh; }
        </style>
      </head>
      <body>
        <div id="player"></div>
        <script>
          window.RufflePlayer = window.RufflePlayer || {};
          window.RufflePlayer.config = {
            autoplay: 'auto',
            unmuteOverlay: 'hidden',
            backgroundColor: '#000000',
            letterbox: 'on',
            scaleMode: 'showall'
          };

          const ruffle = window.RufflePlayer.newest();
          const player = ruffle.createPlayer();
          const container = document.getElementById('player');
          container.appendChild(player);

          player.load('${this.launchData.contentUrl}');
        </script>
      </body>
      </html>
    `;

    iframe.srcdoc = playerHTML;
    container.appendChild(iframe);

    return iframe;
  }

  // Launch HTML5 game
  launchHTML5Game(container) {
    const iframe = document.createElement('iframe');
    iframe.src = this.launchData.contentUrl;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.allow = 'fullscreen';

    container.appendChild(iframe);

    return iframe;
  }
}

// Usage
const launcher = new GameLauncher('game-uuid-123');
const gameDetails = await launcher.loadGameDetails();

console.log(`Launching: ${gameDetails.title}`);

const playerContainer = document.getElementById('game-player');
await launcher.launch(playerContainer);
```

---

## Play Session Tracking

### Complete Session Tracking Implementation

```javascript
class PlaySessionTracker {
  constructor(gameId, gameTitle, token) {
    this.gameId = gameId;
    this.gameTitle = gameTitle;
    this.token = token;
    this.sessionId = null;
    this.startTime = null;
  }

  // Start tracking
  async start() {
    try {
      const { data } = await axios.post(
        'http://localhost:3100/api/play/start',
        {
          gameId: this.gameId,
          gameTitle: this.gameTitle
        },
        {
          headers: { Authorization: `Bearer ${this.token}` }
        }
      );

      this.sessionId = data.sessionId;
      this.startTime = Date.now();

      // Handle page unload
      window.addEventListener('beforeunload', () => this.end());

      console.log(`Session started: ${this.sessionId}`);
      return this.sessionId;
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  }

  // End tracking
  async end() {
    if (!this.sessionId) return;

    const duration = Math.floor((Date.now() - this.startTime) / 1000 / 60);
    console.log(`Ending session after ${duration} minutes`);

    try {
      await axios.post(
        'http://localhost:3100/api/play/end',
        { sessionId: this.sessionId },
        {
          headers: { Authorization: `Bearer ${this.token}` }
        }
      );

      console.log('Session ended successfully');
    } catch (error) {
      console.error('Failed to end session:', error);
      // Queue for retry
      this.queueRetry();
    }
  }

  queueRetry() {
    const failedSessions = JSON.parse(
      localStorage.getItem('failedSessions') || '[]'
    );
    failedSessions.push({
      sessionId: this.sessionId,
      timestamp: Date.now()
    });
    localStorage.setItem('failedSessions', JSON.stringify(failedSessions));
  }

  // Retry failed sessions
  static async retryFailedSessions(token) {
    const failedSessions = JSON.parse(
      localStorage.getItem('failedSessions') || '[]'
    );

    for (const session of failedSessions) {
      try {
        await axios.post(
          'http://localhost:3100/api/play/end',
          { sessionId: session.sessionId },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        console.log(`Retried session: ${session.sessionId}`);
      } catch (error) {
        console.error(`Retry failed for session: ${session.sessionId}`);
      }
    }

    localStorage.removeItem('failedSessions');
  }
}

// Usage
const token = localStorage.getItem('accessToken');
const tracker = new PlaySessionTracker('game-uuid', 'Game Title', token);

// Start when game loads
await tracker.start();

// End when game closes
// (automatically handled by beforeunload event)

// Retry failed sessions on app startup
await PlaySessionTracker.retryFailedSessions(token);
```

### Load Statistics Dashboard

```javascript
async function loadPlayStatistics(token) {
  const headers = { Authorization: `Bearer ${token}` };

  // Load all statistics in parallel
  const [
    stats,
    topGames,
    activityData,
    distribution,
    recentHistory
  ] = await Promise.all([
    axios.get('http://localhost:3100/api/play/stats', { headers }),
    axios.get('http://localhost:3100/api/play/top-games', {
      params: { limit: 10 },
      headers
    }),
    axios.get('http://localhost:3100/api/play/activity-over-time', {
      params: { days: 30 },
      headers
    }),
    axios.get('http://localhost:3100/api/play/games-distribution', {
      params: { limit: 10 },
      headers
    }),
    axios.get('http://localhost:3100/api/play/history', {
      params: { limit: 20 },
      headers
    })
  ]);

  return {
    overview: stats.data,
    topGames: topGames.data,
    activity: activityData.data,
    distribution: distribution.data,
    history: recentHistory.data.data
  };
}

// Display statistics
const playStats = await loadPlayStatistics(token);

console.log('Play Statistics:');
console.log(`Total games played: ${playStats.overview.totalGamesPlayed}`);
console.log(`Total play time: ${playStats.overview.totalPlayTimeMinutes} min`);
console.log(`Average session: ${playStats.overview.averageSessionMinutes.toFixed(1)} min`);

console.log('\nTop Games:');
playStats.topGames.forEach((game, i) => {
  console.log(`${i + 1}. ${game.gameTitle} - ${game.totalPlayTimeMinutes} min`);
});
```

---

## Playlist Management

### Complete Playlist Workflow

```javascript
class PlaylistManager {
  constructor(baseURL = 'http://localhost:3100/api') {
    this.baseURL = baseURL;
  }

  // Create new playlist
  async createPlaylist(title, description, author, library = 'arcade') {
    const { data } = await axios.post(`${this.baseURL}/playlists`, {
      title,
      description,
      author,
      library,
      extreme: false
    });

    console.log(`Created playlist: ${data.id}`);
    return data;
  }

  // Add games to playlist
  async addGames(playlistId, gameIds) {
    const { data } = await axios.post(
      `${this.baseURL}/playlists/${playlistId}/games`,
      { gameIds }
    );

    console.log(`Added ${gameIds.length} games to playlist`);
    return data;
  }

  // Remove games from playlist
  async removeGames(playlistId, gameIds) {
    const { data } = await axios.delete(
      `${this.baseURL}/playlists/${playlistId}/games`,
      { data: { gameIds } }
    );

    console.log(`Removed ${gameIds.length} games from playlist`);
    return data;
  }

  // Get playlist with games
  async getPlaylist(playlistId) {
    const { data } = await axios.get(
      `${this.baseURL}/playlists/${playlistId}`
    );
    return data;
  }

  // List all playlists
  async listPlaylists() {
    const { data } = await axios.get(`${this.baseURL}/playlists`);
    return data;
  }

  // Delete playlist
  async deletePlaylist(playlistId) {
    await axios.delete(`${this.baseURL}/playlists/${playlistId}`);
    console.log(`Deleted playlist: ${playlistId}`);
  }
}

// Usage example
const playlistMgr = new PlaylistManager();

// Create playlist
const playlist = await playlistMgr.createPlaylist(
  'My Favorite Platformers',
  'Collection of best platformer games',
  'john_doe',
  'arcade'
);

// Search for games to add
const { games } = await gameAPI.searchGames({
  tags: ['Platformer'],
  platform: 'Flash',
  limit: 20
});

// Add first 10 games
const gameIds = games.slice(0, 10).map(g => g.id);
await playlistMgr.addGames(playlist.id, gameIds);

// Get updated playlist
const updatedPlaylist = await playlistMgr.getPlaylist(playlist.id);
console.log(`Playlist has ${updatedPlaylist.games.length} games`);
```

---

## User Settings Management

### Update User Preferences

```javascript
async function updateUserSettings(token, settings) {
  const { data } = await axios.patch(
    'http://localhost:3100/api/users/me/settings',
    settings,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  console.log('Settings updated:', data);
  return data;
}

// Update theme
await updateUserSettings(token, {
  theme_mode: 'dark',
  primary_color: 'purple'
});

// Update game preferences
await updateUserSettings(token, {
  games_per_page: '100',
  show_extreme_content: 'true',
  player_scale_mode: 'showall'
});

// Get current settings
const { data: settings } = await axios.get(
  'http://localhost:3100/api/users/me/settings',
  {
    headers: { Authorization: `Bearer ${token}` }
  }
);

console.log('Current settings:', settings);
```

---

## Admin User Management

### Complete User Management Workflow

```javascript
class UserManagement {
  constructor(token) {
    this.token = token;
    this.headers = { Authorization: `Bearer ${token}` };
  }

  // List all users
  async listUsers(page = 1, limit = 50) {
    const { data } = await axios.get('http://localhost:3100/api/users', {
      params: { page, limit },
      headers: this.headers
    });
    return data;
  }

  // Create new user
  async createUser(username, email, password, roleId = 2) {
    const { data } = await axios.post(
      'http://localhost:3100/api/users',
      {
        username,
        email,
        password,
        roleId,
        isActive: true
      },
      { headers: this.headers }
    );

    console.log(`Created user: ${data.username}`);
    return data;
  }

  // Update user
  async updateUser(userId, updates) {
    const { data } = await axios.patch(
      `http://localhost:3100/api/users/${userId}`,
      updates,
      { headers: this.headers }
    );

    console.log(`Updated user: ${data.username}`);
    return data;
  }

  // Delete user
  async deleteUser(userId) {
    await axios.delete(
      `http://localhost:3100/api/users/${userId}`,
      { headers: this.headers }
    );

    console.log(`Deleted user: ${userId}`);
  }

  // Change user password
  async changePassword(userId, currentPassword, newPassword) {
    await axios.post(
      `http://localhost:3100/api/users/${userId}/change-password`,
      {
        currentPassword,
        newPassword
      },
      { headers: this.headers }
    );

    console.log('Password changed successfully');
  }
}

// Usage
const adminToken = localStorage.getItem('accessToken');
const userMgmt = new UserManagement(adminToken);

// List users
const users = await userMgmt.listUsers(1, 20);
console.log(`Total users: ${users.pagination.total}`);

// Create user
const newUser = await userMgmt.createUser(
  'jane_smith',
  'jane@example.com',
  'password123',
  2 // user role
);

// Update user role
await userMgmt.updateUser(newUser.id, {
  roleId: 3 // moderator
});

// Deactivate user
await userMgmt.updateUser(newUser.id, {
  isActive: false
});
```

---

## Role-Based Access Control

### Complete RBAC Implementation

```javascript
class RoleManagement {
  constructor(token) {
    this.token = token;
    this.headers = { Authorization: `Bearer ${token}` };
  }

  // List all roles
  async listRoles() {
    const { data } = await axios.get('http://localhost:3100/api/roles', {
      headers: this.headers
    });
    return data;
  }

  // List all permissions
  async listPermissions() {
    const { data } = await axios.get('http://localhost:3100/api/roles/permissions', {
      headers: this.headers
    });
    return data;
  }

  // Create custom role
  async createRole(name, description, priority, permissionIds) {
    const { data } = await axios.post(
      'http://localhost:3100/api/roles',
      {
        name,
        description,
        priority,
        permissionIds
      },
      { headers: this.headers }
    );

    console.log(`Created role: ${data.name}`);
    return data;
  }

  // Update role permissions
  async updatePermissions(roleId, permissionIds) {
    const { data } = await axios.put(
      `http://localhost:3100/api/roles/${roleId}/permissions`,
      { permissionIds },
      { headers: this.headers }
    );

    console.log(`Updated permissions for role: ${data.name}`);
    return data;
  }
}

// Usage
const roleMgmt = new RoleManagement(adminToken);

// Get all permissions
const permissions = await roleMgmt.listPermissions();

// Create content manager role
const contentManagerPerms = permissions
  .filter(p => p.category === 'games' || p.category === 'playlists')
  .map(p => p.id);

const contentManager = await roleMgmt.createRole(
  'content_manager',
  'Manages game content and playlists',
  40,
  contentManagerPerms
);

// Assign role to user
await userMgmt.updateUser(userId, {
  roleId: contentManager.id
});
```

This completes the comprehensive API reference documentation with real-world examples for all major workflows.
