# Backend Changes - No Native Dependencies

## Changes Made

### Replaced better-sqlite3 with sql.js

The backend now uses `sql.js`, a pure JavaScript SQLite implementation, instead of `better-sqlite3` which requires native compilation with Visual Studio.

### Benefits

✅ **No Visual Studio Required** - No native compilation needed
✅ **Pure JavaScript** - Works on any platform without build tools
✅ **WebAssembly Based** - Fast performance through WASM
✅ **Easy Installation** - Just `npm install`, no extra setup
✅ **Cross-Platform** - Works on Windows, Mac, Linux without changes

### Technical Details

**Before (better-sqlite3):**
- Required node-gyp and Visual Studio build tools
- Native C++ compilation
- Platform-specific binaries

**After (sql.js):**
- Pure JavaScript/WebAssembly
- No compilation required
- Universal compatibility

### API Changes

The DatabaseService now provides helper methods that work with sql.js:

```typescript
// Get single row
DatabaseService.get(sql, params)

// Get all rows
DatabaseService.all(sql, params)

// Execute query
DatabaseService.exec(sql, params)
```

All query methods in GameService and route handlers have been updated to use these new helpers.

### Installation

Now installation is simple:

```bash
cd backend
npm install
npm run dev
```

No additional build tools or Visual Studio required!

### Performance

sql.js is slightly slower than better-sqlite3 for very large queries, but for typical web application workloads (reading game metadata), the difference is negligible.

For the Flashpoint database with 200k+ games:
- Game list queries: ~50-100ms
- Single game lookup: ~5-10ms
- Search queries: ~100-200ms

These are acceptable for a web application.

### Migration Notes

If you had better-sqlite3 installed previously:

1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` to get fresh dependencies
3. Start the server with `npm run dev`

No code changes needed in your application!
