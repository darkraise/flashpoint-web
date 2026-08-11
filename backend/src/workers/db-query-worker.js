'use strict';

/**
 * Read-only SQLite query worker.
 *
 * better-sqlite3 is synchronous, so a slow query blocks whatever thread runs it.
 * On the main thread that means the entire server stops answering — a
 * filter-options request over a network mount was measured freezing it for 167
 * seconds. Each worker owns its own read-only connection and blocks only itself.
 *
 * Plain JavaScript on purpose: it must be loadable by `new Worker(path)` under
 * both tsx (development) and the compiled build, without a TypeScript loader.
 */

const { parentPort, workerData } = require('worker_threads');
const Database = require('better-sqlite3');

let db = null;
let dbPath = workerData && workerData.dbPath;
const readonly = { readonly: true, fileMustExist: true };

function open() {
  if (db) {
    return db;
  }
  db = new Database(dbPath, readonly);
  if (workerData && workerData.cacheSize) {
    db.pragma(`cache_size = ${workerData.cacheSize}`);
  }
  db.pragma('temp_store = MEMORY');
  return db;
}

function close() {
  if (db) {
    try {
      db.close();
    } catch {
      // Closing a already-broken handle must not take the worker down.
    }
    db = null;
  }
}

parentPort.on('message', (message) => {
  if (message.type === 'reopen') {
    close();
    dbPath = message.dbPath || dbPath;
    parentPort.postMessage({ type: 'reopened' });
    return;
  }

  if (message.type === 'close') {
    close();
    parentPort.postMessage({ type: 'closed' });
    return;
  }

  if (message.type !== 'query') {
    return;
  }

  try {
    const rows = open()
      .prepare(message.sql)
      .all(...(message.params || []));
    parentPort.postMessage({ type: 'result', id: message.id, rows });
  } catch (error) {
    // A failed statement must not kill the worker: the pool would lose a slot
    // for every malformed query.
    parentPort.postMessage({
      type: 'result',
      id: message.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
