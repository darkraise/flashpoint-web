# Configuration

The game-service configuration system uses environment variables and `proxySettings.json` to provide flexible deployment options.

## Configuration Sources

Configuration is loaded from three sources in priority order:

1. **Environment variables** (.env file) - Highest priority
2. **proxySettings.json** (Flashpoint standard) - Medium priority
3. **Hardcoded defaults** - Lowest priority

```typescript
// Priority: ENV > proxySettings.json > defaults
const proxyPort = parseInt(process.env.PROXY_PORT || '22500');
```

## Environment Variables

### Server Ports

#### PROXY_PORT

HTTP Proxy Server port.

```bash
PROXY_PORT=22500
```

**Default**: 22500
**Type**: Integer
**Range**: 1024-65535
**Required**: No

**Use case**: Change if port conflict occurs

**Examples**:
```bash
PROXY_PORT=22500  # Default
PROXY_PORT=8080   # Alternative HTTP port
PROXY_PORT=3000   # Development port
```

#### GAMEZIPSERVER_PORT

GameZip Server port.

```bash
GAMEZIPSERVER_PORT=22501
```

**Default**: 22501
**Type**: Integer
**Range**: 1024-65535
**Required**: No

**Use case**: Change if port conflict occurs

### Flashpoint Paths

#### FLASHPOINT_PATH

Flashpoint installation root directory.

```bash
FLASHPOINT_PATH=D:/Flashpoint
```

**Default**: D:/Flashpoint
**Type**: Absolute path
**Required**: Yes (for production)

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

#### FLASHPOINT_HTDOCS_PATH

Legacy htdocs directory path.

```bash
FLASHPOINT_HTDOCS_PATH=D:/Flashpoint/Legacy/htdocs
```

**Default**: `${FLASHPOINT_PATH}/Legacy/htdocs`
**Type**: Absolute path
**Required**: No (derived from FLASHPOINT_PATH)

**Use case**: Override htdocs location

#### FLASHPOINT_GAMES_PATH

Game ZIP archives directory.

```bash
FLASHPOINT_GAMES_PATH=D:/Flashpoint/Data/Games
```

**Default**: `${FLASHPOINT_PATH}/Data/Games`
**Type**: Absolute path
**Required**: No (derived from FLASHPOINT_PATH)

**Use case**: Override games directory location

### Proxy Settings

#### PROXY_CHUNK_SIZE

Streaming chunk size in bytes.

```bash
PROXY_CHUNK_SIZE=8192
```

**Default**: 8192 (8KB)
**Type**: Integer
**Range**: 1024-1048576 (1KB-1MB)
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

#### ALLOW_CROSS_DOMAIN

Enable CORS headers.

```bash
ALLOW_CROSS_DOMAIN=true
```

**Default**: true
**Type**: Boolean (true/false)
**Required**: No

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

#### EXTERNAL_FALLBACK_URLS

Comma-separated list of external CDN URLs.

```bash
EXTERNAL_FALLBACK_URLS=http://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs,http://infinity.unstable.life/Flashpoint/Legacy/htdocs/
```

**Default**: infinity.flashpointarchive.org
**Type**: Comma-separated URLs
**Required**: No

**Use case**: Add backup CDNs

**Format**:
```bash
EXTERNAL_FALLBACK_URLS=https://cdn1.example.com,https://cdn2.example.com,https://cdn3.example.com
```

**Notes**:
- HTTP URLs auto-upgraded to HTTPS
- Tried in order
- First successful response used

### Logging

#### LOG_LEVEL

Logging verbosity level.

```bash
LOG_LEVEL=info
```

**Default**: info
**Type**: String
**Values**: error, warn, info, debug
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

**Default**: development
**Type**: String
**Values**: development, production, test
**Required**: No

**Use case**: Production optimization

**Values**:
```bash
NODE_ENV=development  # Development mode (default)
NODE_ENV=production   # Production optimizations
NODE_ENV=test         # Testing mode
```

### Advanced Features

#### ENABLE_CGI

Enable CGI script execution.

```bash
ENABLE_CGI=false
```

**Default**: false
**Type**: Boolean
**Required**: No

**Use case**: Execute PHP/Perl scripts

**Security warning**: Only enable in trusted environments

#### ENABLE_HTACCESS

Enable .htaccess file parsing.

```bash
ENABLE_HTACCESS=false
```

**Default**: false
**Type**: Boolean
**Required**: No

**Use case**: Apache-style directory configuration

**Note**: Not yet implemented

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

**Default**: []
**Type**: Array of strings

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

**Default**: https://infinity.flashpointarchive.org/...
**Type**: String (URL)

**Use case**: Change primary CDN

#### externalFilePaths

Additional external CDN URLs.

```json
"externalFilePaths": [
  "https://infinity.unstable.life/Flashpoint/Legacy/htdocs/",
  "https://backup.example.com/content/"
]
```

**Default**: []
**Type**: Array of URLs

**Use case**: Add backup CDNs

#### mad4fpEnabled

Enable MAD4FP content sources.

```json
"mad4fpEnabled": false
```

**Default**: false
**Type**: Boolean

**Use case**: Access MAD4FP community content

#### mad4fpPaths

MAD4FP content URLs.

```json
"mad4fpPaths": [
  "https://mad4fp.example.com/content/"
]
```

**Default**: []
**Type**: Array of URLs

**Use case**: MAD4FP CDN locations

## Configuration Examples

### Minimal Configuration

```bash
# .env
FLASHPOINT_PATH=D:/Flashpoint
```

All other settings use defaults.

### Development Configuration

```bash
# .env
FLASHPOINT_PATH=D:/Flashpoint
PROXY_PORT=22500
GAMEZIPSERVER_PORT=22501
LOG_LEVEL=debug
NODE_ENV=development
```

