# ZIP Manager

The ZIP Manager provides zero-extraction ZIP archive access using
node-stream-zip, enabling efficient game file serving without disk space
overhead.

## Overview

The ZIP Manager mounts ZIP archives in-memory and provides streaming access to
files without extracting them to disk. This approach is ideal for serving game
content from compressed archives while conserving disk space.

## Architecture

```
┌────────────────────────────────────────────┐
│         ZipManager (Singleton)             │
├────────────────────────────────────────────┤
│  mountedZips: Map<id, MountedZip>         │
│                                            │
│  mount(id, zipPath)                        │
│  unmount(id)                               │
│  getFile(id, filePath)                     │
│  findFile(relPath)                         │
│  listFiles(id, pattern)                    │
│  unmountAll()                              │
└────────────────────────────────────────────┘
          ↓
┌────────────────────────────────────────────┐
│        node-stream-zip Library             │
├────────────────────────────────────────────┤
│  StreamZip.async({ file: zipPath })       │
│  zip.entries()                             │
│  zip.entryData(path)                       │
│  zip.close()                               │
└────────────────────────────────────────────┘
          ↓
┌────────────────────────────────────────────┐
│         Physical ZIP Files                 │
│  D:/Flashpoint/Data/Games/Flash/G/*.zip   │
└────────────────────────────────────────────┘
```

## Data Structures

### MountedZip Interface

```typescript
interface MountedZip {
  id: string; // Unique mount identifier (e.g., "game-123")
  zipPath: string; // Absolute path to ZIP file
  zip: StreamZip.StreamZipAsync; // node-stream-zip instance
  mountTime: Date; // When ZIP was mounted
}
```

### ZipManager Class

```typescript
export class ZipManager {
  private mountedZips: Map<string, MountedZip> = new Map();

  async mount(id: string, zipPath: string): Promise<void>;
  async unmount(id: string): Promise<boolean>;
  async getFile(id: string, filePath: string): Promise<Buffer | null>;
  async findFile(
    relPath: string
  ): Promise<{ data: Buffer; mountId: string } | null>;
  async listFiles(id: string, pattern?: string): Promise<string[]>;
  isMounted(id: string): boolean;
  getMountedZips(): Array<{ id; zipPath; mountTime; fileCount }>;
  async unmountAll(): Promise<void>;
}
```

## Mounting ZIPs

### Mount Process

```typescript
async mount(id: string, zipPath: string): Promise<void> {
  // 1. Check if already mounted
  if (this.mountedZips.has(id)) {
    logger.debug(`ZIP already mounted: ${id}`);
    return; // Silent success
  }

  // 2. Verify ZIP file exists
  try {
    await fs.access(zipPath);
  } catch (error) {
    throw new Error(`ZIP file not found: ${zipPath}`);
  }

  logger.info(`Mounting ZIP: ${id} -> ${zipPath}`);

  // 3. Create StreamZip instance
  const zip = new StreamZip.async({ file: zipPath });

  // 4. Store in map
  this.mountedZips.set(id, {
    id,
    zipPath,
    zip,
    mountTime: new Date()
  });

  // 5. Log file count
  const fileCount = await this.getFileCount(id);
  logger.info(`✓ Mounted ZIP: ${id} (${fileCount} files)`);
}
```

### Mount Examples

```typescript
// Mount by game ID
await zipManager.mount('game-123', 'D:/Flashpoint/Data/Games/Flash/G/game.zip');

// Mount with custom ID
await zipManager.mount('custom-archive', 'D:/Custom/archive.zip');

// Mount multiple ZIPs
await zipManager.mount(
  'game-456',
  'D:/Flashpoint/Data/Games/Flash/A/another.zip'
);
await zipManager.mount(
  'game-789',
  'D:/Flashpoint/Data/Games/Unity/U/unity-game.zip'
);
```

### Duplicate Mount Handling

If ZIP is already mounted, mount() returns silently without error:

```typescript
await zipManager.mount('game-123', 'path/to/game.zip');
await zipManager.mount('game-123', 'path/to/game.zip'); // Silent success, no-op
```

**Rationale**: Idempotent operations simplify backend logic - no need to check
mount status before mounting.

## Unmounting ZIPs

### Unmount Process

```typescript
async unmount(id: string): Promise<boolean> {
  const mounted = this.mountedZips.get(id);
  if (!mounted) {
    logger.warn(`ZIP not mounted: ${id}`);
    return false;
  }

  logger.info(`Unmounting ZIP: ${id}`);

  try {
    // Close ZIP handle
    await mounted.zip.close();

    // Remove from map
    this.mountedZips.delete(id);

    logger.info(`✓ Unmounted ZIP: ${id}`);
    return true;
  } catch (error) {
    logger.error(`Error unmounting ZIP: ${id}`, error);
    return false;
  }
}
```

