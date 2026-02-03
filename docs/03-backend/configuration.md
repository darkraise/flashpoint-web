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

  // Flashpoint paths (only FLASHPOINT_PATH is needed)
  flashpointPath: process.env.FLASHPOINT_PATH || 'D:/Flashpoint',
  // All other paths are derived automatically:
  // - flashpointDbPath: ${flashpointPath}/Data/flashpoint.sqlite
  // - htdocsPath: ${flashpointPath}/Legacy/htdocs
  // - imagesPath: ${flashpointPath}/Data/Images
  // - logosPath: ${flashpointPath}/Data/Logos
  // - playlistsPath: ${flashpointPath}/Data/Playlists
  // - gamesPath: ${flashpointPath}/Data/Games

  // Game service host (proxy and gamezip URLs derived automatically)
  gameServiceHost: process.env.GAME_SERVICE_HOST || 'localhost',
  // - proxyUrl: http://${gameServiceHost}:22500
  // - gamezipUrl: http://${gameServiceHost}:22501
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

**Automatically Derived Paths (no configuration needed):**

All other Flashpoint paths are automatically derived from `FLASHPOINT_PATH`:

- Database: `${FLASHPOINT_PATH}/Data/flashpoint.sqlite`
- HTDOCS: `${FLASHPOINT_PATH}/Legacy/htdocs`
- Images: `${FLASHPOINT_PATH}/Data/Images`
- Logos: `${FLASHPOINT_PATH}/Data/Logos`
- Playlists: `${FLASHPOINT_PATH}/Data/Playlists`
- Games: `${FLASHPOINT_PATH}/Data/Games`

You do not need to set environment variables for these paths - they are calculated automatically from `FLASHPOINT_PATH`.

### Game Service Configuration

#### `GAME_SERVICE_HOST`
- **Type**: string
- **Default**: `localhost`
- **Description**: Hostname/IP of game-service for constructing proxy and GameZip URLs
- **Usage**:
  ```bash
  GAME_SERVICE_HOST=localhost  # Development
  GAME_SERVICE_HOST=game-service  # Docker
  GAME_SERVICE_HOST=192.168.1.100  # Remote
  ```

The proxy and GameZip server URLs are automatically constructed as:
- Proxy: `http://${GAME_SERVICE_HOST}:22500`
- GameZip: `http://${GAME_SERVICE_HOST}:22501`

### External Resources

#### Image CDN URLs (Automatic)

Image CDN URLs are automatically read from Flashpoint's preferences file. No configuration required.

- **Source**: Flashpoint preferences (`onDemandBaseUrl` from `preferences.json` or `.preferences.defaults.json`)
- **Fallback**: If preferences are unavailable, defaults to:
  - `https://infinity.flashpointarchive.org/Flashpoint/Data/Images`
  - `https://infinity.unstable.life/Flashpoint/Data/Images`

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

#### `DOMAIN`
- **Type**: string
- **Default**: `http://localhost:5173`
- **Required**: Yes
- **Description**: Allowed origin for CORS requests (frontend URL)
- **Usage**:
  ```bash
  DOMAIN=http://localhost:5173  # Development
  DOMAIN=https://flashpoint.example.com  # Production
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

#### `LOG_FILE`
- **Type**: string
- **Default**: undefined (console only)
- **Description**: Path to log file for persistent logging. When set, logs are written to both console and file.
- **Features**:
  - Automatic log rotation (10MB max file size)
  - Keeps last 5 log files
  - JSON format for easy parsing
  - Directory created automatically
- **Usage**:
  ```bash
  # File logging enabled
  LOG_FILE=/var/log/flashpoint-backend.log

  # Docker volume
  LOG_FILE=/app/logs/backend.log

  # Disabled (console only)
  # LOG_FILE is not set
  ```

## Configuration Examples

### Development (.env)

```bash
# Server
NODE_ENV=development
PORT=3100
HOST=0.0.0.0

# Flashpoint (Windows)
# All other paths are derived automatically from FLASHPOINT_PATH
FLASHPOINT_PATH=D:/Flashpoint

# Game Service
GAME_SERVICE_HOST=localhost

# Database
USER_DB_PATH=./user.db

# Security
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRES_IN=1h
BCRYPT_SALT_ROUNDS=10

# CORS
DOMAIN=http://localhost:5173

# Logging
LOG_LEVEL=debug
# LOG_FILE not set - console only in development
```

### Production (.env)

```bash
# Server
NODE_ENV=production
PORT=3100
HOST=0.0.0.0

# Flashpoint (Linux)
# All other paths are derived automatically from FLASHPOINT_PATH
FLASHPOINT_PATH=/mnt/flashpoint

# Game Service
GAME_SERVICE_HOST=game-service

# Database
USER_DB_PATH=/data/user.db

# Security (CHANGE THESE!)
JWT_SECRET=<generate-secure-random-string-here>
JWT_EXPIRES_IN=1h
BCRYPT_SALT_ROUNDS=12

# CORS
DOMAIN=https://flashpoint.example.com

# Redis (optional)
REDIS_ENABLED=true
REDIS_HOST=redis
REDIS_PORT=6379

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/flashpoint-backend.log
```

### Docker (.env)

```bash
# Server
NODE_ENV=production
PORT=3100
HOST=0.0.0.0

# Flashpoint (mounted volume)
# All other paths are derived automatically from FLASHPOINT_PATH
FLASHPOINT_PATH=/flashpoint

# Game Service (Docker network)
GAME_SERVICE_HOST=game-service

# Database (Docker volume)
USER_DB_PATH=/data/user.db

# Security
JWT_SECRET=${JWT_SECRET}  # Pass from environment
JWT_EXPIRES_IN=1h
BCRYPT_SALT_ROUNDS=12

# CORS
DOMAIN=${DOMAIN}  # Pass from environment

# Redis
REDIS_ENABLED=true
REDIS_HOST=redis
REDIS_PORT=6379

# Logging
LOG_FILE=/app/logs/backend.log
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
- [ ] Set correct `DOMAIN` (your frontend URL)
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
docker run -e JWT_SECRET=$JWT_SECRET -e DOMAIN=$DOMAIN ...

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
Solution: Verify FLASHPOINT_PATH environment variable points to valid Flashpoint installation
(Database path is derived automatically as ${FLASHPOINT_PATH}/Data/flashpoint.sqlite)
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
Solution: Set DOMAIN=http://localhost:5174
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
