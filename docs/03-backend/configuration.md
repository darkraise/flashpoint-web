# Backend Configuration

This document describes all environment variables and configuration options for the Flashpoint Web backend service.

## Configuration File

All configuration is centralized in `backend/src/config.ts`:

```typescript
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3100', 10),
  host: process.env.HOST || '0.0.0.0',

  // Flashpoint paths
  flashpointPath: process.env.FLASHPOINT_PATH || 'D:/Flashpoint',
  flashpointDbPath: process.env.FLASHPOINT_DB_PATH || 'D:/Flashpoint/Data/flashpoint.sqlite',
  // ... more config
};
```

## Environment Variables

### Server Configuration

#### `NODE_ENV`
- **Type**: string
- **Default**: `development`
- **Options**: `development`, `production`, `test`
- **Description**: Application environment mode
- **Usage**:
  ```bash
  NODE_ENV=production
  ```

#### `PORT`
- **Type**: number
- **Default**: `3100`
- **Description**: HTTP server port
- **Usage**:
  ```bash
  PORT=3100
  ```

#### `HOST`
- **Type**: string
- **Default**: `0.0.0.0`
- **Description**: Server bind address
- **Usage**:
  ```bash
  HOST=0.0.0.0  # Listen on all interfaces
  HOST=localhost  # Listen on localhost only
  ```

### Flashpoint Paths

#### `FLASHPOINT_PATH`
- **Type**: string
- **Default**: `D:/Flashpoint`
- **Required**: Yes
- **Description**: Root directory of Flashpoint installation
- **Usage**:
  ```bash
  FLASHPOINT_PATH=D:/Flashpoint
  FLASHPOINT_PATH=/mnt/flashpoint  # Linux
  ```

#### `FLASHPOINT_DB_PATH`
- **Type**: string
- **Default**: `D:/Flashpoint/Data/flashpoint.sqlite`
- **Required**: Yes
- **Description**: Path to Flashpoint game metadata database
- **Usage**:
  ```bash
  FLASHPOINT_DB_PATH=D:/Flashpoint/Data/flashpoint.sqlite
  ```

#### `FLASHPOINT_HTDOCS_PATH`
- **Type**: string
- **Default**: `D:/Flashpoint/Legacy/htdocs`
- **Description**: Path to legacy web content directory
- **Usage**:
  ```bash
  FLASHPOINT_HTDOCS_PATH=D:/Flashpoint/Legacy/htdocs
  ```

#### `FLASHPOINT_IMAGES_PATH`
- **Type**: string
- **Default**: `D:/Flashpoint/Data/Images`
- **Description**: Path to game screenshots directory
- **Usage**:
  ```bash
  FLASHPOINT_IMAGES_PATH=D:/Flashpoint/Data/Images
  ```

#### `FLASHPOINT_LOGOS_PATH`
- **Type**: string
- **Default**: `D:/Flashpoint/Data/Logos`
- **Description**: Path to game logos/box art directory
- **Usage**:
  ```bash
  FLASHPOINT_LOGOS_PATH=D:/Flashpoint/Data/Logos
  ```

#### `FLASHPOINT_PLAYLISTS_PATH`
- **Type**: string
- **Default**: `D:/Flashpoint/Data/Playlists`
- **Description**: Path to playlist files directory
- **Usage**:
  ```bash
  FLASHPOINT_PLAYLISTS_PATH=D:/Flashpoint/Data/Playlists
  ```

#### `FLASHPOINT_GAMES_PATH`
- **Type**: string
- **Default**: `D:/Flashpoint/Data/Games`
- **Description**: Path to game data/ZIP files directory
- **Usage**:
  ```bash
  FLASHPOINT_GAMES_PATH=D:/Flashpoint/Data/Games
  ```

### Game Service Configuration

#### `GAME_SERVICE_PROXY_URL`
- **Type**: string
- **Default**: `http://localhost:22500`
- **Description**: URL to game-service HTTP proxy server
- **Usage**:
  ```bash
  GAME_SERVICE_PROXY_URL=http://localhost:22500
  GAME_SERVICE_PROXY_URL=http://game-service:22500  # Docker
  ```