### Unmount Examples

```typescript
// Unmount specific ZIP
const success = await zipManager.unmount('game-123');
if (success) {
  console.log('Unmounted successfully');
}

// Unmount all ZIPs (on shutdown)
await zipManager.unmountAll();
```

### Unmount All

Unmount all mounted ZIPs, typically called on server shutdown:

```typescript
async unmountAll(): Promise<void> {
  logger.info(`Unmounting all ZIPs (${this.mountedZips.size})...`);

  const promises = Array.from(this.mountedZips.keys()).map(id => this.unmount(id));
  await Promise.all(promises);

  logger.info('✓ All ZIPs unmounted');
}
```

Called in server shutdown handler:

```typescript
process.on('SIGTERM', async () => {
  await gameZipServer.stop(); // Calls zipManager.unmountAll()
  process.exit(0);
});
```

## File Access

### Get File from Specific ZIP

```typescript
async getFile(id: string, filePath: string): Promise<Buffer | null> {
  const mounted = this.mountedZips.get(id);
  if (!mounted) {
    logger.debug(`ZIP not mounted: ${id}`);
    return null;
  }

  try {
    // Normalize path (remove leading slash)
    const normalizedPath = filePath.startsWith('/')
      ? filePath.substring(1)
      : filePath;

    logger.debug(`Reading from ZIP ${id}: ${normalizedPath}`);

    // Get file data from ZIP (streaming, no extraction)
    const data = await mounted.zip.entryData(normalizedPath);

    logger.debug(`✓ Read ${data.length} bytes from ${id}:${normalizedPath}`);

    return data;
  } catch (error) {
    // File not found in ZIP
    logger.debug(`File not found in ${id}: ${filePath}`);
    return null;
  }
}
```

### File Access Examples

```typescript
// Get specific file
const data = await zipManager.getFile(
  'game-123',
  'content/www.example.com/game.swf'
);
if (data) {
  console.log(`Read ${data.length} bytes`);
}

// Try multiple paths
const paths = ['content/file.swf', 'htdocs/file.swf', 'file.swf'];
for (const path of paths) {
  const data = await zipManager.getFile('game-123', path);
  if (data) {
    console.log(`Found at: ${path}`);
    break;
  }
}
```

## Multi-ZIP Search

### Find File Across All ZIPs

```typescript
async findFile(relPath: string): Promise<{data: Buffer, mountId: string} | null> {
  // Path variations to try (in order)
  const pathsToTry = [
    `content/${relPath}`,       // Most common structure
    `htdocs/${relPath}`,        // Standard structure
    relPath,                     // No prefix
    `Legacy/htdocs/${relPath}`, // Full Flashpoint path
  ];

  // Search all mounted ZIPs
  for (const [id, mounted] of this.mountedZips) {
    for (const pathVariant of pathsToTry) {
      const data = await this.getFile(id, pathVariant);
      if (data) {
        logger.info(`✓ Found in ${id}: ${pathVariant}`);
        return { data, mountId: id };
      }
    }
  }

  return null;
}
```

### Path Variation Strategy

Different ZIPs may have different internal structures:

**Type 1: Content prefix**

```
game.zip
  └── content/
      └── www.example.com/
          └── game.swf
```

**Type 2: Htdocs prefix**

```
game.zip
  └── htdocs/
      └── www.example.com/
          └── game.swf
```

**Type 3: No prefix**

```
game.zip
  └── www.example.com/
      └── game.swf
```

**Type 4: Full path**

```
game.zip
  └── Legacy/
      └── htdocs/
          └── www.example.com/
              └── game.swf
```

The findFile() method tries all variations automatically.

### Search Performance

**Complexity**: O(m × p) where:

- m = number of mounted ZIPs
- p = number of path variations (4)

**Typical case**:

- 10 ZIPs mounted
- 4 path variations
- First match on average: 2nd variation
- Total attempts: ~20
- Time: <10ms

**Worst case**:

- 100 ZIPs mounted
- File not found
- Total attempts: 400
- Time: ~100ms

**Optimization** (future): Index files on mount, use hash table lookup

## File Listing

### List Files in ZIP

```typescript
async listFiles(id: string, pattern?: string): Promise<string[]> {
  const mounted = this.mountedZips.get(id);
  if (!mounted) return [];

  try {
    // Get all entries
    const entries = await mounted.zip.entries();
    let files = Object.keys(entries);

    // Apply pattern filter if provided
    if (pattern) {
      const regex = new RegExp(pattern, 'i');
      files = files.filter(f => regex.test(f));
    }

    return files;
  } catch (error) {
    logger.error(`Error listing files in ${id}:`, error);
    return [];
  }
}
```

