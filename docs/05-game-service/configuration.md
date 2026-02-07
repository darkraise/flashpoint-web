# Configuration

The game content module configuration is part of the backend configuration. The
game-service is no longer a separate service, so these settings are now in
`backend/.env`.

## Configuration Sources

Configuration is loaded from three sources in priority order:

1. **Environment variables** (backend .env file) - Highest priority
2. **proxySettings.json** (Flashpoint standard) - Medium priority
3. **Hardcoded defaults** - Lowest priority

```typescript
// Priority: ENV > proxySettings.json > defaults
const chunkSize = parseInt(process.env.PROXY_CHUNK_SIZE || '8192');
```

## Environment Variables (backend/.env)

Game content module shares the backend's configuration. All game-service-related
variables are now in `backend/.env`.

### Flashpoint Paths (Shared with Backend)

#### FLASHPOINT_PATH

Flashpoint installation root directory. Used by both backend and game content
module.

```bash
FLASHPOINT_PATH=D:/Flashpoint
```

**Default**: D:/Flashpoint **Type**: Absolute path **Required**: Yes (for
production)

**Use case**: Point to Flashpoint installation

**Platform-specific**:

```bash
# Windows
FLASHPOINT_PATH=D:/Flashpoint
FLASHPOINT_PATH=C:/Program Files/Flashpoint

# Linux
FLASHPOINT_PATH=/opt/flashpoint
FLASHPOINT_PATH=/home/user/flashpoint

# macOS
FLASHPOINT_PATH=/Applications/Flashpoint
FLASHPOINT_PATH=/Users/user/flashpoint
```

**Automatically Derived Paths (no configuration needed):**

All other Flashpoint paths are automatically derived from `FLASHPOINT_PATH`:

- HTDOCS: `${FLASHPOINT_PATH}/Legacy/htdocs`
- Games: `${FLASHPOINT_PATH}/Data/Games`
- CGI: `${FLASHPOINT_PATH}/Legacy/cgi-bin`

You do not need to set environment variables for these paths - they are
calculated automatically from `FLASHPOINT_PATH`.

### Proxy Settings

#### PROXY_CHUNK_SIZE

Streaming chunk size in bytes.

```bash
PROXY_CHUNK_SIZE=8192
```

**Default**: 8192 (8KB) **Type**: Integer **Range**: 1024-1048576 (1KB-1MB)
**Required**: No

**Performance tuning**:

```bash
PROXY_CHUNK_SIZE=4096    # Low memory, high CPU
PROXY_CHUNK_SIZE=8192    # Balanced (default)
PROXY_CHUNK_SIZE=65536   # High memory, low CPU
```

**Trade-offs**:

- Smaller chunks: Lower memory, higher CPU, more I/O calls
- Larger chunks: Higher memory, lower CPU, fewer I/O calls

### Server Connection Limits

Server-wide connection and timeout management:

**HTTP Server Configuration:**

- **keepAliveTimeout**: 65 seconds - TCP keep-alive socket timeout
- **headersTimeout**: 66 seconds - HTTP header timeout
- **timeout**: 120 seconds - Total request timeout
- **maxConnections**: 500 - Maximum concurrent connections

These settings are hardcoded to prevent resource exhaustion and ensure graceful
handling of slow clients and network issues.

### Download Concurrency

Game data downloads are limited to prevent resource exhaustion:

- **MAX_CONCURRENT_DOWNLOADS**: 3 - Maximum simultaneous downloads
- Returns HTTP 503 if limit is exceeded during auto-download
- Downloads are queued and retried automatically

This limit prevents:
- Excessive bandwidth usage from multiple simultaneous downloads
- Memory exhaustion from buffering large files
- Network saturation on the download source

#### ALLOW_CROSS_DOMAIN

Enable CORS headers.

```bash
ALLOW_CROSS_DOMAIN=true
```

**Default**: true **Type**: Boolean (true/false) **Required**: No

**Use case**: Disable for internal networks

**Values**:

```bash
ALLOW_CROSS_DOMAIN=true   # Enable CORS (default)
ALLOW_CROSS_DOMAIN=false  # Disable CORS
```

**Impact**:

- `true`: Adds `Access-Control-Allow-Origin: *`
- `false`: No CORS headers, cross-domain requests blocked

### External Sources

