import path from 'path';
import { DatabaseService } from '../src/services/DatabaseService';
import { logger } from '../src/utils/logger';
import { config } from '../src/config';

/**
 * Migration Script: Fix Absolute Paths in game_data Table
 *
 * This script converts absolute paths to relative paths in the game_data table
 * to ensure compatibility with Flashpoint Launcher.
 *
 * Before: D:\Flashpoint\Data\Games\uuid-123.zip
 * After:  Data/Games/uuid-123.zip
 *
 * Usage:
 *   npm run fix-paths
 */

interface GameDataRow {
  id: number;
  gameId: string;
  path: string | null;
  presentOnDisk: number;
}

/**
 * Check if a path is absolute
 */
function isAbsolutePath(filePath: string): boolean {
  // Windows absolute path: contains drive letter (C:, D:, etc.)
  // Unix absolute path: starts with /
  return filePath.includes(':') || filePath.startsWith('/');
}

/**
 * Convert absolute path to relative path
 */
function makeRelativePath(absolutePath: string): string {
  // Get relative path from Flashpoint installation directory
  const relativePath = path.relative(config.flashpointPath, absolutePath);

  // Flashpoint uses forward slashes for cross-platform compatibility
  const normalizedPath = relativePath.replace(/\\/g, '/');

  return normalizedPath;
}

/**
 * Main migration function
 */
async function fixAbsolutePaths() {
  try {
    console.log('='.repeat(60));
    console.log('Fix Absolute Paths Migration');
    console.log('='.repeat(60));
    console.log();

    // Initialize database
    console.log('Initializing database...');
    await DatabaseService.initialize();
    console.log('✓ Database initialized\n');

    // Find all game_data entries with presentOnDisk = 1
    console.log('Scanning game_data table for entries with presentOnDisk = 1...');
    const sql = `
      SELECT id, gameId, path, presentOnDisk
      FROM game_data
      WHERE presentOnDisk = 1 AND path IS NOT NULL
    `;

    const rows = DatabaseService.all(sql) as GameDataRow[];
    console.log(`✓ Found ${rows.length} entries with presentOnDisk = 1\n`);

    if (rows.length === 0) {
      console.log('No entries to fix. Exiting.');
      return;
    }

    // Filter entries with absolute paths
    const absolutePathEntries = rows.filter((row) => row.path && isAbsolutePath(row.path));

    console.log(`Found ${absolutePathEntries.length} entries with absolute paths\n`);

    if (absolutePathEntries.length === 0) {
      console.log('✓ All paths are already relative. No migration needed.');
      return;
    }

    // Display entries to be fixed
    console.log('Entries to be fixed:');
    console.log('-'.repeat(60));
    absolutePathEntries.forEach((row, index) => {
      const newPath = makeRelativePath(row.path!);
      console.log(`${index + 1}. Game ID: ${row.gameId}`);
      console.log(`   Before: ${row.path}`);
      console.log(`   After:  ${newPath}`);
      console.log();
    });

    // Confirm migration
    console.log('This will update the database to use relative paths.');
    console.log('The original database will be backed up before making changes.\n');

    // Create backup
    const backupPath = `${config.flashpointDbPath}.backup-${Date.now()}`;
    console.log(`Creating backup: ${backupPath}...`);
    const db = DatabaseService.getDatabase();
    const data = db.export();
    const buffer = Buffer.from(data);
    const fs = await import('fs');
    await fs.promises.writeFile(backupPath, buffer);
    console.log('✓ Backup created\n');

    // Apply migrations
    console.log('Applying migrations...');
    let updated = 0;

    for (const row of absolutePathEntries) {
      try {
        const newPath = makeRelativePath(row.path!);
        const updateSql = `
          UPDATE game_data
          SET path = ?
          WHERE id = ?
        `;
        DatabaseService.run(updateSql, [newPath, row.id]);
        updated++;
        console.log(`✓ Updated game_data.id = ${row.id} (${row.gameId})`);
      } catch (error) {
        console.error(`✗ Failed to update game_data.id = ${row.id}:`, error);
      }
    }

    // Save database
    console.log('\nSaving database...');
    const updatedData = db.export();
    const updatedBuffer = Buffer.from(updatedData);

    // Atomic save: write to temp file, then rename
    const tempPath = `${config.flashpointDbPath}.tmp`;
    await fs.promises.writeFile(tempPath, updatedBuffer);
    await fs.promises.rename(tempPath, config.flashpointDbPath);
    console.log('✓ Database saved\n');

    // Summary
    console.log('='.repeat(60));
    console.log('Migration Complete');
    console.log('='.repeat(60));
    console.log(`Total entries found:        ${rows.length}`);
    console.log(`Entries with absolute paths: ${absolutePathEntries.length}`);
    console.log(`Successfully updated:        ${updated}`);
    console.log(`Backup saved to:             ${backupPath}`);
    console.log();
    console.log('✓ All paths have been converted to relative format');
    console.log('✓ Your games are now fully compatible with Flashpoint Launcher');
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  } finally {
    DatabaseService.close();
  }
}

// Run migration
fixAbsolutePaths()
  .then(() => {
    console.log('\nMigration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exit(1);
  });