#### `GAME_SERVICE_GAMEZIP_URL`
- **Type**: string
- **Default**: `http://localhost:22501`
- **Description**: URL to game-service GameZip server
- **Usage**:
  ```bash
  GAME_SERVICE_GAMEZIP_URL=http://localhost:22501
  ```

#### `GAME_SERVER_URL` (Legacy)
- **Type**: string
- **Default**: `http://localhost:22500`
- **Description**: Legacy alias for `GAME_SERVICE_PROXY_URL`
- **Note**: Deprecated, use `GAME_SERVICE_PROXY_URL` instead

### External Resources

#### `EXTERNAL_IMAGE_URLS`
- **Type**: string (comma-separated)
- **Default**: `https://infinity.flashpointarchive.org/Flashpoint/Data/Images,https://infinity.unstable.life/Flashpoint/Data/Images`
- **Description**: CDN URLs for image fallback
- **Usage**:
  ```bash
  EXTERNAL_IMAGE_URLS=https://cdn1.example.com,https://cdn2.example.com
  ```

### Database Configuration

#### `USER_DB_PATH`
- **Type**: string
- **Default**: `./user.db`
- **Description**: Path to user database file
- **Usage**:
  ```bash
  USER_DB_PATH=./user.db
  USER_DB_PATH=/data/user.db  # Docker volume
  ```

### Security Configuration

#### `JWT_SECRET`
- **Type**: string
- **Default**: `change-in-production-use-long-random-string`
- **Required**: Yes (in production)
- **Description**: Secret key for JWT token signing
- **Security**: Must be changed in production
- **Usage**:
  ```bash
  JWT_SECRET=your-super-secret-key-min-32-chars
  ```
- **Generation**:
  ```bash
  # Generate secure random secret
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

#### `JWT_EXPIRES_IN`
- **Type**: string
- **Default**: `1h`
- **Description**: Access token expiration time
- **Format**: Zeit/ms format (1h, 15m, 7d, etc.)
- **Usage**:
  ```bash
  JWT_EXPIRES_IN=1h
  JWT_EXPIRES_IN=15m  # Shorter for high-security
  JWT_EXPIRES_IN=24h  # Longer for convenience
  ```

#### `BCRYPT_SALT_ROUNDS`
- **Type**: number
- **Default**: `10`
- **Description**: Number of bcrypt hashing rounds
- **Note**: Higher = more secure but slower
- **Usage**:
  ```bash
  BCRYPT_SALT_ROUNDS=10
  BCRYPT_SALT_ROUNDS=12  # More secure
  ```

### CORS Configuration

#### `CORS_ORIGIN`
- **Type**: string
- **Default**: `http://localhost:5173`
- **Required**: Yes
- **Description**: Allowed origin for CORS requests (frontend URL)
- **Usage**:
  ```bash
  CORS_ORIGIN=http://localhost:5173  # Development
  CORS_ORIGIN=https://flashpoint.example.com  # Production
  ```

### Rate Limiting

#### `RATE_LIMIT_WINDOW_MS`
- **Type**: number
- **Default**: `60000` (1 minute)
- **Description**: Rate limit window in milliseconds
- **Usage**:
  ```bash
  RATE_LIMIT_WINDOW_MS=60000
  ```

#### `RATE_LIMIT_MAX_REQUESTS`
- **Type**: number
- **Default**: `100`
- **Description**: Maximum requests per window
- **Usage**:
  ```bash
  RATE_LIMIT_MAX_REQUESTS=100
  RATE_LIMIT_MAX_REQUESTS=1000  # More permissive
  ```

### Redis Configuration

#### `REDIS_ENABLED`
- **Type**: boolean
- **Default**: `false`
- **Description**: Enable Redis for caching
- **Usage**:
  ```bash
  REDIS_ENABLED=true
  ```