External fallback URLs are configured via `proxySettings.json` in your Flashpoint
installation directory (`{FLASHPOINT_PATH}/Server/proxySettings.json`), not via
environment variables.

The game service reads `externalFilePaths` and `infinityServerURL` from this file.
If the file is missing, defaults to:

- `https://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs/`
- `https://infinity.unstable.life/Flashpoint/Legacy/htdocs/`

**External Request Configuration:**

- **Timeout**: 15 seconds (EXTERNAL_REQUEST_TIMEOUT_MS)
- **Max Retries**: 2 attempts per URL (reduced from 3)
- **Connection Pool**: 10 sockets per host with Keep-Alive
- **User-Agent**: Custom header identifying the proxy

**Notes**:

- HTTP URLs are auto-upgraded to HTTPS
- URLs are tried in order
- First successful response is used
- Failed sources are skipped with exponential backoff

### Logging

#### LOG_LEVEL

Logging verbosity level.

```bash
LOG_LEVEL=info
```

**Default**: info **Type**: String **Values**: error, warn, info, debug
**Required**: No

**Levels**:

```bash
LOG_LEVEL=error  # Errors only
LOG_LEVEL=warn   # Warnings and errors
LOG_LEVEL=info   # Standard logging (default)
LOG_LEVEL=debug  # Verbose logging
```

**Impact**:

- `error`: Minimal logs, production recommended
- `warn`: Important messages
- `info`: Request logging, file serves
- `debug`: Path resolution, fallback attempts, detailed flow

#### NODE_ENV

Node.js environment mode.

```bash
NODE_ENV=development
```

**Default**: development **Type**: String **Values**: development, production,
test **Required**: No

**Use case**: Production optimization

**Values**:

```bash
NODE_ENV=development  # Development mode (default)
NODE_ENV=production   # Production optimizations
NODE_ENV=test         # Testing mode
```

### CGI Support

#### ENABLE_CGI

Enable CGI script execution (PHP).

```bash
ENABLE_CGI=false
```

**Default**: false **Type**: Boolean **Required**: No

**Use case**: Execute PHP scripts for legacy Flashpoint games that require
server-side processing.

**Security warning**: Only enable in trusted environments. CGI execution allows
server-side code to run.

When enabled, the game-service will execute PHP scripts using `php-cgi` for
requests to `.php`, `.php5`, `.phtml`, and `.pl` files in the `htdocs` or
`cgi-bin` directories.

#### CGI Configuration (via proxySettings.json)

The `PreferencesService` is a singleton that reads Flashpoint's `preferences.json`
file. Re-initialization with a different path now logs a warning to help identify
configuration issues. This is primarily useful during development when testing
with different Flashpoint installations.

**Re-initialization Warning**:

If you call `PreferencesService.initialize()` with a different path after
initialization, a warning is logged:

```
[PreferencesService] Warning: Re-initializing with different path
  Previous: /path/to/flashpoint1
  New:      /path/to/flashpoint2
```

This helps prevent silent configuration changes that could affect game data
downloads.

Additional CGI settings can be configured in `proxySettings.json`:

```json
{
  "phpCgiPath": "C:/php/php-cgi.exe",
  "cgiTimeout": 30000,
  "cgiMaxBodySize": 10485760,
  "cgiMaxResponseSize": 52428800
}
```

| Setting              | Default                                  | Description                            |
| -------------------- | ---------------------------------------- | -------------------------------------- |
| `phpCgiPath`         | `{FLASHPOINT_PATH}/Legacy/php-cgi.exe`   | Path to php-cgi executable             |
| `cgiTimeout`         | `30000` (30 seconds)                     | Script execution timeout in ms         |
| `cgiMaxBodySize`     | `10485760` (10MB)                        | Maximum request body size              |
| `cgiMaxResponseSize` | `52428800` (50MB)                        | Maximum response size                  |

#### CGI Security

The CGI executor implements several security measures:

1. **Path validation**: Scripts must be within `htdocs` or `cgi-bin` directories
2. **REDIRECT_STATUS**: Set to prevent direct php-cgi execution attacks
3. **Environment sanitization**: Sensitive environment variables (JWT_SECRET,
   DATABASE_URL, etc.) are not passed to CGI scripts
4. **Timeout enforcement**: Scripts are killed after the configured timeout
5. **Size limits**: Both request body and response size are limited

## preferences.json (Game Data Sources)

### File Location

```
${FLASHPOINT_PATH}/preferences.json
```

**Example**: `D:/Flashpoint/preferences.json`

### Purpose

The `preferences.json` file is the Flashpoint Launcher's main configuration file.
The game-service reads `gameDataSources` from this file to enable auto-downloading
of game ZIPs when they're not present locally.

### Game Data Sources Configuration

```json
{
  "gameDataSources": [
    {
      "type": "raw",
      "name": "Flashpoint Project",
      "arguments": ["https://download.flashpointarchive.org/gib-roms/Games/"]
    },
    {
      "type": "raw",
      "name": "Backup Mirror",
      "arguments": ["https://backup.example.com/games/"]
    }
  ],
  "dataPacksFolderPath": "Data/Games"
}
```

### Configuration Fields

#### gameDataSources

Array of download sources for game ZIP files.

| Field       | Type     | Description                                    |
| ----------- | -------- | ---------------------------------------------- |
| `type`      | String   | Source type (currently only "raw" is used)     |
| `name`      | String   | Display name for logging and error messages    |
| `arguments` | String[] | Array with base URL as first element           |

**Download URL Construction:**

```
Full URL = arguments[0] + filename
Example: https://download.flashpointarchive.org/gib-roms/Games/ + abc123-1234567890.zip
```

**Multi-Source Fallback:**

Sources are tried sequentially in array order. If one fails (network error,
404, hash mismatch), the next source is attempted.

#### dataPacksFolderPath

Relative path from `FLASHPOINT_PATH` to the game data folder.

**Default**: `Data/Games`

**Full path**: `${FLASHPOINT_PATH}/${dataPacksFolderPath}`

### Compatibility

This configuration format matches the Flashpoint Launcher exactly, so existing
Flashpoint installations should work without modification. The game-service
reads the same `preferences.json` that the Flashpoint Launcher uses.

---

## proxySettings.json

### File Location

```
${FLASHPOINT_PATH}/Server/proxySettings.json
```

**Example**: `D:/Flashpoint/Server/proxySettings.json`

### File Format

```json
{
  "legacyOverridePaths": ["custom", "fixes"],
  "infinityServerURL": "https://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs/",
  "externalFilePaths": [
    "https://infinity.unstable.life/Flashpoint/Legacy/htdocs/"
  ],
  "mad4fpEnabled": false,
  "mad4fpPaths": [],
  "mimeTypes": {
    "swf": "application/x-shockwave-flash",
    "dcr": "application/x-director"
  }
}
```

### Configuration Fields

#### legacyOverridePaths

Override directories in htdocs.

```json
"legacyOverridePaths": ["custom", "fixes", "overrides"]
```

**Default**: [] **Type**: Array of strings

**Use case**: Patch broken games with fixed versions

**Path resolution**:

```
Request: www.example.com/game.swf
Override: htdocs/custom/www.example.com/game.swf
Normal: htdocs/www.example.com/game.swf
```

#### infinityServerURL

Primary external CDN URL.

```json
"infinityServerURL": "https://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs/"
```

**Default**: https://infinity.flashpointarchive.org/... **Type**: String (URL)

**Use case**: Change primary CDN

#### externalFilePaths

Additional external CDN URLs.

```json
"externalFilePaths": [
  "https://infinity.unstable.life/Flashpoint/Legacy/htdocs/",
  "https://backup.example.com/content/"
]
```

**Default**: [] **Type**: Array of URLs

**Use case**: Add backup CDNs

#### mad4fpEnabled

Enable MAD4FP content sources.

```json
"mad4fpEnabled": false
```

**Default**: false **Type**: Boolean

**Use case**: Access MAD4FP community content

#### mad4fpPaths

MAD4FP content URLs.

```json
"mad4fpPaths": [
  "https://mad4fp.example.com/content/"
]
```

**Default**: [] **Type**: Array of URLs

**Use case**: MAD4FP CDN locations

## Configuration Examples

### Minimal Configuration (backend/.env)

```bash
FLASHPOINT_PATH=D:/Flashpoint
```

All other settings use defaults.

### Development Configuration (backend/.env)

```bash
FLASHPOINT_PATH=D:/Flashpoint
LOG_LEVEL=debug
NODE_ENV=development
```