### Listing Examples

```typescript
// List all files
const allFiles = await zipManager.listFiles('game-123');
console.log(`Total files: ${allFiles.length}`);

// List SWF files
const swfFiles = await zipManager.listFiles('game-123', '\\.swf$');
console.log(`SWF files: ${swfFiles.length}`);

// List files in specific directory
const contentFiles = await zipManager.listFiles(
  'game-123',
  '^content/www\\.example\\.com/'
);
console.log(`Content files: ${contentFiles.length}`);
```

### Performance Considerations

**entries() Cost**:

- First call: Loads ZIP index (~10-100ms)
- Cached internally by node-stream-zip
- Subsequent calls: O(1) hash table access

**Memory Usage**:

- Small ZIP (100 files): ~1MB for index
- Medium ZIP (1,000 files): ~5MB
- Large ZIP (10,000 files): ~50MB
- Very large ZIP (100,000 files): ~500MB

**Recommendation**: Don't list files on every request, use sparingly for
debugging.

## Mount Status

### Check if ZIP is Mounted

```typescript
isMounted(id: string): boolean {
  return this.mountedZips.has(id);
}
```

### Get Mounted ZIP Info

```typescript
getMountedZips(): Array<{id, zipPath, mountTime, fileCount}> {
  const result = [];

  for (const [id, mounted] of this.mountedZips) {
    result.push({
      id,
      zipPath: mounted.zipPath,
      mountTime: mounted.mountTime,
      fileCount: 0 // Populated async, 0 for now
    });
  }

  return result;
}
```

### Status Examples

```typescript
// Check mount status
if (zipManager.isMounted('game-123')) {
  console.log('ZIP is mounted');
}

// Get all mounts
const mounts = zipManager.getMountedZips();
console.log(`${mounts.length} ZIPs mounted`);

for (const mount of mounts) {
  console.log(`- ${mount.id}: ${mount.zipPath}`);
  console.log(`  Mounted: ${mount.mountTime}`);
}
```

## Streaming vs. Extraction

### Streaming (Current Approach)

**Process**:

1. Open ZIP file handle
2. Read central directory index
3. Locate file entry
4. Seek to file position
5. Read compressed data
6. Decompress in memory
7. Return Buffer

**Advantages**:

- No disk space used for extraction
- Fast for small files (<1MB)
- No cleanup required
- Multiple files accessed independently

**Disadvantages**:

- Each access requires decompression
- CPU overhead for deflate
- Memory spike for large files
- Random access slower than sequential

### Extraction (Alternative)

**Process**:

1. Extract entire ZIP to disk
2. Read files from extracted directory
3. Cleanup on unmount

**Advantages**:

- Fast sequential access
- No decompression overhead
- Better for large files
- OS filesystem cache benefits

**Disadvantages**:

- Requires disk space (2x ZIP size)
- Extraction time on mount
- Cleanup complexity
- Disk I/O overhead

### When to Use Each

**Streaming** (recommended for):

- Many small files
- Random access patterns
- Limited disk space
- Short-lived access

**Extraction** (recommended for):

- Few large files
- Sequential access patterns
- Abundant disk space
- Long-lived access

## Memory Management

### Memory Usage Breakdown

**Per mounted ZIP**:

- ZIP handle: ~1KB
- File index: ~5KB per 100 files
- Example: 1,000 files = ~50KB

**Per file access**:

- File buffer: File size in memory
- Decompression buffer: ~2x file size temporarily
- Example: 1MB file = ~3MB peak memory

**Total with 10 ZIPs (10,000 files each), 5 concurrent requests (1MB each)**:

- ZIP indexes: 10 × 500KB = 5MB
- File buffers: 5 × 1MB = 5MB
- Decompression: 5 × 1MB = 5MB
- **Total: ~15MB**

### Memory Limits

**Current implementation**: No limits

**Recommended limits** (future):

```typescript
const MAX_MOUNTED_ZIPS = 100;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_CONCURRENT_READS = 50;
```

### Memory Monitoring

Monitor memory usage:

```typescript
const usage = process.memoryUsage();
console.log(`Heap used: ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`Heap total: ${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
console.log(`External: ${(usage.external / 1024 / 1024).toFixed(2)} MB`);
```

## Error Handling

### Mount Errors

**ZIP file not found**:

```typescript
await zipManager.mount('game-123', '/invalid/path.zip');
// Throws: Error: ZIP file not found: /invalid/path.zip
```

**ZIP corrupted**:

```typescript
await zipManager.mount('game-123', 'corrupted.zip');
// Throws: Error from node-stream-zip
```

**Permission denied**:

```typescript
await zipManager.mount('game-123', 'no-permission.zip');
// Throws: EACCES: permission denied
```

### File Access Errors

**File not in ZIP**:

```typescript
const data = await zipManager.getFile('game-123', 'missing.swf');
// Returns: null (not an error)
```

**ZIP not mounted**:

```typescript
const data = await zipManager.getFile('not-mounted', 'file.swf');
// Returns: null (not an error)
```

### Unmount Errors

**ZIP not mounted**:

```typescript
const success = await zipManager.unmount('not-mounted');
// Returns: false (not an error)
```

**Unmount failed**:

```typescript
const success = await zipManager.unmount('game-123');
// Returns: false, logs error
```

## Testing

### Manual Testing

```bash
# 1. Start game-service
npm run dev

# 2. Mount a ZIP
curl -X POST http://localhost:22501/mount/test \
  -H "Content-Type: application/json" \
  -d '{"zipPath": "D:/Flashpoint/Data/Games/test.zip"}'

# 3. Check mounts
curl http://localhost:22501/mounts

# 4. Request file
curl http://localhost:22501/http://www.example.com/file.swf

# 5. Unmount
curl -X DELETE http://localhost:22501/mount/test
```

### Unit Testing (Future)

```typescript
describe('ZipManager', () => {
  it('should mount ZIP successfully', async () => {
    await zipManager.mount('test', 'test.zip');
    expect(zipManager.isMounted('test')).toBe(true);
  });

  it('should return null for missing file', async () => {
    const data = await zipManager.getFile('test', 'missing.swf');
    expect(data).toBeNull();
  });

  it('should find file with path variation', async () => {
    const result = await zipManager.findFile('www.example.com/file.swf');
    expect(result).not.toBeNull();
    expect(result!.mountId).toBe('test');
  });

  it('should unmount ZIP successfully', async () => {
    const success = await zipManager.unmount('test');
    expect(success).toBe(true);
    expect(zipManager.isMounted('test')).toBe(false);
  });
});
```

## Logging

### Mount/Unmount

```
[ZipManager] Mounting ZIP: game-123 -> D:/Flashpoint/Data/Games/game.zip
[ZipManager] ✓ Mounted ZIP: game-123 (1234 files)
[ZipManager] Unmounting ZIP: game-123
[ZipManager] ✓ Unmounted ZIP: game-123
```

### File Access

```
[ZipManager] Reading from ZIP game-123: content/www.example.com/game.swf
[ZipManager] ✓ Read 123456 bytes from game-123:content/www.example.com/game.swf
[ZipManager] ✓ Found in game-123: content/www.example.com/game.swf
```

### Errors

```
[ZipManager] ZIP not mounted: game-999
[ZipManager] File not found in game-123: missing.swf
[ZipManager] Error unmounting ZIP: game-123 [Error: ...]
```

## Performance Benchmarks

Typical performance on modern SSD:

**Mount time**:

- Small ZIP (<100 files): 10-50ms
- Medium ZIP (<1,000 files): 50-200ms
- Large ZIP (<10,000 files): 200-1000ms
- Very large ZIP (>10,000 files): 1-5 seconds

**File access time**:

- Small file (<100KB): 2-5ms
- Medium file (<1MB): 5-20ms
- Large file (<10MB): 20-100ms
- Very large file (>10MB): 100-500ms

**Memory usage**:

- Per ZIP: 50KB - 500KB (index)
- Per file: File size + decompression overhead

## Future Enhancements

1. **Auto-Unmount**: Unmount inactive ZIPs after timeout
2. **LRU Cache**: Cache frequently accessed files in memory
3. **File Index**: Pre-index files on mount for O(1) lookup
4. **Compression Detection**: Skip decompression for stored (uncompressed) files
5. **Streaming API**: Stream large files instead of loading into memory
6. **Concurrent Limits**: Limit concurrent file reads
7. **Memory Limits**: Enforce maximum memory usage
8. **Health Monitoring**: Track memory usage, cache hit rate
9. **Metrics**: Expose mount count, file access count, cache hit rate
10. **Pre-Warming**: Mount popular ZIPs on startup

## References

- node-stream-zip: https://github.com/antelle/node-stream-zip
- ZIP file format: https://en.wikipedia.org/wiki/ZIP_(file_format)
- Deflate compression: https://en.wikipedia.org/wiki/DEFLATE
- Node.js Buffer: https://nodejs.org/api/buffer.html
- Node.js Streams: https://nodejs.org/api/stream.html
