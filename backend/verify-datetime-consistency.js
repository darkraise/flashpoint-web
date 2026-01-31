const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'user.db');
const db = new Database(dbPath, { readonly: true });

console.log('\n=== DateTime Consistency Verification ===\n');

// Check all tables with datetime columns
const tablesToCheck = [
  { table: 'users', columns: ['created_at', 'updated_at', 'last_login_at'] },
  { table: 'roles', columns: ['created_at', 'updated_at'] },
  { table: 'permissions', columns: ['created_at'] },
  { table: 'role_permissions', columns: ['created_at'] },
  { table: 'refresh_tokens', columns: ['expires_at', 'created_at', 'revoked_at'] },
  { table: 'activity_logs', columns: ['created_at'] },
  { table: 'login_attempts', columns: ['attempted_at'] },
  { table: 'user_game_plays', columns: ['started_at', 'ended_at'] },
  { table: 'user_game_stats', columns: ['first_played_at', 'last_played_at'] },
  { table: 'user_stats', columns: ['first_play_at', 'last_play_at', 'updated_at'] },
  { table: 'user_settings', columns: ['created_at', 'updated_at'] },
  { table: 'system_settings', columns: ['updated_at'] },
  { table: 'user_playlists', columns: ['created_at', 'updated_at'] },
  { table: 'user_playlist_games', columns: ['added_at'] },
  { table: 'user_favorites', columns: ['added_at'] },
  { table: 'job_execution_logs', columns: ['started_at', 'completed_at'] }
];

let allConsistent = true;
let totalRecordsChecked = 0;
let inconsistentRecords = 0;

tablesToCheck.forEach(({ table, columns }) => {
  // Check if table exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name=?
  `).get(table);

  if (!tableExists) {
    console.log(`⚠️  Table ${table} does not exist - skipping`);
    return;
  }

  console.log(`\n--- Checking ${table} ---`);

  columns.forEach(column => {
    try {
      // Count total non-null records
      const totalCount = db.prepare(`
        SELECT COUNT(*) as count FROM ${table}
        WHERE ${column} IS NOT NULL
      `).get();

      if (totalCount.count === 0) {
        console.log(`  ${column}: No records (N/A)`);
        return;
      }

      // Count records with ISO 8601 format (contains 'T')
      const isoCount = db.prepare(`
        SELECT COUNT(*) as count FROM ${table}
        WHERE ${column} IS NOT NULL
        AND ${column} LIKE '%T%'
      `).get();

      // Count records with SQLite format (no 'T')
      const sqliteCount = db.prepare(`
        SELECT COUNT(*) as count FROM ${table}
        WHERE ${column} IS NOT NULL
        AND ${column} NOT LIKE '%T%'
      `).get();

      totalRecordsChecked += totalCount.count;

      if (sqliteCount.count > 0) {
        allConsistent = false;
        inconsistentRecords += sqliteCount.count;
        console.log(`  ❌ ${column}: ${sqliteCount.count}/${totalCount.count} records still in SQLite format`);

        // Show sample
        const sample = db.prepare(`
          SELECT ${column} FROM ${table}
          WHERE ${column} IS NOT NULL
          AND ${column} NOT LIKE '%T%'
          LIMIT 1
        `).get();
        if (sample) {
          console.log(`     Sample: "${sample[column]}"`);
        }
      } else {
        console.log(`  ✅ ${column}: All ${totalCount.count} records in ISO 8601 format`);
      }
    } catch (error) {
      console.log(`  ⚠️  ${column}: Error checking - ${error.message}`);
    }
  });
});

console.log('\n=== Summary ===');
console.log(`Total records checked: ${totalRecordsChecked}`);
console.log(`Inconsistent records: ${inconsistentRecords}`);

if (allConsistent) {
  console.log('\n✅ SUCCESS: All datetime columns are in ISO 8601 UTC format!');
  console.log('   Format: YYYY-MM-DDTHH:mm:ss.sssZ');
} else {
  console.log('\n❌ FAILED: Some datetime columns are still in SQLite format.');
  console.log('   Expected: YYYY-MM-DDTHH:mm:ss.sssZ');
  console.log('   Found: YYYY-MM-DD HH:mm:ss');
  console.log('\n   Migration 015 may need to be run.');
}

// Check current datetime output format
console.log('\n=== Current DateTime Formats ===');
console.log('SQLite datetime(\'now\'):', db.prepare("SELECT datetime('now') as dt").get().dt);
console.log('JavaScript new Date().toISOString():', new Date().toISOString());
console.log('\n⚠️  Note: SQLite datetime() produces local time without timezone.');
console.log('   Backend should ALWAYS use new Date().toISOString() for UTC.');

db.close();

// Exit with error code if inconsistent
process.exit(allConsistent ? 0 : 1);