Verbose logging for debugging. Game content module runs on backend port 3100.

### Production Configuration (backend/.env)

```bash
FLASHPOINT_PATH=/opt/flashpoint
LOG_LEVEL=warn
NODE_ENV=production
ALLOW_CROSS_DOMAIN=true
```

Optimized for production. External fallback URLs are configured via
`proxySettings.json`.

### Docker Configuration (backend/.env)

```bash
FLASHPOINT_PATH=/flashpoint
LOG_LEVEL=info
NODE_ENV=production
```

Mounted volume path. Game content module runs on same container as backend.

### High-Performance Configuration (backend/.env)

```bash
PROXY_CHUNK_SIZE=65536  # 64KB chunks
LOG_LEVEL=error          # Minimal logging
NODE_ENV=production      # Production optimizations
```

Optimized for throughput.

### Secure Configuration (backend/.env)

```bash
ALLOW_CROSS_DOMAIN=false  # No CORS
ENABLE_CGI=false          # No script execution
LOG_LEVEL=warn            # Log security events
```

Maximum security (breaks most games).

## Loading Configuration

### ConfigManager Class (in backend/src/game/)

```typescript
export class ConfigManager {
  private static settings: ServerSettings | null = null;

  static async loadConfig(flashpointPath: string): Promise<ServerSettings>;
  static getSettings(): ServerSettings;
}
```

### Load Process

```typescript
// 1. Load from proxySettings.json
const proxySettingsPath = path.join(
  flashpointPath,
  'Server',
  'proxySettings.json'
);
const proxySettings = JSON.parse(await fs.readFile(proxySettingsPath, 'utf-8'));

// 2. Derive paths automatically from FLASHPOINT_PATH
this.settings = {
  // All paths are derived automatically from flashpointPath:
  legacyHTDOCSPath: path.join(flashpointPath, 'Legacy', 'htdocs'),
  gamesPath: path.join(flashpointPath, 'Data', 'Games'),
  cgiPath: path.join(flashpointPath, 'Legacy', 'cgi-bin'),
  // ... etc
};
```

### Access Configuration

Configuration is initialized in `backend/src/server.ts`:

```typescript
import { ConfigManager } from '@/game/config';

// Load configuration (once on startup)
await ConfigManager.loadConfig(process.env.FLASHPOINT_PATH!);

// Access settings
const settings = ConfigManager.getSettings();
console.log(`HTDOCS path: ${settings.legacyHTDOCSPath}`);
```

## Validation

### Required Settings

Settings that MUST be configured:

1. **FLASHPOINT_PATH**: Must point to valid Flashpoint installation
   - All other paths (HTDOCS, GAMES) are derived automatically from this

### Validation Process

```typescript
// Check Flashpoint path exists
try {
  await fs.access(flashpointPath);
} catch (error) {
  throw new Error(`Flashpoint path not found: ${flashpointPath}`);
}

// Check htdocs path exists
try {
  await fs.access(settings.legacyHTDOCSPath);
} catch (error) {
  logger.warn(`HTDOCS path not found: ${settings.legacyHTDOCSPath}`);
}
```

### Port Validation

```typescript
// Validate port range
if (proxyPort < 1024 || proxyPort > 65535) {
  throw new Error(`Invalid proxy port: ${proxyPort}`);
}

// Check port availability
try {
  server.listen(proxyPort);
} catch (error) {
  if (error.code === 'EADDRINUSE') {
    throw new Error(`Port ${proxyPort} already in use`);
  }
}
```

## Environment-Specific Configurations

### Development (.env.development)

```bash
FLASHPOINT_PATH=D:/Flashpoint
LOG_LEVEL=debug
NODE_ENV=development
```

### Production (.env.production)

```bash
FLASHPOINT_PATH=/opt/flashpoint
LOG_LEVEL=warn
NODE_ENV=production
ALLOW_CROSS_DOMAIN=true
```

### Testing (.env.test)

```bash
FLASHPOINT_PATH=/tmp/flashpoint-test
LOG_LEVEL=error
NODE_ENV=test
```

### Loading Environment Files

```bash
# Development
cp .env.development .env
npm run dev

# Production
cp .env.production .env
npm start

# Testing
cp .env.test .env
npm test
```

## Docker Configuration