#### `REDIS_HOST`
- **Type**: string
- **Default**: `localhost`
- **Description**: Redis server hostname
- **Usage**:
  ```bash
  REDIS_HOST=localhost
  REDIS_HOST=redis  # Docker
  ```

#### `REDIS_PORT`
- **Type**: number
- **Default**: `6379`
- **Description**: Redis server port
- **Usage**:
  ```bash
  REDIS_PORT=6379
  ```

### Logging Configuration

#### `LOG_LEVEL`
- **Type**: string
- **Default**: `info`
- **Options**: `error`, `warn`, `info`, `debug`
- **Description**: Minimum log level to output
- **Usage**:
  ```bash
  LOG_LEVEL=info  # Production
  LOG_LEVEL=debug  # Development
  LOG_LEVEL=error  # Quiet mode
  ```

## Configuration Examples

### Development (.env)

```bash
# Server
NODE_ENV=development
PORT=3100
HOST=0.0.0.0

# Flashpoint (Windows)
FLASHPOINT_PATH=D:/Flashpoint
FLASHPOINT_DB_PATH=D:/Flashpoint/Data/flashpoint.sqlite
FLASHPOINT_HTDOCS_PATH=D:/Flashpoint/Legacy/htdocs
FLASHPOINT_IMAGES_PATH=D:/Flashpoint/Data/Images
FLASHPOINT_LOGOS_PATH=D:/Flashpoint/Data/Logos
FLASHPOINT_PLAYLISTS_PATH=D:/Flashpoint/Data/Playlists
FLASHPOINT_GAMES_PATH=D:/Flashpoint/Data/Games

# Game Service
GAME_SERVICE_PROXY_URL=http://localhost:22500
GAME_SERVICE_GAMEZIP_URL=http://localhost:22501

# Database
USER_DB_PATH=./user.db

# Security
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRES_IN=1h
BCRYPT_SALT_ROUNDS=10

# CORS
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=debug
```

### Production (.env)

```bash
# Server
NODE_ENV=production
PORT=3100
HOST=0.0.0.0

# Flashpoint (Linux)
FLASHPOINT_PATH=/mnt/flashpoint
FLASHPOINT_DB_PATH=/mnt/flashpoint/Data/flashpoint.sqlite
FLASHPOINT_HTDOCS_PATH=/mnt/flashpoint/Legacy/htdocs
FLASHPOINT_IMAGES_PATH=/mnt/flashpoint/Data/Images
FLASHPOINT_LOGOS_PATH=/mnt/flashpoint/Data/Logos
FLASHPOINT_PLAYLISTS_PATH=/mnt/flashpoint/Data/Playlists
FLASHPOINT_GAMES_PATH=/mnt/flashpoint/Data/Games

# Game Service
GAME_SERVICE_PROXY_URL=http://game-service:22500
GAME_SERVICE_GAMEZIP_URL=http://game-service:22501

# Database
USER_DB_PATH=/data/user.db

# Security (CHANGE THESE!)
JWT_SECRET=<generate-secure-random-string-here>
JWT_EXPIRES_IN=1h
BCRYPT_SALT_ROUNDS=12

# CORS
CORS_ORIGIN=https://flashpoint.example.com

# Redis (optional)
REDIS_ENABLED=true
REDIS_HOST=redis
REDIS_PORT=6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### Docker (.env)

```bash
# Server
NODE_ENV=production
PORT=3100
HOST=0.0.0.0

# Flashpoint (mounted volume)
FLASHPOINT_PATH=/flashpoint
FLASHPOINT_DB_PATH=/flashpoint/Data/flashpoint.sqlite
FLASHPOINT_HTDOCS_PATH=/flashpoint/Legacy/htdocs
FLASHPOINT_IMAGES_PATH=/flashpoint/Data/Images
FLASHPOINT_LOGOS_PATH=/flashpoint/Data/Logos
FLASHPOINT_PLAYLISTS_PATH=/flashpoint/Data/Playlists
FLASHPOINT_GAMES_PATH=/flashpoint/Data/Games