Verbose logging for debugging.

### Production Configuration

```bash
# .env
FLASHPOINT_PATH=/opt/flashpoint
PROXY_PORT=22500
GAMEZIPSERVER_PORT=22501
LOG_LEVEL=warn
NODE_ENV=production
ALLOW_CROSS_DOMAIN=true
EXTERNAL_FALLBACK_URLS=https://cdn1.example.com,https://cdn2.example.com
```

Optimized for production.

### Docker Configuration

```bash
# .env
FLASHPOINT_PATH=/flashpoint
PROXY_PORT=22500
GAMEZIPSERVER_PORT=22501
LOG_LEVEL=info
NODE_ENV=production
```

Mounted volume path.

### Custom Ports Configuration

```bash
# .env
PROXY_PORT=8080
GAMEZIPSERVER_PORT=8081
```

Alternative ports to avoid conflicts.

### High-Performance Configuration

```bash
# .env
PROXY_CHUNK_SIZE=65536  # 64KB chunks
LOG_LEVEL=error          # Minimal logging
NODE_ENV=production      # Production optimizations
```

Optimized for throughput.

### Secure Configuration

```bash
# .env
ALLOW_CROSS_DOMAIN=false  # No CORS
ENABLE_CGI=false          # No script execution
LOG_LEVEL=warn            # Log security events
```

Maximum security (breaks most games).

## Loading Configuration

### ConfigManager Class

```typescript
export class ConfigManager {
  private static settings: ServerSettings | null = null;

  static async loadConfig(flashpointPath: string): Promise<ServerSettings>
  static getSettings(): ServerSettings
}
```

### Load Process

```typescript
// 1. Load from proxySettings.json
const proxySettingsPath = path.join(flashpointPath, 'Server', 'proxySettings.json');
const proxySettings = JSON.parse(await fs.readFile(proxySettingsPath, 'utf-8'));

// 2. Override with environment variables
this.settings = {
  proxyPort: parseInt(process.env.PROXY_PORT || '22500'),
  legacyHTDOCSPath: process.env.FLASHPOINT_HTDOCS_PATH ||
                    path.join(flashpointPath, 'Legacy', 'htdocs'),
  // ... etc
};
```

### Access Configuration

```typescript
import { ConfigManager } from './config';

// Load configuration (once on startup)
await ConfigManager.loadConfig(flashpointPath);

// Access settings
const settings = ConfigManager.getSettings();
console.log(`Proxy port: ${settings.proxyPort}`);
```

## Validation

### Required Settings

Settings that MUST be configured:

1. **FLASHPOINT_PATH**: Must point to valid Flashpoint installation
2. **FLASHPOINT_HTDOCS_PATH**: Must exist and be readable

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

### Environment Variables

```yaml
# docker-compose.yml
services:
  game-service:
    environment:
      - FLASHPOINT_PATH=/flashpoint
      - PROXY_PORT=22500
      - GAMEZIPSERVER_PORT=22501
      - LOG_LEVEL=info
      - NODE_ENV=production
```

### Volume Mounts

```yaml
volumes:
  - ${FLASHPOINT_HOST_PATH}:/flashpoint:ro
  - ./game-service:/app
```

### Build Args

```dockerfile
ARG PROXY_PORT=22500
ARG GAMEZIPSERVER_PORT=22501
ENV PROXY_PORT=${PROXY_PORT}
ENV GAMEZIPSERVER_PORT=${GAMEZIPSERVER_PORT}
```

## Troubleshooting

### Configuration Not Loaded

**Symptom**: Using default values instead of configured values

**Debug steps**:
1. Check .env file exists in correct location
2. Verify dotenv is loading: `console.log(process.env.PROXY_PORT)`
3. Check for typos in variable names
4. Verify file encoding (UTF-8)

**Solution**: Ensure .env file is in game-service root directory

### Path Not Found

**Symptom**: `Flashpoint path not found: D:/Flashpoint`

**Debug steps**:
1. Verify path exists: `dir D:\Flashpoint` (Windows) or `ls /flashpoint` (Linux)
2. Check path format (forward slashes on all platforms)
3. Verify permissions (read access required)
4. Check for typos

**Solution**: Use absolute paths, verify directory exists

### Port Conflict

**Symptom**: `Port 22500 already in use`

**Debug steps**:
1. Find process: `netstat -ano | findstr :22500`
2. Kill process or change port
3. Check for multiple game-service instances

**Solution**: Change PROXY_PORT to alternative port

### External URLs Not Working

**Symptom**: Files not found from external sources

**Debug steps**:
1. Test URL manually: `curl https://infinity.flashpointarchive.org/...`
2. Check EXTERNAL_FALLBACK_URLS format
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

```bash
# More external sources for redundancy
EXTERNAL_FALLBACK_URLS=https://cdn1.example.com,https://cdn2.example.com,https://cdn3.example.com
```

### Logging Optimization

```bash
LOG_LEVEL=error  # Minimal logging overhead
```

## Security Best Practices

1. **Disable CGI in production**:
   ```bash
   ENABLE_CGI=false
   ```

2. **Restrict CORS if internal**:
   ```bash
   ALLOW_CROSS_DOMAIN=false  # Internal networks only
   ```

3. **Use HTTPS for external URLs**:
   ```bash
   EXTERNAL_FALLBACK_URLS=https://cdn.example.com  # HTTPS only
   ```

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
- Node.js environment variables: https://nodejs.org/api/process.html#process_process_env
- Flashpoint proxySettings.json specification
- Docker environment configuration: https://docs.docker.com/compose/environment-variables/