Game content module is deployed as part of the backend container. Configuration
is in `backend/.env`.

### Backend Service Configuration (docker-compose.yml)

```yaml
services:
  backend:
    environment:
      - FLASHPOINT_PATH=/flashpoint
      - LOG_LEVEL=info
      - NODE_ENV=production
      - JWT_SECRET=your-secret-here
```

### Volume Mounts

```yaml
volumes:
  - ${FLASHPOINT_HOST_PATH}:/flashpoint:ro
  - ./backend:/app
```

Game content module uses the same Flashpoint volume mount as backend.

## Troubleshooting

### Configuration Not Loaded

**Symptom**: Using default values instead of configured values

**Debug steps**:

1. Check .env file exists in backend root directory (not game-service)
2. Verify dotenv is loading: `console.log(process.env.FLASHPOINT_PATH)`
3. Check for typos in variable names
4. Verify file encoding (UTF-8)
5. Restart backend to reload .env

**Solution**: Ensure .env file is in backend root directory with correct values

### Path Not Found

**Symptom**: `Flashpoint path not found: D:/Flashpoint`

**Debug steps**:

1. Verify path exists: `dir D:\Flashpoint` (Windows) or `ls /flashpoint` (Linux)
2. Check path format (forward slashes on all platforms)
3. Verify permissions (read access required)
4. Check for typos

**Solution**: Use absolute paths, verify directory exists

### Port Conflict

**Symptom**: Backend fails to start, `Port 3100 already in use`

**Debug steps**:

1. Find process: `netstat -ano | findstr :3100`
2. Kill process or change port in backend .env
3. Check for multiple backend instances

**Solution**: Change backend port (not game content specific) or kill conflicting
process

### External URLs Not Working

**Symptom**: Files not found from external sources

**Debug steps**:

1. Test URL manually: `curl https://infinity.flashpointarchive.org/...`
2. Check `externalFilePaths` in `proxySettings.json`
3. Verify network connectivity
4. Check firewall settings

**Solution**: Verify URLs are accessible, check network configuration

## Performance Tuning

### Memory Optimization

```bash
PROXY_CHUNK_SIZE=4096    # Smaller chunks, lower memory
```

### CPU Optimization

```bash
PROXY_CHUNK_SIZE=65536   # Larger chunks, fewer CPU cycles
```

### Network Optimization

For external source redundancy, add multiple URLs to `externalFilePaths` in
`proxySettings.json`.

### Logging Optimization

```bash
LOG_LEVEL=error  # Minimal logging overhead
```

## Security Best Practices

1. **Only enable CGI when necessary**:

   ```bash
   ENABLE_CGI=false  # Default - disable unless games require PHP
   ```

   If CGI is needed, ensure you're using the Flashpoint-bundled php-cgi binary
   which is configured for safe operation.

2. **Restrict CORS if internal**:

   ```bash
   ALLOW_CROSS_DOMAIN=false  # Internal networks only
   ```

3. **Use HTTPS for external URLs**: External URLs in `proxySettings.json` are
   automatically upgraded from HTTP to HTTPS.

4. **Minimal logging in production**:

   ```bash
   LOG_LEVEL=warn  # Don't log sensitive paths
   ```

5. **Set proper file permissions**:
   ```bash
   chmod 600 .env  # Restrict .env access
   ```

## Future Configuration Options

Planned configuration options:

1. **MAX_MOUNTED_ZIPS**: Limit concurrent ZIP mounts
2. **MAX_FILE_SIZE**: Maximum file size to serve
3. **CACHE_ENABLED**: Enable local file caching
4. **CACHE_SIZE**: Maximum cache size
5. **CACHE_TTL**: Cache time-to-live
6. **METRICS_ENABLED**: Enable Prometheus metrics
7. **HEALTH_CHECK_PORT**: Health check endpoint port
8. **REQUEST_TIMEOUT**: Maximum request timeout
9. **CONCURRENT_LIMIT**: Maximum concurrent requests
10. **COMPRESSION_ENABLED**: Enable response compression

## References

- dotenv documentation: https://github.com/motdotla/dotenv
- Node.js environment variables:
  https://nodejs.org/api/process.html#process_process_env
- Flashpoint proxySettings.json specification
- Docker environment configuration:
  https://docs.docker.com/compose/environment-variables/