# Game Service (Docker network)
GAME_SERVICE_PROXY_URL=http://game-service:22500
GAME_SERVICE_GAMEZIP_URL=http://game-service:22501

# Database (Docker volume)
USER_DB_PATH=/data/user.db

# Security
JWT_SECRET=${JWT_SECRET}  # Pass from environment
JWT_EXPIRES_IN=1h
BCRYPT_SALT_ROUNDS=12

# CORS
CORS_ORIGIN=${CORS_ORIGIN}  # Pass from environment

# Redis
REDIS_ENABLED=true
REDIS_HOST=redis
REDIS_PORT=6379

# Logging
LOG_LEVEL=info
```

## Configuration Loading

Configuration is loaded in this order:

1. **Environment variables** (highest priority)
2. **.env file** in project root
3. **Default values** in `config.ts`

Example:
```typescript
// PORT comes from: process.env.PORT → .env file → default '3100'
port: parseInt(process.env.PORT || '3100', 10)
```

## Security Best Practices

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate secure `JWT_SECRET` (min 32 characters)
- [ ] Set correct `CORS_ORIGIN` (your frontend URL)
- [ ] Increase `BCRYPT_SALT_ROUNDS` to 12+
- [ ] Set appropriate `LOG_LEVEL` (info or warn)
- [ ] Configure rate limiting for your expected traffic
- [ ] Use HTTPS for all external URLs
- [ ] Protect `.env` file (add to `.gitignore`)
- [ ] Use environment-specific secrets (not shared)

### Secret Management

**Development**:
- Use `.env` file
- Add `.env` to `.gitignore`
- Share `.env.example` (without secrets)

**Production**:
- Use environment variables (not `.env` file)
- Use secret management service (AWS Secrets Manager, Azure Key Vault, etc.)
- Rotate secrets regularly
- Never commit secrets to git

**Docker**:
```bash
# Pass secrets via environment
docker run -e JWT_SECRET=$JWT_SECRET -e CORS_ORIGIN=$CORS_ORIGIN ...

# Or use Docker secrets
docker secret create jwt_secret jwt_secret.txt
```

## Validation

The backend validates configuration on startup:

```typescript
// Checks performed in DatabaseService.initialize()
if (!fs.existsSync(config.flashpointDbPath)) {
  throw new Error(`Flashpoint database not found at: ${config.flashpointDbPath}`);
}
```

### Common Configuration Errors

**Database not found**:
```
Error: Flashpoint database not found at: D:/Flashpoint/Data/flashpoint.sqlite
Solution: Verify FLASHPOINT_DB_PATH points to valid database file
```

**Port already in use**:
```
Error: listen EADDRINUSE: address already in use :::3100
Solution: Change PORT or stop other process using port 3100
```

**CORS error**:
```
Access to fetch at 'http://localhost:3100/api/games' from origin
'http://localhost:5174' has been blocked by CORS policy
Solution: Set CORS_ORIGIN=http://localhost:5174
```

**JWT verification failed**:
```
Error: Invalid or expired token
Solution: Ensure frontend and backend use same JWT_SECRET
```

## Accessing Configuration

### In Services

```typescript
import { config } from '../config';

// Use configuration
const dbPath = config.flashpointDbPath;
const port = config.port;
```

### Runtime Changes

Configuration is loaded once at startup. To change configuration:

1. Update `.env` file or environment variables
2. Restart backend server
3. Verify changes in logs

**Note**: Database hot-reload does not require restart.

## Environment-Specific Configuration

### Development

- Lower security (faster bcrypt)
- Debug logging
- Permissive CORS
- Local file paths

### Production

- High security (slower bcrypt)
- Info/warn logging
- Strict CORS
- Mounted volumes or cloud storage

### Testing

- In-memory database (optional)
- Test-specific JWT secret
- Verbose logging
- Mock external services

## Related Documentation

- [README.md](./README.md) - Backend overview
- [Architecture](./architecture.md) - Backend architecture
- [Database Schema](./database/schema.md) - Database configuration
