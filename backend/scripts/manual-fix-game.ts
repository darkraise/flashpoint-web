import { DatabaseService } from '../src/services/DatabaseService';
import { logger } from '../src/utils/logger';
import { config } from '../src/config';
import fs from 'fs';
import path from 'path';

/**
 * Manual fix script for games that downloaded but didn't update the database
 *
 * Usage:
 *   npx tsx scripts/manual-fix-game.ts <gameId> [zipFilename]
 */

async function manualFixGame(gameId: string, zipFilename?: string) {
  try {
    console.log('='.repeat(60));
    console.log(`Manual Database Fix for Game: ${gameId}`);
    console.log('='.repeat(60));
    console.log();

    // Initialize database
    await DatabaseService.initialize();

    // 1. Get game info
    const gameSql = `
      SELECT id, title, activeDataId, activeDataOnDisk
      FROM game
      WHERE id = ?
    `;
    const game = DatabaseService.get(gameSql, [gameId]);

    if (!game) {
      console.log('❌ Game not found in database');
      return;
    }

    console.log(`Game: ${game.title}`);
    console.log(`Active Data ID: ${game.activeDataId}`);
    console.log();

    if (!game.activeDataId) {
      console.log('❌ Game has no activeDataId (no data pack needed)');
      return;
    }

    // 2. Get game_data info
    const gameDataSql = `
      SELECT id, gameId, dateAdded, presentOnDisk, path
      FROM game_data
      WHERE id = ?
    `;
    const gameData = DatabaseService.get(gameDataSql, [game.activeDataId]);

    if (!gameData) {
      console.log('❌ game_data entry not found');
      return;
    }

    // 3. Check Data/Games directory for file
    const dataGamesPath = path.resolve(config.flashpointPath, 'Data/Games');
    const files = fs.readdirSync(dataGamesPath);
    const gameFiles = files.filter(f => f.startsWith(gameId) && f.endsWith('.zip'));

    if (gameFiles.length === 0) {
      console.log('❌ No ZIP file found in Data/Games for this game');
      return;
    }

    console.log(`Found ${gameFiles.length} ZIP file(s):`);
    gameFiles.forEach((file, i) => {
      const filePath = path.join(dataGamesPath, file);
      const stats = fs.statSync(filePath);
      console.log(`  ${i + 1}. ${file}`);
      console.log(`     Size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`     Modified: ${stats.mtime.toISOString()}`);
    });
    console.log();

    // 4. Select file to use
    let selectedFile: string;
    if (zipFilename) {
      if (!gameFiles.includes(zipFilename)) {
        console.log(`❌ Specified file "${zipFilename}" not found`);
        return;
      }
      selectedFile = zipFilename;
    } else if (gameFiles.length === 1) {
      selectedFile = gameFiles[0];
    } else {
      // Use the most recent file
      const filesWithStats = gameFiles.map(file => ({
        name: file,
        mtime: fs.statSync(path.join(dataGamesPath, file)).mtime
      }));
      filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      selectedFile = filesWithStats[0].name;
      console.log(`Multiple files found, using most recent: ${selectedFile}`);
    }

    console.log(`\nUsing file: ${selectedFile}`);

    // 5. Build relative path (Flashpoint Launcher compatibility)
    const relativePath = `Data/Games/${selectedFile}`;
    console.log(`Relative path: ${relativePath}`);
    console.log();

    // 6. Create backup
    const backupPath = `${config.flashpointDbPath}.backup-manual-${Date.now()}`;
    console.log(`Creating backup: ${backupPath}...`);
    const db = DatabaseService.getDatabase();
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(backupPath, buffer);
    console.log('✓ Backup created\n');

    // 7. Update database
    console.log('Updating database...');

    // Update game_data table
    const updateGameDataSql = `
      UPDATE game_data
      SET presentOnDisk = 1, path = ?
      WHERE id = ?
    `;
    DatabaseService.run(updateGameDataSql, [relativePath, game.activeDataId]);
    console.log(`✓ Updated game_data.presentOnDisk = 1`);
    console.log(`✓ Updated game_data.path = "${relativePath}"`);

    // Update game table
    const updateGameSql = `
      UPDATE game
      SET activeDataOnDisk = 1
      WHERE id = ? AND activeDataId = ?
    `;
    DatabaseService.run(updateGameSql, [gameId, game.activeDataId]);
    console.log(`✓ Updated game.activeDataOnDisk = 1`);

    // 8. Save database
    console.log('\nSaving database...');
    const updatedData = db.export();
    const updatedBuffer = Buffer.from(updatedData);
    const tempPath = `${config.flashpointDbPath}.tmp`;
    fs.writeFileSync(tempPath, updatedBuffer);

    // Try to rename, with retry logic
    let saved = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Close database first to release lock
        DatabaseService.close();

        // Small delay to ensure file handle is released
        await new Promise(resolve => setTimeout(resolve, 100));

        // Try rename
        fs.renameSync(tempPath, config.flashpointDbPath);
        saved = true;
        console.log('✓ Database saved\n');
        break;
      } catch (error: any) {
        if (attempt === 3) {
          console.error(`❌ Failed to save database after ${attempt} attempts`);
          console.error(`Error: ${error.message}`);
          console.log('\n⚠️  Database is locked - please close these applications and try again:');
          console.log('   - Flashpoint Launcher');
          console.log('   - Flashpoint web-app backend (npm start)');
          console.log('   - Any SQLite browser tools');
          console.log('\nThe temp file is saved at:');
          console.log(`   ${tempPath}`);
          console.log('\nTo complete the fix manually:');
          console.log(`   1. Close all applications using the database`);
          console.log(`   2. Copy ${tempPath}`);
          console.log(`   3. Rename to ${config.flashpointDbPath}`);
          throw error;
        }
        console.log(`Attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Re-initialize database for next attempt
        await DatabaseService.initialize();
      }
    }

    if (!saved) {
      throw new Error('Failed to save database');
    }

    // Re-open database for verification
    await DatabaseService.initialize();

    // 9. Verify
    console.log('Verifying changes...');
    const verifyGameSql = `
      SELECT activeDataOnDisk FROM game WHERE id = ?
    `;
    const verifyGameDataSql = `
      SELECT presentOnDisk, path FROM game_data WHERE id = ?
    `;
    const verifiedGame = DatabaseService.get(verifyGameSql, [gameId]);
    const verifiedGameData = DatabaseService.get(verifyGameDataSql, [game.activeDataId]);

    console.log(`game.activeDataOnDisk = ${verifiedGame.activeDataOnDisk === 1 ? '✅ 1' : '❌ 0'}`);
    console.log(`game_data.presentOnDisk = ${verifiedGameData.presentOnDisk === 1 ? '✅ 1' : '❌ 0'}`);
    console.log(`game_data.path = ${verifiedGameData.path || '❌ NULL'}`);
    console.log();

    // 10. Summary
    console.log('='.repeat(60));
    console.log('✓ Database Updated Successfully!');
    console.log('='.repeat(60));
    console.log('The game should now be playable in Flashpoint Launcher.');
    console.log(`Backup saved to: ${backupPath}`);

  } catch (error) {
    console.error('\n❌ Fix failed:', error);
    throw error;
  } finally {
    DatabaseService.close();
  }
}

// Get arguments
const gameId = process.argv[2];
const zipFilename = process.argv[3];

if (!gameId) {
  console.error('Usage: npx tsx scripts/manual-fix-game.ts <gameId> [zipFilename]');
  console.error('Example: npx tsx scripts/manual-fix-game.ts 0012de86-aec2-45a5-8f92-f7f3e00703b1');
  process.exit(1);
}

manualFixGame(gameId, zipFilename)
  .then(() => {
    console.log('\n✓ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });
